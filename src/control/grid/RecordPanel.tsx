import { X } from 'lucide-react'
import type { PcCellValue, PcColumn, PcRow } from '../lib/types'
import { BoardCell } from './DataGrid'

/** Panel lateral con TODOS los campos de un registro (fila). Editable o solo lectura. */
export function RecordPanel({
  columns,
  row,
  index,
  editable,
  onCellChange,
  onRecalcCell,
  computing,
  onClose,
}: {
  columns: PcColumn[]
  row: PcRow
  index: number
  editable: boolean
  onCellChange?: (rowId: string, colId: string, value: PcCellValue) => void
  onRecalcCell?: (rowId: string, colId: string) => void
  computing?: Set<string>
  onClose: () => void
}) {
  const title = String(row.cells[columns[0]?.id] ?? '') || `Registro ${index + 1}`
  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Registro {index + 1}</div>
          <div className="truncate text-[15px] font-black tracking-tight text-slate-900">{title}</div>
        </div>
        <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-700"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <dl className="divide-y divide-slate-100">
          {columns.map((col) => (
            <div key={col.id} className="py-2">
              <dt className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{col.name}</dt>
              <dd className="min-w-0 rounded-lg bg-slate-50/60">
                <BoardCell
                  col={col}
                  value={row.cells[col.id] ?? null}
                  editable={editable}
                  computing={!!computing?.has(`${row.id}:${col.id}`)}
                  onChange={(v) => onCellChange?.(row.id, col.id, v)}
                  onRecalc={() => onRecalcCell?.(row.id, col.id)}
                />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
