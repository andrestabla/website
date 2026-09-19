/**
 * Learning Builder · render del pódcast.
 *
 * El episodio se escucha y se lee a la vez: arriba el reproductor, debajo la
 * transcripción completa, y la intervención que suena queda resaltada. Eso no
 * es un adorno de accesibilidad — es como se estudia un pódcast académico: se
 * escucha una vez y después se vuelve al párrafo concreto.
 *
 * Hay dos formas de tener audio y las dos se reproducen igual. Si existe el
 * episodio montado se usa ese, y cada intervención sabe en qué segundo entra.
 * Si solo hay locuciones sueltas se encadenan en orden, que es exactamente lo
 * que produce el generador de voz intervención por intervención. Y si no hay
 * ninguna, el mismo documento se lee como guion: el recurso nunca queda mudo.
 */
import {
  LB_PODCAST_PART_LABEL, podcastSeconds, type LbPodcastContent,
} from '../../src/learning/lib/podcast.js'
import type { LbDirectives } from '../../src/learning/lib/directives.js'
import {
  clock, completionScript, coverHtml, escapeHtml, inline, prose, renderDocument,
  type LbRenderMeta, type LbRenderMode,
} from './lb-render-kit.js'

const CSS = `
.pc-player{position:sticky;top:0;z-index:5;background:var(--lb-surface);border-radius:var(--lb-radius);
  padding:18px 20px;margin-top:16px;box-shadow:0 1px 2px rgba(15,23,42,.06),0 10px 24px -18px rgba(15,23,42,.4)}
.pc-player audio{width:100%;margin-top:10px}
.pc-now{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.pc-now strong{font-family:var(--lb-heading);font-size:15px}
.pc-now span{font-size:12.5px;color:var(--lb-muted)}
.pc-meta{margin-left:auto;font-size:12px;color:var(--lb-muted)}

.pc-voices{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.pc-voice{border:1px solid var(--lb-line);border-radius:var(--lb-radius);padding:10px 14px;flex:1 1 220px}
.pc-voice b{display:block;font-family:var(--lb-heading);font-size:14px}
.pc-voice span{font-size:12.5px;color:var(--lb-muted)}

.pc-cue{display:grid;grid-template-columns:120px minmax(0,1fr);gap:16px;padding:14px 0;
  border-top:1px solid var(--lb-line);align-items:start}
.pc-cue:first-of-type{border-top:0}
.pc-side{display:flex;flex-direction:column;gap:4px}
.pc-who{font-family:var(--lb-heading);font-weight:800;font-size:13.5px;color:var(--lb-accent-dark)}
.pc-part{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--lb-muted)}
.pc-at{border:0;background:none;padding:0;text-align:left;font-size:12px;color:var(--lb-muted);
  cursor:pointer;text-decoration:underline dotted}
.pc-at:hover{color:var(--lb-accent)}
.pc-body p{margin:0 0 .7em}
.pc-body p:last-child{margin-bottom:0}
.pc-cue.is-live{background:color-mix(in srgb, var(--lb-accent) 7%, transparent);
  border-radius:calc(var(--lb-radius)*.6);padding-left:12px;padding-right:12px}
.pc-cue.is-live .pc-who{color:var(--lb-accent)}
.pc-title{font-family:var(--lb-heading);font-weight:800;font-size:15px;margin:0 0 4px}
.pc-silent{font-size:12.5px;color:var(--lb-muted);font-style:italic}

@media (max-width:700px){
  .pc-cue{grid-template-columns:1fr;gap:4px}
  .pc-side{flex-direction:row;align-items:baseline;gap:8px}
}
@media print{ .pc-player{display:none} }
`

function player(hasAudio: boolean): string {
  return `
(function(){
  var audio = document.getElementById('pc-audio');
  var cues = Array.prototype.slice.call(document.querySelectorAll('.pc-cue'));
  var nowLabel = document.getElementById('pc-now');
  var current = -1;

  function paint(index){
    cues.forEach(function(cue, i){ cue.classList.toggle('is-live', i === index); });
    if (nowLabel && cues[index]) {
      nowLabel.textContent = cues[index].getAttribute('data-who') || '';
    }
    if (index >= 0) LBDONE.mark(String(index));
  }

  // Salta al tramo pedido: en el episodio montado moviendo el cabezal, y en
  // las locuciones sueltas cambiando de pista.
  function goTo(index){
    if (index < 0 || index >= cues.length) return;
    var at = cues[index].getAttribute('data-at');
    var src = cues[index].getAttribute('data-src');
    current = index;
    paint(index);
    if (!audio) return;
    if (src) {
      if (audio.getAttribute('src') !== src) audio.setAttribute('src', src);
      audio.currentTime = 0;
    } else if (at !== null) {
      audio.currentTime = parseFloat(at) || 0;
    }
    audio.play().catch(function(){ /* el navegador pide un gesto: ya está pintado */ });
  }

  cues.forEach(function(cue, i){
    var at = cue.querySelector('.pc-at');
    if (at) at.addEventListener('click', function(){ goTo(i); });
  });

  ${hasAudio ? `
  if (audio) {
    audio.addEventListener('timeupdate', function(){
      if (audio.getAttribute('data-playlist') === '1') return;
      var t = audio.currentTime, found = -1;
      for (var i = 0; i < cues.length; i++) {
        if (parseFloat(cues[i].getAttribute('data-at') || '0') <= t) found = i;
      }
      if (found !== current) { current = found; paint(found); }
    });
    audio.addEventListener('ended', function(){
      // En modo lista de pistas, el final de una es el comienzo de la siguiente.
      if (audio.getAttribute('data-playlist') === '1' && current + 1 < cues.length) goTo(current + 1);
    });
  }
  ` : ''}

  ${hasAudio ? '' : 'cues.forEach(function(_, i){ LBDONE.mark(String(i)); });'}
})();
`
}

export function renderPodcastHtml(options: {
  meta: LbRenderMeta
  content: LbPodcastContent
  directives: LbDirectives
  mode: LbRenderMode
}): string {
  const { meta, content, directives, mode } = options
  const cover = content.cover || {}
  const docTitle = cover.title || meta.title
  const speakerById = new Map(content.speakers.map((speaker) => [speaker.id, speaker]))

  // El episodio montado manda: si existe, cada intervención entra en el
  // segundo que le corresponde; si no, se encadenan las locuciones sueltas.
  const master = content.master?.url || ''
  const playlist = !master && content.cues.some((cue) => cue.audio?.url)
  const hasAudio = !!master || playlist

  let elapsed = 0
  const starts = content.cues.map((cue) => {
    const at = elapsed
    elapsed += cue.audio?.seconds || 0
    return at
  })

  const voices = content.speakers.length
    ? `<div class="pc-voices">${content.speakers
        .map(
          (speaker) => `<div class="pc-voice">
            <b>${escapeHtml(speaker.name)}</b>
            ${speaker.role ? `<span>${escapeHtml(speaker.role)}</span>` : ''}
          </div>`
        )
        .join('')}</div>`
    : ''

  const playerHtml = `<div class="pc-player lb-noprint">
    <div class="pc-now">
      <strong id="pc-now">${hasAudio ? 'Listo para escuchar' : 'Guion del episodio'}</strong>
      <span class="pc-meta">${escapeHtml(clock(podcastSeconds(content)))} · ${content.cues.length} intervenciones</span>
    </div>
    ${hasAudio
      ? `<audio id="pc-audio" controls preload="metadata"${playlist ? ' data-playlist="1"' : ''}
           src="${escapeHtml(master || content.cues.find((cue) => cue.audio?.url)?.audio?.url || '')}"></audio>`
      : `<p class="pc-silent">Todavía no hay locución: el episodio se publica como guion leído.</p>`}
  </div>`

  const cues = content.cues
    .map((cue, index) => {
      const speaker = speakerById.get(cue.speakerId || '')
      const who = speaker?.name || LB_PODCAST_PART_LABEL[cue.part]
      // En lista de pistas cada intervención lleva la suya; en el montado,
      // el segundo de entrada.
      const at = playlist ? '' : ` data-at="${starts[index]}"`
      const src = playlist && cue.audio?.url ? ` data-src="${escapeHtml(cue.audio.url)}"` : ''
      const stamp = hasAudio
        ? `<button type="button" class="pc-at">${escapeHtml(playlist ? `Pista ${index + 1}` : clock(starts[index]))}</button>`
        : ''
      return `<div class="pc-cue" data-who="${escapeHtml(who)}"${at}${src}>
        <div class="pc-side">
          <span class="pc-who">${escapeHtml(who)}</span>
          <span class="pc-part">${escapeHtml(LB_PODCAST_PART_LABEL[cue.part])}</span>
          ${stamp}
        </div>
        <div class="pc-body">
          ${cue.title ? `<p class="pc-title">${inline(cue.title)}</p>` : ''}
          ${cue.text ? prose(cue.text) : '<p class="pc-silent">Sin texto todavía.</p>'}
        </div>
      </div>`
    })
    .join('')

  const body = `
${coverHtml(cover, meta, voices)}
${playerHtml}
<section class="lb-card">
  <h2 class="lb-h">Transcripción</h2>
  ${cues || '<p class="pc-silent">El episodio no tiene intervenciones todavía.</p>'}
</section>`

  return renderDocument({
    meta,
    directives,
    mode,
    docTitle,
    description: cover.summary || '',
    css: CSS,
    body,
    script: `${completionScript(directives, content.cues.length)}${player(hasAudio)}`,
  })
}
