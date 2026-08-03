/**
 * Cotizador — lista de cotizaciones y base de contexto.
 * Vive en /ecosistema/cotizador, con la estética del Ecosistema (slate/indigo).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, FileText, Eye, Copy, BookOpen, Trash2, UploadCloud, X, Loader2, CheckCircle2,
} from 'lucide-react'
import { quotesApi, money, timeAgo, type QuoteListItem } from './api'

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ARCHIVED: 'bg-slate-100 text-slate-500 border-slate-200',
}
const STATUS_LABEL: Record<string, string> = { DRAFT: 'Borrador', PUBLISHED: 'Publicada', ARCHIVED: 'Archivada' }

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
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
                  onClick={async () => { if (confirm(`¿Eliminar «${doc.title}»?`)) { await quotesApi.knowledge.remove(doc.id); await load() } }}
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

export function CotizadorList() {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState<QuoteListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showKnowledge, setShowKnowledge] = useState(false)
  const [creating, setCreating] = useState(false)
  const [clientName, setClientName] = useState('')
  const [sector, setSector] = useState('')
  const [template, setTemplate] = useState<'PRODUCTO' | 'SERVICIO'>('PRODUCTO')
  const [copied, setCopied] = useState('')

  const load = useCallback(async () => {
    try {
      const payload = await quotesApi.list()
      setQuotes(payload.quotes || [])
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const create = async () => {
    if (!clientName.trim()) return
    setCreating(true); setError('')
    try {
      const payload = await quotesApi.create({ clientName: clientName.trim(), sector: sector.trim() || undefined, template })
      navigate(`/ecosistema/cotizador/${payload.quote.id}`)
    } catch (e: any) { setError(e.message); setCreating(false) }
  }

  const copyLink = (quote: QuoteListItem) => {
    void navigator.clipboard.writeText(`${window.location.origin}/c/${quote.publicId}`)
    setCopied(quote.id)
    window.setTimeout(() => setCopied(''), 1600)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
        <Link to="/ecosistema" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={16} /> Ecosistema
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <div className="text-sm font-black tracking-tight">Cotizador <span className="text-indigo-600">Algoritmo T</span></div>
        <div className="flex-1" />
        <button
          onClick={() => setShowKnowledge(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
        >
          <BookOpen size={14} /> Base de contexto
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-black tracking-tight">Cotizaciones</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cada cotización se construye conversando con la IA y genera una URL propia con métricas de lectura.
        </p>

        {/* Crear */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap gap-2">
            {([
              ['PRODUCTO', 'Producto · Plataforma a la medida', 'Núcleo + módulos activables con economía de escala.'],
              ['SERVICIO', 'Servicio · Proyectos y producción', 'Líneas por unidad (cursos, recursos, estudios) con cantidades.'],
            ] as const).map(([key, label, desc]) => (
              <button
                key={key}
                onClick={() => setTemplate(key)}
                className={`flex-1 min-w-[240px] rounded-xl border px-4 py-3 text-left transition ${template === key ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className={`text-[13px] font-bold ${template === key ? 'text-indigo-700' : 'text-slate-700'}`}>{label}</div>
                <div className="mt-0.5 text-[12px] text-slate-500">{desc}</div>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <input
            value={clientName} onChange={(e) => setClientName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void create() }}
            placeholder="Nombre del cliente (p. ej. Ediciones de la U)"
            className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <input
            value={sector} onChange={(e) => setSector(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void create() }}
            placeholder="Sector (opcional)"
            className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button
            onClick={create} disabled={creating || !clientName.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40"
          >
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Nueva cotización
          </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

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
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[12px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Inversión</th>
                  <th className="hidden px-4 py-3 text-center font-semibold sm:table-cell">Módulos</th>
                  <th className="px-4 py-3 text-center font-semibold"><Eye size={13} className="inline" /></th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Actualizada</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="cursor-pointer transition hover:bg-indigo-50/40"
                    onClick={() => navigate(`/ecosistema/cotizador/${quote.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        {quote.clientName}
                        {quote.template === 'SERVICIO' && (
                          <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-700">Servicio</span>
                        )}
                      </div>
                      <div className="max-w-[280px] truncate text-[12px] text-slate-400">
                        {quote.title}
                        {quote.ownerName ? ` · por ${quote.ownerName}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[quote.status]}`}>
                        {STATUS_LABEL[quote.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[13px] font-semibold text-slate-800">
                      {money(quote.totalFinal, quote.currency)}
                    </td>
                    <td className="hidden px-4 py-3 text-center text-slate-500 sm:table-cell">{quote.moduleCount}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-600">{quote.views}</td>
                    <td className="hidden px-4 py-3 text-[12px] text-slate-400 md:table-cell">{timeAgo(quote.updatedAt)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => copyLink(quote)}
                        title="Copiar enlace público"
                        className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                      >
                        {copied === quote.id ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Copy size={15} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showKnowledge && <KnowledgePanel onClose={() => setShowKnowledge(false)} />}
    </div>
  )
}
