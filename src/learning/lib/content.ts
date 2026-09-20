/**
 * Learning Builder · el contenido, según el tipo de recurso.
 *
 * Un recurso guarda su guion en un solo campo, pero la forma de ese guion
 * depende de su tipo: un OVA y una lectura son lecciones con bloques; una
 * presentación interactiva son escenas con puntos activos; un pódcast son
 * intervenciones; un video son planos; una ruta son módulos; una pieza
 * importada es un paquete con su capa de ediciones.
 *
 * Este módulo es el único sitio donde se decide cuál toca, para que el resto
 * del código —API, render, editor, revisión— no repita el reparto en cada
 * archivo. Añadir un tipo nuevo es añadir su familia aquí y su editor; nada
 * más se entera.
 */
import {
  sanitizeContent, scaffoldContent, validateOva,
  type LbContent,
} from './blocks.js'
import { anchorTargets } from './comments.js'
import type { LbAnchorTarget, LbIssue } from './common.js'
import type { LbDirectives } from './directives.js'
import type { LbFinal, LbPackage } from './final.js'
import {
  interactiveAnchorTargets, sanitizeInteractive, scaffoldInteractive, validateInteractive,
  type LbInteractiveContent,
} from './interactive.js'
import {
  mirrorAnchorTargets, sanitizeMirror, scaffoldMirror, validateMirror,
  type LbMirrorContent,
} from './mirror.js'
import {
  podcastAnchorTargets, sanitizePodcast, scaffoldPodcast, validatePodcast,
  type LbPodcastContent,
} from './podcast.js'
import {
  routeActivityCount, routeAnchorTargets, sanitizeRoute, scaffoldRoute, validateRoute,
  type LbRouteContent,
} from './route.js'
import {
  sanitizeVideo, scaffoldVideo, validateVideo, videoAnchorTargets,
  type LbVideoContent,
} from './video.js'

export type LbResourceContent =
  | LbContent
  | LbInteractiveContent
  | LbPodcastContent
  | LbVideoContent
  | LbRouteContent
  | LbMirrorContent

/**
 * La familia dice qué motor gobierna el recurso: cómo se guarda, cómo se
 * edita y cómo se pinta. Varios tipos pueden compartir familia —el OVA y la
 * lectura son los dos bloques— y eso es justamente lo que se quiere.
 */
export type LbFamily = 'blocks' | 'scenes' | 'podcast' | 'video' | 'route' | 'mirror'

const FAMILY_BY_KIND: Record<string, LbFamily> = {
  OVA: 'blocks',
  LECTURA: 'blocks',
  INTERACTIVE: 'scenes',
  PODCAST: 'podcast',
  VIDEO: 'video',
  ROUTE: 'route',
  IMPORT: 'mirror',
}

export function familyOf(kind: string): LbFamily {
  return FAMILY_BY_KIND[kind] || 'blocks'
}

/** Los tipos que se editan como escenas y no como lecciones. */
export function isSceneKind(kind: string): boolean {
  return familyOf(kind) === 'scenes'
}

/** Los tipos a los que el asistente sabe escribirles el guion. */
export function aiWritesFor(kind: string): boolean {
  return familyOf(kind) === 'blocks'
}

export function sanitizeResourceContent(
  kind: string,
  value: unknown,
  directives: LbDirectives
): LbResourceContent {
  switch (familyOf(kind)) {
    case 'scenes': return sanitizeInteractive(value)
    case 'podcast': return sanitizePodcast(value)
    case 'video': return sanitizeVideo(value)
    case 'route': return sanitizeRoute(value)
    case 'mirror': return sanitizeMirror(value)
    default: return sanitizeContent(value, directives)
  }
}

export function scaffoldResourceContent(kind: string, directives: LbDirectives, title: string): LbResourceContent {
  switch (familyOf(kind)) {
    case 'scenes': return scaffoldInteractive(title)
    case 'podcast': return scaffoldPodcast(title)
    case 'video': return scaffoldVideo(title)
    case 'route': return scaffoldRoute(title)
    case 'mirror': return scaffoldMirror(title)
    default: return scaffoldContent(directives, title)
  }
}

export function validateResourceContent(
  kind: string,
  content: LbResourceContent,
  directives: LbDirectives
): LbIssue[] {
  switch (familyOf(kind)) {
    case 'scenes': return validateInteractive(content as LbInteractiveContent, directives)
    case 'podcast': return validatePodcast(content as LbPodcastContent, directives)
    case 'video': return validateVideo(content as LbVideoContent, directives)
    case 'route': return validateRoute(content as LbRouteContent, directives)
    case 'mirror': return validateMirror(content as LbMirrorContent)
    default: return validateOva(content as LbContent, directives)
  }
}

/** Piezas comentables, para la revisión del auditor. */
export function anchorTargetsFor(
  kind: string,
  content: LbResourceContent,
  lessonLabel = 'Lección'
): LbAnchorTarget[] {
  switch (familyOf(kind)) {
    case 'scenes': return interactiveAnchorTargets(content as LbInteractiveContent)
    case 'podcast': return podcastAnchorTargets(content as LbPodcastContent)
    case 'video': return videoAnchorTargets(content as LbVideoContent)
    case 'route': return routeAnchorTargets(content as LbRouteContent)
    case 'mirror': return mirrorAnchorTargets(content as LbMirrorContent)
    default: return anchorTargets(content as LbContent, lessonLabel)
  }
}

/**
 * Cuántas piezas y de qué, para el resumen de la metabiblioteca. Los tres
 * números significan cosas distintas según la familia —y así se nombran en la
 * ficha— pero la tarjeta se pinta siempre igual.
 */
export function contentStats(kind: string, content: unknown): { screens: number; pieces: number; checks: number } {
  const raw = (content && typeof content === 'object' ? content : {}) as any
  const list = (value: unknown): any[] => (Array.isArray(value) ? value : [])

  switch (familyOf(kind)) {
    case 'scenes': {
      const scenes = list(raw.scenes)
      return {
        screens: scenes.length,
        pieces: scenes.reduce((n, scene) => n + list(scene?.hotspots).length, 0),
        checks: 0,
      }
    }
    case 'podcast': {
      const cues = list(raw.cues)
      return {
        screens: list(raw.speakers).length,
        pieces: cues.length,
        checks: cues.filter((cue) => cue?.audio?.url).length,
      }
    }
    case 'video': {
      const shots = list(raw.shots)
      return {
        screens: shots.length,
        pieces: shots.reduce((n, shot) => n + (Number(shot?.seconds) || 0), 0),
        checks: raw?.film?.url ? 1 : 0,
      }
    }
    case 'route': {
      const modules = list(raw.modules)
      return {
        screens: modules.length,
        pieces: routeActivityCount({ modules } as LbRouteContent),
        checks: modules.reduce(
          (n, item) => n + list(item?.activities).filter((activity: any) => activity?.resourceCode).length,
          0
        ),
      }
    }
    case 'mirror': {
      const pages = list(raw.pages)
      const edits = (raw.edits && typeof raw.edits === 'object' ? raw.edits : {}) as Record<string, object>
      return {
        screens: pages.length,
        pieces: pages.length,
        checks: Object.values(edits).reduce((n, page) => n + Object.keys(page || {}).length, 0),
      }
    }
    default: {
      const lessons = list(raw.lessons)
      return {
        screens: lessons.length,
        pieces: lessons.reduce((n, lesson) => n + list(lesson?.blocks).length, 0),
        checks: lessons.reduce(
          (n, lesson) => n + list(lesson?.blocks).filter((block: any) => block?.type === 'check').length,
          0
        ),
      }
    }
  }
}

/**
 * Cómo se llaman esos tres números en la tarjeta de cada familia. Una cadena
 * vacía oculta el número: en una presentación no hay comprobaciones que
 * contar, y en una pieza importada las páginas ya se contaron una vez.
 */
export const LB_STAT_LABELS: Record<LbFamily, [string, string, string]> = {
  blocks: ['pantallas', 'bloques', 'comprobaciones'],
  scenes: ['escenas', 'puntos activos', ''],
  podcast: ['voces', 'intervenciones', 'con locución'],
  video: ['planos', 'segundos', ''],
  route: ['módulos', 'actividades', 'con recurso'],
  mirror: ['páginas', '', 'textos editados'],
}

/**
 * Los rótulos de las pantallas del recurso, en orden. Los usa el índice
 * informativo del imsmanifest, que es lo que un administrador de campus mira
 * cuando quiere saber qué trae un paquete sin descomprimirlo.
 */
export function screenTitles(kind: string, content: unknown): string[] {
  const raw = (content && typeof content === 'object' ? content : {}) as any
  const list = (value: unknown): any[] => (Array.isArray(value) ? value : [])
  const named = (rows: any[], fallback: string) =>
    rows.map((row, index) => String(row?.title || `${fallback} ${index + 1}`))

  switch (familyOf(kind)) {
    case 'scenes': return named(list(raw.scenes), 'Escena')
    case 'podcast': return named(list(raw.cues), 'Intervención')
    case 'video': return named(list(raw.shots), 'Plano')
    case 'route': return named(list(raw.modules), 'Módulo')
    case 'mirror': return named(list(raw.pages), 'Página')
    default: return named(list(raw.lessons), 'Lección')
  }
}

/**
 * El paquete que hay que servir para que el recurso se vea **igual que el
 * original**, o null si todavía no hay ninguno y toca renderizar el guion.
 *
 * Una pieza importada lleva su paquete en el propio guion —es todo lo que
 * tiene—; cualquier otro tipo lo lleva adjunto como pieza final. Distinguirlo
 * es cosa de esta función y de nadie más: el visor, la descarga y el editor
 * preguntan aquí y no vuelven a razonar sobre dónde está guardado.
 */
export function deliverablePackage(
  kind: string,
  content: LbResourceContent,
  final: LbFinal | null
): LbPackage | null {
  if (familyOf(kind) === 'mirror') {
    const mirror = content as LbMirrorContent
    return mirror.pages?.length ? mirror : null
  }
  return final?.kind === 'PACKAGE' && final.deliver && final.pages.length ? final : null
}

/** ¿Se entrega este recurso tal cual salió de producción? */
export function servesOriginal(kind: string, content: LbResourceContent, final: LbFinal | null): boolean {
  return deliverablePackage(kind, content, final) !== null
}

/**
 * Lo que impide **entregar** el recurso, que no siempre es lo mismo que lo
 * que la revisión le reprocha al guion.
 *
 * Cuando el recurso entrega su pieza original, el guion deja de ser lo que se
 * publica: pasa a ser la memoria de cómo se construyó. Seguir bloqueando la
 * descarga porque a ese guion le falta la presentación de la portada sería
 * impedir entregar un archivo que ya está terminado y aprobado. Lo que sí
 * impide entregarlo es que su paquete esté roto.
 *
 * La revisión completa sigue viéndose en su pestaña: el guion incompleto es
 * una deuda real, solo que no es una deuda que justifique parar la entrega.
 */
export function deliveryIssues(
  kind: string,
  content: LbResourceContent,
  final: LbFinal | null,
  directives: LbDirectives
): LbIssue[] {
  if (final?.kind === 'MEDIA' && final.deliver) {
    return final.media?.url ? [] : [{ level: 'error', message: 'La pieza final no tiene archivo.' }]
  }

  const pkg = deliverablePackage(kind, content, final)
  if (!pkg) return validateResourceContent(kind, content, directives)

  const issues: LbIssue[] = []
  if (!pkg.pages.length) issues.push({ level: 'error', message: 'El paquete no tiene páginas.' })
  if (!pkg.entry) issues.push({ level: 'error', message: 'El paquete no dice por dónde se abre.' })
  return issues
}
