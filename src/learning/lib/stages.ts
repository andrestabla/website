/**
 * Learning Builder · las etapas de producción de un recurso.
 *
 * Un recurso no aparece hecho: se escribe, se guioniza, se produce y se
 * entrega. Cada etapa deja algo que se puede leer, publicar y comentar, y el
 * recurso da cuenta de las cuatro:
 *
 *   1. Texto plano        el contenido temático del que salen los recursos.
 *                         No siempre existe: es de la primera fase del curso.
 *   2. Guion              el documento que dice cómo será la pieza, en Word
 *                         o en PowerPoint por pantallas.
 *   3. Recurso producido  la versión editable en línea: el editor del módulo.
 *   4. Recurso entregado  la pieza final, con su enlace público y de revisión.
 *
 * Las dos primeras son documentos: se suben, se versionan (V1, V2…) y cada
 * una tiene su propio enlace, aparte del público del recurso, que lleva
 * siempre a la pieza final. Las dos últimas son lo que el módulo ya hacía.
 *
 * Lo importa la UI y también el API, así que no puede depender de React.
 */

/** Las etapas que son un documento subido. */
export const LB_DOC_STAGES = ['TEXTO', 'GUION'] as const
export type LbDocStage = (typeof LB_DOC_STAGES)[number]

export function isDocStage(value: unknown): value is LbDocStage {
  return typeof value === 'string' && (LB_DOC_STAGES as readonly string[]).includes(value)
}

/** Las cuatro, en orden, como las recorre el builder. */
export const LB_STAGE_KEYS = ['texto', 'guion', 'producido', 'entregado'] as const
export type LbStageKey = (typeof LB_STAGE_KEYS)[number]

export type LbStageSpec = {
  key: LbStageKey
  n: number
  label: string
  hint: string
  /** La etapa de documento a la que corresponde, si lo es. */
  doc?: LbDocStage
  optional?: boolean
}

export const LB_STAGE_SPECS: Record<LbStageKey, LbStageSpec> = {
  texto: {
    key: 'texto',
    n: 1,
    label: 'Texto plano',
    hint: 'El contenido temático: temas, ejemplos y explicaciones de los que salen las lecturas, los OVA, los videos y las infografías.',
    doc: 'TEXTO',
    optional: true,
  },
  guion: {
    key: 'guion',
    n: 2,
    label: 'Guion',
    hint: 'El documento que dice cómo será la pieza: en Word, o en PowerPoint por pantallas.',
    doc: 'GUION',
  },
  producido: {
    key: 'producido',
    n: 3,
    label: 'Recurso producido',
    hint: 'La versión editable del recurso en línea.',
  },
  entregado: {
    key: 'entregado',
    n: 4,
    label: 'Recurso entregado',
    hint: 'La pieza final: su enlace público, su revisión externa y sus descargas.',
  },
}

export const LB_DOC_STAGE_LABEL: Record<LbDocStage, string> = {
  TEXTO: 'Texto plano',
  GUION: 'Guion',
}

/** Formatos que se aceptan en cada etapa de documento. */
export const LB_DOC_STAGE_FORMATS: Record<LbDocStage, readonly string[]> = {
  TEXTO: ['docx'],
  GUION: ['docx', 'pptx'],
}

export function stageFormatOf(fileName: string): string {
  return (/\.([a-z0-9]+)$/i.exec(fileName)?.[1] || '').toLowerCase()
}

// ── Comentarios ──────────────────────────────────────────────────────────────
// Un comentario sobre el documento de una etapa cuelga del mismo recurso, con
// un ancla propia. Así se distingue de los del recurso producido y entregado
// sin que la tabla de comentarios tenga que saber nada de etapas.

export function stageAnchor(stage: LbDocStage): string {
  return `stage:${stage}`
}

/** La etapa de un ancla, o null si el comentario es del recurso mismo. */
export function stageOfAnchor(anchor: unknown): LbDocStage | null {
  if (typeof anchor !== 'string' || !anchor.startsWith('stage:')) return null
  const stage = anchor.slice(6)
  return isDocStage(stage) ? stage : null
}

/** Una versión del documento de una etapa, como la ve la UI. */
export type LbStageDocRow = {
  id: string
  version: number
  fileName: string
  format: string
  bytes: number
  /** Diapositivas del .pptx o apartados del .docx. */
  units: number
  images: number
  warnings: string[]
  notes: string | null
  createdAt: string
  createdByName: string | null
  live: boolean
}

export type LbStageState = {
  stage: LbDocStage
  published: boolean
  /** null para quien no puede compartir. */
  reviewToken: string | null
  docs: LbStageDocRow[]
}
