import { X } from 'lucide-react'
import type { PcColumn, PcOption } from '../lib/types'
import { optionColor } from './DataGrid'

/** Modal con los metadatos de un valor (entrada) de una categoría. */
export function ValueMetaModal({ col, option, onClose }: { col: PcColumn; option: PcOption; onClose: () => void }) {
  const fields = col.optionFields || []
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{col.name}</div>
            <div className="mt-1 inline-flex items-center gap-2">
              <span className="rounded-full px-2.5 py-0.5 text-[13px] font-semibold" style={{ backgroundColor: optionColor(col, option.value) }}>
                {option.value}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-lg bg-slate-50 px-3 py-4 text-center text-[13px] text-slate-400">Esta categoría no tiene metadatos.</div>
        ) : (
          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {fields.map((f) => (
              <div key={f.id} className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                <dt className="text-[12px] font-semibold text-slate-500">{f.label}</dt>
                <dd className="text-right text-[13px] text-slate-800">{option.meta?.[f.id] || <span className="text-slate-300">—</span>}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}
