import { useEffect, useMemo, useRef, useState } from 'react'
import {
  workspaceChat,
  uploadWorkspaceFile,
  isTextFile,
  readFileText,
  type WsMessage,
  type WsAttachment,
} from '../../lib/workspace-api'
import { Markdown } from './md'

type Thread = { id: string; title: string; messages: WsMessage[] }
const LS_KEY = 'bi_ws_threads_v1'

function loadThreads(): Thread[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function AiBuilder() {
  const [threads, setThreads] = useState<Thread[]>(() => loadThreads())
  const [activeId, setActiveId] = useState<string>(() => loadThreads()[0]?.id || '')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attachments, setAttachments] = useState<WsAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [webAccess, setWebAccess] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const active = useMemo(() => threads.find((t) => t.id === activeId) || null, [threads, activeId])

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(threads.slice(0, 40)))
    } catch {
      /* ignore quota */
    }
  }, [threads])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [active?.messages, busy])

  const lastAssistant = useMemo(() => {
    const msgs = active?.messages || []
    for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === 'assistant') return msgs[i].content
    return ''
  }, [active?.messages])

  const ensureThread = (): Thread => {
    if (active) return active
    const t: Thread = { id: uid(), title: 'Nueva conversación', messages: [] }
    setThreads((prev) => [t, ...prev])
    setActiveId(t.id)
    return t
  }

  const patchThread = (id: string, fn: (t: Thread) => Thread) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? fn(t) : t)))
  }

  const newThread = () => {
    const t: Thread = { id: uid(), title: 'Nueva conversación', messages: [] }
    setThreads((prev) => [t, ...prev])
    setActiveId(t.id)
    setAttachments([])
    setError('')
    setHistoryOpen(false)
  }

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const t = ensureThread()
    const userMsg: WsMessage = { role: 'user', content: text }
    const nextMessages = [...t.messages, userMsg]
    const title = t.messages.length === 0 ? text.slice(0, 48) : t.title
    patchThread(t.id, (x) => ({ ...x, title, messages: nextMessages }))
    setInput('')
    setBusy(true)
    setError('')
    try {
      const { reply } = await workspaceChat({ messages: nextMessages, attachments, webAccess })
      patchThread(t.id, (x) => ({ ...x, messages: [...nextMessages, { role: 'assistant', content: reply }] }))
    } catch (e) {
      setError((e as Error).message)
      patchThread(t.id, (x) => ({ ...x, messages: nextMessages }))
    } finally {
      setBusy(false)
    }
  }

  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return
    setUploading(true)
    setError('')
    try {
      for (const file of Array.from(files)) {
        const att: WsAttachment = { name: file.name, type: file.type }
        if (isTextFile(file)) {
          try { att.text = await readFileText(file) } catch { /* ignore */ }
        }
        try {
          const { publicUrl } = await uploadWorkspaceFile(file)
          att.url = publicUrl
        } catch (e) {
          // El archivo sirve igual como contexto si es de texto; avisa si no se pudo guardar.
          if (!att.text) setError(`No se pudo subir "${file.name}": ${(e as Error).message}`)
        }
        setAttachments((prev) => [...prev, att])
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const messages = active?.messages || []

  return (
    <div className="mx-auto grid max-w-[1500px] gap-4 px-6 py-5 lg:grid-cols-[minmax(360px,0.9fr)_1.1fr]">
      {/* ── Panel izquierdo: conversación ─────────────────────────────── */}
      <section className="flex h-[calc(100vh-150px)] flex-col rounded-xl border border-slate-200 bg-white shadow-sm print:hidden">
        <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">✦</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{active?.title || 'Asistente de investigación'}</div>
            <div className="text-[11px] text-slate-400">Constructor a la medida · IA</div>
          </div>
          <button onClick={newThread} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 hover:border-indigo-500 hover:text-indigo-600">+ Nueva</button>
          <div className="relative">
            <button onClick={() => setHistoryOpen((v) => !v)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 hover:border-indigo-500 hover:text-indigo-600">Historial</button>
            {historyOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] z-20 max-h-72 w-64 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {threads.length === 0 && <div className="px-3 py-2 text-[12px] text-slate-400">Sin conversaciones</div>}
                {threads.map((t) => (
                  <button key={t.id} onClick={() => { setActiveId(t.id); setHistoryOpen(false); setAttachments([]) }} className={`block w-full truncate border-b border-slate-100 px-3 py-2 text-left text-[12.5px] last:border-0 hover:bg-slate-50 ${t.id === activeId ? 'font-bold text-indigo-600' : 'text-slate-600'}`}>
                    {t.title || 'Sin título'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !busy && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-600">
              Pídeme un informe, un análisis de pertinencia, una propuesta de programas o cualquier producto académico a partir de la base de conocimiento de Algoritmo BI. Puedes adjuntar archivos para que los tenga en cuenta.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
                {m.role === 'assistant' ? <Markdown text={m.content} /> : m.content}
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
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-600">{error}</div>}
        </div>

        {/* Adjuntos */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 py-2">
            {attachments.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11.5px] text-slate-600">
                📎 {a.name}{a.text ? '' : a.url ? '' : ''}
                <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Barra de entrada */}
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 flex items-center gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-50">
              {uploading ? 'Subiendo…' : '📎 Adjuntar'}
            </button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <button
              onClick={() => setWebAccess((v) => !v)}
              title="Buscar en la web (Tavily) para complementar la respuesta"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition ${webAccess ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-300 text-slate-500 hover:border-indigo-400'}`}
            >
              🌐 Internet {webAccess && <span className="rounded bg-indigo-600 px-1 text-[9px] font-bold uppercase text-white">on</span>}
            </button>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
              rows={1}
              placeholder="Escribe tu solicitud… (Enter para enviar, Shift+Enter salto de línea)"
              className="max-h-40 flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-[13px] outline-none focus:border-indigo-500"
            />
            <button onClick={() => void send()} disabled={busy || !input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40" title="Enviar">↑</button>
          </div>
        </div>
      </section>

      {/* ── Panel derecho: zona de trabajo ────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-slate-100 print:border-0 print:bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 print:hidden">
          <div className="text-sm font-bold text-slate-700">Zona de trabajo</div>
          <button
            onClick={() => window.print()}
            disabled={!lastAssistant}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-40"
          >
            ⎙ Exportar a PDF
          </button>
        </div>
        <div className="max-h-[calc(100vh-190px)] overflow-y-auto p-6 print:max-h-none print:overflow-visible print:p-0">
          {lastAssistant ? (
            <article className="doc mx-auto max-w-[820px] rounded-lg bg-white p-11 text-slate-800 shadow-[0_4px_24px_rgba(16,24,40,.12)] print:max-w-none print:p-0 print:shadow-none">
              <Markdown text={lastAssistant} />
            </article>
          ) : (
            <div className="grid h-full min-h-[300px] place-items-center text-center text-sm text-slate-400">
              El producto generado por la IA aparecerá aquí, listo para exportar a PDF.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
