/**
 * Learning Builder · piezas comunes a todos los formatos.
 *
 * Cada tipo de recurso guarda su guion con una forma distinta, pero todos
 * comparten lo mismo por debajo: una portada, medios con texto alternativo y
 * el saneamiento de cualquier texto que llegue de fuera. Vivía repetido en
 * cada modelo; aquí se escribe una vez.
 *
 * Lo importa la UI y también el API, así que no puede depender de React.
 */
import type { LbCover, LbMedia } from './blocks.js'

/**
 * Texto de fuera: sin caracteres de control, en forma normalizada y acotado.
 *
 * La normalización no es cosmética. macOS guarda los nombres de archivo en
 * forma descompuesta —la «ó» son dos caracteres— y Windows y los navegadores
 * los guardan compuestos. Un título traído de una carpeta y otro tecleado en
 * el editor se ven idénticos y no son iguales: la búsqueda falla, el orden
 * alfabético se desordena y una comprobación de duplicados da por nuevo algo
 * que ya existía. Se compone aquí, una vez, antes de guardar nada.
 */
export function str(value: unknown, max = 400): string {
  if (typeof value !== 'string') return ''
  return value.normalize('NFC').replace(/[^\P{Cc}\n\t]/gu, '').slice(0, max)
}

export function num(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

export function newLbId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

/** Identificador estable: se respeta el que venga, si es utilizable. */
export function ident(value: unknown, prefix: string): string {
  const raw = str(value, 40).replace(/[^a-zA-Z0-9_-]/g, '')
  return raw || newLbId(prefix)
}

/** Solo esquemas que un navegador puede abrir sin ejecutar nada. */
export function safeUrl(value: unknown, max = 1200): string {
  const raw = str(value, max).trim()
  return raw && /^(https?:\/\/|\/)/i.test(raw) ? raw : ''
}

export function sanitizeMedia(value: unknown): LbMedia | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  const url = safeUrl(raw.url)
  if (!url) return undefined
  const alt = str(raw.alt, 300)
  return alt ? { url, alt } : { url }
}

export function pick<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  const raw = str(value, 40)
  return (options as readonly string[]).includes(raw) ? (raw as T) : fallback
}

export function sanitizeCover(value: unknown): LbCover {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const cover: LbCover = {}
  const kicker = str(raw.kicker, 160); if (kicker) cover.kicker = kicker
  const title = str(raw.title, 240); if (title) cover.title = title
  const subtitle = str(raw.subtitle, 400); if (subtitle) cover.subtitle = subtitle
  const summary = str(raw.summary, 2000); if (summary) cover.summary = summary
  const media = sanitizeMedia(raw.media); if (media) cover.media = media
  if (Array.isArray(raw.outcomes)) {
    const outcomes = (raw.outcomes as unknown[]).slice(0, 12).map((o) => str(o, 400)).filter(Boolean)
    if (outcomes.length) cover.outcomes = outcomes
  }
  return cover
}

export type LbIssue = { level: 'error' | 'warning'; message: string; lessonId?: string; blockId?: string }

/**
 * Lo que toda portada debe cumplir, según las reglas del workspace. Lo aplican
 * por igual el OVA, la presentación, el pódcast, el video y la ruta.
 */
export function coverIssues(
  cover: LbCover,
  rules: { requireCoverSummary: boolean; requireOutcomes: boolean }
): LbIssue[] {
  const issues: LbIssue[] = []
  if (!cover.title) issues.push({ level: 'error', message: 'La portada no tiene título.' })
  if (rules.requireCoverSummary && !cover.summary) {
    issues.push({ level: 'error', message: 'La portada necesita una presentación breve.' })
  }
  if (rules.requireOutcomes && !(cover.outcomes || []).length) {
    issues.push({ level: 'error', message: 'Faltan los resultados de aprendizaje.' })
  }
  return issues
}

/**
 * Qué clase de pieza nombra un ancla de comentario. Vive aquí, y no en
 * comments.ts, porque cada formato arma su propia lista de piezas comentables
 * y todos necesitan el mismo vocabulario.
 */
export type LbAnchorKind = 'resource' | 'cover' | 'coverField' | 'lesson' | 'block'

/** Pieza comentable, para la revisión del auditor. */
export type LbAnchorTarget = {
  anchor: string
  kind: LbAnchorKind
  /** Cómo se llama la pieza en la lista de revisión. */
  label: string
  /** Un fragmento de su contenido, para reconocerla. */
  preview?: string
  /** Lección o pantalla a la que pertenece, si cuelga de una. */
  lessonId?: string
  /** Sangría en la lista: 0 el recurso, 1 lección o portada, 2 bloque o campo. */
  depth: number
}

export function coverAnchors(cover: LbCover): LbAnchorTarget[] {
  return [
    { anchor: 'resource', kind: 'resource', label: 'El recurso completo', depth: 0 },
    { anchor: 'cover', kind: 'cover', label: 'Portada', preview: cover.title || '', depth: 1 },
  ]
}

/** Segundos a mm:ss, para duraciones de audio y video. */
export function clock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}
