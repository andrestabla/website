import { AlertTriangle, Loader2, Save } from 'lucide-react'

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  loading = false,
  error = '',
  onConfirm,
  onClose,
}: {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger'
  loading?: boolean
  error?: string
  onConfirm: () => void
  onClose: () => void
}) {
  const danger = variant === 'danger'
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/40 p-4" onClick={() => !loading && onClose()}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${danger ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {danger ? <AlertTriangle size={20} /> : <Save size={20} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-[16px] font-black tracking-tight text-slate-900">{title}</h3>
            {message && <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{message}</p>}
          </div>
        </div>

        {error && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{error}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={loading} className="rounded-lg px-4 py-2 text-[13px] font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
