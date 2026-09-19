/**
 * Learning Builder · motor de render del OVA.
 *
 * Produce un documento HTML completo y autocontenido a partir del guion y de
 * las directivas del workspace. Es el único renderizador: lo usan la vista
 * previa del editor, el enlace público, la descarga HTML y el index.html del
 * paquete SCORM. Por eso lo que el diseñador ve previsualizado es exactamente
 * lo que se publica y lo que se sube al campus.
 *
 * No depende de red: todo el CSS y el JS van en línea.
 *
 * Vive en el dominio compartido, y no en api/, porque el editor pinta cada
 * bloque con este mismo `renderBlock` y esta misma hoja de estilo. Si fueran
 * dos implementaciones, la caja del editor y la del alumno se irían separando
 * a cada cambio; siendo una sola, no pueden.
 */
import type { LbBlock, LbContent, LbItem } from './blocks.js'
import type { LbDirectives } from './directives.js'

export type LbRenderMeta = {
  title: string
  subtitle?: string | null
  course?: string | null
  unit?: string | null
  workspaceName: string
}

export type LbRenderMode = 'preview' | 'public' | 'html' | 'scorm'

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Markdown mínimo del editor: **negrita**, *cursiva* y saltos de párrafo. */
function inline(value: unknown): string {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
}

function prose(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${inline(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function mediaTag(media: { url: string; alt?: string } | undefined, className = ''): string {
  if (!media?.url) return ''
  return `<img src="${escapeHtml(media.url)}" alt="${escapeHtml(media.alt || '')}"${className ? ` class="${className}"` : ''} loading="lazy">`
}

/** Convierte una URL de video en algo reproducible dentro del OVA. */
function videoEmbed(url: string): string {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/)
  if (youtube) {
    return `<iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(youtube[1])}" title="Video" allowfullscreen loading="lazy"></iframe>`
  }
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) {
    return `<iframe src="https://player.vimeo.com/video/${escapeHtml(vimeo[1])}" title="Video" allowfullscreen loading="lazy"></iframe>`
  }
  return `<video controls preload="metadata" src="${escapeHtml(url)}"></video>`
}

function items(block: LbBlock): LbItem[] {
  return Array.isArray(block.items) ? block.items : []
}

// ── Bloques ──────────────────────────────────────────────────────────────────

export function renderBlock(block: LbBlock, index: number): string {
  const key = escapeHtml(block.id || `b${index}`)

  switch (block.type) {
    case 'heading':
      return block.variant === 'h3'
        ? `<h3 class="lb-h3">${inline(block.text)}</h3>`
        : `<h2 class="lb-h2">${inline(block.text)}</h2>`

    case 'paragraph':
      return `<div class="lb-prose">${prose(block.text)}</div>`

    case 'statement':
      return `<div class="lb-statement lb-statement--${escapeHtml(block.variant || 'a')}">${inline(block.text)}</div>`

    case 'note':
      return `<aside class="lb-note lb-note--${escapeHtml(block.variant || 'info')}">
        ${block.caption ? `<div class="lb-note__title">${inline(block.caption)}</div>` : ''}
        <div class="lb-prose">${prose(block.text)}</div>
      </aside>`

    case 'list': {
      const rows = items(block).map((item) => `<li>${inline(item.title)}</li>`).join('')
      if (block.variant === 'numbered') return `<ol class="lb-list lb-list--num">${rows}</ol>`
      if (block.variant === 'checklist') return `<ul class="lb-list lb-list--check">${rows}</ul>`
      return `<ul class="lb-list">${rows}</ul>`
    }

    case 'table': {
      const headers = String(block.text || '').split('|').map((cell) => cell.trim())
      const head = headers.filter(Boolean).length
        ? `<thead><tr>${headers.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead>`
        : ''
      const body = items(block)
        .map((item) => `<tr><td>${inline(item.title)}</td><td>${inline(item.description)}</td></tr>`)
        .join('')
      return `<div class="lb-tablewrap"><table class="lb-table">${head}<tbody>${body}</tbody></table></div>`
    }

    case 'quote':
      return `<blockquote class="lb-quote">${inline(block.text)}${block.caption ? `<cite>${inline(block.caption)}</cite>` : ''}</blockquote>`

    case 'image': {
      if (block.variant === 'aside') {
        return `<figure class="lb-figure lb-figure--aside">
          <div class="lb-figure__media">${mediaTag(block.media)}${block.caption ? `<figcaption>${inline(block.caption)}</figcaption>` : ''}</div>
          <div class="lb-prose">${prose(block.text)}</div>
        </figure>`
      }
      return `<figure class="lb-figure">${mediaTag(block.media)}${block.caption ? `<figcaption>${inline(block.caption)}</figcaption>` : ''}</figure>`
    }

    case 'video':
      return `<figure class="lb-video">${block.media?.url ? videoEmbed(block.media.url) : ''}${block.caption ? `<figcaption>${inline(block.caption)}</figcaption>` : ''}</figure>`

    case 'accordion':
      return `<div class="lb-accordion" data-lb="accordion">${items(block)
        .map(
          (item, i) => `<details class="lb-accordion__item"${i === 0 ? '' : ''}>
            <summary>${inline(item.title)}</summary>
            <div class="lb-prose">${prose(item.description)}</div>
          </details>`
        )
        .join('')}</div>`

    case 'tabs': {
      const list = items(block)
      return `<div class="lb-tabs" data-lb="tabs">
        <div class="lb-tabs__bar" role="tablist">${list
          .map(
            (item, i) =>
              `<button type="button" role="tab" class="lb-tabs__tab${i === 0 ? ' is-active' : ''}" aria-selected="${i === 0}" data-index="${i}">${inline(item.title)}</button>`
          )
          .join('')}</div>
        ${list
          .map(
            (item, i) => `<div class="lb-tabs__panel${i === 0 ? ' is-active' : ''}" role="tabpanel" data-index="${i}">
              ${mediaTag(item.media, 'lb-tabs__media')}
              <div class="lb-prose">${prose(item.description)}</div>
            </div>`
          )
          .join('')}
      </div>`
    }

    case 'process': {
      const steps = items(block)
      return `<div class="lb-process" data-lb="process">
        <div class="lb-process__rail">${steps
          .map((step, i) => `<button type="button" class="lb-process__dot${i === 0 ? ' is-active' : ''}" data-index="${i}" aria-label="${escapeHtml(step.title || `Paso ${i + 1}`)}">${i + 1}</button>`)
          .join('')}</div>
        ${steps
          .map(
            (step, i) => `<div class="lb-process__panel${i === 0 ? ' is-active' : ''}" data-index="${i}">
              <div class="lb-process__label">${step.kind === 'intro' ? 'Inicio' : step.kind === 'summary' ? 'Síntesis' : `Paso ${i + 1}`}</div>
              <h4>${inline(step.title)}</h4>
              <div class="lb-prose">${prose(step.description)}</div>
            </div>`
          )
          .join('')}
        <div class="lb-process__nav">
          <button type="button" class="lb-btn lb-btn--ghost" data-step="prev">Anterior</button>
          <button type="button" class="lb-btn" data-step="next">Siguiente</button>
        </div>
      </div>`
    }

    case 'timeline':
      return `<ol class="lb-timeline">${items(block)
        .map(
          (item) => `<li><div class="lb-timeline__date">${inline(item.date)}</div>
            <div class="lb-timeline__body"><h4>${inline(item.title)}</h4><div class="lb-prose">${prose(item.description)}</div></div></li>`
        )
        .join('')}</ol>`

    case 'flashcards':
      return `<div class="lb-cards" data-lb="flashcards">${items(block)
        .map(
          (item) => `<button type="button" class="lb-card" aria-label="Voltear tarjeta">
            <span class="lb-card__face lb-card__face--front">${mediaTag(item.media)}<span>${inline(item.title)}</span></span>
            <span class="lb-card__face lb-card__face--back"><span>${inline(item.back)}</span></span>
          </button>`
        )
        .join('')}</div>`

    case 'sorting': {
      const piles = block.piles || []
      return `<div class="lb-sorting" data-lb="sorting" data-block="${key}">
        <div class="lb-sorting__pool">${items(block)
          .map((item) => `<button type="button" class="lb-chip" data-pile="${escapeHtml(item.pileId || '')}">${inline(item.title)}</button>`)
          .join('')}</div>
        <div class="lb-sorting__piles">${piles
          .map((pile) => `<div class="lb-pile" data-pile="${escapeHtml(pile.id)}"><div class="lb-pile__title">${inline(pile.title)}</div><div class="lb-pile__drop"></div></div>`)
          .join('')}</div>
        <div class="lb-sorting__foot">
          <button type="button" class="lb-btn" data-action="check">Comprobar</button>
          <button type="button" class="lb-btn lb-btn--ghost" data-action="reset">Reiniciar</button>
          <span class="lb-feedback" role="status"></span>
        </div>
      </div>`
    }

    case 'check':
      return renderCheck(block, key)

    case 'continue':
      return `<div class="lb-continue" data-lb="continue">
        <button type="button" class="lb-btn">${inline(block.text || 'Continuar')}</button>
        ${block.caption ? `<div class="lb-continue__hint">${inline(block.caption)}</div>` : ''}
      </div>`

    case 'divider':
      return block.variant === 'line' ? '<hr class="lb-rule">' : '<div class="lb-space"></div>'

    default:
      return ''
  }
}

function renderCheck(block: LbBlock, key: string): string {
  const variant = block.variant || 'choice'
  const list = items(block)
  const head = `<div class="lb-check__head"><span class="lb-check__tag">Comprobación</span><div class="lb-check__prompt">${inline(block.text)}</div></div>`

  let body = ''
  if (variant === 'matching') {
    const rights = list.map((item) => item.match || '')
    // Orden estable e independiente del de la izquierda, para que no se resuelva por posición.
    const options = [...new Set(rights)].sort((a, b) => a.localeCompare(b, 'es'))
    body = `<div class="lb-match">${list
      .map(
        (item, i) => `<div class="lb-match__row">
          <div class="lb-match__left">${inline(item.title)}</div>
          <select class="lb-match__select" data-answer="${escapeHtml(item.match || '')}" aria-label="Pareja de ${escapeHtml(item.title || `elemento ${i + 1}`)}">
            <option value="">Elige…</option>
            ${options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')}
          </select>
        </div>`
      )
      .join('')}</div>`
  } else if (variant === 'fillin') {
    const accepted = list.map((item) => String(item.title || '').trim()).filter(Boolean)
    body = `<div class="lb-fillin">
      <input type="text" class="lb-input" data-accepted="${escapeHtml(JSON.stringify(accepted))}" placeholder="Escribe tu respuesta" aria-label="Respuesta">
    </div>`
  } else {
    const type = variant === 'multiple' ? 'checkbox' : 'radio'
    body = `<div class="lb-options">${list
      .map(
        (item, i) => `<label class="lb-option">
          <input type="${type}" name="${key}" value="${i}" data-correct="${item.correct ? '1' : '0'}">
          <span>${inline(item.title)}</span>
          ${item.feedback ? `<span class="lb-option__fb" hidden>${inline(item.feedback)}</span>` : ''}
        </label>`
      )
      .join('')}</div>`
  }

  return `<div class="lb-check" data-lb="check" data-variant="${escapeHtml(variant)}"${block.required ? ' data-required="1"' : ''}>
    ${head}
    ${body}
    <div class="lb-check__foot">
      <button type="button" class="lb-btn" data-action="submit">Comprobar</button>
      <button type="button" class="lb-btn lb-btn--ghost" data-action="retry" hidden>Intentar de nuevo</button>
      <span class="lb-feedback" role="status"></span>
    </div>
  </div>`
}

// ── Documento ────────────────────────────────────────────────────────────────

function renderCover(content: LbContent, meta: LbRenderMeta): string {
  const cover = content.cover || {}
  const outcomes = cover.outcomes || []
  return `<section class="lb-screen lb-cover" data-screen="0" id="lb-screen-0">
    <div class="lb-cover__inner">
      ${cover.kicker || meta.course ? `<div class="lb-cover__kicker">${inline(cover.kicker || meta.course)}</div>` : ''}
      <h1>${inline(cover.title || meta.title)}</h1>
      ${cover.subtitle || meta.subtitle ? `<p class="lb-cover__sub">${inline(cover.subtitle || meta.subtitle)}</p>` : ''}
      ${cover.media ? `<div class="lb-cover__media">${mediaTag(cover.media)}</div>` : ''}
      ${cover.summary ? `<div class="lb-prose lb-cover__summary">${prose(cover.summary)}</div>` : ''}
      ${outcomes.length
        ? `<div class="lb-outcomes"><h2>Resultados de aprendizaje</h2><ul>${outcomes.map((outcome) => `<li>${inline(outcome)}</li>`).join('')}</ul></div>`
        : ''}
      <button type="button" class="lb-btn lb-btn--lg" data-go="1">Comenzar</button>
    </div>
  </section>`
}

export function ovaCss(directives: LbDirectives): string {
  const brand = directives.graphic
  // La densidad ajusta el tamaño base y el aire de la composición.
  const scale = brand.density === 'compact' ? 16 : brand.density === 'airy' ? 18 : 17
  const gap = brand.density === 'compact' ? 16 : brand.density === 'airy' ? 30 : 22
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
  --lb-gap:${gap}px;
}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:#f1f5f9;color:var(--lb-text);font-family:var(--lb-body);font-size:${scale}px;line-height:1.7;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:var(--lb-heading);line-height:1.2;letter-spacing:-.01em;margin:0}
img{max-width:100%;height:auto;display:block}
button{font:inherit}

.lb-app{display:grid;grid-template-columns:288px minmax(0,1fr);min-height:100vh}
.lb-nav{position:sticky;top:0;height:100vh;overflow-y:auto;background:#0f172a;color:#cbd5e1;padding:20px 16px;display:flex;flex-direction:column;gap:6px}
.lb-nav__brand{display:flex;align-items:center;gap:10px;padding:0 6px 14px;border-bottom:1px solid rgba(255,255,255,.12);margin-bottom:10px}
.lb-nav__brand img{max-height:34px;width:auto}
.lb-nav__title{font-family:var(--lb-heading);font-weight:800;font-size:14px;color:#fff;line-height:1.25}
.lb-nav__client{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#64748b}
.lb-nav__item{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;background:none;border:0;color:#cbd5e1;padding:9px 10px;border-radius:calc(var(--lb-radius) * .7);cursor:pointer;font-size:14px;line-height:1.4}
.lb-nav__item:hover{background:rgba(255,255,255,.07);color:#fff}
.lb-nav__item.is-active{background:var(--lb-accent);color:#fff;font-weight:600}
.lb-nav__num{flex:none;width:22px;height:22px;border-radius:999px;display:grid;place-items:center;font-size:11px;font-weight:700;background:rgba(255,255,255,.12)}
.lb-nav__item.is-done .lb-nav__num{background:#22c55e;color:#04240f}
.lb-nav__progress{margin-top:auto;padding-top:16px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#64748b}
.lb-nav__bar{height:4px;border-radius:999px;background:rgba(255,255,255,.14);margin-top:8px;overflow:hidden}
.lb-nav__bar span{display:block;height:100%;width:0;background:var(--lb-accent);transition:width .3s ease}

.lb-main{background:#f1f5f9;padding:0 0 80px}
.lb-topbar{display:none;position:sticky;top:0;z-index:20;align-items:center;gap:10px;background:#0f172a;color:#fff;padding:10px 14px}
.lb-topbar button{background:rgba(255,255,255,.12);border:0;color:#fff;border-radius:8px;padding:7px 10px;cursor:pointer}

.lb-screen{display:none;max-width:820px;margin:0 auto;padding:44px 24px 0}
.lb-screen.is-active{display:block;animation:lb-in .25s ease}
@keyframes lb-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.lb-screen__head{margin-bottom:26px;padding-bottom:18px;border-bottom:1px solid var(--lb-line)}
.lb-screen__kicker{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--lb-accent)}
.lb-screen__head h1{font-size:34px;margin-top:8px}
.lb-block{margin:0 0 var(--lb-gap)}

.lb-cover{padding-top:0}
.lb-cover__inner{background:var(--lb-surface);border-radius:var(--lb-radius);padding:48px 40px;margin-top:44px;box-shadow:0 1px 2px rgba(15,23,42,.06)}
.lb-cover__kicker{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--lb-accent)}
.lb-cover h1{font-size:40px;margin:10px 0 0}
.lb-cover__sub{color:var(--lb-muted);font-size:19px;margin:10px 0 0}
.lb-cover__media{margin:26px 0}
.lb-cover__media img{border-radius:var(--lb-radius)}
.lb-cover__summary{margin-top:22px}
.lb-outcomes{margin-top:26px;border-left:3px solid var(--lb-accent);padding-left:18px}
.lb-outcomes h2{font-size:14px;text-transform:uppercase;letter-spacing:.12em;color:var(--lb-muted)}
.lb-outcomes ul{margin:10px 0 0;padding-left:18px}

.lb-h2{font-size:26px;margin:34px 0 12px}
.lb-h3{font-size:20px;margin:26px 0 10px}
.lb-prose p{margin:0 0 14px}
.lb-prose p:last-child{margin-bottom:0}
.lb-statement{font-family:var(--lb-heading);font-size:24px;line-height:1.4;font-weight:700;margin:30px 0;text-align:center}
.lb-statement--b{text-align:left;border-left:4px solid var(--lb-accent);padding-left:18px}
.lb-statement--c{background:var(--lb-accent);color:#fff;border-radius:var(--lb-radius);padding:28px 26px}
.lb-note{border-radius:var(--lb-radius);padding:18px 20px;margin:22px 0;border-left:4px solid var(--lb-accent);background:var(--lb-surface)}
.lb-note--warning{border-left-color:#f59e0b;background:#fffbeb}
.lb-note--success{border-left-color:#10b981;background:#ecfdf5}
.lb-note--example{border-left-color:#64748b;background:#f8fafc}
.lb-note__title{font-family:var(--lb-heading);font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px}
.lb-list{margin:0 0 18px;padding-left:22px}
.lb-list--check{list-style:none;padding-left:0}
.lb-list--check li{position:relative;padding-left:28px;margin-bottom:8px}
.lb-list--check li::before{content:"";position:absolute;left:0;top:7px;width:16px;height:16px;border:2px solid var(--lb-accent);border-radius:4px}
.lb-tablewrap{overflow-x:auto;margin:20px 0}
.lb-table{width:100%;border-collapse:collapse;background:var(--lb-surface);border-radius:var(--lb-radius);overflow:hidden;font-size:15px}
.lb-table th,.lb-table td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--lb-line)}
.lb-table th{background:#f8fafc;font-family:var(--lb-heading);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.lb-quote{margin:26px 0;padding:0 0 0 20px;border-left:3px solid var(--lb-accent);font-size:19px;font-style:italic;color:var(--lb-muted)}
.lb-quote cite{display:block;margin-top:10px;font-size:13px;font-style:normal;color:#94a3b8}
.lb-figure{margin:24px 0}
.lb-figure img{border-radius:var(--lb-radius)}
.lb-figure figcaption{font-size:13px;color:var(--lb-muted);margin-top:8px}
.lb-figure--aside{display:grid;grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:22px;align-items:start}
.lb-video{margin:24px 0}
.lb-video iframe,.lb-video video{width:100%;aspect-ratio:16/9;border:0;border-radius:var(--lb-radius);background:#000}

.lb-accordion{margin:22px 0;display:grid;gap:8px}
.lb-accordion__item{background:var(--lb-surface);border:1px solid var(--lb-line);border-radius:var(--lb-radius);padding:0}
.lb-accordion__item summary{cursor:pointer;padding:15px 18px;font-family:var(--lb-heading);font-weight:700;list-style:none}
.lb-accordion__item summary::-webkit-details-marker{display:none}
.lb-accordion__item summary::after{content:"+";float:right;color:var(--lb-accent);font-weight:800}
.lb-accordion__item[open] summary::after{content:"–"}
.lb-accordion__item .lb-prose{padding:0 18px 16px}

.lb-tabs{margin:22px 0;background:var(--lb-surface);border:1px solid var(--lb-line);border-radius:var(--lb-radius);overflow:hidden}
.lb-tabs__bar{display:flex;flex-wrap:wrap;gap:2px;background:#f8fafc;border-bottom:1px solid var(--lb-line);padding:6px}
.lb-tabs__tab{border:0;background:none;padding:9px 14px;border-radius:calc(var(--lb-radius) * .6);cursor:pointer;font-weight:600;font-size:14px;color:var(--lb-muted)}
.lb-tabs__tab.is-active{background:var(--lb-accent);color:#fff}
.lb-tabs__panel{display:none;padding:20px}
.lb-tabs__panel.is-active{display:block}
.lb-tabs__media{border-radius:var(--lb-radius);margin-bottom:14px}

.lb-process{margin:22px 0;background:var(--lb-surface);border:1px solid var(--lb-line);border-radius:var(--lb-radius);padding:20px}
.lb-process__rail{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.lb-process__dot{width:32px;height:32px;border-radius:999px;border:2px solid var(--lb-line);background:#fff;color:var(--lb-muted);font-weight:800;cursor:pointer}
.lb-process__dot.is-active{background:var(--lb-accent);border-color:var(--lb-accent);color:#fff}
.lb-process__panel{display:none}
.lb-process__panel.is-active{display:block}
.lb-process__label{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--lb-accent)}
.lb-process__panel h4{font-size:19px;margin:6px 0 10px}
.lb-process__nav{display:flex;gap:8px;margin-top:16px}

.lb-timeline{list-style:none;margin:22px 0;padding:0 0 0 22px;border-left:2px solid var(--lb-line)}
.lb-timeline li{position:relative;padding:0 0 22px 20px}
.lb-timeline li::before{content:"";position:absolute;left:-29px;top:6px;width:12px;height:12px;border-radius:999px;background:var(--lb-accent);border:3px solid #f1f5f9}
.lb-timeline__date{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--lb-accent)}
.lb-timeline__body h4{font-size:18px;margin:4px 0 6px}

.lb-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin:22px 0}
.lb-card{position:relative;min-height:150px;border:0;padding:0;background:none;cursor:pointer;perspective:900px}
.lb-card__face{position:absolute;inset:0;display:grid;place-items:center;padding:18px;text-align:center;border-radius:var(--lb-radius);backface-visibility:hidden;transition:transform .45s;font-weight:600}
.lb-card__face--front{background:var(--lb-surface);border:1px solid var(--lb-line)}
.lb-card__face--back{background:var(--lb-accent);color:#fff;transform:rotateY(180deg)}
.lb-card.is-flipped .lb-card__face--front{transform:rotateY(-180deg)}
.lb-card.is-flipped .lb-card__face--back{transform:rotateY(0)}

.lb-sorting{margin:22px 0;background:var(--lb-surface);border:1px solid var(--lb-line);border-radius:var(--lb-radius);padding:18px}
.lb-sorting__pool{display:flex;flex-wrap:wrap;gap:8px;min-height:44px;padding:8px;border:1px dashed var(--lb-line);border-radius:var(--lb-radius)}
.lb-chip{border:1px solid var(--lb-line);background:#f8fafc;border-radius:999px;padding:7px 14px;cursor:pointer;font-size:14px}
.lb-chip.is-ok{border-color:#10b981;background:#ecfdf5}
.lb-chip.is-bad{border-color:#ef4444;background:#fef2f2}
.lb-sorting__piles{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:12px}
.lb-pile{border:1px solid var(--lb-line);border-radius:var(--lb-radius);padding:10px}
.lb-pile.is-target{border-color:var(--lb-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--lb-accent) 25%,transparent)}
.lb-pile__title{font-family:var(--lb-heading);font-weight:800;font-size:13px;margin-bottom:8px}
.lb-pile__drop{display:flex;flex-wrap:wrap;gap:6px;min-height:40px}
.lb-sorting__foot{display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap}

.lb-check{margin:26px 0;background:var(--lb-surface);border:1px solid var(--lb-line);border-radius:var(--lb-radius);padding:22px}
.lb-check__tag{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--lb-accent)}
.lb-check__prompt{font-family:var(--lb-heading);font-size:19px;font-weight:700;margin:8px 0 16px}
.lb-options{display:grid;gap:8px}
.lb-option{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--lb-line);border-radius:var(--lb-radius);padding:12px 14px;cursor:pointer}
.lb-option:hover{border-color:var(--lb-accent)}
.lb-option.is-ok{border-color:#10b981;background:#ecfdf5}
.lb-option.is-bad{border-color:#ef4444;background:#fef2f2}
.lb-option__fb{display:block;width:100%;font-size:13px;color:var(--lb-muted);margin-top:6px}
.lb-match__row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,220px);gap:10px;align-items:center;margin-bottom:8px}
.lb-match__select,.lb-input{border:1px solid var(--lb-line);border-radius:calc(var(--lb-radius) * .7);padding:10px 12px;font-size:15px;width:100%;background:#fff;color:inherit}
.lb-check__foot{display:flex;align-items:center;gap:10px;margin-top:16px;flex-wrap:wrap}
.lb-feedback{font-size:14px;font-weight:600}
.lb-feedback.is-ok{color:#047857}
.lb-feedback.is-bad{color:#b91c1c}

.lb-continue{margin:28px 0;text-align:center}
.lb-continue__hint{font-size:13px;color:var(--lb-muted);margin-top:8px}
.lb-rule{border:0;border-top:1px solid var(--lb-line);margin:30px 0}
.lb-space{height:26px}

.lb-btn{background:var(--lb-accent);color:#fff;border:0;border-radius:calc(var(--lb-radius) * .7);padding:11px 20px;font-weight:700;cursor:pointer}
.lb-btn:hover{background:var(--lb-accent-dark)}
.lb-btn--ghost{background:transparent;color:var(--lb-muted);border:1px solid var(--lb-line)}
.lb-btn--ghost:hover{background:#f1f5f9;color:var(--lb-text)}
.lb-btn--lg{padding:14px 30px;font-size:17px;margin-top:26px}
.lb-btn[disabled]{opacity:.5;cursor:not-allowed}

.lb-foot{max-width:820px;margin:44px auto 0;padding:22px 24px 0;border-top:1px solid var(--lb-line);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}
.lb-foot__note{font-size:12px;color:#94a3b8}

@media (max-width:900px){
  .lb-app{grid-template-columns:minmax(0,1fr)}
  .lb-topbar{display:flex}
  .lb-nav{position:fixed;inset:0 auto 0 0;width:280px;transform:translateX(-100%);transition:transform .25s;z-index:30}
  .lb-nav.is-open{transform:none}
  .lb-screen{padding:24px 18px 0}
  .lb-cover__inner{padding:30px 22px;margin-top:20px}
  .lb-cover h1{font-size:30px}
  .lb-screen__head h1{font-size:26px}
  .lb-figure--aside{grid-template-columns:minmax(0,1fr)}
  .lb-match__row{grid-template-columns:minmax(0,1fr)}
}
@media print{
  .lb-nav,.lb-topbar,.lb-check__foot,.lb-process__nav,.lb-sorting__foot{display:none}
  .lb-screen{display:block !important;page-break-after:always}
  .lb-tabs__panel,.lb-process__panel{display:block !important}
}
`
}

/** JS del reproductor. Sin dependencias: navegación, interacciones y progreso. */
function playerScript(mode: LbRenderMode, completion: LbDirectives['exports']['completion']): string {
  const scorm = mode === 'scorm'
  return `
(function(){
  var screens = Array.prototype.slice.call(document.querySelectorAll('.lb-screen'));
  var navItems = Array.prototype.slice.call(document.querySelectorAll('.lb-nav__item'));
  var visited = {};
  var checksTotal = document.querySelectorAll('.lb-check').length;
  var checksPassed = {};
  var completed = false;

  function setProgress(){
    var done = Object.keys(visited).length;
    var pct = screens.length ? Math.round(done / screens.length * 100) : 0;
    var bar = document.querySelector('.lb-nav__bar span');
    var label = document.querySelector('.lb-nav__progress b');
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = pct + '%';
    maybeComplete();
  }

  function maybeComplete(){
    if (completed) return;
    var rule = ${JSON.stringify(completion)};
    var ok = false;
    if (rule === 'immediate') ok = true;
    else if (rule === 'checks-passed') ok = checksTotal === 0 ? Object.keys(visited).length === screens.length : Object.keys(checksPassed).length >= checksTotal;
    else ok = Object.keys(visited).length === screens.length;
    if (!ok) return;
    completed = true;
    if (window.LBSCORM) window.LBSCORM.complete();
  }

  function show(index){
    if (index < 0 || index >= screens.length) return;
    screens.forEach(function(screen, i){ screen.classList.toggle('is-active', i === index); });
    navItems.forEach(function(item, i){ item.classList.toggle('is-active', i === index); });
    visited[index] = true;
    var item = navItems[index];
    if (item) item.classList.add('is-done');
    setProgress();
    var nav = document.querySelector('.lb-nav');
    if (nav) nav.classList.remove('is-open');
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (window.LBSCORM) window.LBSCORM.bookmark(String(index));
  }

  navItems.forEach(function(item, i){ item.addEventListener('click', function(){ show(i); }); });
  document.addEventListener('click', function(event){
    var go = event.target.closest('[data-go]');
    if (go) show(parseInt(go.getAttribute('data-go'), 10));
    var toggle = event.target.closest('[data-nav-toggle]');
    if (toggle) {
      var nav = document.querySelector('.lb-nav');
      if (nav) nav.classList.toggle('is-open');
    }
  });

  // ── Pestañas ──
  document.querySelectorAll('[data-lb="tabs"]').forEach(function(root){
    root.querySelectorAll('.lb-tabs__tab').forEach(function(tab){
      tab.addEventListener('click', function(){
        var index = tab.getAttribute('data-index');
        root.querySelectorAll('.lb-tabs__tab').forEach(function(other){
          var on = other === tab;
          other.classList.toggle('is-active', on);
          other.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        root.querySelectorAll('.lb-tabs__panel').forEach(function(panel){
          panel.classList.toggle('is-active', panel.getAttribute('data-index') === index);
        });
      });
    });
  });

  // ── Proceso ──
  document.querySelectorAll('[data-lb="process"]').forEach(function(root){
    var panels = root.querySelectorAll('.lb-process__panel');
    var dots = root.querySelectorAll('.lb-process__dot');
    var current = 0;
    function go(index){
      current = Math.max(0, Math.min(panels.length - 1, index));
      panels.forEach(function(panel, i){ panel.classList.toggle('is-active', i === current); });
      dots.forEach(function(dot, i){ dot.classList.toggle('is-active', i === current); });
    }
    dots.forEach(function(dot, i){ dot.addEventListener('click', function(){ go(i); }); });
    var prev = root.querySelector('[data-step="prev"]');
    var next = root.querySelector('[data-step="next"]');
    if (prev) prev.addEventListener('click', function(){ go(current - 1); });
    if (next) next.addEventListener('click', function(){ go(current + 1); });
  });

  // ── Tarjetas ──
  document.querySelectorAll('[data-lb="flashcards"] .lb-card').forEach(function(card){
    card.addEventListener('click', function(){ card.classList.toggle('is-flipped'); });
  });

  // ── Clasificación ──
  document.querySelectorAll('[data-lb="sorting"]').forEach(function(root){
    var pool = root.querySelector('.lb-sorting__pool');
    var selected = null;
    var feedback = root.querySelector('.lb-feedback');
    function select(chip){
      if (selected) selected.style.outline = '';
      selected = selected === chip ? null : chip;
      root.querySelectorAll('.lb-pile').forEach(function(pile){ pile.classList.toggle('is-target', !!selected); });
      if (selected) selected.style.outline = '2px solid var(--lb-accent)';
    }
    root.querySelectorAll('.lb-chip').forEach(function(chip){
      chip.addEventListener('click', function(){ select(chip); });
    });
    root.querySelectorAll('.lb-pile').forEach(function(pile){
      pile.addEventListener('click', function(){
        if (!selected) return;
        pile.querySelector('.lb-pile__drop').appendChild(selected);
        selected.style.outline = '';
        selected = null;
        root.querySelectorAll('.lb-pile').forEach(function(other){ other.classList.remove('is-target'); });
      });
    });
    var check = root.querySelector('[data-action="check"]');
    if (check) check.addEventListener('click', function(){
      var right = 0, total = 0;
      root.querySelectorAll('.lb-pile').forEach(function(pile){
        var pileId = pile.getAttribute('data-pile');
        pile.querySelectorAll('.lb-chip').forEach(function(chip){
          total++;
          var ok = chip.getAttribute('data-pile') === pileId;
          chip.classList.toggle('is-ok', ok);
          chip.classList.toggle('is-bad', !ok);
          if (ok) right++;
        });
      });
      var pending = pool.querySelectorAll('.lb-chip').length;
      if (feedback) {
        var allOk = pending === 0 && right === total && total > 0;
        feedback.textContent = pending ? 'Quedan ' + pending + ' tarjeta(s) sin clasificar.' : right + ' de ' + total + ' bien clasificadas.';
        feedback.className = 'lb-feedback ' + (allOk ? 'is-ok' : 'is-bad');
      }
    });
    var reset = root.querySelector('[data-action="reset"]');
    if (reset) reset.addEventListener('click', function(){
      root.querySelectorAll('.lb-pile .lb-chip').forEach(function(chip){
        chip.classList.remove('is-ok', 'is-bad');
        pool.appendChild(chip);
      });
      if (feedback) { feedback.textContent = ''; feedback.className = 'lb-feedback'; }
    });
  });

  // ── Comprobaciones ──
  document.querySelectorAll('[data-lb="check"]').forEach(function(root, index){
    var variant = root.getAttribute('data-variant');
    var feedback = root.querySelector('.lb-feedback');
    var submit = root.querySelector('[data-action="submit"]');
    var retry = root.querySelector('[data-action="retry"]');

    function verdict(ok, message){
      if (feedback) {
        feedback.textContent = message;
        feedback.className = 'lb-feedback ' + (ok ? 'is-ok' : 'is-bad');
      }
      if (ok) { checksPassed[index] = true; maybeComplete(); }
      if (submit) submit.hidden = true;
      if (retry) retry.hidden = false;
    }

    if (submit) submit.addEventListener('click', function(){
      if (variant === 'fillin') {
        var input = root.querySelector('.lb-input');
        var accepted = JSON.parse(input.getAttribute('data-accepted') || '[]');
        var value = String(input.value || '').trim().toLowerCase();
        var ok = accepted.some(function(answer){ return String(answer).trim().toLowerCase() === value; });
        verdict(ok, ok ? 'Correcto.' : 'Todavía no. Revisa la respuesta.');
        return;
      }
      if (variant === 'matching') {
        var rows = Array.prototype.slice.call(root.querySelectorAll('.lb-match__select'));
        var right = rows.filter(function(select){ return select.value && select.value === select.getAttribute('data-answer'); }).length;
        rows.forEach(function(select){
          select.style.borderColor = select.value === select.getAttribute('data-answer') ? '#10b981' : '#ef4444';
        });
        verdict(right === rows.length, right + ' de ' + rows.length + ' parejas correctas.');
        return;
      }
      var options = Array.prototype.slice.call(root.querySelectorAll('.lb-option'));
      var answered = options.some(function(option){ return option.querySelector('input').checked; });
      if (!answered) {
        if (feedback) { feedback.textContent = 'Elige una respuesta.'; feedback.className = 'lb-feedback is-bad'; }
        return;
      }
      var ok = true;
      options.forEach(function(option){
        var input = option.querySelector('input');
        var correct = input.getAttribute('data-correct') === '1';
        if (input.checked !== correct) ok = false;
        if (input.checked) {
          option.classList.toggle('is-ok', correct);
          option.classList.toggle('is-bad', !correct);
          var note = option.querySelector('.lb-option__fb');
          if (note) note.hidden = false;
        } else if (correct) {
          option.classList.add('is-ok');
        }
      });
      verdict(ok, ok ? 'Correcto.' : 'Revisa: la respuesta marcada en verde es la esperada.');
    });

    if (retry) retry.addEventListener('click', function(){
      root.querySelectorAll('.lb-option').forEach(function(option){
        option.classList.remove('is-ok', 'is-bad');
        option.querySelector('input').checked = false;
        var note = option.querySelector('.lb-option__fb');
        if (note) note.hidden = true;
      });
      root.querySelectorAll('.lb-match__select').forEach(function(select){ select.value = ''; select.style.borderColor = ''; });
      var input = root.querySelector('.lb-input');
      if (input) input.value = '';
      if (feedback) { feedback.textContent = ''; feedback.className = 'lb-feedback'; }
      if (submit) submit.hidden = false;
      retry.hidden = true;
    });
  });

  // ── Continuar ──
  document.querySelectorAll('[data-lb="continue"]').forEach(function(root){
    var button = root.querySelector('.lb-btn');
    if (!button) return;
    button.addEventListener('click', function(){
      var screen = root.closest('.lb-screen');
      var index = screens.indexOf(screen);
      show(index + 1);
    });
  });

  ${scorm ? 'var resume = window.LBSCORM ? window.LBSCORM.start() : ""; show(resume ? parseInt(resume, 10) || 0 : 0);' : 'show(0);'}
  ${scorm ? "window.addEventListener('beforeunload', function(){ if (window.LBSCORM) window.LBSCORM.finish(); });" : ''}
})();
`
}

export function renderOvaHtml(options: {
  meta: LbRenderMeta
  content: LbContent
  directives: LbDirectives
  mode: LbRenderMode
}): string {
  const { meta, content, directives, mode } = options
  const lessons = content.lessons || []
  const label = directives.instructional.lessonLabel

  const nav = [
    `<button type="button" class="lb-nav__item is-active"><span class="lb-nav__num">0</span><span>Portada</span></button>`,
    ...lessons.map(
      (lesson, i) =>
        `<button type="button" class="lb-nav__item"><span class="lb-nav__num">${i + 1}</span><span>${escapeHtml(lesson.title)}</span></button>`
    ),
  ].join('')

  const screens = [
    renderCover(content, meta),
    ...lessons.map(
      (lesson, i) => `<section class="lb-screen" data-screen="${i + 1}" id="lb-screen-${i + 1}">
        <header class="lb-screen__head">
          <div class="lb-screen__kicker">${escapeHtml(label)} ${i + 1}</div>
          <h1>${inline(lesson.title)}</h1>
        </header>
        ${lesson.blocks.map((block, j) => `<div class="lb-block">${renderBlock(block, j)}</div>`).join('')}
        <div class="lb-foot">
          ${i > 0 ? `<button type="button" class="lb-btn lb-btn--ghost" data-go="${i}">Anterior</button>` : '<span></span>'}
          ${i + 1 < lessons.length ? `<button type="button" class="lb-btn" data-go="${i + 2}">Siguiente</button>` : '<span class="lb-foot__note">Fin de la unidad</span>'}
        </div>
      </section>`
    ),
  ].join('')

  const docTitle = content.cover?.title || meta.title
  const scormShim = mode === 'scorm' ? '<script src="scorm-api.js"></script>' : ''
  const noindex = mode === 'public' ? '' : '<meta name="robots" content="noindex">'

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(docTitle)}</title>
${noindex}
<meta name="description" content="${escapeHtml(content.cover?.summary || meta.subtitle || '')}">
<style>${ovaCss(directives)}</style>
</head>
<body>
<div class="lb-topbar">
  <button type="button" data-nav-toggle aria-label="Abrir el índice">☰ Índice</button>
  <strong>${escapeHtml(docTitle)}</strong>
</div>
<div class="lb-app">
  <nav class="lb-nav" aria-label="Índice del objeto de aprendizaje">
    <div class="lb-nav__brand">
      ${directives.graphic.logoUrl ? `<img src="${escapeHtml(directives.graphic.logoUrl)}" alt="${escapeHtml(meta.workspaceName)}">` : ''}
      <div>
        <div class="lb-nav__client">${escapeHtml(meta.workspaceName)}</div>
        <div class="lb-nav__title">${escapeHtml(meta.course || docTitle)}</div>
      </div>
    </div>
    ${nav}
    <div class="lb-nav__progress">Avance <b>0%</b><div class="lb-nav__bar"><span></span></div></div>
  </nav>
  <main class="lb-main">
    ${screens}
    ${directives.graphic.footerText ? `<div class="lb-foot"><span class="lb-foot__note">${escapeHtml(directives.graphic.footerText)}</span></div>` : ''}
  </main>
</div>
${scormShim}
<script>${playerScript(mode, directives.exports.completion)}</script>
</body>
</html>`
}
