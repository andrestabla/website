import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchDataset } from '../lib/api'
import {
  buildMask, countBy, countLabel, distinctCount, labelIndex, rowsToCsv, sortDesc, topN,
  totalMask, type Factorized, type Filters,
} from '../lib/factorized'
import { barH, choropleth, donut, roseConcentration, fmt, PALETTE, COLORS } from '../lib/charts'
import { ensureMaps, toGeoName } from '../lib/geo'
import { EChart } from '../components/EChart'

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
  { id: 'reporte', label: 'Reporte técnico' },
]

function Card({ title, hint, children }: { title?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {title && <h3 className="text-sm font-bold tracking-tight text-slate-800">{title}</h3>}
      {hint && <p className="mb-1 text-[11.5px] text-slate-400">{hint}</p>}
      {children}
    </div>
  )
}

export function OfertaModule() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [err, setErr] = useState('')
  const [mapsReady, setMapsReady] = useState(false)
  const [filters, setFilters] = useState<Filters>(() =>
    Object.fromEntries(FILTER_COLS.map((c) => [c, -1]))
  )
  const [tab, setTab] = useState('resumen')
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

      {/* Filtros */}
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
          <Card>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-slate-800">{mapMode === 'reg' ? 'Mapa de oferta por región' : 'Mapa de oferta por departamento'}</h3>
              <div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
                {(['dep', 'reg'] as const).map((m) => (
                  <button key={m} onClick={() => setMapMode(m)} className={`px-3 py-1.5 text-[12px] font-semibold ${mapMode === m ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}>{m === 'dep' ? 'Departamento' : 'Región'}</button>
                ))}
              </div>
            </div>
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
