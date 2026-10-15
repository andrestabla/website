/**
 * Learning Builder · revisión externa: identidad del revisor y capa de
 * señalamiento.
 *
 * Quien recibe el enlace de revisión no tiene cuenta en el Ecosistema. Se
 * identifica con nombre, correo y organización, y esa identidad viaja en una
 * cookie firmada atada al recurso **y a su token de revisión**: rotar el token
 * desde el builder deja sin efecto todas las cookies emitidas con el anterior.
 *
 * La capa es un script que se suma al final de la pieza servida —la misma que
 * ve el estudiante— y no la reescribe: no envuelve textos ni añade atributos.
 * Pinta por encima, en posición fija, el recuadro del elemento bajo el ratón y
 * los pines de los comentarios. Así los selectores que se guardan son los del
 * documento original y siguen valiendo la próxima vez que se abra.
 */
import crypto from 'node:crypto'
import { readCookie } from './lb-access.js'

type VercelRequest = any

export type LbReviewer = { name: string; email: string; org: string }

/** 30 días: una ronda de revisión con el cliente rara vez dura más. */
const REVIEW_TTL_SECONDS = 60 * 60 * 24 * 30

function secret(): string {
  const configured = process.env.ADMIN_SESSION_SECRET
  if (configured && configured.trim()) return configured
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
    throw new Error('Missing ADMIN_SESSION_SECRET')
  }
  return 'algoritmot-admin-session-dev-secret'
}

function sign(publicId: string, reviewToken: string, payload: string): string {
  return crypto.createHmac('sha256', secret()).update(`lb-review:${publicId}:${reviewToken}:${payload}`).digest('base64url')
}

export function reviewCookieName(publicId: string): string {
  return `lb_r_${publicId.replace(/[^A-Za-z0-9]/g, '')}`
}

export function readReviewer(req: VercelRequest, publicId: string, reviewToken: string | null): LbReviewer | null {
  if (!reviewToken) return null
  const raw = readCookie(req, reviewCookieName(publicId))
  const [payload, mac] = raw.split('.')
  if (!payload || !mac) return null
  const expected = sign(publicId, reviewToken, payload)
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof data?.e !== 'string' || typeof data?.n !== 'string') return null
    return { name: data.n, email: data.e, org: typeof data.o === 'string' ? data.o : '' }
  } catch {
    return null
  }
}

function cookie(name: string, value: string, maxAge: number): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`]
  if (process.env.VERCEL_ENV || process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}

export function reviewerCookie(publicId: string, reviewToken: string, reviewer: LbReviewer): string {
  const payload = Buffer.from(JSON.stringify({ n: reviewer.name, e: reviewer.email, o: reviewer.org })).toString('base64url')
  return cookie(reviewCookieName(publicId), `${payload}.${sign(publicId, reviewToken, payload)}`, REVIEW_TTL_SECONDS)
}

export function clearReviewerCookie(publicId: string): string {
  return cookie(reviewCookieName(publicId), '', 0)
}

/** ¿Este visitante puede ver la pieza por la vía de la revisión? */
export function reviewOpen(req: VercelRequest, resource: any): boolean {
  return (
    !!resource.reviewEnabled &&
    resource.status !== 'ARCHIVED' &&
    !!readReviewer(req, resource.publicId, resource.reviewToken)
  )
}

function jsonInScript(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, '<\\/')
}

/**
 * El script de la pieza en revisión. Habla con la ventana que la contiene
 * (PublicReview.tsx) por postMessage y solo con ella:
 *
 *  entra  mode {on}        activa o apaga el modo de señalar
 *         pins {pins}      los hilos de esta página, para pintarlos
 *         focus {target}   llevar al revisor hasta un elemento
 *         draft {target}   el pin provisional del comentario que se escribe
 *  sale   ready {page}     la página cargó (también al navegar dentro)
 *         pick {target}    el revisor señaló un elemento
 *         open {id}        pulsó un pin
 *         mode-off         salió con Esc
 */
const REVIEW_SCRIPT = `
(function(){
  if (window.__lbReview) return; window.__lbReview = true;
  var ORIGIN = location.origin;
  var on = false, pins = [], draft = null, hoverEl = null, flash = null;

  function send(msg){ msg.source = 'lb-review-frame'; try { parent.postMessage(msg, ORIGIN); } catch (e) {} }
  function norm(v){ return String(v || '').replace(/\\s+/g, ' ').trim(); }

  var css = document.createElement('style');
  css.textContent =
    'html.lbr-on, html.lbr-on *{cursor:crosshair !important}' +
    '.lbr-ui{all:initial;position:fixed;z-index:2147483646;pointer-events:none;font:600 11px/1 system-ui,-apple-system,sans-serif}' +
    '.lbr-box{border:2px solid #f59e0b;border-radius:4px;background:rgba(245,158,11,.10);box-sizing:border-box;transition:all .06s}' +
    '.lbr-tag{position:absolute;left:-2px;top:-20px;background:#f59e0b;color:#1f1300;padding:4px 6px;border-radius:4px 4px 4px 0;white-space:nowrap}' +
    '.lbr-flash{border:3px solid #4f46e5;border-radius:6px;background:rgba(79,70,229,.12);animation:lbrf 1.6s ease-out forwards}' +
    '@keyframes lbrf{0%{opacity:1}70%{opacity:1}100%{opacity:0}}' +
    '.lbr-pin{pointer-events:auto;cursor:pointer;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:12px 12px 12px 2px;' +
      'background:#f59e0b;color:#1f1300;display:flex;align-items:center;justify-content:center;border:2px solid #fff;' +
      'box-shadow:0 2px 6px rgba(0,0,0,.35);font:700 11px/1 system-ui,-apple-system,sans-serif}' +
    '.lbr-pin.is-done{background:#10b981;color:#fff}' +
    '.lbr-pin.is-draft{background:#4f46e5;color:#fff}';
  (document.head || document.documentElement).appendChild(css);

  var box = document.createElement('div'); box.className = 'lbr-ui lbr-box'; box.style.display = 'none';
  var tag = document.createElement('span'); tag.className = 'lbr-tag'; box.appendChild(tag);
  var pinLayer = document.createElement('div'); pinLayer.className = 'lbr-ui'; pinLayer.style.cssText = 'left:0;top:0;width:0;height:0';
  function mount(){ document.body.appendChild(box); document.body.appendChild(pinLayer); }

  var MEDIA = 'img,video,audio,svg,canvas,iframe,picture';
  var ACTION = 'button,[role=button],a[href],summary';
  var TEXT = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th,label,dt,dd,pre,caption';
  var LABEL = {image:'Imagen',video:'Video',audio:'Audio',heading:'Título',text:'Texto',list:'Lista',table:'Tabla',
    button:'Botón',link:'Enlace',interactive:'Interactivo',element:'Elemento'};

  function isUi(el){ return el && el.closest && el.closest('.lbr-ui'); }

  /** Lo que una persona reconocería como «esto»: no el <b> suelto, sí su párrafo. */
  function pickable(el){
    if (!el || el.nodeType !== 1 || isUi(el)) return null;
    var media = el.closest(MEDIA); if (media) return media;
    var action = el.closest(ACTION); if (action) return action;
    var text = el.closest(TEXT); if (text) return text;
    if (el === document.body || el === document.documentElement) return null;
    return el;
  }

  function hasBackgroundImage(el){
    try { return getComputedStyle(el).backgroundImage.indexOf('url(') !== -1 && !norm(el.textContent); } catch (e) { return false; }
  }

  function kindOf(el){
    var t = el.tagName.toLowerCase();
    if (t === 'img' || t === 'picture' || t === 'svg' || t === 'canvas') return 'image';
    if (t === 'video') return 'video';
    if (t === 'iframe') return /youtube|vimeo|video|player/i.test(el.getAttribute('src') || '') ? 'video' : 'interactive';
    if (t === 'audio') return 'audio';
    if (/^h[1-6]$/.test(t)) return 'heading';
    if (t === 'button' || t === 'summary' || el.getAttribute('role') === 'button') return 'button';
    if (t === 'a') return 'link';
    if (t === 'li' || t === 'ul' || t === 'ol' || t === 'dt' || t === 'dd') return 'list';
    if (t === 'td' || t === 'th' || t === 'table' || t === 'caption') return 'table';
    if (hasBackgroundImage(el)) return 'image';
    if (el.closest('[data-lb]')) return 'interactive';
    return norm(el.textContent) ? 'text' : 'element';
  }

  function textOf(el){
    var t = el.tagName.toLowerCase();
    if (t === 'img') return norm(el.getAttribute('alt') || el.getAttribute('title'));
    if (t === 'svg' || t === 'canvas' || t === 'video' || t === 'iframe' || t === 'audio' || t === 'picture') {
      var img = t === 'picture' ? el.querySelector('img') : null;
      return norm((img && img.getAttribute('alt')) || el.getAttribute('aria-label') || el.getAttribute('title'));
    }
    return norm(el.textContent).slice(0, 240);
  }

  function relative(url){
    if (!url) return '';
    try { var u = new URL(url, document.baseURI); return u.origin === ORIGIN ? u.pathname + u.search : u.href; } catch (e) { return url; }
  }

  function srcOf(el){
    var t = el.tagName.toLowerCase();
    if (t === 'img') return relative(el.currentSrc || el.getAttribute('src'));
    if (t === 'picture') { var i = el.querySelector('img'); return i ? relative(i.currentSrc || i.getAttribute('src')) : ''; }
    if (t === 'video' || t === 'audio') {
      var s = el.currentSrc || el.getAttribute('src') || (el.querySelector('source') && el.querySelector('source').getAttribute('src'));
      return relative(s);
    }
    if (t === 'iframe') return relative(el.getAttribute('src'));
    if (hasBackgroundImage(el)) {
      var m = /url\\(["']?([^"')]+)/.exec(getComputedStyle(el).backgroundImage);
      return m ? relative(m[1]) : '';
    }
    return '';
  }

  function selectorOf(el){
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body && el !== document.documentElement) {
      if (el.id && /^[A-Za-z][\\w-]*$/.test(el.id) && document.querySelectorAll('#' + el.id).length === 1) {
        parts.unshift('#' + el.id); break;
      }
      var name = el.tagName.toLowerCase(), i = 1, sib = el;
      while ((sib = sib.previousElementSibling)) if (sib.tagName === el.tagName) i++;
      parts.unshift(name + ':nth-of-type(' + i + ')');
      el = el.parentElement;
    }
    if (!parts.length || parts[0].charAt(0) !== '#') parts.unshift('body');
    return parts.join(' > ');
  }

  /** El encabezado bajo el que está: la sección que leería una persona. */
  function sectionOf(el){
    if (/^H[1-6]$/.test(el.tagName)) return textOf(el).slice(0, 160);
    var heads = document.body.querySelectorAll('h1,h2,h3'), found = '';
    for (var i = 0; i < heads.length; i++) {
      if (isUi(heads[i])) continue;
      var pos = heads[i].compareDocumentPosition(el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING || pos & Node.DOCUMENT_POSITION_CONTAINED_BY) found = heads[i];
      else break;
    }
    return found ? norm(found.textContent).slice(0, 160) : '';
  }

  function describe(el, event){
    var target = { page: PAGE, selector: selectorOf(el), kind: kindOf(el), text: textOf(el) };
    var src = srcOf(el); if (src) target.src = src;
    var section = sectionOf(el); if (section) target.section = section;
    var screen = el.closest('[data-screen]');
    if (screen) target.screen = Number(screen.getAttribute('data-screen')) || 0;
    if (event) {
      var r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        target.x = Math.min(1, Math.max(0, (event.clientX - r.left) / r.width));
        target.y = Math.min(1, Math.max(0, (event.clientY - r.top) / r.height));
      }
    }
    var anchored = el.closest('[data-lb-anchor]');
    return { target: target, anchor: anchored ? anchored.getAttribute('data-lb-anchor') : '' };
  }

  /** Vuelve a dar con el elemento: por su ruta y, si la pieza cambió, por lo que decía. */
  function locate(target){
    if (!target || (target.page || '') !== PAGE) return null;
    var el = null;
    try { el = document.querySelector(target.selector); } catch (e) {}
    if (el && !isUi(el) && kindOf(el) === target.kind) return el;
    var last = String(target.selector || '').split('>').pop().trim().split(':')[0];
    if (!last || last.charAt(0) === '#') return el;
    var pool = document.body.querySelectorAll(last), want = norm(target.text).slice(0, 60);
    for (var i = 0; i < pool.length; i++) {
      if (isUi(pool[i])) continue;
      if (target.src && srcOf(pool[i]) === target.src) return pool[i];
      if (want && textOf(pool[i]).slice(0, 60) === want) return pool[i];
    }
    return el;
  }

  function visible(r){
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  }

  function place(node, el, target){
    var r = el.getBoundingClientRect();
    if (!visible(r)) { node.style.display = 'none'; return; }
    var hasPoint = typeof target.x === 'number' && typeof target.y === 'number';
    node.style.display = 'flex';
    node.style.position = 'fixed';
    node.style.left = (r.left + (hasPoint ? target.x * r.width : Math.min(r.width - 4, r.width))) + 'px';
    node.style.top = (r.top + (hasPoint ? target.y * r.height : 4)) + 'px';
  }

  function render(){
    pinLayer.innerHTML = '';
    var all = pins.slice();
    if (draft) all.push({ id: '__draft', n: '+', status: 'DRAFT', target: draft });
    all.forEach(function(pin){
      var el = locate(pin.target);
      if (!el) return;
      var node = document.createElement('div');
      node.className = 'lbr-pin' + (pin.status === 'RESOLVED' ? ' is-done' : '') + (pin.status === 'DRAFT' ? ' is-draft' : '');
      node.textContent = String(pin.n);
      node.title = pin.status === 'DRAFT' ? 'Comentario en curso' : 'Ver comentario';
      node.__el = el; node.__target = pin.target;
      if (pin.id !== '__draft') node.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); send({ type: 'open', id: pin.id }); });
      pinLayer.appendChild(node);
      place(node, el, pin.target);
    });
  }

  var queued = 0;
  function reflow(){
    queued = 0;
    Array.prototype.forEach.call(pinLayer.children, function(node){ if (node.__el) place(node, node.__el, node.__target); });
    if (hoverEl) outline(hoverEl);
  }
  function later(){ if (!queued) queued = requestAnimationFrame(reflow); }
  document.addEventListener('scroll', later, true);
  window.addEventListener('resize', later);
  // Las piezas cambian solas —acordeones, pestañas, pantallas—: se recoloca a menudo y barato.
  setInterval(reflow, 700);

  function outline(el){
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.style.left = r.left + 'px'; box.style.top = r.top + 'px';
    box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
    tag.style.top = r.top < 22 ? (r.height + 2) + 'px' : '-20px';
    tag.textContent = 'Comentar ' + (LABEL[kindOf(el)] || 'Elemento').toLowerCase();
  }

  document.addEventListener('mousemove', function(event){
    if (!on) return;
    var el = pickable(event.target);
    if (el === hoverEl) return;
    hoverEl = el;
    if (el) outline(el); else box.style.display = 'none';
  }, true);

  // En modo señalar, la pieza no reacciona: el clic es para elegir, no para navegar.
  ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'touchstart', 'dblclick', 'submit'].forEach(function(type){
    document.addEventListener(type, function(event){
      if (!on || isUi(event.target)) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    }, true);
  });

  document.addEventListener('click', function(event){
    if (!on || isUi(event.target)) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    var el = pickable(event.target);
    if (!el) return;
    var picked = describe(el, event);
    send({ type: 'pick', target: picked.target, anchor: picked.anchor });
  }, true);

  document.addEventListener('keydown', function(event){
    if (on && event.key === 'Escape') { setMode(false); send({ type: 'mode-off' }); }
  }, true);

  function setMode(next){
    on = !!next;
    document.documentElement.classList.toggle('lbr-on', on);
    if (!on) { hoverEl = null; box.style.display = 'none'; }
  }

  /** Lleva hasta el elemento; en el OVA, primero a su pantalla. */
  function focus(target){
    var el = locate(target);
    if (el && !el.getBoundingClientRect().width && typeof target.screen === 'number') {
      var nav = document.querySelectorAll('.lb-nav__item')[target.screen];
      if (nav) nav.click();
    }
    setTimeout(function(){
      el = locate(target);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(function(){
        if (flash && flash.parentNode) flash.parentNode.removeChild(flash);
        var r = el.getBoundingClientRect();
        flash = document.createElement('div');
        flash.className = 'lbr-ui lbr-flash';
        flash.style.cssText += ';left:' + (r.left - 4) + 'px;top:' + (r.top - 4) + 'px;width:' + (r.width + 8) + 'px;height:' + (r.height + 8) + 'px';
        document.body.appendChild(flash);
        setTimeout(function(){ if (flash && flash.parentNode) flash.parentNode.removeChild(flash); }, 1700);
        reflow();
      }, 450);
    }, 120);
  }

  window.addEventListener('message', function(event){
    if (event.source !== parent || event.origin !== ORIGIN) return;
    var data = event.data;
    if (!data || data.source !== 'lb-review') return;
    if (data.type === 'mode') setMode(data.on);
    if (data.type === 'pins') { pins = Array.isArray(data.pins) ? data.pins : []; render(); }
    if (data.type === 'draft') { draft = data.target || null; render(); }
    if (data.type === 'focus' && data.target) focus(data.target);
  });

  function start(){ mount(); send({ type: 'ready', page: PAGE, title: document.title }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
`

/** La capa de revisión para una página concreta de la pieza. */
export function reviewLayer(page: string): string {
  // PAGE entra como argumento: una variable global podría chocar con las de la pieza.
  return `<script>(function(PAGE){${REVIEW_SCRIPT}})(${jsonInScript(page)});</script>`
}
