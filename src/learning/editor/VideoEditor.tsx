/**
 * Learning Builder — editor del video.
 *
 * Un plano tiene cuatro cosas y las cuatro se escriben a la vez, no en
 * pestañas: cuánto dura, qué se ve, qué se dice y qué aparece rotulado. Por
 * eso cada plano es una fila con sus cuatro campos a la vista — así se
 * detecta lo que a un guion técnico le pasa siempre, que la locución no cabe
 * en los segundos asignados.
 *
 * Esa comprobación está a la izquierda de cada plano: al lado de la duración
 * se muestra lo que tardaría en leerse la locución. Cuando no cuadra, se
 * avisa ahí mismo, que es donde se arregla.
 */
import { useState } from 'react'
import {
  AlertTriangle, ChevronDown, ChevronUp, Clapperboard, Copy, Film, Image as ImageIcon, MessageSquare,
  Plus, Trash2,
} from 'lucide-react'
import type { LbIssue } from '../lib/blocks'
import type { LbDirectives } from '../lib/directives'
import {
  LB_SHOT_KINDS, LB_SHOT_KIND_LABEL, shotStarts, videoSeconds,
  type LbShot, type LbVideoContent,
} from '../lib/video'
import { clock, newLbId } from '../lib/common'
import { CoverFields } from './CoverFields'
import { addCls, fieldCls, move, textareaCls } from './ui'

/** Lo que tarda en leerse una locución en voz alta: unas 150 palabras/minuto. */
function spokenSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.round((words / 150) * 60)
}

export function VideoEditor({
  content,
  directives,
  issues,
  onChange,
  commentsByAnchor,
  onOpenComments,
}: {
  content: LbVideoContent
  directives: LbDirectives
  issues: LbIssue[]
  onChange: (next: LbVideoContent) => void
  commentsByAnchor?: Map<string, { total: number; open: number }>
  onOpenComments?: (anchor: string) => void
}) {
  const [tab, setTab] = useState<'planos' | 'pieza' | 'portada'>('planos')

  const issuesByShot = new Map<string, LbIssue[]>()
  for (const issue of issues) {
    if (!issue.blockId) continue
    issuesByShot.set(issue.blockId, [...(issuesByShot.get(issue.blockId) || []), issue])
  }

  const setShots = (shots: LbShot[]) => onChange({ ...content, shots })
  const patchShot = (id: string, patch: Partial<LbShot>) =>
    setShots(content.shots.map((row) => (row.id === id ? { ...row, ...patch } : row)))

  const starts = shotStarts(content)
  const total = videoSeconds(content)
  const spoken = content.shots.reduce((sum, shot) => sum + spokenSeconds(shot.narration || ''), 0)

  const addShot = (after?: number) => {
    const created: LbShot = {
      id: newLbId('p'),
      title: `Plano ${content.shots.length + 1}`,
      kind: 'broll',
      seconds: 15,
    }
    const shots = [...content.shots]
    shots.splice(after === undefined ? shots.length : after + 1, 0, created)
    setShots(shots)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        {([['planos', 'Planos', Clapperboard], ['pieza', 'Pieza montada', Film], ['portada', 'Portada', ImageIcon]] as const).map(
          ([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold ${
                tab === key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          )
        )}
        <div className="ml-auto flex items-center gap-3 text-[12px] text-slate-500">
          <span>{content.shots.length} planos</span>
          <span className="font-bold text-slate-700">{clock(total)}</span>
          {spoken > 0 && (
            <span className={spoken > total ? 'font-bold text-amber-600' : ''}>
              locución {clock(spoken)}
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {tab === 'portada' && (
          <CoverFields
            cover={content.cover}
            directives={directives}
            onChange={(cover) => onChange({ ...content, cover })}
            withMedia
          />
        )}

        {tab === 'pieza' && <FilmPanel content={content} onChange={onChange} />}

        {tab === 'planos' && (
          <div className="mx-auto max-w-4xl">
            {content.shots.map((shot, index) => (
              <ShotCard
                key={shot.id}
                shot={shot}
                index={index}
                startsAt={starts[index]}
                issues={issuesByShot.get(shot.id) || []}
                requireAlt={directives.instructional.rules.requireImageAlt}
                comments={commentsByAnchor?.get(`block:${shot.id}`)}
                onOpenComments={onOpenComments && (() => onOpenComments(`block:${shot.id}`))}
                onChange={(patch) => patchShot(shot.id, patch)}
                onMove={(delta) => setShots(move(content.shots, index, index + delta))}
                onDuplicate={() => {
                  const copy: LbShot = { ...structuredClone(shot), id: newLbId('p') }
                  const shots = [...content.shots]
                  shots.splice(index + 1, 0, copy)
                  setShots(shots)
                }}
                onRemove={() => setShots(content.shots.filter((row) => row.id !== shot.id))}
                onAddAfter={() => addShot(index)}
              />
            ))}
            <button onClick={() => addShot()} className={`${addCls} mt-3 w-full justify-center py-2.5`}>
              <Plus size={14} /> Añadir plano
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ShotCard({
  shot, index, startsAt, issues, requireAlt, comments, onOpenComments,
  onChange, onMove, onDuplicate, onRemove, onAddAfter,
}: {
  shot: LbShot
  index: number
  startsAt: number
  issues: LbIssue[]
  requireAlt: boolean
  comments?: { total: number; open: number }
  onOpenComments?: () => void
  onChange: (patch: Partial<LbShot>) => void
  onMove: (delta: number) => void
  onDuplicate: () => void
  onRemove: () => void
  onAddAfter: () => void
}) {
  const hasErrors = issues.some((issue) => issue.level === 'error')
  const needs = spokenSeconds(shot.narration || '')
  // Un margen del veinte por ciento: por debajo de eso el aviso sería ruido.
  const tight = needs > 0 && needs > shot.seconds * 1.2

  return (
    <article className={`mb-2 rounded-xl border bg-white ${hasErrors ? 'border-rose-300' : 'border-slate-200'}`}>
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
        <span className="font-mono text-[13px] font-bold text-slate-700">{clock(startsAt)}</span>
        <input
          type="number"
          min={1}
          max={3600}
          value={shot.seconds}
          onChange={(event) => onChange({ seconds: Math.max(1, Number(event.target.value) || 1) })}
          className="w-16 rounded-md border border-slate-200 px-1.5 py-0.5 text-[12.5px]"
          aria-label="Duración en segundos"
        />
        <span className="text-[11.5px] text-slate-400">s</span>
        <select
          value={shot.kind}
          onChange={(event) => onChange({ kind: event.target.value as LbShot['kind'] })}
          className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11.5px] text-slate-600"
        >
          {LB_SHOT_KINDS.map((kind) => <option key={kind} value={kind}>{LB_SHOT_KIND_LABEL[kind]}</option>)}
        </select>

        {tight && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700"
            title="Lo que se dice tarda más de lo que dura el plano"
          >
            <AlertTriangle size={11} /> la locución pide {needs} s
          </span>
        )}

        <div className="flex-1" />

        {!!comments?.total && (
          <button
            onClick={onOpenComments}
            className={`inline-flex items-center gap-0.5 text-[11px] font-bold hover:underline ${
              comments.open ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            <MessageSquare size={11} /> {comments.total}
          </button>
        )}
        <button onClick={() => onMove(-1)} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100" aria-label="Subir"><ChevronUp size={14} /></button>
        <button onClick={() => onMove(1)} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100" aria-label="Bajar"><ChevronDown size={14} /></button>
        <button onClick={onDuplicate} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100" aria-label="Duplicar"><Copy size={14} /></button>
        <button onClick={onRemove} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Eliminar"><Trash2 size={14} /></button>
      </header>

      <div className="grid gap-3 p-3 md:grid-cols-[200px_minmax(0,1fr)]">
        <div className="space-y-2">
          <input
            value={shot.title}
            onChange={(event) => onChange({ title: event.target.value })}
            className={`${fieldCls} font-semibold`}
            placeholder={`Plano ${index + 1}`}
          />
          {shot.still?.url ? (
            <img
              src={shot.still.url}
              alt={shot.still.alt || ''}
              className="aspect-video w-full rounded-lg border border-slate-200 object-cover"
            />
          ) : (
            <div className="grid aspect-video w-full place-items-center rounded-lg border border-dashed border-slate-300 text-[11.5px] text-slate-400">
              Sin fotograma
            </div>
          )}
          <input
            value={shot.still?.url || ''}
            onChange={(event) => onChange({ still: event.target.value ? { url: event.target.value, alt: shot.still?.alt } : undefined })}
            className={`${fieldCls} text-[12.5px]`}
            placeholder="URL del fotograma"
          />
          {shot.still?.url && (
            <input
              value={shot.still.alt || ''}
              onChange={(event) => onChange({ still: { url: shot.still!.url, alt: event.target.value } })}
              className={`${fieldCls} text-[12.5px]`}
              placeholder={requireAlt ? 'Texto alternativo · obligatorio' : 'Texto alternativo'}
            />
          )}
        </div>

        <div className="space-y-2">
          {issues.length > 0 && (
            <ul className="space-y-1 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {issues.map((issue, position) => <li key={position}>{issue.message}</li>)}
            </ul>
          )}
          <label className="block text-[13px]">
            <span className="mb-1 block font-semibold text-slate-600">Qué se ve</span>
            <textarea
              value={shot.visual || ''}
              onChange={(event) => onChange({ visual: event.target.value })}
              rows={2}
              className={textareaCls}
              placeholder="Encuadre, movimiento, qué entra en cuadro."
            />
          </label>
          <label className="block text-[13px]">
            <span className="mb-1 block font-semibold text-slate-600">
              Qué se dice <span className="font-normal text-slate-400">· es también la transcripción</span>
            </span>
            <textarea
              value={shot.narration || ''}
              onChange={(event) => onChange({ narration: event.target.value })}
              rows={3}
              className={textareaCls}
              placeholder="La locución, palabra por palabra."
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={shot.onScreen || ''}
              onChange={(event) => onChange({ onScreen: event.target.value })}
              className={fieldCls}
              placeholder="Rótulo en pantalla"
            />
            <input
              value={shot.notes || ''}
              onChange={(event) => onChange({ notes: event.target.value })}
              className={`${fieldCls} bg-amber-50/50`}
              placeholder="Nota de producción (no se publica)"
            />
          </div>
          <div className="text-right">
            <button onClick={onAddAfter} className="text-[11.5px] font-semibold text-indigo-600 hover:underline">
              + Plano debajo
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function FilmPanel({
  content,
  onChange,
}: {
  content: LbVideoContent
  onChange: (next: LbVideoContent) => void
}) {
  const film = content.film
  const patch = (value: Partial<NonNullable<LbVideoContent['film']>>) => {
    const next = { ...(film || { url: '' }), ...value }
    onChange({ ...content, film: next.url ? next : undefined })
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h3 className="text-[15px] font-black tracking-tight">Pieza montada</h3>
      <p className="text-[13px] text-slate-500">
        Mientras no haya video, el recurso se publica como guion técnico y se puede entregar igual.
        Al pegar la URL, los planos de arriba pasan a ser los capítulos del reproductor: cada uno
        salta al segundo que le corresponde según su duración.
      </p>

      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">URL del video (MP4 o WebM)</span>
        <input
          value={film?.url || ''}
          onChange={(event) => patch({ url: event.target.value })}
          className={fieldCls}
          placeholder="https://…/video.mp4"
        />
      </label>
      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Imagen de espera (póster)</span>
        <input
          value={film?.poster || ''}
          onChange={(event) => patch({ poster: event.target.value })}
          className={fieldCls}
          placeholder="https://…/poster.jpg"
        />
      </label>
      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Subtítulos (archivo .vtt)</span>
        <input
          value={film?.captionsUrl || ''}
          onChange={(event) => patch({ captionsUrl: event.target.value })}
          className={fieldCls}
          placeholder="https://…/subtitulos.vtt"
        />
      </label>

      {film?.url && (
        <video
          key={film.url}
          controls
          poster={film.poster}
          className="w-full rounded-xl border border-slate-200 bg-black"
        >
          <source src={film.url} />
        </video>
      )}
    </div>
  )
}
