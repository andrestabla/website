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
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Eye, Copy, Trash2, CopyPlus, Search, Loader2, CheckCircle2, X, Settings2,
  ChevronDown, Layers, Lock, GraduationCap, MousePointerClick, Mic, Clapperboard, Route, PackageOpen,
  Library, Users, AlertTriangle, MessageSquare,
} from 'lucide-react'
import { useDialogs } from '../cotizador/ui/dialogs'
import {
  LB_RESOURCE_KINDS, LB_RESOURCE_KIND_SPECS, LB_STATUSES, LB_STATUS_LABEL, LB_STATUS_STYLE,
  type LbResourceKind,
} from './lib/resources'
import { LB_ROLE_LABEL, LB_ROLE_STYLE, can } from './lib/roles'
import {
  learningApi, recalledWorkspace, rememberWorkspace, timeAgo,
  type ResourceRow, type WorkspaceRow,
} from './lib/api'
import { WorkspacePanel } from './WorkspacePanel'

/** Los iconos que declara cada tipo de recurso, resueltos aquí. */
const ICONS: Record<string, any> = {
  GraduationCap, MousePointerClick, Mic, Clapperboard, Route, PackageOpen,
}

function KindIcon({ kind, size = 16 }: { kind: LbResourceKind; size?: number }) {
  const Icon = ICONS[LB_RESOURCE_KIND_SPECS[kind].icon] || Library
  return <Icon size={size} />
}

export function LearningHome() {
  const navigate = useNavigate()
  const { confirm, dialogs } = useDialogs()

  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([])
  const [canCreateWorkspace, setCanCreateWorkspace] = useState(false)
  const [currentId, setCurrentId] = useState('')
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

  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ kind: 'OVA' as LbResourceKind, title: '', course: '', unit: '' })

  const current = useMemo(() => workspaces.find((row) => row.id === currentId) || null, [workspaces, currentId])
  const role = current?.role ?? null

  const loadWorkspaces = useCallback(async () => {
    try {
      const payload = await learningApi.workspaces.list()
      setWorkspaces(payload.workspaces || [])
      setCanCreateWorkspace(!!payload.canCreate)
      setCurrentId((prev) => {
        if (prev && payload.workspaces.some((row) => row.id === prev)) return prev
        const remembered = recalledWorkspace()
        if (remembered && payload.workspaces.some((row) => row.id === remembered)) return remembered
        return payload.workspaces[0]?.id || ''
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void loadWorkspaces() }, [loadWorkspaces])

  const loadLibrary = useCallback(async (workspaceId: string) => {
    if (!workspaceId) { setResources([]); return }
    try {
      const payload = await learningApi.resources.library(workspaceId)
      setResources(payload.resources || [])
    } catch (e: any) { setError(e.message) }
  }, [])

  useEffect(() => {
    if (!currentId) return
    rememberWorkspace(currentId)
    void loadLibrary(currentId)
  }, [currentId, loadLibrary])

  const needle = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      resources.filter((resource) => {
        const matchesText =
          !needle ||
          [resource.title, resource.course, resource.unit, ...(resource.tags || [])].some((value) =>
            (value || '').toLowerCase().includes(needle)
          )
        return matchesText && (!kindFilter || resource.kind === kindFilter) && (!statusFilter || resource.status === statusFilter)
      }),
    [resources, needle, kindFilter, statusFilter]
  )

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
      setCurrentId(payload.workspace.id)
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
      })
      navigate(`/ecosistema/learning/${payload.resource.id}`)
    } catch (e: any) { setError(e.message); setBusy('') }
  }

  const copyLink = (resource: ResourceRow) => {
    void navigator.clipboard.writeText(`${window.location.origin}${learningApi.publicUrl(resource.publicId)}`)
    setCopied(resource.id)
    window.setTimeout(() => setCopied(''), 1600)
  }

  const duplicate = async (resource: ResourceRow) => {
    try {
      const payload = await learningApi.resources.duplicate(resource.id)
      navigate(`/ecosistema/learning/${payload.resource.id}`)
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
        <Link to="/ecosistema" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Ecosistema</span>
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
                    onClick={() => { setCurrentId(workspace.id); setSwitcherOpen(false) }}
                    className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] hover:bg-slate-50 ${
                      workspace.id === currentId ? 'bg-indigo-50' : ''
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
            <div className="max-w-sm px-6">
              <div className="text-sm font-semibold text-slate-600">Todavía no perteneces a ningún workspace</div>
              <div className="mt-1 text-[13px] text-slate-400">
                {canCreateWorkspace
                  ? 'Crea el primero desde el selector de arriba.'
                  : 'Pide a un gestor que te agregue al equipo de su workspace.'}
              </div>
            </div>
          </div>
        ) : (
          <>
            {showNew && can(role, 'resource.create') && (
              <section className="mb-6 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-indigo-600">Nuevo recurso</h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  Las directivas de <b>{current.name}</b> deciden qué bloques podrás usar, qué secciones son obligatorias y cómo se entrega.
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {LB_RESOURCE_KINDS.map((kind) => {
                    const spec = LB_RESOURCE_KIND_SPECS[kind]
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
                    {LB_RESOURCE_KIND_SPECS[kind].label} {countByKind.get(kind) ? `(${countByKind.get(kind)})` : ''}
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

            {filtered.length === 0 ? (
              <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-slate-300 text-center">
                <div>
                  <div className="text-sm font-semibold text-slate-600">
                    {resources.length ? 'Nada coincide con el filtro' : 'La metabiblioteca está vacía'}
                  </div>
                  <div className="mt-1 text-[13px] text-slate-400">
                    {resources.length
                      ? 'Ajusta la búsqueda.'
                      : can(role, 'resource.create')
                      ? 'Crea el primer recurso con el botón de arriba.'
                      : 'Aquí aparecerán los recursos publicados de este workspace.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((resource) => {
                  const spec = LB_RESOURCE_KIND_SPECS[resource.kind]
                  const editable = can(role, 'resource.edit')
                  return (
                    <div
                      key={resource.id}
                      className="group flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md"
                      onClick={() => navigate(`/ecosistema/learning/${resource.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                          <KindIcon kind={resource.kind} size={12} /> {spec.short}
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold ${LB_STATUS_STYLE[resource.status]}`}>
                          {LB_STATUS_LABEL[resource.status]}
                        </span>
                      </div>
                      <h3 className="mt-3 text-[16px] font-bold leading-snug tracking-tight">{resource.title}</h3>
                      {(resource.course || resource.unit) && (
                        <p className="mt-1 text-[12.5px] text-slate-500">{[resource.course, resource.unit].filter(Boolean).join(' · ')}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-500">
                        <span><b className="text-slate-700">{resource.lessonCount}</b> lecciones</span>
                        <span><b className="text-slate-700">{resource.blockCount}</b> bloques</span>
                        <span><b className="text-slate-700">{resource.checkCount}</b> comprobaciones</span>
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
                })}
              </div>
            )}

            {/* Lo que este workspace todavía no puede producir, dicho sin rodeos. */}
            {can(role, 'resource.create') && (
              <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  <AlertTriangle size={13} /> En preparación
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {LB_RESOURCE_KINDS.filter((kind) => !LB_RESOURCE_KIND_SPECS[kind].available).map((kind) => {
                    const spec = LB_RESOURCE_KIND_SPECS[kind]
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

      {panelOpen && current && (
        <WorkspacePanel
          workspace={current}
          onClose={() => setPanelOpen(false)}
          onChanged={() => { void loadWorkspaces(); void loadLibrary(current.id) }}
        />
      )}
    </div>
  )
}
