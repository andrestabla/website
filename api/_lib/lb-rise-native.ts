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
 * Además de los textos, el mismo recorrido anota otras dos cosas, cada una
 * con su propia numeración:
 *
 *   · las **imágenes** (la de un bloque, su fondo, los íconos de una tarjeta),
 *     que van a la página como <img> y se cambian con el retoque `image`;
 *   · las **propiedades** (color de fondo y márgenes de un bloque, los colores
 *     y tamaños de letra de una tarjeta, el color del tema, y el orden de los
 *     bloques de la lección), que van como controles y se cambian con `prop`.
 *
 * Las tres numeraciones se calculan siempre sobre los datos originales: lo
 * retocado se muestra encima —el valor del control, la imagen nueva— sin
 * mover nada de sitio. Por lo mismo, mover o quitar un bloque no cambia el
 * orden del documento: se pinta con CSS y se aplica al final, cuando ya está
 * escrito todo lo demás.
 *
 * Lo que no se hace aquí es crear tipos de bloque que el paquete no traiga ni
 * recomponer por dentro una tarjeta: eso es del editor de Rise.
 */
import type { LbPatch } from '../../src/learning/lib/final.js'

/** Un texto de la lección: dónde se lee y cómo se escribe. */
type Leaf = { read: () => string; write: (value: string) => void }

/** Una propiedad: además, qué valores admite. */
type Prop = Leaf & { accept: (value: string) => boolean }

type Walk = { html: string; leaves: Leaf[]; images: Leaf[]; props: Prop[] }

const HEX = /^#[0-9a-f]{6}$/i

function attr(value: string): string {
  return esc(value).replace(/"/g, '&quot;')
}

/** «#abc» y «#AABBCC» son el mismo color; lo demás (variables del tema, rgba) no se toca. */
function hexOf(value: unknown): string {
  if (typeof value !== 'string') return ''
  const raw = value.trim().toLowerCase()
  if (HEX.test(raw)) return raw
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(raw)
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : ''
}

// ── Imágenes ─────────────────────────────────────────────────────────────────

/**
 * Una imagen cambiada no reescribe ningún archivo del paquete: el dato pasa a
 * nombrar un archivo nuevo cuyo nombre lleva dentro de dónde sale. Quien sirve
 * el paquete (asset.ts) y quien lo empaqueta (lb-mirror-package.ts) lo
 * reconocen por el prefijo y van a buscarlo.
 */
const REPLACED = /^lb~([A-Za-z0-9_-]+)\.([a-z0-9]{2,5})$/

export function replacedAssetName(url: string): string {
  const ext = (/\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(url)?.[1] || 'png').toLowerCase()
  return `lb~${Buffer.from(url, 'utf8').toString('base64url')}.${ext}`
}

/** La URL que hay detrás de un nombre de imagen cambiada, o '' si no lo es. */
export function replacedAssetUrl(name: string): string {
  const match = REPLACED.exec(name.split('/').pop() || '')
  if (!match) return ''
  try {
    const url = Buffer.from(match[1], 'base64url').toString('utf8')
    return /^https:\/\//i.test(url) ? url : ''
  } catch {
    return ''
  }
}

function image(out: Walk, label: string, read: () => string, write: (name: string) => void): void {
  if (!read()) return
  const index = out.images.length
  out.images.push({ read, write })
  out.html += `<figure class="rb-fig" data-rb="${attr(label)}"><img src="@@I${index}@@" alt="" loading="lazy"></figure>`
}

/** La imagen de un bloque clásico: `media.image` de un elemento o del fondo. */
function classicImage(out: Walk, label: string, media: any): void {
  const img = media?.image
  if (!img || typeof img !== 'object') return
  const current = () => String((img.useCrushedKey && img.crushedKey) || img.crushedKey || img.originalUrl || '').split('/').pop() || ''
  image(out, label, current, (name) => {
    img.key = name
    img.crushedKey = name
    img.originalUrl = name
    img.useCrushedKey = true
  })
}

// ── Propiedades ──────────────────────────────────────────────────────────────

function control(out: Walk, label: string, type: 'color' | 'number', prop: Prop, extra = ''): void {
  const index = out.props.length
  out.props.push(prop)
  out.html += `<label class="rb-c" data-n="${attr(label)}"><input type="${type}" data-lb-p="${index}" value="@@P${index}@@"${extra}></label>`
}

function colorControl(out: Walk, label: string, read: () => string, write: (value: string) => void, extra = ''): void {
  if (!hexOf(read())) return
  control(out, label, 'color', { read: () => hexOf(read()), write, accept: (value) => HEX.test(value) }, extra)
}

function numberControl(out: Walk, label: string, holder: any, key: string, min: number, max: number): void {
  if (typeof holder?.[key] !== 'number') return
  control(out, label, 'number', {
    read: () => String(holder[key]),
    write: (value) => { holder[key] = Number(value) },
    accept: (value) => /^\d{1,3}(\.\d{1,2})?$/.test(value) && Number(value) >= min && Number(value) <= max,
  }, ` min="${min}" max="${max}"`)
}

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
    if (key === 'media') { classicImage(out, 'Imagen', value.media); continue }
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

  /** Las marcas y nodos de un documento TipTap que llevan color o tamaño. */
  const styled = (node: any, found: any[]) => {
    if (!node || typeof node !== 'object') return found
    if (node.attrs && typeof node.attrs === 'object') found.push(node.attrs)
    for (const mark of Array.isArray(node.marks) ? node.marks : []) if (mark?.attrs) found.push(mark.attrs)
    for (const child of Array.isArray(node.content) ? node.content : []) styled(child, found)
    return found
  }

  // La paleta de la tarjeta: cada color distinto, una sola vez, con todos los
  // sitios donde aparece. Cambiarlo los cambia todos, que es lo que se quiere
  // al decir «este azul, más oscuro».
  const palette = new Map<string, Array<(value: string) => void>>()
  const note = (holder: any, key: string) => {
    const color = hexOf(holder?.[key])
    if (!color) return
    palette.set(color, [...(palette.get(color) || []), (value) => { holder[key] = value }])
  }
  for (const item of items) {
    for (const state of Object.values(item.states || {}) as any[]) {
      if (!state || typeof state !== 'object') continue
      if (state.fill) {
        note(state.fill, 'color')
        for (const stop of Array.isArray(state.fill.stops) ? state.fill.stops : []) note(stop, 'color')
      }
      if (state.border?.applied) note(state.border, 'color')
      if (state.text?.json) for (const attrs of styled(state.text.json, [])) note(attrs, 'color')
    }
  }
  if (palette.size) {
    out.html += '<div class="rb-paleta" data-rb="Colores de la tarjeta">'
    for (const [color, writers] of palette) {
      colorControl(out, color, () => color, (value) => { for (const write of writers) write(value) })
    }
    out.html += '</div>'
  }

  const seen = new Set<string>()
  const visit = (item: any, depth: number) => {
    if (depth > 12 || seen.has(item.id)) return
    seen.add(item.id)
    for (const state of Object.values(item.states || {}) as any[]) {
      const assetId = state?.fill?.assetId
      const asset = assetId ? item.assets?.[assetId] : null
      if (asset && typeof asset.path === 'string') {
        image(out, 'Imagen o ícono', () => String(asset.path || ''), (name) => { asset.path = name; asset.name = name })
      }
      if (state?.text?.json) {
        out.html += '<div class="rb-item">'
        // El tamaño de letra del elemento: uno, para todos sus tramos.
        const sized = styled(state.text.json, []).filter((attrs) => typeof attrs.textSize === 'number')
        if (sized.length) {
          control(out, 'Tamaño', 'number', {
            read: () => String(sized[0].textSize),
            write: (value) => { for (const attrs of sized) attrs.textSize = Number(value) },
            accept: (value) => /^\d{1,3}$/.test(value) && Number(value) >= 6 && Number(value) <= 200,
          }, ' min="6" max="200"')
        }
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

/** El recorrido único: pinta la página de trabajo y anota cada texto, imagen y propiedad. */
function walk(course: any, lesson: any): Walk {
  const out: Walk = { html: '', leaves: [], images: [], props: [] }
  const blocks: any[] = Array.isArray(lesson?.items) ? lesson.items : []

  // La propiedad 0 de toda lección: en qué orden van sus bloques, por su
  // posición original. Un bloque que no está en la lista está quitado.
  const original = blocks.map((_block, index) => index).join(',')
  out.props.push({
    read: () => original,
    write: (value) => { lesson.items = value.split(',').map((index) => blocks[Number(index)]) },
    accept: (value) => {
      const picked = value.split(',')
      return picked.every((index) => /^\d{1,4}$/.test(index) && Number(index) < blocks.length) && new Set(picked).size === picked.length
    },
  })
  out.html += '<input type="hidden" data-rb-orden data-lb-p="0" value="@@P0@@">'

  out.html += '<header class="rb-titulo">'
  plain(lesson, 'title', out, 'h1')
  if (course && typeof course === 'object') {
    out.html += '<div class="rb-barra">'
    colorControl(out, 'Color del tema (todo el curso)', () => String(course.theme?.colorAccent || course.color || ''), (value) => {
      course.color = value
      if (course.theme && typeof course.theme === 'object') course.theme.colorAccent = value
    })
    out.html += '</div>'
  }
  out.html += '</header><div class="rb-lista">'

  for (const block of blocks) {
    const label = `${BLOCK_LABEL[block?.type] || 'Bloque'}${block?.variant && block.type !== 'html' && block.type !== 'custom' ? ` · ${block.variant}` : ''}`
    out.html += `<section class="rb" data-rb="${attr(label)}"><div class="rb-barra">`
    const settings = block?.settings && typeof block.settings === 'object' ? block.settings : null
    if (settings) {
      colorControl(out, 'Fondo', () => String(settings.backgroundColor || ''), (value) => { settings.backgroundColor = value; settings.backgroundType = 'COLOR' }, ' data-rb-fondo')
      numberControl(out, 'Margen arriba', settings, 'paddingTop', 0, 60)
      numberControl(out, 'Margen abajo', settings, 'paddingBottom', 0, 60)
    }
    out.html +=
      '<span class="rb-mover">' +
      '<button type="button" data-rb-do="subir" aria-label="Subir el bloque"></button>' +
      '<button type="button" data-rb-do="bajar" aria-label="Bajar el bloque"></button>' +
      '<button type="button" data-rb-do="quitar" aria-label="Quitar o restaurar el bloque"></button>' +
      '</span></div>'
    classicImage(out, 'Fondo del bloque', block?.background?.media)
    if (block?.type === 'custom' && block.blockumentId) mondrian(course, block, out)
    else if (block?.type !== 'html') classic(block?.items, out)
    out.html += '</section>'
  }
  out.html += '</div>'
  return out
}

const PAGE_CSS = `
body{margin:0;padding:28px 16px 96px;background:#f1f5f9;color:#0f172a;font:16px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif}
main{max-width:860px;margin:0 auto}
main::before{content:'Lección hecha con bloques de Rise · aquí se corrigen sus textos, imágenes, colores, tamaños y el orden de sus bloques. Cómo queda se ve en la vista previa.';
  display:block;margin:0 0 18px;padding:10px 14px;border-radius:10px;background:#fef3c7;color:#78350f;font:500 13px/1.45 system-ui,sans-serif}
.rb-titulo h1{margin:0 0 10px;font-size:26px;line-height:1.25}
.rb-titulo{margin:0 0 18px}
.rb-lista{display:flex;flex-direction:column;gap:14px}
.rb{position:relative;padding:12px 20px 14px;background:#fff;border:1px solid #e2e8f0;border-left:6px solid var(--fondo,#e2e8f0);border-radius:12px}
.rb-fuera{opacity:.45;background:repeating-linear-gradient(135deg,#fff,#fff 10px,#f8fafc 10px,#f8fafc 20px)}
.rb-fuera::after{content:'Quitado · no se entrega';position:absolute;right:16px;bottom:8px;font:800 10px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#b91c1c}
.rb-barra{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:0 0 10px;min-height:26px}
.rb::before{content:attr(data-rb);display:block;margin:0 0 6px;font:800 10px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8}
.rb-c{display:inline-flex;align-items:center;gap:5px;font:600 11.5px/1 system-ui,sans-serif;color:#64748b}
.rb-c::before{content:attr(data-n)}
.rb-c input[type=color]{width:26px;height:22px;padding:0;border:1px solid #cbd5e1;border-radius:5px;background:#fff;cursor:pointer}
.rb-c input[type=number]{width:58px;padding:3px 5px;border:1px solid #cbd5e1;border-radius:5px;font:600 12px/1 system-ui,sans-serif;color:#0f172a}
.rb-paleta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:0 0 10px;padding:8px 10px;border-radius:8px;background:#f8fafc}
.rb-paleta::before{content:attr(data-rb);flex-basis:100%;font:800 9.5px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8}
.rb-paleta .rb-c::before{font-family:ui-monospace,monospace;font-weight:500}
.rb-mover{margin-left:auto;display:inline-flex;gap:4px}
.rb-mover button{all:unset;cursor:pointer;display:grid;place-items:center;height:24px;min-width:24px;padding:0 6px;border:1px solid #cbd5e1;border-radius:6px;font:700 12px/1 system-ui,sans-serif;color:#475569;background:#fff}
.rb-mover button:hover{background:#eef2ff;border-color:#6366f1;color:#3730a3}
.rb-mover [data-rb-do=subir]::before{content:'↑'}
.rb-mover [data-rb-do=bajar]::before{content:'↓'}
.rb-mover [data-rb-do=quitar]::before{content:'Quitar'}
.rb-fuera .rb-mover [data-rb-do=quitar]::before{content:'Restaurar'}
.rb-fig{display:inline-block;margin:0 10px 10px 0;padding:6px;border:1px dashed #cbd5e1;border-radius:8px;background:#f8fafc;vertical-align:top}
.rb-fig::before{content:attr(data-rb);display:block;margin:0 0 4px;font:700 9.5px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8}
.rb-fig img{display:block;max-width:220px;max-height:130px;min-width:32px;min-height:24px;object-fit:contain;cursor:pointer;
  background:repeating-conic-gradient(#cbd5e1 0 25%,#e2e8f0 0 50%) 0 0/14px 14px}
.rb-item{position:relative}
.rb-item>.rb-c{float:right;margin:0 0 4px 10px}
.rb-item+.rb-item{margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0}
.rb p,.rb h1,.rb h2,.rb h3,.rb h4,.rb h5,.rb h6,.rb ul,.rb ol{margin:0 0 .5em}
.rb h1{font-size:22px}.rb h2{font-size:19px}.rb h3{font-size:17px}.rb h4,.rb h5,.rb h6{font-size:16px}
.rb>:last-child,.rb-item>:last-child,.rb-rico>:last-child{margin-bottom:0}
`

/**
 * Lo poco que la página hace por su cuenta: pintar el orden de los bloques y
 * los quitados según diga la propiedad de orden, y cambiarla al pulsar los
 * botones. No mueve ningún elemento de sitio —solo estilos—, porque el orden
 * del documento es el que numera los textos.
 */
const PAGE_SCRIPT = `
(function(){
  var orden = document.querySelector('[data-rb-orden]');
  var bloques = Array.prototype.slice.call(document.querySelectorAll('section.rb'));
  if (!orden) return;
  function leer(){ return orden.value.split(',').filter(function(v){ return v !== ''; }).map(Number); }
  function pintar(){
    var lista = leer();
    bloques.forEach(function(el, i){
      var k = lista.indexOf(i);
      el.style.order = k < 0 ? 9999 : k;
      el.classList.toggle('rb-fuera', k < 0);
    });
  }
  function fondos(){
    Array.prototype.slice.call(document.querySelectorAll('[data-rb-fondo]')).forEach(function(c){
      var s = c.closest('section.rb'); if (s) s.style.setProperty('--fondo', c.value);
    });
  }
  document.addEventListener('click', function(event){
    var boton = event.target && event.target.closest ? event.target.closest('[data-rb-do]') : null;
    if (!boton) return;
    event.preventDefault();
    var i = bloques.indexOf(boton.closest('section.rb')), lista = leer(), k = lista.indexOf(i);
    var que = boton.getAttribute('data-rb-do');
    if (que === 'quitar') {
      if (k >= 0) { if (lista.length < 2) return; lista.splice(k, 1); }
      else {
        var donde = lista.length;
        for (var j = 0; j < lista.length; j++) { if (lista[j] > i) { donde = j; break; } }
        lista.splice(donde, 0, i);
      }
    } else if (k >= 0) {
      var n = k + (que === 'subir' ? -1 : 1);
      if (n < 0 || n >= lista.length) return;
      lista[k] = lista[n]; lista[n] = i;
    } else return;
    orden.value = lista.join(',');
    pintar();
    orden.dispatchEvent(new Event('change', { bubbles: true }));
  });
  document.addEventListener('input', function(event){
    if (event.target && event.target.hasAttribute && event.target.hasAttribute('data-rb-fondo')) fondos();
  });
  pintar(); fondos();
})();
`

function lessonOf(course: any, lessonId: string): any {
  return (course?.lessons || []).find((row: any) => String(row?.id || '') === lessonId) || null
}

/**
 * La página de trabajo de una lección nativa, o null si la lección no existe.
 * Se pinta desde los datos originales; los retoques de imagen y de propiedad
 * solo cambian lo que cada control enseña.
 */
export function nativeLessonPage(course: any, lessonId: string, patches: LbPatch[] = []): string | null {
  const lesson = lessonOf(course, lessonId)
  if (!lesson) return null
  const { html, images, props } = walk(course, lesson)
  const newImage = new Map<number, string>()
  const newProp = new Map<number, string>()
  for (const patch of patches) {
    if (patch.op === 'image') newImage.set(patch.at, patch.url)
    if (patch.op === 'prop' && props[patch.at]?.accept(patch.value)) newProp.set(patch.at, patch.value)
  }
  // Las rutas relativas salen del marco en que Rise pinta sus bloques HTML
  // (scormcontent/lib/sandbox/), que es la base con la que se sirve la lección.
  const body = html
    .replace(/@@I(\d+)@@/g, (_m, n) => attr(newImage.get(Number(n)) || `../../assets/${encodeURIComponent(images[Number(n)].read())}`))
    .replace(/@@P(\d+)@@/g, (_m, n) => attr(newProp.get(Number(n)) ?? props[Number(n)].read()))
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<style>${PAGE_CSS}</style>
<script>window.__lbRiseNativo = true;</script>
</head><body><main>${body}</main><script>${PAGE_SCRIPT}</script></body></html>`
}

/** Lo que el recorrido anota de una lección, en su orden; para comprobar las cuentas. */
export function nativeLessonIndex(course: any, lessonId: string): { texts: string[]; images: string[]; props: string[] } {
  const lesson = lessonOf(course, lessonId)
  if (!lesson) return { texts: [], images: [], props: [] }
  const found = walk(course, lesson)
  return {
    texts: found.leaves.map((leaf) => leaf.read()),
    images: found.images.map((leaf) => leaf.read()),
    props: found.props.map((leaf) => leaf.read()),
  }
}

/**
 * Escribe los retoques en los datos del curso. `course` se modifica: quien
 * llama pasa una copia. Devuelve cuántos se aplicaron.
 */
export function applyNativeEdits(course: any, lessonId: string, patches: LbPatch[]): number {
  const lesson = lessonOf(course, lessonId)
  if (!lesson) return 0
  // Las posiciones son las de la lección sin retocar: se anota todo antes de escribir.
  const { leaves, images, props } = walk(course, lesson)
  let applied = 0
  let order: string | null = null
  for (const patch of patches) {
    if (patch.op === 'text' && leaves[patch.at]) { leaves[patch.at].write(patch.value); applied += 1 }
    if (patch.op === 'image' && images[patch.at] && /^https:\/\//i.test(patch.url)) {
      images[patch.at].write(replacedAssetName(patch.url))
      applied += 1
    }
    if (patch.op === 'prop' && props[patch.at]?.accept(patch.value)) {
      // El orden cambia la lista de bloques: va el último, con todo lo demás ya escrito.
      if (patch.at === 0) order = patch.value
      else { props[patch.at].write(patch.value); applied += 1 }
    }
  }
  if (order !== null) { props[0].write(order); applied += 1 }
  return applied
}

/** Los archivos de imagen nuevos que nombran los retoques de una lección: ruta en el paquete y de dónde sale. */
export function nativeReplacedAssets(patches: LbPatch[]): Array<{ path: string; url: string }> {
  const found: Array<{ path: string; url: string }> = []
  for (const patch of patches) {
    if (patch.op !== 'image' || !/^https:\/\//i.test(patch.url)) continue
    found.push({ path: `scormcontent/assets/${replacedAssetName(patch.url)}`, url: patch.url })
  }
  return found
}
