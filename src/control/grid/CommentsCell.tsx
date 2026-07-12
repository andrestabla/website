import { useState } from 'react'
import { MessageSquare, X, Trash2, Pencil, Check } from 'lucide-react'
import type { PcComment } from '../lib/types'
import { newComment } from '../lib/types'

function fmt(at: string): string {
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Celda tipo "comentarios/observaciones": cada registro es una entrada con fecha. */
export function CommentsCell({
  value,
  editable,
  colName,
  onChange,
}: {
  value: PcComment[] | null | undefined
  editable: boolean
  colName?: string
  onChange?: (v: PcComment[]) => void
}) {
  const list: PcComment[] = Array.isArray(value) ? value : []
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const sorted = [...list].sort((a, b) => (a.at < b.at ? 1 : -1))

  const add = () => {
    const t = draft.trim()
    if (!t) return
    onChange?.([...list, newComment(t)])
    setDraft('')
  }
  const remove = (id: string) => onChange?.(list.filter((c) => c.id !== id))
  const saveEdit = (id: string) => {
    const t = editText.trim()
    onChange?.(list.map((c) => (c.id === id ? { ...c, text: t || c.text } : c)))
    setEditingId(null)
  }

  return (
    <div className="px-2.5 py-1.5">
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] ${list.length ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-100'}`}
      >
        <MessageSquare size={13} />
        {list.length ? `${list.length} ${list.length === 1 ? 'entrada' : 'entradas'}` : (editable ? 'Añadir' : '—')}
      </button>

      {open && (
        <div className="fixed inset-0 z-[65] grid place-items-center bg-slate-900/40 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="flex items-center gap-2 text-[14px] font-black tracking-tight text-slate-900">
                <MessageSquare size={16} className="text-indigo-600" /> {colName || 'Comentarios'}
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
              {sorted.length === 0 && <div className="rounded-lg bg-slate-50 px-3 py-4 text-center text-[13px] text-slate-400">Sin entradas todavía.</div>}
              {sorted.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">{fmt(c.at)}</span>
                    {editable && editingId !== c.id && (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setEditingId(c.id); setEditText(c.text) }} className="text-slate-300 hover:text-indigo-600"><Pencil size={13} /></button>
                        <button onClick={() => remove(c.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                  {editingId === c.id ? (
                    <div className="space-y-1.5">
                      <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-indigo-400" />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="text-[12px] font-semibold text-slate-500">Cancelar</button>
                        <button onClick={() => saveEdit(c.id)} className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[12px] font-semibold text-white"><Check size={13} /> Guardar</button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{c.text}</p>
                  )}
                </div>
              ))}
            </div>

            {editable && (
              <div className="border-t border-slate-200 p-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add() }}
                  rows={2}
                  placeholder="Escribe una observación…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-indigo-400"
                />
                <div className="mt-2 flex justify-end">
                  <button onClick={add} disabled={!draft.trim()} className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                    Publicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
