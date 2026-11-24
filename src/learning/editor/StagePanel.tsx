/**
 * Learning Builder — panel de una etapa de documento: texto plano o guion.
 *
 * A la izquierda, el documento tal como se lee (su Word o su PowerPoint
 * convertido a página); a la derecha, lo que se ha dicho de él. Arriba, lo que
 * se hace con él: subir una versión nueva, descargar el original, publicarlo
 * por su enlace y abrir la revisión para señalar el párrafo o la caja exacta.
 *
 * Los hilos se abren señalando sobre el documento, en la página de revisión
 * —la misma que recibe el cliente—; aquí el equipo los lee, responde y los da
 * por atendidos, y puede dejar además un comentario general.
 */
import { useMemo, useRef, useState } from 'react'
import {
  CheckCircle2, Copy, CornerDownRight, Crosshair, Download, ExternalLink, FileText, Globe, Loader2,
  MessageSquare, Presentation, RefreshCw, RotateCcw, Trash2, Upload, UserRound,
} from 'lucide-react'
import { useDialogs } from '../../cotizador/ui/dialogs'
import { learningApi, timeAgo, toBase64, type CommentRow, type StagesPayload } from '../lib/api'
import { describeTarget } from '../lib/review'
import { can, type LbRole } from '../lib/roles'
import {
  LB_DOC_STAGE_FORMATS, stageAnchor, stageFormatOf, type LbDocStage, type LbStageSpec, type LbStageState,
} from '../lib/stages'

const MAX_DOC_MB = 40

type Props = {
  resourceId: string
  spec: LbStageSpec
  state: LbStageState | undefined
  role: LbRole
  /** Los hilos de esta etapa, raíces y respuestas. */
  comments: CommentRow[]
  onStages: (payload: StagesPayload) => void
  reloadComments: () => Promise<void> | void
  archived: boolean
}

export function StagePanel({ resourceId, spec, state, role, comments, onStages, reloadComments, archived }: Props) {
  const stage = spec.doc as LbDocStage
  const { confirm, prompt, dialogs } = useDialogs()
  const fileRef = useRef<HTMLInputElement>(null)
  const editable = can(role, 'resource.edit')
  const maySeeComments = can(role, 'comment.view')
  const mayComment = can(role, 'comment.create')
  const mayResolve = can(role, 'comment.resolve')
  const mayShare = can(role, 'resource.share')

  const docs = state?.docs || []
  const live = docs[0]
  const [viewing, setViewing] = useState(0) // 0 = la vigente
  const doc = docs.find((row) => row.version === viewing) || live

  const [uploading, setUploading] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState(false)
  const [general, setGeneral] = useState('')
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [onlyOpen, setOnlyOpen] = useState(false)

  const accept = LB_DOC_STAGE_FORMATS[stage].map((format) => `.${format}`).join(',')
  const formatsLabel = LB_DOC_STAGE_FORMATS[stage].map((format) => (format === 'docx' ? 'Word (.docx)' : 'PowerPoint (.pptx)')).join(' o ')
  const reviewUrl = state?.reviewToken ? `${window.location.origin}/revision/${state.reviewToken}` : ''

  const roots = useMemo(() => comments.filter((row) => !row.parentId), [comments])
  const repliesOf = useMemo(() => {
    const map = new Map<string, CommentRow[]>()
    for (const row of comments) if (row.parentId) map.set(row.parentId, [...(map.get(row.parentId) || []), row])
    return map
  }, [comments])
  const shown = roots
    .filter((row) => !doc || (row.version ?? doc.version) === doc.version)
    .filter((row) => !onlyOpen || row.status === 'OPEN')
  const openHere = roots.filter((row) => doc && (row.version ?? doc.version) === doc.version && row.status === 'OPEN').length

  const upload = async (file: File) => {
    setError('')
    if (!LB_DOC_STAGE_FORMATS[stage].includes(stageFormatOf(file.name))) {
      setError(`«${file.name}» no es un formato admitido: sube un ${formatsLabel}.`)
      return
    }
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      setError(`«${file.name}» pesa más de ${MAX_DOC_MB} MB.`)
      return
    }
    // A partir de la segunda versión conviene decir qué cambió: es lo primero
    // que lee quien vuelve a revisar.
    let notes = ''
    if (live) {
      const answer = await prompt(
        `Se abrirá la V${live.version + 1} y la V${live.version} quedará guardada con sus comentarios.\n\n¿Qué cambió en esta versión?`,
        '',
        { title: 'Nueva versión', placeholder: 'p. ej. Se atendieron las observaciones del experto', okLabel: 'Subir versión' }
      )
      if (answer === null) return
      notes = answer
    }
    setUploading('Preparando…')
    try {
      const buffer = new Uint8Array(await file.arrayBuffer())
      const begin = await learningApi.importPkg.begin(resourceId, buffer.length)
      const size = begin.maxPartBytes
      const parts = Math.ceil(buffer.length / size)
      for (let index = 0; index < parts; index += 1) {
        setUploading(`Subiendo ${index + 1} de ${parts}…`)
        await learningApi.importPkg.part(resourceId, begin.uploadId, index, toBase64(buffer.subarray(index * size, (index + 1) * size)))
      }
      setUploading('Convirtiendo el documento…')
      onStages(await learningApi.stages.ingest(resourceId, stage, begin.uploadId, parts, file.name, notes))
      setViewing(0)
    } catch (caught: any) {
      setError(caught?.message || 'No se pudo subir el documento')
    } finally {
      setUploading('')
    }
  }

  const run = async (key: string, task: () => Promise<unknown>) => {
    setBusy(key); setError('')
    try { await task() } catch (caught: any) { setError(caught?.message || 'No se pudo completar') } finally { setBusy('') }
  }

  const setPublished = (published: boolean, rotate = false) =>
    run('publish', async () => onStages(await learningApi.stages.publish(resourceId, stage, published, rotate)))

  const removeVersion = async () => {
    if (!doc) return
    const ok = await confirm(
      `¿Borrar la V${doc.version} de ${spec.label.toLowerCase()}?\n\nSe borra el documento «${doc.fileName}» y los comentarios hechos sobre esa versión. No se puede deshacer.`,
      { title: 'Borrar versión', okLabel: 'Borrar', danger: true }
    )
    if (!ok) return
    await run('remove', async () => {
      onStages(await learningApi.stages.remove(resourceId, stage, doc.version))
      setViewing(0)
      await reloadComments()
    })
  }

  const comment = (key: string, body: string, parentId?: string) =>
    run(key, async () => {
      if (!body.trim()) return
      await learningApi.comments.create(resourceId, { anchor: stageAnchor(stage), body: body.trim(), parentId })
      if (parentId) setReplies((prev) => ({ ...prev, [parentId]: '' }))
      else setGeneral('')
      await reloadComments()
    })

  const resolve = (row: CommentRow) =>
    run(row.id, async () => { await learningApi.comments.resolve(resourceId, row.id, row.status === 'OPEN'); await reloadComments() })

  const remove = async (row: CommentRow) => {
    const ok = await confirm(row.parentId ? '¿Borrar esta respuesta?' : '¿Borrar este comentario y sus respuestas?', { okLabel: 'Borrar', danger: true })
    if (!ok) return
    await run(row.id, async () => { await learningApi.comments.remove(resourceId, row.id); await reloadComments() })
  }

  const picker = (
    <input
      ref={fileRef}
      type="file"
      accept={accept}
      className="hidden"
      onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = '' }}
    />
  )

  // ── Sin documento todavía ──
  if (!doc) {
    return (
      <div className="grid h-full min-h-[60vh] place-items-center p-6">
        {dialogs}{picker}
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
            <FileText size={24} />
          </div>
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-600">
            Etapa {spec.n}{spec.optional ? ' · opcional' : ''}
          </div>
          <h3 className="mt-1 text-[17px] font-black tracking-tight">{spec.label}</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">{spec.hint}</p>
          {spec.optional && (
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">
              No todos los recursos la tienen: aplica cuando hubo una primera fase de escritura del contenido. Si este
              recurso empezó en el guion, déjala vacía.
            </p>
          )}
          {editable ? (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={!!uploading}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-[13.5px] font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {uploading || 'Subir el documento'}
              </button>
              <p className="mt-3 text-[11.5px] text-slate-400">{formatsLabel}. Hasta {MAX_DOC_MB} MB.</p>
            </>
          ) : (
            <p className="mt-4 text-[12.5px] font-semibold text-slate-400">Todavía no se ha subido.</p>
          )}
          {error && <p className="mt-3 text-[12.5px] font-semibold text-rose-600">{error}</p>}
        </div>
      </div>
    )
  }

  const isLive = doc.version === live.version
  const unitLabel = doc.format === 'pptx' ? `${doc.units} pantalla(s)` : doc.units ? `${doc.units} apartado(s)` : ''
  const DocIcon = doc.format === 'pptx' ? Presentation : FileText

  const renderComment = (row: CommentRow) => (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-[12.5px] font-bold text-slate-800">{row.authorName || 'Sin nombre'}</span>
        {row.guest && (
          <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-px text-[10.5px] font-semibold text-sky-700" title={row.guest.email}>
            <UserRound size={10} /> {row.guest.org || 'Revisión externa'}
          </span>
        )}
        <span className="text-[11px] text-slate-400">{timeAgo(row.createdAt)}</span>
        <div className="flex-1" />
        {row.canDelete && (
          <button onClick={() => remove(row)} className="text-slate-300 hover:text-rose-600" aria-label="Borrar comentario">
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-700">{row.body}</p>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-150px)] min-h-[520px] flex-col">
      {dialogs}{picker}

      {/* Qué documento es y qué se hace con él */}
      <div className="shrink-0 space-y-2 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <DocIcon size={16} className="shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-bold text-slate-800" title={doc.fileName}>{doc.fileName}</div>
            <div className="truncate text-[11.5px] text-slate-400">
              {[unitLabel, `${(doc.bytes / 1024 / 1024).toFixed(1)} MB`, `subido ${timeAgo(doc.createdAt)}`, doc.createdByName ? `por ${doc.createdByName}` : '']
                .filter(Boolean).join(' · ')}
            </div>
          </div>
          {docs.length > 1 ? (
            <select
              value={doc.version}
              onChange={(event) => setViewing(Number(event.target.value) === live.version ? 0 : Number(event.target.value))}
              aria-label="Versión del documento"
              className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] font-bold ${isLive ? 'border-slate-300 text-slate-700' : 'border-amber-400 bg-amber-50 text-amber-900'}`}
            >
              {docs.map((row) => <option key={row.version} value={row.version}>V{row.version}{row.live ? ' · vigente' : ''}</option>)}
            </select>
          ) : (
            <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] font-bold text-slate-600">V{doc.version}</span>
          )}
          <a
            href={learningApi.stages.downloadUrl(resourceId, stage, doc.version)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100"
          >
            <Download size={13} /> Original
          </a>
          {editable && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={!!uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} {uploading || 'Nueva versión'}
            </button>
          )}
          {reviewUrl && mayComment && (
            <a
              href={reviewUrl}
              target="_blank"
              rel="noreferrer"
              title="Abre el documento para señalar el párrafo, la celda o la caja exacta que quieres comentar"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-indigo-500"
            >
              <Crosshair size={13} /> Señalar y comentar
            </a>
          )}
          {editable && (
            <button onClick={removeVersion} disabled={busy === 'remove'} className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600" aria-label="Borrar esta versión">
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {mayShare && !archived && (
          <div className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${state?.published ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`}>
            <Globe size={14} className={state?.published ? 'text-emerald-600' : 'text-slate-400'} />
            <label className="inline-flex items-center gap-2 text-[12.5px] font-bold text-slate-700">
              <input
                type="checkbox"
                checked={!!state?.published}
                disabled={busy === 'publish'}
                onChange={(event) => setPublished(event.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              {state?.published ? 'Publicado' : 'Publicar'}
            </label>
            {state?.published && reviewUrl ? (
              <>
                <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2.5 py-1 text-[12px] text-slate-600">{reviewUrl}</code>
                <button
                  onClick={() => { void navigator.clipboard.writeText(reviewUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {copied ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />} Copiar
                </button>
                <a href={reviewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-100">
                  <ExternalLink size={13} /> Abrir
                </a>
                <button
                  onClick={() => setPublished(true, true)}
                  disabled={busy === 'publish'}
                  title="El enlace anterior deja de funcionar"
                  className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800 hover:underline"
                >
                  <RefreshCw size={11} /> Generar otro
                </button>
              </>
            ) : (
              <span className="min-w-0 flex-1 text-[12px] leading-snug text-slate-500">
                Abre un enlace propio de {spec.label.toLowerCase()}: quien lo recibe se identifica, lo lee y comenta sobre él.
                Es distinto del enlace del recurso, que lleva siempre a la pieza final.
              </span>
            )}
          </div>
        )}

        {!isLive && (
          <div className="rounded-lg bg-amber-100 px-3 py-1.5 text-[12.5px] font-semibold text-amber-900">
            Estás viendo la V{doc.version}, una versión anterior, con sus comentarios.{' '}
            <button onClick={() => setViewing(0)} className="underline">Ir a la V{live.version}</button>
          </div>
        )}
        {isLive && doc.notes && docs.length > 1 && (
          <div className="rounded-lg bg-indigo-50 px-3 py-1.5 text-[12.5px] text-indigo-900"><b>Novedades de la V{doc.version}:</b> {doc.notes}</div>
        )}
        {doc.warnings.length > 0 && (
          <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-[12px] leading-snug text-amber-800">
            {doc.warnings.join(' ')} El original se descarga completo.
          </div>
        )}
        {error && <div className="rounded-lg bg-rose-50 px-3 py-1.5 text-[12.5px] font-semibold text-rose-700">{error}</div>}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <iframe
          key={`${stage}-${doc.version}`}
          src={learningApi.stages.previewUrl(resourceId, stage, doc.version)}
          title={`${spec.label} · V${doc.version}`}
          className="min-h-[50vh] w-full flex-1 border-0 bg-slate-100 lg:min-h-0"
        />

        {maySeeComments && (
          <aside className="flex max-h-[50vh] w-full shrink-0 flex-col border-t border-slate-200 bg-white [overflow-wrap:anywhere] lg:max-h-none lg:w-[360px] lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <MessageSquare size={14} className="text-slate-400" />
              <span className="text-[12.5px] font-bold text-slate-700">Comentarios de la V{doc.version}</span>
              <div className="flex-1" />
              <button
                onClick={() => setOnlyOpen((value) => !value)}
                className={`rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${onlyOpen ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {openHere} abierto(s)
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {shown.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-[12.5px] leading-relaxed text-slate-400">
                  {onlyOpen ? 'No queda ningún hilo abierto en esta versión.' : (
                    <>Nadie ha comentado esta versión. Con <b className="text-slate-600">Señalar y comentar</b> se marca el punto exacto del documento.</>
                  )}
                </div>
              )}
              {shown.map((root) => (
                <div key={root.id} className={`rounded-xl border p-3 ${root.status === 'RESOLVED' ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'}`}>
                  <div className="mb-1.5 flex items-start gap-2 text-[11.5px] leading-snug text-slate-500">
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-700">{root.target ? describeTarget(root.target) : 'Comentario general'}</span>
                      {root.target?.section && <span> · {root.target.section}</span>}
                    </span>
                    {mayResolve || root.canEdit ? (
                      <button
                        onClick={() => resolve(root)}
                        disabled={busy === root.id}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                          root.status === 'RESOLVED' ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-100' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <CheckCircle2 size={11} /> {root.status === 'RESOLVED' ? 'Atendido · reabrir' : 'Dar por atendido'}
                      </button>
                    ) : root.status === 'RESOLVED' ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 size={11} /> Atendido</span>
                    ) : null}
                  </div>
                  {renderComment(root)}
                  {(repliesOf.get(root.id) || []).map((child) => (
                    <div key={child.id} className="mt-2 flex gap-2 border-l-2 border-slate-100 pl-2.5">
                      <CornerDownRight size={12} className="mt-1 shrink-0 text-slate-300" />
                      <div className="min-w-0 flex-1">{renderComment(child)}</div>
                    </div>
                  ))}
                  {mayComment && (
                    <div className="mt-2 flex gap-1.5">
                      <input
                        value={replies[root.id] || ''}
                        onChange={(event) => setReplies((prev) => ({ ...prev, [root.id]: event.target.value }))}
                        onKeyDown={(event) => { if (event.key === 'Enter') void comment(root.id, replies[root.id] || '', root.id) }}
                        placeholder="Responder…"
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px]"
                      />
                      <button
                        onClick={() => comment(root.id, replies[root.id] || '', root.id)}
                        disabled={busy === root.id || !(replies[root.id] || '').trim()}
                        className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[12px] font-bold text-white disabled:opacity-40"
                      >
                        Enviar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {mayComment && isLive && (
              <div className="border-t border-slate-100 p-3">
                <textarea
                  value={general}
                  onChange={(event) => setGeneral(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void comment('general', general) }}
                  rows={2}
                  placeholder={`Comentario general sobre ${spec.label.toLowerCase()}…`}
                  className="w-full resize-none rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] focus:border-indigo-500 focus:outline-none"
                />
                <button
                  onClick={() => comment('general', general)}
                  disabled={busy === 'general' || !general.trim()}
                  className="mt-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-40"
                >
                  Comentar
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
