/**
 * Cotizador — builder de una cotización: chat con la IA a la izquierda,
 * estado vivo de la propuesta (módulos, totales, narrativa, destinatarios y
 * métricas) a la derecha.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Send, Loader2, ExternalLink, Copy, CheckCircle2, Globe, EyeOff, Sparkles,
  Users, BarChart2, FileText, Plus, Trash2, Mail, RefreshCw, PenSquare, MoreVertical, CopyPlus, Archive,
} from 'lucide-react'
import { computeTotals, type QuoteItem, type DiscountTier } from '../cotizacion/pricing'
import { ContentEditor } from './ContentEditor'
import { quotesApi, money, timeAgo, fmtDuration, type QuoteMessageRow, type QuoteRecipient } from './api'

type Tab = 'propuesta' | 'contenido' | 'destinatarios' | 'metricas'

const SECTION_LABEL: Record<string, string> = {
  portada: 'Portada',
  presentacion: 'Presentación',
  diagnostico: 'Diagnóstico',
  arquitectura: 'Arquitectura',
  enfoque: 'Enfoque',
  pantallas: 'Capturas',
  modulos: 'Módulos',
  configurador: 'Configurador',
  cronograma: 'Cronograma',
  inversion: 'Inversión',
  pagos: 'Plan de pagos',
  servicio: 'Servicio',
  equipo: 'Equipo',
  condiciones: 'Condiciones',
  cierre: 'Cierre',
}

export function QuoteBuilder() {
  const { quoteId = '' } = useParams<{ quoteId: string }>()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [quote, setQuote] = useState<any>(null)
  const [items, setItems] = useState<QuoteItem[]>([])
  const [messages, setMessages] = useState<QuoteMessageRow[]>([])
  const [recipients, setRecipients] = useState<QuoteRecipient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('propuesta')

  // chat
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // acciones
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState('')

  // destinatarios
  const [rName, setRName] = useState('')
  const [rEmail, setREmail] = useState('')
  const [sendingId, setSendingId] = useState('')

  // métricas
  const [metrics, setMetrics] = useState<any>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const payload = await quotesApi.get(quoteId)
      setQuote(payload.quote)
      setItems(Array.isArray(payload.quote?.pricing?.items) ? payload.quote.pricing.items : [])
      setMessages(payload.messages || [])
      setRecipients(payload.recipients || [])
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }, [quoteId])
  useEffect(() => { void load() }, [load])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, thinking])

  const scale: DiscountTier[] | undefined = quote?.discountScale?.length ? quote.discountScale : undefined
  const totals = useMemo(() => computeTotals(items, { scale }), [items, scale])
  const currency = quote?.currency || 'COP'

  const publicUrl = quote ? `${window.location.origin}/c/${quote.publicId}` : ''

  const ask = async () => {
    const message = draft.trim()
    if (!message || thinking) return
    setDraft('')
    setError('')
    setThinking(true)
    setMessages((prev) => [...prev, { id: `tmp-${Date.now()}`, role: 'user', content: message, createdAt: new Date().toISOString() }])
    try {
      const payload = await quotesApi.chat(quoteId, message)
      setQuote(payload.quote)
      setItems(Array.isArray(payload.quote?.pricing?.items) ? payload.quote.pricing.items : [])
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: payload.reply,
          meta: { changes: payload.changes },
          createdAt: new Date().toISOString(),
        },
      ])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setThinking(false)
    }
  }

  const saveItems = async (next: QuoteItem[]) => {
    setItems(next) // optimista; el servidor recalcula y confirma
    try {
      const payload = await quotesApi.update(quoteId, { items: next })
      setQuote(payload.quote)
      setItems(payload.quote.pricing.items)
    } catch (e: any) {
      setError(e.message)
      await load()
    }
  }

  const toggleItem = (code: string) =>
    saveItems(items.map((i) => (i.code === code && i.kind !== 'CORE' ? { ...i, on: !i.on } : i)))

  const setItemQty = (code: string, qty: number) => {
    const clamped = Math.min(999, Math.max(1, Math.round(qty) || 1))
    const current = items.find((i) => i.code === code)
    if (!current || (current.qty ?? 1) === clamped) return
    void saveItems(items.map((i) => (i.code === code ? { ...i, qty: clamped } : i)))
  }

  const duplicateQuote = async () => {
    setMenuOpen(false)
    try {
      const payload = await quotesApi.duplicate(quoteId)
      navigate(`/ecosistema/cotizador/${payload.quote.id}`)
      window.location.reload()
    } catch (e: any) { setError(e.message) }
  }

  const archiveQuote = async () => {
    setMenuOpen(false)
    try {
      const payload = quote.status === 'ARCHIVED'
        ? await quotesApi.unpublish(quoteId) // reactivar → borrador
        : await quotesApi.archive(quoteId)
      setQuote((prev: any) => ({ ...prev, ...payload.quote }))
    } catch (e: any) { setError(e.message) }
  }

  const deleteQuote = async () => {
    setMenuOpen(false)
    const ok = confirm(
      `¿Eliminar la cotización de «${quote.clientName}»?\n\nSe borran su URL pública, sus destinatarios y todas sus métricas. Esta acción no se puede deshacer.`
    )
    if (!ok) return
    try {
      await quotesApi.remove(quoteId)
      navigate('/ecosistema/cotizador')
    } catch (e: any) { setError(e.message) }
  }

  const togglePublish = async () => {
    setPublishing(true); setError('')
    try {
      const payload = quote.status === 'PUBLISHED'
        ? await quotesApi.unpublish(quoteId)
        : await quotesApi.publish(quoteId)
      setQuote((prev: any) => ({ ...prev, ...payload.quote }))
    } catch (e: any) { setError(e.message) } finally { setPublishing(false) }
  }

  const copy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text)
    setCopied(key)
    window.setTimeout(() => setCopied(''), 1600)
  }

  const addRecipient = async () => {
    if (!rName.trim()) return
    try {
      const payload = await quotesApi.addRecipient(quoteId, { name: rName.trim(), email: rEmail.trim() || undefined })
      setRecipients((prev) => [...prev, payload.recipient])
      setRName(''); setREmail('')
    } catch (e: any) { setError(e.message) }
  }

  const sendTo = async (recipient: QuoteRecipient) => {
    setSendingId(recipient.id); setError('')
    try {
      const payload = await quotesApi.send(quoteId, recipient.id)
      setRecipients((prev) => prev.map((r) => (r.id === recipient.id ? payload.recipient : r)))
    } catch (e: any) { setError(e.message) } finally { setSendingId('') }
  }

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true)
    try {
      setMetrics(await quotesApi.metrics(quoteId))
    } catch (e: any) { setError(e.message) } finally { setMetricsLoading(false) }
  }, [quoteId])
  useEffect(() => { if (tab === 'metricas' && !metrics) void loadMetrics() }, [tab, metrics, loadMetrics])

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-400">Cargando cotización…</div>
  if (!quote) return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-rose-600">{error || 'Cotización no encontrada'}</div>

  const published = quote.status === 'PUBLISHED'
  const content = quote.content || {}
  const narrative: Array<[string, boolean]> = [
    ['Carta', !!content.intro],
    ['Diagnóstico', !!(content.diagnosis?.lede || content.diagnosis?.fronts?.length)],
    ['Arquitectura', !!(content.architecture?.lede || content.architecture?.layers?.length)],
    ['Capturas', !!content.screens?.items?.length],
    ['Cronograma', !!content.schedule?.groups?.length],
    ['Hitos', !!content.milestones?.length],
    ['Servicio', !!(content.service?.levels?.length || content.service?.includedMonths)],
    ['Equipo', !!content.team?.length],
    ['Supuestos', !!content.assumptions?.length],
    ['Exclusiones', !!content.exclusions?.length],
    ['Garantías', !!content.guarantees?.length],
    ['Cierre', !!content.backQuote],
  ]

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
        <Link to="/ecosistema/cotizador" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={16} /> Cotizaciones
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <div className="min-w-0">
          <div className="truncate text-sm font-black tracking-tight">{quote.clientName}</div>
          <div className="truncate text-[11px] text-slate-400">{quote.title}</div>
        </div>
        <span className={`ml-1 shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${published ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : quote.status === 'ARCHIVED' ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
          {published ? 'Publicada' : quote.status === 'ARCHIVED' ? 'Archivada' : 'Borrador'}
        </span>
        {quote.template === 'SERVICIO' && (
          <span className="shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-700">Servicio</span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => copy(publicUrl, 'link')}
          className="hidden items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 sm:inline-flex"
        >
          {copied === 'link' ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />} Enlace
        </button>
        <a
          href={publicUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
        >
          <ExternalLink size={14} /> Ver
        </a>
        <button
          onClick={togglePublish} disabled={publishing}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-bold shadow-sm disabled:opacity-50 ${published ? 'border border-slate-300 text-slate-600 hover:bg-slate-100' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
        >
          {publishing ? <Loader2 size={14} className="animate-spin" /> : published ? <EyeOff size={14} /> : <Globe size={14} />}
          {published ? 'Despublicar' : 'Publicar'}
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Más acciones"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button onClick={duplicateQuote} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50">
                  <CopyPlus size={14} className="text-slate-400" /> Duplicar cotización
                </button>
                <button onClick={archiveQuote} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50">
                  <Archive size={14} className="text-slate-400" /> {quote.status === 'ARCHIVED' ? 'Reactivar (borrador)' : 'Archivar'}
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button onClick={deleteQuote} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-50">
                  <Trash2 size={14} /> Eliminar…
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {error && <div className="border-b border-rose-200 bg-rose-50 px-6 py-2 text-[13px] text-rose-700">{error}</div>}

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-0 lg:grid-cols-[minmax(380px,1fr)_minmax(420px,1.1fr)]">
        {/* ── Chat ── */}
        <section className="flex min-h-[50vh] flex-col border-slate-200 lg:border-r">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6" style={{ maxHeight: 'calc(100vh - 190px)' }}>
            {messages.length === 0 && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-700"><Sparkles size={15} /> Construyamos la cotización</div>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                  Cuéntame del cliente: a qué se dedica, qué le duele hoy y qué quiere lograr.
                  Con eso ajusto los módulos y redacto el diagnóstico, la carta y el enfoque.
                  Los precios salen del catálogo; yo no los invento.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {['El cliente es una editorial universitaria…', 'Solo necesita el frente comercial', 'Redacta la carta de presentación'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setDraft(suggestion)}
                      className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-[12px] text-indigo-600 hover:bg-indigo-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700 shadow-sm'}`}>
                  {message.content}
                  {message.role === 'assistant' && message.meta?.changes && message.meta.changes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
                      {message.meta.changes.map((change, index) => (
                        <span key={index} className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10.5px] text-emerald-700">{change}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-400 shadow-sm">
                  <Loader2 size={14} className="animate-spin" /> Redactando…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask() } }}
                rows={2}
                placeholder="Describe al cliente o pide una sección… (Enter envía)"
                className="flex-1 resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
              <button
                onClick={ask} disabled={thinking || !draft.trim()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </div>
          </div>
        </section>

        {/* ── Estado ── */}
        <section className="flex flex-col">
          <nav className="flex gap-1 border-b border-slate-200 bg-white px-4 pt-2 sm:px-6">
            {([['propuesta', 'Propuesta', FileText], ['contenido', 'Contenido', PenSquare], ['destinatarios', 'Destinatarios', Users], ['metricas', 'Métricas', BarChart2]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-1.5 rounded-t-lg px-3.5 py-2 text-[13px] font-semibold ${tab === key ? 'border border-b-0 border-slate-200 bg-slate-50 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Icon size={14} /> {label}
                {key === 'destinatarios' && recipients.length > 0 && (
                  <span className="rounded-full bg-slate-200 px-1.5 text-[10.5px] text-slate-600">{recipients.length}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6" style={{ maxHeight: 'calc(100vh - 165px)' }}>
            {tab === 'propuesta' && (
              <div className="space-y-5">
                {/* Totales */}
                <div className="rounded-2xl bg-slate-900 p-5 text-white">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Inversión total · {currency}</div>
                  <div className="mt-1 font-mono text-3xl font-black tracking-tight">{money(totals.total, currency)}</div>
                  <div className="mt-3 grid grid-cols-3 gap-3 border-t border-white/15 pt-3 text-center">
                    <div><div className="font-mono text-lg font-bold">{totals.moduleCount}</div><div className="text-[10.5px] uppercase tracking-wide text-slate-400">Módulos</div></div>
                    <div><div className="font-mono text-lg font-bold">{totals.deliverables}</div><div className="text-[10.5px] uppercase tracking-wide text-slate-400">Entregables</div></div>
                    <div><div className="font-mono text-lg font-bold">{totals.weeks}</div><div className="text-[10.5px] uppercase tracking-wide text-slate-400">Semanas</div></div>
                  </div>
                  {totals.discount > 0 && (
                    <div className="mt-2 text-[12px] text-sky-300">Economía de escala {totals.discountPct}%: −{money(totals.discount, currency)}</div>
                  )}
                </div>

                {/* Narrativa */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Narrativa redactada</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {narrative.map(([label, done]) => (
                      <span key={label} className={`rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                        {done ? '✓ ' : ''}{label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[12px] text-slate-400">Pídele a la IA las secciones pendientes; la vista pública omite lo que falte.</p>
                </div>

                {/* Módulos */}
                <div className="rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-slate-400">
                    Módulos · el cliente también podrá moverlos
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <li key={item.code} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-14 shrink-0 font-mono text-[11px] font-bold text-amber-600">{item.code}</span>
                        <span className={`min-w-0 flex-1 truncate text-[13px] ${item.kind === 'CORE' ? 'font-bold text-slate-900' : item.on ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                          {item.name}
                        </span>
                        {item.unit && item.kind !== 'CORE' && (
                          <input
                            type="number" min={1} max={999}
                            value={item.qty ?? 1}
                            disabled={!item.on}
                            onChange={(e) => setItemQty(item.code, Number(e.target.value))}
                            className="w-14 shrink-0 rounded-lg border border-slate-300 px-1.5 py-0.5 text-center font-mono text-[12px] disabled:opacity-30"
                            title={`Cantidad de ${item.unit}s`}
                          />
                        )}
                        <span className="shrink-0 font-mono text-[12px] text-slate-500">
                          {(item.qty ?? 1) > 1 ? `${item.qty} × ` : ''}{money(item.price, currency)}{item.unit ? `/${item.unit}` : ''}
                        </span>
                        {item.kind === 'CORE' ? (
                          <span className="w-11 shrink-0 text-center text-[10px] font-bold uppercase text-slate-400">Fijo</span>
                        ) : (
                          <button
                            onClick={() => toggleItem(item.code)}
                            className={`relative h-5 w-11 shrink-0 rounded-full transition ${item.on ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            aria-label={`${item.on ? 'Apagar' : 'Encender'} ${item.name}`}
                          >
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${item.on ? 'left-6' : 'left-0.5'}`} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {tab === 'contenido' && (
              <ContentEditor
                key={quote.id}
                quoteId={quoteId}
                quote={quote}
                onSaved={(saved) => {
                  setQuote(saved)
                  setItems(Array.isArray(saved?.pricing?.items) ? saved.pricing.items : items)
                }}
              />
            )}

            {tab === 'destinatarios' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Nuevo destinatario</div>
                  <p className="mt-1 text-[12.5px] text-slate-500">Cada persona recibe un enlace propio: sabrás quién abrió, cuánto leyó y qué tocó.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      value={rName} onChange={(e) => setRName(e.target.value)} placeholder="Nombre"
                      className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                    <input
                      value={rEmail} onChange={(e) => setREmail(e.target.value)} placeholder="Correo (para enviar)"
                      className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={addRecipient} disabled={!rName.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                    >
                      <Plus size={14} /> Agregar
                    </button>
                  </div>
                </div>

                {recipients.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-[13px] text-slate-400">
                    Sin destinatarios todavía. El enlace general también funciona.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {recipients.map((recipient) => {
                      const link = `${publicUrl}?d=${recipient.token}`
                      return (
                        <li key={recipient.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-bold text-slate-800">{recipient.name}</div>
                              <div className="truncate text-[12px] text-slate-400">{recipient.email || 'sin correo'}</div>
                            </div>
                            <button
                              onClick={() => copy(link, recipient.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              {copied === recipient.id ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />} Enlace
                            </button>
                            <button
                              onClick={() => sendTo(recipient)}
                              disabled={!published || !recipient.email || sendingId === recipient.id}
                              title={!published ? 'Publica primero' : !recipient.email ? 'Necesita correo' : 'Enviar por correo'}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-30"
                            >
                              {sendingId === recipient.id ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                              {recipient.sentAt ? 'Reenviar' : 'Enviar'}
                            </button>
                            <button
                              onClick={async () => { if (confirm(`¿Quitar a ${recipient.name}? Su enlace dejará de rastrearse.`)) { await quotesApi.removeRecipient(quoteId, recipient.id); setRecipients((prev) => prev.filter((r) => r.id !== recipient.id)) } }}
                              className="grid h-8 w-8 place-items-center rounded-full text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[11.5px] text-slate-400">
                            <span>Enviado: {recipient.sentAt ? timeAgo(recipient.sentAt) : 'no'}</span>
                            <span>Aperturas: <b className="text-slate-600">{recipient.openCount}</b></span>
                            <span>Primera: {recipient.firstSeenAt ? timeAgo(recipient.firstSeenAt) : '—'}</span>
                            <span>Última: {recipient.lastSeenAt ? timeAgo(recipient.lastSeenAt) : '—'}</span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}

            {tab === 'metricas' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Interacción con la cotización</div>
                  <button onClick={loadMetrics} className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:underline">
                    <RefreshCw size={12} className={metricsLoading ? 'animate-spin' : ''} /> Actualizar
                  </button>
                </div>

                {!metrics ? (
                  <div className="py-10 text-center text-[13px] text-slate-400">{metricsLoading ? 'Calculando…' : 'Sin datos'}</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ['Aperturas', metrics.summary.views],
                        ['Visitantes', metrics.summary.visitors],
                        ['Lectura promedio', fmtDuration(metrics.summary.avgMs)],
                        ['Descargas PDF', metrics.summary.pdf],
                      ].map(([label, value]) => (
                        <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                          <div className="font-mono text-xl font-black text-slate-900">{value as any}</div>
                          <div className="text-[10.5px] uppercase tracking-wide text-slate-400">{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Embudo de secciones */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Hasta dónde llegan</div>
                      <div className="mt-3 space-y-1.5">
                        {Object.keys(SECTION_LABEL).map((sectionId) => {
                          const row = metrics.sections.find((s: any) => s.sectionId === sectionId)
                          const max = Math.max(1, ...metrics.sections.map((s: any) => s.visitors))
                          const visitors = row?.visitors ?? 0
                          return (
                            <div key={sectionId} className="flex items-center gap-2">
                              <span className="w-28 shrink-0 text-[11.5px] text-slate-500">{SECTION_LABEL[sectionId]}</span>
                              <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                                <div className="h-full rounded bg-indigo-500/80" style={{ width: `${(visitors / max) * 100}%` }} />
                              </div>
                              <span className="w-6 shrink-0 text-right font-mono text-[11.5px] text-slate-600">{visitors}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Módulos tocados */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Módulos que el cliente movió</div>
                      {metrics.modules.length === 0 ? (
                        <p className="mt-2 text-[12.5px] text-slate-400">Nadie ha tocado los interruptores todavía.</p>
                      ) : (
                        <ul className="mt-2 space-y-1">
                          {metrics.modules.map((m: any) => (
                            <li key={m.code} className="flex items-center gap-3 text-[12.5px]">
                              <span className="w-12 font-mono font-bold text-amber-600">{m.code}</span>
                              <span className="text-emerald-600">{m.on} encendidos</span>
                              <span className="text-rose-500">{m.off} apagados</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Ubicaciones */}
                    {metrics.places.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Desde dónde</div>
                        <ul className="mt-2 space-y-1 text-[12.5px] text-slate-600">
                          {metrics.places.slice(0, 6).map((p: any) => (
                            <li key={p.place} className="flex justify-between"><span>{p.place}</span><span className="font-mono">{p.views}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Por destinatario */}
                    {metrics.recipients.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Por destinatario</div>
                        <table className="mt-2 w-full text-[12.5px]">
                          <thead className="text-left text-[10.5px] uppercase tracking-wide text-slate-400">
                            <tr><th className="py-1 font-semibold">Persona</th><th className="py-1 text-center font-semibold">Aperturas</th><th className="py-1 text-right font-semibold">Tiempo</th><th className="py-1 text-right font-semibold">Última visita</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {metrics.recipients.map((r: any) => (
                              <tr key={r.id}>
                                <td className="py-1.5 font-semibold text-slate-700">{r.name}</td>
                                <td className="py-1.5 text-center font-mono">{r.openCount}</td>
                                <td className="py-1.5 text-right font-mono">{fmtDuration(r.totalMs)}</td>
                                <td className="py-1.5 text-right text-slate-400">{r.lastSeenAt ? timeAgo(r.lastSeenAt) : 'sin abrir'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
