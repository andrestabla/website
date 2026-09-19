/**
 * Learning Builder · video.
 *
 * Un video se compone antes de rodarse: el guion técnico es una lista de
 * planos, y cada plano dice cuánto dura, qué se ve, qué se dice y qué texto
 * aparece en pantalla. De esa lista salen tres cosas sin trabajo extra: el
 * storyboard que revisa el cliente, los capítulos del reproductor y la
 * transcripción accesible.
 *
 * Por eso el recurso vive igual antes y después de la pieza final: mientras no
 * haya video montado se publica el guion; cuando lo hay, el mismo guion se
 * convierte en su índice. La duración de cada plano da el punto exacto al que
 * salta cada capítulo, así que el índice es correcto desde el primer día.
 *
 * Lo importa la UI y también el API, así que no puede depender de React.
 */
import type { LbCover, LbMedia } from './blocks.js'
import type { LbDirectives } from './directives.js'
import {
  clock, coverAnchors, coverIssues, ident, newLbId, num, pick, safeUrl, sanitizeCover, sanitizeMedia, str,
  type LbAnchorTarget, type LbIssue,
} from './common.js'

export const LB_SHOT_KINDS = ['title', 'talking', 'broll', 'screencast', 'animation', 'interview', 'outro'] as const
export type LbShotKind = (typeof LB_SHOT_KINDS)[number]

export const LB_SHOT_KIND_LABEL: Record<LbShotKind, string> = {
  title: 'Cabecera',
  talking: 'A cámara',
  broll: 'Recurso',
  screencast: 'Captura de pantalla',
  animation: 'Animación',
  interview: 'Entrevista',
  outro: 'Cierre',
}

export type LbShot = {
  id: string
  title: string
  kind: LbShotKind
  /** Duración del plano en segundos: de aquí salen los capítulos. */
  seconds: number
  /** Qué se ve. */
  visual?: string
  /** Qué se dice: es también la transcripción. */
  narration?: string
  /** Rótulo que aparece sobre la imagen. */
  onScreen?: string
  /** Fotograma de referencia del storyboard. */
  still?: LbMedia
  /** Indicaciones de producción: no se publican. */
  notes?: string
}

export type LbVideoContent = {
  cover: LbCover
  /** La pieza montada, cuando existe. */
  film?: {
    url: string
    poster?: string
    /** Pista de subtítulos WebVTT. */
    captionsUrl?: string
  }
  shots: LbShot[]
}

// ── Saneamiento ──────────────────────────────────────────────────────────────

const MAX_SHOTS = 120

function sanitizeShot(value: unknown, index: number): LbShot {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const shot: LbShot = {
    id: ident(raw.id, 'p'),
    title: str(raw.title, 200) || `Plano ${index + 1}`,
    kind: pick(raw.kind, LB_SHOT_KINDS, 'broll'),
    seconds: num(raw.seconds, 10, 1, 3600),
  }
  const visual = str(raw.visual, 2000); if (visual) shot.visual = visual
  const narration = str(raw.narration, 4000); if (narration) shot.narration = narration
  const onScreen = str(raw.onScreen, 400); if (onScreen) shot.onScreen = onScreen
  const still = sanitizeMedia(raw.still); if (still) shot.still = still
  const notes = str(raw.notes, 2000); if (notes) shot.notes = notes
  return shot
}

export function sanitizeVideo(value: unknown): LbVideoContent {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const shots = (Array.isArray(raw.shots) ? (raw.shots as unknown[]).slice(0, MAX_SHOTS) : []).map(sanitizeShot)
  const content: LbVideoContent = { cover: sanitizeCover(raw.cover), shots }

  const rawFilm = (raw.film && typeof raw.film === 'object' ? raw.film : {}) as Record<string, unknown>
  const url = safeUrl(rawFilm.url)
  if (url) {
    content.film = { url }
    const poster = safeUrl(rawFilm.poster); if (poster) content.film.poster = poster
    const captionsUrl = safeUrl(rawFilm.captionsUrl); if (captionsUrl) content.film.captionsUrl = captionsUrl
  }
  return content
}

export function scaffoldVideo(title: string): LbVideoContent {
  return {
    cover: { title, summary: '', outcomes: [] },
    shots: [
      { id: newLbId('p'), title: 'Cabecera', kind: 'title', seconds: 6, onScreen: title, visual: '', narration: '' },
      { id: newLbId('p'), title: 'Planteamiento', kind: 'talking', seconds: 30, visual: '', narration: '' },
      { id: newLbId('p'), title: 'Cierre', kind: 'outro', seconds: 12, visual: '', narration: '' },
    ],
  }
}

// ── Validación ───────────────────────────────────────────────────────────────

export function validateVideo(content: LbVideoContent, directives: LbDirectives): LbIssue[] {
  const rules = directives.instructional.rules
  const issues: LbIssue[] = coverIssues(content.cover, rules)

  if (!content.shots.length) {
    issues.push({ level: 'error', message: 'El guion no tiene ningún plano.' })
  }

  for (const shot of content.shots) {
    if (!shot.visual && !shot.still) {
      issues.push({
        level: 'warning', blockId: shot.id,
        message: `El plano «${shot.title}» no describe qué se ve ni trae fotograma.`,
      })
    }
    if (shot.still?.url && rules.requireImageAlt && !shot.still.alt) {
      issues.push({
        level: 'error', blockId: shot.id,
        message: `El fotograma de «${shot.title}» no tiene texto alternativo.`,
      })
    }
  }

  const spoken = content.shots.filter((shot) => (shot.narration || '').trim()).length
  if (!spoken) {
    issues.push({ level: 'warning', message: 'Ningún plano tiene locución: no habrá transcripción.' })
  }

  if (content.film?.url && !content.film.captionsUrl) {
    issues.push({
      level: 'warning',
      message: 'El video montado no trae subtítulos; la transcripción por planos queda como alternativa.',
    })
  }

  const total = videoSeconds(content)
  if (total > 900) {
    issues.push({
      level: 'warning',
      message: `El guion suma ${clock(total)}: por encima de quince minutos la atención se cae.`,
    })
  }

  return issues
}

// ── Utilidades ───────────────────────────────────────────────────────────────

export function videoSeconds(content: LbVideoContent): number {
  return content.shots.reduce((total, shot) => total + shot.seconds, 0)
}

/** Punto de entrada de cada plano, acumulando duraciones. */
export function shotStarts(content: LbVideoContent): number[] {
  const starts: number[] = []
  let elapsed = 0
  for (const shot of content.shots) {
    starts.push(elapsed)
    elapsed += shot.seconds
  }
  return starts
}

export function videoAnchorTargets(content: LbVideoContent): LbAnchorTarget[] {
  const targets = coverAnchors(content.cover)
  const starts = shotStarts(content)
  content.shots.forEach((shot, index) => {
    targets.push({
      anchor: `block:${shot.id}`,
      kind: 'block',
      label: `${clock(starts[index])} · ${shot.title}`,
      preview: (shot.narration || shot.visual || '').slice(0, 120),
      depth: 1,
    })
  })
  return targets
}
