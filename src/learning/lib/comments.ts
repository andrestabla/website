/**
 * Learning Builder · anclaje de los comentarios.
 *
 * Un comentario del auditor no cuelga del recurso entero: cuelga de la pieza
 * concreta que revisa. El ancla es una cadena corta y estable que nombra esa
 * pieza, y con ella el editor sabe exactamente dónde mirar.
 *
 *   resource              → el recurso completo
 *   cover                 → la portada
 *   cover.title           → un campo suelto de la portada
 *   lesson:<id>           → una lección o pantalla
 *   block:<id>            → un bloque: texto, imagen, interactivo, comprobación…
 *
 * Junto al ancla se guarda una etiqueta del momento en que se escribió. Si
 * después borran el bloque, el hilo no queda huérfano ni mudo: sigue diciendo
 * sobre qué se habló, y la UI lo marca como pieza desaparecida.
 *
 * Lo importa la UI y también el API, así que no puede depender de React.
 */
import { LB_BLOCK_SPECS, type LbContent, type LbBlock } from './blocks.js'
import type { LbAnchorKind, LbAnchorTarget } from './common.js'

export type { LbAnchorKind, LbAnchorTarget }

export type LbAnchor = {
  /** La cadena tal como se guarda. */
  key: string
  kind: LbAnchorKind
  /** Id de la lección o del bloque, cuando aplica. */
  id?: string
  /** Campo de la portada, cuando aplica. */
  field?: string
}

export const COVER_FIELDS: Array<{ field: string; label: string }> = [
  { field: 'title', label: 'Título' },
  { field: 'kicker', label: 'Antetítulo' },
  { field: 'subtitle', label: 'Subtítulo' },
  { field: 'summary', label: 'Presentación' },
  { field: 'media', label: 'Imagen de portada' },
  { field: 'outcomes', label: 'Resultados de aprendizaje' },
]

export function parseAnchor(raw: unknown): LbAnchor {
  const key = typeof raw === 'string' ? raw.trim().slice(0, 80) : ''
  if (key.startsWith('lesson:')) {
    const id = key.slice(7).replace(/[^a-zA-Z0-9_-]/g, '')
    if (id) return { key: `lesson:${id}`, kind: 'lesson', id }
  }
  if (key.startsWith('block:')) {
    const id = key.slice(6).replace(/[^a-zA-Z0-9_-]/g, '')
    if (id) return { key: `block:${id}`, kind: 'block', id }
  }
  if (key.startsWith('cover.')) {
    const field = key.slice(6).replace(/[^a-zA-Z]/g, '')
    if (COVER_FIELDS.some((candidate) => candidate.field === field)) {
      return { key: `cover.${field}`, kind: 'coverField', field }
    }
  }
  if (key === 'cover') return { key: 'cover', kind: 'cover' }
  return { key: 'resource', kind: 'resource' }
}

/** Texto corto de un bloque, para reconocerlo en la lista de revisión. */
export function blockPreview(block: LbBlock): string {
  const plain = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
  const direct = plain(block.text) || plain(block.caption)
  if (direct) return direct.slice(0, 120)
  const first = (block.items || []).find((item) => item.title || item.description)
  if (first) return plain(first.title || first.description).slice(0, 120)
  if (block.media?.url) return plain(block.media.alt) || 'Imagen sin texto alternativo'
  return 'Sin contenido todavía'
}

/**
 * Recorre el recurso y devuelve, en orden de lectura, cada pieza comentable.
 * Es la lista que ve el auditor y la que usa el editor para saber qué le
 * señalaron.
 */
export function anchorTargets(content: LbContent, lessonLabel = 'Lección'): LbAnchorTarget[] {
  const targets: LbAnchorTarget[] = [
    { anchor: 'resource', kind: 'resource', label: 'El recurso completo', depth: 0 },
    { anchor: 'cover', kind: 'cover', label: 'Portada', preview: content.cover?.title || '', depth: 1 },
  ]

  for (const { field, label } of COVER_FIELDS) {
    const raw = (content.cover as Record<string, any> | undefined)?.[field]
    const preview =
      field === 'media' ? raw?.url || '' : Array.isArray(raw) ? raw.join(' · ') : String(raw ?? '')
    targets.push({
      anchor: `cover.${field}`,
      kind: 'coverField',
      label,
      preview: preview.slice(0, 120),
      depth: 2,
    })
  }

  content.lessons.forEach((lesson, index) => {
    targets.push({
      anchor: `lesson:${lesson.id}`,
      kind: 'lesson',
      label: `${lessonLabel} ${index + 1} · ${lesson.title}`,
      preview: `${lesson.blocks.length} bloque(s)`,
      lessonId: lesson.id,
      depth: 1,
    })
    for (const block of lesson.blocks) {
      targets.push({
        anchor: `block:${block.id}`,
        kind: 'block',
        label: LB_BLOCK_SPECS[block.type]?.label || block.type,
        preview: blockPreview(block),
        lessonId: lesson.id,
        depth: 2,
      })
    }
  })

  return targets
}

/** Etiqueta que se guarda con el comentario, por si la pieza desaparece. */
export function labelForAnchor(anchor: string, content: LbContent, lessonLabel = 'Lección'): string {
  const target = anchorTargets(content, lessonLabel).find((candidate) => candidate.anchor === anchor)
  return target ? target.label : 'Pieza eliminada'
}

export const LB_COMMENT_STATUSES = ['OPEN', 'RESOLVED'] as const
export type LbCommentStatus = (typeof LB_COMMENT_STATUSES)[number]

export const LB_COMMENT_STATUS_LABEL: Record<LbCommentStatus, string> = {
  OPEN: 'Abierto',
  RESOLVED: 'Atendido',
}
