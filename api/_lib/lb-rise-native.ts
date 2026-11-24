/**
 * Learning Builder · retocar un Rise hecho con los bloques del propio Rise.
 *
 * Los cursos de Algoritmo T llevan cada lección como un único bloque HTML, y
 * eso es lo que el editor abre y retoca (lb-rise.ts). Un curso armado a mano
 * en Articulate Rise no tiene ese documento: sus lecciones son una lista de
 * bloques —párrafos, listas, acordeones, tarjetas compuestas— y el texto vive
 * repartido por los datos del paquete, en dos formas:
 *
 *   · los bloques clásicos lo guardan como HTML en campos sueltos
 *     (`paragraph`, `description`) o como texto llano (`title`);
 *   · las tarjetas compuestas («mondrian») lo guardan aparte, en
 *     `course.mondrian.items`, como documentos TipTap cuyas hojas son texto.
 *
 * Aquí no se imita al reproductor de Rise, que es suyo y no se puede calcar.
 * Se arma una **página de trabajo**: los textos de la lección, en su orden y
 * agrupados por bloque, para corregirlos en el sitio. Lo que se publica sigue
 * siendo el Rise original; al servir sus datos, cada corrección se escribe en
 * el campo del que salió su texto.
 *
 * Todo descansa en una sola cosa: que el texto número N de la página de
 * trabajo sea siempre el mismo campo de los datos. Por eso la página y la
 * escritura salen del **mismo recorrido** (`walk`): al pintar se anota, en
 * orden, dónde está cada texto; al aplicar se repite el recorrido y se escribe
 * en la anotación N. Y por eso la página no lleva ni una palabra propia —los
 * rótulos son CSS—: cualquier texto de más correría la cuenta.
 *
 * Solo se retocan textos. Añadir o quitar bloques y cambiar imágenes en un
 * Rise nativo se hace en Rise.
 */
import type { LbPatch } from '../../src/learning/lib/final.js'

/** Un texto de la lección: dónde se lee y cómo se escribe. */
type Leaf = { read: () => string; write: (value: string) => void }

type Walk = { html: string; leaves: Leaf[] }

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function decode(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
}

/** El texto nuevo, entre los espacios que rodeaban al anterior. */
function keepEdges(previous: string, value: string): string {
  const lead = /^\s*/.exec(previous)?.[0] || ''
  const trail = /\s*$/.exec(previous)?.[0] || ''
  return lead + value + trail
}

/**
 * ¿Esta lección se edita como Rise nativo? Sí cuando no trae el bloque HTML
 * que lleva el documento entero, o cuando además de él trae bloques de
 * contenido. Las lecciones de siempre —un bloque HTML y, como mucho, sus
 * divisores— siguen por el camino de siempre.
 */
export function isNativeLesson(lesson: any): boolean {
  const items: any[] = Array.isArray(lesson?.items) ? lesson.items : []
  const hasDocument = items.some(
    (block) => block?.type === 'html' && (block.items || []).some((row: any) => typeof row?.srcdoc === 'string')
  )
  return !hasDocument || items.some((block) => block?.type !== 'html' && block?.type !== 'divider')
}

// ── Campos con HTML ──────────────────────────────────────────────────────────

const KEEP = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'])
const TOKEN = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+|</g

/**
 * Un campo que guarda HTML. Se parte en etiquetas y textos; cada texto con
 * algo que leer es una hoja. A la página van solo las etiquetas de formato
 * básico, y donde se quita una se deja un comentario vacío: sin él, dos textos
 * que la etiqueta separaba se le juntarían al navegador en uno solo y la
 * cuenta dejaría de coincidir.
 */
function rich(holder: any, key: string, out: Walk): void {
  const tokens: Array<{ raw: string; text: boolean }> = []
  for (const match of String(holder[key]).matchAll(TOKEN)) {
    const raw = match[0]
    const text = !(raw.length > 1 && raw.startsWith('<') && raw.endsWith('>'))
    const last = tokens[tokens.length - 1]
    if (text && last?.text) last.raw += raw
    else tokens.push({ raw, text })
  }
  const save = () => { holder[key] = tokens.map((token) => token.raw).join('') }

  for (const token of tokens) {
    if (!token.text) {
      const tag = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)/.exec(token.raw)
      const name = tag ? tag[2].toLowerCase() : ''
      out.html += KEEP.has(name) ? `<${tag![1]}${name}>` : '<!---->'
      continue
    }
    const plain = decode(token.raw)
    out.html += esc(plain)
    if (!plain.trim()) continue
    out.leaves.push({
      read: () => decode(token.raw),
      write: (value) => { token.raw = esc(keepEdges(decode(token.raw), value)); save() },
    })
  }
}

/** Un campo de texto llano: entero, es una hoja. */
function plain(holder: any, key: string, out: Walk, tag = 'span'): void {
  const value = holder[key]
  if (typeof value !== 'string' || !value.trim()) return
  out.html += `<${tag}>${esc(value)}</${tag}>`
  out.leaves.push({
    read: () => String(holder[key]),
    write: (next) => { holder[key] = keepEdges(String(holder[key]), next) },
  })
}

// ── Bloques clásicos ─────────────────────────────────────────────────────────

/** Campos que nunca son texto del curso: identificadores, rutas, ajustes. */
const SKIP = /^(id|type|family|variant|key|url|src|srcdoc|href|settings|background|media|createdAt|updatedAt|globalBlockId|blockumentId|buttonColor|icon|color|originalUrl)$/i

function looksLikeText(value: string): boolean {
  const text = value.trim()
  if (!/\p{L}/u.test(text)) return false
  if (/^(https?:|data:|rise\/|#[0-9a-f]{3,8}$)/i.test(text)) return false
  if (/^[A-Za-z0-9_-]{16,}$/.test(text)) return false
  return !/^\S+\.(svg|png|jpe?g|gif|webp|mp4|mp3|vtt|pdf)$/i.test(text)
}

/**
 * Recorre los `items` de un bloque clásico en el orden en que están guardados
 * y saca sus textos, sin conocer cada tipo de bloque uno por uno: Rise tiene
 * decenas y todos guardan lo que se lee en campos de texto de sus elementos.
 */
function classic(value: any, out: Walk, depth = 0): void {
  if (depth > 6 || !value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const row of value) {
      out.html += '<div class="rb-item">'
      classic(row, out, depth + 1)
      out.html += '</div>'
    }
    return
  }
  for (const key of Object.keys(value)) {
    if (SKIP.test(key)) continue
    const field = value[key]
    if (typeof field === 'string') {
      if (!field.trim()) continue
      if (/<[a-zA-Z!/]/.test(field)) {
        out.html += '<div class="rb-rico">'
        rich(value, key, out)
        out.html += '</div>'
      } else if (looksLikeText(field)) {
        plain(value, key, out, key === 'title' || key === 'heading' ? 'h4' : 'p')
      }
    } else if (field && typeof field === 'object') {
      classic(field, out, depth + 1)
    }
  }
}

// ── Tarjetas compuestas (mondrian) ───────────────────────────────────────────

function tiptap(node: any, out: Walk): void {
  if (!node || typeof node !== 'object') return
  if (node.type === 'text') {
    if (typeof node.text !== 'string') return
    if (!node.text.trim()) { out.html += esc(node.text); return }
    const bold = (node.marks || []).some((mark: any) => mark?.type === 'bold')
    plain(node, 'text', out, bold ? 'b' : 'span')
    return
  }
  if (node.type === 'hardBreak') { out.html += '<br>'; return }
  const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 2))
  const tag =
    node.type === 'heading' ? `h${level}`
      : node.type === 'paragraph' ? 'p'
      : node.type === 'bulletList' ? 'ul'
      : node.type === 'orderedList' ? 'ol'
      : node.type === 'listItem' ? 'li'
      : ''
  if (tag) out.html += `<${tag}>`
  for (const child of Array.isArray(node.content) ? node.content : []) tiptap(child, out)
  if (tag) out.html += `</${tag}>`
}

/** Los elementos de una tarjeta, de arriba abajo y de izquierda a derecha. */
function mondrian(course: any, block: any, out: Walk): void {
  const items: any[] = Object.values(course?.mondrian?.items || {}).filter(
    (item: any) => item?.blockumentId === block?.blockumentId && !item.removed
  )
  const position = (item: any) => item?.states?.default || {}
  const childrenOf = (parentId: string) =>
    items
      .filter((item) => item.parentId === parentId)
      .sort((a, b) => (Number(position(a).y) || 0) - (Number(position(b).y) || 0) || (Number(position(a).x) || 0) - (Number(position(b).x) || 0) || String(a.id).localeCompare(String(b.id)))

  const seen = new Set<string>()
  const visit = (item: any, depth: number) => {
    if (depth > 12 || seen.has(item.id)) return
    seen.add(item.id)
    for (const state of Object.values(item.states || {}) as any[]) {
      if (state?.text?.json) {
        out.html += '<div class="rb-item">'
        tiptap(state.text.json, out)
        out.html += '</div>'
      }
    }
    for (const child of childrenOf(item.id)) visit(child, depth + 1)
  }
  for (const root of childrenOf(String(block?.blockumentId || ''))) visit(root, 0)
}

// ── La lección ───────────────────────────────────────────────────────────────

const BLOCK_LABEL: Record<string, string> = {
  text: 'Texto', list: 'Lista', image: 'Imagen con texto', multimedia: 'Multimedia', interactive: 'Interactivo',
  knowledgeCheck: 'Comprobación', quote: 'Cita', gallery: 'Galería', chart: 'Gráfico', divider: 'Divisor',
  custom: 'Tarjeta', html: 'Bloque HTML incrustado · se edita en Rise', statement: 'Enunciado', flashcards: 'Tarjetas',
}

/** El recorrido único: pinta la página de trabajo y anota cada texto. */
function walk(course: any, lesson: any): Walk {
  const out: Walk = { html: '', leaves: [] }
  out.html += '<header class="rb-titulo">'
  plain(lesson, 'title', out, 'h1')
  out.html += '</header>'
  for (const block of Array.isArray(lesson?.items) ? lesson.items : []) {
    const before = out.html.length
    const leaves = out.leaves.length
    const label = `${BLOCK_LABEL[block?.type] || 'Bloque'}${block?.variant && block.type !== 'html' && block.type !== 'custom' ? ` · ${block.variant}` : ''}`
    out.html += `<section class="rb" data-rb="${esc(label).replace(/"/g, '&quot;')}">`
    if (block?.type === 'custom' && block.blockumentId) mondrian(course, block, out)
    else if (block?.type !== 'html') classic(block?.items, out)
    out.html += '</section>'
    // Un bloque sin texto (un espaciador, un video) no ocupa sitio en la página,
    // salvo el HTML incrustado, que conviene que se vea que está y no se toca.
    if (out.leaves.length === leaves && block?.type !== 'html') out.html = out.html.slice(0, before)
  }
  return out
}

const PAGE_CSS = `
body{margin:0;padding:28px 16px 96px;background:#f1f5f9;color:#0f172a;font:16px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif}
main{max-width:820px;margin:0 auto}
main::before{content:'Lección hecha con bloques de Rise · aquí se corrigen sus textos; el diseño, las imágenes y la estructura se ven en la pieza publicada y se cambian en Rise.';
  display:block;margin:0 0 18px;padding:10px 14px;border-radius:10px;background:#fef3c7;color:#78350f;font:500 13px/1.45 system-ui,sans-serif}
.rb-titulo h1{margin:0 0 18px;font-size:26px;line-height:1.25}
.rb{position:relative;margin:0 0 14px;padding:30px 20px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:12px}
.rb::before{content:attr(data-rb);position:absolute;left:14px;top:9px;font:800 10px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8}
.rb-item+.rb-item{margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0}
.rb p,.rb h1,.rb h2,.rb h3,.rb h4,.rb h5,.rb h6,.rb ul,.rb ol{margin:0 0 .5em}
.rb h1{font-size:22px}.rb h2{font-size:19px}.rb h3{font-size:17px}.rb h4,.rb h5,.rb h6{font-size:16px}
.rb>:last-child,.rb-item>:last-child,.rb-rico>:last-child{margin-bottom:0}
`

/** La página de trabajo de una lección nativa, o null si la lección no existe. */
export function nativeLessonPage(course: any, lessonId: string): string | null {
  const lesson = (course?.lessons || []).find((row: any) => String(row?.id || '') === lessonId)
  if (!lesson) return null
  const { html } = walk(course, lesson)
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<style>${PAGE_CSS}</style>
<script>window.__lbSoloTexto = true;</script>
</head><body><main>${html}</main></body></html>`
}

/** Los textos de la lección en el orden de la página; para comprobar la cuenta. */
export function nativeLessonTexts(course: any, lessonId: string): string[] {
  const lesson = (course?.lessons || []).find((row: any) => String(row?.id || '') === lessonId)
  return lesson ? walk(course, lesson).leaves.map((leaf) => leaf.read()) : []
}

/**
 * Escribe las correcciones de texto en los datos del curso. `course` se
 * modifica: quien llama pasa una copia. Devuelve cuántas se aplicaron.
 */
export function applyNativeEdits(course: any, lessonId: string, patches: LbPatch[]): number {
  const lesson = (course?.lessons || []).find((row: any) => String(row?.id || '') === lessonId)
  if (!lesson) return 0
  // Las posiciones son las de la lección sin corregir: se anotan todas antes de escribir.
  const { leaves } = walk(course, lesson)
  let applied = 0
  for (const patch of patches) {
    if (patch.op !== 'text') continue
    const leaf = leaves[patch.at]
    if (!leaf) continue
    leaf.write(patch.value)
    applied += 1
  }
  return applied
}
