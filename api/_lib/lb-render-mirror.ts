/**
 * Learning Builder · portada de una pieza importada.
 *
 * Una copia fiel no se «renderiza»: se sirve su propio HTML, con la capa de
 * ediciones encima (lb-mirror-html.ts). Este documento es lo que se muestra
 * cuando eso no se puede hacer todavía —el paquete no se ha subido— o cuando
 * hace falta una puerta de entrada: la ficha de la pieza y su índice de
 * páginas.
 */
import { LB_MIRROR_ORIGIN_LABEL, mirrorEditCount, type LbMirrorContent } from '../../src/learning/lib/mirror.js'
import type { LbDirectives } from '../../src/learning/lib/directives.js'
import {
  completionScript, coverHtml, escapeHtml, renderDocument,
  type LbRenderMeta, type LbRenderMode,
} from './lb-render-kit.js'

const CSS = `
.mr-sum{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.mr-pages{list-style:none;margin:0;padding:0}
.mr-pages li{border-top:1px solid var(--lb-line);padding:11px 0;display:flex;gap:12px;align-items:baseline}
.mr-pages li:first-child{border-top:0}
.mr-pages b{font-family:var(--lb-heading);font-size:14.5px}
.mr-path{margin-left:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;color:var(--lb-muted)}
.mr-entry{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--lb-accent)}
.mr-empty{color:var(--lb-muted)}
`

export function renderMirrorHtml(options: {
  meta: LbRenderMeta
  content: LbMirrorContent
  directives: LbDirectives
  mode: LbRenderMode
  /** Prefijo del visor, para que el índice enlace a cada página. */
  viewBase?: string
}): string {
  const { meta, content, directives, mode, viewBase } = options
  const cover = content.cover || {}
  const docTitle = cover.title || content.origin.manifestTitle || meta.title
  const edits = mirrorEditCount(content)

  const summary = content.pages.length
    ? `<div class="mr-sum">
        <span class="lb-chip">${escapeHtml(LB_MIRROR_ORIGIN_LABEL[content.origin.kind])}</span>
        <span class="lb-chip">${content.pages.length} página(s)</span>
        ${edits ? `<span class="lb-chip">${edits} texto(s) editado(s)</span>` : ''}
        ${content.origin.scormVersion ? `<span class="lb-chip">${escapeHtml(content.origin.scormVersion)}</span>` : ''}
      </div>`
    : ''

  const pages = content.pages.length
    ? `<ul class="mr-pages">${content.pages
        .map((page) => {
          const label = `<b>${escapeHtml(page.title)}</b>${page.path === content.entry ? ' <span class="mr-entry">Entrada</span>' : ''}`
          const inner = viewBase
            ? `<a href="${escapeHtml(viewBase + encodeURIComponent(page.path))}">${label}</a>`
            : label
          return `<li>${inner}<span class="mr-path">${escapeHtml(page.path)}</span></li>`
        })
        .join('')}</ul>`
    : `<p class="mr-empty">Todavía no se ha subido el paquete original. Súbelo desde el builder para que la pieza se vea exactamente como venía.</p>`

  const body = `
${coverHtml(cover, meta, summary)}
<section class="lb-card">
  <h2 class="lb-h">Páginas del paquete</h2>
  ${pages}
</section>`

  return renderDocument({
    meta,
    directives,
    mode,
    docTitle,
    description: cover.summary || '',
    css: CSS,
    body,
    script: completionScript(directives, 0),
  })
}
