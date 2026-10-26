/**
 * Learning Builder — revisión comentada.
 *
 * Recorre el recurso pieza por pieza —portada y sus campos, cada lección, cada
 * bloque— y deja abrir un hilo sobre cualquiera de ellas. Es la vista del
 * auditor, que puede comentarlo todo y no puede editar nada; el editor usa la
 * misma pantalla para leer lo que le señalaron, responder y darlo por atendido.
 *
 * Un hilo cuyo bloque desaparezca no se pierde: queda agrupado aparte, con la
 * etiqueta que la pieza tenía cuando se comentó.
 */
import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  MessageSquare, MessageSquarePlus, Check, CornerDownRight, Loader2, Trash2, Pencil, X,
  CheckCircle2, RotateCcw, Filter, Crosshair, UserRound,
} from 'lucide-react'
import { useDialogs } from '../cotizador/ui/dialogs'
import type { LbDirectives } from './lib/directives'
import type { LbAnchorTarget } from './lib/comments'
import { anchorTargetsFor, type LbResourceContent } from './lib/content'
import { can, type LbRole } from './lib/roles'
import { learningApi, timeAgo, type CommentRow } from './lib/api'
import { LB_THREAD_STATES, LB_THREAD_STATE_LABEL, describeTarget, threadState, type LbThreadState } from './lib/review'

/**
 * Cómo se mira la revisión: por pieza del recurso (para comentar cada una) o
 * como lista de hilos, toda o por estado. Filtrar por versión pasa siempre a
 * lista: las piezas son las de la versión vigente y los hilos de una anterior
 * apuntan a otras.
 */
type View = 'pieces' | 'all' | LbThreadState

const VIEW_LABEL: Record<'pieces' | 'all', string> = {
  pieces: 'Por pieza',
  all: 'Todos los hilos',
}

export function CommentsPanel({
  resourceId,
  kind,
  content,
  directives,
  role,
  comments,
  reload,
  focusAnchor,
}: {
  resourceId: string
  kind: string
  content: LbResourceContent
  directives: LbDirectives
  role: LbRole
  /** Los hilos ya cargados: el builder también los usa para los globos del editor. */
  comments: CommentRow[]
  reload: () => Promise<void>
  /** Ancla que debe abrirse al entrar (al pulsar el globo de un bloque en el editor). */
  focusAnchor?: string
}) {
  const { confirm, dialogs } = useDialogs()
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('pieces')
  /** Versión entregada que se mira (0 = todas): la trazabilidad de V1, V2… */
  const [versionFilter, setVersionFilter] = useState(0)
  const [openAnchor, setOpenAnchor] = useState<string>(focusAnchor || '')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)
  const [busy, setBusy] = useState('')

  const mayComment = can(role, 'comment.create')
  const mayResolve = can(role, 'comment.resolve')

  useEffect(() => { if (focusAnchor) setOpenAnchor(focusAnchor) }, [focusAnchor])

  const targets = useMemo(
    () => anchorTargetsFor(kind, content, directives.instructional.lessonLabel),
    [kind, content, directives.instructional.lessonLabel]
  )

  const versions = useMemo(
    () => [...new Set(comments.map((comment) => comment.version).filter((v): v is number => typeof v === 'number'))].sort((a, b) => b - a),
    [comments]
  )
  // Una respuesta lleva la versión de su hilo, así que filtrar no parte ningún hilo.
  const shown = useMemo(
    () => (versionFilter ? comments.filter((comment) => comment.version === versionFilter) : comments),
    [comments, versionFilter]
  )

  const byAnchor = useMemo(() => {
    type Entry = { roots: CommentRow[]; repliesOf: Map<string, CommentRow[]> }
    const map = new Map<string, Entry>()
    for (const comment of shown) {
      const entry: Entry = map.get(comment.anchor) || { roots: [], repliesOf: new Map() }
      if (comment.parentId) {
        entry.repliesOf.set(comment.parentId, [...(entry.repliesOf.get(comment.parentId) || []), comment])
      } else {
        entry.roots.push(comment)
      }
      map.set(comment.anchor, entry)
    }
    return map
  }, [shown])

  const openThreads = shown.filter((comment) => !comment.parentId && comment.status === 'OPEN').length

  /** Hilos cuya pieza ya no existe en el guion. */
  const orphans = useMemo(() => {
    const known = new Set(targets.map((target) => target.anchor))
    const groups = new Map<string, CommentRow[]>()
    for (const comment of shown) {
      if (comment.parentId || known.has(comment.anchor)) continue
      groups.set(comment.anchor, [...(groups.get(comment.anchor) || []), comment])
    }
    return groups
  }, [shown, targets])

  const visible = targets
  const listMode = view !== 'pieces' || versionFilter !== 0

  // La lista: todos los hilos de lo filtrado, con sus respuestas, en orden de llegada.
  const repliesOf = useMemo(() => {
    const map = new Map<string, CommentRow[]>()
    for (const comment of shown) {
      if (comment.parentId) map.set(comment.parentId, [...(map.get(comment.parentId) || []), comment])
    }
    return map
  }, [shown])
  const roots = useMemo(() => shown.filter((comment) => !comment.parentId), [shown])
  const stateOf = (root: CommentRow) => threadState(root.status, (repliesOf.get(root.id) || []).length)
  const stateCount = (state: LbThreadState) => roots.filter((root) => stateOf(root) === state).length
  const listed = view === 'pieces' || view === 'all' ? roots : roots.filter((root) => stateOf(root) === view)

  const submit = async (anchor: string, parentId?: string) => {
    const key = parentId || anchor
    const body = (drafts[key] || '').trim()
    if (!body) return
    setBusy(key); setError('')
    try {
      await learningApi.comments.create(resourceId, { anchor, body, parentId })
      setDrafts((prev) => ({ ...prev, [key]: '' }))
      await reload()
    } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  const saveEdit = async () => {
    if (!editing) return
    setBusy(editing.id); setError('')
    try {
      await learningApi.comments.edit(resourceId, editing.id, editing.body.trim())
      setEditing(null)
      await reload()
    } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  const toggleResolved = async (comment: CommentRow) => {
    setBusy(comment.id); setError('')
    try {
      await learningApi.comments.resolve(resourceId, comment.id, comment.status !== 'RESOLVED')
      await reload()
    } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  const remove = async (comment: CommentRow) => {
    const ok = await confirm(
      comment.parentId ? '¿Borrar esta respuesta?' : '¿Borrar el hilo completo?\n\nSe van también sus respuestas.'
    )
    if (!ok) return
    setBusy(comment.id); setError('')
    try {
      await learningApi.comments.remove(resourceId, comment.id)
      await reload()
    } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  // Estas piezas se llaman como funciones y no como componentes: definidas
  // aquí dentro serían distintas en cada render, React volvería a montar los
  // campos al teclear y el cursor saltaría.
  const renderThread = (root: CommentRow, replies: CommentRow[]) => (
    <div className={`rounded-xl border p-3 ${root.status === 'RESOLVED' ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
      {renderBody(root)}
      {replies.map((reply) => (
        <div key={reply.id} className="mt-2 flex gap-2 border-l-2 border-slate-100 pl-3">
          <CornerDownRight size={13} className="mt-1 shrink-0 text-slate-300" />
          <div className="min-w-0 flex-1">{renderBody(reply)}</div>
        </div>
      ))}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {(mayResolve || root.canEdit) && (
          <button
            onClick={() => toggleResolved(root)}
            disabled={busy === root.id}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-semibold ${
              root.status === 'RESOLVED'
                ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            {root.status === 'RESOLVED' ? <><RotateCcw size={12} /> Reabrir</> : <><Check size={12} /> Dar por atendido</>}
          </button>
        )}
        {root.status === 'RESOLVED' && root.resolvedByName && (
          <span className="text-[11.5px] text-emerald-700">Atendido por {root.resolvedByName} · {timeAgo(root.resolvedAt)}</span>
        )}
      </div>

      {mayComment && (
        <div className="mt-2 flex gap-2">
          <input
            value={drafts[root.id] || ''}
            onChange={(e) => setDrafts((prev) => ({ ...prev, [root.id]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit(root.anchor, root.id) }}
            placeholder="Responder…"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px]"
          />
          <button
            onClick={() => submit(root.anchor, root.id)}
            disabled={busy === root.id || !(drafts[root.id] || '').trim()}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-40"
          >
            {busy === root.id ? <Loader2 size={13} className="animate-spin" /> : 'Responder'}
          </button>
        </div>
      )}
    </div>
  )

  const renderBody = (comment: CommentRow) => (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-bold text-slate-700">{comment.authorName}</span>
        {comment.guest && (
          <span
            title={comment.guest.email}
            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-800"
          >
            <UserRound size={10} /> Revisión externa{comment.guest.org ? ` · ${comment.guest.org}` : ''}
          </span>
        )}
        {!comment.parentId && typeof comment.version === 'number' && (
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10.5px] font-bold text-indigo-700" title="Versión entregada sobre la que se comentó">
            V{comment.version}
          </span>
        )}
        <span className="text-[11px] text-slate-400">{timeAgo(comment.createdAt)}</span>
        {comment.updatedAt !== comment.createdAt && <span className="text-[11px] text-slate-300">editado</span>}
        <div className="flex-1" />
        {comment.canEdit && editing?.id !== comment.id && (
          <button
            onClick={() => setEditing({ id: comment.id, body: comment.body })}
            className="text-slate-300 hover:text-slate-600" aria-label="Editar comentario"
          >
            <Pencil size={13} />
          </button>
        )}
        {comment.canDelete && (
          <button onClick={() => remove(comment)} className="text-slate-300 hover:text-rose-600" aria-label="Borrar comentario">
            <Trash2 size={13} />
          </button>
        )}
      </div>
      {editing?.id === comment.id ? (
        <div className="mt-1.5 flex gap-2">
          <textarea
            value={editing.body}
            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            rows={2}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px]"
          />
          <div className="flex flex-col gap-1">
            <button onClick={saveEdit} disabled={busy === comment.id} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[12px] font-bold text-white disabled:opacity-40">
              Guardar
            </button>
            <button onClick={() => setEditing(null)} className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:bg-slate-100">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          {comment.target && !comment.parentId && (
            <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-[11.5px] text-slate-500">
              <Crosshair size={12} className="mt-0.5 shrink-0 text-amber-600" />
              <span className="min-w-0">
                <span className="font-semibold text-slate-600">{describeTarget(comment.target)}</span>
                {comment.target.section && <span> · en «{comment.target.section}»</span>}
                {comment.target.page && <span className="text-slate-400"> · {comment.target.page}</span>}
              </span>
            </div>
          )}
          <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-700">{comment.body}</p>
        </>
      )}
    </div>
  )

  const renderRow = (target: LbAnchorTarget) => {
    const entry = byAnchor.get(target.anchor)
    const roots = entry?.roots || []
    const openCount = roots.filter((root) => root.status === 'OPEN').length
    const expanded = openAnchor === target.anchor

    return (
      <div
        className={`rounded-xl border ${expanded ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}
        style={{ marginLeft: target.depth * 16 }}
      >
        <button
          onClick={() => setOpenAnchor(expanded ? '' : target.anchor)}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-slate-700">{target.label}</div>
            {target.preview && <div className="truncate text-[11.5px] text-slate-400">{target.preview}</div>}
          </div>
          {roots.length > 0 && (
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                openCount ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              <MessageSquare size={11} /> {roots.length}
              {openCount === 0 && <CheckCircle2 size={11} />}
            </span>
          )}
          {roots.length === 0 && mayComment && (
            <span className="shrink-0 text-slate-300"><MessageSquarePlus size={15} /></span>
          )}
        </button>

        {expanded && (
          <div className="space-y-2 border-t border-slate-100 p-3">
            {roots.map((root) => (
              <Fragment key={root.id}>{renderThread(root, entry?.repliesOf.get(root.id) || [])}</Fragment>
            ))}
            {mayComment ? (
              <div className="flex gap-2">
                <textarea
                  value={drafts[target.anchor] || ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [target.anchor]: e.target.value }))}
                  rows={2}
                  placeholder={`Comentar sobre «${target.label}»…`}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-[13px]"
                />
                <button
                  onClick={() => submit(target.anchor)}
                  disabled={busy === target.anchor || !(drafts[target.anchor] || '').trim()}
                  className="shrink-0 self-start rounded-lg bg-indigo-600 px-3 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"
                >
                  {busy === target.anchor ? <Loader2 size={13} className="animate-spin" /> : 'Comentar'}
                </button>
              </div>
            ) : (
              roots.length === 0 && <p className="text-[12.5px] text-slate-400">Sin comentarios en esta pieza.</p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    // Una URL o una palabra larga se parten donde haga falta: si no, empujan
    // el panel hacia los lados.
    <div className="mx-auto max-w-3xl space-y-3 p-5 [overflow-wrap:anywhere]">
      {dialogs}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Cerrar aviso"><X size={14} /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 p-0.5">
          {(['pieces', 'all', ...LB_THREAD_STATES] as View[]).map((value) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className={`rounded-md px-2.5 py-1 text-[12.5px] font-semibold ${
                view === value ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {value === 'pieces' || value === 'all'
                ? `${VIEW_LABEL[value]}${value === 'all' ? ` · ${roots.length}` : ''}`
                : `${LB_THREAD_STATE_LABEL[value]} · ${stateCount(value)}`}
            </button>
          ))}
        </div>
        {versions.length > 0 && (
          <select
            value={versionFilter}
            onChange={(e) => setVersionFilter(Number(e.target.value))}
            aria-label="Filtrar por versión"
            className="rounded-lg border border-slate-200 px-2 py-1 text-[12.5px] font-semibold text-slate-600"
          >
            <option value={0}>Todas las versiones</option>
            {versions.map((v) => <option key={v} value={v}>Comentarios sobre la V{v}</option>)}
          </select>
        )}
        <div className="flex-1" />
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500">
          <Filter size={13} className="text-slate-400" />
          {openThreads} hilo(s) sin atender de {shown.filter((c) => !c.parentId).length}
        </span>
      </div>

      {!mayComment && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px] text-slate-500">
          Tu rol permite leer la revisión, no escribir en ella.
        </p>
      )}

      {listMode ? (
        <div className="space-y-2">
          {versionFilter !== 0 && view === 'pieces' && (
            <p className="text-[12px] text-slate-400">
              Los hilos de la V{versionFilter} se listan aquí: sus piezas son las de esa versión, no las de la vigente.
            </p>
          )}
          {listed.map((root) => (
            <div key={root.id}>
              <div className="mb-1 truncate px-1 text-[11.5px] font-semibold text-slate-400" title={root.anchorLabel || root.anchor}>
                {root.anchorLabel || root.anchor}
              </div>
              {renderThread(root, repliesOf.get(root.id) || [])}
            </div>
          ))}
          {listed.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-[13px] text-slate-400">
              {roots.length ? 'Ningún hilo coincide con el filtro.' : 'Todavía no hay comentarios.'}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {visible.map((target) => <Fragment key={target.anchor}>{renderRow(target)}</Fragment>)}
          {visible.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-[13px] text-slate-400">
              Todavía no hay comentarios.
            </div>
          )}
        </div>
      )}

      {!listMode && orphans.size > 0 && (
        <section className="pt-3">
          <h4 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
            Piezas que ya no existen
          </h4>
          <p className="mb-2 text-[12px] text-slate-400">
            Lo que se comentó aquí se editó o se borró después. Se conserva para no perder la conversación.
          </p>
          <div className="space-y-2">
            {[...orphans.entries()].map(([anchor, roots]) => (
              <div key={anchor} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-[12.5px] font-semibold text-slate-500">
                  {roots[0]?.anchorLabel || anchor}
                </div>
                <div className="space-y-2">
                  {roots.map((root) => (
                    <Fragment key={root.id}>{renderThread(root, byAnchor.get(anchor)?.repliesOf.get(root.id) || [])}</Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
