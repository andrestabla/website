/**
 * Learning Builder · la capa editable de una pieza producida.
 *
 * El compromiso es que el archivo original no se toca. Lo que se sirve es ese
 * mismo HTML con un añadido al final de la cabecera: una etiqueta <base> para
 * que sus rutas relativas encuentren los archivos, y un script que aplica los
 * retoques guardados.
 *
 * Los retoques se aplican en el navegador, no aquí, y esa decisión es el
 * corazón del asunto. Numerar los nodos de un HTML con expresiones regulares
 * en el servidor y volver a numerarlos con el DOM en el editor daría dos
 * numeraciones distintas en cuanto el documento traiga una etiqueta mal
 * cerrada o un <tbody> implícito — y entonces un retoque caería sobre el
 * párrafo equivocado. Con una sola implementación, la del navegador, eso no
 * puede pasar: el editor y la página publicada recorren el documento igual.
 *
 * Hay tres numeraciones porque se cuentan tres cosas: los textos sueltos, las
 * imágenes y los bloques donde se puede insertar o quitar contenido. Las tres
 * salen del mismo recorrido, en orden de lectura.
 *
 * El precio es un parpadeo mientras el script se ejecuta, y por eso la página
 * arranca oculta y se revela al terminar, con un plazo de seguridad para que
 * un fallo del script nunca deje la pieza en blanco.
 */
import { escapeHtml } from '../../src/learning/lib/render-ova.js'
import type { LbPatch } from '../../src/learning/lib/final.js'

/**
 * JSON seguro dentro de un <script>: un texto retocado que contenga
 * «</script>» cerraría la etiqueta y el resto se pintaría como contenido.
 */
function jsonInScript(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, '<\\/')
}

/**
 * Los tres recorridos, compartidos por el editor y por la página publicada.
 * Cambiar cualquiera invalida los retoques ya guardados, así que no se tocan
 * sin migrar lo guardado.
 *
 * Un bloque es un elemento de nivel de bloque que no contiene a otro de la
 * lista: es decir, la unidad más pequeña que una persona reconocería como
 * «esto de aquí». Contar también los contenedores llenaría la página de
 * sitios donde insertar y ninguno sería el que se quiere.
 */
const WALKERS = `
var LB_BLOQUES = 'p,h1,h2,h3,h4,h5,h6,ul,ol,table,figure,blockquote,img,video,hr,pre';

function lbTextNodes(){
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function(node){
      var parent = node.parentNode;
      if (!parent) return NodeFilter.FILTER_REJECT;
      var tag = parent.nodeName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE' || tag === 'TITLE') {
        return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue && node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  var found = [], node;
  while ((node = walker.nextNode())) found.push(node);
  return found;
}

function lbImages(){
  return Array.prototype.slice.call(document.body.querySelectorAll('img'));
}

function lbBlocks(){
  var todos = Array.prototype.slice.call(document.body.querySelectorAll(LB_BLOQUES));
  return todos.filter(function(el){
    if (el.querySelector(LB_BLOQUES)) return false;
    var txt = (el.textContent || '').trim();
    return txt.length > 0 || el.tagName === 'IMG' || el.tagName === 'HR' || el.tagName === 'VIDEO';
  });
}
`

/**
 * Aplica los retoques. Los que cambian la estructura van al final y de atrás
 * hacia delante, porque insertar o quitar desplaza todo lo que viene después
 * y las posiciones guardadas son las del documento original.
 */
const APPLY = `
function lbApply(patches){
  var textos = lbTextNodes(), imagenes = lbImages(), bloques = lbBlocks();

  patches.filter(function(p){ return p.op === 'text'; }).forEach(function(p){
    var node = textos[p.at];
    if (!node) return;
    var raw = node.nodeValue || '';
    // Se conservan los espacios de alrededor: entre etiquetas en línea
    // —«Hola <b>mundo</b>»— ese espacio es lo único que separa las palabras.
    var lead = (raw.match(/^\\s*/) || [''])[0];
    var trail = (raw.match(/\\s*$/) || [''])[0];
    node.nodeValue = lead + p.value + trail;
  });

  patches.filter(function(p){ return p.op === 'image'; }).forEach(function(p){
    var img = imagenes[p.at];
    if (!img) return;
    img.setAttribute('src', p.url);
    // Con srcset puesto, el navegador ignoraría el src nuevo.
    img.removeAttribute('srcset');
    if (p.alt !== undefined) img.setAttribute('alt', p.alt);
  });

  var estructura = patches.filter(function(p){ return p.op === 'insert' || p.op === 'remove'; });
  estructura.sort(function(a, b){ return b.at - a.at; });
  estructura.forEach(function(p){
    var el = bloques[p.at];
    if (!el || !el.parentNode) return;
    if (p.op === 'remove') { el.parentNode.removeChild(el); return; }
    var envoltorio = document.createElement('div');
    envoltorio.innerHTML = p.html;
    var nuevos = Array.prototype.slice.call(envoltorio.childNodes);
    var ancla = p.where === 'before' ? el : el.nextSibling;
    nuevos.forEach(function(n){ el.parentNode.insertBefore(n, ancla); });
  });
}
`

const REVEAL = `
function lbReveal(){ document.documentElement.classList.remove('lb-pending'); }
`

/**
 * Los enlaces a otras páginas del paquete tienen que volver al visor, no al
 * almacenamiento: de otro modo la segunda página se serviría cruda, sin sus
 * retoques. Los enlaces a fuera se dejan como están.
 */
function linkRewriter(viewBase: string, packageRoot: string, baseHref: string): string {
  return `
(function(){
  var viewBase = ${jsonInScript(viewBase)};
  var pkgRoot = ${jsonInScript(packageRoot)};
  var pageBase = ${jsonInScript(baseHref)};
  document.addEventListener('click', function(event){
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link || link.target === '_blank') return;
    var href = link.getAttribute('href') || '';
    if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return;
    var resolved;
    try { resolved = new URL(href, pageBase); } catch (e) { return; }
    // Solo se desvían las páginas del propio paquete: lo de fuera se abre igual.
    if (resolved.href.indexOf(pkgRoot) !== 0) return;
    if (!/\\.x?html?$/i.test(resolved.pathname)) return;
    event.preventDefault();
    location.href = viewBase + encodeURIComponent(resolved.href.slice(pkgRoot.length));
  }, true);
})();
`
}

/**
 * El puente del editor: convierte la pieza en algo que se puede tocar y le
 * cuenta al panel lo que se hace. Solo se inyecta dentro del builder.
 *
 * Los textos se editan en el sitio; lo demás —cambiar una imagen, añadir o
 * quitar un bloque— lo resuelve el panel, que es quien tiene el selector de
 * archivos y la paleta. Aquí solo se señala dónde.
 */
const EDITOR_BRIDGE = `
(function(){
  var textos = lbTextNodes(), imagenes = lbImages(), bloques = lbBlocks();

  function lbAntes(a, b){
    return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  /**
   * Dónde empieza cada división dentro de una de las numeraciones. Las dos
   * listas van en orden de lectura, así que se recorren a la vez y no hace
   * falta comparar todo contra todo.
   */
  function lbInicios(items, cabezas){
    var inicio = [], i = 0;
    for (var s = 0; s < cabezas.length; s++) {
      while (i < items.length && lbAntes(items[i], cabezas[s])) i++;
      inicio.push(i);
    }
    return inicio;
  }

  /**
   * Las divisiones del documento. No se inventan: se leen de sus propios
   * encabezados, tomando el nivel más alto que se repita, que es el que marca
   * las secciones de verdad y no sus subapartados. Una lectura larga trae su
   * índice escrito y esto es exactamente ese índice.
   *
   * Lo que se numera sigue siendo el documento entero. Estas divisiones solo
   * dicen por dónde va cada una, y por eso partir la lectura en el menú no
   * invalida ningún retoque ya guardado.
   */
  var cabezas = [];
  for (var nivel = 1; nivel <= 3 && !cabezas.length; nivel++) {
    var halladas = Array.prototype.slice.call(document.body.querySelectorAll('h' + nivel));
    if (halladas.length >= 3) cabezas = halladas.slice(0, 200);
  }

  var enTextos = lbInicios(textos, cabezas);
  var enImagenes = lbInicios(imagenes, cabezas);
  var enBloques = lbInicios(bloques, cabezas);
  // El rótulo se toma ahora, antes de que el paso del ratón cuelgue barras de
  // botones dentro de los encabezados.
  var secciones = cabezas.map(function(el, index){
    return {
      title: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 160) || ('Sección ' + (index + 1)),
      t: enTextos[index], i: enImagenes[index], b: enBloques[index]
    };
  });

  textos.forEach(function(node, index){
    var span = document.createElement('span');
    span.setAttribute('data-lb-t', String(index));
    span.className = 'lb-slot';
    node.parentNode.insertBefore(span, node);
    span.appendChild(node);
    span.setAttribute('contenteditable', 'plaintext-only');
  });

  imagenes.forEach(function(img, index){
    img.setAttribute('data-lb-i', String(index));
    img.classList.add('lb-img');
  });

  bloques.forEach(function(el, index){
    el.setAttribute('data-lb-b', String(index));
    el.classList.add('lb-block');
  });

  function avisar(mensaje){
    mensaje.source = 'lb-mirror';
    parent.postMessage(mensaje, '*');
  }

  document.addEventListener('input', function(event){
    var span = event.target && event.target.closest ? event.target.closest('[data-lb-t]') : null;
    if (!span) return;
    span.classList.add('lb-changed');
    avisar({ type: 'text', at: Number(span.getAttribute('data-lb-t')), value: (span.textContent || '').trim() });
  });

  document.addEventListener('click', function(event){
    var target = event.target;
    if (!target || !target.closest) return;

    var accion = target.closest('[data-lb-do]');
    if (accion) {
      event.preventDefault(); event.stopPropagation();
      var bloque = accion.closest('[data-lb-b]');
      if (bloque) avisar({ type: accion.getAttribute('data-lb-do'), at: Number(bloque.getAttribute('data-lb-b')) });
      return;
    }

    var img = target.closest('[data-lb-i]');
    if (img) {
      event.preventDefault(); event.stopPropagation();
      avisar({
        type: 'image', at: Number(img.getAttribute('data-lb-i')),
        src: img.getAttribute('src') || '', alt: img.getAttribute('alt') || ''
      });
      return;
    }

    // Un enlace dentro de un texto editable navegaría al primer clic.
    if (target.closest('a')) event.preventDefault();
  }, true);

  // La barra de cada bloque se monta una sola vez, al pasar por encima.
  document.addEventListener('mouseover', function(event){
    var el = event.target && event.target.closest ? event.target.closest('[data-lb-b]') : null;
    if (!el || el.getAttribute('data-lb-bar')) return;
    if (el.tagName === 'IMG' || el.tagName === 'HR') return;
    el.setAttribute('data-lb-bar', '1');
    var bar = document.createElement('span');
    bar.className = 'lb-bar';
    bar.setAttribute('contenteditable', 'false');
    bar.innerHTML =
      '<button type="button" data-lb-do="add-before" title="Añadir encima">+ arriba</button>' +
      '<button type="button" data-lb-do="add-after" title="Añadir debajo">+ abajo</button>' +
      '<button type="button" data-lb-do="remove" title="Quitar este bloque">quitar</button>';
    el.appendChild(bar);
  });

  // Ir a una sección desde el menú, y decirle al menú en cuál se está. Solo
  // se atiende al panel que tiene esta pieza dentro: cualquier otra ventana
  // podría mandar mensajes.
  window.addEventListener('message', function(event){
    if (event.source !== parent) return;
    var data = event.data;
    if (!data || data.source !== 'lb-panel' || data.type !== 'goto') return;
    var cabeza = cabezas[data.at];
    if (!cabeza) return;
    // El salto es seco a propósito: una lectura larga mide cientos de miles de
    // píxeles y el desplazamiento suave, ahí, no llega nunca. El destello de
    // abajo es lo que dice dónde ha caído.
    cabeza.scrollIntoView({ block: 'start', behavior: 'instant' });
    cabeza.classList.add('lb-aqui');
    setTimeout(function(){ cabeza.classList.remove('lb-aqui'); }, 1200);
  });

  if (cabezas.length) {
    var ultima = -1, pedido = 0;
    function lbMirar(){
      pedido = 0;
      var actual = 0;
      for (var s = 0; s < cabezas.length; s++) {
        if (cabezas[s].getBoundingClientRect().top <= 80) actual = s; else break;
      }
      if (actual !== ultima) { ultima = actual; avisar({ type: 'at', at: actual }); }
    }
    window.addEventListener('scroll', function(){
      if (!pedido) pedido = requestAnimationFrame(lbMirar);
    }, { passive: true });
  }

  avisar({
    type: 'ready', textos: textos.length, imagenes: imagenes.length,
    bloques: bloques.length, secciones: secciones
  });
})();
`

/**
 * Lo editable tiene que verse editable antes de pulsarlo. Sin una señal al
 * pasar por encima, quien abre la pieza no la distingue de una vista previa y
 * no llega a intentarlo.
 */
const EDITOR_CSS = `
.lb-slot{border-radius:3px;transition:background .12s,box-shadow .12s}
.lb-slot:hover{cursor:text;background:rgba(79,70,229,.10);box-shadow:0 0 0 2px rgba(79,70,229,.25)}
.lb-slot:focus{outline:0;background:rgba(79,70,229,.14);box-shadow:0 0 0 2px #4f46e5}
.lb-slot.lb-changed{background:rgba(16,185,129,.14);box-shadow:0 0 0 2px rgba(16,185,129,.45)}
.lb-img{cursor:pointer;transition:box-shadow .12s}
.lb-img:hover{box-shadow:0 0 0 3px #4f46e5}
.lb-block{position:relative}
.lb-block:hover{box-shadow:0 0 0 1px rgba(79,70,229,.3)}
.lb-bar{position:absolute;top:0;right:0;display:none;gap:1px;z-index:2147483000;
  background:#4f46e5;border-radius:0 0 0 6px;padding:1px}
.lb-block:hover > .lb-bar{display:flex}
.lb-bar button{all:unset;cursor:pointer;color:#fff;font:600 11px/1 system-ui;padding:5px 7px;border-radius:4px}
.lb-bar button:hover{background:rgba(255,255,255,.28)}
/* Al saltar desde el menú, la sección se señala un momento: en un documento
   largo, sin eso no se sabe dónde ha caído el salto. */
@keyframes lb-aqui{from{background:rgba(79,70,229,.22)}to{background:transparent}}
.lb-aqui{animation:lb-aqui 1.2s ease-out}
`

export type MirrorLayer = {
  /**
   * Carpeta de la página que se sirve, no la del paquete: es lo que va en
   * <base>, y es lo que hace que «../img/foto.png» resuelva igual que
   * resolvía en el original.
   */
  baseHref: string
  /** Raíz del paquete, para saber qué enlaces son de dentro. */
  packageRoot: string
  /** Los retoques de esta página. */
  patches: LbPatch[]
  /** Prefijo al que redirigir los enlaces internos; vacío para no tocarlos. */
  viewBase?: string
  /** true solo dentro del editor del builder. */
  editable?: boolean
}

/** El script que aplica los retoques, con o sin puente de edición. */
function layerScript(patches: LbPatch[], editable: boolean): string {
  return `<script>
${WALKERS}${APPLY}${REVEAL}
(function(){
  var patches = ${jsonInScript(patches)};
  if (patches.length) {
    document.documentElement.classList.add('lb-pending');
    // Plazo de seguridad: pase lo que pase, la pieza se ve.
    setTimeout(lbReveal, 1500);
  }
  function start(){
    try { if (patches.length) lbApply(patches); } catch (e) { /* el original manda */ }
    lbReveal();
    ${editable ? 'try { lbEditor(); } catch (e) {}' : ''}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
${editable ? `function lbEditor(){${EDITOR_BRIDGE}}` : ''}
</script>`
}

/**
 * Devuelve el HTML original con la capa añadida. No reescribe nada del
 * cuerpo: todo lo que se inserta va en la cabecera.
 */
export function injectMirrorLayer(html: string, layer: MirrorLayer): string {
  const patches = layer.patches || []
  const head = [
    `<base href="${escapeHtml(layer.baseHref)}">`,
    patches.length ? '<style>html.lb-pending{visibility:hidden}</style>' : '',
    layer.editable ? `<style>${EDITOR_CSS}</style>` : '',
    layerScript(patches, !!layer.editable),
    layer.viewBase ? `<script>${linkRewriter(layer.viewBase, layer.packageRoot, layer.baseHref)}</script>` : '',
  ]
    .filter(Boolean)
    .join('\n')

  // Se entra justo después de <head> para que el <base> gane al que pudiera
  // traer el original. Un documento sin cabecera se envuelve en una.
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}\n${head}`)
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (match) => `${match}\n<head>\n${head}\n</head>`)
  }
  return `<!DOCTYPE html><html><head>\n${head}\n</head><body>\n${html}\n</body></html>`
}

/**
 * Los retoques y nada más: sin <base> y sin el puente del editor.
 *
 * Lo usa el contenido que ya vive dentro de otra página —los bloques HTML de
 * un Rise, que su propio reproductor pinta en un marco— donde meter un <base>
 * rompería las rutas que ese reproductor ya resuelve bien.
 */
export function injectEditsOnly(html: string, patches: LbPatch[]): string {
  if (!patches.length) return html
  const patch = `<style>html.lb-pending{visibility:hidden}</style>${layerScript(patches, false)}`
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (match) => `${match}\n${patch}`)
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (match) => `${match}\n<head>${patch}</head>`)
  return `${patch}${html}`
}

/** Tipos de contenido por extensión, para servir el paquete tal cual. */
const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  xhtml: 'application/xhtml+xml',
  xml: 'text/xml; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  vtt: 'text/vtt; charset=utf-8',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
  pdf: 'application/pdf',
  txt: 'text/plain; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  zip: 'application/zip',
}

export function contentTypeFor(path: string): string {
  const ext = (path.split('.').pop() || '').toLowerCase()
  return TYPES[ext] || 'application/octet-stream'
}

export function isHtmlPath(path: string): boolean {
  return /\.x?html?$/i.test(path)
}
