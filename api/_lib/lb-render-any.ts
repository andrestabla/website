/**
 * Learning Builder · render de cualquier recurso.
 *
 * El motor depende del tipo: lecciones con bloques para el OVA y la lectura,
 * escenas con puntos activos para la presentación interactiva. Quien renderiza
 * —vista previa, enlace público, descarga, SCORM— llama aquí y no tiene que
 * saber cuál toca.
 */
import { isSceneKind } from '../../src/learning/lib/content.js'
import type { LbContent } from '../../src/learning/lib/blocks.js'
import type { LbInteractiveContent } from '../../src/learning/lib/interactive.js'
import type { LbDirectives } from '../../src/learning/lib/directives.js'
import { renderOvaHtml, type LbRenderMeta, type LbRenderMode } from './lb-render.js'
import { renderInteractiveHtml } from './lb-render-interactive.js'

export function renderResourceHtml(options: {
  kind: string
  meta: LbRenderMeta
  content: unknown
  directives: LbDirectives
  mode: LbRenderMode
}): string {
  const { kind, meta, content, directives, mode } = options
  return isSceneKind(kind)
    ? renderInteractiveHtml({ meta, content: content as LbInteractiveContent, directives, mode })
    : renderOvaHtml({ meta, content: content as LbContent, directives, mode })
}
