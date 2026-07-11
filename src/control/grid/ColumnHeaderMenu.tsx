import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ArrowLeft, ArrowRight, Trash2, Plus, X, Sparkles, RefreshCw } from 'lucide-react'
import type { PcColType, PcColumn } from '../lib/types'
import { PC_COL_TYPE_LABELS, PC_OPTION_COLORS } from '../lib/types'

const TYPE_ICON: Record<PcColType, string> = {
  text: 'Aa',
  longtext: '¶',
  number: '#',
  date: '📅',
  select: '▾',
  url: '🔗',
  checkbox: '☑',
}

export function ColumnHeaderMenu({
  col,
  editable,
  canMoveLeft,
  canMoveRight,
  onChange,
  onMove,
  onDelete,
  onConfigureBehavior,
  onRecalcColumn,
}: {
  col: PcColumn
  editable: boolean
  canMoveLeft: boolean
  canMoveRight: boolean
  onChange?: (col: PcColumn) => void
  onMove?: (colId: string, dir: -1 | 1) => void
  onDelete?: (colId: string) => void
  onConfigureBehavior?: (colId: string) => void
  onRecalcColumn?: (colId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(col.name)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setName(col.name), [col.name])
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const commitName = () => {
    setEditingName(false)
    const trimmed = name.trim() || 'Columna'
    if (trimmed !== col.name) onChange?.({ ...col, name: trimmed })
  }

  return (
    <div ref={ref} className="relative flex items-center gap-1 px-2.5 py-2">
      {col.behavior?.mode === 'formula' ? (
        <Sparkles size={12} className="text-indigo-400" aria-label="Columna fórmula (IA)" />
      ) : (
        <span className="text-[11px] text-slate-300" title={PC_COL_TYPE_LABELS[col.type]}>{TYPE_ICON[col.type]}</span>
      )}
      {editingName && editable ? (
        <input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setName(col.name); setEditingName(false) } }}
          className="w-full border-0 bg-white px-1 py-0.5 text-[12px] font-bold text-slate-700 outline-none ring-1 ring-indigo-400"
        />
      ) : (
        <span
          className="flex-1 cursor-text truncate text-[12px] font-bold uppercase tracking-wide text-slate-600"
          title={col.name}
          onClick={() => editable && setEditingName(true)}
        >
          {col.name}
        </span>
      )}
      {editable && (
        <button onClick={() => setOpen((o) => !o)} className="text-slate-400 hover:text-slate-700">
          <ChevronDown size={14} />
        </button>
      )}

      {open && editable && (
        <div className="absolute left-0 top-full z-40 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
          <button
            onClick={() => { setOpen(false); onConfigureBehavior?.(col.id) }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            <Sparkles size={13} /> Configurar comportamiento
          </button>
          {col.behavior?.mode === 'formula' && (
            <button
              onClick={() => { setOpen(false); onRecalcColumn?.(col.id) }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] font-semibold text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw size={13} /> Recalcular columna (IA)
            </button>
          )}
          <div className="my-1 border-t border-slate-100" />
          <div className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Tipo de dato</div>
          <div className="grid grid-cols-2 gap-1 px-1 pb-2">
            {(Object.keys(PC_COL_TYPE_LABELS) as PcColType[]).map((t) => (
              <button
                key={t}
                onClick={() => onChange?.({ ...col, type: t, options: t === 'select' ? col.options || [] : undefined })}
                className={`rounded-md px-2 py-1 text-left text-[11.5px] ${col.type === t ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {PC_COL_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {col.type === 'select' && <OptionsEditor col={col} onChange={onChange} />}

          <div className="my-1 border-t border-slate-100" />
          <button
            disabled={!canMoveLeft}
            onClick={() => { onMove?.(col.id, -1); setOpen(false) }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          >
            <ArrowLeft size={13} /> Mover a la izquierda
          </button>
          <button
            disabled={!canMoveRight}
            onClick={() => { onMove?.(col.id, 1); setOpen(false) }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          >
            <ArrowRight size={13} /> Mover a la derecha
          </button>
          <button
            onClick={() => { onDelete?.(col.id); setOpen(false) }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={13} /> Eliminar columna
          </button>
        </div>
      )}
    </div>
  )
}

function OptionsEditor({ col, onChange }: { col: PcColumn; onChange?: (col: PcColumn) => void }) {
  const [draft, setDraft] = useState('')
  const options = col.options || []

  const add = () => {
    const v = draft.trim()
    if (!v || options.some((o) => o.value === v)) { setDraft(''); return }
    const color = PC_OPTION_COLORS[options.length % PC_OPTION_COLORS.length]
    onChange?.({ ...col, options: [...options, { value: v, color }] })
    setDraft('')
  }
  const remove = (value: string) => onChange?.({ ...col, options: options.filter((o) => o.value !== value) })
  const recolor = (value: string, color: string) =>
    onChange?.({ ...col, options: options.map((o) => (o.value === value ? { ...o, color } : o)) })

  return (
    <div className="border-t border-slate-100 px-1 py-2">
      <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Opciones de la lista</div>
      <div className="max-h-40 space-y-1 overflow-auto px-1">
        {options.map((o) => (
          <div key={o.value} className="flex items-center gap-1">
            <span className="flex-1 truncate rounded-full px-2 py-0.5 text-[11.5px]" style={{ backgroundColor: o.color }}>{o.value}</span>
            <div className="flex items-center gap-0.5">
              {PC_OPTION_COLORS.slice(0, 4).map((c) => (
                <button key={c} onClick={() => recolor(o.value, c)} className="h-3.5 w-3.5 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={() => remove(o.value)} className="text-slate-300 hover:text-rose-500"><X size={13} /></button>
          </div>
        ))}
        {options.length === 0 && <div className="px-1 py-1 text-[11px] text-slate-400">Aún no hay opciones.</div>}
      </div>
      <div className="mt-1.5 flex items-center gap-1 px-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          placeholder="Nueva opción…"
          className="w-full rounded-md border border-slate-200 px-2 py-1 text-[12px] outline-none focus:border-indigo-400"
        />
        <button onClick={add} className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-indigo-600 text-white hover:bg-indigo-700"><Plus size={14} /></button>
      </div>
    </div>
  )
}
