/**
 * Learning Builder · render de la pieza final cuando es un medio.
 *
 * Un recurso de video o de pódcast tiene dos caras: su **guion**, que es lo
 * que se escribe y lo que la revisión comprueba, y la **pieza entregada**, que
 * es el archivo que salió de producción. Cuando hay pieza, es ella la que se
 * entrega —lo dice su `deliver`—, y el visor tiene que servirla.
 *
 * Hasta noviembre de 2026 no lo hacía: el visor sabía servir un paquete o
 * renderizar un guion, y un MP4 no es ninguna de las dos cosas, así que el
 * enlace público de los ocho videos enseñaba el guion técnico —«0 planos,
 * 0:00 de duración»— en vez del video. Esto es la tercera salida.
 *
 * La página es deliberadamente sobria: la pieza manda y todo lo demás estorba.
 * Cabecera de marca, el reproductor a todo el ancho con sus subtítulos, y al
 * pie de qué archivo se trata. Nada que distraiga de lo único que hay que ver.
 */
import type { LbDirectives } from '../../src/learning/lib/directives.js'
import type { LbFinal } from '../../src/learning/lib/final.js'
import {
  clock, completionScript, escapeHtml, inline, renderDocument,
  type LbRenderMeta, type LbRenderMode,
} from './lb-render-kit.js'

const CSS = `
.md-cover{padding:26px 0 6px}
.md-cover .k{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--lb-muted)}
.md-cover h1{font-family:var(--lb-heading);font-size:30px;line-height:1.15;margin:.25em 0 0}
.md-cover .s{color:var(--lb-muted);margin:.5em 0 0;font-size:15px}
.md-stage{margin-top:18px;border-radius:var(--lb-radius);overflow:hidden;background:#000;
  box-shadow:0 1px 2px rgba(15,23,42,.06),0 18px 40px -26px rgba(15,23,42,.6)}
.md-stage video{display:block;width:100%;height:auto;background:#000}
.md-audio{margin-top:18px;background:var(--lb-surface);border-radius:var(--lb-radius);padding:18px 20px}
.md-audio audio{width:100%}
.md-meta{display:flex;flex-wrap:wrap;gap:10px 22px;margin-top:14px;font-size:12.5px;color:var(--lb-muted)}
.md-meta b{color:var(--lb-text);font-weight:700}
.md-old{margin-top:14px;border:1px solid var(--lb-line);border-radius:var(--lb-radius);
  padding:10px 14px;font-size:12.5px;color:var(--lb-muted)}
@media print{ .md-stage,.md-audio{display:none} }
`

export function renderMediaHtml(options: {
  meta: LbRenderMeta
  final: LbFinal
  directives: LbDirectives
  mode: LbRenderMode
  /** Cuando se está mirando una versión que ya no es la viva. */
  version?: { numero: number; viva: boolean }
}): string {
  const { meta, final, directives, mode, version } = options
  const media = final.media!
  const esVideo = String(media.contentType || '').startsWith('video/')
  const titulo = meta.title
  const pista = media.captionsUrl
    ? `<track kind="captions" srclang="es" label="Español" src="${escapeHtml(media.captionsUrl)}" default>`
    : ''

  // El reproductor nativo basta y sobra: trae controles accesibles, teclado,
  // velocidad y pantalla completa, y no hay que mantenerlo.
  const reproductor = esVideo
    ? `<div class="md-stage"><video controls playsinline preload="metadata"
         ${media.posterUrl ? `poster="${escapeHtml(media.posterUrl)}"` : ''}
         id="lbmedia"><source src="${escapeHtml(media.url)}" type="${escapeHtml(media.contentType)}">${pista}
       </video></div>`
    : `<div class="md-audio"><audio controls preload="metadata" id="lbmedia"
         src="${escapeHtml(media.url)}"></audio></div>`

  const body = `<section class="md-cover">
    ${meta.course ? `<div class="k">${inline(meta.course)}</div>` : ''}
    <h1>${inline(titulo)}</h1>
    ${meta.subtitle || meta.unit ? `<p class="s">${inline(meta.subtitle || meta.unit)}</p>` : ''}
  </section>
  ${reproductor}
  <div class="md-meta">
    ${media.seconds ? `<span>Duración <b>${clock(media.seconds)}</b></span>` : ''}
    <span>Subtítulos <b>${media.captionsUrl ? 'sí' : 'no'}</b></span>
    ${final.origin?.fileName ? `<span>Archivo <b>${escapeHtml(final.origin.fileName)}</b></span>` : ''}
  </div>
  ${version && !version.viva
    ? `<div class="md-old">Esta es la <b>versión ${version.numero}</b>, que ya no es la vigente.
       Se conserva tal como se entregó.</div>`
    : ''}`

  return renderDocument({
    meta, directives, mode,
    docTitle: titulo,
    description: meta.subtitle || meta.course || '',
    css: CSS,
    body,
    // Un medio se da por visto cuando termina; con la regla «immediate» del
    // workspace, al abrirlo. Es la misma cuenta que usan los demás formatos.
    script: `${completionScript(directives, 1)}
var el = document.getElementById('lbmedia');
if (el) el.addEventListener('ended', function(){ LBDONE.mark('media'); });`,
  })
}
