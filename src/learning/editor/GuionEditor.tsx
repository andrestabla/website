/**
 * Learning Builder — editor del guion.
 *
 * Izquierda: portada y pantallas (el índice del recurso). Derecha: los bloques
 * de lo seleccionado. La paleta sale de las directivas instruccionales del
 * workspace, así que nunca se puede insertar algo que el cliente no admite: la
 * restricción se ve antes de escribir, no al validar.
 *
 * Cada bloque se muestra como lo verá el estudiante —con el color, la
 * tipografía y el aire del cliente— y el formulario se abre debajo al pulsar
 * «Editar». Es la misma caja que se publica, no una imitación: la pinta el
 * motor de render (BlockPreview), de modo que no pueden separarse.
 */
import { useMemo, useState } from 'react'
import {
  ChevronDown, ChevronUp, Copy, GripVertical, Plus, Trash2, AlertTriangle, Image as ImageIcon,
  MessageSquare, Pencil, Eye,
} from 'lucide-react'
import { BlockPreview } from './BlockPreview'
import {
  LB_BLOCK_SPECS, defaultVariant, newId,
  type LbBlock, type LbBlockType, type LbContent, type LbIssue, type LbItem, type LbLesson,
} from '../lib/blocks'
import type { LbDirectives } from '../lib/directives'

const GROUP_LABEL: Record<string, string> = {
  texto: 'Texto',
  medios: 'Medios',
  interaccion: 'Interacción',
  evaluacion: 'Evaluación',
  estructura: 'Estructura',
}

const ITEM_FIELD_LABEL: Record<string, string> = {
  title: 'Título',
  description: 'Texto',
  media: 'Imagen (URL)',
  kind: 'Tipo de paso',
  date: 'Fecha',
  pileId: 'Categoría',
  correct: 'Correcta',
  match: 'Pareja',
  feedback: 'Retroalimentación',
  back: 'Reverso',
}

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px] focus:border-indigo-500 focus:outline-none'
const areaCls = `${inputCls} leading-relaxed`

function emptyBlock(type: LbBlockType): LbBlock {
  const spec = LB_BLOCK_SPECS[type]
  const block: LbBlock = { id: newId('b'), type }
  const variant = defaultVariant(type)
  if (variant) block.variant = variant
  if (spec.fields.includes('items')) {
    block.items = [{ id: newId('i'), title: '' }, { id: newId('i'), title: '' }]
  }
  if (spec.fields.includes('piles')) {
    block.piles = [{ id: newId('p'), title: 'Categoría A' }, { id: newId('p'), title: 'Categoría B' }]
  }
  return block
}

/** ¿Está el bloque como recién nacido? Entonces se abre en modo edición. */
function isEmptyBlock(block: LbBlock): boolean {
  if (block.text?.trim() || block.caption?.trim() || block.media?.url) return false
  return !(block.items || []).some((item) => item.title?.trim() || item.description?.trim())
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const copy = [...list]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export function GuionEditor({
  content,
  directives,
  issues,
  onChange,
  commentsByAnchor,
  onOpenComments,
}: {
  content: LbContent
  directives: LbDirectives
  issues: LbIssue[]
  onChange: (next: LbContent) => void
  /** Hilos de revisión por ancla; ausente cuando el rol no los ve. */
  commentsByAnchor?: Map<string, { total: number; open: number }>
  /** Abre la revisión en la pieza señalada. */
  onOpenComments?: (anchor: string) => void
}) {
  const instructional = directives.instructional
  const [selected, setSelected] = useState<string>('cover')
  const [palette, setPalette] = useState(false)

  const lesson = useMemo(
    () => content.lessons.find((candidate) => candidate.id === selected) || null,
    [content.lessons, selected]
  )
  const issuesByLesson = useMemo(() => {
    const map = new Map<string, number>()
    for (const issue of issues) {
      if (issue.level !== 'error' || !issue.lessonId) continue
      map.set(issue.lessonId, (map.get(issue.lessonId) || 0) + 1)
    }
    return map
  }, [issues])
  const blockIssues = useMemo(() => {
    const map = new Map<string, LbIssue[]>()
    for (const issue of issues) {
      if (!issue.blockId) continue
      map.set(issue.blockId, [...(map.get(issue.blockId) || []), issue])
    }
    return map
  }, [issues])

  const setLessons = (lessons: LbLesson[]) => onChange({ ...content, lessons })
  const patchLesson = (id: string, patch: Partial<LbLesson>) =>
    setLessons(content.lessons.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  const patchBlocks = (lessonId: string, blocks: LbBlock[]) => patchLesson(lessonId, { blocks })

  const addLesson = () => {
    const created: LbLesson = { id: newId('l'), title: `${instructional.lessonLabel} ${content.lessons.length + 1}`, blocks: [] }
    setLessons([...content.lessons, created])
    setSelected(created.id)
  }

  const removeLesson = (id: string) => {
    const remaining = content.lessons.filter((row) => row.id !== id)
    setLessons(remaining)
    setSelected(remaining[0]?.id || 'cover')
  }

  const addBlock = (type: LbBlockType) => {
    if (!lesson) return
    patchBlocks(lesson.id, [...lesson.blocks, emptyBlock(type)])
    setPalette(false)
  }

  const paletteByGroup = useMemo(() => {
    const groups: Record<string, LbBlockType[]> = {}
    for (const type of instructional.blocks) {
      const group = LB_BLOCK_SPECS[type].group
      ;(groups[group] ||= []).push(type)
    }
    return groups
  }, [instructional.blocks])

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
      {/* Índice */}
      <aside className="border-b border-slate-200 bg-slate-50 p-3 md:border-b-0 md:border-r">
        <button
          onClick={() => setSelected('cover')}
          className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold ${
            selected === 'cover' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'
          }`}
        >
          <ImageIcon size={14} /> Portada
        </button>
        <div className="mb-1 mt-3 px-3 text-[10.5px] font-black uppercase tracking-[0.14em] text-slate-400">
          {instructional.lessonLabel}es
        </div>
        {content.lessons.map((row, index) => {
          const errors = issuesByLesson.get(row.id) || 0
          return (
            <div key={row.id} className="group flex items-center gap-1">
              <button
                onClick={() => setSelected(row.id)}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] ${
                  selected === row.id ? 'bg-indigo-600 font-semibold text-white' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10.5px] font-bold ${
                  selected === row.id ? 'bg-white/20' : 'bg-slate-200 text-slate-500'
                }`}>{index + 1}</span>
                <span className="truncate">{row.title}</span>
                {errors > 0 && <AlertTriangle size={13} className={selected === row.id ? 'text-amber-200' : 'text-amber-500'} />}
                <CommentBadge
                  counts={commentsByAnchor?.get(`lesson:${row.id}`)}
                  onOpen={onOpenComments && (() => onOpenComments(`lesson:${row.id}`))}
                  light={selected === row.id}
                />
              </button>
              <div className="flex shrink-0 opacity-0 transition group-hover:opacity-100">
                <button onClick={() => setLessons(move(content.lessons, index, index - 1))} className="grid h-6 w-5 place-items-center text-slate-400 hover:text-slate-700" aria-label="Subir">
                  <ChevronUp size={13} />
                </button>
                <button onClick={() => setLessons(move(content.lessons, index, index + 1))} className="grid h-6 w-5 place-items-center text-slate-400 hover:text-slate-700" aria-label="Bajar">
                  <ChevronDown size={13} />
                </button>
                <button onClick={() => removeLesson(row.id)} className="grid h-6 w-5 place-items-center text-slate-400 hover:text-rose-600" aria-label="Eliminar">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )
        })}
        <button
          onClick={addLesson}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-[12.5px] font-semibold text-slate-500 hover:bg-white"
        >
          <Plus size={13} /> Añadir {instructional.lessonLabel.toLowerCase()}
        </button>
      </aside>

      {/* Contenido */}
      <div className="min-w-0 overflow-y-auto p-4 sm:p-6">
        {selected === 'cover' ? (
          <CoverEditor content={content} instructional={instructional} onChange={onChange} />
        ) : !lesson ? (
          <div className="grid h-40 place-items-center text-[13px] text-slate-400">Elige una lección.</div>
        ) : (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <label className="text-[13px]">
                <span className="mb-1 block font-semibold text-slate-600">Título de la {instructional.lessonLabel.toLowerCase()}</span>
                <input value={lesson.title} onChange={(e) => patchLesson(lesson.id, { title: e.target.value })} className={inputCls} />
              </label>
              <label className="text-[13px]">
                <span className="mb-1 block font-semibold text-slate-600">Sección que cubre</span>
                <select
                  value={lesson.sectionKey || ''}
                  onChange={(e) => patchLesson(lesson.id, { sectionKey: e.target.value || undefined })}
                  className={inputCls}
                >
                  <option value="">Sin sección</option>
                  {instructional.sections.map((section) => (
                    <option key={section.key} value={section.key}>
                      {section.title}{section.required ? ' (obligatoria)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-3">
              {lesson.blocks.map((block, index) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  index={index}
                  directives={directives}
                  issues={blockIssues.get(block.id) || []}
                  comments={commentsByAnchor?.get(`block:${block.id}`)}
                  onOpenComments={onOpenComments && (() => onOpenComments(`block:${block.id}`))}
                  onChange={(next) => patchBlocks(lesson.id, lesson.blocks.map((row) => (row.id === block.id ? next : row)))}
                  onMove={(delta) => patchBlocks(lesson.id, move(lesson.blocks, index, index + delta))}
                  onDuplicate={() => {
                    const copy = { ...structuredClone(block), id: newId('b') }
                    const blocks = [...lesson.blocks]
                    blocks.splice(index + 1, 0, copy)
                    patchBlocks(lesson.id, blocks)
                  }}
                  onRemove={() => patchBlocks(lesson.id, lesson.blocks.filter((row) => row.id !== block.id))}
                />
              ))}
            </div>

            <div className="mt-4">
              {palette ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-indigo-600">Bloques de este cliente</span>
                    <button onClick={() => setPalette(false)} className="text-[12.5px] font-semibold text-slate-500 hover:text-slate-800">Cerrar</button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(paletteByGroup).map(([group, types]) => (
                      <div key={group}>
                        <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">{GROUP_LABEL[group]}</div>
                        <div className="space-y-1">
                          {types.map((type) => (
                            <button
                              key={type}
                              onClick={() => addBlock(type)}
                              title={LB_BLOCK_SPECS[type].hint}
                              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-[13px] font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
                            >
                              {LB_BLOCK_SPECS[type].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setPalette(true)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-[13px] font-semibold text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
                >
                  <Plus size={15} /> Añadir bloque
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CoverEditor({
  content,
  instructional,
  onChange,
}: {
  content: LbContent
  instructional: LbDirectives['instructional']
  onChange: (next: LbContent) => void
}) {
  const cover = content.cover || {}
  const patch = (value: Partial<typeof cover>) => onChange({ ...content, cover: { ...cover, ...value } })
  const outcomes = cover.outcomes || []

  return (
    <div className="max-w-2xl space-y-4">
      <h3 className="text-[15px] font-black tracking-tight">Portada</h3>
      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Antetítulo</span>
        <input value={cover.kicker || ''} onChange={(e) => patch({ kicker: e.target.value })} className={inputCls} placeholder="Nombre del curso o de la unidad" />
      </label>
      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Título</span>
        <input value={cover.title || ''} onChange={(e) => patch({ title: e.target.value })} className={inputCls} />
      </label>
      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Subtítulo</span>
        <input value={cover.subtitle || ''} onChange={(e) => patch({ subtitle: e.target.value })} className={inputCls} />
      </label>
      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">
          Presentación {instructional.rules.requireCoverSummary && <em className="not-italic text-rose-500">· obligatoria</em>}
        </span>
        <textarea value={cover.summary || ''} onChange={(e) => patch({ summary: e.target.value })} rows={4} className={areaCls} />
      </label>
      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Imagen de portada (URL)</span>
        <input
          value={cover.media?.url || ''}
          onChange={(e) => patch({ media: e.target.value ? { url: e.target.value, alt: cover.media?.alt } : undefined })}
          className={inputCls}
          placeholder="https://…"
        />
      </label>
      {cover.media?.url && (
        <label className="block text-[13px]">
          <span className="mb-1 block font-semibold text-slate-600">
            Texto alternativo {instructional.rules.requireImageAlt && <em className="not-italic text-rose-500">· obligatorio</em>}
          </span>
          <input value={cover.media?.alt || ''} onChange={(e) => patch({ media: { url: cover.media!.url, alt: e.target.value } })} className={inputCls} />
        </label>
      )}

      <div className="text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">
          Resultados de aprendizaje {instructional.rules.requireOutcomes && <em className="not-italic text-rose-500">· obligatorios</em>}
        </span>
        <div className="space-y-2">
          {outcomes.map((outcome, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={outcome}
                onChange={(e) => patch({ outcomes: outcomes.map((row, i) => (i === index ? e.target.value : row)) })}
                className={inputCls}
              />
              <button
                onClick={() => patch({ outcomes: outcomes.filter((_, i) => i !== index) })}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Quitar resultado"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => patch({ outcomes: [...outcomes, ''] })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-50"
          >
            <Plus size={13} /> Añadir resultado
          </button>
        </div>
      </div>
    </div>
  )
}

/** Cuántos hilos de revisión tiene una pieza; abre la revisión al pulsarlo. */
function CommentBadge({
  counts,
  onOpen,
  light,
}: {
  counts?: { total: number; open: number }
  onOpen?: () => void
  light?: boolean
}) {
  if (!counts?.total) return null
  const tone = counts.open
    ? light ? 'text-amber-200' : 'text-amber-600'
    : light ? 'text-emerald-200' : 'text-emerald-600'
  const label = `${counts.total} comentario(s)${counts.open ? `, ${counts.open} sin atender` : ', todos atendidos'}`
  const inner = (
    <>
      <MessageSquare size={12} /> {counts.total}
    </>
  )
  if (!onOpen) {
    return <span className={`inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold ${tone}`} title={label}>{inner}</span>
  }
  return (
    <span
      role="button"
      tabIndex={0}
      title={label}
      aria-label={label}
      onClick={(event) => { event.stopPropagation(); onOpen() }}
      onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); onOpen() } }}
      className={`inline-flex shrink-0 cursor-pointer items-center gap-0.5 text-[11px] font-bold hover:underline ${tone}`}
    >
      {inner}
    </span>
  )
}

function BlockCard({
  block,
  index,
  directives,
  issues,
  comments,
  onOpenComments,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  block: LbBlock
  index: number
  directives: LbDirectives
  issues: LbIssue[]
  comments?: { total: number; open: number }
  onOpenComments?: () => void
  onChange: (next: LbBlock) => void
  onMove: (delta: number) => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const spec = LB_BLOCK_SPECS[block.type]
  // Un bloque recién puesto se abre solo: nadie añade una caja para mirarla.
  const [editing, setEditing] = useState(() => isEmptyBlock(block))
  const patch = (value: Partial<LbBlock>) => onChange({ ...block, ...value })
  const items = block.items || []
  const setItems = (next: LbItem[]) => patch({ items: next })
  // En emparejar y completar el propio ítem cambia de papel, así que la etiqueta lo sigue.
  const itemFields = (spec.itemFields || []).filter((field) => {
    if (block.type !== 'check') return true
    if (block.variant === 'matching') return field === 'title' || field === 'match'
    if (block.variant === 'fillin') return field === 'title'
    return field !== 'match'
  })

  return (
    <article className={`rounded-xl border bg-white ${issues.some((i) => i.level === 'error') ? 'border-rose-300' : 'border-slate-200'}`}>
      <header className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <GripVertical size={14} className="text-slate-300" />
        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{spec.label}</span>
        {spec.variants && (
          <select
            value={block.variant || spec.variants[0].value}
            onChange={(e) => patch({ variant: e.target.value })}
            className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11.5px] text-slate-600"
          >
            {spec.variants.map((variant) => <option key={variant.value} value={variant.value}>{variant.label}</option>)}
          </select>
        )}
        <div className="flex-1" />
        <CommentBadge counts={comments} onOpen={onOpenComments} />
        <button
          onClick={() => setEditing((value) => !value)}
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-bold ${
            editing ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {editing ? <><Eye size={12} /> Ver</> : <><Pencil size={12} /> Editar</>}
        </button>
        <button onClick={() => onMove(-1)} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100" aria-label="Subir bloque"><ChevronUp size={14} /></button>
        <button onClick={() => onMove(1)} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100" aria-label="Bajar bloque"><ChevronDown size={14} /></button>
        <button onClick={onDuplicate} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100" aria-label="Duplicar bloque"><Copy size={14} /></button>
        <button onClick={onRemove} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Eliminar bloque"><Trash2 size={14} /></button>
      </header>

      {!editing && issues.length > 0 && (
        <ul className="space-y-1 border-b border-rose-100 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {issues.map((issue, position) => <li key={position}>{issue.message}</li>)}
        </ul>
      )}

      {!editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Editar este bloque"
          className="block w-full cursor-text p-4 text-left"
        >
          <BlockPreview block={block} index={index} directives={directives} />
        </button>
      )}

      <div className={`space-y-3 p-3 ${editing ? '' : 'hidden'}`}>
        {issues.length > 0 && (
          <ul className="space-y-1 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {issues.map((issue, position) => <li key={position}>{issue.message}</li>)}
          </ul>
        )}

        {spec.fields.includes('text') && (
          block.type === 'heading' || block.type === 'continue' || block.type === 'table' ? (
            <input
              value={block.text || ''}
              onChange={(e) => patch({ text: e.target.value })}
              className={inputCls}
              placeholder={block.type === 'table' ? 'Encabezados separados por |' : block.type === 'continue' ? 'Continuar' : 'Escribe el título'}
            />
          ) : (
            <textarea
              value={block.text || ''}
              onChange={(e) => patch({ text: e.target.value })}
              rows={block.type === 'paragraph' ? 5 : 3}
              className={areaCls}
              placeholder={block.type === 'check' ? 'Enunciado de la comprobación' : spec.hint}
            />
          )
        )}

        {spec.fields.includes('media') && (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={block.media?.url || ''}
              onChange={(e) => patch({ media: e.target.value ? { url: e.target.value, alt: block.media?.alt } : undefined })}
              className={inputCls}
              placeholder={block.type === 'video' ? 'URL de YouTube, Vimeo o MP4' : 'URL de la imagen'}
            />
            {block.type === 'image' && (
              <input
                value={block.media?.alt || ''}
                onChange={(e) => patch({ media: { url: block.media?.url || '', alt: e.target.value } })}
                className={inputCls}
                placeholder="Texto alternativo"
              />
            )}
          </div>
        )}

        {spec.fields.includes('caption') && (
          <input
            value={block.caption || ''}
            onChange={(e) => patch({ caption: e.target.value })}
            className={inputCls}
            placeholder={block.type === 'quote' ? 'Fuente (APA)' : block.type === 'note' ? 'Título del recuadro' : 'Pie o nota'}
          />
        )}

        {spec.fields.includes('piles') && (
          <div>
            <div className="mb-1.5 text-[11.5px] font-semibold text-slate-500">Categorías</div>
            <div className="flex flex-wrap gap-2">
              {(block.piles || []).map((pile, index) => (
                <div key={pile.id} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1">
                  <input
                    value={pile.title}
                    onChange={(e) => patch({ piles: (block.piles || []).map((row, i) => (i === index ? { ...row, title: e.target.value } : row)) })}
                    className="w-32 text-[13px] outline-none"
                  />
                  <button
                    onClick={() => patch({ piles: (block.piles || []).filter((_, i) => i !== index) })}
                    className="text-slate-300 hover:text-rose-600"
                    aria-label="Quitar categoría"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => patch({ piles: [...(block.piles || []), { id: newId('p'), title: 'Nueva categoría' }] })}
                className="rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-50"
              >
                + Categoría
              </button>
            </div>
          </div>
        )}

        {spec.fields.includes('items') && (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-2.5">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {spec.itemLabel || 'Elemento'} {index + 1}
                  </span>
                  <div className="flex-1" />
                  <button onClick={() => setItems(move(items, index, index - 1))} className="text-slate-300 hover:text-slate-600" aria-label="Subir"><ChevronUp size={13} /></button>
                  <button onClick={() => setItems(move(items, index, index + 1))} className="text-slate-300 hover:text-slate-600" aria-label="Bajar"><ChevronDown size={13} /></button>
                  <button onClick={() => setItems(items.filter((_, i) => i !== index))} className="text-slate-300 hover:text-rose-600" aria-label="Quitar"><Trash2 size={13} /></button>
                </div>
                <div className="space-y-2">
                  {itemFields.map((field) => {
                    const update = (value: unknown) => setItems(items.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
                    if (field === 'correct') {
                      return (
                        <label key={field} className="flex items-center gap-2 text-[13px] text-slate-600">
                          <input
                            type={block.variant === 'multiple' ? 'checkbox' : 'radio'}
                            name={`correct-${block.id}`}
                            checked={!!item.correct}
                            onChange={(e) => {
                              if (block.variant === 'multiple') update(e.target.checked)
                              else setItems(items.map((row, i) => ({ ...row, correct: i === index })))
                            }}
                            className="h-4 w-4 accent-emerald-600"
                          />
                          Respuesta correcta
                        </label>
                      )
                    }
                    if (field === 'pileId') {
                      return (
                        <select key={field} value={item.pileId || ''} onChange={(e) => update(e.target.value)} className={inputCls}>
                          <option value="">Sin categoría</option>
                          {(block.piles || []).map((pile) => <option key={pile.id} value={pile.id}>{pile.title}</option>)}
                        </select>
                      )
                    }
                    if (field === 'kind') {
                      return (
                        <select key={field} value={item.kind || 'step'} onChange={(e) => update(e.target.value)} className={inputCls}>
                          <option value="intro">Introducción</option>
                          <option value="step">Paso</option>
                          <option value="summary">Síntesis</option>
                        </select>
                      )
                    }
                    if (field === 'media') {
                      return (
                        <input
                          key={field}
                          value={item.media?.url || ''}
                          onChange={(e) => update(e.target.value ? { url: e.target.value } : undefined)}
                          className={inputCls}
                          placeholder="URL de la imagen"
                        />
                      )
                    }
                    if (field === 'description' || field === 'back') {
                      return (
                        <textarea
                          key={field}
                          value={(item[field] as string) || ''}
                          onChange={(e) => update(e.target.value)}
                          rows={3}
                          className={areaCls}
                          placeholder={ITEM_FIELD_LABEL[field]}
                        />
                      )
                    }
                    return (
                      <input
                        key={field}
                        value={(item[field] as string) || ''}
                        onChange={(e) => update(e.target.value)}
                        className={inputCls}
                        placeholder={
                          block.type === 'check' && block.variant === 'fillin' && field === 'title'
                            ? 'Respuesta aceptada'
                            : ITEM_FIELD_LABEL[field]
                        }
                      />
                    )
                  })}
                </div>
              </div>
            ))}
            <button
              onClick={() => setItems([...items, { id: newId('i'), title: '' }])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-50"
            >
              <Plus size={13} /> Añadir {(spec.itemLabel || 'elemento').toLowerCase()}
            </button>
          </div>
        )}

        {spec.fields.includes('required') && (
          <label className="flex items-center gap-2 text-[13px] text-slate-600">
            <input type="checkbox" checked={!!block.required} onChange={(e) => patch({ required: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
            Exigir acierto para dar la lección por vista
          </label>
        )}
      </div>
    </article>
  )
}
