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
 *  sale   ready {page, hash} la página cargó (también al navegar dentro)
 *         route {hash, slide} cambió de lección o de pantalla sin cambiar de página
 *         elsewhere {slide} el hilo pedido está en otra pantalla
 *         pick {target}    el revisor señaló un elemento
 *         open {id}        pulsó un pin
 *         mode-off         salió con Esc
 */
const REVIEW_SCRIPT = `
(function(){
  if (window.__lbReview) return; window.__lbReview = true;
  var ORIGIN = location.origin;
  var on = false, pins = [], draft = null, hoverEl = null, flash = null;
  var SEP = ' >>> ';

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
    '.lbr-pin.is-draft{background:#4f46e5;color:#fff}' +
    '.lbr-shield{pointer-events:auto;cursor:crosshair}';
  (document.head || document.documentElement).appendChild(css);

  var box = document.createElement('div'); box.className = 'lbr-ui lbr-box'; box.style.display = 'none';
  var tag = document.createElement('span'); tag.className = 'lbr-tag'; box.appendChild(tag);
  var pinLayer = document.createElement('div'); pinLayer.className = 'lbr-ui'; pinLayer.style.cssText = 'left:0;top:0;width:0;height:0';
  var shieldLayer = document.createElement('div'); shieldLayer.className = 'lbr-ui'; shieldLayer.style.cssText = 'left:0;top:0;width:0;height:0';
  function mount(){ document.body.appendChild(shieldLayer); document.body.appendChild(box); document.body.appendChild(pinLayer); }

  var MEDIA = 'img,video,audio,svg,canvas,iframe,picture,object,embed';
  var ACTION = 'button,[role=button],a[href],summary,input,select,textarea';
  var TEXT = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th,label,dt,dd,pre,caption';
  var LABEL = {image:'Imagen',video:'Video',audio:'Audio',heading:'Título',text:'Texto',list:'Lista',table:'Tabla',
    button:'Botón',link:'Enlace',interactive:'Interactivo',element:'Elemento'};

  // ── Documentos: la pieza y todos los marcos del mismo origen que lleva dentro ──
  // Rise, Storyline o un bloque de código pintan parte del contenido en marcos
  // anidados. Sin entrar en ellos, nada de lo que hay dentro se podría señalar.

  function isUi(el){ return el && el.closest && el.ownerDocument === document && el.closest('.lbr-ui'); }

  /** El documento de un marco, si es del mismo origen y ya cargó. */
  function docOf(frame){
    try { var d = frame.contentDocument; return d && d.documentElement ? d : null; } catch (e) { return null; }
  }

  function framesIn(doc){
    try { return Array.prototype.slice.call(doc.querySelectorAll('iframe,frame')); } catch (e) { return []; }
  }

  /** Todos los documentos accesibles, empezando por el propio. */
  function allDocs(){
    var out = [document], i = 0;
    while (i < out.length) {
      framesIn(out[i++]).forEach(function(frame){ var d = docOf(frame); if (d && out.indexOf(d) === -1) out.push(d); });
    }
    return out;
  }

  /** El rectángulo de un elemento en la ventana de la pieza, aunque viva en un marco. */
  function topRect(el){
    var r = el.getBoundingClientRect();
    var x = r.left, y = r.top, win = el.ownerDocument.defaultView;
    while (win && win !== window) {
      var fe = null;
      try { fe = win.frameElement; } catch (e) {}
      if (!fe) return { left: x, top: y, width: r.width, height: r.height, right: x + r.width, bottom: y + r.height, hidden: true };
      var fr = fe.getBoundingClientRect();
      // Un marco sin tamaño (oculto, o en otra lección) oculta todo lo que lleva.
      if (!fr.width || !fr.height) return { left: x, top: y, width: 0, height: 0, right: x, bottom: y, hidden: true };
      x += fr.left + fe.clientLeft; y += fr.top + fe.clientTop;
      win = win.parent;
    }
    return { left: x, top: y, width: r.width, height: r.height, right: x + r.width, bottom: y + r.height };
  }

  /**
   * La ruta interna de una pieza que navega sin cambiar de página (Rise:
   * «#/lessons/…»). Un ancla corriente («#seccion») no cuenta: no es otra lección.
   */
  function routeHash(){
    var h = location.hash || '';
    return /^#[!/]/.test(h) ? h.slice(0, 300) : '';
  }

  /**
   * La pantalla en que se está, en reproductores que pintan cada pantalla en
   * el mismo contenedor (el motor CONACED, presentaciones, Storyline…): la
   * misma ruta CSS existe en todas, y sin esto un comentario de la pantalla 3
   * aparecería también en la 9. Se lee del rótulo de avance que el propio
   * reproductor muestra («Pantalla 9 de 44», «Diapositiva 3 de 12»…).
   */
  var SLIDE = /\\b(Pantalla|Diapositiva|L[aá]mina|P[aá]gina|Slide|Screen|Page)\\s+(\\d{1,4})\\s*(?:de|of|\\/)\\s*\\d{1,4}\\b/i;
  var slideCache = { at: 0, value: '' };
  function slideIn(doc){
    if (!doc.body) return '';
    var walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null), node;
    while ((node = walker.nextNode())) {
      var v = node.nodeValue;
      if (!v || v.length > 80) continue;
      var m = SLIDE.exec(v);
      if (!m) continue;
      var host = node.parentElement;
      if (!host || isUi(host)) continue;
      var r = host.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      var word = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      return word + ' ' + m[2];
    }
    return '';
  }
  function currentSlide(){
    var now = Date.now();
    if (now - slideCache.at < 250) return slideCache.value;
    var value = '';
    var docs = allDocs();
    for (var i = 0; i < docs.length && !value; i++) { try { value = slideIn(docs[i]); } catch (e) {} }
    slideCache = { at: now, value: value };
    return value;
  }

  function realTarget(event){
    var path = event.composedPath ? event.composedPath() : null;
    var t = path && path.length ? path[0] : event.target;
    return t && t.nodeType === 1 ? t : (t && t.parentElement) || event.target;
  }

  function styleOf(el){ try { return el.ownerDocument.defaultView.getComputedStyle(el); } catch (e) { return null; } }

  /** Lo que una persona reconocería como «esto»: no el <b> suelto, sí su párrafo. */
  function pickable(el){
    if (!el || el.nodeType !== 1 || isUi(el)) return null;
    var doc = el.ownerDocument;
    var media = el.closest(MEDIA); if (media) return media;
    var action = el.closest(ACTION); if (action) return action;
    var text = el.closest(TEXT); if (text) return text;
    // Un trozo en línea suelto (un <span> dentro de un <div>) sube hasta su bloque.
    while (el && el !== doc.body && el.parentElement) {
      var s = styleOf(el);
      if (!s || s.display.indexOf('inline') !== 0 || el.tagName === 'IMG') break;
      el = el.parentElement;
    }
    if (!el || el === doc.body || el === doc.documentElement) {
      // Un marco entero sin nada más concreto: se señala el marco, visto desde fuera.
      try { var fe = doc.defaultView.frameElement; if (fe && fe.ownerDocument) return fe; } catch (e) {}
      return null;
    }
    return el;
  }

  function hasBackgroundImage(el){
    var s = styleOf(el);
    return !!s && s.backgroundImage.indexOf('url(') !== -1 && !norm(el.textContent);
  }

  function kindOf(el){
    var t = el.tagName.toLowerCase();
    if (t === 'img' || t === 'picture' || t === 'svg' || t === 'canvas') return 'image';
    if (t === 'video') return 'video';
    if (t === 'iframe' || t === 'frame' || t === 'object' || t === 'embed') {
      return /youtube|vimeo|video|player|wistia|loom/i.test(el.getAttribute('src') || el.getAttribute('data') || '') ? 'video' : 'interactive';
    }
    if (t === 'audio') return 'audio';
    if (/^h[1-6]$/.test(t)) return 'heading';
    if (t === 'button' || t === 'summary' || el.getAttribute('role') === 'button') return 'button';
    if (t === 'input' || t === 'select' || t === 'textarea') return 'interactive';
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
    if (t === 'iframe' || t === 'frame') {
      var inner = docOf(el);
      var said = norm(el.getAttribute('title') || el.getAttribute('aria-label'));
      return said || (inner && inner.body ? norm(inner.body.textContent).slice(0, 240) : '');
    }
    if (t === 'svg' || t === 'canvas' || t === 'video' || t === 'audio' || t === 'picture' || t === 'object' || t === 'embed') {
      var img = t === 'picture' ? el.querySelector('img') : null;
      return norm((img && img.getAttribute('alt')) || el.getAttribute('aria-label') || el.getAttribute('title'));
    }
    if (t === 'input' || t === 'textarea') return norm(el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.value);
    return norm(el.textContent).slice(0, 240);
  }

  function relative(url, doc){
    if (!url) return '';
    try { var u = new URL(url, (doc || document).baseURI); return u.origin === ORIGIN ? u.pathname + u.search : u.href; } catch (e) { return url; }
  }

  function srcOf(el){
    var t = el.tagName.toLowerCase(), doc = el.ownerDocument;
    if (t === 'img') return relative(el.currentSrc || el.getAttribute('src'), doc);
    if (t === 'picture') { var i = el.querySelector('img'); return i ? relative(i.currentSrc || i.getAttribute('src'), doc) : ''; }
    if (t === 'video' || t === 'audio') {
      var s = el.currentSrc || el.getAttribute('src') || (el.querySelector('source') && el.querySelector('source').getAttribute('src'));
      return relative(s, doc);
    }
    if (t === 'iframe' || t === 'frame' || t === 'embed') return relative(el.getAttribute('src'), doc).split('#')[0];
    if (t === 'object') return relative(el.getAttribute('data'), doc);
    if (hasBackgroundImage(el)) {
      var m = /url\\(["']?([^"')]+)/.exec(styleOf(el).backgroundImage);
      return m ? relative(m[1], doc) : '';
    }
    return '';
  }

  /** Ruta dentro de su propio documento. */
  function localSelector(el){
    var doc = el.ownerDocument, parts = [];
    while (el && el.nodeType === 1 && el !== doc.body && el !== doc.documentElement) {
      if (el.id && /^[A-Za-z][\\w-]*$/.test(el.id) && doc.querySelectorAll('#' + el.id).length === 1) {
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

  /** Ruta completa: la de cada marco hasta llegar a él, separadas por «>>>». */
  function selectorOf(el){
    var chain = [localSelector(el)], win = el.ownerDocument.defaultView;
    while (win && win !== window) {
      var fe = null;
      try { fe = win.frameElement; } catch (e) {}
      if (!fe) break;
      chain.unshift(localSelector(fe));
      win = win.parent;
    }
    return chain.join(SEP);
  }

  /** Sube de un documento al elemento que lo contiene en el de arriba. */
  function hostOf(el){
    try { var fe = el.ownerDocument.defaultView.frameElement; return fe && fe.ownerDocument ? fe : null; } catch (e) { return null; }
  }

  function closestUp(el, selector){
    while (el) {
      var hit = el.closest(selector);
      if (hit) return hit;
      el = hostOf(el);
    }
    return null;
  }

  /** El encabezado bajo el que está: la sección que leería una persona. */
  function sectionOf(el){
    if (/^H[1-6]$/.test(el.tagName)) return textOf(el).slice(0, 160);
    var doc = el.ownerDocument;
    var heads = doc.body ? doc.body.querySelectorAll('h1,h2,h3') : [], found = '';
    for (var i = 0; i < heads.length; i++) {
      if (isUi(heads[i])) continue;
      var pos = heads[i].compareDocumentPosition(el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING || pos & Node.DOCUMENT_POSITION_CONTAINED_BY) found = heads[i];
      else break;
    }
    if (found) return norm(found.textContent).slice(0, 160);
    var host = hostOf(el);
    return host ? sectionOf(host) : '';
  }

  function describe(el, event){
    var target = { page: PAGE, selector: selectorOf(el), kind: kindOf(el), text: textOf(el) };
    var route = routeHash(); if (route) target.hash = route;
    slideCache.at = 0;
    var slide = currentSlide(); if (slide) target.slide = slide;
    var src = srcOf(el); if (src) target.src = src;
    var section = sectionOf(el); if (section) target.section = section;
    var screen = closestUp(el, '[data-screen]');
    if (screen) target.screen = Number(screen.getAttribute('data-screen')) || 0;
    if (event && typeof event.clientX === 'number') {
      var r = el.getBoundingClientRect();
      var cx = event.clientX, cy = event.clientY;
      // Un clic sobre el escudo de un marco externo llega con coordenadas de la pieza.
      if (event.__top) { var t = topRect(el); r = t; }
      if (r.width > 0 && r.height > 0) {
        target.x = Math.min(1, Math.max(0, (cx - r.left) / r.width));
        target.y = Math.min(1, Math.max(0, (cy - r.top) / r.height));
      }
    }
    var anchored = closestUp(el, '[data-lb-anchor]');
    return { target: target, anchor: anchored ? anchored.getAttribute('data-lb-anchor') : '' };
  }

  function resolveIn(doc, selector, target, last){
    var el = null;
    try { el = doc.querySelector(selector); } catch (e) {}
    if (!last) return el && /^(IFRAME|FRAME)$/.test(el.tagName) ? el : null;
    // La ruta sola no basta: en un reproductor que repinta cada pantalla, la
    // misma ruta lleva a otro elemento. Tiene que decir lo mismo (o mostrar el
    // mismo archivo) que cuando se comentó.
    if (el && !isUi(el) && kindOf(el) === target.kind && sameAs(el, target)) return el;
    var tail = String(selector || '').split('>').pop().trim().split(':')[0];
    if (!tail || tail.charAt(0) === '#' || !doc.body) return el && sameAs(el, target) ? el : null;
    var pool = doc.body.querySelectorAll(tail), want = norm(target.text).slice(0, 60);
    for (var i = 0; i < pool.length; i++) {
      if (isUi(pool[i])) continue;
      if (target.src && srcOf(pool[i]) === target.src) return pool[i];
      if (want && textOf(pool[i]).slice(0, 60) === want) return pool[i];
    }
    return null;
  }

  function sameAs(el, target){
    if (target.src) return srcOf(el) === target.src;
    var want = norm(target.text).slice(0, 60);
    return !want || textOf(el).slice(0, 60) === want;
  }

  /** Recorre la ruta marco a marco; si un marco cambió de sitio, lo busca en todos. */
  function walk(doc, parts, target){
    if (parts.length === 1) return resolveIn(doc, parts[0], target, true);
    var frame = resolveIn(doc, parts[0], target, false);
    var inner = frame ? docOf(frame) : null;
    var hit = inner ? walk(inner, parts.slice(1), target) : null;
    if (hit) return hit;
    var frames = framesIn(doc);
    for (var i = 0; i < frames.length; i++) {
      if (frames[i] === frame) continue;
      var d = docOf(frames[i]);
      if (!d) continue;
      hit = walk(d, parts.slice(1), target);
      if (hit) return hit;
    }
    return null;
  }

  /** Vuelve a dar con el elemento: por su ruta y, si la pieza cambió, por lo que decía. */
  function locate(target, ignoreHash){
    if (!target || (target.page || '') !== PAGE) return null;
    // En una pieza que cambia de lección sin cambiar de página (Rise), la
    // misma ruta existe en todas: solo vale la de la lección en que se dijo.
    if (!ignoreHash && target.hash && target.hash !== routeHash()) return null;
    // Y en un reproductor de pantallas, solo vale la pantalla en que se dijo.
    if (!ignoreHash && target.slide && target.slide !== currentSlide()) return null;
    var el = walk(document, String(target.selector || '').split(SEP), target);
    if (el && typeof target.screen === 'number') {
      var screen = closestUp(el, '[data-screen]');
      if (screen && Number(screen.getAttribute('data-screen')) !== target.screen) return null;
    }
    return el;
  }

  function visible(r){
    return !r.hidden && r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  }

  function place(node, el, target){
    if (!el.isConnected) { node.style.display = 'none'; return; }
    var r = topRect(el);
    if (!visible(r)) { node.style.display = 'none'; return; }
    var hasPoint = typeof target.x === 'number' && typeof target.y === 'number';
    node.style.display = 'flex';
    node.style.position = 'fixed';
    node.style.left = (r.left + (hasPoint ? target.x * r.width : Math.max(4, r.width - 4))) + 'px';
    node.style.top = (r.top + (hasPoint ? target.y * r.height : 4)) + 'px';
  }

  function render(){
    pinLayer.innerHTML = '';
    var all = pins.slice();
    if (draft) all.push({ id: '__draft', n: '+', status: 'DRAFT', target: draft });
    all.forEach(function(pin){
      var node = document.createElement('div');
      node.className = 'lbr-pin' + (pin.status === 'RESOLVED' ? ' is-done' : '') + (pin.status === 'DRAFT' ? ' is-draft' : '');
      node.textContent = String(pin.n);
      node.title = pin.status === 'DRAFT' ? 'Comentario en curso' : 'Ver comentario';
      node.style.display = 'none';
      node.__target = pin.target;
      if (pin.id !== '__draft') node.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); send({ type: 'open', id: pin.id }); });
      pinLayer.appendChild(node);
    });
    reflow();
  }

  // ── Marcos de otro origen: no se puede entrar, se pone un escudo encima ──
  function shields(){
    shieldLayer.innerHTML = '';
    if (!on) return;
    allDocs().forEach(function(doc){
      framesIn(doc).forEach(function(frame){
        if (docOf(frame)) return;
        var r = topRect(frame);
        if (!visible(r)) return;
        var s = document.createElement('div');
        s.className = 'lbr-shield';
        s.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
        s.__frame = frame;
        shieldLayer.appendChild(s);
      });
    });
  }

  var queued = 0;
  function reflow(){
    queued = 0;
    Array.prototype.forEach.call(pinLayer.children, function(node){
      // Se vuelve a buscar cada vez: la pieza re-pinta sus lecciones y los nodos cambian.
      var el = locate(node.__target);
      if (el) place(node, el, node.__target); else node.style.display = 'none';
    });
    if (on) shields();
    if (hoverEl) outline(hoverEl);
  }
  function later(){ if (!queued) queued = requestAnimationFrame(reflow); }
  window.addEventListener('resize', later);
  // Las piezas cambian solas —acordeones, pestañas, lecciones, marcos que cargan
  // tarde—: se recoloca a menudo y barato, y se engancha lo nuevo.
  setInterval(function(){ hookAll(); reflow(); }, 700);

  function outline(el){
    if (!el.isConnected) { box.style.display = 'none'; return; }
    var r = topRect(el);
    if (!r.width || !r.height) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.style.left = r.left + 'px'; box.style.top = r.top + 'px';
    box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
    tag.style.top = r.top < 22 ? (r.height + 2) + 'px' : '-20px';
    tag.textContent = 'Comentar ' + (LABEL[kindOf(el)] || 'Elemento').toLowerCase();
  }

  function hover(el){
    if (el === hoverEl) return;
    hoverEl = el;
    if (el) outline(el); else box.style.display = 'none';
  }

  function pick(el, event){
    if (!el) return;
    var picked = describe(el, event);
    send({ type: 'pick', target: picked.target, anchor: picked.anchor });
  }

  /** Engancha un documento: sus clics, su ratón, su cursor y su desplazamiento. */
  function hook(doc){
    // La marca va en el documento: un marco que pasa de about:blank a su
    // contenido conserva la ventana pero estrena documento, y hay que engancharlo.
    if (!doc || doc.__lbrHooked) return;
    try { doc.__lbrHooked = true; } catch (e) { return; }
    if (doc !== document) {
      var st = doc.createElement('style');
      st.textContent = 'html.lbr-on, html.lbr-on *{cursor:crosshair !important}';
      (doc.head || doc.documentElement).appendChild(st);
      doc.documentElement.classList.toggle('lbr-on', on);
    }
    doc.addEventListener('scroll', later, true);
    // Un marco que termina de cargar trae un documento nuevo que enganchar.
    doc.addEventListener('load', function(e){ if (e.target && /^(IFRAME|FRAME)$/.test(e.target.tagName)) setTimeout(hookAll, 50); }, true);

    doc.addEventListener('mousemove', function(event){
      if (!on) return;
      var t = realTarget(event);
      if (isUi(t)) {
        if (t.__frame) hover(t.__frame);
        return;
      }
      hover(pickable(t));
    }, true);

    // En modo señalar, la pieza no reacciona: el clic es para elegir, no para navegar.
    ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'touchstart', 'touchend', 'dblclick', 'contextmenu', 'submit', 'auxclick'].forEach(function(type){
      doc.addEventListener(type, function(event){
        if (!on || isUi(realTarget(event)) && !realTarget(event).__frame) return;
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      }, true);
    });

    doc.addEventListener('click', function(event){
      if (!on) return;
      var t = realTarget(event);
      if (isUi(t) && !t.__frame) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (t.__frame) { event.__top = true; pick(t.__frame, event); return; }
      pick(pickable(t), event);
    }, true);

    doc.addEventListener('keydown', function(event){
      if (on && event.key === 'Escape') { setMode(false); send({ type: 'mode-off' }); }
    }, true);
  }

  function hookAll(){ allDocs().forEach(hook); }

  function setMode(next){
    on = !!next;
    allDocs().forEach(function(doc){ try { doc.documentElement.classList.toggle('lbr-on', on); } catch (e) {} });
    if (!on) { hoverEl = null; box.style.display = 'none'; }
    shields();
  }

  function flashAt(el){
    if (flash && flash.parentNode) flash.parentNode.removeChild(flash);
    var r = topRect(el);
    flash = document.createElement('div');
    flash.className = 'lbr-ui lbr-flash';
    flash.style.cssText += ';left:' + (r.left - 4) + 'px;top:' + (r.top - 4) + 'px;width:' + (r.width + 8) + 'px;height:' + (r.height + 8) + 'px';
    document.body.appendChild(flash);
    setTimeout(function(){ if (flash && flash.parentNode) flash.parentNode.removeChild(flash); }, 1700);
  }

  /** Desplaza hasta el elemento, también si vive en marcos anidados. */
  function reveal(el){
    var chain = [el], h = hostOf(el);
    while (h) { chain.push(h); h = hostOf(h); }
    for (var i = chain.length - 1; i >= 0; i--) {
      try { chain[i].scrollIntoView({ block: 'center', behavior: i === 0 ? 'smooth' : 'instant' }); } catch (e) {}
    }
  }

  /** Lleva hasta el elemento: primero a su lección o pantalla, luego a él. */
  function focus(target, tries){
    tries = tries || 0;
    if (target.hash && target.hash !== routeHash() && tries === 0) {
      location.hash = target.hash;
      return setTimeout(function(){ focus(target, 1); }, 900);
    }
    if (target.slide && target.slide !== currentSlide()) {
      // No hay forma general de saltar de pantalla en un reproductor ajeno:
      // se le dice al revisor dónde está, y el pin aparece al llegar.
      send({ type: 'elsewhere', slide: target.slide });
      return;
    }
    var el = locate(target);
    if (el && !topRect(el).width && typeof target.screen === 'number' && tries < 2) {
      var nav = document.querySelectorAll('.lb-nav__item')[target.screen];
      if (nav) { nav.click(); return setTimeout(function(){ focus(target, 2); }, 300); }
    }
    if (!el) {
      // Un marco perezoso aún no carga: se espera un poco antes de rendirse.
      if (tries < 6) return setTimeout(function(){ hookAll(); focus(target, tries + 1); }, 500);
      return;
    }
    reveal(el);
    setTimeout(function(){ flashAt(el); reflow(); }, 500);
  }

  window.addEventListener('message', function(event){
    if (event.source !== parent || event.origin !== ORIGIN) return;
    var data = event.data;
    if (!data || data.source !== 'lb-review') return;
    if (data.type === 'mode') setMode(data.on);
    if (data.type === 'pins') { pins = Array.isArray(data.pins) ? data.pins : []; render(); }
    if (data.type === 'draft') { draft = data.target || null; render(); }
    if (data.type === 'focus' && data.target) focus(data.target, 0);
  });

  var lastRoute = '';
  function reportRoute(){
    var hash = routeHash(), slide = currentSlide(), key = hash + '|' + slide;
    if (key === lastRoute) return;
    lastRoute = key;
    send({ type: 'route', hash: hash, slide: slide });
  }
  window.addEventListener('hashchange', function(){ reportRoute(); later(); });
  setInterval(reportRoute, 700);

  function start(){
    mount(); hookAll();
    send({ type: 'ready', page: PAGE, hash: routeHash(), slide: currentSlide(), title: document.title });
    lastRoute = routeHash() + '|' + currentSlide();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
`

/** La capa de revisión para una página concreta de la pieza. */
export function reviewLayer(page: string): string {
  // PAGE entra como argumento: una variable global podría chocar con las de la pieza.
  return `<script>(function(PAGE){${REVIEW_SCRIPT}})(${jsonInScript(page)});</script>`
}
