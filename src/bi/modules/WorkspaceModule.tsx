import { useEffect, useMemo, useState } from 'react'
import { fetchDataset } from '../lib/api'
import { fmt, f1 } from '../lib/charts'
import { AiBuilder } from './workspace/AiBuilder'

const TABS = [
  { id: 'sistema', label: 'Constructor del sistema' },
  { id: 'ia', label: 'Constructor a la medida (IA)' },
]

export function WorkspaceModule() {
  const [tab, setTab] = useState('sistema')
  return (
    <div>
      <div className="mx-auto max-w-[1500px] px-6 pt-5">
        <div className="mb-1 flex items-baseline gap-3">
          <h1 className="text-lg font-black tracking-tight">Workspace · generador de productos académicos</h1>
          <span className="text-[12.5px] text-slate-400 print:hidden">Informes y análisis a partir de la base de conocimiento BI</span>
        </div>
        <div className="flex flex-wrap gap-1 border-b border-slate-200 print:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'sistema' ? <SystemReportBuilder /> : <AiBuilder />}
    </div>
  )
}

type Rec = Record<string, unknown>
type LabelVal = { label: string; value: number }
type PertDep = { dep: string; region: string; demand_index: number; supply_vigentes: number; supply_rank: number; demand_rank: number; gap: number; quadrant: string; top_areas: LabelVal[]; top_competencias: LabelVal[] }
type Pert = { meta: Rec; departamentos: PertDep[] }
type RecoSector = { sector: string; score: number; nivel: string; demanda: number; vacio: number; deficit_oferta: number; oferta_programas: number; competencias_clave: string[]; programas_sugeridos: string[]; justificacion: string }
type Reco = { meta: Rec; regiones: { region: string; n_departamentos: number; departamentos: string[]; sectores: RecoSector[] }[]; departamentos: { departamento: string; region: string; total_vigentes: number; recomendaciones: RecoSector[] }[] }

const NIVEL_COLOR: Record<string, string> = { 'Muy alta': '#d64550', Alta: '#e8930c', Media: '#2d9d78', Baja: '#8a94a6' }
const SECTIONS = [
  { id: 'resumen', label: 'Resumen ejecutivo' },
  { id: 'oferta', label: 'Oferta educativa' },
  { id: 'pertinencia', label: 'Pertinencia (oferta ↔ demanda)' },
  { id: 'recomendacion', label: 'Recomendación de programas' },
]

function SystemReportBuilder() {
  const [pert, setPert] = useState<Pert | null>(null)
  const [reco, setReco] = useState<Reco | null>(null)
  const [err, setErr] = useState('')
  const [scope, setScope] = useState<'nacional' | 'region' | 'departamento'>('nacional')
  const [sel, setSel] = useState('')
  const [sections, setSections] = useState<Record<string, boolean>>(Object.fromEntries(SECTIONS.map((s) => [s.id, true])))

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [p, r] = await Promise.all([fetchDataset('pertinencia'), fetchDataset('recomendaciones')])
        if (cancelled) return
        setPert(p.data as Pert); setReco(r.data as Reco)
      } catch (e) { if (!cancelled) setErr((e as Error).message) }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const items = useMemo(() => {
    if (!reco) return []
    return scope === 'region' ? reco.regiones.map((r) => r.region) : scope === 'departamento' ? reco.departamentos.map((d) => d.departamento).slice().sort() : []
  }, [reco, scope])
  const cur = sel || items[0] || ''
  const on = (id: string) => sections[id]

  if (err) return <div className="mx-auto max-w-3xl p-8 text-rose-600">Error al cargar datos: {err}</div>
  if (!pert || !reco) return <div className="grid min-h-[60vh] place-items-center text-sm text-slate-400">Cargando workspace…</div>

  const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  const D = pert.departamentos

  const exportCsv = () => {
    const rows = [['alcance', 'nombre', 'sector', 'score', 'nivel', 'demanda', 'vacio_o_deficit', 'oferta_programas', 'programas_sugeridos']]
    const push = (al: string, nm: string, list: RecoSector[]) => list.forEach((s) => rows.push([al, nm, s.sector, f1(s.score), s.nivel, f1(s.demanda), f1(s.deficit_oferta ?? s.vacio), fmt(s.oferta_programas), s.programas_sugeridos.join(' | ')]))
    if (scope === 'nacional') reco.regiones.forEach((r) => push('region', r.region, r.sectores))
    else if (scope === 'region') { const r = reco.regiones.find((x) => x.region === cur); if (r) push('region', r.region, r.sectores) }
    else { const d = reco.departamentos.find((x) => x.departamento === cur); if (d) push('departamento', d.departamento, d.recomendaciones) }
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `informe_${scope}${cur ? '_' + cur.replace(/[^a-zA-Z0-9]+/g, '_') : ''}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 px-6 py-5 md:grid-cols-[300px_1fr]">
      {/* Sidebar */}
      <aside className="h-max rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-[72px] print:hidden">
        <h3 className="text-sm font-bold">Constructor de informes</h3>
        <p className="mb-3 text-[12px] text-slate-400">Arma un producto por territorio combinando oferta, demanda y recomendaciones.</p>
        <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Alcance</label>
        <div className="mb-3 flex overflow-hidden rounded-lg border border-slate-300">
          {(['nacional', 'region', 'departamento'] as const).map((s) => (
            <button key={s} onClick={() => { setScope(s); setSel('') }} className={`flex-1 px-2 py-2 text-[12px] font-semibold ${scope === s ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}>{s === 'nacional' ? 'Nacional' : s === 'region' ? 'Región' : 'Depto.'}</button>
          ))}
        </div>
        {scope !== 'nacional' && (
          <select value={cur} onChange={(e) => setSel(e.target.value)} className="mb-3 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-[13px]">
            {items.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        )}
        <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Secciones</label>
        <div className="mb-4 space-y-1.5">
          {SECTIONS.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 text-[13px]">
              <input type="checkbox" checked={sections[s.id]} onChange={(e) => setSections((p) => ({ ...p, [s.id]: e.target.checked }))} className="h-4 w-4 accent-indigo-600" />
              {s.label}
            </label>
          ))}
        </div>
        <div className="space-y-2">
          <button onClick={() => window.print()} className="w-full rounded-lg bg-indigo-600 py-2.5 text-[13px] font-bold text-white hover:bg-indigo-700">⎙ Exportar a PDF</button>
          <button onClick={exportCsv} className="w-full rounded-lg border border-slate-300 bg-white py-2.5 text-[13px] font-semibold text-slate-700 hover:border-indigo-500">⭳ Exportar datos (CSV)</button>
        </div>
      </aside>

      {/* Documento */}
      <div className="rounded-xl border border-slate-200 bg-slate-100 p-6 print:border-0 print:bg-white print:p-0">
        <article className="doc mx-auto max-w-[820px] rounded-lg bg-white p-11 text-slate-800 shadow-[0_4px_24px_rgba(16,24,40,.12)] print:max-w-none print:p-0 print:shadow-none">
          {scope === 'nacional' && <NacionalDoc D={D} reco={reco} on={on} fecha={fecha} />}
          {scope === 'region' && <RegionDoc region={cur} D={D} reco={reco} on={on} fecha={fecha} />}
          {scope === 'departamento' && <DeptoDoc dep={cur} D={D} reco={reco} on={on} fecha={fecha} />}
          <p className="mt-7 border-t border-slate-200 pt-3 text-[10.5px] text-slate-400">
            Índices de demanda/pertinencia son analíticos agregados (no conteos de vacantes); la oferta es conteo real SNIES. Recomendación de programas: validar con empleadores, SENA regional y cámaras de comercio antes de decisiones de apertura. Fuentes: MEN/SNIES · OLE · OIT/CEPAL · DANE.
          </p>
        </article>
      </div>
    </div>
  )
}

function H1({ children }: { children: React.ReactNode }) { return <h1 className="mb-1 text-2xl font-black text-[#12203a]">{children}</h1> }
function Meta({ children }: { children: React.ReactNode }) { return <div className="mb-5 border-b-2 border-slate-200 pb-3 text-[12.5px] text-slate-500">{children}</div> }
function H2({ children }: { children: React.ReactNode }) { return <h2 className="mb-2.5 mt-6 border-l-[3px] border-indigo-600 pl-2.5 text-base font-bold text-[#1b3a86]">{children}</h2> }
function Kpi({ v, l }: { v: string; l: string }) { return <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-[20px] font-extrabold text-[#12203a]">{v}</div><div className="mt-0.5 text-[10.5px] text-slate-500">{l}</div></div> }
function Chip({ children }: { children: React.ReactNode }) { return <span className="mr-1.5 mb-1.5 inline-block rounded-md border border-[#dbe3ef] bg-[#eef2f8] px-2.5 py-1 text-[11.5px] font-semibold text-[#1b3a86]">{children}</span> }
function Nivel({ n }: { n: string }) { return <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: NIVEL_COLOR[n] }}>{n}</span> }

function RecoBlock({ list }: { list: RecoSector[] }) {
  return (
    <>
      {list.slice(0, 5).map((s, i) => (
        <div key={s.sector} className="mt-3">
          <h3 className="text-[13.5px] font-bold text-slate-800">{i + 1}. {s.sector} <Nivel n={s.nivel} /> <span className="font-extrabold">{f1(s.score)}</span></h3>
          <p className="my-1.5 rounded-lg bg-[#f7f9fc] px-3 py-2 text-[12.5px] leading-relaxed text-slate-600">{s.justificacion}</p>
          <div><b className="text-[12px]">Programas sugeridos:</b> {s.programas_sugeridos.map((p) => <Chip key={p}>{p}</Chip>)}</div>
        </div>
      ))}
    </>
  )
}

function NacionalDoc({ D, reco, on, fecha }: { D: PertDep[]; reco: Reco; on: (id: string) => boolean; fecha: string }) {
  const totalVig = D.reduce((a, b) => a + b.supply_vigentes, 0)
  const demMedia = D.reduce((a, b) => a + b.demand_index, 0) / D.length
  return (
    <>
      <H1>Informe nacional de pertinencia</H1>
      <Meta>Alcance: <b>Colombia ({D.length} departamentos)</b> · Generado {fecha} · Plataforma Algoritmo BI</Meta>
      {on('resumen') && <><H2>Resumen ejecutivo</H2>
        <div className="my-3 grid grid-cols-4 gap-2.5"><Kpi v={fmt(totalVig)} l="Programas vigentes" /><Kpi v={fmt(D.length)} l="Departamentos" /><Kpi v={f1(demMedia)} l="Índice de demanda medio" /><Kpi v={fmt(reco.regiones.length)} l="Regiones" /></div>
        <p className="text-[13px] leading-relaxed text-slate-700">La oferta de educación superior se concentra en pocos polos (Bogotá, Antioquia, Valle) mientras la demanda de competencias es más distribuida; el análisis regional identifica las brechas prioritarias.</p></>}
      {on('recomendacion') && <><H2>Prioridades por región</H2>
        <table className="w-full text-[12px]"><thead><tr className="text-left text-[10px] uppercase tracking-wide text-slate-500"><th className="py-1.5">Región</th><th className="py-1.5">Sector con mayor oportunidad</th><th className="py-1.5 text-right">Score</th><th className="py-1.5">Programas sugeridos</th></tr></thead>
          <tbody>{reco.regiones.map((r) => { const s = r.sectores[0]; return <tr key={r.region} className="border-t border-slate-100"><td className="py-1.5 font-semibold">{r.region}</td><td className="py-1.5">{s.sector}</td><td className="py-1.5 text-right"><Nivel n={s.nivel} /> {f1(s.score)}</td><td className="py-1.5">{s.programas_sugeridos.slice(0, 2).join(', ')}</td></tr> })}</tbody></table></>}
    </>
  )
}

function RegionDoc({ region, D, reco, on, fecha }: { region: string; D: PertDep[]; reco: Reco; on: (id: string) => boolean; fecha: string }) {
  const r = reco.regiones.find((x) => x.region === region)
  if (!r) return null
  const deps = D.filter((d) => d.region === region || r.departamentos.includes(d.dep))
  const totalVig = deps.reduce((a, b) => a + b.supply_vigentes, 0)
  return (
    <>
      <H1>Informe regional · {region}</H1>
      <Meta>Alcance: <b>Región {region}</b> ({r.n_departamentos} departamentos) · Generado {fecha}</Meta>
      {on('resumen') && <><H2>Resumen ejecutivo</H2>
        <div className="my-3 grid grid-cols-4 gap-2.5"><Kpi v={fmt(r.n_departamentos)} l="Departamentos" /><Kpi v={fmt(totalVig)} l="Programas vigentes" /><Kpi v={f1(r.sectores[0].score)} l="Score top sector" /><Kpi v={String(r.sectores.filter((s) => s.nivel === 'Muy alta' || s.nivel === 'Alta').length)} l="Sectores prioritarios" /></div>
        <p className="text-[13px] text-slate-700">Departamentos: {r.departamentos.join(', ')}.</p></>}
      {on('recomendacion') && <><H2>Recomendación de programas a ofertar</H2><RecoBlock list={r.sectores} /></>}
    </>
  )
}

function DeptoDoc({ dep, D, reco, on, fecha }: { dep: string; D: PertDep[]; reco: Reco; on: (id: string) => boolean; fecha: string }) {
  const p = D.find((d) => d.dep === dep)
  const rc = reco.departamentos.find((d) => d.departamento === dep)
  return (
    <>
      <H1>Informe departamental · {dep}</H1>
      <Meta>Alcance: <b>{dep}</b>{p ? ` · Región ${p.region}` : ''} · Generado {fecha}</Meta>
      {on('resumen') && p && <><H2>Resumen ejecutivo</H2>
        <div className="my-3 grid grid-cols-4 gap-2.5"><Kpi v={fmt(p.supply_vigentes)} l="Programas vigentes" /><Kpi v={f1(p.demand_index)} l="Índice de demanda" /><Kpi v={(p.gap > 0 ? '+' : '') + f1(p.gap)} l="Brecha (dem−ofe)" /><Kpi v={fmt(rc?.total_vigentes ?? p.supply_vigentes)} l="Oferta total" /></div>
        <p className="text-[13px] text-slate-700">Diagnóstico de pertinencia: cuadrante <b>{p.quadrant}</b>. {p.gap > 10 ? 'La demanda relativa supera la oferta: oportunidad de expansión pertinente.' : p.gap < -10 ? 'La oferta relativa supera la demanda: enfocar en actualización y calidad.' : 'Oferta y demanda relativamente alineadas.'}</p></>}
      {on('oferta') && p && <><H2>Oferta educativa</H2>
        <table className="w-full text-[12px]"><thead><tr className="text-left text-[10px] uppercase tracking-wide text-slate-500"><th className="py-1.5">Área de conocimiento</th><th className="py-1.5 text-right">Programas</th></tr></thead><tbody>{p.top_areas.map((a) => <tr key={a.label} className="border-t border-slate-100"><td className="py-1.5">{a.label}</td><td className="py-1.5 text-right tabular-nums">{fmt(a.value)}</td></tr>)}</tbody></table></>}
      {on('pertinencia') && p && <><H2>Pertinencia (oferta ↔ demanda)</H2>
        <p className="text-[13px] text-slate-700">Posición relativa entre departamentos — oferta: percentil <b>{f1(p.supply_rank)}</b>; demanda: percentil <b>{f1(p.demand_rank)}</b>; brecha <b>{p.gap > 0 ? '+' : ''}{f1(p.gap)}</b>.</p>
        <div className="mt-2">{p.top_competencias.slice(0, 8).map((c) => <Chip key={c.label}>{c.label} · {f1(c.value)}</Chip>)}</div></>}
      {on('recomendacion') && rc && <><H2>Recomendación de programas a ofertar</H2><RecoBlock list={rc.recomendaciones} /></>}
    </>
  )
}
