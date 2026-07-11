import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send, Loader2 } from 'lucide-react'
import { chatBoard, type ChatMsg } from '../lib/control-api'

const SUGGESTIONS = [
  '¿Cuál es el avance promedio del tablero?',
  '¿Qué filas están más atrasadas?',
  'Resume el estado por programa',
]

/** Burbuja flotante + panel lateral de chat IA sobre el tablero. */
export function BoardChat({ boardId, token, title }: { boardId?: string; token?: string; title?: string }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])

  const send = async (q: string) => {
    const question = q.trim()
    if (!question || busy) return
    setError('')
    setInput('')
    const history = msgs
    setMsgs((m) => [...m, { role: 'user', content: question }])
    setBusy(true)
    try {
      const reply = await chatBoard({ boardId, token, question, history })
      setMsgs((m) => [...m, { role: 'assistant', content: reply }])
    } catch (e: any) {
      setError(e?.message || 'No se pudo obtener respuesta')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Preguntar a la IA sobre el tablero"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-sky-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          <Sparkles size={18} /> Preguntar a la IA
        </button>
      )}

      {open && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-sky-500 text-white"><Sparkles size={16} /></div>
              <div className="leading-tight">
                <div className="text-[13px] font-black tracking-tight text-slate-900">Asistente del tablero</div>
                <div className="max-w-[240px] truncate text-[11px] text-slate-400">{title || ''}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-3 text-[13px] text-slate-600">
                  Hazme una pregunta sobre este tablero: conteos, avances, quién es responsable de qué, resúmenes…
                </div>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-[12.5px] text-slate-600 hover:border-indigo-300 hover:text-indigo-700">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3.5 py-2 text-[13px] text-slate-500">
                  <Loader2 size={14} className="animate-spin" /> Pensando…
                </div>
              </div>
            )}
            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{error}</div>}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input) }}
            className="flex items-center gap-2 border-t border-slate-200 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-indigo-400"
            />
            <button type="submit" disabled={busy || !input.trim()} className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
