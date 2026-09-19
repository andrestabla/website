/**
 * Learning Builder · render del video.
 *
 * El mismo documento cumple dos oficios según en qué punto esté la pieza.
 * Antes del rodaje es el storyboard que revisa el cliente: los planos en
 * orden, con su duración, lo que se ve, lo que se dice y el rótulo en
 * pantalla. Después del montaje, esos mismos planos se convierten en el índice
 * del reproductor, porque sus duraciones ya dicen en qué segundo entra cada
 * uno.
 *
 * La transcripción va siempre, haya video o no: es lo que hace el recurso
 * utilizable sin sonido, buscable y citable.
 */
import { LB_SHOT_KIND_LABEL, shotStarts, videoSeconds, type LbVideoContent } from '../../src/learning/lib/video.js'
import type { LbDirectives } from '../../src/learning/lib/directives.js'
import {
  clock, completionScript, coverHtml, escapeHtml, inline, prose, renderDocument,
  type LbRenderMeta, type LbRenderMode,
} from './lb-render-kit.js'

const CSS = `
.vd-stage{background:#000;border-radius:var(--lb-radius);overflow:hidden;margin-top:16px}
.vd-stage video{width:100%;display:block;aspect-ratio:16/9;background:#000}

.vd-shot{display:grid;grid-template-columns:96px 200px minmax(0,1fr);gap:16px;padding:16px 0;
  border-top:1px solid var(--lb-line);align-items:start}
.vd-shot:first-of-type{border-top:0}
.vd-time{display:flex;flex-direction:column;gap:4px}
.vd-at{border:0;background:none;padding:0;text-align:left;font-family:var(--lb-heading);font-weight:800;
  font-size:15px;color:var(--lb-accent-dark);cursor:pointer}
.vd-at:hover{color:var(--lb-accent)}
.vd-at[disabled]{cursor:default;color:var(--lb-accent-dark)}
.vd-dur{font-size:11.5px;color:var(--lb-muted)}
.vd-kind{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--lb-muted)}
.vd-still{border-radius:calc(var(--lb-radius)*.6);border:1px solid var(--lb-line);overflow:hidden;background:#f8fafc}
.vd-still img{width:100%;aspect-ratio:16/9;object-fit:cover}
.vd-still.is-empty{display:grid;place-items:center;aspect-ratio:16/9;color:#94a3b8;font-size:12px;
  border-style:dashed;text-align:center;padding:8px}
.vd-title{font-family:var(--lb-heading);font-weight:800;font-size:16px;margin:0 0 6px}
.vd-visual{color:var(--lb-muted);font-size:14.5px;margin:0 0 8px}
.vd-says{border-left:3px solid var(--lb-accent);padding-left:12px}
.vd-says p{margin:0 0 .6em}
.vd-says p:last-child{margin-bottom:0}
.vd-onscreen{margin-top:8px;font-size:12.5px}
.vd-onscreen b{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--lb-muted)}
.vd-shot.is-live{background:color-mix(in srgb, var(--lb-accent) 7%, transparent);
  border-radius:calc(var(--lb-radius)*.6);padding-left:12px;padding-right:12px}

.vd-sum{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}

@media (max-width:820px){
  .vd-shot{grid-template-columns:80px minmax(0,1fr)}
  .vd-still{grid-column:1 / -1;max-width:320px}
}
@media (max-width:560px){
  .vd-shot{grid-template-columns:1fr}
  .vd-time{flex-direction:row;align-items:baseline;gap:8px}
  .vd-still{max-width:100%}
}
`

const PLAYER = `
(function(){
  var film = document.getElementById('vd-film');
  var shots = Array.prototype.slice.call(document.querySelectorAll('.vd-shot'));

  function paint(index){
    shots.forEach(function(shot, i){ shot.classList.toggle('is-live', i === index); });
    if (index >= 0) LBDONE.mark(String(index));
  }

  shots.forEach(function(shot, i){
    var at = shot.querySelector('.vd-at');
    if (!at || at.disabled) return;
    at.addEventListener('click', function(){
      if (!film) return;
      film.currentTime = parseFloat(shot.getAttribute('data-at') || '0');
      film.play().catch(function(){ /* el navegador pide un gesto */ });
      paint(i);
    });
  });

  if (film) {
    film.addEventListener('timeupdate', function(){
      var t = film.currentTime, found = -1;
      for (var i = 0; i < shots.length; i++) {
        if (parseFloat(shots[i].getAttribute('data-at') || '0') <= t) found = i;
      }
      paint(found);
    });
  } else {
    // Sin pieza montada, el storyboard se da por leído al abrirlo.
    shots.forEach(function(_, i){ LBDONE.mark(String(i)); });
  }
})();
`

export function renderVideoHtml(options: {
  meta: LbRenderMeta
  content: LbVideoContent
  directives: LbDirectives
  mode: LbRenderMode
}): string {
  const { meta, content, directives, mode } = options
  const cover = content.cover || {}
  const docTitle = cover.title || meta.title
  const film = content.film
  const starts = shotStarts(content)
  const total = videoSeconds(content)

  const stage = film?.url
    ? `<div class="vd-stage">
        <video id="vd-film" controls preload="metadata"${film.poster ? ` poster="${escapeHtml(film.poster)}"` : ''}>
          <source src="${escapeHtml(film.url)}">
          ${film.captionsUrl
            ? `<track kind="captions" srclang="es" label="Español" src="${escapeHtml(film.captionsUrl)}" default>`
            : ''}
          Tu navegador no puede reproducir este video. La transcripción completa está más abajo.
        </video>
      </div>`
    : ''

  const shots = content.shots
    .map((shot, index) => {
      const still = shot.still?.url
        ? `<div class="vd-still"><img src="${escapeHtml(shot.still.url)}" alt="${escapeHtml(shot.still.alt || '')}" loading="lazy"></div>`
        : `<div class="vd-still is-empty">Sin fotograma</div>`
      return `<div class="vd-shot" data-at="${starts[index]}">
        <div class="vd-time">
          <button type="button" class="vd-at"${film?.url ? '' : ' disabled'}>${escapeHtml(clock(starts[index]))}</button>
          <span class="vd-dur">${shot.seconds} s</span>
          <span class="vd-kind">${escapeHtml(LB_SHOT_KIND_LABEL[shot.kind])}</span>
        </div>
        ${still}
        <div>
          <p class="vd-title">${index + 1}. ${inline(shot.title)}</p>
          ${shot.visual ? `<p class="vd-visual">${inline(shot.visual)}</p>` : ''}
          ${shot.narration ? `<div class="vd-says">${prose(shot.narration)}</div>` : ''}
          ${shot.onScreen ? `<p class="vd-onscreen"><b>En pantalla</b> · ${inline(shot.onScreen)}</p>` : ''}
        </div>
      </div>`
    })
    .join('')

  const summary = `<div class="vd-sum">
    <span class="lb-chip">${content.shots.length} plano(s)</span>
    <span class="lb-chip">${escapeHtml(clock(total))} de duración</span>
    ${film?.url ? '<span class="lb-chip">Video montado</span>' : '<span class="lb-chip">Guion técnico</span>'}
    ${film?.captionsUrl ? '<span class="lb-chip">Con subtítulos</span>' : ''}
  </div>`

  const body = `
${coverHtml(cover, meta, summary)}
${stage}
<section class="lb-card">
  <h2 class="lb-h">${film?.url ? 'Índice y transcripción' : 'Guion técnico'}</h2>
  ${shots || '<p style="color:var(--lb-muted)">El guion no tiene planos todavía.</p>'}
</section>`

  return renderDocument({
    meta,
    directives,
    mode,
    docTitle,
    description: cover.summary || '',
    css: CSS,
    body,
    script: `${completionScript(directives, content.shots.length)}${PLAYER}`,
  })
}
