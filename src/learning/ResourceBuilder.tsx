/**
 * Learning Builder — builder de un recurso: los insumos y el asistente a la
 * izquierda, el guion vivo a la derecha (edición, vista previa, revisión y
 * entrega). Misma disposición que el builder del Cotizador, porque es el mismo
 * gesto de trabajo: conversar con la IA mientras la pieza se arma al lado.
 *
 * Lo que se ve depende del rol en el workspace: un invitado solo recibe la
 * vista previa de lo publicado, y la API aplica la misma regla.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, Loader2, ExternalLink, Copy, CheckCircle2, Globe, EyeOff, FileText, Eye,
  Trash2, MoreVertical, CopyPlus, Archive, Paperclip, X, Package, Download, ShieldCheck, AlertTriangle,
  PanelLeft, PanelRight, MessageSquare, RotateCcw, History, Check, Lock, Code2, RefreshCw,
} from 'lucide-react'
import { useDialogs } from '../cotizador/ui/dialogs'
import type { LbIssue } from './lib/blocks'
import { aiWritesFor, familyOf, validateResourceContent, type LbResourceContent } from './lib/content'
import type { LbInteractiveContent } from './lib/interactive'
import type { LbMirrorContent } from './lib/mirror'
import type { LbPodcastContent } from './lib/podcast'
import type { LbRouteContent } from './lib/route'
import type { LbVideoContent } from './lib/video'
import type { LbContent } from './lib/blocks'
import type { LbDirectives } from './lib/directives'
import { LB_ROLE_LABEL, LB_ROLE_STYLE, can, type LbRole } from './lib/roles'
import {
  kindSpec, LB_SHARE_HINT, LB_SHARE_LABEL, LB_SHARE_MODES, LB_STATUS_LABEL, LB_STATUS_STYLE,
  type LbShareMode,
} from './lib/resources'
import {
  learningApi, readAsDataUrl, timeAgo,
  type ResourceDetail, type SourceRow, type VersionRow,
} from './lib/api'
import { GuionEditor } from './editor/GuionEditor'
import { MirrorEditor } from './editor/MirrorEditor'
import { PodcastEditor } from './editor/PodcastEditor'
import { RouteEditor } from './editor/RouteEditor'
import { SceneEditor } from './editor/SceneEditor'
import { VideoEditor } from './editor/VideoEditor'
import { CommentsPanel } from './CommentsPanel'
import type { CommentRow } from './lib/api'

type Tab = 'guion' | 'ficha' | 'vista' | 'comentarios' | 'revision' | 'entrega'
type Layout = 'both' | 'chat' | 'panel'

const LAYOUT_KEY = 'learning:layout'
const AUTOSAVE_MS = 1200
const SOURCE_ACCEPT = '.docx,.pdf,.md,.markdown,.txt,.html,.htm'
const SOURCE_MAX_BYTES = 3.5 * 1024 * 1024

const readLayout = (): Layout => {
  try {
    const value = localStorage.getItem(LAYOUT_KEY)
    return value === 'chat' || value === 'panel' ? value : 'both'
  } catch { return 'both' }
}

function useDesktop() {
  const query = '(min-width: 1024px)'
  const [desktop, setDesktop] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : true))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return desktop
}

export function ResourceBuilder() {
  const { workspaceCode = '', resourceCode = '' } = useParams()
  // La URL trae el código legible; el id interno llega con el recurso.
  const [resourceId, setResourceId] = useState('')
  const navigate = useNavigate()
  const desktop = useDesktop()
  const { confirm, dialogs } = useDialogs()
  const fileRef = useRef<HTMLInputElement>(null)

  const [resource, setResource] = useState<ResourceDetail | null>(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [directives, setDirectives] = useState<LbDirectives | null>(null)
  const [role, setRole] = useState<LbRole | null>(null)
  const [content, setContent] = useState<LbResourceContent | null>(null)
  const [issues, setIssues] = useState<LbIssue[]>([])
  const [sources, setSources] = useState<SourceRow[]>([])
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [focusAnchor, setFocusAnchor] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('guion')
  const [layout, setLayout] = useState<Layout>(readLayout)
  const [mobilePane, setMobilePane] = useState<'chat' | 'panel'>('panel')
  const [previewNonce, setPreviewNonce] = useState(0)

  const [instruction, setInstruction] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiLog, setAiLog] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([])
  const [proposal, setProposal] = useState<LbContent | null>(null)

  const dirty = useRef(false)
  const timer = useRef<number | null>(null)

  const editable = can(role, 'resource.edit')
  const maySeeComments = can(role, 'comment.view')

  const loadComments = useCallback(async (id: string) => {
    if (!id) return
    try {
      const payload = await learningApi.comments.list(id)
      setComments(payload.comments || [])
    } catch {
      // La revisión es accesoria: si falla, el builder sigue funcionando.
    }
  }, [])

  /** Recarga los hilos del recurso ya abierto; la usa el panel de revisión. */
  const reloadComments = useCallback(() => loadComments(resourceId), [loadComments, resourceId])

  const load = useCallback(async () => {
    try {
      const payload = await learningApi.resources.get(resourceCode)
      setResourceId(payload.resource.id)
      setResource(payload.resource)
      setWorkspaceName(payload.workspace.name)
      setDirectives(payload.directives)
      setRole(payload.role)
      setContent(payload.resource.content)
      setIssues(payload.issues || [])
      setShareCode(payload.shareCode)
      const ready = kindSpec(payload.resource.kind)?.available !== false
      if (!ready) setTab('ficha')
      else if (!can(payload.role, 'resource.edit')) setTab(can(payload.role, 'comment.view') ? 'comentarios' : 'vista')
      if (can(payload.role, 'sources.manage')) {
        const sourcesPayload = await learningApi.sources.list(payload.resource.id)
        setSources(sourcesPayload.sources || [])
      }
      if (can(payload.role, 'comment.view')) await loadComments(payload.resource.id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [resourceCode, loadComments])
  useEffect(() => { void load() }, [load])

  useEffect(() => { try { localStorage.setItem(LAYOUT_KEY, layout) } catch { /* sin persistencia */ } }, [layout])

  const save = useCallback(
    async (next: LbResourceContent) => {
      setSaving('saving')
      try {
        const payload = await learningApi.resources.update(resourceId, { content: next })
        setIssues(payload.issues || [])
        setResource((prev) => (prev ? { ...prev, ...payload.resource, content: next } : prev))
        setSaving('saved')
        setPreviewNonce((value) => value + 1)
        dirty.current = false
        window.setTimeout(() => setSaving((state) => (state === 'saved' ? 'idle' : state)), 2000)
      } catch (e: any) {
        setError(e.message)
        setSaving('idle')
      }
    },
    [resourceId]
  )

  /** El guion se guarda solo: se acumulan las pulsaciones y se envía una vez. */
  const onContentChange = useCallback(
    (next: LbResourceContent) => {
      setContent(next)
      dirty.current = true
      if (directives && resource) setIssues(validateResourceContent(resource.kind, next, directives))
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void save(next), AUTOSAVE_MS)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [directives, resource?.kind, save]
  )

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty.current) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const flush = useCallback(async () => {
    if (!dirty.current || !content) return
    if (timer.current) window.clearTimeout(timer.current)
    await save(content)
  }, [content, save])

  const openThreads = useMemo(
    () => comments.filter((comment) => !comment.parentId && comment.status === 'OPEN').length,
    [comments]
  )
  /** Cuántos hilos tiene cada pieza, para pintar el globo junto al bloque. */
  const commentsByAnchor = useMemo(() => {
    const map = new Map<string, { total: number; open: number }>()
    for (const comment of comments) {
      if (comment.parentId) continue
      const entry = map.get(comment.anchor) || { total: 0, open: 0 }
      entry.total += 1
      if (comment.status === 'OPEN') entry.open += 1
      map.set(comment.anchor, entry)
    }
    return map
  }, [comments])

  const errors = useMemo(() => issues.filter((issue) => issue.level === 'error'), [issues])
  const warnings = useMemo(() => issues.filter((issue) => issue.level === 'warning'), [issues])
  const published = resource?.status === 'PUBLISHED'
  const publicUrl = resource ? `${window.location.origin}${learningApi.publicUrl(resource.publicId)}` : ''

  const copy = (value: string, key: string) => {
    void navigator.clipboard.writeText(value)
    setCopied(key)
    window.setTimeout(() => setCopied(''), 1600)
  }

  // ── Acciones ──
  const togglePublish = async () => {
    if (!resource) return
    await flush()
    setBusy('publish'); setError('')
    try {
      const payload = published
        ? await learningApi.resources.unpublish(resource.id)
        : await learningApi.resources.publish(resource.id)
      setResource((prev) => (prev ? { ...prev, ...payload.resource } : prev))
      if (payload.issues) setIssues(payload.issues)
    } catch (e: any) {
      setError(e.message)
      if (e.issues) { setIssues(e.issues); setTab('revision') }
    } finally { setBusy('') }
  }

  const setShare = async (mode: LbShareMode, options: { embedEnabled?: boolean; rotateCode?: boolean } = {}) => {
    if (!resource) return
    setBusy('share'); setError('')
    try {
      const payload = await learningApi.resources.share(resource.id, {
        mode,
        embedEnabled: options.embedEnabled ?? resource.embedEnabled,
        rotateCode: options.rotateCode,
      })
      setResource((prev) => (prev ? { ...prev, ...payload.resource } : prev))
      setShareCode(payload.shareCode)
    } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  const duplicate = async () => {
    if (!resource) return
    await flush()
    try {
      const payload = await learningApi.resources.duplicate(resource.id)
      navigate(`/ecosistema/learning/${payload.resource.workspaceCode}/${payload.resource.code}`)
    } catch (e: any) { setError(e.message) }
  }

  const archive = async () => {
    if (!resource) return
    setMenuOpen(false)
    try {
      const payload = await learningApi.resources.archive(resource.id)
      setResource((prev) => (prev ? { ...prev, ...payload.resource } : prev))
    } catch (e: any) { setError(e.message) }
  }

  const remove = async () => {
    if (!resource) return
    setMenuOpen(false)
    const ok = await confirm(`¿Eliminar «${resource.title}»?\n\nSe borran su guion, sus versiones, sus insumos y su enlace. No se puede deshacer.`)
    if (!ok) return
    try {
      await learningApi.resources.remove(resource.id)
      navigate(`/ecosistema/learning/${workspaceCode}`)
    } catch (e: any) { setError(e.message) }
  }

  const loadVersions = async () => {
    try {
      const payload = await learningApi.resources.versions(resourceId)
      setVersions(payload.versions || [])
    } catch (e: any) { setError(e.message) }
  }

  const restore = async (versionId: string) => {
    const ok = await confirm('¿Restaurar esta versión?\n\nEl guion actual se guarda antes, así que puedes volver.')
    if (!ok) return
    try {
      const payload = await learningApi.resources.restore(resourceId, versionId)
      setContent(payload.content)
      setIssues(payload.issues || [])
      setPreviewNonce((value) => value + 1)
    } catch (e: any) { setError(e.message) }
  }

  // ── Insumos ──
  const uploadSource = async (file: File) => {
    if (file.size > SOURCE_MAX_BYTES) { setError(`«${file.name}» supera 3,5 MB`); return }
    setBusy('source'); setError('')
    try {
      const base64 = await readAsDataUrl(file)
      const payload = await learningApi.sources.upload(resourceId, { fileBase64: base64, fileName: file.name, mimeType: file.type })
      setSources((prev) => [payload.source, ...prev])
    } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  const removeSource = async (id: string) => {
    try {
      await learningApi.sources.remove(resourceId, id)
      setSources((prev) => prev.filter((source) => source.id !== id))
    } catch (e: any) { setError(e.message) }
  }

  // ── IA ──
  const askAi = async (mode: 'draft' | 'revise') => {
    if (mode === 'draft' && !sources.length) { setError('Sube al menos un insumo antes de pedir el guion'); return }
    if (mode === 'revise' && !instruction.trim()) return
    await flush()
    const asked = instruction.trim() || 'Escribe el guion completo a partir de los insumos.'
    setAiLog((prev) => [...prev, { role: 'user', text: asked }])
    setInstruction('')
    setAiBusy(true); setError('')
    try {
      const payload = mode === 'draft'
        ? await learningApi.ai.draft(resourceId, sources.map((source) => source.id), asked)
        : await learningApi.ai.revise(resourceId, asked)
      setProposal(payload.content)
      const lessons = payload.content.lessons.length
      const blocks = payload.content.lessons.reduce((total, lesson) => total + lesson.blocks.length, 0)
      const label = directives?.instructional.lessonLabel.toLowerCase() || 'lección'
      setAiLog((prev) => [...prev, {
        role: 'assistant',
        text: `Propuesta lista: ${lessons} ${label}(es) y ${blocks} bloques. Revísala y decide si la aplicas.`,
      }])
    } catch (e: any) {
      setError(e.message)
      setAiLog((prev) => [...prev, { role: 'assistant', text: `No pude completarlo: ${e.message}` }])
    } finally { setAiBusy(false) }
  }

  const applyProposal = () => {
    if (!proposal) return
    onContentChange(proposal)
    setProposal(null)
    setTab('guion')
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Abriendo el recurso…</div>
      </div>
    )
  }
  if (!resource || !directives || !content || !role) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
        <div>
          <div className="text-sm font-semibold text-slate-600">{error || 'No se pudo abrir este recurso.'}</div>
          <Link to={`/ecosistema/learning/${workspaceCode}`} className="mt-3 inline-block text-[13px] font-bold text-indigo-600 hover:underline">
            Volver a la metabiblioteca
          </Link>
        </div>
      </div>
    )
  }

  const spec = kindSpec(resource.kind)
  // Hay tipos cuyo editor todavía no existe. En vez de abrirles el editor de
  // bloques —que no les corresponde— se muestra su ficha y se dice qué falta.
  const kindReady = spec.available
  // El asistente escribe guiones de bloques; en los demás formatos todavía no ayuda.
  const showChat = editable && kindReady && aiWritesFor(resource.kind) && (desktop ? layout !== 'panel' : mobilePane === 'chat')
  const showPanel = !showChat || (desktop ? layout !== 'chat' : mobilePane === 'panel')
  const toggleColumn = (column: 'chat' | 'panel') => {
    setLayout((prev) => {
      if (prev === 'both') return column === 'chat' ? 'panel' : 'chat'
      return 'both'
    })
  }
  const tabs: Array<[Tab, string, any]> = !kindReady
    ? [
        ['ficha', 'Ficha', FileText],
        ...(maySeeComments ? ([['comentarios', 'Comentarios', MessageSquare]] as Array<[Tab, string, any]>) : []),
      ]
    : editable
    ? [
        ['guion', 'Guion', FileText],
        ['vista', 'Vista previa', Eye],
        ...(maySeeComments ? ([['comentarios', 'Comentarios', MessageSquare]] as Array<[Tab, string, any]>) : []),
        ['revision', 'Revisión', ShieldCheck],
        ['entrega', 'Entrega', Package],
      ]
    : maySeeComments
    ? [['comentarios', 'Comentarios', MessageSquare], ['vista', 'Vista previa', Eye]]
    : [['vista', 'Vista previa', Eye]]

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {dialogs}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:gap-3 sm:px-6">
        <Link to={`/ecosistema/learning/${workspaceCode}`} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600" aria-label="Volver a la metabiblioteca">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Biblioteca</span>
        </Link>
        <div className="h-5 w-px shrink-0 bg-slate-200" />
        <div className="min-w-0 flex-1 sm:flex-none">
          <div className="truncate text-sm font-black tracking-tight">{resource.title}</div>
          <div className="truncate text-[11px] text-slate-400">
            <span className="font-mono">{resource.code}</span> · {workspaceName} · {spec.short}
            {resource.course ? ` · ${resource.course}` : ''}
          </div>
        </div>
        <span className={`ml-1 hidden shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold sm:inline-flex ${LB_STATUS_STYLE[resource.status]}`}>
          {LB_STATUS_LABEL[resource.status]}
        </span>
        <span className={`hidden shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold lg:inline-flex ${LB_ROLE_STYLE[role]}`}>
          {LB_ROLE_LABEL[role]}
        </span>
        {editable && (
          <span className="hidden shrink-0 text-[11.5px] text-slate-400 md:inline">
            {saving === 'saving' ? 'Guardando…' : saving === 'saved' ? 'Guardado' : `Editado ${timeAgo(resource.updatedAt)}`}
          </span>
        )}
        {editable && errors.length > 0 && (
          <button
            onClick={() => { setTab('revision'); setMobilePane('panel') }}
            className="hidden shrink-0 items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 md:inline-flex"
          >
            <AlertTriangle size={12} /> {errors.length} por corregir
          </button>
        )}

        <div className="hidden flex-1 sm:block" />

        {editable && (
          <div className="mr-1 hidden items-center gap-0.5 rounded-lg border border-slate-200 p-0.5 lg:flex" title="Mostrar u ocultar columnas">
            <button
              onClick={() => toggleColumn('chat')}
              className={`grid h-7 w-7 place-items-center rounded-md ${layout !== 'panel' ? 'bg-slate-100 text-slate-700' : 'text-slate-300 hover:text-slate-600'}`}
              aria-label="Asistente"
            >
              <PanelLeft size={15} />
            </button>
            <button
              onClick={() => toggleColumn('panel')}
              className={`grid h-7 w-7 place-items-center rounded-md ${layout !== 'chat' ? 'bg-slate-100 text-slate-700' : 'text-slate-300 hover:text-slate-600'}`}
              aria-label="Guion"
            >
              <PanelRight size={15} />
            </button>
          </div>
        )}

        {resource.shareMode !== 'OFF' && (
          <>
            <button onClick={() => copy(publicUrl, 'link')} className="hidden items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 sm:inline-flex">
              {copied === 'link' ? <CheckCircle2 size={14} className="text-emerald-600" /> : resource.shareMode === 'CODE' ? <Lock size={14} /> : <Copy size={14} />} Enlace
            </button>
            <a href={learningApi.publicUrl(resource.publicId)} target="_blank" rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 sm:px-3">
              <ExternalLink size={14} /> <span className="hidden sm:inline">Ver</span>
            </a>
          </>
        )}
        {can(role, 'resource.publish') && kindReady && (
          <button
            onClick={togglePublish}
            disabled={busy === 'publish'}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-bold shadow-sm disabled:opacity-50 sm:px-3.5 ${
              published ? 'border border-slate-300 text-slate-600 hover:bg-slate-100' : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {busy === 'publish' ? <Loader2 size={14} className="animate-spin" /> : published ? <EyeOff size={14} /> : <Globe size={14} />}
            <span className="hidden sm:inline">{published ? 'Despublicar' : 'Publicar'}</span>
          </button>
        )}
        {editable && (
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Más acciones">
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-9 z-20 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button onClick={() => { setTab('entrega'); void loadVersions(); setMenuOpen(false) }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50">
                    <Package size={14} className="text-slate-400" /> Entrega y compartir
                  </button>
                  {can(role, 'resource.create') && (
                    <button onClick={duplicate} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50">
                      <CopyPlus size={14} className="text-slate-400" /> Duplicar recurso
                    </button>
                  )}
                  {can(role, 'resource.publish') && (
                    <button onClick={archive} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50">
                      <Archive size={14} className="text-slate-400" /> {resource.status === 'ARCHIVED' ? 'Reactivar (borrador)' : 'Archivar'}
                    </button>
                  )}
                  {can(role, 'resource.delete') && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button onClick={remove} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-50">
                        <Trash2 size={14} /> Eliminar…
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {error && (
        <div className="flex items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-4 py-2 text-[13px] text-rose-700 sm:px-6">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Cerrar aviso"><X size={14} /></button>
        </div>
      )}

      {!desktop && editable && (
        <div className="flex shrink-0 gap-1 border-b border-slate-200 bg-white px-3 py-1.5" role="tablist">
          {([['chat', 'Asistente', MessageSquare], ['panel', 'Guion', FileText]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              role="tab"
              aria-selected={mobilePane === key}
              onClick={() => setMobilePane(key)}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-semibold transition ${
                mobilePane === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      )}

      <div
        className="grid w-full flex-1"
        style={{ gridTemplateColumns: desktop && showChat && showPanel ? '400px minmax(0, 1fr)' : 'minmax(0, 1fr)' }}
      >
        {showChat && (
          <section className="flex min-h-[50vh] flex-col border-r border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center gap-2 text-[13px] font-bold text-slate-700">
                <Paperclip size={14} className="text-slate-400" /> Insumos del experto disciplinar
              </div>
              <p className="mt-1 text-[12px] leading-snug text-slate-500">
                De aquí sale el contenido. La IA no inventa: reorganiza lo que subas según las directivas de {workspaceName}.
              </p>
              <div className="mt-3 space-y-1.5">
                {sources.map((source) => (
                  <div key={source.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px]">
                    <FileText size={13} className="shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate">{source.name}</span>
                    <span className="shrink-0 text-[11px] text-slate-400">{Math.round(source.charCount / 1000)}k</span>
                    <button onClick={() => removeSource(source.id)} className="shrink-0 text-slate-300 hover:text-rose-600" aria-label="Quitar insumo">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept={SOURCE_ACCEPT}
                className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadSource(file); e.target.value = '' }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy === 'source'}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-[12.5px] font-semibold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50"
              >
                {busy === 'source' ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />} Subir DOCX, PDF o texto
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {aiLog.length === 0 && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-indigo-700"><Sparkles size={15} /> Construyamos el recurso</div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
                    Sube los documentos del experto y pide el guion. La propuesta respeta los bloques habilitados de {workspaceName}
                    {directives.instructional.sections.length
                      ? ` y sus secciones obligatorias (${directives.instructional.sections.filter((s) => s.required).map((s) => s.title).join(', ')})`
                      : ''}.
                  </p>
                  <button
                    onClick={() => askAi('draft')}
                    disabled={aiBusy || !sources.length}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[12.5px] font-bold text-white disabled:opacity-50"
                  >
                    {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Proponer el guion completo
                  </button>
                </div>
              )}
              {aiLog.map((entry, index) => (
                <div
                  key={index}
                  className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    entry.role === 'user' ? 'ml-6 bg-indigo-600 text-white' : 'mr-6 border border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  {entry.text}
                </div>
              ))}
              {proposal && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
                  <div className="text-[12.5px] font-bold text-emerald-800">Propuesta pendiente</div>
                  <p className="mt-1 text-[12px] text-emerald-900/80">Al aplicarla se reemplaza el guion actual. Queda una versión guardada para volver atrás.</p>
                  <div className="mt-2.5 flex gap-2">
                    <button onClick={applyProposal} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-emerald-500">
                      <Check size={13} /> Aplicar al guion
                    </button>
                    <button onClick={() => setProposal(null)} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-emerald-900/70 hover:bg-emerald-100">
                      Descartar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-3">
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void askAi('revise') }}
                rows={3}
                placeholder="Pide un cambio: «añade una comprobación al cierre», «acorta la lección 2»…"
                className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-[13.5px] focus:border-indigo-500 focus:outline-none"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => askAi('revise')}
                  disabled={aiBusy || !instruction.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[12.5px] font-bold text-white disabled:opacity-50"
                >
                  {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Pedir el cambio
                </button>
                <button
                  onClick={() => askAi('draft')}
                  disabled={aiBusy || !sources.length}
                  title="Reescribe el guion completo desde los insumos"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  <RotateCcw size={13} /> Rehacer desde insumos
                </button>
              </div>
            </div>
          </section>
        )}

        {showPanel && (
          <section className="flex min-w-0 flex-col">
            <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-3 py-1.5">
              {tabs.map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => { setTab(key); if (key === 'entrega') void loadVersions(); if (key === 'vista') void flush() }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                    tab === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
                  {key === 'revision' && errors.length > 0 && (
                    <span className={`rounded-full px-1.5 text-[10.5px] font-bold ${tab === key ? 'bg-white/25' : 'bg-rose-100 text-rose-700'}`}>{errors.length}</span>
                  )}
                  {key === 'comentarios' && openThreads > 0 && (
                    <span className={`rounded-full px-1.5 text-[10.5px] font-bold ${tab === key ? 'bg-white/25' : 'bg-amber-100 text-amber-700'}`}>{openThreads}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1">
              {tab === 'ficha' && (
                <div className="mx-auto max-w-3xl space-y-4 p-5">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-[14px] font-bold text-amber-900">
                      <AlertTriangle size={16} /> El editor de «{spec.label}» todavía no existe
                    </div>
                    <p className="mt-1 text-[12.5px] text-amber-900/80">
                      {spec.pending} Mientras tanto el recurso está inventariado en la metabiblioteca con su ficha,
                      y se puede comentar y planificar.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Ficha del recurso</h4>
                    <dl className="mt-3 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
                      {([
                        ['Tipo', spec.label],
                        ['Workspace', workspaceName],
                        ['Curso', resource.course || '—'],
                        ['Unidad', resource.unit || '—'],
                        ['Estado', LB_STATUS_LABEL[resource.status]],
                        ['Editado', timeAgo(resource.updatedAt)],
                      ] as Array<[string, string]>).map(([label, value]) => (
                        <div key={label} className="flex gap-2">
                          <dt className="shrink-0 font-semibold text-slate-500">{label}:</dt>
                          <dd className="min-w-0 text-slate-700">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {resource.subtitle && <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{resource.subtitle}</p>}
                    {resource.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {resource.tags.map((tag) => (
                          <span key={tag} className="rounded bg-slate-50 px-1.5 py-0.5 text-[10.5px] text-slate-500">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/*
                Un editor por familia. El reparto lo decide familyOf, el mismo
                que usan el API y el render, así que no hay forma de que el
                editor y lo publicado dejen de corresponderse.
              */}
              {tab === 'guion' && editable && kindReady && (() => {
                const shared = {
                  directives,
                  issues,
                  commentsByAnchor: maySeeComments ? commentsByAnchor : undefined,
                  onOpenComments: (anchor: string) => { setFocusAnchor(anchor); setTab('comentarios') },
                }
                switch (familyOf(resource.kind)) {
                  case 'scenes':
                    return <SceneEditor {...shared} content={content as LbInteractiveContent} onChange={onContentChange} />
                  case 'podcast':
                    return (
                      <PodcastEditor
                        {...shared}
                        resourceId={resource.id}
                        content={content as LbPodcastContent}
                        onChange={onContentChange}
                      />
                    )
                  case 'video':
                    return <VideoEditor {...shared} content={content as LbVideoContent} onChange={onContentChange} />
                  case 'route':
                    return <RouteEditor {...shared} content={content as LbRouteContent} onChange={onContentChange} />
                  case 'mirror':
                    return (
                      <MirrorEditor
                        resourceId={resource.id}
                        directives={directives}
                        issues={issues}
                        content={content as LbMirrorContent}
                        onChange={onContentChange}
                      />
                    )
                  default:
                    return <GuionEditor {...shared} content={content as LbContent} onChange={onContentChange} />
                }
              })()}

              {tab === 'comentarios' && maySeeComments && (
                <CommentsPanel
                  resourceId={resource.id}
                  kind={resource.kind}
                  content={content}
                  directives={directives}
                  role={role}
                  comments={comments}
                  reload={reloadComments}
                  focusAnchor={focusAnchor}
                />
              )}

              {tab === 'vista' && (
                <iframe
                  key={previewNonce}
                  src={learningApi.previewUrl(resource.id)}
                  title="Vista previa del recurso"
                  className="h-[calc(100vh-170px)] w-full border-0 bg-white"
                />
              )}

              {tab === 'revision' && (
                <div className="mx-auto max-w-3xl space-y-4 p-5">
                  <div className={`rounded-2xl border p-4 ${errors.length ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                    <div className={`flex items-center gap-2 text-[14px] font-bold ${errors.length ? 'text-rose-800' : 'text-emerald-800'}`}>
                      {errors.length ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                      {errors.length
                        ? `${errors.length} punto(s) incumplen las directivas de ${workspaceName}`
                        : `El recurso cumple las directivas de ${workspaceName}`}
                    </div>
                    <p className={`mt-1 text-[12.5px] ${errors.length ? 'text-rose-900/80' : 'text-emerald-900/80'}`}>
                      {errors.length
                        ? 'Mientras queden errores no se puede publicar ni descargar el paquete.'
                        : 'Se puede publicar y descargar en cualquier formato habilitado.'}
                    </p>
                  </div>

                  {errors.length > 0 && (
                    <ul className="space-y-1.5">
                      {errors.map((issue, index) => (
                        <li key={index} className="rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-[13px] text-rose-800">{issue.message}</li>
                      ))}
                    </ul>
                  )}
                  {warnings.length > 0 && (
                    <>
                      <h4 className="pt-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Advertencias</h4>
                      <ul className="space-y-1.5">
                        {warnings.map((issue, index) => (
                          <li key={index} className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-[13px] text-amber-800">{issue.message}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Lo que exige este workspace</h4>
                    <ul className="mt-2 space-y-1 text-[13px] text-slate-600">
                      <li>Entre {directives.instructional.minLessons} y {directives.instructional.maxLessons} {directives.instructional.lessonLabel.toLowerCase()}es.</li>
                      {directives.instructional.sections.filter((section) => section.required).length > 0 && (
                        <li>Secciones obligatorias: {directives.instructional.sections.filter((s) => s.required).map((s) => s.title).join(', ')}.</li>
                      )}
                      <li>Comprobaciones: {directives.instructional.rules.minChecksPerLesson} por pantalla, {directives.instructional.rules.minChecksTotal} en total.</li>
                      <li>Párrafos de hasta {directives.instructional.rules.maxParagraphChars} caracteres.</li>
                      {directives.instructional.rules.requireImageAlt && <li>Toda imagen con texto alternativo.</li>}
                      {directives.instructional.rules.requireOutcomes && <li>Resultados de aprendizaje declarados en la portada.</li>}
                    </ul>
                  </div>
                </div>
              )}

              {tab === 'entrega' && (
                <div className="mx-auto max-w-3xl space-y-4 p-5">
                  {can(role, 'resource.export') && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <ExportCard
                        enabled={directives.exports.scorm}
                        disabledReason="Las directivas no habilitan SCORM"
                        blocked={errors.length > 0}
                        href={learningApi.exportUrl(resource.id, 'scorm')}
                        icon={<Package size={18} />}
                        title="Paquete SCORM 1.2"
                        hint="ZIP listo para subir al campus, con seguimiento de avance."
                        onBeforeDownload={flush}
                      />
                      <ExportCard
                        enabled={directives.exports.html}
                        disabledReason="Las directivas no habilitan la descarga HTML"
                        blocked={errors.length > 0}
                        href={learningApi.exportUrl(resource.id, 'html')}
                        icon={<Download size={18} />}
                        title={familyOf(resource.kind) === 'mirror' ? 'Sitio en ZIP' : 'HTML autocontenido'}
                        hint={
                          familyOf(resource.kind) === 'mirror'
                            ? 'El paquete original con sus archivos y las ediciones aplicadas.'
                            : 'Un solo archivo navegable, sin LMS.'
                        }
                        onBeforeDownload={flush}
                      />
                      <ExportCard
                        enabled
                        blocked={errors.length > 0}
                        href={learningApi.exportUrl(resource.id, 'json')}
                        icon={<FileText size={18} />}
                        title="Guion en JSON"
                        hint="Para archivo o para el pipeline de producción."
                        onBeforeDownload={flush}
                      />
                    </div>
                  )}

                  {can(role, 'resource.share') && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-[14px] font-bold">
                        <Globe size={15} className="text-slate-400" /> Cómo se comparte
                      </div>
                      {!directives.exports.publicLink ? (
                        <p className="mt-1.5 text-[13px] text-slate-500">Las directivas de {workspaceName} no habilitan el enlace público.</p>
                      ) : !published ? (
                        <p className="mt-1.5 text-[13px] text-slate-500">Publica el recurso para poder compartirlo.</p>
                      ) : (
                        <>
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {LB_SHARE_MODES.map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setShare(mode)}
                                disabled={busy === 'share'}
                                className={`rounded-xl border p-3 text-left transition ${
                                  resource.shareMode === mode ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'
                                }`}
                              >
                                <div className="text-[13px] font-bold">{LB_SHARE_LABEL[mode]}</div>
                                <div className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{LB_SHARE_HINT[mode]}</div>
                              </button>
                            ))}
                          </div>

                          {resource.shareMode !== 'OFF' && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-[12.5px]">{publicUrl}</code>
                                <button onClick={() => copy(publicUrl, 'link2')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100">
                                  {copied === 'link2' ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />} Copiar
                                </button>
                              </div>

                              {resource.shareMode === 'CODE' && (
                                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                  <Lock size={14} className="text-amber-700" />
                                  <span className="text-[12.5px] text-amber-900">Código de acceso:</span>
                                  <code className="rounded bg-white px-2 py-1 text-[15px] font-bold tracking-[0.2em] text-amber-900">{shareCode || '—'}</code>
                                  <button onClick={() => copy(shareCode || '', 'code')} className="text-amber-700 hover:text-amber-900" aria-label="Copiar código">
                                    {copied === 'code' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                  </button>
                                  <button
                                    onClick={() => setShare('CODE', { rotateCode: true })}
                                    disabled={busy === 'share'}
                                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-800 hover:underline"
                                  >
                                    <RefreshCw size={12} /> Generar otro
                                  </button>
                                </div>
                              )}

                              {directives.exports.embed && (
                                <div className="rounded-lg border border-slate-200 p-3">
                                  <label className="flex items-center gap-2 text-[13px] text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={resource.embedEnabled}
                                      onChange={(e) => setShare(resource.shareMode, { embedEnabled: e.target.checked })}
                                      className="h-4 w-4 accent-indigo-600"
                                    />
                                    Permitir incrustarlo en otra página
                                  </label>
                                  {resource.embedEnabled && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-[11.5px]">
                                        {learningApi.embedSnippet(resource.publicId, resource.title)}
                                      </code>
                                      <button
                                        onClick={() => copy(learningApi.embedSnippet(resource.publicId, resource.title), 'embed')}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100"
                                      >
                                        {copied === 'embed' ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Code2 size={14} />} Copiar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              <p className="text-[12px] text-slate-400">Lleva {resource.views} lectura(s).</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-[14px] font-bold">
                      <History size={15} className="text-slate-400" /> Versiones del guion
                    </div>
                    {versions.length === 0 ? (
                      <p className="mt-1.5 text-[13px] text-slate-500">Todavía no hay instantáneas guardadas.</p>
                    ) : (
                      <ul className="mt-2 divide-y divide-slate-100">
                        {versions.map((version) => (
                          <li key={version.id} className="flex items-center gap-3 py-2 text-[13px]">
                            <span className="flex-1 truncate text-slate-600">
                              {version.label ||
                                { manual: 'Guardado automático', publish: 'Antes de publicar', ai: 'Antes de aplicar la IA', restore: 'Antes de restaurar', import: 'Al importar' }[version.reason] ||
                                version.reason}
                            </span>
                            <span className="shrink-0 text-[11.5px] text-slate-400">{timeAgo(version.createdAt)}</span>
                            <button onClick={() => restore(version.id)} className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-100">
                              Restaurar
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function ExportCard({
  enabled,
  disabledReason,
  blocked,
  href,
  icon,
  title,
  hint,
  onBeforeDownload,
}: {
  enabled: boolean
  disabledReason?: string
  blocked: boolean
  href: string
  icon: React.ReactNode
  title: string
  hint: string
  onBeforeDownload: () => Promise<void>
}) {
  const unavailable = !enabled || blocked
  const reason = !enabled ? disabledReason : blocked ? 'Corrige los errores de revisión primero' : undefined

  return (
    <a
      href={unavailable ? undefined : href}
      onClick={(event) => {
        if (unavailable) { event.preventDefault(); return }
        // Se vuelca lo pendiente para que la descarga lleve lo último escrito.
        void onBeforeDownload()
      }}
      title={reason}
      className={`block rounded-2xl border p-4 transition ${
        unavailable ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md'
      }`}
    >
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</div>
      <div className="mt-2.5 text-[14px] font-bold tracking-tight">{title}</div>
      <p className="mt-1 text-[12.5px] leading-snug text-slate-500">{reason || hint}</p>
    </a>
  )
}
