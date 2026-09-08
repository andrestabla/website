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
  Mic, Square, Eye, Paperclip, X, FileInput, Code2, Save, ChevronDown, ChevronRight, PanelLeft, PanelRight,
} from 'lucide-react'
import { computeTotals, type QuoteItem, type DiscountTier } from '../cotizacion/pricing'
import { ContentEditor } from './ContentEditor'
import { quotesApi, money, timeAgo, fmtDuration, type QuoteMessageRow, type QuoteRecipient, type QuoteAttachmentRow, type EmailTemplate } from './api'
import { TEMPLATE_LABEL } from './CotizadorList'

type Tab = 'propuesta' | 'contenido' | 'vista' | 'destinatarios' | 'metricas'
/** Disposición del builder: las dos columnas, solo el chat o solo el panel. Se recuerda por navegador. */
type Layout = 'both' | 'chat' | 'panel'
const LAYOUT_KEY = 'cotizador:layout'
const SPLIT_KEY = 'cotizador:split'
const readLayout = (): Layout => {
  try { const v = localStorage.getItem(LAYOUT_KEY); return v === 'chat' || v === 'panel' ? v : 'both' } catch { return 'both' }
}
const readSplit = (): number => {
  try { const n = Number(localStorage.getItem(SPLIT_KEY)); return n >= 25 && n <= 75 ? n : 44 } catch { return 44 }
}

/** Formatos que el asistente acepta como adjunto. Markdown es el recomendado; el resto se convierte. */
const ATTACH_ACCEPT = '.md,.markdown,.txt,.docx,.pdf,.html,.htm,text/markdown,text/plain,application/pdf,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ATTACH_MAX_BYTES = 3.5 * 1024 * 1024
const FORMAT_LABEL: Record<string, string> = { md: 'Markdown', docx: 'Word', pdf: 'PDF', html: 'HTML', txt: 'Texto' }

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`No se pudo leer «${file.name}»`))
    reader.readAsDataURL(file)
  })

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

  // disposición: columnas visibles y ancho del chat (arrastrando el divisor)
  const [layout, setLayoutState] = useState<Layout>(readLayout)
  const [split, setSplit] = useState<number>(readSplit)
  const gridRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const setLayout = (next: Layout) => { setLayoutState(next); try { localStorage.setItem(LAYOUT_KEY, next) } catch { /* sin almacenamiento */ } }
  // ocultar la columna visible deja la otra sola; mostrar la oculta vuelve a las dos
  const toggleColumn = (col: 'chat' | 'panel') => {
    const chatVisible = layout !== 'panel'
    const panelVisible = layout !== 'chat'
    if (col === 'chat') setLayout(chatVisible ? 'panel' : (panelVisible ? 'both' : 'chat'))
    else setLayout(panelVisible ? 'chat' : (chatVisible ? 'both' : 'panel'))
  }
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev: MouseEvent) => {
      const rect = gridRef.current?.getBoundingClientRect()
      if (!rect || !dragging.current) return
      const pct = Math.min(75, Math.max(25, ((ev.clientX - rect.left) / rect.width) * 100))
      setSplit(Math.round(pct))
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      setSplit((v) => { try { localStorage.setItem(SPLIT_KEY, String(v)) } catch { /* sin almacenamiento */ } return v })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // chat
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // adjuntos del asistente
  const [attachments, setAttachments] = useState<QuoteAttachmentRow[]>([])
  const [pendingIds, setPendingIds] = useState<string[]>([]) // van con el próximo mensaje
  const [uploading, setUploading] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [importing, setImporting] = useState('')
  const [importMenu, setImportMenu] = useState('')
  const [mdEditor, setMdEditor] = useState<{ id: string; name: string; markdown: string; dirty: boolean; saving: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // al volcar un adjunto, el editor de contenido se reabre con las páginas nuevas
  const [editorRev, setEditorRev] = useState(0)

  // dictado por voz
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // acciones
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState('')

  // destinatarios
  const [rName, setRName] = useState('')
  const [rEmail, setREmail] = useState('')
  const [sendingId, setSendingId] = useState('')

  // correo al destinatario: plantilla editable con vista previa
  const [emailTpl, setEmailTpl] = useState<EmailTemplate | null>(null)
  const [emailDefaults, setEmailDefaults] = useState<EmailTemplate | null>(null)
  const [emailHtml, setEmailHtml] = useState('')
  const [emailDirty, setEmailDirty] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailOpen, setEmailOpen] = useState(true)

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
      setAttachments(Array.isArray(payload.attachments) ? payload.attachments : [])
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

  const pendingRows = attachments.filter((a) => pendingIds.includes(a.id))

  const ask = async () => {
    const typed = draft.trim()
    if (thinking || uploading) return
    // sin texto pero con adjuntos: el mensaje presenta los archivos como referencia
    const message = typed || (pendingRows.length
      ? `Adjunto ${pendingRows.map((a) => `«${a.name}»`).join(' y ')}. Tenlo como referencia para esta cotización.`
      : '')
    if (!message) return
    const ids = [...pendingIds]
    setDraft('')
    setPendingIds([])
    setError('')
    setThinking(true)
    setMessages((prev) => [...prev, {
      id: `tmp-${Date.now()}`, role: 'user', content: message, createdAt: new Date().toISOString(),
      meta: ids.length ? { attachments: pendingRows.map((a) => ({ id: a.id, name: a.name })) } : undefined,
    }])
    try {
      const payload = await quotesApi.chat(quoteId, message, ids)
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

  const stopTracks = () => {
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    recorderRef.current = null
  }

  // ── adjuntos ──
  const onFiles = async (list: FileList | null) => {
    if (!list || !list.length) return
    setError('')
    setUploading(true)
    const notes: string[] = []
    try {
      for (const file of Array.from(list)) {
        if (file.size > ATTACH_MAX_BYTES) { notes.push(`«${file.name}» supera 3,5 MB: divídelo o súbelo como .md.`); continue }
        if (!/\.(md|markdown|txt|docx|pdf|html?)$/i.test(file.name)) { notes.push(`«${file.name}»: formato no soportado. Usa .md, .docx, .pdf, .html o .txt.`); continue }
        const fileBase64 = await readAsDataUrl(file)
        const payload = await quotesApi.attachments.upload(quoteId, { fileBase64, fileName: file.name, mimeType: file.type })
        const row: QuoteAttachmentRow = payload.attachment
        setAttachments((prev) => [...prev, row])
        setPendingIds((prev) => [...prev, row.id])
        if (row.converted) {
          notes.push(`«${row.name}» (${FORMAT_LABEL[row.sourceFormat] || row.sourceFormat}) se convirtió a Markdown con todo su contenido: ${row.charCount.toLocaleString('es-CO')} caracteres, ~${row.pagesCount ?? '?'} páginas. Para más control, sube el archivo en .md.`)
        }
        if (row.truncated) notes.push(`«${row.name}» superó el tope de 400.000 caracteres y se recortó.`)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
      setNotice(notes.join(' '))
    }
  }

  const pagesCount: number = Array.isArray(quote?.content?.pages) ? quote.content.pages.length : 0

  const importAttachment = async (row: QuoteAttachmentRow, mode: 'replace' | 'append') => {
    setImportMenu('')
    if (mode === 'replace' && pagesCount > 0 && !confirm(`El documento ya tiene ${pagesCount} páginas. ¿Reemplazarlas por el contenido de «${row.name}»? Los cambios sin guardar del editor de contenido se pierden.`)) return
    setImporting(row.id)
    setError('')
    try {
      const payload = await quotesApi.attachments.import(quoteId, row.id, mode, mode === 'replace' && !!row.docTitle)
      setQuote(payload.quote)
      setEditorRev((v) => v + 1)
      setNotice(`«${row.name}» quedó volcado en ${payload.pagesCount} páginas editables${mode === 'append' ? ' al final del documento' : ''} (${payload.totalPages} en total). Revisa y edita cada título y bloque en Contenido › Páginas del documento.`)
      setTab('contenido')
    } catch (e) { setError((e as Error).message) } finally { setImporting('') }
  }

  const openMarkdown = async (row: QuoteAttachmentRow) => {
    setError('')
    try {
      const payload = await quotesApi.attachments.get(quoteId, row.id)
      setMdEditor({ id: row.id, name: row.name, markdown: payload.attachment.markdown || '', dirty: false, saving: false })
    } catch (e) { setError((e as Error).message) }
  }

  const saveMarkdown = async () => {
    if (!mdEditor || !mdEditor.dirty) return
    setMdEditor({ ...mdEditor, saving: true })
    try {
      const payload = await quotesApi.attachments.update(quoteId, mdEditor.id, { markdown: mdEditor.markdown })
      setAttachments((prev) => prev.map((a) => (a.id === mdEditor.id ? { ...a, ...payload.attachment } : a)))
      setMdEditor({ ...mdEditor, dirty: false, saving: false })
    } catch (e) {
      setError((e as Error).message)
      setMdEditor({ ...mdEditor, saving: false })
    }
  }

  const removeAttachment = async (row: QuoteAttachmentRow) => {
    if (!confirm(`¿Eliminar el adjunto «${row.name}»? La IA dejará de leerlo; las páginas ya importadas se conservan.`)) return
    try {
      await quotesApi.attachments.remove(quoteId, row.id)
      setAttachments((prev) => prev.filter((a) => a.id !== row.id))
      setPendingIds((prev) => prev.filter((id) => id !== row.id))
    } catch (e) { setError((e as Error).message) }
  }

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((t) => MediaRecorder.isTypeSupported(t)) || ''
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data) }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        stopTracks()
        if (blob.size < 1200) return // toque accidental: nada que transcribir
        setTranscribing(true)
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(new Error('No se pudo leer la grabación'))
            reader.readAsDataURL(blob)
          })
          const res = await fetch('/api/quotes/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64, mimeType: blob.type }),
          })
          const payload = await res.json()
          if (!res.ok || !payload.ok) throw new Error(payload?.error || 'No se pudo transcribir')
          if (payload.text) setDraft((prev) => (prev ? `${prev} ${payload.text}` : payload.text))
        } catch (e: any) {
          setError(e.message)
        } finally {
          setTranscribing(false)
        }
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
    } catch {
      setError('No hay acceso al micrófono. Autorízalo en el navegador y vuelve a intentar.')
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

  const saveSelectable = async (next: boolean) => {
    try {
      const payload = await quotesApi.update(quoteId, { content: { modulesSelectable: next } })
      setQuote(payload.quote)
    } catch (e: any) { setError(e.message) }
  }

  const saveDocument = async (patch: { documentUrl?: string; documentTotal?: number }) => {
    try {
      const body: Record<string, unknown> = {}
      if (patch.documentUrl !== undefined) body.content = { documentUrl: patch.documentUrl.trim() }
      if (patch.documentTotal !== undefined) body.documentTotal = patch.documentTotal
      const payload = await quotesApi.update(quoteId, body)
      setQuote(payload.quote)
    } catch (e: any) { setError(e.message) }
  }

  const toggleSelectable = (code: string) =>
    saveItems(items.map((i) => (i.code === code && i.kind !== 'CORE' ? { ...i, selectable: i.selectable === false } : i)))

  const saveNoun = async (noun: string) => {
    try {
      const payload = await quotesApi.update(quoteId, { content: { itemsNoun: noun.trim() || 'Módulos' } })
      setQuote(payload.quote)
    } catch (e: any) { setError(e.message) }
  }

  const toggleItem = (code: string) =>
    saveItems(items.map((i) => (i.code === code && i.kind !== 'CORE' ? { ...i, on: !i.on } : i)))

  const setItemQty = (code: string, qty: number) => {
    const clamped = Math.min(999, Math.max(1, Math.round(qty) || 1))
    const current = items.find((i) => i.code === code)
    if (!current || (current.qty ?? 1) === clamped) return
    void saveItems(items.map((i) => (i.code === code ? { ...i, qty: clamped } : i)))
  }

  /** Edita una línea de la cotización (nombre, precio, unidad…). El catálogo es
   *  el valor de partida; a partir de aquí manda lo que se escriba acá. */
  const patchItem = (code: string, patch: Partial<QuoteItem>) => {
    const current = items.find((i) => i.code === code)
    if (!current) return
    if (Object.entries(patch).every(([k, v]) => (current as any)[k] === v)) return
    void saveItems(items.map((i) => (i.code === code ? { ...i, ...patch } : i)))
  }

  const renameItemCode = (code: string, next: string) => {
    const clean = next.trim().toUpperCase().slice(0, 40)
    if (!clean || clean === code || items.some((i) => i.code === clean)) return
    void saveItems(items.map((i) => (i.code === code ? { ...i, code: clean } : i)))
  }

  const addItem = () => {
    let n = items.length + 1
    while (items.some((i) => i.code === `L${String(n).padStart(2, '0')}`)) n += 1
    void saveItems([
      ...items,
      { code: `L${String(n).padStart(2, '0')}`, name: 'Nueva línea', price: 0, qty: 1, kind: 'CORE', on: true },
    ])
  }

  const removeItem = (code: string) => {
    if (items.length <= 1) { setError('La cotización necesita al menos una línea'); return }
    const target = items.find((i) => i.code === code)
    if (!window.confirm(`¿Eliminar la línea «${target?.name ?? code}» de la cotización?`)) return
    void saveItems(items.filter((i) => i.code !== code))
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
    if (!emailTpl) return
    if (!confirm(`¿Enviar la cotización a ${recipient.name} (${recipient.email}) con el correo tal como se ve en la vista previa?`)) return
    setSendingId(recipient.id); setError('')
    try {
      const payload = await quotesApi.send(quoteId, recipient.id, emailTpl)
      setRecipients((prev) => prev.map((r) => (r.id === recipient.id ? payload.recipient : r)))
      setEmailDirty(false)
    } catch (e) { setError((e as Error).message) } finally { setSendingId('') }
  }

  // plantilla del correo: se carga al abrir la pestaña y se previsualiza al editar
  useEffect(() => {
    if (tab !== 'destinatarios' || emailTpl) return
    let cancelled = false
    ;(async () => {
      try {
        const payload = await quotesApi.emailPreview(quoteId, null, recipients[0]?.id)
        if (cancelled) return
        setEmailTpl(payload.template)
        setEmailDefaults(payload.defaults)
        setEmailHtml(payload.html)
      } catch (e) { if (!cancelled) setError((e as Error).message) }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, quoteId])

  useEffect(() => {
    if (!emailTpl || !emailDirty) return
    const t = window.setTimeout(async () => {
      try {
        const payload = await quotesApi.emailPreview(quoteId, emailTpl, recipients[0]?.id)
        setEmailHtml(payload.html)
      } catch { /* la vista previa se reintenta con la siguiente edición */ }
    }, 450)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailTpl, quoteId])

  const setTpl = (patch: Partial<EmailTemplate>) => { setEmailTpl((prev) => (prev ? { ...prev, ...patch } : prev)); setEmailDirty(true) }
  const saveEmailTpl = async () => {
    if (!emailTpl) return
    setEmailSaving(true); setError('')
    try {
      const payload = await quotesApi.emailSave(quoteId, emailTpl)
      setQuote(payload.quote)
      setEmailDirty(false)
    } catch (e) { setError((e as Error).message) } finally { setEmailSaving(false) }
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
  const isDoc = content.documentUrl !== undefined
  const selectable = content.modulesSelectable !== false
  const itemsNoun: string = content.itemsNoun || 'Módulos'
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
        {quote.template && quote.template !== 'SOLUCIONES' && (
          <span className="shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-700">
            {TEMPLATE_LABEL[quote.template] ?? quote.template}
          </span>
        )}
        <div className="flex-1" />
        <div className="mr-1 hidden items-center gap-0.5 rounded-lg border border-slate-200 p-0.5 lg:flex" title="Mostrar u ocultar columnas">
          <button
            onClick={() => toggleColumn('chat')}
            className={`grid h-7 w-7 place-items-center rounded-md ${layout !== 'panel' ? 'bg-slate-100 text-slate-700' : 'text-slate-300 hover:text-slate-600'}`}
            title={layout !== 'panel' ? 'Ocultar el chat' : 'Mostrar el chat'}
            aria-label="Chat"
          >
            <PanelLeft size={15} />
          </button>
          <button
            onClick={() => toggleColumn('panel')}
            className={`grid h-7 w-7 place-items-center rounded-md ${layout !== 'chat' ? 'bg-slate-100 text-slate-700' : 'text-slate-300 hover:text-slate-600'}`}
            title={layout !== 'chat' ? 'Ocultar el panel' : 'Mostrar el panel'}
            aria-label="Panel"
          >
            <PanelRight size={15} />
          </button>
        </div>
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

      <div
        ref={gridRef}
        className="mx-auto grid w-full flex-1 gap-0"
        style={{ gridTemplateColumns: layout === 'both' ? `${split}% 6px minmax(0, 1fr)` : 'minmax(0, 1fr)' }}
      >
        {/* ── Chat ── */}
        {layout !== 'panel' && (
        <section className={`flex min-h-[50vh] flex-col border-slate-200 ${layout === 'chat' ? 'mx-auto w-full max-w-4xl' : ''}`}>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6" style={{ maxHeight: 'calc(100vh - 190px)' }}>
            {messages.length === 0 && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-700"><Sparkles size={15} /> Construyamos la cotización</div>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                  Conozco el portafolio completo de Algoritmo T tal como está publicado en algoritmot.com:
                  la línea Empresas (las seis fases, los tres protocolos y el método MD-IA) y la línea
                  Educación (plataformas, virtualización, auditoría QM y formación docente).
                  Cuéntame del cliente: a qué se dedica, qué le duele hoy y qué quiere lograr.
                  Con eso elijo las variables, enciendo los módulos y redacto el diagnóstico, la carta y el método.
                  Los precios salen del catálogo, y si me dictas uno distinto, una línea nueva, la cantidad,
                  la moneda o el plan de pagos, lo aplico tal cual. También puedes adjuntarme un archivo
                  (.md, .docx, .pdf) para tomarlo como referencia o volcarlo íntegro en la propuesta.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {['El cliente es una editorial universitaria…', 'Una universidad que quiere virtualizar 20 cursos', 'Una pyme que necesita diagnóstico MD-IA y mapeo de procesos', 'Redacta la carta de presentación', 'Vuelca el adjunto tal cual en la propuesta'].map((suggestion) => (
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
                  {message.role === 'user' && message.meta?.attachments && message.meta.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-white/20 pt-2">
                      {message.meta.attachments.map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px]"><Paperclip size={10} /> {a.name}</span>
                      ))}
                    </div>
                  )}
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
            {notice && (
              <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
                <span className="flex-1">{notice}</span>
                <button onClick={() => setNotice('')} className="shrink-0 text-amber-500 hover:text-amber-800" aria-label="Cerrar"><X size={13} /></button>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50/70">
                <button onClick={() => setAttachOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                  {attachOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <Paperclip size={12} /> Adjuntos de esta cotización · {attachments.length}
                  <span className="ml-auto font-normal normal-case tracking-normal text-slate-400">la IA los lee completos en cada turno</span>
                </button>
                {attachOpen && (
                  <ul className="divide-y divide-slate-200 border-t border-slate-200">
                    {attachments.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-[12px]">
                        <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-slate-500">{a.sourceFormat}</span>
                        <span className="min-w-0 flex-1 truncate font-semibold text-slate-700" title={a.name}>{a.name}</span>
                        <span className="text-[11px] text-slate-400">{a.charCount.toLocaleString('es-CO')} car.{a.converted ? ' · convertido a Markdown' : ''}</span>
                        <button
                          onClick={() => setPendingIds((prev) => (prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id]))}
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${pendingIds.includes(a.id) ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300'}`}
                          title="Mencionarlo en el próximo mensaje para que la IA lo tome como referencia"
                        >
                          {pendingIds.includes(a.id) ? '✓ En el mensaje' : 'Referencia'}
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setImportMenu((v) => (v === a.id ? '' : a.id))}
                            disabled={importing === a.id}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:border-indigo-300 disabled:opacity-40"
                            title="Volcar el archivo íntegro como páginas editables de la propuesta"
                          >
                            {importing === a.id ? <Loader2 size={11} className="animate-spin" /> : <FileInput size={11} />} Volcar tal cual
                          </button>
                          {importMenu === a.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setImportMenu('')} />
                              <div className="absolute bottom-7 right-0 z-20 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                <button onClick={() => void importAttachment(a, 'replace')} className="block w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50">
                                  <b>Como la propuesta completa</b>
                                  <span className="block text-[11px] text-slate-400">{pagesCount ? `Reemplaza las ${pagesCount} páginas actuales` : 'El documento pasa a componerse por páginas'}</span>
                                </button>
                                <button onClick={() => void importAttachment(a, 'append')} className="block w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50">
                                  <b>Agregar al final</b>
                                  <span className="block text-[11px] text-slate-400">Sus páginas se suman a las que ya hay</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        <button onClick={() => void openMarkdown(a)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:border-indigo-300" title="Ver y editar el Markdown">
                          <Code2 size={11} /> Markdown
                        </button>
                        <button onClick={() => void removeAttachment(a)} className="grid h-6 w-6 place-items-center rounded-md text-slate-300 hover:bg-rose-50 hover:text-rose-600" title="Eliminar adjunto"><Trash2 size={12} /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {pendingRows.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400">Con el próximo mensaje:</span>
                {pendingRows.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11.5px] text-indigo-700">
                    <Paperclip size={10} /> {a.name}
                    <button onClick={() => setPendingIds((prev) => prev.filter((id) => id !== a.id))} className="text-indigo-400 hover:text-indigo-700" aria-label={`Quitar ${a.name}`}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <input ref={fileRef} type="file" accept={ATTACH_ACCEPT} multiple hidden onChange={(e) => void onFiles(e.target.files)} />
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask() } }}
                rows={2}
                placeholder={recording ? 'Grabando… habla y vuelve a tocar el micrófono' : pendingRows.length ? 'Di qué hacer con el adjunto: referencia, volcarlo tal cual, traducirlo… (Enter envía)' : 'Describe, dicta, adjunta o pide una sección… (Enter envía)'}
                className="flex-1 resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading || thinking}
                title="Adjuntar archivo (.md recomendado; .docx, .pdf, .html o .txt se convierten a Markdown)"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40"
              >
                {uploading ? <Loader2 size={17} className="animate-spin" /> : <Paperclip size={17} />}
              </button>
              <button
                onClick={toggleRecording}
                disabled={transcribing}
                title={recording ? 'Detener y transcribir' : 'Dictar por voz'}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border shadow-sm transition disabled:opacity-40 ${recording ? 'animate-pulse border-rose-600 bg-rose-600 text-white' : 'border-slate-300 bg-white text-slate-500 hover:border-indigo-400 hover:text-indigo-600'}`}
              >
                {transcribing ? <Loader2 size={17} className="animate-spin" /> : recording ? <Square size={15} /> : <Mic size={17} />}
              </button>
              <button
                onClick={ask} disabled={thinking || uploading || (!draft.trim() && pendingRows.length === 0)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              Adjunta archivos en <b className="font-semibold text-slate-500">.md</b> (recomendado). Un .docx, .pdf, .html o .txt se
              convierte a Markdown con el 100 % de su contenido. Luego pide a la IA usarlo como referencia o volcarlo
              tal cual en la propuesta: cada título y bloque queda editable en Contenido.
            </p>
          </div>
        </section>
        )}

        {/* divisor arrastrable entre columnas */}
        {layout === 'both' && (
          <div
            onMouseDown={startDrag}
            onDoubleClick={() => { setSplit(44); try { localStorage.setItem(SPLIT_KEY, '44') } catch { /* sin almacenamiento */ } }}
            className="group hidden cursor-col-resize items-stretch justify-center bg-slate-200/70 hover:bg-indigo-300 lg:flex"
            title="Arrastra para repartir el espacio · doble clic restablece"
          >
            <div className="my-auto h-10 w-0.5 rounded bg-slate-400 group-hover:bg-indigo-600" />
          </div>
        )}

        {/* ── Editor de Markdown de un adjunto ── */}
        {mdEditor && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => { if (!mdEditor.dirty || confirm('Hay cambios sin guardar en el Markdown. ¿Cerrar de todos modos?')) setMdEditor(null) }}>
            <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                <Code2 size={16} className="text-indigo-600" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-slate-800">{mdEditor.name}</div>
                  <div className="text-[11px] text-slate-400">Markdown del adjunto · {mdEditor.markdown.length.toLocaleString('es-CO')} caracteres · lo que edites aquí es lo que lee la IA y lo que se vuelca en la propuesta</div>
                </div>
                <button onClick={saveMarkdown} disabled={!mdEditor.dirty || mdEditor.saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-40">
                  {mdEditor.saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar
                </button>
                <button onClick={() => { if (!mdEditor.dirty || confirm('Hay cambios sin guardar. ¿Cerrar?')) setMdEditor(null) }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X size={16} /></button>
              </div>
              <textarea
                value={mdEditor.markdown}
                onChange={(e) => setMdEditor({ ...mdEditor, markdown: e.target.value, dirty: true })}
                spellCheck={false}
                className="flex-1 resize-none px-4 py-3 font-mono text-[12.5px] leading-relaxed text-slate-800 outline-none"
              />
            </div>
          </div>
        )}

        {/* ── Estado ── */}
        {layout !== 'chat' && (
        <section className="flex min-w-0 flex-col">
          <nav className="flex gap-1 border-b border-slate-200 bg-white px-4 pt-2 sm:px-6">
            {([['propuesta', 'Propuesta', FileText], ['contenido', 'Contenido', PenSquare], ['vista', 'Vista previa', Eye], ['destinatarios', 'Destinatarios', Users], ['metricas', 'Métricas', BarChart2]] as const).map(([key, label, Icon]) => (
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
                  <div className="mt-1 font-mono text-3xl font-black tracking-tight">{money(isDoc && !items.length ? quote.totalFinal : totals.total, currency)}</div>
                  {!isDoc && (
                  <div className="mt-3 grid grid-cols-3 gap-3 border-t border-white/15 pt-3 text-center">
                    <div><div className="font-mono text-lg font-bold">{totals.moduleCount}</div><div className="text-[10.5px] uppercase tracking-wide text-slate-400">Módulos</div></div>
                    <div><div className="font-mono text-lg font-bold">{totals.deliverables}</div><div className="text-[10.5px] uppercase tracking-wide text-slate-400">Entregables</div></div>
                    <div><div className="font-mono text-lg font-bold">{totals.weeks}</div><div className="text-[10.5px] uppercase tracking-wide text-slate-400">Semanas</div></div>
                  </div>
                  )}
                  {!isDoc && totals.discount > 0 && (
                    <div className="mt-2 text-[12px] text-sky-300">Economía de escala {totals.discountPct}%: −{money(totals.discount, currency)}</div>
                  )}
                  {isDoc && (
                    <div className="mt-2 text-[12px] text-slate-400">Cotización-documento · la pieza vive en su propio HTML</div>
                  )}
                </div>

                {/* Narrativa */}
                {!isDoc && pagesCount > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Documento por páginas · {pagesCount}</div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
                    La vista pública muestra estas páginas. Edita títulos y bloques en <button onClick={() => setTab('contenido')} className="font-semibold text-indigo-600 hover:underline">Contenido</button>,
                    o pídele a la IA que traduzca, renombre o reescriba una página.
                  </p>
                </div>
                )}
                {!isDoc && pagesCount === 0 && (
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
                )}

                {/* Documento independiente */}
                {isDoc && (
                <div className="rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-slate-400">
                    Documento independiente
                  </div>
                  <div className="space-y-3 p-4" key={quote.updatedAt}>
                    <p className="text-[12.5px] leading-relaxed text-slate-500">
                      Esta cotización es una pieza diagramada aparte. Su URL pública la muestra
                      con métricas de lectura; aquí editas la ruta del documento y la inversión
                      que aparece en la lista y la portada.
                    </p>
                    <label className="block text-[12px] font-semibold text-slate-500">
                      URL del documento
                      <input
                        defaultValue={content.documentUrl}
                        onBlur={(e) => { if (e.target.value.trim() !== content.documentUrl) void saveDocument({ documentUrl: e.target.value }) }}
                        placeholder="/cotizaciones/upc-2026/Propuesta-UPC-2026.html"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-[12px]"
                      />
                    </label>
                    {items.length ? (
                      <p className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] leading-relaxed text-slate-500">
                        La inversión total sale de las líneas de abajo:{' '}
                        <span className="font-mono font-bold text-slate-700">{money(totals.total, currency)}</span>.
                        Edítalas ahí y el total se recalcula solo.
                      </p>
                    ) : (
                      <label className="block text-[12px] font-semibold text-slate-500">
                        Inversión total ({currency})
                        <input
                          type="number" min={0}
                          defaultValue={quote.totalFinal}
                          onBlur={(e) => { const v = Math.round(Number(e.target.value) || 0); if (v !== quote.totalFinal) void saveDocument({ documentTotal: v }) }}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-[12px]"
                        />
                      </label>
                    )}
                    {content.documentUrl ? (
                      <a href={content.documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-bold text-indigo-600 hover:underline">
                        Abrir el documento ↗
                      </a>
                    ) : (
                      <p className="text-[12px] text-amber-600">Falta la URL del documento: la vista pública saldrá vacía hasta que la pongas.</p>
                    )}
                  </div>
                </div>
                )}

                {/* Módulos y valores */}
                <div className="rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                    <span className="text-[12px] font-bold uppercase tracking-wide text-slate-400">
                      {selectable ? `${itemsNoun} · el cliente mueve los marcados como libres` : `${itemsNoun} y valores · alcance fijo`}
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                    {selectable && (
                      <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500">
                        Qué elige
                        <input
                          key={`noun-${quote.updatedAt}`}
                          defaultValue={itemsNoun}
                          onBlur={(e) => { if (e.target.value.trim() && e.target.value.trim() !== itemsNoun) void saveNoun(e.target.value) }}
                          placeholder="Módulos, Etapas, Fases…"
                          className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-[12px] font-normal"
                          title="Cómo se llaman las piezas que el cliente elige: módulos de un sistema, etapas de un proceso, fases, servicios…"
                        />
                      </label>
                    )}
                    <label className="flex cursor-pointer items-center gap-2 text-[11.5px] font-semibold text-slate-500">
                      Selección del cliente
                      <button
                        onClick={() => void saveSelectable(!selectable)}
                        className={`relative h-5 w-11 shrink-0 rounded-full transition ${selectable ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        aria-label={selectable ? 'Bloquear la selección de módulos' : 'Permitir la selección de módulos'}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${selectable ? 'left-6' : 'left-0.5'}`} />
                      </button>
                    </label>
                    </div>
                  </div>
                  <ul className="divide-y divide-slate-100" key={`items-${quote.updatedAt}`}>
                    {items.map((item) => (
                      <li key={item.code} className="flex items-center gap-2 px-4 py-2.5">
                        <input
                          defaultValue={item.code}
                          onBlur={(e) => renameItemCode(item.code, e.target.value)}
                          className="w-16 shrink-0 rounded-md border border-transparent bg-transparent px-1 py-0.5 font-mono text-[11px] font-bold uppercase text-amber-600 hover:border-slate-200 focus:border-indigo-400 focus:bg-white"
                          title="Código de la línea"
                        />
                        <input
                          defaultValue={item.name}
                          onBlur={(e) => { const v = e.target.value.trim(); if (v) patchItem(item.code, { name: v }); else e.target.value = item.name }}
                          className={`min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[13px] hover:border-slate-200 focus:border-indigo-400 focus:bg-white ${item.kind === 'CORE' ? 'font-bold text-slate-900' : item.on ? 'text-slate-700' : 'text-slate-400 line-through'}`}
                          title="Nombre de la línea"
                        />
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
                        <input
                          type="number" min={0} step={1000}
                          defaultValue={item.price}
                          onBlur={(e) => patchItem(item.code, { price: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                          className="w-32 shrink-0 rounded-lg border border-slate-300 px-2 py-0.5 text-right font-mono text-[12px] text-slate-700 focus:border-indigo-400"
                          title={`Valor unitario en ${currency}${item.unit ? ` por ${item.unit}` : ''}`}
                        />
                        <span className="w-28 shrink-0 text-right font-mono text-[11.5px] text-slate-400" title="Valor de la línea">
                          {(item.qty ?? 1) > 1 ? `${item.qty} × ` : ''}{money(item.price * (item.qty ?? 1), currency)}
                        </span>
                        {selectable && item.kind !== 'CORE' && (
                          <button
                            onClick={() => toggleSelectable(item.code)}
                            title={item.selectable === false
                              ? 'Fijo: el cliente no puede moverlo en la vista pública'
                              : 'Libre: el cliente puede prenderlo o apagarlo en la vista pública'}
                            className={`w-12 shrink-0 rounded-md border px-1 py-0.5 text-[9.5px] font-bold uppercase tracking-wide transition ${
                              item.selectable === false
                                ? 'border-slate-300 bg-slate-100 text-slate-500'
                                : 'border-indigo-200 bg-indigo-50 text-indigo-600'
                            }`}
                          >
                            {item.selectable === false ? 'Fijo' : 'Libre'}
                          </button>
                        )}
                        {item.kind === 'CORE' ? (
                          <button
                            onClick={() => patchItem(item.code, { kind: 'MODULE', on: true })}
                            className="w-11 shrink-0 text-center text-[10px] font-bold uppercase text-slate-400 hover:text-indigo-600"
                            title="Línea fija: siempre suma. Clic para volverla opcional."
                          >
                            Fijo
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleItem(item.code)}
                            className={`relative h-5 w-11 shrink-0 rounded-full transition ${item.on ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            aria-label={`${item.on ? 'Apagar' : 'Encender'} ${item.name}`}
                            title="Línea opcional. Doble clic sobre «Fijo» la vuelve obligatoria."
                          >
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${item.on ? 'left-6' : 'left-0.5'}`} />
                          </button>
                        )}
                        <button
                          onClick={() => removeItem(item.code)}
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                          title="Eliminar la línea"
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
                    <button
                      onClick={addItem}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
                    >
                      <Plus size={13} /> Añadir línea
                    </button>
                    <span className="font-mono text-[12px] font-bold text-slate-600">
                      Suma de las líneas · {money(totals.total, currency)}
                    </span>
                  </div>
                  <p className="border-t border-slate-100 px-4 py-2 text-[11.5px] leading-relaxed text-slate-400">
                    Los valores parten del catálogo y quedan guardados en esta cotización: editarlos aquí
                    no toca el catálogo ni las demás propuestas. El total se recalcula en el servidor.
                  </p>
                </div>
              </div>
            )}

            {tab === 'vista' && (
              <div className="flex h-full flex-col">
                <p className="mb-2 text-[12px] text-slate-400">
                  El documento tal como lo verá el cliente, con el editor con IA encima: señala un texto y pide el cambio,
                  o activa «Editar texto» y escribe directamente sobre el documento.{' '}
                  <a href={`${publicUrl}?editor=1`} target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 hover:underline">Abrir a pantalla completa ↗</a>
                </p>
                <iframe
                  key={quote.updatedAt}
                  src={`${publicUrl}?editor=1`}
                  title="Vista previa de la cotización"
                  className="min-h-[70vh] w-full flex-1 rounded-xl border border-slate-200 bg-white shadow-sm"
                />
              </div>
            )}

            {tab === 'contenido' && (
              <ContentEditor
                key={`${quote.id}-${editorRev}`}
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
                {/* Correo que recibe el destinatario */}
                <div className="rounded-2xl border border-slate-200 bg-white">
                  <button onClick={() => setEmailOpen((v) => !v)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
                    {emailOpen ? <ChevronDown size={14} className="text-indigo-500" /> : <ChevronRight size={14} className="text-slate-300" />}
                    <span className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Correo que recibe el destinatario</span>
                    <span className="ml-auto text-[11px] text-slate-400">{emailDirty ? 'Cambios sin guardar' : emailTpl ? 'Plantilla lista' : 'Cargando…'}</span>
                  </button>
                  {emailOpen && emailTpl && (
                    <div className="grid gap-4 border-t border-slate-100 p-4 lg:grid-cols-[minmax(260px,1fr)_minmax(300px,1.1fr)]">
                      <div className="space-y-2">
                        <p className="text-[12px] leading-relaxed text-slate-500">
                          Se arma desde la portada de la cotización (inversión, duración, alcance y si el cliente puede mover
                          líneas). Revísalo y edítalo aquí; lo que ves en la vista previa es lo que se envía.
                        </p>
                        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Asunto
                          <input value={emailTpl.subject} onChange={(e) => setTpl({ subject: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] font-normal normal-case tracking-normal" />
                        </label>
                        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Saludo <span className="font-normal normal-case tracking-normal text-slate-400">· {'{nombre}'} pone el nombre del destinatario</span>
                          <input value={emailTpl.greeting} onChange={(e) => setTpl({ greeting: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] font-normal normal-case tracking-normal" />
                        </label>
                        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Mensaje <span className="font-normal normal-case tracking-normal text-slate-400">· línea en blanco separa párrafos</span>
                          <textarea rows={5} value={emailTpl.intro} onChange={(e) => setTpl({ intro: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] font-normal normal-case tracking-normal" />
                        </label>
                        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Nota adicional (opcional)
                          <textarea rows={2} value={emailTpl.note} onChange={(e) => setTpl({ note: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] font-normal normal-case tracking-normal" />
                        </label>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                          <label className="flex items-center gap-2 text-[11.5px] font-semibold text-slate-600">
                            <input type="checkbox" checked={emailTpl.showStats} onChange={(e) => setTpl({ showStats: e.target.checked })} /> Mostrar las cifras
                          </label>
                          {emailTpl.showStats && emailTpl.stats.map((st, i) => (
                            <div key={i} className="mt-1.5 flex gap-1.5">
                              <input value={st.label} onChange={(e) => setTpl({ stats: emailTpl.stats.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} className="w-28 rounded-md border border-slate-300 px-2 py-1 text-[12px]" placeholder="Rótulo" />
                              <input value={st.value} onChange={(e) => setTpl({ stats: emailTpl.stats.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)) })} className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-[12px]" placeholder="Valor" />
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Botón
                            <input value={emailTpl.button} onChange={(e) => setTpl({ button: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] font-normal normal-case tracking-normal" />
                          </label>
                          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Texto bajo el botón
                            <input value={emailTpl.closing} onChange={(e) => setTpl({ closing: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] font-normal normal-case tracking-normal" />
                          </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button onClick={saveEmailTpl} disabled={!emailDirty || emailSaving}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-40">
                            {emailSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar plantilla
                          </button>
                          <button onClick={() => { if (emailDefaults) { setEmailTpl(emailDefaults); setEmailDirty(true) } }}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50">
                            Volver a la propuesta actual
                          </button>
                        </div>
                      </div>
                      <div className="min-h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-[#f0ede6]">
                        <iframe title="Vista previa del correo" srcDoc={emailHtml} sandbox="" className="h-[560px] w-full" />
                      </div>
                    </div>
                  )}
                </div>

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
        )}
      </div>
    </div>
  )
}
