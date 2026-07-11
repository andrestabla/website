import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { BarChart3 } from 'lucide-react'
import type { PcColumn, PcRow } from '../lib/types'
import { applyView, emptyView, type PcView } from '../lib/view'
import { GridToolbar } from './GridToolbar'
import { optionColor } from './DataGrid'

type Metric = 'count' | 'sum' | 'avg'

export function Analitica({ columns, rows }: { columns: PcColumn[]; rows: PcRow[] }) {
  const groupable = columns.filter((c) => ['select', 'text', 'date', 'checkbox'].includes(c.type))
  const numberCols = columns.filter((c) => c.type === 'number')

  const [view, setView] = useState<PcView>(emptyView)
  const [groupId, setGroupId] = useState<string>(groupable[0]?.id || '')
  const [metric, setMetric] = useState<Metric>('count')
  const [valueColId, setValueColId] = useState<string>(numberCols[0]?.id || '')

  const groupCol = columns.find((c) => c.id === groupId)
  const filtered = useMemo(() => applyView(rows, columns, view), [rows, columns, view])

  const data = useMemo(() => {
    if (!groupCol) return []
    const buckets = new Map<string, { sum: number; n: number }>()
    for (const r of filtered) {
      const raw = r.cells[groupId]
      const key = raw === null || raw === undefined || raw === '' ? '(vacío)' : String(raw)
      const b = buckets.get(key) || { sum: 0, n: 0 }
      b.n += 1
      if (metric !== 'count') {
        const v = Number(r.cells[valueColId])
        if (Number.isFinite(v)) b.sum += v
      }
      buckets.set(key, b)
    }
    const rowsOut = Array.from(buckets.entries()).map(([name, b]) => ({
      name,
      value: metric === 'count' ? b.n : metric === 'sum' ? b.sum : b.n ? +(b.sum / b.n).toFixed(2) : 0,
    }))
    rowsOut.sort((a, b) => b.value - a.value)
    return rowsOut
  }, [filtered, groupCol, groupId, metric, valueColId])

  const total = filtered.length
  const metricLabel = metric === 'count' ? 'Conteo' : metric === 'sum' ? 'Suma' : 'Promedio'

  return (
    <div className="space-y-4">
      <GridToolbar columns={columns} view={view} onChange={setView} />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <Field label="Agrupar por">
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px]">
            {groupable.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          <span className="font-bold text-slate-700">{total}</span> filas · <span className="font-bold text-slate-700">{data.length}</span> grupos
        </div>
      </div>

      {!groupCol || data.length === 0 ? (
        <div className="grid min-h-[30vh] place-items-center rounded-2xl border border-dashed border-slate-300 text-center">
          <div>
            <BarChart3 className="mx-auto mb-3 text-slate-300" size={36} />
            <div className="text-sm font-semibold text-slate-600">Sin datos para graficar</div>
            <div className="mt-1 text-[13px] text-slate-400">Ajusta el agrupamiento o los filtros.</div>
          </div>
        </div>
      ) : (
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
      )}
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
