import { useEffect, useMemo, useState } from 'react'
import { fetchDataset } from '../lib/api'
import { barH, barHColored, lineChart, choropleth, choroplethDiverging, quadrantScatter, fmt, f1, PALETTE, COLORS } from '../lib/charts'
import { ensureMaps, toGeoName } from '../lib/geo'
import { EChart } from '../components/EChart'
import { Block as Card } from '../assistant/Block'
import { useAssistantViewContext } from '../assistant/AssistantContext'

type Rec = Record<string, unknown>
type LabelVal = { label: string; value: number }
type PertDep = { dep: string; region: string; demand_index: number; supply_vigentes: number; supply_rank: number; demand_rank: number; gap: number; quadrant: string; top_areas: LabelVal[]; top_competencias: LabelVal[] }
type Pert = { meta: Rec; departamentos: PertDep[] }
type Puente = { meta: Rec; areas: { area: string; programas_vigentes: number; sectores: { sector: string; nivel: string }[]; demanda_media: number; top_competencias: { label: string; sector?: string; value: number }[]; supply_rank: number; demand_rank: number; gap: number }[] }
type RecoSector = { sector: string; score: number; nivel: string; demanda: number; vacio: number; deficit_oferta: number; oferta_programas: number; competencias_clave: string[]; programas_sugeridos: string[]; departamentos_driver?: string[]; justificacion: string }
type Reco = { meta: Rec; regiones: { region: string; n_departamentos: number; departamentos: string[]; sectores: RecoSector[] }[]; departamentos: { departamento: string; region: string; total_vigentes: number; recomendaciones: RecoSector[] }[] }
type Coh = { meta: Rec; serie_nacional: Rec[]; dept_serie: Rec[]; resumen_dept: Rec[]; cohortes: Rec[]; top_sectores: Rec[]; sector_serie: Rec[] }

const num = (v: unknown) => Number(v ?? 0)
const QUAD_SHORT: Record<string, string> = { 'Brecha: alta demanda, baja oferta': 'Brecha (déficit)', 'Dinámico: oferta y demanda altas': 'Dinámico', 'Incipiente: baja actividad': 'Incipiente', 'Posible saturación: oferta alta, demanda baja': 'Saturación' }
const QUAD_COLOR: Record<string, string> = { 'Brecha: alta demanda, baja oferta': '#E15759', 'Dinámico: oferta y demanda altas': '#59A14F', 'Incipiente: baja actividad': '#BAB0AC', 'Posible saturación: oferta alta, demanda baja': '#F28E2B' }
const NIVEL_COLOR: Record<string, string> = { 'Muy alta': '#E15759', Alta: '#F28E2B', Media: '#76B7B2', Baja: '#BAB0AC' }
const TABS = [
  { id: 'pertinencia', label: 'Pertinencia territorial' },
  { id: 'cohortes', label: 'Demanda potencial (cohortes)' },
  { id: 'recomendacion', label: 'Recomendación de programas' },
  { id: 'disciplinas', label: 'Disciplinas ↔ competencias' },
]

function Kpis({ items }: { items: { c: string; v: string; l: string }[] }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((k) => (
        <div key={k.l} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="absolute left-0 top-0 h-[3px] w-full" style={{ background: k.c }} />
          <div className="text-[22px] font-extrabold tracking-tight">{k.v}</div>
          <div className="mt-0.5 text-[12px] text-slate-500">{k.l}</div>
        </div>
      ))}
    </div>
  )
}
function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; l: string }[] }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={`px-3 py-1.5 text-[12px] font-semibold ${value === o.v ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}>{o.l}</button>
      ))}
    </div>
  )
}

export function RegionalModule() {
  const [pert, setPert] = useState<Pert | null>(null)
  const [puente, setPuente] = useState<Puente | null>(null)
  const [reco, setReco] = useState<Reco | null>(null)
  const [coh, setCoh] = useState<Coh | null>(null)
  const [mapsReady, setMapsReady] = useState(false)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('pertinencia')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [p, pu, r, c] = await Promise.all([fetchDataset('pertinencia'), fetchDataset('puente'), fetchDataset('recomendaciones'), fetchDataset('cohortes')])
        if (cancelled) return
        setPert(p.data as Pert); setPuente(pu.data as Puente); setReco(r.data as Reco); setCoh(c.data as Coh)
        await ensureMaps()
        if (!cancelled) setMapsReady(true)
      } catch (e) { if (!cancelled) setErr((e as Error).message) }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  useAssistantViewContext(`Pestaña: ${TABS.find((t) => t.id === tab)?.label || tab}`)

  if (err) return <div className="mx-auto max-w-3xl p-8 text-rose-600">Error al cargar datos: {err}</div>
  if (!pert || !puente || !reco || !coh) return <div className="grid min-h-[60vh] place-items-center text-sm text-slate-400">Cargando análisis regional…</div>

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-5">
      <div className="mb-3 flex items-baseline gap-3">
        <h1 className="text-lg font-black tracking-tight">Análisis regional · histórico y prospectivo</h1>
        <span className="text-[12.5px] text-slate-400">Pertinencia territorial · demanda potencial · recomendación de programas</span>
      </div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'pertinencia' && <Pertinencia pert={pert} mapsReady={mapsReady} />}
      {tab === 'cohortes' && <Cohortes coh={coh} mapsReady={mapsReady} />}
      {tab === 'recomendacion' && <Recomendacion reco={reco} />}
      {tab === 'disciplinas' && <Disciplinas puente={puente} />}
    </div>
  )
}

function Pertinencia({ pert, mapsReady }: { pert: Pert; mapsReady: boolean }) {
  const [mode, setMode] = useState<'dep' | 'reg'>('dep')
  const [sel, setSel] = useState('')
  const D = pert.departamentos
  const kpis = useMemo(() => {
    const q: Record<string, number> = {}
    D.forEach((d) => (q[d.quadrant] = (q[d.quadrant] || 0) + 1))
    return Object.keys(QUAD_SHORT).map((k) => ({ c: QUAD_COLOR[k], v: String(q[k] || 0), l: QUAD_SHORT[k] }))
  }, [D])
  const gapMap = useMemo(() => {
    if (mode === 'reg') {
      const acc: Record<string, number[]> = {}
      D.forEach((d) => { (acc[d.region] = acc[d.region] || []).push(d.gap) })
      return Object.entries(acc).map(([name, arr]) => ({ name, value: +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) }))
    }
    return D.map((d) => ({ name: toGeoName(d.dep) || '', value: d.gap })).filter((x) => x.name)
  }, [D, mode])
  const scatter = useMemo(() => {
    const byQ: Record<string, { name: string; x: number; y: number; tip: string }[]> = {}
    Object.keys(QUAD_SHORT).forEach((k) => (byQ[k] = []))
    D.forEach((d) => byQ[d.quadrant].push({ name: d.dep, x: d.supply_rank, y: d.demand_rank, tip: `<b>${d.dep}</b><br>Oferta: ${f1(d.supply_rank)} · Demanda: ${f1(d.demand_rank)}<br>Brecha: ${d.gap > 0 ? '+' : ''}${f1(d.gap)}` }))
    return Object.keys(QUAD_SHORT).map((k) => ({ name: QUAD_SHORT[k], color: QUAD_COLOR[k], points: byQ[k] }))
  }, [D])
  const gapBar = D.slice().sort((a, b) => a.gap - b.gap).map((d) => ({ label: d.dep, value: d.gap, color: d.gap >= 0 ? '#E15759' : '#4E79A7' }))
  const selDep = D.find((d) => d.dep === sel) || D.slice().sort((a, b) => b.gap - a.gap)[0]
  return (
    <div className="space-y-4">
      <Kpis items={kpis} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Matriz oferta ↔ demanda por departamento" hint="X = percentil de oferta · Y = percentil de demanda · mediana 50">
          <EChart height={420} option={quadrantScatter(scatter, { xName: 'Oferta →', yName: 'Demanda →' })} />
        </Card>
        <Card title="Mapa de brecha de pertinencia" hint="Rojo = demanda supera oferta · Azul = oferta supera demanda" right={<Segmented value={mode} onChange={setMode} options={[{ v: 'dep', l: 'Departamento' }, { v: 'reg', l: 'Región' }]} />}>
          {mapsReady ? <EChart height={420} option={choroplethDiverging(gapMap, mode === 'reg' ? 'CO_REG' : 'CO', mode === 'reg' ? 'NOMBRE_REGION' : 'NOMBRE_DPT', mode === 'reg', ['Saturación', 'Déficit'])} /> : <div className="grid h-[420px] place-items-center text-sm text-slate-400">Cargando mapa…</div>}
        </Card>
      </div>
      <Card title="Brecha de pertinencia por departamento"><EChart height={620} option={barHColored(gapBar, true)} /></Card>
      <Card title="Detalle por departamento — oferta frente a demanda" right={
        <select value={sel} onChange={(e) => setSel(e.target.value)} className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[13px]">
          {D.slice().sort((a, b) => b.gap - a.gap).map((d) => <option key={d.dep} value={d.dep}>{d.dep}</option>)}
        </select>
      }>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3">
            <h4 className="mb-2 text-[13px] font-bold">Oferta — áreas de programas (vigentes)</h4>
            {selDep.top_areas.map((a) => <Bar key={a.label} label={a.label} value={a.value} max={Math.max(...selDep.top_areas.map((x) => x.value))} color="#4E79A7" fmtv={(v) => `${fmt(v)} prog.`} />)}
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <h4 className="mb-2 text-[13px] font-bold">Demanda — competencias más solicitadas</h4>
            {selDep.top_competencias.map((a) => <Bar key={a.label} label={a.label} value={a.value} max={Math.max(...selDep.top_competencias.map((x) => x.value))} color="#E15759" fmtv={(v) => f1(v)} />)}
          </div>
        </div>
      </Card>
    </div>
  )
}

function Bar({ label, value, max, color, fmtv }: { label: string; value: number; max: number; color: string; fmtv: (v: number) => string }) {
  return (
    <div className="my-2">
      <div className="mb-1 flex justify-between text-[12.5px]"><span>{label}</span><b>{fmtv(value)}</b></div>
      <div className="h-[7px] overflow-hidden rounded bg-white"><div className="h-full" style={{ width: `${Math.round((value / (max || 1)) * 100)}%`, background: color }} /></div>
    </div>
  )
}

function Cohortes({ coh, mapsReady }: { coh: Coh; mapsReady: boolean }) {
  const years = [...new Set(coh.serie_nacional.map((s) => num(s.anio)))].sort()
  const [year, setYear] = useState(2025)
  const [dep, setDep] = useState('Todos')
  const deps = [...new Set(coh.resumen_dept.map((d) => String(d.departamento)))].sort()
  const isNac = dep === 'Todos'
  const sn = coh.serie_nacional.find((s) => num(s.anio) === year) || {}
  const row = isNac ? { indice: num(sn.indice), personas: num(sn.personas), absorcion: num(sn.absorcion), td: num(sn.td), informalidad: num(sn.informalidad) }
    : (() => { const ds = coh.dept_serie.find((d) => String(d.departamento) === dep && num(d.anio) === year) || {}; const rd = coh.resumen_dept.find((r) => String(r.departamento) === dep) || {}; return { indice: num(ds.indice), personas: num(ds.personas), absorcion: num(ds.absorcion), td: num(rd.desocupacion), informalidad: num(rd.informalidad) } })()
  const kpis = [
    { c: PALETTE[0], v: fmt(row.personas), l: 'Demanda potencial (personas)' },
    { c: PALETTE[6], v: f1(row.indice), l: 'Índice demanda potencial' },
    { c: COLORS.good, v: f1(row.absorcion) + '%', l: 'Absorción laboral' },
    { c: '#d64550', v: f1(row.td) + '%', l: 'Desocupación (modelada)' },
    { c: '#e8930c', v: f1(row.informalidad) + '%', l: 'Informalidad (modelada)' },
    { c: '#E15759', v: fmt(num(coh.meta.departamentos_prioridad_alta)), l: 'Deptos. prioridad alta' },
  ]
  const serie = isNac ? coh.serie_nacional : coh.dept_serie.filter((d) => String(d.departamento) === dep).sort((a, b) => num(a.anio) - num(b.anio))
  const serX = serie.map((s) => num(s.anio))
  const mapData = coh.dept_serie.filter((d) => num(d.anio) === year).map((d) => ({ name: toGeoName(String(d.departamento)) || '', value: num(d.indice) })).filter((x) => x.name)
  const prio = coh.resumen_dept.slice().sort((a, b) => num(a.demanda_total) - num(b.demanda_total)).slice(-18).map((x) => ({ label: String(x.departamento), value: num(x.demanda_total), color: ({ alta: '#E15759', media: '#F28E2B', baja: '#59A14F' } as Record<string, string>)[String(x.prioridad)] || PALETTE[0] }))
  const cohorteData = isNac
    ? Object.entries(coh.cohortes.reduce((m: Record<string, { pob: number; td: number; n: number }>, c) => { const k = String(c.cohorte); (m[k] = m[k] || { pob: 0, td: 0, n: 0 }); m[k].pob += num(c.poblacion); m[k].td += num(c.td); m[k].n++; return m }, {})).map(([cohorte, a]) => ({ cohorte, poblacion: a.pob, td: a.td / a.n })).sort((a, b) => a.cohorte.localeCompare(b.cohorte))
    : coh.cohortes.filter((c) => String(c.departamento) === dep).map((c) => ({ cohorte: String(c.cohorte), poblacion: num(c.poblacion), td: num(c.td) })).sort((a, b) => a.cohorte.localeCompare(b.cohorte))
  const sect: LabelVal[] = isNac ? coh.sector_serie.filter((s) => num(s.anio) === year).map((s) => ({ label: String(s.sector), value: num(s.indice) })) : coh.top_sectores.filter((s) => String(s.departamento) === dep).map((s) => ({ label: String(s.sector), value: num(s.indice) }))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Año</label>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[13px]">{years.map((y) => <option key={y} value={y}>{y}{y === num(coh.meta.anio_prospectivo) ? ' (prosp.)' : ''}</option>)}</select>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Departamento</label>
        <select value={dep} onChange={(e) => setDep(e.target.value)} className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[13px]"><option value="Todos">Nacional (todos)</option>{deps.map((d) => <option key={d} value={d}>{d}</option>)}</select>
      </div>
      <Kpis items={kpis} />
      <Card title="Demanda potencial: trayectoria histórica y prospectiva (2021–2026)" hint={`${isNac ? 'Nacional' : dep} · índice y absorción · 2026 prospectivo`}>
        <EChart height={400} option={lineChart(serX, [
          { name: 'Índice demanda potencial', color: '#B07AA1', area: true, data: serie.map((s) => num(s.indice)) },
          { name: 'Absorción laboral %', color: COLORS.good, yAxisIndex: 1, data: serie.map((s) => num(s.absorcion)) },
        ], { dualAxis: true, y1Name: 'Índice', y2Name: 'Absorción %' })} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Índice de demanda potencial por departamento" hint={`Año ${year}`}>{mapsReady ? <EChart height={440} option={choropleth(mapData, 'CO', 'NOMBRE_DPT', false)} /> : <div className="grid h-[440px] place-items-center text-sm text-slate-400">Cargando mapa…</div>}</Card>
        <Card title="Priorización territorial (2025)" hint="Demanda potencial total · color por prioridad"><EChart height={440} option={barHColored(prio, false)} /></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Demografía por cohorte de edad (2025)" hint="Población y tasa de desocupación">
          <EChart height={380} option={{
            color: [PALETTE[0], '#d64550'], grid: { left: 12, right: 44, top: 30, bottom: 24, containLabel: true }, legend: { top: 0, textStyle: { color: COLORS.label, fontSize: 11 } },
            tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e4e7ec', textStyle: { color: '#1a1f29' } },
            xAxis: { type: 'category', data: cohorteData.map((c) => c.cohorte), axisLabel: { color: COLORS.label } },
            yAxis: [{ type: 'value', name: 'Población', axisLabel: { color: COLORS.label, formatter: (v: number) => (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : (v / 1e3).toFixed(0) + 'k') } }, { type: 'value', name: 'TD %', position: 'right', splitLine: { show: false } }],
            series: [{ name: 'Población', type: 'bar', data: cohorteData.map((c) => c.poblacion), itemStyle: { color: PALETTE[0], borderRadius: [4, 4, 0, 0] }, barMaxWidth: 46 }, { name: 'Tasa desocupación %', type: 'line', yAxisIndex: 1, smooth: true, data: cohorteData.map((c) => +c.td.toFixed(1)) }],
          }} />
        </Card>
        <Card title="Sectores con mayor demanda potencial" hint={`${isNac ? 'Nacional' : dep}`}><EChart height={380} option={barH(sect.map((s) => ({ label: s.label, value: +s.value.toFixed(1) })), '#59A14F', 8, true)} /></Card>
      </div>
    </div>
  )
}

function Recomendacion({ reco }: { reco: Reco }) {
  const [scope, setScope] = useState<'region' | 'dep'>('region')
  const [sel, setSel] = useState('')
  const items = scope === 'region' ? reco.regiones.map((r) => r.region) : reco.departamentos.map((d) => d.departamento).slice().sort()
  const cur = sel || items[0]
  const sectores: RecoSector[] = scope === 'region' ? (reco.regiones.find((r) => r.region === cur)?.sectores || []) : (reco.departamentos.find((d) => d.departamento === cur)?.recomendaciones || [])
  const bar = sectores.slice().sort((a, b) => a.score - b.score).map((s) => ({ label: s.sector, value: s.score, color: NIVEL_COLOR[s.nivel] || PALETTE[0] }))
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-800">
        <b>¿Qué programas ofertar?</b> Ranking de sectores por oportunidad = demanda territorial + vacío + déficit de oferta. Recomendación analítica; validar con empleadores / SENA / cámaras de comercio.
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={scope} onChange={(v) => { setScope(v); setSel('') }} options={[{ v: 'region', l: 'Por región' }, { v: 'dep', l: 'Por departamento' }]} />
        <select value={cur} onChange={(e) => setSel(e.target.value)} className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[13px]">{items.map((i) => <option key={i} value={i}>{i}</option>)}</select>
      </div>
      <Card title="Sectores con mayor oportunidad" hint="Score de recomendación (0–100)"><EChart height={380} option={barHColored(bar, true)} /></Card>
      <div className="space-y-3">
        {sectores.map((s, i) => (
          <div key={s.sector} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-slate-50 text-[12px] font-extrabold text-slate-400">{i + 1}</span>
              <span className="text-[15px] font-bold">{s.sector}</span>
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: NIVEL_COLOR[s.nivel] }}>{s.nivel}</span>
              <span className="ml-auto text-[16px] font-extrabold" style={{ color: NIVEL_COLOR[s.nivel] }}>{f1(s.score)}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-4 text-[12.5px] text-slate-600"><span>Demanda <b>{f1(s.demanda)}</b></span><span>Vacío <b>{f1(s.vacio)}</b></span><span>Déficit oferta <b>{f1(s.deficit_oferta)}</b></span><span>Oferta actual <b>{fmt(s.oferta_programas)}</b> prog.</span></div>
            <p className="my-2 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] leading-relaxed text-slate-600">{s.justificacion}</p>
            <div className="text-[12.5px]"><span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Programas sugeridos</span><div className="mt-1 flex flex-wrap gap-1.5">{s.programas_sugeridos.map((p) => <span key={p} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-semibold">{p}</span>)}</div></div>
            {s.departamentos_driver && <div className="mt-2 text-[12px] text-slate-500"><b>Impulsan:</b> {s.departamentos_driver.join(', ')}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function Disciplinas({ puente }: { puente: Puente }) {
  const A = puente.areas
  const scatter = [{ name: 'Disciplinas', color: COLORS.brand, points: A.map((a) => ({ name: a.area, x: a.supply_rank, y: a.demand_rank, tip: `<b>${a.area}</b><br>Oferta: ${f1(a.supply_rank)} · Demanda: ${f1(a.demand_rank)}<br>Programas: ${fmt(a.programas_vigentes)} · Brecha: ${a.gap > 0 ? '+' : ''}${f1(a.gap)}` })) }]
  const gapBar = A.slice().sort((a, b) => a.gap - b.gap).map((a) => ({ label: a.area, value: a.gap, color: a.gap >= 0 ? '#E15759' : '#4E79A7' }))
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-800"><b>Pertinencia por disciplina.</b> Cruce oferta (programas por área de conocimiento) ↔ demanda de competencias (crosswalk ponderado por afinidad, visible en la tabla).</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Matriz oferta ↔ demanda por disciplina" hint="X = percentil de oferta · Y = percentil de demanda"><EChart height={420} option={quadrantScatter(scatter, { xName: 'Oferta →', yName: 'Demanda →' })} /></Card>
        <Card title="Brecha de pertinencia por disciplina" hint="Demanda − oferta (percentil)"><EChart height={420} option={barHColored(gapBar, true)} /></Card>
      </div>
      <Card title="Áreas de conocimiento ↔ sectores y competencias demandadas">
        <div className="overflow-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400"><th className="py-2">Área</th><th className="py-2 text-right">Programas</th><th className="py-2 text-right">Demanda</th><th className="py-2 text-right">Brecha</th><th className="py-2">Sectores (mapeo)</th></tr></thead>
            <tbody>
              {A.map((a) => (
                <tr key={a.area} className="border-t border-slate-100">
                  <td className="py-2 font-semibold">{a.area}</td>
                  <td className="py-2 text-right tabular-nums">{fmt(a.programas_vigentes)}</td>
                  <td className="py-2 text-right tabular-nums">{f1(a.demanda_media)}</td>
                  <td className="py-2 text-right"><span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: a.gap >= 0 ? '#E15759' : '#4E79A7' }}>{a.gap > 0 ? '+' : ''}{f1(a.gap)}</span></td>
                  <td className="py-2">{a.sectores.map((s) => <span key={s.sector} className="mr-1 inline-block rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">{s.sector} · {s.nivel}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
