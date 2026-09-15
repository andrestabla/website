/**
 * Cotizador — lista de cotizaciones y base de contexto.
 * Vive en /ecosistema/cotizador, con la estética del Ecosistema (slate/indigo).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, FileText, Eye, Copy, BookOpen, Trash2, UploadCloud, X, Loader2, CheckCircle2, CopyPlus,
  Search, SlidersHorizontal, ChevronDown,
} from 'lucide-react'
import { quotesApi, money, timeAgo, type QuoteListItem } from './api'
import { useDialogs } from './ui/dialogs'
import {
  LINES, LINE_LABEL, LINE_STYLE, STAGES, STAGE_EMPTY_LABEL, stageStyle,
  STATUS_LABEL, STATUS_STYLE, defaultLineFor, type QuoteLine,
} from './meta'

/** Espejo de QUOTE_TEMPLATES del servidor (api/_lib/quotes.ts). */
const TEMPLATES: Array<[string, string]> = [
  ['SOLUCIONES', 'Soluciones digitales'],
  ['TRANSFORMACION', 'Transformación digital'],
  ['CURSOS', 'Cursos virtuales'],
  ['FORMACION', 'Formación docente'],
  ['PROFETABLA', 'ProfeTabla'],
  ['LMS', 'Plataforma LMS'],
  ['ESTUDIO', 'Estudio de mercado'],
  ['PROGRAMAS', 'Programas académicos'],
  ['DOCUMENTO', 'Documento independiente'],
]
export const TEMPLATE_LABEL: Record<string, string> = Object.fromEntries(TEMPLATES)
const TEMPLATE_DESC: Record<string, string> = {
  SOLUCIONES: 'Plataformas y automatizaciones a la medida: núcleo + módulos con economía de escala.',
  TRANSFORMACION: 'Diagnóstico de madurez, mapeo de procesos, soluciones digitales y mejora continua (USD).',
  CURSOS: 'Cursos virtuales completos o por fases, y recursos educativos digitales por unidad.',
  FORMACION: 'Programas de formación docente con talleres, acompañamiento y certificación.',
  PROFETABLA: 'Experiencias de formación docente sobre ProfeTabla, por sesiones y rango de profesores.',
  LMS: 'Licencia anual del LMS: usuarios ilimitados, infraestructura y soporte N1–N4.',
  ESTUDIO: 'Estudios de mercado para nuevos programas: demanda, oferta, empleabilidad y pertinencia.',
  PROGRAMAS: 'Documento maestro, PEP y syllabus para registro calificado, con precio por nivel.',
  DOCUMENTO: 'Pieza diagramada aparte (HTML propio) con URL pública, métricas, destinatarios y estados — sin catálogo de módulos.',
}

type KnowledgeDoc = {
  id: string
  title: string
  kind: string
  sourceName: string | null
  summary: string | null
  charCount: number
  active: boolean
  updatedAt: string
}

const KIND_LABEL: Record<string, string> = {
  METHODOLOGY: 'Metodología',
  PRICING: 'Política de precios',
  CASE: 'Caso / antecedente',
  TERMS: 'Condiciones',
  BRAND: 'Tono de marca',
  REFERENCE: 'Referencia',
}

function KnowledgePanel({ onClose }: { onClose: () => void }) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const { confirm: confirmDlg, dialogs: knowledgeDialogs } = useDialogs()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('REFERENCE')
  const [text, setText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const payload = await quotesApi.knowledge.list()
      setDocs(payload.docs || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const createFromText = async () => {
    if (!title.trim() || !text.trim()) return
    setBusy(true); setError('')
    try {
      await quotesApi.knowledge.create({ title: title.trim(), kind, content: text })
      setTitle(''); setText('')
      await load()
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  const createFromFile = async (file: File) => {
    setBusy(true); setError('')
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
        reader.readAsDataURL(file)
      })
      await quotesApi.knowledge.create({
        title: title.trim() || file.name.replace(/\.[^.]+$/, ''),
        kind,
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type,
      })
      setTitle('')
      await load()
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      {knowledgeDialogs}
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-4 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight"><BookOpen size={18} className="text-indigo-600" /> Base de contexto</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <p className="mb-5 text-[13px] leading-relaxed text-slate-500">
          Estos documentos alimentan a la IA al construir cada cotización: metodología, condiciones,
          casos y tono de marca. Sube un .docx, .pdf o pega el texto.
        </p>

        <div className="mb-6 rounded-xl border border-slate-200 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del documento"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500">
              {Object.entries(KIND_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)} rows={4}
            placeholder="Pega aquí el texto…"
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={createFromText} disabled={busy || !title.trim() || !text.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Guardar texto
            </button>
            <button
              onClick={() => fileRef.current?.click()} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <UploadCloud size={14} /> Subir .docx / .pdf
            </button>
            <input
              ref={fileRef} type="file" accept=".docx,.pdf,.txt,.md" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void createFromFile(f); e.target.value = '' }}
            />
          </div>
          {error && <p className="mt-2 text-[13px] text-rose-600">{error}</p>}
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Cargando…</div>
        ) : docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-400">
            Aún no hay documentos. La IA trabajará solo con el catálogo.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-start gap-3 py-3">
                <FileText size={16} className={`mt-0.5 shrink-0 ${doc.active ? 'text-indigo-500' : 'text-slate-300'}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-800">{doc.title}</div>
                  <div className="text-[12px] text-slate-400">
                    {KIND_LABEL[doc.kind] || doc.kind} · {(doc.charCount / 1000).toFixed(1)}k caracteres · {timeAgo(doc.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={async () => { await quotesApi.knowledge.update(doc.id, { active: !doc.active }); await load() }}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${doc.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
                >
                  {doc.active ? 'Activo' : 'Inactivo'}
                </button>
                <button
                  onClick={async () => { if (await confirmDlg(`¿Eliminar «${doc.title}»?`, { title: 'Eliminar documento', okLabel: 'Eliminar', danger: true })) { await quotesApi.knowledge.remove(doc.id); await load() } }}
                  className="grid h-7 w-7 place-items-center rounded-full text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Selector de seguimiento comercial: píldora con el color del estado; select nativo (cómodo en móvil). */
export function StagePicker({ value, onChange, disabled, className = '' }: { value: string | null | undefined; onChange: (stage: string | null) => void; disabled?: boolean; className?: string }) {
  return (
    <span className={`relative inline-flex ${className}`} onClick={(e) => e.stopPropagation()}>
      <select
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label="Seguimiento comercial"
        title="Seguimiento comercial"
        className={`cursor-pointer appearance-none rounded-full border py-0.5 pl-2.5 pr-6 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-default disabled:opacity-60 ${stageStyle(value)}`}
      >
        <option value="">{STAGE_EMPTY_LABEL}</option>
        {STAGES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-60" />
    </span>
  )
}

function LineBadge({ line }: { line: string | null | undefined }) {
  if (!line || !LINE_LABEL[line]) return null
  return <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${LINE_STYLE[line]}`}>{LINE_LABEL[line]}</span>
}

type Filters = { line: string; stage: string; status: string; q: string }
const FILTER_KEYS: Record<keyof Filters, string> = { line: 'linea', stage: 'seg', status: 'estado', q: 'q' }
/** Valor del filtro de seguimiento para «sin estado» (null en la base). */
const STAGE_NONE = 'NONE'

function ChipGroup<T extends string>({ options, value, onChange, counts }: { options: Array<[T | '', string]>; value: string; onChange: (v: T | '') => void; counts?: Record<string, number> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([key, label]) => {
        const active = value === key
        const count = counts?.[key || 'ALL']
        return (
          <button
            key={key || 'ALL'}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition ${active ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >
            {label}
            {count !== undefined && <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function CotizadorList() {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState<QuoteListItem[]>([])
  const { confirm, dialogs } = useDialogs()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showKnowledge, setShowKnowledge] = useState(false)
  const [creating, setCreating] = useState(false)
  const [clientName, setClientName] = useState('')
  const [sector, setSector] = useState('')
  const [template, setTemplate] = useState('SOLUCIONES')
  // línea de negocio de la cotización nueva: sugerida por la plantilla hasta que se elija a mano
  const [pickedLine, setPickedLine] = useState<QuoteLine | ''>('')
  // plantillas propias (cotizaciones guardadas como punto de partida)
  const [ownTemplates, setOwnTemplates] = useState<Array<{ id: string; name: string; description?: string | null; template: string; updatedAt: string }>>([])
  const [fromTemplateId, setFromTemplateId] = useState('')
  useEffect(() => { quotesApi.templates.list().then((p) => setOwnTemplates(p.templates || [])).catch(() => undefined) }, [])
  const [copied, setCopied] = useState('')
  const [savingStage, setSavingStage] = useState('')

  const baseTemplate = fromTemplateId ? (ownTemplates.find((t) => t.id === fromTemplateId)?.template || template) : template
  const line: QuoteLine = pickedLine || defaultLineFor(baseTemplate)

  // filtros: viven en la URL para sobrevivir al entrar y volver de una cotización
  const [searchParams, setSearchParams] = useSearchParams()
  const filters: Filters = {
    line: searchParams.get(FILTER_KEYS.line) || '',
    stage: searchParams.get(FILTER_KEYS.stage) || '',
    status: searchParams.get(FILTER_KEYS.status) || '',
    q: searchParams.get(FILTER_KEYS.q) || '',
  }
  const setFilter = (key: keyof Filters, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(FILTER_KEYS[key], value); else next.delete(FILTER_KEYS[key])
    setSearchParams(next, { replace: true })
  }
  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true })
  const activeFilters = Number(!!filters.line) + Number(!!filters.stage) + Number(!!filters.status) + Number(!!filters.q)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const payload = await quotesApi.list()
      setQuotes(payload.quotes || [])
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const needle = filters.q.trim().toLowerCase()
  const matchesText = (q: QuoteListItem) =>
    !needle || [q.clientName, q.title, q.sector, q.ownerName, TEMPLATE_LABEL[q.template || '']].some((v) => (v || '').toLowerCase().includes(needle))
  const matchesLine = (q: QuoteListItem) => !filters.line || (q.line || '') === filters.line
  const matchesStage = (q: QuoteListItem) => !filters.stage || (filters.stage === STAGE_NONE ? !q.stage : q.stage === filters.stage)
  const matchesStatus = (q: QuoteListItem) => !filters.status || q.status === filters.status

  const filtered = useMemo(
    () => quotes.filter((q) => matchesText(q) && matchesLine(q) && matchesStage(q) && matchesStatus(q)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quotes, filters.line, filters.stage, filters.status, needle],
  )
  // conteos de cada chip: con los demás filtros aplicados, sin el propio
  const countBy = (list: QuoteListItem[], key: (q: QuoteListItem) => string) => {
    const out: Record<string, number> = { ALL: list.length }
    for (const q of list) { const k = key(q); out[k] = (out[k] || 0) + 1 }
    return out
  }
  const lineCounts = countBy(quotes.filter((q) => matchesText(q) && matchesStage(q) && matchesStatus(q)), (q) => q.line || 'SIN')
  const stageCounts = countBy(quotes.filter((q) => matchesText(q) && matchesLine(q) && matchesStatus(q)), (q) => q.stage || STAGE_NONE)
  const statusCounts = countBy(quotes.filter((q) => matchesText(q) && matchesLine(q) && matchesStage(q)), (q) => q.status)

  const create = async () => {
    if (!clientName.trim()) return
    setCreating(true); setError('')
    try {
      const base = { clientName: clientName.trim(), sector: sector.trim() || undefined, line }
      const payload = fromTemplateId
        ? await quotesApi.create({ ...base, fromTemplateId })
        : template === 'DOCUMENTO'
        ? await quotesApi.create({ ...base, documentUrl: '' })
        : await quotesApi.create({ ...base, template })
      navigate(`/ecosistema/cotizador/${payload.quote.id}`)
    } catch (e: any) { setError(e.message); setCreating(false) }
  }

  const copyLink = (quote: QuoteListItem) => {
    void navigator.clipboard.writeText(`${window.location.origin}/c/${quote.publicId}`)
    setCopied(quote.id)
    window.setTimeout(() => setCopied(''), 1600)
  }

  const duplicateQuote = async (quote: QuoteListItem) => {
    try {
      const payload = await quotesApi.duplicate(quote.id)
      navigate(`/ecosistema/cotizador/${payload.quote.id}`)
    } catch (e: any) { setError(e.message) }
  }

  const deleteQuote = async (quote: QuoteListItem) => {
    const ok = await confirm(
      `¿Eliminar la cotización de «${quote.clientName}»?\n\nSe borran su URL pública, sus destinatarios y todas sus métricas. Esta acción no se puede deshacer.`
    )
    if (!ok) return
    try {
      await quotesApi.remove(quote.id)
      setQuotes((prev) => prev.filter((q) => q.id !== quote.id))
    } catch (e: any) { setError(e.message) }
  }

  const setStage = async (quote: QuoteListItem, stage: string | null) => {
    setSavingStage(quote.id); setError('')
    try {
      const payload = await quotesApi.update(quote.id, { stage: stage ?? '' })
      setQuotes((prev) => prev.map((q) => (q.id === quote.id ? { ...q, stage: payload.quote?.stage ?? stage, stageAt: payload.quote?.stageAt ?? q.stageAt } : q)))
    } catch (e: any) { setError(e.message) } finally { setSavingStage('') }
  }

  const rowActions = (quote: QuoteListItem) => (
    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => copyLink(quote)}
        title="Copiar enlace público"
        aria-label="Copiar enlace público"
        className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600 md:h-8 md:w-8"
      >
        {copied === quote.id ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Copy size={15} />}
      </button>
      <button
        onClick={() => duplicateQuote(quote)}
        title="Duplicar cotización"
        aria-label="Duplicar cotización"
        className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600 md:h-8 md:w-8"
      >
        <CopyPlus size={15} />
      </button>
      <button
        onClick={() => deleteQuote(quote)}
        title="Eliminar cotización"
        aria-label="Eliminar cotización"
        className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 md:h-8 md:w-8"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )

  const templateBadge = (quote: QuoteListItem) => quote.template && quote.template !== 'SOLUCIONES' ? (
    <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-700">
      {TEMPLATE_LABEL[quote.template] ?? quote.template}
    </span>
  ) : null

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {dialogs}
      <header className="flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:gap-3 sm:px-6">
        <Link to="/ecosistema" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Ecosistema</span>
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <div className="truncate text-sm font-black tracking-tight">Cotizador <span className="text-indigo-600">Algoritmo T</span></div>
        <div className="flex-1" />
        <button
          onClick={() => setShowKnowledge(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 sm:px-3"
        >
          <BookOpen size={14} /> <span className="hidden sm:inline">Base de contexto</span>
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-2xl font-black tracking-tight">Cotizaciones</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cada cotización se construye conversando con la IA y genera una URL propia con métricas de lectura.
        </p>

        {/* Crear */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-6">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Línea de servicio (plantilla)</div>
          <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
            {TEMPLATES.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTemplate(key)}
                className={`rounded-lg border px-3 py-2 text-left text-[12.5px] font-semibold transition ${template === key && !fromTemplateId ? 'border-indigo-500 bg-indigo-50/70 text-indigo-700 ring-1 ring-indigo-500' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mb-3 text-[12px] text-slate-500">{TEMPLATE_DESC[template]}</p>
          {ownTemplates.length > 0 && (
            <div className="mb-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-2.5">
              <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-indigo-500">O parte de una plantilla propia</div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setFromTemplateId('')} className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold ${!fromTemplateId ? 'border-indigo-500 bg-white text-indigo-700' : 'border-slate-200 bg-white text-slate-500'}`}>Ninguna</button>
                {ownTemplates.map((t) => (
                  <span key={t.id} className="inline-flex items-center">
                    <button onClick={() => setFromTemplateId(t.id)} title={t.description || TEMPLATE_LABEL[t.template] || t.template}
                      className={`rounded-l-md border px-2.5 py-1 text-[12px] font-semibold ${fromTemplateId === t.id ? 'border-indigo-500 bg-white text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                      {t.name}
                    </button>
                    <button onClick={async () => { if (await confirm(`¿Eliminar la plantilla «${t.name}»?`, { title: 'Eliminar plantilla', okLabel: 'Eliminar', danger: true })) { try { await quotesApi.templates.remove(t.id); setOwnTemplates((prev) => prev.filter((x) => x.id !== t.id)); if (fromTemplateId === t.id) setFromTemplateId('') } catch (e) { setError((e as Error).message) } } }}
                      className="rounded-r-md border border-l-0 border-slate-200 bg-white px-1.5 py-1 text-[12px] text-slate-300 hover:text-rose-600" title="Eliminar plantilla" aria-label={`Eliminar plantilla ${t.name}`}>×</button>
                  </span>
                ))}
              </div>
              {fromTemplateId && <p className="mt-1.5 text-[11.5px] text-indigo-700">La cotización nueva copia las páginas, líneas y ajustes de la plantilla; la línea de servicio la define la plantilla.</p>}
            </div>
          )}

          {/* Línea de negocio */}
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Línea de negocio</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="radiogroup" aria-label="Línea de negocio">
              {LINES.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={line === key}
                  onClick={() => setPickedLine(key)}
                  className={`rounded-md px-3 py-1 text-[12px] font-semibold transition ${line === key ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400">
              {pickedLine ? <button type="button" onClick={() => setPickedLine('')} className="font-semibold text-indigo-600 hover:underline">Volver a la sugerida</button> : 'Sugerida por la plantilla · se puede cambiar luego'}
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_auto]">
            <input
              value={clientName} onChange={(e) => setClientName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void create() }}
              placeholder="Nombre del cliente (p. ej. Ediciones de la U)"
              className="min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 sm:py-2"
            />
            <input
              value={sector} onChange={(e) => setSector(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void create() }}
              placeholder="Sector (opcional)"
              className="min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 sm:py-2"
            />
            <button
              onClick={create} disabled={creating || !clientName.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40 sm:py-2"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Nueva cotización
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        {/* Filtros */}
        {!loading && quotes.length > 0 && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm sm:mt-6">
            <div className="flex items-center gap-2 p-3">
              <label className="relative min-w-0 flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={filters.q}
                  onChange={(e) => setFilter('q', e.target.value)}
                  placeholder="Buscar por cliente, título, sector…"
                  aria-label="Buscar cotizaciones"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
                />
              </label>
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                aria-label={activeFilters ? `Filtros (${activeFilters} activos)` : 'Filtros'}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold ${activeFilters ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                <SlidersHorizontal size={14} />
                <span className="hidden sm:inline">Filtros</span>
                {activeFilters > 0 && <span className="rounded-full bg-indigo-600 px-1.5 text-[10.5px] font-bold text-white">{activeFilters}</span>}
                <ChevronDown size={13} className={`transition ${filtersOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {filtersOpen && (
              <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-x-4">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Línea</span>
                <ChipGroup
                  options={[['', 'Todas'], ...LINES]}
                  value={filters.line}
                  onChange={(v) => setFilter('line', v)}
                  counts={lineCounts}
                />
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Seguimiento</span>
                <ChipGroup
                  options={[['', 'Todos'], [STAGE_NONE, STAGE_EMPTY_LABEL], ...STAGES]}
                  value={filters.stage}
                  onChange={(v) => setFilter('stage', v)}
                  counts={stageCounts}
                />
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Publicación</span>
                <ChipGroup
                  options={[['', 'Todas'], ['DRAFT', STATUS_LABEL.DRAFT], ['PUBLISHED', STATUS_LABEL.PUBLISHED], ['ARCHIVED', STATUS_LABEL.ARCHIVED]]}
                  value={filters.status}
                  onChange={(v) => setFilter('status', v)}
                  counts={statusCounts}
                />
              </div>
            )}
            {(activeFilters > 0 || filtersOpen) && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-2 text-[12px] text-slate-500">
                <span>{filtered.length === quotes.length ? `${quotes.length} cotizaciones` : `${filtered.length} de ${quotes.length} cotizaciones`}</span>
                {activeFilters > 0 && (
                  <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline">
                    <X size={12} /> Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">Cargando cotizaciones…</div>
        ) : quotes.length === 0 ? (
          <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-slate-300 py-16 text-center">
            <div>
              <FileText size={28} className="mx-auto text-slate-300" />
              <div className="mt-2 text-sm font-semibold text-slate-500">Todavía no hay cotizaciones</div>
              <div className="text-[13px] text-slate-400">Crea la primera con el nombre del cliente.</div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-slate-300 py-12 text-center">
            <div>
              <Search size={26} className="mx-auto text-slate-300" />
              <div className="mt-2 text-sm font-semibold text-slate-500">Ninguna cotización coincide con los filtros</div>
              <button type="button" onClick={clearFilters} className="mt-1 text-[13px] font-semibold text-indigo-600 hover:underline">Limpiar filtros</button>
            </div>
          </div>
        ) : (
          <>
            {/* Móvil: tarjetas */}
            <ul className="mt-4 space-y-2.5 md:hidden">
              {filtered.map((quote) => (
                <li
                  key={quote.id}
                  onClick={() => navigate(`/ecosistema/cotizador/${quote.id}`)}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:bg-indigo-50/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-800">{quote.clientName}</div>
                      <div className="truncate text-[12px] text-slate-400">{quote.title}{quote.ownerName ? ` · por ${quote.ownerName}` : ''}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-[13px] font-bold text-slate-800">{money(quote.totalFinal, quote.currency)}</div>
                      <div className="text-[11px] text-slate-400"><Eye size={11} className="inline -mt-0.5" /> {quote.views}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <StagePicker value={quote.stage} disabled={savingStage === quote.id} onChange={(stage) => void setStage(quote, stage)} />
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[quote.status]}`}>{STATUS_LABEL[quote.status]}</span>
                    <LineBadge line={quote.line} />
                    {templateBadge(quote)}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11.5px] text-slate-400">
                    <span>Actualizada {timeAgo(quote.updatedAt)}</span>
                    {rowActions(quote)}
                  </div>
                </li>
              ))}
            </ul>

            {/* Escritorio: tabla */}
            <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[12px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Seguimiento</th>
                    <th className="px-4 py-3 font-semibold">Publicación</th>
                    <th className="px-4 py-3 text-right font-semibold">Inversión</th>
                    <th className="px-4 py-3 text-center font-semibold"><Eye size={13} className="inline" aria-label="Vistas" /></th>
                    <th className="hidden px-4 py-3 font-semibold lg:table-cell">Actualizada</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((quote) => (
                    <tr
                      key={quote.id}
                      className="cursor-pointer transition hover:bg-indigo-50/40"
                      onClick={() => navigate(`/ecosistema/cotizador/${quote.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-800">
                          {quote.clientName}
                          <LineBadge line={quote.line} />
                          {templateBadge(quote)}
                        </div>
                        <div className="max-w-[320px] truncate text-[12px] text-slate-400">
                          {quote.title}
                          {quote.ownerName ? ` · por ${quote.ownerName}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StagePicker value={quote.stage} disabled={savingStage === quote.id} onChange={(stage) => void setStage(quote, stage)} />
                        {quote.stage && quote.stageAt && <div className="mt-0.5 text-[10.5px] text-slate-400">{timeAgo(quote.stageAt)}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[quote.status]}`}>
                          {STATUS_LABEL[quote.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] font-semibold text-slate-800">
                        {money(quote.totalFinal, quote.currency)}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-600">{quote.views}</td>
                      <td className="hidden px-4 py-3 text-[12px] text-slate-400 lg:table-cell">{timeAgo(quote.updatedAt)}</td>
                      <td className="px-4 py-3">{rowActions(quote)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {showKnowledge && <KnowledgePanel onClose={() => setShowKnowledge(false)} />}
    </div>
  )
}
