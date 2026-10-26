/**
 * Learning Builder — metabiblioteca del workspace.
 *
 * Un solo sitio donde está todo lo que el workspace ha producido, del tipo que
 * sea. Arriba se cambia de workspace: un mismo usuario puede ser gestor en un
 * cliente e invitado en otro, y la barra lo dice siempre, porque de eso depende
 * lo que puede hacer en la pantalla.
 *
 * El invitado ve solo lo publicado y no encuentra botones de edición: la API
 * aplica la misma regla, así que la interfaz no esconde nada que igual se
 * pudiera llamar.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, Eye, Copy, Trash2, CopyPlus, Search, Loader2, CheckCircle2, X, Settings2,
  ChevronDown, Layers, Lock, GraduationCap, BookOpen, MousePointerClick, Mic, Clapperboard, Route, PackageOpen,
  Library, Users, AlertTriangle, MessageSquare, Folder, FolderOpen, ChevronRight,
  FolderPlus, FolderInput, Pencil, Home,
} from 'lucide-react'
import { useDialogs } from '../cotizador/ui/dialogs'
import {
  LB_RESOURCE_KINDS, kindSpec, LB_STATUSES, LB_STATUS_LABEL, LB_STATUS_STYLE,
  type LbResourceKind,
} from './lib/resources'
import { LB_STAT_LABELS, familyOf } from './lib/content'
import { LB_ROLE_LABEL, LB_ROLE_STYLE, can } from './lib/roles'
import {
  learningApi, timeAgo,
  type FolderRow, type ResourceRow, type WorkspaceRow,
} from './lib/api'
import { WorkspacePanel } from './WorkspacePanel'

/** Los iconos que declara cada tipo de recurso, resueltos aquí. */
const ICONS: Record<string, any> = {
  GraduationCap, BookOpen, MousePointerClick, Mic, Clapperboard, Route, PackageOpen,
}

function KindIcon({ kind, size = 16 }: { kind: LbResourceKind; size?: number }) {
  const Icon = ICONS[kindSpec(kind).icon] || Library
  return <Icon size={size} />
}

export function LearningHome() {
  const navigate = useNavigate()
  const { workspaceCode = '' } = useParams()
  const { confirm, prompt, dialogs } = useDialogs()
  const [searchParams, setSearchParams] = useSearchParams()

  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([])
  const [canCreateWorkspace, setCanCreateWorkspace] = useState(false)
  const [resources, setResources] = useState<ResourceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [newWorkspace, setNewWorkspace] = useState('')
  const [busy, setBusy] = useState('')

  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [folders, setFolders] = useState<FolderRow[]>([])
  /** Lo que se está moviendo con el diálogo «Mover a…». */
  const [moving, setMoving] = useState<{ type: 'resource' | 'folder'; id: string; label: string } | null>(null)
  /** Carpeta sobre la que se está soltando algo, para resaltarla. */
  const [dropOn, setDropOn] = useState<string | null>(null)

  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ kind: 'OVA' as LbResourceKind, title: '', course: '', unit: '' })

  const current = useMemo(
    () => workspaces.find((row) => row.code === workspaceCode.toUpperCase()) || null,
    [workspaces, workspaceCode]
  )
  const role = current?.role ?? null

  const loadWorkspaces = useCallback(async () => {
    try {
      const payload = await learningApi.workspaces.list()
      setWorkspaces(payload.workspaces || [])
      setCanCreateWorkspace(!!payload.canCreate)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void loadWorkspaces() }, [loadWorkspaces])

  const loadLibrary = useCallback(async (code: string) => {
    if (!code) { setResources([]); return }
    try {
      const payload = await learningApi.resources.library(code)
      setResources(payload.resources || [])
      setFolders(payload.folders || [])
    } catch (e: any) { setError(e.message) }
  }, [])

  useEffect(() => { void loadLibrary(workspaceCode.toUpperCase()) }, [workspaceCode, loadLibrary])

  const needle = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      resources.filter((resource) => {
        const matchesText =
          !needle ||
          [resource.title, resource.clientCode, resource.course, resource.unit, ...(resource.tags || [])].some((value) =>
            (value || '').toLowerCase().includes(needle)
          )
        return matchesText && (!kindFilter || resource.kind === kindFilter) && (!statusFilter || resource.status === statusFilter)
      }),
    [resources, needle, kindFilter, statusFilter]
  )

  /*
   * La biblioteca se recorre por carpetas, como un explorador de archivos: la
   * carpeta abierta vive en la URL (?carpeta=…), así que se puede enlazar y el
   * botón «atrás» del navegador sube de nivel. Lo que no está en ninguna
   * carpeta está en la raíz.
   */
  const manageFolders = can(role, 'folder.manage')
  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders])
  const askedFolder = searchParams.get('carpeta') || ''
  const currentFolder = askedFolder ? folderById.get(askedFolder) || null : null

  /** De la raíz a la carpeta, para las migas de pan. */
  const pathTo = useCallback((folderId: string | null | undefined): FolderRow[] => {
    const out: FolderRow[] = []
    const seen = new Set<string>()
    for (let at = folderId ? folderById.get(folderId) : undefined; at && !seen.has(at.id); at = at.parentId ? folderById.get(at.parentId) : undefined) {
      seen.add(at.id)
      out.unshift(at)
    }
    return out
  }, [folderById])

  const openFolder = (folderId: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (folderId) next.set('carpeta', folderId); else next.delete('carpeta')
    setSearchParams(next)
  }

  const byName = (a: { name?: string; title?: string }, b: { name?: string; title?: string }) =>
    String(a.name ?? a.title).localeCompare(String(b.name ?? b.title), 'es', { numeric: true, sensitivity: 'base' })

  /** Cuántos recursos (visibles para quien mira) hay dentro, contando las subcarpetas. */
  const deepCount = useMemo(() => {
    const direct = new Map<string, number>()
    for (const resource of resources) {
      if (resource.folderId && folderById.has(resource.folderId)) {
        direct.set(resource.folderId, (direct.get(resource.folderId) || 0) + 1)
      }
    }
    const children = new Map<string, string[]>()
    for (const folder of folders) {
      if (folder.parentId) children.set(folder.parentId, [...(children.get(folder.parentId) || []), folder.id])
    }
    const memo = new Map<string, number>()
    const count = (id: string, guard = new Set<string>()): number => {
      if (memo.has(id)) return memo.get(id)!
      if (guard.has(id)) return 0
      guard.add(id)
      const total = (direct.get(id) || 0) + (children.get(id) || []).reduce((sum, child) => sum + count(child, guard), 0)
      memo.set(id, total)
      return total
    }
    return (id: string) => count(id)
  }, [resources, folders, folderById])

  const here = currentFolder?.id ?? null
  // Quien no gestiona carpetas no ve las vacías: para él no llevan a nada.
  const subfolders = folders
    // Una carpeta cuya madre ya no existe se ve en la raíz, nunca se pierde.
    .filter((folder) => (folder.parentId && folderById.has(folder.parentId) ? folder.parentId : null) === here)
    .filter((folder) => manageFolders || deepCount(folder.id) > 0)
    .sort(byName)
  const resourcesHere = filtered
    .filter((resource) => (resource.folderId && folderById.has(resource.folderId) ? resource.folderId : null) === here)

  /* Buscar o filtrar busca en todas las carpetas: si no, el resultado podría
     quedar escondido en otra y la búsqueda parecería no encontrar nada. */
  const filtrando = Boolean(needle || kindFilter || statusFilter)

  const countByKind = useMemo(() => {
    const counts = new Map<string, number>()
    for (const resource of resources) counts.set(resource.kind, (counts.get(resource.kind) || 0) + 1)
    return counts
  }, [resources])

  const createWorkspace = async () => {
    if (!newWorkspace.trim()) return
    setBusy('workspace'); setError('')
    try {
      const payload = await learningApi.workspaces.create({ name: newWorkspace.trim() })
      setNewWorkspace('')
      await loadWorkspaces()
      navigate(`/ecosistema/learning/${payload.workspace.code}`)
      setSwitcherOpen(false)
    } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  const createResource = async () => {
    if (!current || !form.title.trim()) return
    setBusy('resource'); setError('')
    try {
      const payload = await learningApi.resources.create({
        workspaceId: current.id,
        kind: form.kind,
        title: form.title.trim(),
        course: form.course.trim() || undefined,
        unit: form.unit.trim() || undefined,
        folderId: here,
      })
      navigate(`/ecosistema/learning/${payload.resource.workspaceCode}/${payload.resource.code}`)
    } catch (e: any) { setError(e.message); setBusy('') }
  }

  const copyLink = (resource: ResourceRow) => {
    void navigator.clipboard.writeText(`${window.location.origin}${learningApi.publicUrl(resource.publicId)}`)
    setCopied(resource.id)
    window.setTimeout(() => setCopied(''), 1600)
  }

  const run = async (task: () => Promise<unknown>) => {
    if (!current) return
    setError('')
    try { await task(); await loadLibrary(current.code) } catch (e: any) { setError(e.message) }
  }

  const createFolder = async () => {
    if (!current) return
    const name = await prompt(currentFolder ? `Nueva carpeta dentro de «${currentFolder.name}»` : 'Nueva carpeta en la raíz', '', {
      title: 'Nueva carpeta', placeholder: 'Nombre de la carpeta', okLabel: 'Crear',
    })
    if (!name?.trim()) return
    await run(() => learningApi.folders.create(current.id, name.trim(), here))
  }

  const renameFolder = async (folder: FolderRow) => {
    if (!current) return
    const name = await prompt('Nuevo nombre de la carpeta', folder.name, { title: 'Renombrar carpeta', okLabel: 'Guardar' })
    if (!name?.trim() || name.trim() === folder.name) return
    await run(() => learningApi.folders.rename(current.id, folder.id, name.trim()))
  }

  const deleteFolder = async (folder: FolderRow) => {
    if (!current) return
    const inside = deepCount(folder.id)
    const ok = await confirm(
      `¿Eliminar la carpeta «${folder.name}»?\n\n` +
        (inside || folders.some((row) => row.parentId === folder.id)
          ? `No se borra ningún recurso: lo que tiene dentro (${inside} recurso${inside === 1 ? '' : 's'} y sus subcarpetas) pasa a ${folder.parentId ? `«${folderById.get(folder.parentId)?.name}»` : 'la raíz'}.`
          : 'Está vacía.'),
      { title: 'Eliminar carpeta', okLabel: 'Eliminar', danger: true }
    )
    if (!ok) return
    if (here === folder.id) openFolder(folder.parentId)
    await run(() => learningApi.folders.remove(current.id, folder.id))
  }

  const renameResource = async (resource: ResourceRow) => {
    const title = await prompt('Nuevo título del recurso', resource.title, { title: 'Renombrar recurso', okLabel: 'Guardar' })
    if (!title?.trim() || title.trim() === resource.title) return
    await run(() => learningApi.resources.update(resource.id, { title: title.trim() }))
  }

  const renameWorkspace = async () => {
    if (!current) return
    const name = await prompt('Nuevo nombre del workspace', current.name, { title: 'Renombrar workspace', okLabel: 'Guardar' })
    if (!name?.trim() || name.trim() === current.name) return
    setError('')
    try { await learningApi.workspaces.update(current.id, { name: name.trim() }); await loadWorkspaces() } catch (e: any) { setError(e.message) }
  }

  /** Mueve un recurso o una carpeta a otra carpeta (null = la raíz). */
  const moveTo = async (item: { type: 'resource' | 'folder'; id: string }, folderId: string | null) => {
    if (!current) return
    if (item.type === 'folder' && item.id === folderId) return
    setMoving(null)
    await run(() =>
      item.type === 'resource'
        ? learningApi.folders.moveResources(current.id, [item.id], folderId)
        : learningApi.folders.move(current.id, item.id, folderId)
    )
  }

  // ── Arrastrar y soltar: recursos y carpetas sobre carpetas o migas de pan ──
  const DRAG = 'application/x-lb-item'
  const dragProps = (item: { type: 'resource' | 'folder'; id: string }) =>
    manageFolders
      ? {
          draggable: true,
          onDragStart: (event: React.DragEvent) => {
            event.dataTransfer.setData(DRAG, JSON.stringify(item))
            event.dataTransfer.effectAllowed = 'move'
          },
        }
      : {}
  const dropProps = (folderId: string | null) =>
    manageFolders
      ? {
          onDragOver: (event: React.DragEvent) => {
            if (!event.dataTransfer.types.includes(DRAG)) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            setDropOn(folderId ?? '__root')
          },
          onDragLeave: () => setDropOn(null),
          onDrop: (event: React.DragEvent) => {
            event.preventDefault()
            setDropOn(null)
            try {
              const item = JSON.parse(event.dataTransfer.getData(DRAG))
              if (item?.id) void moveTo(item, folderId)
            } catch { /* no era nuestro */ }
          },
        }
      : {}

  const duplicate = async (resource: ResourceRow) => {
    try {
      const payload = await learningApi.resources.duplicate(resource.id)
      navigate(`/ecosistema/learning/${payload.resource.workspaceCode}/${payload.resource.code}`)
    } catch (e: any) { setError(e.message) }
  }

  const remove = async (resource: ResourceRow) => {
    const ok = await confirm(
      `¿Eliminar «${resource.title}»?\n\nSe borran su guion, sus versiones, sus insumos y su enlace público. No se puede deshacer.`
    )
    if (!ok) return
    try {
      await learningApi.resources.remove(resource.id)
      setResources((prev) => prev.filter((row) => row.id !== resource.id))
    } catch (e: any) { setError(e.message) }
  }

  /** A dónde sube la flecha de arriba: un solo nivel. */
  const up = (() => {
    if (!current) return { to: '/ecosistema/learning', label: 'Workspaces' }
    if (!currentFolder) return { to: '/ecosistema/learning', label: 'Workspaces' }
    const parent = currentFolder.parentId ? folderById.get(currentFolder.parentId) : null
    return parent
      ? { to: `/ecosistema/learning/${current.code}?carpeta=${encodeURIComponent(parent.id)}`, label: parent.name }
      : { to: `/ecosistema/learning/${current.code}`, label: current.name }
  })()

  /** Tarjeta de un recurso; con showPath dice en qué carpeta está (al buscar). */
  const renderCard = (resource: ResourceRow, showPath = false) => {
    const spec = kindSpec(resource.kind)
    const editable = can(role, 'resource.edit')
    return (
      <div
        key={resource.id}
        {...dragProps({ type: 'resource', id: resource.id })}
        className="group flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md"
        onClick={() => navigate(`/ecosistema/learning/${resource.workspaceCode}/${resource.code}`)}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
            <KindIcon kind={resource.kind} size={12} /> {spec.short}
          </span>
          <span className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold ${LB_STATUS_STYLE[resource.status]}`}>
            {LB_STATUS_LABEL[resource.status]}
          </span>
        </div>
        {/*
          La codificación del cliente va delante del
          título: es la que su equipo conoce, la que
          escribe en los correos y la que busca aquí. El
          código de la plataforma no se enseña en la
          tarjeta; vive en la cabecera del editor.
        */}
        {resource.clientCode && (
          <p className="mt-3 font-mono text-[11.5px] font-bold tracking-wide text-indigo-600">
            {resource.clientCode}
          </p>
        )}
        <h3 className={`${resource.clientCode ? 'mt-0.5' : 'mt-3'} text-[16px] font-bold leading-snug tracking-tight`}>{resource.title}</h3>
        {showPath && (
          <button
            onClick={(e) => { e.stopPropagation(); openFolder(resource.folderId && folderById.has(resource.folderId) ? resource.folderId : null) }}
            className="mt-1.5 inline-flex max-w-full items-center gap-1 self-start truncate rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
            title="Abrir su carpeta"
          >
            <Folder size={11} />
            {pathTo(resource.folderId).map((folder) => folder.name).join(' / ') || current?.name || 'Raíz'}
          </button>
        )}
        {(resource.course || resource.unit) && (
          <p className="mt-1 text-[12.5px] text-slate-500">{[resource.course, resource.unit].filter(Boolean).join(' · ')}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-500">
          {/*
            Los tres números significan cosas distintas según el
            tipo —bloques en un OVA, puntos activos en una
            presentación, intervenciones en un pódcast—, así que
            el rótulo lo pone la familia y no la tarjeta.
          */}
          {([resource.lessonCount, resource.blockCount, resource.checkCount] as const).map(
            (value, index) => {
              const label = LB_STAT_LABELS[familyOf(resource.kind)][index]
              if (!label) return null
              return (
                <span key={label}>
                  <b className="text-slate-700">{value}</b> {label}
                </span>
              )
            }
          )}
          {resource.status === 'PUBLISHED' && <span><b className="text-slate-700">{resource.views}</b> lecturas</span>}
        </div>
        {!!resource.openComments && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            <MessageSquare size={11} /> {resource.openComments} de revisión sin atender
          </div>
        )}
        {resource.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {resource.tags.map((tag) => (
              <span key={tag} className="rounded bg-slate-50 px-1.5 py-0.5 text-[10.5px] text-slate-500">{tag}</span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-[11.5px] text-slate-400">Editado {timeAgo(resource.updatedAt)}</span>
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            {resource.shareMode !== 'OFF' && (
              <>
                <button
                  onClick={() => copyLink(resource)}
                  title={resource.shareMode === 'CODE' ? 'Copiar enlace (pide código)' : 'Copiar enlace público'}
                  aria-label="Copiar enlace"
                  className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                >
                  {copied === resource.id ? <CheckCircle2 size={15} className="text-emerald-600" /> : resource.shareMode === 'CODE' ? <Lock size={15} /> : <Copy size={15} />}
                </button>
                <a
                  href={learningApi.publicUrl(resource.publicId)} target="_blank" rel="noreferrer"
                  title="Ver publicado" aria-label="Ver publicado"
                  className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                >
                  <Eye size={15} />
                </a>
              </>
            )}
            {editable && (
              <button
                onClick={() => renameResource(resource)}
                title="Renombrar" aria-label="Renombrar"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
              >
                <Pencil size={14} />
              </button>
            )}
            {manageFolders && (
              <button
                onClick={() => setMoving({ type: 'resource', id: resource.id, label: resource.title })}
                title="Mover a otra carpeta" aria-label="Mover a otra carpeta"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
              >
                <FolderInput size={15} />
              </button>
            )}
            {can(role, 'resource.create') && (
              <button
                onClick={() => duplicate(resource)}
                title="Duplicar" aria-label="Duplicar"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
              >
                <CopyPlus size={15} />
              </button>
            )}
            {can(role, 'resource.delete') && (
              <button
                onClick={() => remove(resource)}
                title="Eliminar" aria-label="Eliminar"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 size={15} />
              </button>
            )}
            {!editable && can(role, 'resource.view') && (
              <span className="px-2 text-[11px] text-slate-400">solo lectura</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Cargando Learning Builder…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {dialogs}

      <header className="flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-4 sm:gap-3 sm:px-6">
        {/*
          La flecha sube un escalón, nunca más: dentro de una subcarpeta, a su
          carpeta madre; dentro de una carpeta, a la raíz del workspace; y
          solo desde la raíz, a los workspaces. Saltar varios niveles de una
          vez obligaba a volver a bajar para seguir donde se estaba.
        */}
        <Link
          to={up.to}
          aria-label={`Volver a ${up.label}`}
          title={`Volver a ${up.label}`}
          className="inline-flex min-w-0 max-w-[14rem] items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600"
        >
          <ArrowLeft size={16} className="shrink-0" /> <span className="hidden truncate sm:inline">{up.label}</span>
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white">
          <Library size={16} />
        </div>

        {/* Selector de workspace */}
        <div className="relative min-w-0">
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className="flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-left hover:bg-slate-100"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-tight">{current?.name || 'Sin workspace'}</div>
              <div className="truncate text-[11px] text-slate-400">Learning Builder</div>
            </div>
            <ChevronDown size={14} className="shrink-0 text-slate-400" />
          </button>
          {switcherOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
              <div className="absolute left-0 top-11 z-20 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => { navigate(`/ecosistema/learning/${workspace.code}`); setSwitcherOpen(false) }}
                    className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] hover:bg-slate-50 ${
                      workspace.code === current?.code ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold">{workspace.name}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${LB_ROLE_STYLE[workspace.role]}`}>
                      {LB_ROLE_LABEL[workspace.role]}
                    </span>
                    {!workspace.active && <span className="shrink-0 text-[10px] text-slate-400">inactivo</span>}
                  </button>
                ))}
                {canCreateWorkspace && (
                  <div className="flex items-center gap-1 border-t border-slate-100 p-2">
                    <input
                      value={newWorkspace}
                      onChange={(e) => setNewWorkspace(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void createWorkspace() }}
                      placeholder="Nuevo workspace…"
                      className="min-w-0 flex-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-[12.5px]"
                    />
                    <button
                      onClick={createWorkspace}
                      disabled={busy === 'workspace' || !newWorkspace.trim()}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white disabled:opacity-40"
                      aria-label="Crear workspace"
                    >
                      {busy === 'workspace' ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {role && (
          <span className={`hidden shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold sm:inline-flex ${LB_ROLE_STYLE[role]}`}>
            {LB_ROLE_LABEL[role]}
          </span>
        )}

        <div className="flex-1" />

        {can(role, 'library.view') && current && (
          <button
            onClick={() => setPanelOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
          >
            {can(role, 'workspace.directives') ? <Settings2 size={14} /> : <Users size={14} />}
            <span className="hidden sm:inline">{can(role, 'workspace.directives') ? 'Workspace' : 'Equipo'}</span>
          </button>
        )}
        {can(role, 'resource.create') && (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[13px] font-bold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus size={15} /> <span className="hidden sm:inline">Nuevo recurso</span>
          </button>
        )}
      </header>

      {error && (
        <div className="flex items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-4 py-2 text-[13px] text-rose-700 sm:px-6">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Cerrar aviso"><X size={14} /></button>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {!current ? (
          <div className="grid min-h-[50vh] place-items-center rounded-2xl border border-dashed border-slate-300 text-center">
            <div className="max-w-md px-6">
              <div className="text-sm font-semibold text-slate-600">
                {canCreateWorkspace ? 'Todavía no hay ningún workspace' : 'Todavía no perteneces a ningún workspace'}
              </div>
              {canCreateWorkspace ? (
                <>
                  <p className="mt-1 text-[13px] text-slate-400">
                    Un workspace es un cliente: su equipo, su línea gráfica y su modelo instruccional. Crea el primero
                    y quedarás como su gestor.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <input
                      value={newWorkspace}
                      onChange={(e) => setNewWorkspace(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void createWorkspace() }}
                      placeholder="Nombre del cliente"
                      className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-[14px]"
                    />
                    <button
                      onClick={createWorkspace}
                      disabled={busy === 'workspace' || !newWorkspace.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                    >
                      {busy === 'workspace' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear workspace
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-1 text-[13px] text-slate-400">
                  Pide a un gestor que te agregue al equipo de su workspace.
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {showNew && can(role, 'resource.create') && (
              <section className="mb-6 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-indigo-600">Nuevo recurso</h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  Se creará en <b>{[current.name, ...pathTo(here).map((folder) => folder.name)].join(' / ')}</b>.
                  Las directivas de <b>{current.name}</b> deciden qué bloques podrás usar, qué secciones son obligatorias y cómo se entrega.
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {LB_RESOURCE_KINDS.map((kind) => {
                    const spec = kindSpec(kind)
                    const active = form.kind === kind
                    return (
                      <button
                        key={kind}
                        onClick={() => spec.available && setForm({ ...form, kind })}
                        disabled={!spec.available}
                        title={spec.available ? spec.hint : spec.pending}
                        className={`rounded-xl border p-3 text-left transition ${
                          active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'
                        } ${spec.available ? '' : 'cursor-not-allowed opacity-55'}`}
                      >
                        <div className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${spec.accent} text-white`}>
                          <KindIcon kind={kind} size={15} />
                        </div>
                        <div className="mt-2 text-[12.5px] font-bold leading-tight">{spec.short}</div>
                        {!spec.available && <div className="mt-0.5 text-[10.5px] text-slate-400">En preparación</div>}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <label className="text-[13px]">
                    <span className="mb-1 block font-semibold text-slate-600">Título</span>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Clima y cultura organizacional"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px]"
                    />
                  </label>
                  <label className="text-[13px]">
                    <span className="mb-1 block font-semibold text-slate-600">Curso</span>
                    <input
                      value={form.course}
                      onChange={(e) => setForm({ ...form, course: e.target.value })}
                      placeholder="Gerencia del talento humano"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px]"
                    />
                  </label>
                  <label className="text-[13px]">
                    <span className="mb-1 block font-semibold text-slate-600">Unidad o módulo</span>
                    <input
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      placeholder="Módulo 2"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px]"
                    />
                  </label>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={createResource}
                    disabled={busy === 'resource' || !form.title.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                  >
                    {busy === 'resource' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear y abrir el builder
                  </button>
                  <button onClick={() => setShowNew(false)} className="rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-500 hover:bg-slate-100">
                    Cancelar
                  </button>
                </div>
              </section>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar en la metabiblioteca…"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-[14px]"
                />
              </div>
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-[13px]"
                aria-label="Filtrar por tipo"
              >
                <option value="">Todos los tipos</option>
                {LB_RESOURCE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kindSpec(kind).label} {countByKind.get(kind) ? `(${countByKind.get(kind)})` : ''}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-[13px]"
                aria-label="Filtrar por estado"
              >
                <option value="">Todos los estados</option>
                {LB_STATUSES.map((status) => <option key={status} value={status}>{LB_STATUS_LABEL[status]}</option>)}
              </select>
              {(query || kindFilter || statusFilter) && (
                <button
                  onClick={() => { setQuery(''); setKindFilter(''); setStatusFilter('') }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-semibold text-slate-500 hover:bg-slate-100"
                >
                  <Layers size={14} /> Limpiar
                </button>
              )}
            </div>

            {/* Migas de pan: dónde se está, y cada nivel es un sitio donde soltar. */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <nav aria-label="Carpetas" className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[13.5px]">
                <button
                  onClick={() => openFolder(null)}
                  {...dropProps(null)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold transition ${
                    dropOn === '__root' ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300' : here ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-800'
                  }`}
                >
                  <Home size={14} /> {current.name}
                </button>
                {can(role, 'workspace.manage') && !here && (
                  <button onClick={renameWorkspace} title="Renombrar workspace" aria-label="Renombrar workspace"
                    className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
                    <Pencil size={13} />
                  </button>
                )}
                {pathTo(here).map((folder, index, all) => (
                  <span key={folder.id} className="inline-flex items-center gap-1">
                    <ChevronRight size={14} className="text-slate-300" />
                    <button
                      onClick={() => openFolder(folder.id)}
                      {...dropProps(folder.id)}
                      className={`inline-flex max-w-[16rem] items-center truncate rounded-lg px-2 py-1 font-semibold transition ${
                        dropOn === folder.id ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300'
                          : index === all.length - 1 ? 'text-slate-800' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {folder.name}
                    </button>
                  </span>
                ))}
              </nav>
              {manageFolders && currentFolder && (
                <div className="flex items-center gap-1">
                  <button onClick={() => renameFolder(currentFolder)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100">
                    <Pencil size={13} /> Renombrar
                  </button>
                  <button onClick={() => setMoving({ type: 'folder', id: currentFolder.id, label: currentFolder.name })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100">
                    <FolderInput size={13} /> Mover
                  </button>
                  <button onClick={() => deleteFolder(currentFolder)} aria-label="Eliminar carpeta" title="Eliminar carpeta" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
              {manageFolders && (
                <button onClick={createFolder} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-slate-700">
                  <FolderPlus size={14} /> Nueva carpeta
                </button>
              )}
            </div>

            {filtrando ? (
              filtered.length === 0 ? (
                <div className="grid min-h-[30vh] place-items-center rounded-2xl border border-dashed border-slate-300 text-center">
                  <div>
                    <div className="text-sm font-semibold text-slate-600">Nada coincide con el filtro</div>
                    <div className="mt-1 text-[13px] text-slate-400">Se buscó en todas las carpetas. Ajusta la búsqueda.</div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-[12.5px] text-slate-500">
                    {filtered.length} resultado{filtered.length === 1 ? '' : 's'} en todas las carpetas
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((resource) => renderCard(resource, true))}
                  </div>
                </>
              )
            ) : subfolders.length === 0 && resourcesHere.length === 0 ? (
              <div
                {...dropProps(here)}
                className="grid min-h-[30vh] place-items-center rounded-2xl border border-dashed border-slate-300 text-center"
              >
                <div className="px-6">
                  <div className="text-sm font-semibold text-slate-600">
                    {here ? 'Esta carpeta está vacía' : resources.length ? 'No hay nada en la raíz' : 'La metabiblioteca está vacía'}
                  </div>
                  <div className="mt-1 text-[13px] text-slate-400">
                    {manageFolders
                      ? 'Crea una subcarpeta, crea un recurso aquí o arrastra recursos hasta esta carpeta.'
                      : can(role, 'resource.create')
                      ? 'Crea un recurso con el botón de arriba.'
                      : 'Aquí aparecerán los recursos publicados de este workspace.'}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {subfolders.length > 0 && (
                  <div className="mb-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {subfolders.map((folder) => {
                      const total = deepCount(folder.id)
                      const inner = folders.filter((row) => row.parentId === folder.id).length
                      return (
                        <div
                          key={folder.id}
                          {...dragProps({ type: 'folder', id: folder.id })}
                          {...dropProps(folder.id)}
                          onClick={() => openFolder(folder.id)}
                          className={`group flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-3.5 py-3 transition hover:border-indigo-400 hover:shadow-sm ${
                            dropOn === folder.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200'
                          }`}
                        >
                          <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                            {dropOn === folder.id ? <FolderOpen size={17} /> : <Folder size={17} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-bold tracking-tight text-slate-800">{folder.name}</span>
                            <span className="block text-[11.5px] text-slate-500">
                              {total} recurso{total === 1 ? '' : 's'}
                              {inner > 0 && <> · {inner} carpeta{inner === 1 ? '' : 's'}</>}
                            </span>
                          </span>
                          {manageFolders && (
                            <span className="flex flex-none items-center opacity-0 transition group-hover:opacity-100 focus-within:opacity-100" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => renameFolder(folder)} title="Renombrar" aria-label={`Renombrar ${folder.name}`}
                                className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setMoving({ type: 'folder', id: folder.id, label: folder.name })} title="Mover" aria-label={`Mover ${folder.name}`}
                                className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
                                <FolderInput size={13} />
                              </button>
                              <button onClick={() => deleteFolder(folder)} title="Eliminar" aria-label={`Eliminar ${folder.name}`}
                                className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                                <Trash2 size={13} />
                              </button>
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {resourcesHere.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {resourcesHere.map((resource) => renderCard(resource))}
                  </div>
                )}
                {manageFolders && subfolders.length > 0 && resourcesHere.length === 0 && (
                  <p className="text-[12.5px] text-slate-400">Arrastra un recurso sobre una carpeta para moverlo, o usa el botón de mover de su tarjeta.</p>
                )}
              </>
            )}

            {/* Lo que este workspace todavía no puede producir, dicho sin rodeos. */}
            {can(role, 'resource.create') && (
              <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  <AlertTriangle size={13} /> En preparación
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {LB_RESOURCE_KINDS.filter((kind) => !kindSpec(kind).available).map((kind) => {
                    const spec = kindSpec(kind)
                    return (
                      <div key={kind} className="flex items-start gap-2 text-[12.5px] text-slate-500">
                        <span className="mt-0.5 text-slate-300"><KindIcon kind={kind} size={14} /></span>
                        <span><b className="text-slate-600">{spec.label}:</b> {spec.pending}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {moving && current && (
        <MoveDialog
          title={`Mover «${moving.label}»`}
          folders={folders}
          excluded={moving.type === 'folder' ? moving.id : null}
          current={moving.type === 'folder'
            ? folderById.get(moving.id)?.parentId ?? null
            : resources.find((row) => row.id === moving.id)?.folderId ?? null}
          rootLabel={current.name}
          onPick={(folderId) => moveTo(moving, folderId)}
          onClose={() => setMoving(null)}
        />
      )}

      {panelOpen && current && (
        <WorkspacePanel
          workspace={current}
          onClose={() => setPanelOpen(false)}
          onChanged={() => { void loadWorkspaces(); void loadLibrary(current.code) }}
        />
      )}
    </div>
  )
}

/** Elegir carpeta de destino: el árbol entero, con la raíz arriba. */
function MoveDialog({
  title, folders, excluded, current, rootLabel, onPick, onClose,
}: {
  title: string
  folders: FolderRow[]
  /** Carpeta que se mueve: ni ella ni sus hijas pueden ser destino. */
  excluded: string | null
  /** Dónde está ahora, para marcarlo. */
  current: string | null
  rootLabel: string
  onPick: (folderId: string | null) => void
  onClose: () => void
}) {
  const ids = new Set(folders.map((folder) => folder.id))
  const parentOf = (folder: FolderRow) => (folder.parentId && ids.has(folder.parentId) ? folder.parentId : null)
  const here = current && ids.has(current) ? current : null

  const rows: Array<{ folder: FolderRow; depth: number; blocked: boolean }> = []
  const walk = (id: string | null, depth: number, blocked: boolean) => {
    const children = folders
      .filter((folder) => parentOf(folder) === id)
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }))
    for (const folder of children) {
      const isBlocked = blocked || folder.id === excluded
      rows.push({ folder, depth, blocked: isBlocked })
      walk(folder.id, depth + 1, isBlocked)
    }
  }
  walk(null, 1, false)

  const option = (label: string, id: string | null, depth: number, blocked: boolean) => (
    <button
      key={id ?? '__root'}
      disabled={blocked || here === id}
      onClick={() => onPick(id)}
      style={{ paddingLeft: 12 + depth * 18 }}
      className="flex w-full items-center gap-2 rounded-lg py-2 pr-3 text-left text-[13.5px] hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {id ? <Folder size={15} className="flex-none text-indigo-500" /> : <Home size={15} className="flex-none text-slate-500" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {here === id && <span className="flex-none text-[11px] text-slate-400">aquí está</span>}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <FolderInput size={17} className="text-indigo-600" />
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {option(`${rootLabel} (raíz)`, null, 0, false)}
          {rows.map(({ folder, depth, blocked }) => option(folder.name, folder.id, depth, blocked))}
          {rows.length === 0 && <p className="px-3 py-2 text-[12.5px] text-slate-400">Todavía no hay carpetas. Créalas con «Nueva carpeta».</p>}
        </div>
      </div>
    </div>
  )
}
