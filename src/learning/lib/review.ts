/**
 * Learning Builder · revisión externa.
 *
 * Quien recibe el enlace de revisión no comenta sobre «el bloque 4»: pulsa la
 * foto, el párrafo o el botón que quiere señalar, en la pieza tal como se ve.
 * Lo que se guarda de ese gesto es el objetivo: en qué página estaba, cómo
 * volver a encontrar el elemento, qué era y qué decía. Con eso el equipo ve
 * exactamente lo mismo que vio el revisor, y si la pieza cambia después, el
 * hilo sigue diciendo de qué se habló.
 *
 * El ancla de siempre (comments.ts) sigue mandando para agrupar en el panel
 * del builder; el objetivo es la precisión que se le suma.
 *
 * Lo importa la UI y también el API, así que no puede depender de React.
 */

export const LB_TARGET_KINDS = [
  'image', 'video', 'audio', 'heading', 'text', 'list', 'table', 'button', 'link', 'interactive', 'element',
] as const
export type LbTargetKind = (typeof LB_TARGET_KINDS)[number]

export const LB_TARGET_LABEL: Record<LbTargetKind, string> = {
  image: 'Imagen',
  video: 'Video',
  audio: 'Audio',
  heading: 'Título',
  text: 'Texto',
  list: 'Lista',
  table: 'Tabla',
  button: 'Botón',
  link: 'Enlace',
  interactive: 'Interactivo',
  element: 'Elemento',
}

export type LbReviewTarget = {
  /** Página del paquete; vacío en las piezas de una sola página. */
  page: string
  /** Ruta CSS desde <body> para volver a dar con el elemento. */
  selector: string
  kind: LbTargetKind
  /** Lo que decía, o el texto alternativo si es una imagen. */
  text: string
  /** Archivo de la imagen o del video, para reconocerlo si se mueve. */
  src?: string
  /** El encabezado bajo el que estaba: la sección, para el lector humano. */
  section?: string
  /** Pantalla del OVA (0 = portada), para poder llevar al revisor hasta ella. */
  screen?: number
  /** Punto exacto dentro del elemento, en fracciones de 0 a 1. */
  x?: number
  y?: number
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

function fraction(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(1, Math.max(0, Math.round(n * 1000) / 1000)) : undefined
}

/** Lo que llega del navegador, recortado y sin nada que no sea del objetivo. */
export function sanitizeTarget(raw: unknown): LbReviewTarget | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const selector = clip(value.selector, 600)
  if (!selector) return null
  const kind = LB_TARGET_KINDS.includes(value.kind as LbTargetKind) ? (value.kind as LbTargetKind) : 'element'
  const target: LbReviewTarget = {
    page: clip(value.page, 300),
    selector,
    kind,
    text: clip(value.text, 240),
  }
  const src = clip(value.src, 500)
  if (src) target.src = src
  const section = clip(value.section, 160)
  if (section) target.section = section
  const screen = Number(value.screen)
  if (Number.isInteger(screen) && screen >= 0 && screen < 1000) target.screen = screen
  const x = fraction(value.x)
  const y = fraction(value.y)
  if (x !== undefined && y !== undefined) { target.x = x; target.y = y }
  return target
}

/** «Imagen · "Mapa de procesos"», para la lista de hilos. */
export function describeTarget(target: LbReviewTarget | null | undefined): string {
  if (!target) return ''
  const label = LB_TARGET_LABEL[target.kind] || 'Elemento'
  const text = target.text || (target.src ? target.src.split('/').pop() || '' : '')
  return text ? `${label} · «${text.length > 70 ? `${text.slice(0, 70)}…` : text}»` : label
}
