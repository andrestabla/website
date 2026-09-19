/**
 * Learning Builder · la capa editable de una pieza importada.
 *
 * El compromiso del modo copia fiel es que el archivo original no se toca. Lo
 * que se sirve es ese mismo HTML con un añadido al final de la cabecera: una
 * etiqueta <base> para que sus rutas relativas encuentren los archivos en el
 * almacenamiento, y un script que aplica las ediciones.
 *
 * Las ediciones se aplican en el navegador, no aquí, y esa decisión es el
 * corazón del asunto. Numerar los nodos de texto de un HTML con expresiones
 * regulares en el servidor y volver a numerarlos con el DOM en el editor daría
 * dos numeraciones distintas en cuanto el documento traiga una etiqueta mal
 * cerrada, una entidad rara o un <tbody> implícito — y entonces una edición
 * caería sobre el párrafo equivocado. Con una sola implementación, la del
 * navegador, eso no puede pasar: el editor y la página publicada recorren el
 * documento exactamente igual.
 *
 * El precio es un parpadeo mientras el script se ejecuta, y por eso la página
 * arranca oculta y se revela al terminar, con un plazo de seguridad para que
 * un fallo del script nunca deje la pieza en blanco.
 */
import { escapeHtml } from './lb-render.js'

/**
 * JSON seguro dentro de un <script>: un texto editado que contenga «</script>»
 * cerraría la etiqueta y el resto del script se pintaría como contenido.
 */
function jsonInScript(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, '<\\/')
}

/**
 * El recorrido: los nodos de texto visibles del documento, en orden. Es la
 * definición compartida por el editor y por la página publicada, así que
 * cambiarla invalida las ediciones ya guardadas.
 */
const WALKER = `
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
`

/**
 * Aplica el texto nuevo conservando los espacios de alrededor. En un texto
 * suelto no se nota; entre etiquetas en línea —«Hola <b>mundo</b>»— ese
 * espacio es lo único que separa las palabras.
 */
const APPLY = `
function lbApply(nodes, edits){
  for (var slot in edits) {
    var node = nodes[parseInt(slot, 10)];
    if (!node) continue;
    var raw = node.nodeValue || '';
    var lead = (raw.match(/^\\s*/) || [''])[0];
    var trail = (raw.match(/\\s*$/) || [''])[0];
    node.nodeValue = lead + edits[slot] + trail;
  }
}
`

const REVEAL = `
function lbReveal(){ document.documentElement.classList.remove('lb-pending'); }
`

/**
 * Los enlaces a otras páginas del paquete tienen que volver al visor, no al
 * almacenamiento: de otro modo la segunda página se serviría cruda, sin sus
 * ediciones. Los enlaces a fuera se dejan como están.
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

/** Bridge del editor: solo en el marco del builder, nunca en lo publicado. */
const EDITOR_BRIDGE = `
(function(){
  var nodes = lbTextNodes();
  nodes.forEach(function(node, index){
    var span = document.createElement('span');
    span.setAttribute('data-lb-slot', String(index));
    span.className = 'lb-slot';
    node.parentNode.insertBefore(span, node);
    span.appendChild(node);
    span.setAttribute('contenteditable', 'plaintext-only');
  });
  document.addEventListener('input', function(event){
    var span = event.target && event.target.closest ? event.target.closest('[data-lb-slot]') : null;
    if (!span) return;
    parent.postMessage({
      source: 'lb-mirror', type: 'edit',
      slot: span.getAttribute('data-lb-slot'),
      text: (span.textContent || '').trim()
    }, '*');
  });
  // Un enlace dentro de un texto editable navegaría al primer clic.
  document.addEventListener('click', function(event){
    var link = event.target && event.target.closest ? event.target.closest('a') : null;
    if (link) event.preventDefault();
  }, true);
  parent.postMessage({ source: 'lb-mirror', type: 'ready', slots: nodes.length }, '*');
})();
`

const EDITOR_CSS = `
.lb-slot:hover{outline:1px dashed rgba(79,70,229,.8);outline-offset:2px;cursor:text}
.lb-slot:focus{outline:2px solid #4f46e5;outline-offset:2px;background:rgba(79,70,229,.08)}
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
  /** Ediciones de esta página: índice de nodo → texto nuevo. */
  edits: Record<string, string>
  /** Prefijo al que redirigir los enlaces internos; vacío para no tocarlos. */
  viewBase?: string
  /** true solo dentro del editor del builder. */
  editable?: boolean
}

/**
 * Devuelve el HTML original con la capa añadida. No reescribe nada del cuerpo:
 * todo lo que se inserta va en la cabecera.
 */
export function injectMirrorLayer(html: string, layer: MirrorLayer): string {
  const edits = layer.edits || {}
  const hasEdits = Object.keys(edits).length > 0

  const head = [
    `<base href="${escapeHtml(layer.baseHref)}">`,
    hasEdits ? '<style>html.lb-pending{visibility:hidden}</style>' : '',
    layer.editable ? `<style>${EDITOR_CSS}</style>` : '',
    `<script>
${WALKER}${APPLY}${REVEAL}
(function(){
  var edits = ${jsonInScript(edits)};
  var hasEdits = ${hasEdits ? 'true' : 'false'};
  if (hasEdits) {
    document.documentElement.classList.add('lb-pending');
    // Plazo de seguridad: pase lo que pase, la pieza se ve.
    setTimeout(lbReveal, 1500);
  }
  function start(){
    try { if (hasEdits) lbApply(lbTextNodes(), edits); } catch (e) { /* el original manda */ }
    lbReveal();
    ${layer.editable ? 'try { lbEditor(); } catch (e) {}' : ''}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
${layer.editable ? `function lbEditor(){${EDITOR_BRIDGE}}` : ''}
</script>`,
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
