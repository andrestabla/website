import { Plus, Trash2, Maximize2 } from 'lucide-react'
import type { PcCellValue, PcColumn, PcRow } from '../lib/types'
import { BoardCell } from './DataGrid'

/**
 * Vista "tarjetas": cada fila se muestra como una tarjeta con sus campos
 * (etiqueta + valor). Ideal para móvil y para lectura. Reutiliza el render de
 * celda de la tabla, así que las celdas siguen siendo editables.
 */
export function CardsView({
  columns,
  rows,
  editable,
  onCellChange,
  onAddRow,
  onDeleteRow,
  onRecalcCell,
  onOpenRecord,
  computing,
}: {
  columns: PcColumn[]
  rows: PcRow[]
  editable: boolean
  onCellChange?: (rowId: string, colId: string, value: PcCellValue) => void
  onAddRow?: () => void
  onDeleteRow?: (rowId: string) => void
  onRecalcCell?: (rowId: string, colId: string) => void
  onOpenRecord?: (rowId: string) => void
  computing?: Set<string>
}) {
  // Columnas del resumen: las marcadas "en tarjeta"; si no hay ninguna, las primeras 5.
  const explicit = columns.filter((c) => c.card === true)
  const summaryCols = explicit.length ? explicit : columns.slice(0, 5)
  const hiddenCount = columns.length - summaryCols.length

  return (
    <div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">
          Sin filas todavía.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row, ri) => (
            <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">{ri + 1}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenRecord?.(row.id)}
                    title="Ver todos los campos"
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold text-indigo-600 hover:bg-indigo-50"
                  >
                    <Maximize2 size={12} /> Ver todo
                  </button>
                  {editable && (
                    <button onClick={() => onDeleteRow?.(row.id)} title="Eliminar fila" className="text-slate-300 hover:text-rose-500">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
              <dl className="divide-y divide-slate-100">
                {summaryCols.map((col) => (
                  <div key={col.id} className="flex items-start gap-2 py-1.5">
                    <dt className="w-[38%] shrink-0 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{col.name}</dt>
                    <dd className="min-w-0 flex-1">
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
              {hiddenCount > 0 && (
                <button onClick={() => onOpenRecord?.(row.id)} className="mt-1.5 text-[11.5px] font-semibold text-slate-400 hover:text-indigo-600">
                  +{hiddenCount} campo(s) más →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && (
        <button
          onClick={onAddRow}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-[13px] font-semibold text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
        >
          <Plus size={15} /> Añadir fila
        </button>
      )}
    </div>
  )
}
