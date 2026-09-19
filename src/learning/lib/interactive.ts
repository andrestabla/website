/**
 * Learning Builder · presentación interactiva.
 *
 * El otro formato que produce Algoritmo T, al estilo Genially: en vez de
 * lecciones que se leen en orden, escenas que se exploran. Cada escena tiene un
 * fondo y puntos activos repartidos sobre él; al tocarlos se abre su contenido.
 *
 * El modelo es deliberadamente simple: la posición de cada punto va en
 * porcentaje, no en píxeles, para que la escena se vea igual en un portátil,
 * en un proyector y dentro del marco de un LMS.
 *
 * Lo importa la UI y también el API, así que no puede depender de React.
 */
import type { LbCover, LbMedia } from './blocks.js'
import {
  coverAnchors, coverIssues, ident, newLbId, sanitizeCover, sanitizeMedia, str,
  type LbAnchorTarget, type LbIssue,
} from './common.js'
import type { LbDirectives } from './directives.js'

export type { LbIssue }

export type LbHotspotShape = 'pin' | 'area'

export type LbHotspot = {
  id: string
  /** Posición del punto sobre la escena, en porcentaje de 0 a 100. */
  x: number
  y: number
  /** Tamaño de la zona activa, en porcentaje; solo cuando shape = 'area'. */
  w?: number
  h?: number
  shape: LbHotspotShape
  label: string
  body?: string
  media?: LbMedia
}

export type LbScene = {
  id: string
  title: string
  /** Texto que se lee sin tener que tocar nada. */
  intro?: string
  background?: LbMedia
  hotspots: LbHotspot[]
}

export type LbInteractiveContent = {
  cover: LbCover
  scenes: LbScene[]
}

export function newInteractiveId(prefix: string): string {
  return newLbId(prefix)
}

// ── Saneamiento ──────────────────────────────────────────────────────────────

const MAX_SCENES = 30
const MAX_HOTSPOTS = 24

function pct(value: unknown, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(100, Math.max(0, Math.round(parsed * 10) / 10))
}

function sanitizeHotspot(value: unknown): LbHotspot {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const shape: LbHotspotShape = raw.shape === 'area' ? 'area' : 'pin'
  const hotspot: LbHotspot = {
    id: ident(raw.id, 'h'),
    shape,
    x: pct(raw.x, 50),
    y: pct(raw.y, 50),
    label: str(raw.label, 160),
  }
  if (shape === 'area') {
    hotspot.w = Math.max(4, pct(raw.w, 20))
    hotspot.h = Math.max(4, pct(raw.h, 15))
  }
  const body = str(raw.body, 4000); if (body) hotspot.body = body
  const image = sanitizeMedia(raw.media); if (image) hotspot.media = image
  return hotspot
}

export function sanitizeInteractive(value: unknown): LbInteractiveContent {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const cover: LbCover = sanitizeCover(raw.cover)

  const rawScenes = Array.isArray(raw.scenes) ? (raw.scenes as unknown[]).slice(0, MAX_SCENES) : []
  const scenes: LbScene[] = rawScenes.map((value2) => {
    const rawScene = (value2 && typeof value2 === 'object' ? value2 : {}) as Record<string, unknown>
    const scene: LbScene = {
      id: ident(rawScene.id, 's'),
      title: str(rawScene.title, 240) || 'Escena sin título',
      hotspots: (Array.isArray(rawScene.hotspots) ? (rawScene.hotspots as unknown[]).slice(0, MAX_HOTSPOTS) : []).map(
        sanitizeHotspot
      ),
    }
    const intro = str(rawScene.intro, 4000); if (intro) scene.intro = intro
    const background = sanitizeMedia(rawScene.background); if (background) scene.background = background
    return scene
  })

  return { cover, scenes }
}

export function scaffoldInteractive(title: string): LbInteractiveContent {
  return {
    cover: { title, summary: '', outcomes: [] },
    scenes: [
      {
        id: newInteractiveId('s'),
        title: 'Escena 1',
        intro: 'Explica en una o dos frases qué va a explorar quien mira esta escena.',
        hotspots: [
          { id: newInteractiveId('h'), shape: 'pin', x: 30, y: 40, label: 'Primer punto', body: '' },
          { id: newInteractiveId('h'), shape: 'pin', x: 70, y: 60, label: 'Segundo punto', body: '' },
        ],
      },
    ],
  }
}

// ── Validación ───────────────────────────────────────────────────────────────

/**
 * Comprueba la presentación contra las directivas del workspace. Reutiliza las
 * reglas que tienen sentido aquí: portada con presentación y resultados, y
 * texto alternativo en las imágenes.
 */
export function validateInteractive(content: LbInteractiveContent, directives: LbDirectives): LbIssue[] {
  const rules = directives.instructional.rules
  const issues: LbIssue[] = coverIssues(content.cover, rules)

  if (!content.scenes.length) issues.push({ level: 'error', message: 'La presentación no tiene ninguna escena.' })

  for (const scene of content.scenes) {
    if (!scene.background?.url) {
      issues.push({ level: 'warning', lessonId: scene.id, message: `«${scene.title}» no tiene fondo: se verá sobre color plano.` })
    } else if (rules.requireImageAlt && !scene.background.alt) {
      issues.push({ level: 'error', lessonId: scene.id, message: `El fondo de «${scene.title}» no tiene texto alternativo.` })
    }
    if (!scene.hotspots.length) {
      issues.push({ level: 'error', lessonId: scene.id, message: `«${scene.title}» no tiene puntos activos: no hay nada que explorar.` })
    }
    for (const hotspot of scene.hotspots) {
      if (!hotspot.label) {
        issues.push({ level: 'error', lessonId: scene.id, blockId: hotspot.id, message: `Un punto de «${scene.title}» no tiene etiqueta.` })
      }
      if (!hotspot.body && !hotspot.media) {
        issues.push({
          level: 'warning', lessonId: scene.id, blockId: hotspot.id,
          message: `El punto «${hotspot.label || 'sin nombre'}» no abre ningún contenido.`,
        })
      }
      if (hotspot.media?.url && rules.requireImageAlt && !hotspot.media.alt) {
        issues.push({
          level: 'error', lessonId: scene.id, blockId: hotspot.id,
          message: `La imagen del punto «${hotspot.label}» no tiene texto alternativo.`,
        })
      }
    }
  }

  return issues
}

/** Piezas comentables de una presentación, para la revisión del auditor. */
export function interactiveAnchorTargets(content: LbInteractiveContent): LbAnchorTarget[] {
  const targets = coverAnchors(content.cover)
  content.scenes.forEach((scene, index) => {
    targets.push({
      anchor: `lesson:${scene.id}`,
      kind: 'lesson',
      label: `Escena ${index + 1} · ${scene.title}`,
      preview: `${scene.hotspots.length} punto(s) activo(s)`,
      depth: 1,
    })
    for (const hotspot of scene.hotspots) {
      targets.push({
        anchor: `block:${hotspot.id}`,
        kind: 'block',
        label: `Punto · ${hotspot.label || 'sin nombre'}`,
        preview: (hotspot.body || '').slice(0, 120),
        depth: 2,
      })
    }
  })
  return targets
}
