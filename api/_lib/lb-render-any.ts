/**
 * Learning Builder · render de cualquier recurso.
 *
 * El motor depende de la familia del tipo: lecciones con bloques para el OVA y
 * la lectura, escenas con puntos activos para la presentación, transcripción
 * sonora para el pódcast, planos para el video, módulos para la ruta y la
 * ficha del paquete para lo importado. Quien renderiza —vista previa, enlace
 * público, descarga, SCORM— llama aquí y no tiene que saber cuál toca.
 *
 * La copia fiel es la excepción, y a propósito: su HTML es el del archivo
 * original y se sirve desde el almacenamiento con su capa de ediciones
 * (lb-mirror-html.ts). Lo que sale de aquí para ese tipo es su portada.
 */
import { familyOf } from '../../src/learning/lib/content.js'
import type { LbContent } from '../../src/learning/lib/blocks.js'
import type { LbInteractiveContent } from '../../src/learning/lib/interactive.js'
import type { LbMirrorContent } from '../../src/learning/lib/mirror.js'
import type { LbPodcastContent } from '../../src/learning/lib/podcast.js'
import type { LbRouteContent } from '../../src/learning/lib/route.js'
import type { LbVideoContent } from '../../src/learning/lib/video.js'
import type { LbDirectives } from '../../src/learning/lib/directives.js'
import { renderOvaHtml, type LbRenderMeta, type LbRenderMode } from './lb-render.js'
import { renderInteractiveHtml } from './lb-render-interactive.js'
import { renderMirrorHtml } from './lb-render-mirror.js'
import { renderPodcastHtml } from './lb-render-podcast.js'
import { renderRouteHtml } from './lb-render-route.js'
import { renderVideoHtml } from './lb-render-video.js'

export function renderResourceHtml(options: {
  kind: string
  meta: LbRenderMeta
  content: unknown
  directives: LbDirectives
  mode: LbRenderMode
  /** Solo para lo importado: prefijo del visor de páginas. */
  viewBase?: string
}): string {
  const { kind, meta, content, directives, mode, viewBase } = options
  switch (familyOf(kind)) {
    case 'scenes':
      return renderInteractiveHtml({ meta, content: content as LbInteractiveContent, directives, mode })
    case 'podcast':
      return renderPodcastHtml({ meta, content: content as LbPodcastContent, directives, mode })
    case 'video':
      return renderVideoHtml({ meta, content: content as LbVideoContent, directives, mode })
    case 'route':
      return renderRouteHtml({ meta, content: content as LbRouteContent, directives, mode })
    case 'mirror':
      return renderMirrorHtml({ meta, content: content as LbMirrorContent, directives, mode, viewBase })
    default:
      return renderOvaHtml({ meta, content: content as LbContent, directives, mode })
  }
}
