import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Bot, Loader2 } from 'lucide-react'
import { getOrCreateVisitorId, getSessionId } from '../lib/privacyConsent'

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type Mode = 'simple' | 'tecnico'

const SUGGESTIONS = [
  '¿Qué es el diagnóstico de madurez digital?',
  '¿Cómo se calculan DQ y AIQ?',
  '¿En qué consiste el mapeo de procesos?',
]

const WELCOME =
  'Hola, soy Atenea. Puedo explicarte la metodología de transformación digital de AlgoritmoT, de forma simple o técnica. ¿Qué te gustaría saber?'

export type ChatbotContext = {
  sector?: string
  orgType?: string
  headcount?: string
  maturity?: string
  orgContext?: string
}

export function MethodologyChatbot({ context }: { context?: ChatbotContext }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('simple')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: WELCOME }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open, loading])

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || loading) return
    setError(null)
    const nextMessages = [...messages, { role: 'user' as const, content: question }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/simulator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          context,
          messages: nextMessages.filter((m) => m.role === 'user' || m.role === 'assistant').slice(-10),
          visitorId: getOrCreateVisitorId(),
          sessionId: getSessionId(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo responder')
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'No tengo una respuesta para eso.' }])
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 rounded-full bg-brand-primary px-5 py-4 text-white shadow-xl transition-all hover:bg-brand-secondary hover:shadow-2xl"
          aria-label="Abrir chat con Atenea"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden text-xs font-black uppercase tracking-[0.2em] sm:inline">Pregúntale a Atenea</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-[70] flex h-[34rem] max-h-[calc(100vh-3rem)] w-[calc(100vw-3rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-brand-primary px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                <Bot className="h-5 w-5" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-brand-primary bg-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-black">Atenea</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Agente AlgoritmoT</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 transition-colors hover:text-white" aria-label="Cerrar chat">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50 px-4 py-2">
            <span className="mr-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Respuesta</span>
            {(['simple', 'tecnico'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                  mode === m ? 'bg-brand-primary text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {m === 'simple' ? 'Simple' : 'Técnica'}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-brand-primary text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Atenea está escribiendo…
                </div>
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="flex flex-col gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-600 transition-colors hover:border-brand-secondary hover:bg-blue-50/60"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 border-t border-slate-200 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-secondary"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-primary text-white transition-colors hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}

export default MethodologyChatbot
