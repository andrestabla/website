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
import { useEffect, useMemo, useState } from 'react'
import {
  MessageSquare, MessageSquarePlus, Check, CornerDownRight, Loader2, Trash2, Pencil, X,
  CheckCircle2, RotateCcw, Filter,
} from 'lucide-react'
import { useDialogs } from '../cotizador/ui/dialogs'
import type { LbContent } from './lib/blocks'
import type { LbDirectives } from './lib/directives'
import { anchorTargets, type LbAnchorTarget } from './lib/comments'
import { can, type LbRole } from './lib/roles'
import { learningApi, timeAgo, type CommentRow } from './lib/api'

type Filter = 'all' | 'commented' | 'open'

const FILTER_LABEL: Record<Filter, string> = {
  all: 'Todas las piezas',
  commented: 'Con comentarios',
  open: 'Sin atender',
}

export function CommentsPanel({
  resourceId,
  content,
  directives,
  role,
  comments,
  reload,
  focusAnchor,
}: {
  resourceId: string
  content: LbContent
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
  const [filter, setFilter] = useState<Filter>('all')
  const [openAnchor, setOpenAnchor] = useState<string>(focusAnchor || '')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)
  const [busy, setBusy] = useState('')

  const mayComment = can(role, 'comment.create')
  const mayResolve = can(role, 'comment.resolve')

  useEffect(() => { if (focusAnchor) setOpenAnchor(focusAnchor) }, [focusAnchor])

  const targets = useMemo(
    () => anchorTargets(content, directives.instructional.lessonLabel),
    [content, directives.instructional.lessonLabel]
  )

  const byAnchor = useMemo(() => {
    type Entry = { roots: CommentRow[]; repliesOf: Map<string, CommentRow[]> }
    const map = new Map<string, Entry>()
    for (const comment of comments) {
      const entry: Entry = map.get(comment.anchor) || { roots: [], repliesOf: new Map() }
      if (comment.parentId) {
        entry.repliesOf.set(comment.parentId, [...(entry.repliesOf.get(comment.parentId) || []), comment])
      } else {
        entry.roots.push(comment)
      }
      map.set(comment.anchor, entry)
    }
    return map
  }, [comments])

  const openThreads = comments.filter((comment) => !comment.parentId && comment.status === 'OPEN').length

  /** Hilos cuya pieza ya no existe en el guion. */
  const orphans = useMemo(() => {
    const known = new Set(targets.map((target) => target.anchor))
    const groups = new Map<string, CommentRow[]>()
    for (const comment of comments) {
      if (comment.parentId || known.has(comment.anchor)) continue
      groups.set(comment.anchor, [...(groups.get(comment.anchor) || []), comment])
    }
    return groups
  }, [comments, targets])

  const visible = useMemo(() => {
    if (filter === 'all') return targets
    return targets.filter((target) => {
      const entry = byAnchor.get(target.anchor)
      if (!entry?.roots.length) return false
      if (filter === 'open') return entry.roots.some((root) => root.status === 'OPEN')
      return true
    })
  }, [targets, byAnchor, filter])

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

  const Thread = ({ root, replies }: { root: CommentRow; replies: CommentRow[] }) => (
    <div className={`rounded-xl border p-3 ${root.status === 'RESOLVED' ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
      <CommentBody comment={root} />
      {replies.map((reply) => (
        <div key={reply.id} className="mt-2 flex gap-2 border-l-2 border-slate-100 pl-3">
          <CornerDownRight size={13} className="mt-1 shrink-0 text-slate-300" />
          <div className="min-w-0 flex-1"><CommentBody comment={reply} /></div>
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

  const CommentBody = ({ comment }: { comment: CommentRow }) => (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-bold text-slate-700">{comment.authorName}</span>
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
        <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-700">{comment.body}</p>
      )}
    </div>
  )

  const Row = ({ target }: { target: LbAnchorTarget }) => {
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
              <Thread key={root.id} root={root} replies={entry?.repliesOf.get(root.id) || []} />
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
    <div className="mx-auto max-w-3xl space-y-3 p-5">
      {dialogs}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Cerrar aviso"><X size={14} /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
          {(Object.keys(FILTER_LABEL) as Filter[]).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-md px-2.5 py-1 text-[12.5px] font-semibold ${
                filter === value ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {FILTER_LABEL[value]}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500">
          <Filter size={13} className="text-slate-400" />
          {openThreads} hilo(s) sin atender de {comments.filter((c) => !c.parentId).length}
        </span>
      </div>

      {!mayComment && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px] text-slate-500">
          Tu rol permite leer la revisión, no escribir en ella.
        </p>
      )}

      <div className="space-y-1.5">
        {visible.map((target) => <Row key={target.anchor} target={target} />)}
        {visible.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-[13px] text-slate-400">
            {filter === 'open' ? 'No queda ningún hilo sin atender.' : 'Todavía no hay comentarios.'}
          </div>
        )}
      </div>

      {orphans.size > 0 && (
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
                    <Thread key={root.id} root={root} replies={byAnchor.get(anchor)?.repliesOf.get(root.id) || []} />
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
