/**
 * Learning Builder · el contenido, según el tipo de recurso.
 *
 * Un recurso guarda su guion en un solo campo, pero la forma de ese guion
 * depende de su tipo: un OVA y una lectura son lecciones con bloques; una
 * presentación interactiva son escenas con puntos activos. Este módulo es el
 * único sitio donde se decide cuál toca, para que el resto del código —API,
 * render, editor, revisión— no repita el reparto en cada archivo.
 *
 * Añadir un tipo nuevo es añadir un caso aquí y su editor; nada más se entera.
 */
import {
  sanitizeContent, scaffoldContent, validateOva,
  type LbContent, type LbIssue,
} from './blocks.js'
import { anchorTargets, type LbAnchorTarget } from './comments.js'
import type { LbDirectives } from './directives.js'
import {
  interactiveAnchorTargets, sanitizeInteractive, scaffoldInteractive, validateInteractive,
  type LbInteractiveContent,
} from './interactive.js'

export type LbResourceContent = LbContent | LbInteractiveContent

/** Los tipos que se editan como escenas y no como lecciones. */
export function isSceneKind(kind: string): boolean {
  return kind === 'INTERACTIVE'
}

export function isInteractive(kind: string, content: LbResourceContent): content is LbInteractiveContent {
  return isSceneKind(kind) && Array.isArray((content as LbInteractiveContent).scenes)
}

export function sanitizeResourceContent(
  kind: string,
  value: unknown,
  directives: LbDirectives
): LbResourceContent {
  return isSceneKind(kind) ? sanitizeInteractive(value) : sanitizeContent(value, directives)
}

export function scaffoldResourceContent(kind: string, directives: LbDirectives, title: string): LbResourceContent {
  return isSceneKind(kind) ? scaffoldInteractive(title) : scaffoldContent(directives, title)
}

export function validateResourceContent(
  kind: string,
  content: LbResourceContent,
  directives: LbDirectives
): LbIssue[] {
  return isSceneKind(kind)
    ? validateInteractive(content as LbInteractiveContent, directives)
    : validateOva(content as LbContent, directives)
}

/** Piezas comentables, para la revisión del auditor. */
export function anchorTargetsFor(
  kind: string,
  content: LbResourceContent,
  lessonLabel = 'Lección'
): LbAnchorTarget[] {
  if (isSceneKind(kind)) {
    return interactiveAnchorTargets(content as LbInteractiveContent) as LbAnchorTarget[]
  }
  return anchorTargets(content as LbContent, lessonLabel)
}

/** Cuántas piezas y de qué, para el resumen de la metabiblioteca. */
export function contentStats(kind: string, content: unknown): { screens: number; pieces: number; checks: number } {
  const raw = (content && typeof content === 'object' ? content : {}) as any
  if (isSceneKind(kind)) {
    const scenes: any[] = Array.isArray(raw.scenes) ? raw.scenes : []
    return {
      screens: scenes.length,
      pieces: scenes.reduce((n, scene) => n + (Array.isArray(scene.hotspots) ? scene.hotspots.length : 0), 0),
      checks: 0,
    }
  }
  const lessons: any[] = Array.isArray(raw.lessons) ? raw.lessons : []
  return {
    screens: lessons.length,
    pieces: lessons.reduce((n, lesson) => n + (Array.isArray(lesson.blocks) ? lesson.blocks.length : 0), 0),
    checks: lessons.reduce(
      (n, lesson) =>
        n + (Array.isArray(lesson.blocks) ? lesson.blocks.filter((b: any) => b?.type === 'check').length : 0),
      0
    ),
  }
}
