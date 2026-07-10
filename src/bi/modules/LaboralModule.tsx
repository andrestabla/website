import { useEffect, useMemo, useState } from 'react'
import { fetchDataset } from '../lib/api'
import { meanBy, sortDesc, type Factorized, type Count } from '../lib/factorized'
import { barH, barHColored, lineChart, donut, choropleth, fmt, f1, PALETTE, COLORS } from '../lib/charts'
import { ensureMaps, toGeoName } from '../lib/geo'
import { EChart } from '../components/EChart'

type Rec = Record<string, unknown>
type Prosp = { meta: Rec; panel: Factorized; colombia: Factorized }
type Ole = { meta: Rec; panel: Factorized; top_areas: Rec[]; brechas: Rec[]; top10_programas: Rec[] }
type Oit = { meta: Rec; latam_serie: Rec[]; emergentes: Rec[]; reskilling_sector: Rec[]; dane_dept: Rec[]; cronologia: Rec[] }

const TYPE_COLOR: Record<string, string> = {
  IA: '#E15759', Digital: '#4E79A7', Herramienta: '#B07AA1', Técnica: '#76B7B2', Blanda: '#59A14F', Idioma: '#BAB0AC',
  verde: '#59A14F', digital: '#4E79A7', dura: '#76B7B2', blanda: '#F28E2B', transversal: '#B07AA1', idioma: '#BAB0AC',
}
const TABS = [
  { id: 'panorama', label: 'Panorama' },
  { id: 'empleabilidad', label: 'Empleabilidad (OLE)' },
  { id: 'reskilling', label: 'Reskilling & mercado laboral' },
  { id: 'benchmark', label: 'Benchmarking regional' },
]
const num = (v: unknown) => Number(v ?? 0)

function Card({ title, hint, children }: { title?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {title && <h3 className="text-sm font-bold tracking-tight text-slate-800">{title}</h3>}
      {hint && <p className="mb-1 text-[11.5px] text-slate-400">{hint}</p>}
      {children}
    </div>
  )
}
function Kpis({ items }: { items: { c: string; v: string; l: string }[] }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((k) => (
        <div key={k.l} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="absolute left-0 top-0 h-[3px] w-full" style={{ background: k.c }} />
          <div className="text-[23px] font-extrabold tracking-tight">{k.v}</div>
          <div className="mt-0.5 text-[12px] text-slate-500">{k.l}</div>
        </div>
      ))}
    </div>
  )
}

export function LaboralModule() {
  const [prosp, setProsp] = useState<Prosp | null>(null)
  const [ole, setOle] = useState<Ole | null>(null)
  const [oit, setOit] = useState<Oit | null>(null)
  const [mapsReady, setMapsReady] = useState(false)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('panorama')
  const [oleYear, setOleYear] = useState<string | null>(null)
  const [oitInd, setOitInd] = useState<'desocupacion' | 'informalidad' | 'ocupacion'>('desocupacion')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [p, o, i] = await Promise.all([fetchDataset('prospectiva'), fetchDataset('ole'), fetchDataset('oit')])
        if (cancelled) return
        setProsp(p.data as Prosp)
        setOle(o.data as Ole)
        setOit(i.data as Oit)
        await ensureMaps()
        if (!cancelled) setMapsReady(true)
      } catch (e) {
        if (!cancelled) setErr((e as Error).message)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  if (err) return <div className="mx-auto max-w-3xl p-8 text-rose-600">Error al cargar datos: {err}</div>
  if (!prosp || !ole || !oit) return <div className="grid min-h-[60vh] place-items-center text-sm text-slate-400">Cargando observatorio laboral…</div>

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-5">
      <div className="mb-3 flex items-baseline gap-3">
        <h1 className="text-lg font-black tracking-tight">Observatorio laboral y de empleabilidad</h1>
        <span className="text-[12.5px] text-slate-400">Competencias LATAM · empleabilidad OLE · reskilling OIT/DANE</span>
      </div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'panorama' && <Panorama prosp={prosp} />}
      {tab === 'empleabilidad' && <Empleabilidad ole={ole} mapsReady={mapsReady} year={oleYear || String(ole.meta.anio_ultimo ?? '')} setYear={setOleYear} />}
      {tab === 'reskilling' && <Reskilling oit={oit} mapsReady={mapsReady} ind={oitInd} setInd={setOitInd} />}
      {tab === 'benchmark' && <Benchmark prosp={prosp} />}
    </div>
  )
}

function Panorama({ prosp }: { prosp: Prosp }) {
  const panel = prosp.panel
  const full = useMemo(() => new Uint8Array(panel.n).fill(1), [panel.n])
  const serie = useMemo(() => {
    const A = panel.data.anio, T = panel.data.tipo_competencia, V = panel.data.intensidad_relativa_0_100
    const types = panel.dicts.tipo_competencia
    const years = [...new Set(A)].sort((a, b) => a - b)
    const acc: Record<string, { s: number; c: number }> = {}
    types.forEach((_, ti) => years.forEach((y) => (acc[`${ti}|${y}`] = { s: 0, c: 0 })))
    for (let i = 0; i < panel.n; i++) { const k = `${T[i]}|${A[i]}`; if (acc[k]) { acc[k].s += V[i]; acc[k].c++ } }
    return {
      years,
      series: types.map((tp, ti) => ({ name: tp, color: TYPE_COLOR[tp], data: years.map((y) => { const o = acc[`${ti}|${y}`]; return o && o.c ? +(o.s / o.c).toFixed(1) : null }) })),
    }
  }, [panel])
  const emergentes = useMemo(() => {
    const Tend = panel.data.tendencia
    const tEmer = panel.dicts.tendencia.indexOf('Emergente/acelerada')
    const tCrec = panel.dicts.tendencia.indexOf('Creciente')
    const m = new Uint8Array(panel.n)
    for (let i = 0; i < panel.n; i++) m[i] = Tend[i] === tEmer || Tend[i] === tCrec ? 1 : 0
    return meanBy(panel, 'competencia', 'intensidad_relativa_0_100', m)
  }, [panel])
  return (
    <div className="space-y-4">
      <Card title="Evolución de la demanda por tipo de competencia (2021–2026)" hint="Índice de intensidad relativa medio (0–100). La IA muestra la aceleración más pronunciada.">
        <EChart height={420} option={lineChart(serie.years, serie.series, { min: 0, max: 80 })} />
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Composición por tipo de competencia" hint="Intensidad acumulada"><EChart option={donut(meanBy(panel, 'tipo_competencia', 'intensidad_relativa_0_100', full).map((d) => ({ label: d.label, value: +d.value.toFixed(1) })), (l) => TYPE_COLOR[l])} /></Card>
        <Card title="Competencias emergentes / aceleradas" hint="Mayor intensidad"><EChart height={340} option={barH(emergentes.map((d) => ({ label: d.label, value: +d.value.toFixed(1) })), '#E15759', 10, true)} /></Card>
      </div>
    </div>
  )
}

function oleYearMask(panel: Factorized, year: string): Uint8Array {
  const A = panel.data.anio
  const yi = panel.dicts.anio.indexOf(year)
  const m = new Uint8Array(panel.n)
  for (let i = 0; i < panel.n; i++) m[i] = A[i] === yi ? 1 : 0
  return m
}

function Empleabilidad({ ole, mapsReady, year, setYear }: { ole: Ole; mapsReady: boolean; year: string; setYear: (y: string) => void }) {
  const panel = ole.panel
  const years = panel.dicts.anio
  const mask = useMemo(() => (year ? oleYearMask(panel, year) : new Uint8Array(panel.n).fill(1)), [panel, year])
  const mean = (col: string) => { const v = panel.data[col]; let s = 0, c = 0; for (let i = 0; i < panel.n; i++) if (mask[i]) { s += v[i]; c++ } return c ? s / c : 0 }
  const kpis = [
    { c: COLORS.good, v: f1(mean('tasa_vinculacion_formal_estimada') * 100) + '%', l: 'Vinculación formal' },
    { c: PALETTE[0], v: f1(mean('tasa_empleabilidad_estimada') * 100) + '%', l: 'Empleabilidad' },
    { c: PALETTE[1], v: '$' + (mean('ingreso_mediano_estimado_cop') / 1e6).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M', l: 'Ingreso mediano' },
    { c: PALETTE[6], v: f1(mean('indice_atractivo_laboral')), l: 'Atractivo laboral' },
    { c: PALETTE[3], v: f1(mean('tiempo_estimado_primer_empleo_meses')) + ' m', l: 'Tiempo 1er empleo' },
    { c: PALETTE[4], v: fmt(Math.round((() => { const v = panel.data.graduados_estimados; let s = 0; for (let i = 0; i < panel.n; i++) if (mask[i]) s += v[i]; return s })())), l: 'Graduados est.' },
  ]
  const serie = useMemo(() => {
    const A = panel.data.anio, Vv = panel.data.tasa_vinculacion_formal_estimada, At = panel.data.indice_atractivo_laboral
    const accV = years.map(() => ({ s: 0, c: 0 })), accA = years.map(() => ({ s: 0, c: 0 }))
    for (let i = 0; i < panel.n; i++) { accV[A[i]].s += Vv[i]; accV[A[i]].c++; accA[A[i]].s += At[i]; accA[A[i]].c++ }
    return { accV, accA }
  }, [panel, years])
  const mapData = useMemo(() => {
    const dep = meanBy(panel, 'departamento', 'tasa_vinculacion_formal_estimada', mask)
    const out: { name: string; value: number }[] = []
    for (const d of dep) { const g = toGeoName(d.label); if (g) out.push({ name: g, value: +(d.value * 100).toFixed(1) }) }
    return out
  }, [panel, mask])
  const brechaItems = ole.brechas
    .slice()
    .sort((a, b) => num(a.brecha_pp_vs_promedio_nacional) - num(b.brecha_pp_vs_promedio_nacional))
    .map((b) => ({ label: String(b.departamento), value: num(b.brecha_pp_vs_promedio_nacional), color: num(b.brecha_pp_vs_promedio_nacional) >= 0 ? '#59A14F' : '#E15759' }))
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Año</label>
        <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[13px]">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <Kpis items={kpis} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Evolución de la empleabilidad (2021–2025)" hint="Vinculación formal y atractivo laboral medios">
          <EChart height={400} option={lineChart(years, [
            { name: 'Vinculación formal %', color: COLORS.good, data: years.map((_, y) => serie.accV[y].c ? +(serie.accV[y].s / serie.accV[y].c * 100).toFixed(1) : null) },
            { name: 'Atractivo laboral', color: '#B07AA1', yAxisIndex: 1, data: years.map((_, y) => serie.accA[y].c ? +(serie.accA[y].s / serie.accA[y].c).toFixed(1) : null) },
          ], { dualAxis: true, y1Name: '%', y2Name: 'Atractivo' })} />
        </Card>
        <Card title="Atractivo laboral por área de conocimiento" hint="Índice 0–100 · año seleccionado">
          <EChart height={400} option={barH(meanBy(panel, 'area_conocimiento', 'indice_atractivo_laboral', mask).map((d) => ({ label: d.label, value: +d.value.toFixed(1) })), '#B07AA1', 8, true)} />
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Vinculación formal por departamento" hint="% de graduados con vinculación formal">
          {mapsReady ? <EChart height={460} option={{ ...choropleth(mapData, 'CO', 'NOMBRE_DPT', false), tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#e4e7ec', textStyle: { color: '#1a1f29' }, formatter: (p: { name: string; value?: number }) => `${p.name}<br><b>${p.value != null ? f1(p.value) : 's/d'}%</b> vinculación` } }} /> : <div className="grid h-[460px] place-items-center text-sm text-slate-400">Cargando mapa…</div>}
        </Card>
        <Card title="Brecha departamental vs. promedio nacional (2025)" hint="Verde = ventaja · Rojo = rezago (pp)">
          <EChart height={460} option={barHColored(brechaItems, true)} />
        </Card>
      </div>
    </div>
  )
}

const IND_LABEL: Record<string, string> = { desocupacion: 'Tasa de desocupación (%)', informalidad: 'Informalidad (%)', ocupacion: 'Tasa de ocupación (%)' }

function Reskilling({ oit, mapsReady, ind, setInd }: { oit: Oit; mapsReady: boolean; ind: 'desocupacion' | 'informalidad' | 'ocupacion'; setInd: (i: 'desocupacion' | 'informalidad' | 'ocupacion') => void }) {
  const s = oit.latam_serie
  const years = s.map((x) => num(x.anio))
  const kpis = [
    { c: '#E15759', v: f1(num(oit.meta.reskilling_col_medio)), l: 'Demanda reskilling' },
    { c: '#F28E2B', v: f1(num(oit.meta.vacio_col_medio)), l: 'Vacío formativo' },
    { c: '#B07AA1', v: f1(num(oit.meta.prioridad_col_media)), l: 'Prioridad aprend. permanente' },
    { c: '#d64550', v: f1(num(oit.meta.desocupacion_nacional_ultimo)) + '%', l: 'Desocupación DANE' },
    { c: '#e8930c', v: f1(num(oit.meta.informalidad_nacional_ultimo)) + '%', l: 'Informalidad DANE' },
    { c: '#59A14F', v: fmt(num(oit.meta.n_competencias_emergentes)), l: 'Competencias emergentes' },
  ]
  const yearOfDane = num(oit.meta.anio_dane_ultimo)
  const daneY = oit.dane_dept.filter((d) => num(d.anio) === yearOfDane)
  const mapData = useMemo(() => {
    const out: { name: string; value: number }[] = []
    for (const d of daneY) { const g = toGeoName(String(d.departamento)); if (g) out.push({ name: g, value: num(d[ind]) }) }
    return out
  }, [daneY, ind])
  const emergentes = oit.emergentes.slice().sort((a, b) => num(b.prioridad) - num(a.prioridad)).slice(0, 14).reverse()
    .map((e) => ({ label: String(e.competencia), value: num(e.prioridad), color: TYPE_COLOR[String(e.tipo)] || PALETTE[0] }))
  const sectores = oit.reskilling_sector.slice().sort((a, b) => num(a.prioridad) - num(b.prioridad))
    .map((x) => ({ label: String(x.sector), value: num(x.prioridad) }))
  return (
    <div className="space-y-4">
      <Kpis items={kpis} />
      <Card title="Reconversión de competencias: serie estructural OIT (2019–2026)" hint="Índices analíticos LATAM">
        <EChart height={400} option={lineChart(years, [
          { name: 'Demanda reskilling', color: '#E15759', area: true, data: s.map((x) => num(x.reskilling)) },
          { name: 'Vacío formativo', color: '#F28E2B', data: s.map((x) => num(x.vacio)) },
          { name: 'Prioridad aprend. permanente', color: '#B07AA1', data: s.map((x) => num(x.prioridad)) },
        ], { min: 0, max: 100 })} />
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Competencias emergentes" hint="Prioridad OIT 2024–2026"><EChart height={400} option={barHColored(emergentes, true)} /></Card>
        <Card title="Prioridad de aprendizaje permanente por sector (Colombia)"><EChart height={400} option={barH(sectores, '#B07AA1', 13, true)} /></Card>
      </div>
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight text-slate-800">Indicadores laborales DANE por departamento</h3>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
            {(['desocupacion', 'informalidad', 'ocupacion'] as const).map((m) => (
              <button key={m} onClick={() => setInd(m)} className={`px-3 py-1.5 text-[12px] font-semibold ${ind === m ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}>{m === 'desocupacion' ? 'Desocupación' : m === 'informalidad' ? 'Informalidad' : 'Ocupación'}</button>
            ))}
          </div>
        </div>
        <p className="mb-1 text-[11.5px] text-slate-400">{IND_LABEL[ind]} · año {yearOfDane}</p>
        {mapsReady ? <EChart height={520} option={{ ...choropleth(mapData, 'CO', 'NOMBRE_DPT', false), tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#e4e7ec', textStyle: { color: '#1a1f29' }, formatter: (p: { name: string; value?: number }) => `${p.name}<br><b>${p.value != null ? f1(p.value) : 's/d'}%</b>` } }} /> : <div className="grid h-[520px] place-items-center text-sm text-slate-400">Cargando mapa…</div>}
      </Card>
    </div>
  )
}

function Benchmark({ prosp }: { prosp: Prosp }) {
  const panel = prosp.panel
  const full = useMemo(() => new Uint8Array(panel.n).fill(1), [panel.n])
  const paises: Count[] = useMemo(() => sortDesc(meanBy(panel, 'pais', 'intensidad_relativa_0_100', full)), [panel, full])
  const items = paises.map((p) => ({ label: p.label, value: +p.value.toFixed(1), color: p.label === 'Colombia' ? '#F28E2B' : '#4E79A7' })).reverse()
  return (
    <Card title="Benchmarking regional: intensidad media por país" hint="Colombia resaltada · índice de demanda relativa (0–100)">
      <EChart height={560} option={barHColored(items, true)} />
    </Card>
  )
}
