import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAssistant } from './AssistantContext'

const SECTION_LABEL: Record<string, string> = {
  oferta: 'Oferta educativa',
  laboral: 'Laboral y empleabilidad',
  regional: 'Análisis regional',
  workspace: 'Workspace',
}

function sectionFromPath(pathname: string): string {
  const p = pathname.toLowerCase()
  if (p.endsWith('/oferta') || p.includes('/oferta')) return 'oferta'
  if (p.includes('/laboral')) return 'laboral'
  if (p.includes('/regional')) return 'regional'
  if (p.includes('/workspace')) return 'workspace'
  return 'workspace'
}

/** Renderiza texto simple del asistente conservando saltos de línea y viñetas. */
function AssistantText({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim().length > 0)
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const bullet = /^\s*[-•*]\s+/.test(line)
        if (bullet) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="mt-[2px] text-indigo-400">•</span>
              <span>{line.replace(/^\s*[-•*]\s+/, '')}</span>
            </div>
          )
        }
        return <p key={i}>{line}</p>
      })}
    </div>
  )
}

export function AssistantBubble() {
  const asst = useAssistant()
  const { pathname } = useLocation()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const sectionKey = sectionFromPath(pathname)
  const setSection = asst?.setSection
  useEffect(() => {
    setSection?.(sectionKey)
  }, [setSection, sectionKey])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [asst?.messages, asst?.busy])

  if (!asst) return null
  const { open, busy, messages, error, blocks, openPanel, closePanel, clear, sendMessage, explainBlock } = asst

  const submit = () => {
    const t = input.trim()
    if (!t || busy) return
    setInput('')
    sendMessage(t)
  }

  return (
    <>
      {/* Burbuja flotante */}
      {!open && (
        <button
          onClick={openPanel}
          className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl text-white shadow-lg shadow-indigo-600/30 transition hover:scale-105 hover:bg-indigo-700 print:hidden"
          title="Asistente IA · interpreta las gráficas"
          aria-label="Abrir asistente IA"
        >
          ✨
        </button>
      )}

      {/* Panel lateral */}
      <div
        className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 print:hidden ${
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
        role="dialog"
        aria-label="Asistente IA de Algoritmo BI"
      >
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-lg text-white">✨</div>
          <div className="leading-tight">
            <div className="text-sm font-black tracking-tight">
              Asistente <span className="text-indigo-600">BI</span>
            </div>
            <div className="text-[11px] text-slate-400">{SECTION_LABEL[sectionKey] || 'Algoritmo BI'}</div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clear}
                title="Nueva conversación"
                className="rounded-lg px-2 py-1 text-[12px] font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                Limpiar
              </button>
            )}
            <button
              onClick={closePanel}
              title="Cerrar"
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar asistente"
            >
              ✕
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !busy && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-[13px] leading-relaxed text-slate-600">
                Soy tu asistente analítico. Pásame el cursor por cualquier gráfica y pulsa{' '}
                <span className="font-bold text-indigo-600">✨ Explicar</span> para que la interprete, o pregúntame algo
                sobre esta vista.
              </div>
              {blocks.length > 0 && (
                <div>
                  <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
                    Bloques en esta vista
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {blocks.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => explainBlock({ title: b.title, digest: b.getDigest() })}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[12px] font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                      >
                        {b.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-700'
                }`}
              >
                {m.role === 'assistant' ? <AssistantText text={m.content} /> : m.content}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-600">{error}</div>
          )}
        </div>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              rows={1}
              placeholder="Pregunta sobre esta vista…"
              className="max-h-28 flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-[13px] outline-none focus:border-indigo-500"
            />
            <button
              onClick={submit}
              disabled={busy || !input.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              title="Enviar"
              aria-label="Enviar mensaje"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
