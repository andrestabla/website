import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchDataset } from '../lib/api'
import {
  buildMask, countBy, countLabel, distinctCount, labelIndex, rowsToCsv, sortDesc, topN,
  totalMask, type Factorized, type Filters,
} from '../lib/factorized'
import { barH, choropleth, donut, lineChart, roseConcentration, fmt, f1, PALETTE, COLORS } from '../lib/charts'
import { ensureMaps, toGeoName } from '../lib/geo'
import { EChart } from '../components/EChart'
import { Block as Card } from '../assistant/Block'
import { useAssistantViewContext } from '../assistant/AssistantContext'

type Meta = Record<string, unknown>
type Payload = { meta: Meta; dataset: Factorized }

const SELECT_FILTERS: { col: string; label: string }[] = [
  { col: 'estado', label: 'Estado' },
  { col: 'sector', label: 'Sector' },
  { col: 'nivel_academico', label: 'Nivel académico' },
  { col: 'nivel_formacion', label: 'Nivel de formación' },
  { col: 'modalidad', label: 'Modalidad' },
  { col: 'departamento', label: 'Departamento' },
  { col: 'area_conocimiento', label: 'Área de conocimiento' },
]
const FILTER_COLS = ['institucion', ...SELECT_FILTERS.map((f) => f.col)]
const TABS = [
  { id: 'resumen', label: 'Resumen ejecutivo' },
  { id: 'academico', label: 'Distribución académica' },
  { id: 'geografia', label: 'Geografía' },
  { id: 'instituciones', label: 'Instituciones y calidad' },
  { id: 'matricula', label: 'Matrícula' },
  { id: 'desercion', label: 'Deserción' },
  { id: 'reporte', label: 'Reporte técnico' },
]
// Pestañas con datos propios (agregados): los filtros del registro SNIES no aplican.
const DATA_TABS = ['matricula', 'desercion']

export function OfertaModule() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [err, setErr] = useState('')
  const [mapsReady, setMapsReady] = useState(false)
  const [filters, setFilters] = useState<Filters>(() =>
    Object.fromEntries(FILTER_COLS.map((c) => [c, -1]))
  )
  const [tab, setTab] = useState('resumen')
  const [matCtx, setMatCtx] = useState('')
  const [desCtx, setDesCtx] = useState('')
  const [mapMode, setMapMode] = useState<'dep' | 'reg'>('dep')
  const [instQuery, setInstQuery] = useState('')
  const [instOpen, setInstOpen] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetchDataset('insights')
        if (cancelled) return
        setPayload(res.data as Payload)
        await ensureMaps()
        if (!cancelled) setMapsReady(true)
      } catch (e) {
        if (!cancelled) setErr((e as Error).message)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setInstOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const ds = payload?.dataset ?? null
  const meta = payload?.meta ?? null

  const mask = useMemo(() => (ds ? buildMask(ds, filters) : new Uint8Array(0)), [ds, filters])

  const kpis = useMemo(() => {
    if (!ds) return []
    const total = totalMask(mask)
    const vig = countLabel(ds, 'estado', 'Vigente', mask)
    const inact = countLabel(ds, 'estado', 'Inactivo', mask)
    const pctVig = total ? Math.round((vig / total) * 100) : 0
    return [
      { c: PALETTE[0], v: fmt(total), l: 'Programas (registros)' },
      { c: COLORS.good, v: fmt(vig), l: `Vigentes · ${pctVig}%` },
      { c: PALETTE[1], v: fmt(inact), l: 'Inactivos' },
      { c: PALETTE[6], v: fmt(distinctCount(ds, 'cod_institucion', mask)), l: 'Instituciones (IES)' },
      { c: PALETTE[2], v: fmt(distinctCount(ds, 'programa', mask)), l: 'Programas únicos' },
      { c: PALETTE[3], v: fmt(distinctCount(ds, 'municipio', mask)), l: 'Municipios con oferta' },
    ]
  }, [ds, mask])

  // Opciones de institución para el buscador (contextual)
  const instOptions = useMemo(() => {
    if (!ds || !instOpen) return []
    const m = buildMask(ds, filters, 'institucion')
    const q = instQuery.trim().toLowerCase()
    let opts = countBy(ds, 'institucion', m).filter((d) => d.label !== 'Sin dato')
    if (q) opts = opts.filter((d) => d.label.toLowerCase().includes(q))
    return sortDesc(opts).slice(0, 60)
  }, [ds, filters, instQuery, instOpen])

  const instSelectedLabel =
    ds && filters.institucion >= 0 ? ds.dicts.institucion[filters.institucion] : ''

  // Contexto de filtros activos para el asistente IA.
  const viewCtx = useMemo(() => {
    if (!ds) return ''
    if (tab === 'matricula') {
      return matCtx || 'Pestaña: Matrícula (estudiantes matriculados SNIES 2015–2021, agregados oficiales)'
    }
    if (tab === 'desercion') {
      return desCtx || 'Pestaña: Deserción (SPADIES 2019–2024, capa analítica calibrada con cifras oficiales)'
    }
    const parts: string[] = [`Pestaña: ${TABS.find((t) => t.id === tab)?.label || tab}`]
    if (filters.institucion >= 0) parts.push(`Institución: ${ds.dicts.institucion[filters.institucion]}`)
    for (const f of SELECT_FILTERS) {
      const idx = filters[f.col]
      if (idx >= 0 && ds.dicts[f.col]) parts.push(`${f.label}: ${ds.dicts[f.col][idx]}`)
    }
    parts.push(`Mostrando ${fmt(totalMask(mask))} de ${fmt(ds.n)} registros`)
    return parts.join(' · ')
  }, [ds, filters, tab, mask, matCtx, desCtx])
  useAssistantViewContext(viewCtx)

  if (err) return <div className="mx-auto max-w-3xl p-8 text-rose-600">Error al cargar datos: {err}</div>
  if (!ds || !meta) return <div className="grid min-h-[60vh] place-items-center text-sm text-slate-400">Cargando oferta educativa…</div>

  const total = totalMask(mask)
  const setFilter = (col: string, idx: number) => setFilters((f) => ({ ...f, [col]: idx }))
  const reset = () => {
    setFilters(Object.fromEntries(FILTER_COLS.map((c) => [c, -1])))
    setInstQuery('')
  }
  const exportCsv = () => {
    const blob = new Blob([rowsToCsv(ds, mask)], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `snies_oferta_filtrada.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const filterCountsFor = (col: string) => {
    const m = buildMask(ds, filters, col)
    const map = Object.fromEntries(countBy(ds, col, m).map((c) => [c.label, c.value]))
    return ds.dicts[col].slice().sort((a, b) => (map[b] || 0) - (map[a] || 0)).map((l) => ({ label: l, count: map[l] || 0 }))
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-5">
      <div className="mb-3 flex items-baseline gap-3">
        <h1 className="text-lg font-black tracking-tight">Observatorio de oferta educativa</h1>
        <span className="text-[12.5px] text-slate-400">Fuente MEN / SNIES · corte {String(meta.fecha_corte ?? '')} · {fmt(Number(meta.total_programas ?? 0))} programas</span>
        <div className="ml-auto flex gap-2">
          <button onClick={exportCsv} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-500 hover:text-indigo-600">⭳ CSV</button>
          <button onClick={() => window.print()} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-500 hover:text-indigo-600">⎙ Imprimir</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-3 flex flex-wrap gap-1 border-b border-slate-200">
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

      {/* Filtros y KPIs del registro (no aplican a las pestañas de datos agregados) */}
      {!DATA_TABS.includes(tab) && (<>
      <div className="mb-3 flex flex-wrap items-end gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div ref={comboRef} className="relative flex flex-col gap-1">
          <label className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Institución educativa</label>
          <div className="relative">
            <input
              value={instOpen ? instQuery : instSelectedLabel || instQuery}
              onChange={(e) => { setInstQuery(e.target.value); setInstOpen(true) }}
              onFocus={() => { setInstOpen(true); setInstQuery('') }}
              placeholder="Buscar institución…"
              className="w-64 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 pr-6 text-[13px] outline-none focus:border-indigo-500"
            />
            {filters.institucion >= 0 && (
              <button onClick={() => { setFilter('institucion', -1); setInstQuery('') }} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600">×</button>
            )}
            {instOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {instOptions.length ? instOptions.map((o) => (
                  <div
                    key={o.label}
                    onMouseDown={(e) => { e.preventDefault(); setFilter('institucion', labelIndex(ds, 'institucion', o.label)); setInstOpen(false); setInstQuery('') }}
                    className="flex cursor-pointer justify-between gap-3 border-b border-slate-100 px-2.5 py-2 text-[12.5px] last:border-0 hover:bg-slate-50"
                  >
                    <span>{o.label}</span>
                    <span className="tabular-nums text-slate-400">{fmt(o.value)}</span>
                  </div>
                )) : <div className="px-2.5 py-2 text-[12px] text-slate-400">Sin coincidencias</div>}
              </div>
            )}
          </div>
        </div>

        {SELECT_FILTERS.map((f) => {
          const opts = filterCountsFor(f.col)
          return (
            <div key={f.col} className="flex flex-col gap-1">
              <label className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{f.label}</label>
              <select
                value={filters[f.col]}
                onChange={(e) => setFilter(f.col, Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-[13px] outline-none focus:border-indigo-500"
              >
                <option value={-1}>Todos</option>
                {opts.map((o) => (
                  <option key={o.label} value={labelIndex(ds, f.col, o.label)}>{o.label}{o.count ? ` (${fmt(o.count)})` : ''}</option>
                ))}
              </select>
            </div>
          )
        })}
        <button onClick={reset} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:border-indigo-500">↺ Limpiar</button>
        <div className="ml-auto self-center text-[12.5px] text-slate-500">Mostrando <b className="text-indigo-600">{fmt(total)}</b> de {fmt(ds.n)} registros</div>
      </div>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.l} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="absolute left-0 top-0 h-[3px] w-full" style={{ background: k.c }} />
            <div className="text-[25px] font-extrabold tracking-tight">{k.v}</div>
            <div className="mt-0.5 text-[12px] text-slate-500">{k.l}</div>
          </div>
        ))}
      </div>
      </>)}

      {tab === 'matricula' && <MatriculaTab mapsReady={mapsReady} onCtx={setMatCtx} />}
      {tab === 'desercion' && <DesercionTab mapsReady={mapsReady} onCtx={setDesCtx} />}

      {tab === 'resumen' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Programas por departamento (Top 15)" hint="Ubicación de oferta del programa"><EChart height={400} option={barH(countBy(ds, 'departamento', mask), PALETTE[0], 15)} /></Card>
          <Card title="Distribución por sector" hint="Naturaleza de la institución"><EChart height={400} option={donut(countBy(ds, 'sector', mask))} /></Card>
          <Card title="Estado del registro" hint='Vigente = "Activo" normalizado'><EChart option={donut(countBy(ds, 'estado', mask))} /></Card>
          <Card title="Pregrado vs. Posgrado" hint="Nivel académico"><EChart option={donut(countBy(ds, 'nivel_academico', mask))} /></Card>
        </div>
      )}

      {tab === 'academico' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Nivel de formación"><EChart height={400} option={barH(countBy(ds, 'nivel_formacion', mask), PALETTE[3], 12)} /></Card>
            <Card title="Áreas de conocimiento"><EChart height={400} option={barH(countBy(ds, 'area_conocimiento', mask), PALETTE[6], 12)} /></Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Modalidad / metodología"><EChart option={donut(countBy(ds, 'modalidad', mask))} /></Card>
            <Card title="Núcleos básicos de conocimiento (Top 15)"><EChart option={barH(countBy(ds, 'nbc', mask), PALETTE[1], 15)} /></Card>
          </div>
          <Card title="Programas más ofertados (por título académico)">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400"><th className="py-2">#</th><th className="py-2">Programa</th><th className="py-2 text-right">Registros</th></tr></thead>
                <tbody>
                  {topN(countBy(ds, 'programa', mask).filter((d) => d.label !== 'Sin dato'), 100).map((d, i) => (
                    <tr key={d.label} className="border-t border-slate-100"><td className="py-2 text-slate-400">{i + 1}</td><td className="py-2">{d.label}</td><td className="py-2 text-right tabular-nums">{fmt(d.value)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'geografia' && (
        <div className="space-y-4">
          <Card
            title={mapMode === 'reg' ? 'Mapa de oferta por región' : 'Mapa de oferta por departamento'}
            right={
              <div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
                {(['dep', 'reg'] as const).map((m) => (
                  <button key={m} onClick={() => setMapMode(m)} className={`px-3 py-1.5 text-[12px] font-semibold ${mapMode === m ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}>{m === 'dep' ? 'Departamento' : 'Región'}</button>
                ))}
              </div>
            }
          >
            {mapsReady ? (
              <EChart
                height={560}
                option={
                  mapMode === 'reg'
                    ? choropleth(countBy(ds, 'region', mask).filter((d) => d.label !== 'Sin dato').map((d) => ({ name: d.label, value: d.value })), 'CO_REG', 'NOMBRE_REGION', true)
                    : choropleth((() => { const agg: Record<string, number> = {}; for (const d of countBy(ds, 'departamento', mask)) { const g = toGeoName(d.label); if (g) agg[g] = (agg[g] || 0) + d.value } return Object.entries(agg).map(([name, value]) => ({ name, value })) })(), 'CO', 'NOMBRE_DPT', false)
                }
              />
            ) : <div className="grid h-[560px] place-items-center text-sm text-slate-400">Cargando mapa…</div>}
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Concentración territorial" hint="Top 5 departamentos vs. resto"><EChart height={400} option={roseConcentration(countBy(ds, 'departamento', mask))} /></Card>
            <Card title="Top municipios de oferta"><EChart height={400} option={barH(countBy(ds, 'municipio', mask), PALETTE[3], 15)} /></Card>
          </div>
        </div>
      )}

      {tab === 'instituciones' && (
        <div className="space-y-4">
          <Card title="Instituciones con mayor oferta (Top 20)" hint="Número de programas registrados por IES"><EChart height={560} option={barH(countBy(ds, 'institucion', mask), PALETTE[2], 20)} /></Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Carácter académico"><EChart option={donut(countBy(ds, 'caracter_academico', mask))} /></Card>
            <Card title="Acreditación institucional (alta calidad)"><EChart option={donut(countBy(ds, 'ies_acreditada_bin', mask))} /></Card>
          </div>
        </div>
      )}

      {tab === 'reporte' && (
        <Card title="Reporte técnico">
          <div className="mb-3 flex flex-wrap gap-2 text-[11.5px]">
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500">Corte: {String(meta.fecha_corte ?? '')}</span>
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500">Generado: {String(meta.fecha_generacion ?? '')}</span>
          </div>
          <table className="w-full text-[13px]">
            <tbody>
              {([
                ['Total de programas (registros)', 'total_programas'],
                ['Programas vigentes', 'programas_vigentes'],
                ['Programas inactivos', 'programas_inactivos'],
                ['Instituciones con oferta', 'instituciones_con_oferta'],
                ['Programas sin área de conocimiento', 'programas_sin_area'],
                ['Programas sin municipio', 'programas_sin_municipio'],
                ['Programas sin nivel de formación', 'programas_sin_nivel_formacion'],
                ['Programas sin nº de créditos', 'programas_sin_creditos'],
                ['Duplicados (prog·IES·mun·modalidad·nivel)', 'duplicados_prog_inst_muni_modalidad'],
              ] as const).map(([label, key]) => (
                <tr key={key} className="border-t border-slate-100"><td className="py-2 text-slate-600">{label}</td><td className="py-2 text-right tabular-nums font-semibold">{fmt(Number(meta[key] ?? 0))}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-[12.5px] leading-relaxed text-slate-500">{String(meta.nota_registro_calificado ?? '')}</p>
          <p className="mt-2 text-[12px] text-slate-400">Nombre del programa reconstruido desde el título académico otorgado (la columna nombreprograma de la fuente viene corrupta). Estado "Activo" → "Vigente".</p>
        </Card>
      )}
    </div>
  )
}

// ── Pestañas de datos agregados: Matrícula (SNIES) y Deserción (SPADIES) ────
type MatRow = { anio: number; matriculados: number }
type FactTable = { cols: string[]; rows: number[][] }
type Matricula = {
  meta: Meta
  serie_nacional: MatRow[]
  dicts: Record<string, string[]>
  dict_ies: string[]
  facts: FactTable
  facts_gm: FactTable
  top_programas_anio: { anio: number; programa: string; matriculados: number }[]
}

function KpiRow({ kpis }: { kpis: { c: string; v: string; l: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {kpis.map((k) => (
        <div key={k.l} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="absolute left-0 top-0 h-[3px] w-full" style={{ background: k.c }} />
          <div className="text-[23px] font-extrabold tracking-tight">{k.v}</div>
          <div className="mt-0.5 text-[12px] text-slate-500">{k.l}</div>
        </div>
      ))}
    </div>
  )
}

const NO_DISPONIBLE = 'No disponible en esta fuente'

function Sel({ label, value, onChange, options, disabled }: { label: string; value: number; onChange?: (v: number) => void; options: { v: number; label: string }[]; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-1" title={disabled ? NO_DISPONIBLE : undefined}>
      <label className={`text-[10.5px] font-semibold uppercase tracking-wide ${disabled ? 'text-slate-300' : 'text-slate-400'}`}>{label}</label>
      <select
        value={disabled ? -1 : value}
        disabled={disabled}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className={`rounded-lg border px-2.5 py-2 text-[13px] outline-none ${disabled ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' : 'border-slate-300 bg-slate-50 focus:border-indigo-500'}`}
      >
        <option value={-1}>{disabled ? 'No aplica' : 'Todos'}</option>
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

/** Buscador de institución (mismo patrón del observatorio) para las pestañas de datos. */
function IesCombo({ options, selectedLabel, onSelect, onClear }: {
  options: { v: number; label: string; count: number }[]
  selectedLabel: string
  onSelect: (v: number) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const q = query.trim().toLowerCase()
  const shown = (q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options).slice(0, 60)
  return (
    <div ref={boxRef} className="relative flex flex-col gap-1">
      <label className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Institución educativa</label>
      <div className="relative">
        <input
          value={open ? query : selectedLabel || query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true); setQuery('') }}
          placeholder="Buscar institución…"
          className="w-64 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 pr-6 text-[13px] outline-none focus:border-indigo-500"
        />
        {selectedLabel && (
          <button onClick={() => { onClear(); setQuery('') }} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600">×</button>
        )}
        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {shown.length ? shown.map((o) => (
              <div
                key={o.v}
                onMouseDown={(e) => { e.preventDefault(); onSelect(o.v); setOpen(false); setQuery('') }}
                className="flex cursor-pointer justify-between gap-3 border-b border-slate-100 px-2.5 py-2 text-[12.5px] last:border-0 hover:bg-slate-50"
              >
                <span>{o.label}</span>
                <span className="tabular-nums text-slate-400">{fmt(o.count)}</span>
              </div>
            )) : <div className="px-2.5 py-2 text-[12px] text-slate-400">Sin coincidencias</div>}
          </div>
        )}
      </div>
    </div>
  )
}

const toOpts = (labels: string[]) => labels.map((label, v) => ({ v, label })).sort((a, b) => a.label.localeCompare(b.label, 'es'))

// Niveles de formación de pregrado (el resto es posgrado).
const PREGRADO = new Set(['Universitaria', 'Tecnológica', 'Técnica profesional'])
const NIVEL_ACADEMICO = ['Pregrado', 'Posgrado']

function MatriculaTab({ mapsReady, onCtx }: { mapsReady: boolean; onCtx: (s: string) => void }) {
  const [mat, setMat] = useState<Matricula | null>(null)
  const [err, setErr] = useState('')
  // Mismos filtros del observatorio (estado no aplica a matrícula) + año.
  const [flt, setFlt] = useState({ anio: -1, ies: -1, sector: -1, nivel: -1, nf: -1, met: -1, dep: -1, area: -1 })

  useEffect(() => {
    let cancelled = false
    fetchDataset('matricula')
      .then((r) => { if (!cancelled) setMat(r.data as Matricula) })
      .catch((e) => { if (!cancelled) setErr((e as Error).message) })
    return () => { cancelled = true }
  }, [])

  const years = useMemo(() => (mat ? mat.serie_nacional.map((s) => s.anio) : []), [mat])
  const firstYear = years[0] ?? 2015
  const lastYear = years[years.length - 1] ?? 2024
  const kpiYear = flt.anio >= 0 ? flt.anio : lastYear
  const scopeLabel = flt.anio >= 0 ? String(flt.anio) : `${firstYear}–${lastYear}`

  // Agregaciones desde la tabla de hechos unificada
  // (filas: [anio, ies, dep, area, nf, met, sector, v]).
  const A = useMemo(() => {
    if (!mat?.facts || mat.facts.cols.length !== 8) return null
    const D = mat.dicts
    const posgSet = new Set(D.nivel_formacion.map((l, i) => (PREGRADO.has(l) ? -1 : i)).filter((i) => i >= 0))
    const nivelOk = (nf: number) => flt.nivel < 0 || (flt.nivel === 1) === posgSet.has(nf)
    const yrOk = (y: number) => flt.anio < 0 || y === flt.anio
    const iOficial = D.sector.indexOf('Oficial')
    const iVirtual = D.metodologia.indexOf('Virtual')

    const byDep = new Map<number, number>()
    const byArea = new Map<number, number>()
    const byNf = new Map<number, number>()
    const bySector = new Map<number, number>()
    const byIes = new Map<number, number>()
    const iesOpts = new Map<number, number>()
    const metSerie = new Map<number, Map<number, number>>()
    const serie = new Map<number, number>()
    let totalKpi = 0
    let totalPrev = 0
    let totalFirst = 0
    let posg = 0
    let totNf = 0
    let oficial = 0
    let totSec = 0
    let virtual = 0
    let totMet = 0
    for (const r of mat.facts.rows) {
      const [y, ies, dep, area, nf, met, sec, v] = r
      const okIes = flt.ies < 0 || ies === flt.ies
      const okDep = flt.dep < 0 || dep === flt.dep
      const okArea = flt.area < 0 || area === flt.area
      const okNf = (flt.nf < 0 || nf === flt.nf) && nivelOk(nf)
      const okMet = flt.met < 0 || met === flt.met
      const okSec = flt.sector < 0 || sec === flt.sector
      const all = okIes && okDep && okArea && okNf && okMet && okSec
      if (all) {
        serie.set(y, (serie.get(y) || 0) + v)
        if (y === kpiYear) totalKpi += v
        if (y === kpiYear - 1) totalPrev += v
        if (y === firstYear) totalFirst += v
      }
      if (y === kpiYear) {
        if (okIes && okDep && okArea && okMet && okSec && (flt.nf < 0 || nf === flt.nf)) {
          totNf += v
          if (posgSet.has(nf)) posg += v
        }
        if (okIes && okDep && okArea && okNf && okMet) {
          totSec += v
          if (sec === iOficial) oficial += v
        }
        if (okIes && okDep && okArea && okNf && okSec) {
          totMet += v
          if (met === iVirtual) virtual += v
        }
      }
      // Series/grupos (cada gráfica excluye su propia dimensión)
      if (okIes && okDep && okArea && okNf && okSec) {
        if (!metSerie.has(met)) metSerie.set(met, new Map())
        const ms = metSerie.get(met)!
        ms.set(y, (ms.get(y) || 0) + v)
      }
      if (!yrOk(y)) continue
      if (okIes && okArea && okNf && okMet && okSec) byDep.set(dep, (byDep.get(dep) || 0) + v)
      if (okIes && okDep && okNf && okMet && okSec) byArea.set(area, (byArea.get(area) || 0) + v)
      if (okIes && okDep && okArea && okMet && okSec && nivelOk(nf)) byNf.set(nf, (byNf.get(nf) || 0) + v)
      if (okIes && okDep && okArea && okNf && okMet) bySector.set(sec, (bySector.get(sec) || 0) + v)
      if (okDep && okArea && okNf && okMet && okSec) {
        byIes.set(ies, (byIes.get(ies) || 0) + v)
        iesOpts.set(ies, (iesOpts.get(ies) || 0) + v)
      }
    }

    // Género (filas: [anio, dep, gen, met, v]) — cruza año, departamento y modalidad.
    const byGen = new Map<number, number>()
    let mujeres = 0
    let totGm = 0
    const iMujeres = D.genero.indexOf('Mujeres')
    for (const r of mat.facts_gm.rows) {
      const [y, dep, gen, met, v] = r
      if (flt.dep >= 0 && dep !== flt.dep) continue
      if (flt.met >= 0 && met !== flt.met) continue
      if (yrOk(y)) byGen.set(gen, (byGen.get(gen) || 0) + v)
      if (y === kpiYear) {
        totGm += v
        if (gen === iMujeres) mujeres += v
      }
    }

    // Top programas — solo cruza año.
    const byProg = new Map<string, number>()
    for (const t of mat.top_programas_anio) {
      if (flt.anio >= 0 && t.anio !== flt.anio) continue
      byProg.set(t.programa, (byProg.get(t.programa) || 0) + t.matriculados)
    }

    return { byDep, byArea, byNf, bySector, byIes, iesOpts, byGen, byProg, metSerie, serie, totalKpi, totalPrev, totalFirst, posg, totNf, oficial, totSec, virtual, totMet, mujeres, totGm }
  }, [mat, flt, kpiYear, firstYear])

  // Contexto para el asistente IA.
  useEffect(() => {
    if (!mat || !A) return
    const D = mat.dicts
    const parts = [`Pestaña: Matrícula (SNIES ${firstYear}–${lastYear}, agregados oficiales; 2022–2024 calibrados al total oficial del MEN)`]
    if (flt.anio >= 0) parts.push(`Año: ${flt.anio}`)
    if (flt.ies >= 0) parts.push(`Institución: ${mat.dict_ies[flt.ies]}`)
    if (flt.sector >= 0) parts.push(`Sector: ${D.sector[flt.sector]}`)
    if (flt.nivel >= 0) parts.push(`Nivel académico: ${NIVEL_ACADEMICO[flt.nivel]}`)
    if (flt.nf >= 0) parts.push(`Nivel de formación: ${D.nivel_formacion[flt.nf]}`)
    if (flt.met >= 0) parts.push(`Modalidad: ${D.metodologia[flt.met]}`)
    if (flt.dep >= 0) parts.push(`Departamento: ${D.departamento[flt.dep]}`)
    if (flt.area >= 0) parts.push(`Área: ${D.area[flt.area]}`)
    parts.push(`Matriculados en la selección (${kpiYear}): ${fmt(A.totalKpi)}`)
    parts.push('Nota: género solo cruza año/departamento/modalidad; el top de programas solo el año')
    onCtx(parts.join(' · '))
  }, [mat, A, flt, kpiYear, firstYear, lastYear, onCtx])

  if (err) return <div className="p-6 text-rose-600">Error al cargar matrícula: {err}</div>
  if (!mat) return <div className="grid min-h-[40vh] place-items-center text-sm text-slate-400">Cargando matrícula…</div>
  if (!A) return <div className="p-6 text-slate-500">El dataset de matrícula no incluye la tabla de hechos unificada; vuelve a importarlo.</div>

  const D = mat.dicts
  const growthBase = flt.anio >= 0 ? A.totalPrev : A.totalFirst
  const growthLabel = flt.anio >= 0 ? `vs ${flt.anio - 1}` : `vs ${firstYear}`
  const growth = growthBase ? ((A.totalKpi - growthBase) / growthBase) * 100 : null
  const pct = (part: number, tot: number) => (tot ? (part / tot) * 100 : 0)

  const kpis = [
    { c: PALETTE[0], v: fmt(A.totalKpi), l: `Matriculados ${kpiYear}` },
    { c: growth == null || growth >= 0 ? COLORS.good : '#d64550', v: growth == null ? '—' : `${growth >= 0 ? '+' : ''}${f1(growth)}%`, l: `Variación ${growthLabel}` },
    { c: PALETTE[6], v: `${f1(pct(A.mujeres, A.totGm))}%`, l: 'Mujeres' },
    { c: PALETTE[4], v: `${f1(pct(A.oficial, A.totSec))}%`, l: 'Sector oficial' },
    { c: PALETTE[2], v: `${f1(pct(A.virtual, A.totMet))}%`, l: 'Modalidad virtual' },
    { c: PALETTE[3], v: `${f1(pct(A.posg, A.totNf))}%`, l: 'Posgrado' },
  ]

  const toCount = (m: Map<number, number>, dict: string[]) =>
    [...m.entries()].map(([i, value]) => ({ label: dict[i], value })).sort((a, b) => b.value - a.value)
  const mapData = [...A.byDep.entries()]
    .map(([i, value]) => ({ name: toGeoName(D.departamento[i]) || '', value }))
    .filter((x) => x.name)
  const metSeries = D.metodologia.map((m, i) => ({
    name: m,
    color: PALETTE[i % PALETTE.length],
    data: years.map((y) => A.metSerie.get(i)?.get(y) ?? null),
  })).filter((s) => s.data.some((v) => v))
  const iesOptions = [...A.iesOpts.entries()]
    .map(([v, count]) => ({ v, label: mat.dict_ies[v], count }))
    .sort((a, b) => b.count - a.count)
  const genHint = 'Género cruza año, departamento y modalidad (no institución/área/nivel/sector)'

  const set = (k: string) => (v: number) => setFlt((f) => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      {/* Filtros: los mismos del observatorio (estado no aplica) + año */}
      <div className="flex flex-wrap items-end gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <IesCombo options={iesOptions} selectedLabel={flt.ies >= 0 ? mat.dict_ies[flt.ies] : ''} onSelect={set('ies')} onClear={() => set('ies')(-1)} />
        <Sel label="Año" value={flt.anio} onChange={set('anio')} options={years.map((y) => ({ v: y, label: String(y) }))} />
        <Sel label="Estado" value={-1} options={[]} disabled />
        <Sel label="Sector" value={flt.sector} onChange={set('sector')} options={toOpts(D.sector)} />
        <Sel label="Nivel académico" value={flt.nivel} onChange={set('nivel')} options={NIVEL_ACADEMICO.map((l, v) => ({ v, label: l }))} />
        <Sel label="Nivel de formación" value={flt.nf} onChange={set('nf')} options={toOpts(D.nivel_formacion)} />
        <Sel label="Modalidad" value={flt.met} onChange={set('met')} options={toOpts(D.metodologia)} />
        <Sel label="Departamento" value={flt.dep} onChange={set('dep')} options={toOpts(D.departamento)} />
        <Sel label="Área de conocimiento" value={flt.area} onChange={set('area')} options={toOpts(D.area)} />
        <button onClick={() => setFlt({ anio: -1, ies: -1, sector: -1, nivel: -1, nf: -1, met: -1, dep: -1, area: -1 })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:border-indigo-500">↺ Limpiar</button>
        <div className="ml-auto self-center text-[12.5px] text-slate-500">Selección {kpiYear}: <b className="text-indigo-600">{fmt(A.totalKpi)}</b> matriculados</div>
      </div>

      <KpiRow kpis={kpis} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Evolución de la matrícula (${firstYear}–${lastYear})`} hint="Estudiantes matriculados por año en la selección · totales verificados con cifras oficiales SNIES/MEN">
          <EChart height={380} option={lineChart(years, [{ name: 'Matriculados', color: PALETTE[0], area: true, data: years.map((y) => A.serie.get(y) ?? 0) }])} />
        </Card>
        <Card title="Evolución por modalidad" hint="Modalidades combinadas (Híbrida/Dual) se reportan desde 2022">
          <EChart height={380} option={lineChart(years, metSeries)} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Matrícula por departamento (${scopeLabel})`} hint="Departamento de oferta del programa">
          {mapsReady ? (
            <EChart height={480} option={{ ...choropleth(mapData, 'CO', 'NOMBRE_DPT', false), tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#e4e7ec', textStyle: { color: '#1a1f29' }, formatter: (p: { name: string; value?: number }) => `${p.name}<br><b>${p.value != null ? fmt(p.value) : 's/d'}</b> matriculados` } }} />
          ) : (
            <div className="grid h-[480px] place-items-center text-sm text-slate-400">Cargando mapa…</div>
          )}
        </Card>
        <Card title={`Top departamentos por matrícula (${scopeLabel})`}>
          <EChart height={480} option={barH(toCount(A.byDep, D.departamento), PALETTE[0], 15)} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Matrícula por área de conocimiento (${scopeLabel})`}>
          <EChart height={380} option={barH(toCount(A.byArea, D.area), PALETTE[6], 10)} />
        </Card>
        <Card title={`Matrícula por nivel de formación (${scopeLabel})`}>
          <EChart height={380} option={barH(toCount(A.byNf, D.nivel_formacion), PALETTE[3], 10)} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Programas con más matriculados (${scopeLabel})`} hint="Nombre de programa unificado (Top 15) · solo cruza el filtro de año">
          <EChart height={480} option={barH([...A.byProg.entries()].map(([label, value]) => ({ label, value })), PALETTE[2], 15)} />
        </Card>
        <Card title={`IES con más matriculados (${scopeLabel})`} hint="Cruza todos los filtros">
          <EChart height={480} option={barH(toCount(A.byIes, mat.dict_ies), PALETTE[4], 15)} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Distribución por género (${scopeLabel})`} hint={genHint}>
          <EChart option={donut(toCount(A.byGen, D.genero))} />
        </Card>
        <Card title={`Distribución por sector (${scopeLabel})`}>
          <EChart option={donut(toCount(A.bySector, D.sector))} />
        </Card>
      </div>

      <p className="rounded-xl border border-slate-200 bg-white p-3.5 text-[11.5px] leading-relaxed text-slate-500">
        Fuente: {String(mat.meta.fuente ?? '')} · Cobertura {String(mat.meta.cobertura_temporal ?? '')}. {String(mat.meta.nota_normalizacion ?? '')} La tabla de hechos cruza año × institución × departamento × área × nivel de formación × modalidad × sector; género solo cruza año/departamento/modalidad y el top de programas solo el año. El filtro Estado no aplica (es propio del registro de programas).
      </p>
    </div>
  )
}

// ── Pestaña Deserción (SPADIES 2019–2024, capa analítica) ───────────────────
type DesRow = (number | null)[]
type Desercion = {
  meta: Meta
  dicts: { departamento: string[]; area: string[]; nivel_formacion: string[]; programa: string[] }
  regiones: Record<string, string>
  indicadores_nacionales: { anio: number; matricula_total: number | null; crecimiento_pct: number | null; cobertura_pct: number | null; tasa_desercion_anual_pct: number | null; tipo_dato: string }[]
  panel: { cols: string[]; rows: DesRow[] }
  cohortes: { cols: string[]; rows: DesRow[] }
  programas_panel: { cols: string[]; rows: DesRow[] }
  resumen_departamental: { departamento: string; region: string; matricula_2019_2024: number; tasa_desercion_anual_pct: number; retencion_pct: number; atractivo_laboral: number; prioridad: string; accion_sugerida: string }[]
  top_programas: { programa: string; area: string; nivel: string; matricula_2019_2024: number; desertores_2019_2024: number; tasa_anual_pct: number; tasa_cohorte_pct: number; atractivo_laboral: number }[]
}

const PRIORIDAD_COLOR: Record<string, string> = { Alta: '#d64550', Media: '#e8a13d', Baja: '#2d9d78' }

function DesercionTab({ mapsReady, onCtx }: { mapsReady: boolean; onCtx: (s: string) => void }) {
  const [des, setDes] = useState<Desercion | null>(null)
  const [serieOficial, setSerieOficial] = useState<MatRow[] | null>(null)
  const [err, setErr] = useState('')
  const [flt, setFlt] = useState({ anio: -1, dep: -1, area: -1, nf: -1 })

  useEffect(() => {
    let cancelled = false
    fetchDataset('desercion')
      .then((r) => { if (!cancelled) setDes(r.data as Desercion) })
      .catch((e) => { if (!cancelled) setErr((e as Error).message) })
    fetchDataset('matricula')
      .then((r) => { if (!cancelled) setSerieOficial((r.data as Matricula).serie_nacional) })
      .catch(() => {}) // el cruce nacional degrada sin la serie oficial
    return () => { cancelled = true }
  }, [])

  const years = useMemo(() => (des ? [...new Set(des.panel.rows.map((r) => r[0] as number))].sort() : []), [des])
  // Último año con tasa oficial nacional publicada (2024 aún pendiente).
  const lastOfficial = useMemo(() => {
    const con = des?.indicadores_nacionales.filter((i) => i.tasa_desercion_anual_pct != null) ?? []
    return con.length ? con[con.length - 1].anio : 2023
  }, [des])
  const kpiYear = flt.anio >= 0 ? flt.anio : lastOfficial
  const scopeLabel = flt.anio >= 0 ? String(flt.anio) : `${years[0] ?? 2019}–${years[years.length - 1] ?? 2024}`
  const hasDims = flt.dep >= 0 || flt.area >= 0 || flt.nf >= 0

  // Panel: [anio, dep, area, nf, matricula, tasa_anual, desertores, tasa_cohorte, graduacion, atractivo]
  const A = useMemo(() => {
    if (!des) return null
    const yrOk = (y: number) => flt.anio < 0 || y === flt.anio
    type Acc = { mat: number; des: number; coh: number; cohW: number; atr: number; atrW: number }
    const mk = (): Acc => ({ mat: 0, des: 0, coh: 0, cohW: 0, atr: 0, atrW: 0 })
    const add = (a: Acc, r: DesRow) => {
      const m = (r[4] as number) || 0
      a.mat += m
      a.des += (r[6] as number) || 0
      if (r[7] != null) { a.coh += (r[7] as number) * m; a.cohW += m }
      if (r[9] != null) { a.atr += (r[9] as number) * m; a.atrW += m }
    }
    const byDep = new Map<number, Acc>()
    const byArea = new Map<number, Acc>()
    const serie = new Map<number, Acc>()
    const kpi = mk()
    for (const r of des.panel.rows) {
      const [y, dep, area, nf] = r as number[]
      const okDep = flt.dep < 0 || dep === flt.dep
      const okArea = flt.area < 0 || area === flt.area
      const okNf = flt.nf < 0 || nf === flt.nf
      if (okDep && okArea && okNf) {
        if (!serie.has(y)) serie.set(y, mk())
        add(serie.get(y)!, r)
        if (y === kpiYear) add(kpi, r)
      }
      if (!yrOk(y)) continue
      if (okArea && okNf) { if (!byDep.has(dep)) byDep.set(dep, mk()); add(byDep.get(dep)!, r) }
      if (okDep && okNf) { if (!byArea.has(area)) byArea.set(area, mk()); add(byArea.get(area)!, r) }
    }

    // Cohortes: [cohorte, dep, area, nf, matIni, desAcum, tasaCoh, ret, grad] — serie por nivel.
    const cohSeries = new Map<number, Map<number, { s: number; w: number }>>()
    for (const r of des.cohortes.rows) {
      const [c, dep, area, nf] = r as number[]
      if (flt.dep >= 0 && dep !== flt.dep) continue
      if (flt.area >= 0 && area !== flt.area) continue
      if (r[6] == null) continue
      const m = (r[4] as number) || 0
      if (!cohSeries.has(nf)) cohSeries.set(nf, new Map())
      const cs = cohSeries.get(nf)!
      const cur = cs.get(c) || { s: 0, w: 0 }
      cur.s += (r[6] as number) * m
      cur.w += m
      cs.set(c, cur)
    }

    // Programas referenciales: [anio, dep, prog, area, nf, mat, tasa, desert, atractivo]
    const byProg = new Map<number, Acc>()
    for (const r of des.programas_panel.rows) {
      const [y, dep, prog, area, nf] = r as number[]
      if (!yrOk(y)) continue
      if (flt.dep >= 0 && dep !== flt.dep) continue
      if (flt.area >= 0 && area !== flt.area) continue
      if (flt.nf >= 0 && nf !== flt.nf) continue
      if (!byProg.has(prog)) byProg.set(prog, mk())
      const a = byProg.get(prog)!
      const m = (r[5] as number) || 0
      a.mat += m
      a.des += (r[7] as number) || 0
      if (r[8] != null) { a.atr += (r[8] as number) * m; a.atrW += m }
    }

    return { byDep, byArea, byProg, serie, kpi, cohSeries }
  }, [des, flt, kpiYear])

  const rate = (a: { mat: number; des: number }) => (a.mat ? (a.des / a.mat) * 100 : null)

  useEffect(() => {
    if (!des || !A) return
    const D = des.dicts
    const parts = ['Pestaña: Deserción (SPADIES/SNIES 2019–2024, capa analítica calibrada con cifras oficiales; por territorio/área/programa son estimaciones analíticas)']
    if (flt.anio >= 0) parts.push(`Año: ${flt.anio}`)
    if (flt.dep >= 0) parts.push(`Departamento: ${D.departamento[flt.dep]}`)
    if (flt.area >= 0) parts.push(`Área: ${D.area[flt.area]}`)
    if (flt.nf >= 0) parts.push(`Nivel de formación: ${D.nivel_formacion[flt.nf]}`)
    const t = rate(A.kpi)
    parts.push(`Tasa de deserción anual en la selección (${kpiYear}): ${t != null ? f1(t) + '%' : 's/d'} · Desertores estimados: ${fmt(A.kpi.des)} sobre ${fmt(A.kpi.mat)} matriculados`)
    if (!hasDims) parts.push(`Cifra nacional oficial ${lastOfficial}: ${f1(des.indicadores_nacionales.find((i) => i.anio === lastOfficial)?.tasa_desercion_anual_pct ?? 0)}%`)
    onCtx(parts.join(' · '))
  }, [des, A, flt, kpiYear, hasDims, lastOfficial, onCtx])

  if (err) return <div className="p-6 text-rose-600">Error al cargar deserción: {err}</div>
  if (!des || !A) return <div className="grid min-h-[40vh] place-items-center text-sm text-slate-400">Cargando deserción…</div>

  const D = des.dicts
  const nat = (anio: number) => des.indicadores_nacionales.find((i) => i.anio === anio)
  // Tasa del KPI: oficial nacional cuando no hay filtros de dimensión; ponderada del panel si los hay.
  const tasaKpi = !hasDims ? nat(kpiYear)?.tasa_desercion_anual_pct ?? rate(A.kpi) : rate(A.kpi)
  const esOficial = !hasDims && nat(kpiYear)?.tipo_dato?.startsWith('oficial')
  const kpis = [
    { c: '#d64550', v: tasaKpi != null ? `${f1(tasaKpi)}%` : '—', l: `Deserción anual ${kpiYear}${esOficial ? ' (oficial)' : ' (estimada)'}` },
    { c: PALETTE[8], v: fmt(A.kpi.des), l: `Desertores estimados ${kpiYear}` },
    { c: PALETTE[0], v: fmt(A.kpi.mat), l: `Matrícula ${hasDims ? 'estimada' : ''} ${kpiYear}` },
    { c: COLORS.good, v: tasaKpi != null ? `${f1(100 - tasaKpi)}%` : '—', l: 'Retención anual' },
    { c: PALETTE[1], v: A.kpi.cohW ? `${f1(A.kpi.coh / A.kpi.cohW)}%` : '—', l: 'Deserción de cohorte' },
    { c: PALETTE[6], v: A.kpi.atrW ? f1(A.kpi.atr / A.kpi.atrW) : '—', l: 'Atractivo laboral (0–100)' },
  ]

  // Cruce matrícula × deserción: nacional (oficial) sin filtros; panel estimado con filtros.
  const cruceYears = hasDims
    ? years
    : [...new Set([...(serieOficial?.map((s) => s.anio) ?? []), ...des.indicadores_nacionales.map((i) => i.anio)])].sort()
  const cruceMat = hasDims
    ? years.map((y) => A.serie.get(y)?.mat ?? null)
    : cruceYears.map((y) => serieOficial?.find((s) => s.anio === y)?.matriculados ?? nat(y)?.matricula_total ?? null)
  const cruceTasa = cruceYears.map((y) => (hasDims ? (A.serie.get(y) ? rate(A.serie.get(y)!) : null) : nat(y)?.tasa_desercion_anual_pct ?? null))

  const mapData = [...A.byDep.entries()]
    .map(([i, a]) => ({ name: toGeoName(D.departamento[i]) || '', value: +(rate(a) ?? 0).toFixed(1) }))
    .filter((x) => x.name && x.value > 0)
  const maxTasa = Math.max(10, ...mapData.map((d) => d.value))
  const topDeps = [...A.byDep.entries()]
    .map(([i, a]) => ({ label: D.departamento[i], value: +(rate(a) ?? 0).toFixed(1) }))
    .filter((d) => d.value > 0)
  const areasTasa = [...A.byArea.entries()]
    .map(([i, a]) => ({ label: D.area[i], value: +(rate(a) ?? 0).toFixed(1) }))
    .filter((d) => d.value > 0)
  const cohorteYears = [...new Set(des.cohortes.rows.map((r) => r[0] as number))].sort()
  const cohSeries = [...A.cohSeries.entries()].map(([nf, m], i) => ({
    name: D.nivel_formacion[nf],
    color: [PALETTE[0], PALETTE[3]][i] || PALETTE[i],
    data: cohorteYears.map((c) => { const x = m.get(c); return x && x.w ? +(x.s / x.w).toFixed(1) : null }),
  }))
  const progTasa = [...A.byProg.entries()]
    .map(([i, a]) => ({ label: D.programa[i], value: +(rate(a) ?? 0).toFixed(1) }))
    .filter((d) => d.value > 0)
  const resumen = des.resumen_departamental.slice().sort((a, b) => b.tasa_desercion_anual_pct - a.tasa_desercion_anual_pct)

  return (
    <div className="space-y-4">
      {/* Mismos filtros del observatorio; los que la fuente SPADIES agregada no trae van deshabilitados */}
      <div className="flex flex-wrap items-end gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <Sel label="Institución educativa" value={-1} options={[]} disabled />
        <Sel label="Año" value={flt.anio} onChange={(v) => setFlt((f) => ({ ...f, anio: v }))} options={years.map((y) => ({ v: y, label: String(y) }))} />
        <Sel label="Estado" value={-1} options={[]} disabled />
        <Sel label="Sector" value={-1} options={[]} disabled />
        <Sel label="Nivel académico" value={-1} options={[]} disabled />
        <Sel label="Nivel de formación" value={flt.nf} onChange={(v) => setFlt((f) => ({ ...f, nf: v }))} options={toOpts(D.nivel_formacion)} />
        <Sel label="Modalidad" value={-1} options={[]} disabled />
        <Sel label="Departamento" value={flt.dep} onChange={(v) => setFlt((f) => ({ ...f, dep: v }))} options={toOpts(D.departamento)} />
        <Sel label="Área de conocimiento" value={flt.area} onChange={(v) => setFlt((f) => ({ ...f, area: v }))} options={toOpts(D.area)} />
        <button onClick={() => setFlt({ anio: -1, dep: -1, area: -1, nf: -1 })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:border-indigo-500">↺ Limpiar</button>
        <div className="ml-auto self-center text-[12.5px] text-slate-500">
          {hasDims ? 'Selección: estimación analítica' : 'Cifras nacionales oficiales SNIES/SPADIES'}
        </div>
      </div>

      <KpiRow kpis={kpis} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={hasDims ? `Matrícula estimada × deserción (${years[0]}–${years[years.length - 1]})` : 'Matrícula × deserción anual (2015–2024)'} hint={hasDims ? 'Serie de la selección (estimación analítica calibrada)' : 'Matrícula oficial SNIES (2015–2021 verificada; 2022–2024 publicada) · tasa anual SPADIES'}>
          <EChart height={380} option={lineChart(cruceYears, [
            { name: 'Matriculados', color: PALETTE[0], area: true, data: cruceMat },
            { name: 'Deserción anual %', color: '#d64550', yAxisIndex: 1, data: cruceTasa },
          ], { dualAxis: true, y1Name: 'Matriculados', y2Name: '%' })} />
        </Card>
        <Card title={`Deserción de cohorte por nivel (cohortes ${cohorteYears[0]}–${cohorteYears[cohorteYears.length - 1]})`} hint="Abandono acumulado de cada cohorte de ingreso · calibrado con tasas SPADIES 2023">
          <EChart height={380} option={lineChart(cohorteYears, cohSeries)} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Tasa de deserción anual por departamento (${scopeLabel})`} hint="Promedio ponderado por matrícula · estimación analítica">
          {mapsReady ? (
            <EChart height={480} option={{
              tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#e4e7ec', textStyle: { color: '#1a1f29' }, formatter: (p: { name: string; value?: number }) => `${p.name}<br><b>${p.value != null && !Number.isNaN(p.value) ? f1(p.value) + '%' : 's/d'}</b> deserción anual` },
              visualMap: { type: 'continuous', min: 7, max: maxTasa, left: 8, bottom: 14, calculable: true, inRange: { color: ['#fdecea', '#b03a2e'] }, textStyle: { color: COLORS.label }, text: ['Mayor', 'Menor'] },
              series: [{ type: 'map', map: 'CO', roam: true, nameProperty: 'NOMBRE_DPT', itemStyle: { borderColor: '#fff', borderWidth: 0.6, areaColor: '#eef1f5' }, emphasis: { itemStyle: { areaColor: COLORS.brand }, label: { show: false } }, label: { show: false }, data: mapData }],
            }} />
          ) : (
            <div className="grid h-[480px] place-items-center text-sm text-slate-400">Cargando mapa…</div>
          )}
        </Card>
        <Card title={`Departamentos con mayor deserción (${scopeLabel})`} hint="Tasa anual % · promedio ponderado">
          <EChart height={480} option={barH(topDeps, '#d64550', 15, true)} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Deserción anual por área de conocimiento (${scopeLabel})`} hint="Tasa % ponderada por matrícula">
          <EChart height={380} option={barH(areasTasa, PALETTE[6], 10, true)} />
        </Card>
        <Card title={`Deserción por programa referencial (${scopeLabel})`} hint="9 programas representativos · tasa anual % ponderada">
          <EChart height={380} option={barH(progTasa, PALETTE[1], 10, true)} />
        </Card>
      </div>

      <Card title="Programas con mayor deserción de cohorte (nacional, 2019–2024)" hint="Top 10 de programas referenciales · % de abandono acumulado por cohorte">
        <EChart height={400} option={barH(des.top_programas.map((p) => ({ label: `${p.programa} (${p.nivel})`, value: +p.tasa_cohorte_pct.toFixed(1) })), PALETTE[8], 10, true)} />
      </Card>

      <Card title="Prioridad de intervención territorial" hint="Cruce deserción × atractivo laboral (OLE) · promedio 2019–2024">
        <div className="max-h-[440px] overflow-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="py-2">Departamento</th><th className="py-2">Región</th>
                <th className="py-2 text-right">Matrícula 2019–24</th><th className="py-2 text-right">Deserción anual</th>
                <th className="py-2 text-right">Atractivo laboral</th><th className="py-2">Prioridad</th><th className="py-2">Acción sugerida</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((r) => (
                <tr key={r.departamento} className="border-t border-slate-100">
                  <td className="py-2 font-semibold">{r.departamento}</td>
                  <td className="py-2 text-slate-500">{r.region}</td>
                  <td className="py-2 text-right tabular-nums">{fmt(r.matricula_2019_2024)}</td>
                  <td className="py-2 text-right tabular-nums font-semibold" style={{ color: PRIORIDAD_COLOR[r.prioridad] || '#1a1f29' }}>{f1(r.tasa_desercion_anual_pct)}%</td>
                  <td className="py-2 text-right tabular-nums">{f1(r.atractivo_laboral)}</td>
                  <td className="py-2"><span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: PRIORIDAD_COLOR[r.prioridad] || '#64748b' }}>{r.prioridad}</span></td>
                  <td className="py-2 text-[11.5px] text-slate-500">{r.accion_sugerida}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[11.5px] leading-relaxed text-amber-800">
        <b>Nota metodológica:</b> {String(des.meta.advertencia ?? '')} Fuente: {String(des.meta.fuente ?? '')} · Cobertura {String(des.meta.cobertura_temporal ?? '')}.
      </p>
    </div>
  )
}
