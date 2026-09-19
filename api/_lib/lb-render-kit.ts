/**
 * Learning Builder · andamiaje común de los renders.
 *
 * Todos los formatos entregan lo mismo: un documento HTML autocontenido, sin
 * red y sin dependencias, con la marca del workspace, que sirve igual para la
 * vista previa, el enlace público, la descarga y el paquete SCORM.
 *
 * Lo que cambia entre formatos es el cuerpo y su comportamiento. Lo que no
 * cambia —la cabecera de marca, las variables de color, la tipografía, el pie,
 * el shim de SCORM y el markdown mínimo del editor— se escribe aquí una vez.
 */
import type { LbDirectives } from '../../src/learning/lib/directives.js'
import { escapeHtml, type LbRenderMeta, type LbRenderMode } from '../../src/learning/lib/render-ova.js'

export { escapeHtml }
export type { LbRenderMeta, LbRenderMode }

/** Markdown mínimo del editor: **negrita** y *cursiva*, sobre texto ya escapado. */
export function inline(value: unknown): string {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
}

/** Párrafos separados por línea en blanco; los saltos sueltos son <br>. */
export function prose(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return text.split(/\n{2,}/).map((p) => `<p>${inline(p).replace(/\n/g, '<br>')}</p>`).join('')
}

export function clock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/** Variables de marca y reglas base, comunes a todos los formatos. */
export function brandCss(directives: LbDirectives): string {
  const brand = directives.graphic
  return `
:root{
  --lb-accent:${brand.accent};
  --lb-accent-dark:${brand.accentDark};
  --lb-surface:${brand.surface};
  --lb-text:${brand.text};
  --lb-muted:${brand.muted};
  --lb-radius:${brand.corners}px;
  --lb-heading:${brand.headingFont};
  --lb-body:${brand.bodyFont};
  --lb-line:#e2e8f0;
}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:#f1f5f9;color:var(--lb-text);font-family:var(--lb-body);font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:var(--lb-heading);line-height:1.2;margin:0}
img{max-width:100%;display:block}
button{font:inherit}
a{color:var(--lb-accent)}

.lb-wrap{max-width:980px;margin:0 auto;padding:18px}
.lb-top{display:flex;align-items:center;gap:12px;padding:6px 2px 16px}
.lb-top img{max-height:32px;width:auto}
.lb-client{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--lb-muted)}
.lb-course{font-family:var(--lb-heading);font-weight:800;font-size:15px}

.lb-cover{background:var(--lb-surface);border-radius:var(--lb-radius);padding:44px 40px;
  box-shadow:0 1px 2px rgba(15,23,42,.06),0 12px 28px -18px rgba(15,23,42,.35)}
.lb-cover .k{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--lb-accent)}
.lb-cover h1{font-size:38px;margin:10px 0 0}
.lb-cover .s{color:var(--lb-muted);font-size:19px;margin:10px 0 0}
.lb-cover .sum{margin-top:20px}
.lb-outcomes{margin-top:22px;border-left:3px solid var(--lb-accent);padding-left:18px}
.lb-outcomes h2{font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:var(--lb-muted)}
.lb-outcomes ul{margin:8px 0 0;padding-left:18px}

.lb-card{background:var(--lb-surface);border-radius:var(--lb-radius);padding:24px 26px;margin-top:16px;
  box-shadow:0 1px 2px rgba(15,23,42,.06)}
.lb-h{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--lb-muted);margin:0 0 12px}
.lb-btn{background:var(--lb-accent);color:#fff;border:0;border-radius:calc(var(--lb-radius)*.7);
  padding:11px 20px;font-weight:700;cursor:pointer}
.lb-btn:hover{background:var(--lb-accent-dark)}
.lb-chip{display:inline-block;border:1px solid var(--lb-line);border-radius:999px;padding:3px 10px;
  font-size:11.5px;font-weight:700;color:var(--lb-muted)}
.lb-foot{color:var(--lb-muted);font-size:12px;margin:22px 2px 6px;opacity:.85}

@media (max-width:760px){
  .lb-cover{padding:28px 22px}
  .lb-cover h1{font-size:28px}
  .lb-card{padding:18px 16px}
}
@media print{
  body{background:#fff}
  .lb-card,.lb-cover{box-shadow:none;border:1px solid var(--lb-line);break-inside:avoid}
  .lb-noprint{display:none !important}
}
`
}

/** Portada común: antetítulo, título, subtítulo, presentación y resultados. */
export function coverHtml(
  cover: { kicker?: string; title?: string; subtitle?: string; summary?: string; outcomes?: string[] },
  meta: LbRenderMeta,
  extra = ''
): string {
  return `<section class="lb-cover">
    ${cover.kicker || meta.course ? `<div class="k">${inline(cover.kicker || meta.course)}</div>` : ''}
    <h1>${inline(cover.title || meta.title)}</h1>
    ${cover.subtitle ? `<p class="s">${inline(cover.subtitle)}</p>` : ''}
    ${cover.summary ? `<div class="sum">${prose(cover.summary)}</div>` : ''}
    ${(cover.outcomes || []).length
      ? `<div class="lb-outcomes"><h2>Resultados de aprendizaje</h2><ul>${(cover.outcomes || [])
          .map((outcome) => `<li>${inline(outcome)}</li>`)
          .join('')}</ul></div>`
      : ''}
    ${extra}
  </section>`
}

/**
 * El documento completo. Cada formato aporta su CSS, su cuerpo y su script; el
 * resto —cabecera de marca, metadatos, pie y shim de SCORM— sale igual para
 * todos.
 */
export function renderDocument(options: {
  meta: LbRenderMeta
  directives: LbDirectives
  mode: LbRenderMode
  docTitle: string
  description?: string
  css: string
  body: string
  script?: string
  /** Contenido extra en la cabecera, a la derecha del nombre del curso. */
  topRight?: string
}): string {
  const { meta, directives, mode, docTitle, description, css, body, script, topRight } = options
  const scormShim = mode === 'scorm' ? '<script src="scorm-api.js"></script>' : ''
  const noindex = mode === 'public' ? '' : '<meta name="robots" content="noindex">'

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(docTitle)}</title>
${noindex}
<meta name="description" content="${escapeHtml(description || meta.subtitle || '')}">
<style>${brandCss(directives)}${css}</style>
</head>
<body>
<div class="lb-wrap">
  <div class="lb-top">
    ${directives.graphic.logoUrl ? `<img src="${escapeHtml(directives.graphic.logoUrl)}" alt="${escapeHtml(meta.workspaceName)}">` : ''}
    <div>
      <div class="lb-client">${escapeHtml(meta.workspaceName)}</div>
      <div class="lb-course">${escapeHtml(meta.course || docTitle)}</div>
    </div>
    ${topRight || ''}
  </div>
  ${body}
  ${directives.graphic.footerText ? `<div class="lb-foot">${escapeHtml(directives.graphic.footerText)}</div>` : ''}
</div>
${scormShim}
${script ? `<script>${script}</script>` : ''}
</body>
</html>`
}

/**
 * Cierre en el LMS según la regla del workspace. Se le pasa cuántas piezas hay
 * y el formato avisa cuando una se consume; `immediate` cierra al abrir, y
 * también lo hace un formato sin piezas que recorrer —una ruta, por ejemplo—,
 * porque de otro modo no cerraría nunca.
 */
export function completionScript(directives: LbDirectives, total: number): string {
  return `
var LBDONE = (function(){
  var rule = ${JSON.stringify(directives.exports.completion)};
  var total = ${Math.max(0, total)}, seen = {}, done = false;
  function check(){
    if (done) return;
    var ok = rule === 'immediate' || total === 0 ? true : Object.keys(seen).length >= total;
    if (!ok) return;
    done = true;
    if (window.LBSCORM) window.LBSCORM.complete();
  }
  check();
  return { mark: function(id){ seen[id] = true; check(); }, count: function(){ return Object.keys(seen).length; } };
})();
`
}
