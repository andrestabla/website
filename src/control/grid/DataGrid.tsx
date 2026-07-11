import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, RefreshCw, Info } from 'lucide-react'
import type { PcCellValue, PcColumn, PcRow } from '../lib/types'
import { PC_OPTION_COLORS } from '../lib/types'
import { ColumnHeaderMenu } from './ColumnHeaderMenu'
import { ValueMetaModal } from './ValueMetaModal'

export function optionColor(col: PcColumn, value: string): string {
  const opt = col.options?.find((o) => o.value === value)
  if (opt?.color) return opt.color
  // color estable por hash del valor
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0
  return PC_OPTION_COLORS[h % PC_OPTION_COLORS.length]
}

type Props = {
  columns: PcColumn[]
  rows: PcRow[]
  editable: boolean
  onCellChange?: (rowId: string, colId: string, value: PcCellValue) => void
  onColumnChange?: (col: PcColumn) => void
  onColumnMove?: (colId: string, dir: -1 | 1) => void
  onColumnDelete?: (colId: string) => void
  onConfigureBehavior?: (colId: string) => void
  onRecalcColumn?: (colId: string) => void
  onAddColumn?: () => void
  onAddRow?: () => void
  onDeleteRow?: (rowId: string) => void
  onRecalcCell?: (rowId: string, colId: string) => void
  computing?: Set<string> // claves `${rowId}:${colId}`
}

export function DataGrid({
  columns,
  rows,
  editable,
  onCellChange,
  onColumnChange,
  onColumnMove,
  onColumnDelete,
  onConfigureBehavior,
  onRecalcColumn,
  onAddColumn,
  onAddRow,
  onDeleteRow,
  onRecalcCell,
  computing,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-slate-50">
            <th className="sticky left-0 z-10 w-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-center text-[11px] font-bold text-slate-400">
              #
            </th>
            {columns.map((col, i) => (
              <th
                key={col.id}
                className="border-b border-r border-slate-200 px-0 py-0 text-left align-top"
                style={{ minWidth: col.width || 160, maxWidth: col.width ? col.width : undefined }}
              >
                <ColumnHeaderMenu
                  col={col}
                  editable={editable}
                  canMoveLeft={i > 0}
                  canMoveRight={i < columns.length - 1}
                  onChange={onColumnChange}
                  onMove={onColumnMove}
                  onDelete={onColumnDelete}
                  onConfigureBehavior={onConfigureBehavior}
                  onRecalcColumn={onRecalcColumn}
                />
              </th>
            ))}
            {editable && (
              <th className="border-b border-slate-200 px-2 py-2">
                <button
                  onClick={onAddColumn}
                  title="Añadir columna"
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
                >
                  <Plus size={13} /> Columna
                </button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.id} className="group hover:bg-slate-50/60">
              <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-2 py-1.5 text-center text-[11px] text-slate-400 group-hover:bg-slate-50">
                {editable ? (
                  <div className="flex items-center justify-center">
                    <span className="group-hover:hidden">{ri + 1}</span>
                    <button
                      onClick={() => onDeleteRow?.(row.id)}
                      title="Eliminar fila"
                      className="hidden text-slate-300 hover:text-rose-500 group-hover:block"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  ri + 1
                )}
              </td>
              {columns.map((col) => (
                <td
                  key={col.id}
                  className="border-b border-r border-slate-200 p-0 align-top"
                  style={{ minWidth: col.width || 160 }}
                >
                  {col.behavior?.mode === 'formula' ? (
                    <FormulaCell
                      col={col}
                      value={row.cells[col.id] ?? null}
                      editable={editable}
                      computing={!!computing?.has(`${row.id}:${col.id}`)}
                      onRecalc={() => onRecalcCell?.(row.id, col.id)}
                    />
                  ) : (
                    <Cell
                      col={col}
                      value={row.cells[col.id] ?? null}
                      editable={editable}
                      onChange={(v) => onCellChange?.(row.id, col.id, v)}
                    />
                  )}
                </td>
              ))}
              {editable && <td className="border-b border-slate-200" />}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 2} className="px-4 py-8 text-center text-sm text-slate-400">
                Sin filas todavía.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {editable && (
        <button
          onClick={onAddRow}
          className="flex w-full items-center gap-2 border-t border-slate-200 px-3 py-2.5 text-[13px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
        >
          <Plus size={15} /> Añadir fila
        </button>
      )}
    </div>
  )
}

// ── Celda ────────────────────────────────────────────────────────────────────
function Cell({
  col,
  value,
  editable,
  onChange,
}: {
  col: PcColumn
  value: PcCellValue
  editable: boolean
  onChange: (v: PcCellValue) => void
}) {
  const [editing, setEditing] = useState(false)

  if (col.type === 'checkbox') {
    return (
      <div className="flex items-center justify-center px-2 py-1.5">
        <input
          type="checkbox"
          checked={value === true}
          disabled={!editable}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-indigo-600"
        />
      </div>
    )
  }

  if (col.type === 'select') {
    return <SelectCell col={col} value={value} editable={editable} onChange={onChange} />
  }

  if (col.type === 'url') {
    if (editing && editable) {
      return (
        <InlineInput
          initial={value == null ? '' : String(value)}
          onCommit={(v) => { onChange(v || null); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      )
    }
    const url = value ? String(value) : ''
    return (
      <div className="min-h-[32px] px-2.5 py-1.5" onDoubleClick={() => editable && setEditing(true)}>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="text-indigo-600 underline decoration-indigo-300 hover:decoration-indigo-600 break-all">
            {url.replace(/^https?:\/\//, '').slice(0, 40)}
          </a>
        ) : (
          <span className="text-slate-300">{editable ? 'doble clic…' : ''}</span>
        )}
      </div>
    )
  }

  // text | longtext | number | date
  if (editing && editable) {
    return (
      <InlineInput
        initial={value == null ? '' : String(value)}
        type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
        multiline={col.type === 'longtext'}
        onCommit={(v) => {
          if (col.type === 'number') onChange(v === '' ? null : Number(v))
          else onChange(v === '' ? null : v)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const display =
    col.type === 'date' && value ? String(value) : value == null || value === '' ? '' : String(value)
  return (
    <div
      className={`min-h-[32px] whitespace-pre-wrap px-2.5 py-1.5 ${editable ? 'cursor-text' : ''} ${col.type === 'number' ? 'text-right tabular-nums' : ''}`}
      onClick={() => editable && setEditing(true)}
    >
      {display || <span className="text-slate-300">{editable ? '—' : ''}</span>}
    </div>
  )
}

// ── Celda de columna fórmula (IA): solo lectura + recalcular ─────────────────
function FormulaCell({
  col,
  value,
  editable,
  computing,
  onRecalc,
}: {
  col: PcColumn
  value: PcCellValue
  editable: boolean
  computing: boolean
  onRecalc: () => void
}) {
  const render = col.behavior?.render || 'text'
  const hasValue = value !== null && value !== undefined && value !== ''

  return (
    <div className="group/f flex min-h-[32px] items-center gap-2 px-2.5 py-1.5">
      <div className="min-w-0 flex-1">
        {render === 'progress' ? (
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-[width]"
                style={{ width: `${hasValue ? Math.max(0, Math.min(100, Number(value))) : 0}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right text-[12px] font-semibold tabular-nums text-slate-600">
              {hasValue ? `${Math.round(Number(value))}%` : '—'}
            </span>
          </div>
        ) : (
          <span className={`text-[13px] ${render === 'number' ? 'tabular-nums' : ''} ${hasValue ? 'text-slate-700' : 'text-slate-300'}`}>
            {hasValue ? String(value) : '—'}
          </span>
        )}
      </div>
      {editable && (
        <button
          onClick={onRecalc}
          disabled={computing}
          title="Recalcular con IA"
          className="shrink-0 text-slate-300 opacity-0 transition group-hover/f:opacity-100 hover:text-indigo-600 disabled:opacity-100"
        >
          <RefreshCw size={13} className={computing ? 'animate-spin text-indigo-500' : ''} />
        </button>
      )}
    </div>
  )
}

function InlineInput({
  initial,
  type = 'text',
  multiline = false,
  onCommit,
  onCancel,
}: {
  initial: string
  type?: string
  multiline?: boolean
  onCommit: (v: string) => void
  onCancel: () => void
}) {
  const [v, setV] = useState(initial)
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select?.()
  }, [])
  const common = 'w-full resize-none border-0 bg-indigo-50/60 px-2.5 py-1.5 text-[13px] outline-none ring-2 ring-inset ring-indigo-400'
  if (multiline) {
    return (
      <textarea
        ref={ref}
        value={v}
        rows={3}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onCommit(v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onCommit(v)
        }}
        className={common}
      />
    )
  }
  return (
    <input
      ref={ref}
      type={type}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(v)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
        if (e.key === 'Enter') onCommit(v)
      }}
      className={common}
    />
  )
}

function SelectCell({
  col,
  value,
  editable,
  onChange,
}: {
  col: PcColumn
  value: PcCellValue
  editable: boolean
  onChange: (v: PcCellValue) => void
}) {
  const [open, setOpen] = useState(false)
  const [showMeta, setShowMeta] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const current = value == null ? '' : String(value)
  const options = col.options || []
  const currentOpt = options.find((o) => o.value === current)
  // Muestra el acceso a metadatos si la categoría los define y hay un valor con
  // entrada correspondiente (aunque sus campos estén vacíos: se ven como "—").
  const hasMeta = !!(col.optionFields?.length && currentOpt)

  return (
    <div ref={ref} className="relative flex items-center gap-1 px-2 py-1.5">
      <button
        disabled={!editable && !hasMeta}
        onClick={() => { if (editable) setOpen((o) => !o); else if (hasMeta) setShowMeta(true) }}
        title={!editable && hasMeta ? 'Ver detalles' : undefined}
        className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${current ? '' : 'text-slate-300'} ${editable || hasMeta ? 'hover:ring-1 hover:ring-slate-300' : ''}`}
        style={current ? { backgroundColor: optionColor(col, current) } : {}}
      >
        <span className="truncate">{current || (editable ? 'seleccionar…' : '')}</span>
      </button>
      {hasMeta && (
        <button
          onClick={() => setShowMeta(true)}
          title="Ver metadatos"
          className="shrink-0 text-slate-300 hover:text-indigo-600"
        >
          <Info size={13} />
        </button>
      )}
      {showMeta && currentOpt && <ValueMetaModal col={col} option={currentOpt} onClose={() => setShowMeta(false)} />}
      {open && editable && (
        <div className="absolute left-2 top-full z-30 mt-1 max-h-64 w-52 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {current && (
            <button onClick={() => { onChange(null); setOpen(false) }} className="block w-full px-3 py-1.5 text-left text-[12px] text-slate-400 hover:bg-slate-50">
              Vaciar
            </button>
          )}
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className="flex w-full items-center px-3 py-1.5 text-left text-[12px] hover:bg-slate-50"
            >
              <span className="rounded-full px-2 py-0.5" style={{ backgroundColor: optionColor(col, o.value) }}>{o.value}</span>
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-slate-400">Define opciones en el menú de la columna (▾).</div>
          )}
        </div>
      )}
    </div>
  )
}
