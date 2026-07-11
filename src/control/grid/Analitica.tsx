import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from 'recharts'
import { BarChart3 } from 'lucide-react'
import type { PcAnalyticsConfig, PcColumn, PcRow } from '../lib/types'
import { applyView, emptyView, type PcView } from '../lib/view'
import { GridToolbar } from './GridToolbar'
import { optionColor } from './DataGrid'

type Metric = 'count' | 'sum' | 'avg'

const NONE = '__none__'

function cellKey(v: unknown): string {
  return v === null || v === undefined || v === '' ? '(vacío)' : String(v)
}

function metricOf(rows: PcRow[], metric: Metric, valueColId: string): number {
  if (metric === 'count') return rows.length
  let sum = 0
  let n = 0
  for (const r of rows) {
    const v = Number(r.cells[valueColId])
    if (Number.isFinite(v)) { sum += v; n++ }
  }
  if (metric === 'sum') return sum
  return n ? +(sum / n).toFixed(2) : 0
}

export function Analitica({
  columns,
  rows,
  initialConfig,
  onConfigChange,
}: {
  columns: PcColumn[]
  rows: PcRow[]
  initialConfig?: PcAnalyticsConfig | null
  onConfigChange?: (c: PcAnalyticsConfig) => void
}) {
  const groupable = columns.filter((c) => ['select', 'text', 'date', 'checkbox'].includes(c.type))
  const numberCols = columns.filter((c) => c.type === 'number')
  const has = (id: string | undefined, list: PcColumn[]) => !!id && list.some((c) => c.id === id)

  const [view, setView] = useState<PcView>(emptyView)
  const [groupId, setGroupId] = useState<string>(() => (has(initialConfig?.groupId, groupable) ? initialConfig!.groupId : groupable[0]?.id || ''))
  const [secondaryId, setSecondaryId] = useState<string>(() => (has(initialConfig?.secondaryId, columns) ? initialConfig!.secondaryId : NONE))
  const [metric, setMetric] = useState<Metric>(initialConfig?.metric || 'count')
  const [valueColId, setValueColId] = useState<string>(() => (has(initialConfig?.valueColId, numberCols) ? initialConfig!.valueColId : numberCols[0]?.id || ''))

  useEffect(() => {
    onConfigChange?.({ groupId, secondaryId, metric, valueColId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, secondaryId, metric, valueColId])

  const groupCol = columns.find((c) => c.id === groupId)
  const secondaryCol = secondaryId !== NONE ? columns.find((c) => c.id === secondaryId) : undefined
  const filtered = useMemo(() => applyView(rows, columns, view), [rows, columns, view])
  const metricLabel = metric === 'count' ? 'Conteo' : metric === 'sum' ? 'Suma' : 'Promedio'

  // ── Datos ──
  const single = useMemo(() => {
    if (!groupCol || secondaryCol) return []
    const buckets = new Map<string, PcRow[]>()
    for (const r of filtered) {
      const k = cellKey(r.cells[groupId])
      if (!buckets.has(k)) buckets.set(k, [])
      buckets.get(k)!.push(r)
    }
    return Array.from(buckets.entries())
      .map(([name, rs]) => ({ name, value: metricOf(rs, metric, valueColId) }))
      .sort((a, b) => b.value - a.value)
  }, [filtered, groupCol, secondaryCol, groupId, metric, valueColId])

  const cross = useMemo(() => {
    if (!groupCol || !secondaryCol) return { secVals: [] as string[], data: [] as any[] }
    const secSet = new Set<string>()
    const primSet = new Set<string>()
    for (const r of filtered) { secSet.add(cellKey(r.cells[secondaryId])); primSet.add(cellKey(r.cells[groupId])) }
    const secVals = Array.from(secSet).sort()
    const data = Array.from(primSet).map((p) => {
      const obj: any = { name: p, __total: 0 }
      for (const s of secVals) {
        const rs = filtered.filter((r) => cellKey(r.cells[groupId]) === p && cellKey(r.cells[secondaryId]) === s)
        obj[s] = metricOf(rs, metric, valueColId)
        obj.__total += obj[s]
      }
      return obj
    })
    data.sort((a, b) => b.__total - a.__total)
    return { secVals, data }
  }, [filtered, groupCol, secondaryCol, groupId, secondaryId, metric, valueColId])

  const total = filtered.length
  const empty = !groupCol || (secondaryCol ? cross.data.length === 0 : single.length === 0)

  return (
    <div className="space-y-4">
      <GridToolbar columns={columns} view={view} onChange={setView} />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <Field label="Agrupar por">
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px]">
            {groupable.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Desglosar por (cruce)">
          <select value={secondaryId} onChange={(e) => setSecondaryId(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px]">
            <option value={NONE}>— (ninguno)</option>
            {groupable.filter((c) => c.id !== groupId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Métrica">
          <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px]">
            <option value="count">Conteo de filas</option>
            <option value="sum" disabled={!numberCols.length}>Suma</option>
            <option value="avg" disabled={!numberCols.length}>Promedio</option>
          </select>
        </Field>
        {metric !== 'count' && (
          <Field label="Columna numérica">
            <select value={valueColId} onChange={(e) => setValueColId(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px]">
              {numberCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        <div className="ml-auto text-[12px] text-slate-500">
          <span className="font-bold text-slate-700">{total}</span> filas
        </div>
      </div>

      {empty ? (
        <div className="grid min-h-[30vh] place-items-center rounded-2xl border border-dashed border-slate-300 text-center">
          <div>
            <BarChart3 className="mx-auto mb-3 text-slate-300" size={36} />
            <div className="text-sm font-semibold text-slate-600">Sin datos para graficar</div>
            <div className="mt-1 text-[13px] text-slate-400">Ajusta el agrupamiento o los filtros.</div>
          </div>
        </div>
      ) : secondaryCol ? (
        <CrossView groupCol={groupCol!} secondaryCol={secondaryCol} secVals={cross.secVals} data={cross.data} metricLabel={metricLabel} />
      ) : (
        <SingleView groupCol={groupCol!} data={single} metricLabel={metricLabel} />
      )}
    </div>
  )
}

function SingleView({ groupCol, data, metricLabel }: { groupCol: PcColumn; data: any[]; metricLabel: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-[13px] font-bold text-slate-700">{metricLabel} por {groupCol.name}</div>
        <ResponsiveContainer width="100%" height={Math.max(240, data.length * 34)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="#eef2f7" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#334155' }} />
            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((d) => (
                <Cell key={d.name} fill={groupCol.type === 'select' ? optionColor(groupCol, d.name) : '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">{groupCol.name}</th>
              <th className="px-3 py-2 text-right">{metricLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.name} className="border-t border-slate-100">
                <td className="px-3 py-1.5">
                  <span className="inline-flex items-center gap-2">
                    {groupCol.type === 'select' && <span className="h-3 w-3 rounded-full" style={{ backgroundColor: optionColor(groupCol, d.name) }} />}
                    {d.name}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-700">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CrossView({
  groupCol,
  secondaryCol,
  secVals,
  data,
  metricLabel,
}: {
  groupCol: PcColumn
  secondaryCol: PcColumn
  secVals: string[]
  data: any[]
  metricLabel: string
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-[13px] font-bold text-slate-700">
          {metricLabel}: {groupCol.name} <span className="text-slate-400">×</span> {secondaryCol.name}
        </div>
        <ResponsiveContainer width="100%" height={Math.max(280, data.length * 40)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="#eef2f7" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#334155' }} />
            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {secVals.map((s) => (
              <Bar key={s} dataKey={s} stackId="a" fill={optionColor(secondaryCol, s)} radius={[0, 2, 2, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="border-r border-slate-200 px-3 py-2">{groupCol.name} \ {secondaryCol.name}</th>
              {secVals.map((s) => <th key={s} className="border-r border-slate-200 px-3 py-2 text-right">{s}</th>)}
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.name} className="border-t border-slate-100">
                <td className="border-r border-slate-200 px-3 py-1.5 font-medium text-slate-700">{d.name}</td>
                {secVals.map((s) => (
                  <td key={s} className="border-r border-slate-100 px-3 py-1.5 text-right tabular-nums text-slate-600">{d[s] || ''}</td>
                ))}
                <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-800">{d.__total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  )
}
