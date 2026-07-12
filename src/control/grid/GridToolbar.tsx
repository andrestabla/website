import { useEffect, useRef, useState } from 'react'
import { Search, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react'
import type { PcColumn } from '../lib/types'
import type { PcFilter, PcView } from '../lib/view'

export function GridToolbar({
  columns,
  view,
  onChange,
  rightSlot,
}: {
  columns: PcColumn[]
  view: PcView
  onChange: (v: PcView) => void
  rightSlot?: React.ReactNode
}) {
  const activeFilters = view.filters.filter((f) =>
    (f.kind === 'in' && f.values.length) || (f.kind === 'contains' && f.value) || (f.kind === 'range' && (f.min !== undefined || f.max !== undefined))
  ).length

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-auto">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={view.search}
          onChange={(e) => onChange({ ...view, search: e.target.value })}
          placeholder="Buscar…"
          className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-[13px] outline-none focus:border-indigo-400 sm:w-56"
        />
      </div>

      <FilterMenu columns={columns} view={view} onChange={onChange} activeCount={activeFilters} />
      <SortMenu columns={columns} view={view} onChange={onChange} />

      {(activeFilters > 0 || view.sort || view.search) && (
        <button
          onClick={() => onChange({ search: '', filters: [], sort: null })}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-slate-500 hover:text-rose-600"
        >
          <X size={13} /> Limpiar
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">{rightSlot}</div>
    </div>
  )
}

function Pop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return (
    <div ref={ref} className="absolute left-0 top-full z-40 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      {children}
    </div>
  )
}

function FilterMenu({ columns, view, onChange, activeCount }: { columns: PcColumn[]; view: PcView; onChange: (v: PcView) => void; activeCount: number }) {
  const [open, setOpen] = useState(false)
  const getFilter = (colId: string) => view.filters.find((f) => f.colId === colId)
  const setFilter = (f: PcFilter) => {
    const others = view.filters.filter((x) => x.colId !== f.colId)
    onChange({ ...view, filters: [...others, f] })
  }
  const clearFilter = (colId: string) => onChange({ ...view, filters: view.filters.filter((f) => f.colId !== colId) })

  const filterable = columns.filter((c) => ['select', 'text', 'longtext', 'url', 'number'].includes(c.type))

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold ${activeCount ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'}`}
      >
        <SlidersHorizontal size={14} /> Filtros{activeCount ? ` (${activeCount})` : ''}
      </button>
      {open && (
        <Pop onClose={() => setOpen(false)}>
          <div className="max-h-80 space-y-3 overflow-auto">
            {filterable.map((col) => {
              const f = getFilter(col.id)
              if (col.type === 'select') {
                const selected = f && f.kind === 'in' ? f.values : []
                const toggle = (val: string) => {
                  const next = selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]
                  if (next.length) setFilter({ colId: col.id, kind: 'in', values: next })
                  else clearFilter(col.id)
                }
                return (
                  <div key={col.id}>
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{col.name}</div>
                    <div className="flex flex-wrap gap-1">
                      {(col.options || []).map((o) => (
                        <button
                          key={o.value}
                          onClick={() => toggle(o.value)}
                          className={`rounded-full px-2 py-0.5 text-[11.5px] ${selected.includes(o.value) ? 'ring-2 ring-indigo-400' : 'opacity-70'}`}
                          style={{ backgroundColor: o.color || '#f1f5f9' }}
                        >
                          {o.value}
                        </button>
                      ))}
                      {(col.options || []).length === 0 && <span className="text-[11px] text-slate-400">sin opciones</span>}
                    </div>
                  </div>
                )
              }
              if (col.type === 'number') {
                const min = f && f.kind === 'range' ? f.min : undefined
                const max = f && f.kind === 'range' ? f.max : undefined
                const upd = (patch: { min?: number; max?: number }) => {
                  const nmin = 'min' in patch ? patch.min : min
                  const nmax = 'max' in patch ? patch.max : max
                  if (nmin === undefined && nmax === undefined) clearFilter(col.id)
                  else setFilter({ colId: col.id, kind: 'range', min: nmin, max: nmax })
                }
                return (
                  <div key={col.id}>
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{col.name}</div>
                    <div className="flex items-center gap-1.5">
                      <input type="number" placeholder="mín" defaultValue={min ?? ''} onChange={(e) => upd({ min: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-20 rounded-md border border-slate-200 px-2 py-1 text-[12px]" />
                      <span className="text-slate-400">–</span>
                      <input type="number" placeholder="máx" defaultValue={max ?? ''} onChange={(e) => upd({ max: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-20 rounded-md border border-slate-200 px-2 py-1 text-[12px]" />
                    </div>
                  </div>
                )
              }
              // texto / url
              const value = f && f.kind === 'contains' ? f.value : ''
              return (
                <div key={col.id}>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{col.name}</div>
                  <input
                    defaultValue={value}
                    placeholder="contiene…"
                    onChange={(e) => (e.target.value ? setFilter({ colId: col.id, kind: 'contains', value: e.target.value }) : clearFilter(col.id))}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-[12px] outline-none focus:border-indigo-400"
                  />
                </div>
              )
            })}
          </div>
        </Pop>
      )}
    </div>
  )
}

function SortMenu({ columns, view, onChange }: { columns: PcColumn[]; view: PcView; onChange: (v: PcView) => void }) {
  const [open, setOpen] = useState(false)
  const current = view.sort
  const label = current ? `${columns.find((c) => c.id === current.colId)?.name || ''} ${current.dir === 'asc' ? '↑' : '↓'}` : ''
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold ${current ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'}`}
      >
        <ArrowUpDown size={14} /> {current ? label : 'Ordenar'}
      </button>
      {open && (
        <Pop onClose={() => setOpen(false)}>
          <div className="max-h-72 space-y-0.5 overflow-auto">
            <button onClick={() => { onChange({ ...view, sort: null }); setOpen(false) }} className="block w-full rounded-md px-2 py-1.5 text-left text-[12px] text-slate-500 hover:bg-slate-50">Sin orden</button>
            {columns.map((col) => (
              <div key={col.id} className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-slate-50">
                <span className="truncate text-[12.5px] text-slate-700">{col.name}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => onChange({ ...view, sort: { colId: col.id, dir: 'asc' } })} className={`rounded px-1.5 text-[12px] ${current?.colId === col.id && current.dir === 'asc' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>↑</button>
                  <button onClick={() => onChange({ ...view, sort: { colId: col.id, dir: 'desc' } })} className={`rounded px-1.5 text-[12px] ${current?.colId === col.id && current.dir === 'desc' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>↓</button>
                </div>
              </div>
            ))}
          </div>
        </Pop>
      )}
    </div>
  )
}
