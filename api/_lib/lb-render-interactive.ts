/**
 * Learning Builder · render de la presentación interactiva.
 *
 * Mismo trato que el OVA: un documento HTML autocontenido, con la marca del
 * workspace, que sirve igual para la vista previa, el enlace público, la
 * descarga y el paquete SCORM. Sin red y sin dependencias.
 *
 * La escena se dibuja con proporción fija y los puntos se colocan en
 * porcentaje, así que la composición se mantiene a cualquier ancho: en el
 * portátil del diseñador, en el proyector del aula y dentro del marco del LMS.
 */
import type { LbInteractiveContent } from '../../src/learning/lib/interactive.js'
import type { LbDirectives } from '../../src/learning/lib/directives.js'
import { escapeHtml, type LbRenderMeta, type LbRenderMode } from '../../src/learning/lib/render-ova.js'

function inline(value: unknown): string {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
}

function prose(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return text.split(/\n{2,}/).map((p) => `<p>${inline(p).replace(/\n/g, '<br>')}</p>`).join('')
}

function css(directives: LbDirectives): string {
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
body{background:#0f172a;color:var(--lb-text);font-family:var(--lb-body);font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:var(--lb-heading);line-height:1.2;margin:0}
img{max-width:100%;display:block}
button{font:inherit}

.ip{max-width:1180px;margin:0 auto;padding:18px}
.ip-top{display:flex;align-items:center;gap:12px;color:#e2e8f0;padding:6px 2px 14px}
.ip-top img{max-height:30px;width:auto}
.ip-client{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#94a3b8}
.ip-title{font-family:var(--lb-heading);font-weight:800;font-size:15px;color:#fff}
.ip-steps{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto}
.ip-step{border:0;background:rgba(255,255,255,.12);color:#cbd5e1;border-radius:999px;padding:6px 13px;font-size:12.5px;cursor:pointer}
.ip-step.is-active{background:var(--lb-accent);color:#fff;font-weight:700}

.ip-cover{background:var(--lb-surface);border-radius:var(--lb-radius);padding:44px 40px}
.ip-cover .k{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--lb-accent)}
.ip-cover h1{font-size:38px;margin:10px 0 0}
.ip-cover .s{color:var(--lb-muted);font-size:19px;margin:10px 0 0}
.ip-cover .sum{margin-top:20px}
.ip-outcomes{margin-top:22px;border-left:3px solid var(--lb-accent);padding-left:18px}
.ip-outcomes h2{font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:var(--lb-muted)}
.ip-outcomes ul{margin:8px 0 0;padding-left:18px}

.ip-scene{display:none}
.ip-scene.is-active{display:block;animation:ip-in .25s ease}
@keyframes ip-in{from{opacity:0}to{opacity:1}}
.ip-intro{color:#cbd5e1;font-size:15px;margin:0 0 12px;max-width:80ch}
.ip-stage{position:relative;width:100%;aspect-ratio:16/9;background:var(--lb-accent-dark);border-radius:var(--lb-radius);overflow:hidden}
.ip-stage>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ip-stage.no-bg::after{content:"";position:absolute;inset:0;
  background:radial-gradient(circle at 30% 30%, rgba(255,255,255,.14), transparent 60%)}

.ip-spot{position:absolute;transform:translate(-50%,-50%);border:0;cursor:pointer;padding:0;background:none;z-index:2}
.ip-pin{width:34px;height:34px;border-radius:999px;background:var(--lb-accent);color:#fff;
  display:grid;place-items:center;font-weight:800;font-size:14px;
  box-shadow:0 0 0 6px color-mix(in srgb, var(--lb-accent) 35%, transparent);
  animation:ip-pulse 2.4s ease-out infinite}
@keyframes ip-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--lb-accent) 55%,transparent)}
  70%{box-shadow:0 0 0 16px transparent}100%{box-shadow:0 0 0 0 transparent}}
.ip-spot.is-open .ip-pin{background:#fff;color:var(--lb-accent-dark);animation:none}
.ip-area{transform:none;border:2px dashed rgba(255,255,255,.85);border-radius:calc(var(--lb-radius)*.6);
  background:color-mix(in srgb, var(--lb-accent) 22%, transparent)}
.ip-area .ip-tag{position:absolute;left:6px;top:6px;background:var(--lb-accent);color:#fff;
  border-radius:6px;padding:3px 8px;font-size:11.5px;font-weight:700}

.ip-panel{position:absolute;inset:auto 0 0 0;background:var(--lb-surface);border-top:3px solid var(--lb-accent);
  padding:20px 22px;max-height:66%;overflow-y:auto;display:none;z-index:3}
.ip-panel.is-open{display:block;animation:ip-up .22s ease}
@keyframes ip-up{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
.ip-panel h3{font-size:19px;margin:0 0 8px;padding-right:34px}
.ip-panel img{border-radius:calc(var(--lb-radius)*.6);margin-top:12px;max-height:230px;object-fit:contain}
.ip-close{position:absolute;right:12px;top:12px;width:30px;height:30px;border-radius:999px;border:1px solid var(--lb-line);
  background:#fff;color:var(--lb-muted);cursor:pointer;font-size:16px;line-height:1}

.ip-legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.ip-legend button{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#e2e8f0;
  border-radius:999px;padding:7px 14px;font-size:13px;cursor:pointer;text-align:left}
.ip-legend button:hover{border-color:var(--lb-accent);color:#fff}
.ip-legend button.is-done{opacity:.6}

.ip-nav{display:flex;align-items:center;gap:10px;margin-top:16px}
.ip-btn{background:var(--lb-accent);color:#fff;border:0;border-radius:calc(var(--lb-radius)*.7);
  padding:11px 20px;font-weight:700;cursor:pointer}
.ip-btn:hover{background:var(--lb-accent-dark)}
.ip-btn--ghost{background:transparent;color:#cbd5e1;border:1px solid rgba(255,255,255,.22)}
.ip-progress{margin-left:auto;font-size:12px;color:#94a3b8}
.ip-foot{color:#64748b;font-size:12px;margin-top:18px}

@media (max-width:760px){
  .ip-cover{padding:28px 22px}
  .ip-cover h1{font-size:28px}
  .ip-stage{aspect-ratio:4/5}
  .ip-panel{max-height:74%}
}
@media print{
  .ip-steps,.ip-nav,.ip-close{display:none}
  body{background:#fff}
  .ip-scene{display:block !important;page-break-after:always}
  .ip-panel{position:static;display:block !important;max-height:none;border-top:1px solid var(--lb-line)}
}
`
}

function player(mode: LbRenderMode, completion: LbDirectives['exports']['completion']): string {
  const scorm = mode === 'scorm'
  return `
(function(){
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.ip-scene'));
  var steps = Array.prototype.slice.call(document.querySelectorAll('.ip-step'));
  var visited = {}, opened = {}, totalSpots = document.querySelectorAll('.ip-spot').length, done = false;

  function closeAll(scene){
    scene.querySelectorAll('.ip-panel').forEach(function(p){ p.classList.remove('is-open'); });
    scene.querySelectorAll('.ip-spot').forEach(function(s){ s.classList.remove('is-open'); });
  }

  function progress(){
    var seen = Object.keys(opened).length;
    var label = document.querySelector('.ip-progress');
    if (label) label.textContent = seen + ' de ' + totalSpots + ' puntos explorados';
    if (done) return;
    var rule = ${JSON.stringify(completion)};
    var ok = rule === 'immediate'
      ? true
      : rule === 'checks-passed'
        ? seen >= totalSpots && totalSpots > 0
        : Object.keys(visited).length === scenes.length;
    if (!ok) return;
    done = true;
    if (window.LBSCORM) window.LBSCORM.complete();
  }

  function show(index){
    if (index < 0 || index >= scenes.length) return;
    scenes.forEach(function(scene, i){
      scene.classList.toggle('is-active', i === index);
      if (i !== index) closeAll(scene);
    });
    steps.forEach(function(step, i){ step.classList.toggle('is-active', i === index); });
    visited[index] = true;
    progress();
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (window.LBSCORM) window.LBSCORM.bookmark(String(index));
  }

  steps.forEach(function(step, i){ step.addEventListener('click', function(){ show(i); }); });

  document.addEventListener('click', function(event){
    var spot = event.target.closest('.ip-spot');
    if (spot) {
      var scene = spot.closest('.ip-scene');
      var panel = scene.querySelector('.ip-panel[data-for="' + spot.getAttribute('data-spot') + '"]');
      var wasOpen = panel && panel.classList.contains('is-open');
      closeAll(scene);
      if (panel && !wasOpen) {
        panel.classList.add('is-open');
        spot.classList.add('is-open');
        opened[spot.getAttribute('data-spot')] = true;
        var chip = scene.querySelector('.ip-legend button[data-spot="' + spot.getAttribute('data-spot') + '"]');
        if (chip) chip.classList.add('is-done');
        progress();
      }
      return;
    }
    var chip2 = event.target.closest('.ip-legend button');
    if (chip2) {
      var target = chip2.closest('.ip-scene').querySelector('.ip-spot[data-spot="' + chip2.getAttribute('data-spot') + '"]');
      if (target) target.click();
      return;
    }
    if (event.target.closest('.ip-close')) {
      closeAll(event.target.closest('.ip-scene'));
      return;
    }
    var go = event.target.closest('[data-go]');
    if (go) show(parseInt(go.getAttribute('data-go'), 10));
  });

  ${scorm
    ? "var resume = window.LBSCORM ? window.LBSCORM.start() : ''; show(resume ? parseInt(resume, 10) || 0 : 0);"
    : 'show(0);'}
  ${scorm ? "window.addEventListener('beforeunload', function(){ if (window.LBSCORM) window.LBSCORM.finish(); });" : ''}
})();
`
}

export function renderInteractiveHtml(options: {
  meta: LbRenderMeta
  content: LbInteractiveContent
  directives: LbDirectives
  mode: LbRenderMode
}): string {
  const { meta, content, directives, mode } = options
  const scenes = content.scenes || []
  const cover = content.cover || {}
  const docTitle = cover.title || meta.title

  const steps = [
    `<button type="button" class="ip-step is-active">Portada</button>`,
    ...scenes.map((scene, i) => `<button type="button" class="ip-step">${i + 1}. ${escapeHtml(scene.title)}</button>`),
  ].join('')

  const coverHtml = `<section class="ip-scene is-active">
    <div class="ip-cover">
      ${cover.kicker || meta.course ? `<div class="k">${inline(cover.kicker || meta.course)}</div>` : ''}
      <h1>${inline(docTitle)}</h1>
      ${cover.subtitle ? `<p class="s">${inline(cover.subtitle)}</p>` : ''}
      ${cover.summary ? `<div class="sum">${prose(cover.summary)}</div>` : ''}
      ${(cover.outcomes || []).length
        ? `<div class="ip-outcomes"><h2>Resultados de aprendizaje</h2><ul>${(cover.outcomes || [])
            .map((o) => `<li>${inline(o)}</li>`)
            .join('')}</ul></div>`
        : ''}
      <div class="ip-nav"><button type="button" class="ip-btn" data-go="1">Explorar</button></div>
    </div>
  </section>`

  const sceneHtml = scenes
    .map((scene, index) => {
      const spots = scene.hotspots
        .map((hotspot, i) => {
          const style =
            hotspot.shape === 'area'
              ? `left:${hotspot.x}%;top:${hotspot.y}%;width:${hotspot.w ?? 20}%;height:${hotspot.h ?? 15}%`
              : `left:${hotspot.x}%;top:${hotspot.y}%`
          const inner =
            hotspot.shape === 'area'
              ? `<span class="ip-tag">${escapeHtml(hotspot.label)}</span>`
              : `<span class="ip-pin">${i + 1}</span>`
          return `<button type="button" class="ip-spot ${hotspot.shape === 'area' ? 'ip-area' : ''}" data-spot="${escapeHtml(hotspot.id)}" style="${style}" aria-label="${escapeHtml(hotspot.label)}">${inner}</button>`
        })
        .join('')

      const panels = scene.hotspots
        .map(
          (hotspot) => `<div class="ip-panel" data-for="${escapeHtml(hotspot.id)}">
            <button type="button" class="ip-close" aria-label="Cerrar">×</button>
            <h3>${inline(hotspot.label)}</h3>
            ${hotspot.body ? prose(hotspot.body) : ''}
            ${hotspot.media?.url ? `<img src="${escapeHtml(hotspot.media.url)}" alt="${escapeHtml(hotspot.media.alt || '')}" loading="lazy">` : ''}
          </div>`
        )
        .join('')

      // La lista bajo la escena hace el recorrido accesible con teclado y
      // utilizable en pantallas donde apuntar a un punto es incómodo.
      const legend = scene.hotspots
        .map((hotspot) => `<button type="button" data-spot="${escapeHtml(hotspot.id)}">${escapeHtml(hotspot.label)}</button>`)
        .join('')

      return `<section class="ip-scene">
        ${scene.intro ? `<p class="ip-intro">${inline(scene.intro)}</p>` : ''}
        <div class="ip-stage${scene.background?.url ? '' : ' no-bg'}">
          ${scene.background?.url ? `<img src="${escapeHtml(scene.background.url)}" alt="${escapeHtml(scene.background.alt || '')}">` : ''}
          ${spots}
          ${panels}
        </div>
        <div class="ip-legend">${legend}</div>
        <div class="ip-nav">
          <button type="button" class="ip-btn ip-btn--ghost" data-go="${index}">Anterior</button>
          ${index + 1 < scenes.length ? `<button type="button" class="ip-btn" data-go="${index + 2}">Siguiente escena</button>` : ''}
          <span class="ip-progress"></span>
        </div>
      </section>`
    })
    .join('')

  const scormShim = mode === 'scorm' ? '<script src="scorm-api.js"></script>' : ''
  const noindex = mode === 'public' ? '' : '<meta name="robots" content="noindex">'

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(docTitle)}</title>
${noindex}
<meta name="description" content="${escapeHtml(cover.summary || meta.subtitle || '')}">
<style>${css(directives)}</style>
</head>
<body>
<div class="ip">
  <div class="ip-top">
    ${directives.graphic.logoUrl ? `<img src="${escapeHtml(directives.graphic.logoUrl)}" alt="${escapeHtml(meta.workspaceName)}">` : ''}
    <div>
      <div class="ip-client">${escapeHtml(meta.workspaceName)}</div>
      <div class="ip-title">${escapeHtml(meta.course || docTitle)}</div>
    </div>
    <div class="ip-steps">${steps}</div>
  </div>
  ${coverHtml}
  ${sceneHtml}
  ${directives.graphic.footerText ? `<div class="ip-foot">${escapeHtml(directives.graphic.footerText)}</div>` : ''}
</div>
${scormShim}
<script>${player(mode, directives.exports.completion)}</script>
</body>
</html>`
}
