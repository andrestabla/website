/**
 * Learning Builder · Word y PowerPoint → HTML que se puede leer y comentar.
 *
 * El texto plano y el guion de un recurso llegan como .docx o .pptx. Para
 * publicarlos y comentarlos sobre el elemento exacto —este párrafo, esta
 * celda, esta caja de la pantalla 12— hace falta tenerlos como una página, y
 * no como un archivo que cada quien abre en su programa.
 *
 * No se busca calcar Word ni PowerPoint, sino conservar lo que en un guion
 * significa algo: los títulos, las tablas con su sombreado (la clave en
 * verde de un cuestionario es un sombreado), el color y el resaltado del
 * texto, las imágenes; y en un .pptx, cada caja en su sitio dentro de la
 * pantalla, con sus notas de producción debajo. El original se guarda aparte
 * y siempre se puede descargar.
 *
 * Los guiones de Algoritmo T se generan con python-docx y python-pptx, que
 * aplican formato directo; por eso el formato directo es lo que mejor se lee
 * aquí. Los estilos y las plantillas se siguen hasta donde hace falta para
 * que un documento hecho a mano también salga bien.
 */
// Se importa el analizador por su archivo y no por la raíz del paquete: los
// tipos de la raíz traen `/// <reference lib="dom" />`, que mete la librería
// DOM en la compilación del API y cambia el tipo de `fetch` para todo lo demás.
import xmldom from '@xmldom/xmldom/lib/dom-parser.js'

const { DOMParser } = xmldom as { DOMParser: new (options?: unknown) => { parseFromString(xml: string, type: string): any } }
import { unzip } from './lb-unzip.js'

export type OfficeImage = { name: string; bytes: Buffer; contentType: string }

export type OfficeRender = {
  /** Fragmento HTML: la página se arma al servirlo (lb-stages.ts). */
  html: string
  /** Diapositivas del .pptx; apartados (títulos) del .docx. */
  units: number
  images: number
  warnings: string[]
}

type El = any

// ── XML ──────────────────────────────────────────────────────────────────────

function parseXml(xml: string): El {
  const quiet = { warning() {}, error() {}, fatalError() {} }
  return new DOMParser({ errorHandler: quiet } as any).parseFromString(xml, 'text/xml')
}

/** Hijos directos que son elementos, opcionalmente de un nombre local. */
function kids(node: El, name?: string): El[] {
  const out: El[] = []
  if (!node?.childNodes) return out
  for (let i = 0; i < node.childNodes.length; i += 1) {
    const child = node.childNodes[i]
    if (child.nodeType === 1 && (!name || child.localName === name)) out.push(child)
  }
  return out
}

function kid(node: El, name: string): El | null {
  if (!node?.childNodes) return null
  for (let i = 0; i < node.childNodes.length; i += 1) {
    const child = node.childNodes[i]
    if (child.nodeType === 1 && child.localName === name) return child
  }
  return null
}

/** Camino de hijos: path(sp, 'spPr', 'xfrm'). */
function path(node: El, ...names: string[]): El | null {
  let at: El | null = node
  for (const name of names) {
    if (!at) return null
    at = kid(at, name)
  }
  return at
}

/** Primer descendiente con ese nombre local. */
function find(node: El, name: string): El | null {
  for (const child of kids(node)) {
    if (child.localName === name) return child
    const deep = find(child, name)
    if (deep) return deep
  }
  return null
}

function findAll(node: El, name: string, out: El[] = []): El[] {
  for (const child of kids(node)) {
    if (child.localName === name) out.push(child)
    findAll(child, name, out)
  }
  return out
}

/** Atributo por nombre local, sin importar el prefijo (w:val, r:embed…). */
function at(el: El | null, name: string): string {
  if (!el?.attributes) return ''
  for (let i = 0; i < el.attributes.length; i += 1) {
    const attribute = el.attributes[i]
    if ((attribute.localName || attribute.name) === name) return attribute.value
  }
  return ''
}

/** El id de una relación (r:id), que no es el atributo «id» a secas del mismo elemento. */
function rid(el: El | null): string {
  if (!el?.attributes) return ''
  for (let i = 0; i < el.attributes.length; i += 1) {
    const attribute = el.attributes[i]
    if ((attribute.localName || attribute.name) !== 'id') continue
    if (/relationships/i.test(attribute.namespaceURI || '') || /^r:/.test(attribute.name)) return attribute.value
  }
  return ''
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function hex(value: string): string {
  return /^[0-9a-fA-F]{6}$/.test(value) ? `#${value.toLowerCase()}` : ''
}

function round(value: number, digits = 3): string {
  return String(Number(value.toFixed(digits)))
}

function safeHref(value: string): string {
  return /^(https?:|mailto:)/i.test(value) ? value : ''
}

// ── Paquete ──────────────────────────────────────────────────────────────────

const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  svg: 'image/svg+xml', bmp: 'image/bmp',
}

class Pack {
  private files = new Map<string, Buffer>()
  private xml = new Map<string, El | null>()
  private rels = new Map<string, Map<string, { target: string; type: string; external: boolean }>>()
  /** Imágenes usadas, en orden: su marca en el HTML es @@LBIMG:n@@. */
  readonly used: string[] = []
  readonly warnings = new Set<string>()

  constructor(data: Buffer) {
    for (const entry of unzip(data, { maxEntries: 6000 })) this.files.set(entry.path, entry.bytes)
  }

  has(file: string): boolean { return this.files.has(file) }
  bytes(file: string): Buffer | undefined { return this.files.get(file) }

  doc(file: string): El | null {
    if (!this.xml.has(file)) {
      const raw = this.files.get(file)
      this.xml.set(file, raw ? parseXml(raw.toString('utf8')) : null)
    }
    return this.xml.get(file) || null
  }

  /** Relaciones de una parte: word/document.xml → word/_rels/document.xml.rels. */
  relsOf(part: string) {
    if (!this.rels.has(part)) {
      const dir = part.includes('/') ? part.slice(0, part.lastIndexOf('/')) : ''
      const name = part.slice(part.lastIndexOf('/') + 1)
      const doc = this.doc(`${dir ? `${dir}/` : ''}_rels/${name}.rels`)
      const map = new Map<string, { target: string; type: string; external: boolean }>()
      for (const rel of doc ? findAll(doc, 'Relationship') : []) {
        const external = at(rel, 'TargetMode') === 'External'
        const raw = at(rel, 'Target')
        map.set(at(rel, 'Id'), {
          target: external ? raw : resolvePath(dir, raw),
          type: at(rel, 'Type').split('/').pop() || '',
          external,
        })
      }
      this.rels.set(part, map)
    }
    return this.rels.get(part)!
  }

  /** La marca de una imagen del paquete, o '' si el navegador no puede pintarla. */
  image(file: string): string {
    const ext = (/\.([a-z0-9]+)$/i.exec(file)?.[1] || '').toLowerCase()
    if (!IMAGE_TYPES[ext] || !this.files.has(file)) {
      if (this.files.has(file)) this.warnings.add(`Hay imágenes en formato ${ext.toUpperCase() || 'desconocido'}, que el navegador no muestra.`)
      return ''
    }
    let index = this.used.indexOf(file)
    if (index === -1) { this.used.push(file); index = this.used.length - 1 }
    return `@@LBIMG:${index}@@`
  }
}

function resolvePath(dir: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1)
  const parts = dir ? dir.split('/') : []
  for (const piece of target.split('/')) {
    if (piece === '..') parts.pop()
    else if (piece !== '.' && piece) parts.push(piece)
  }
  return parts.join('/')
}

/** Sube las imágenes usadas y cambia cada marca por su URL. */
async function settleImages(pack: Pack, html: string, putImage: (image: OfficeImage) => Promise<string>): Promise<{ html: string; images: number }> {
  const urls: string[] = []
  for (const [index, file] of pack.used.entries()) {
    const ext = (/\.([a-z0-9]+)$/i.exec(file)?.[1] || 'png').toLowerCase()
    try {
      urls[index] = await putImage({ name: `${index + 1}.${ext}`, bytes: pack.bytes(file)!, contentType: IMAGE_TYPES[ext] })
    } catch (error: any) {
      urls[index] = ''
      pack.warnings.add(`Una imagen no se pudo guardar: ${error?.message || error}`)
    }
  }
  return {
    html: html.replace(/@@LBIMG:(\d+)@@/g, (_m, n) => esc(urls[Number(n)] || '')),
    images: urls.filter(Boolean).length,
  }
}

export async function officeToHtml(options: {
  data: Buffer
  format: 'docx' | 'pptx'
  putImage: (image: OfficeImage) => Promise<string>
}): Promise<OfficeRender> {
  const pack = new Pack(options.data)
  const rendered = options.format === 'pptx' ? renderPptx(pack) : renderDocx(pack)
  const settled = await settleImages(pack, rendered.html, options.putImage)
  return { html: settled.html, units: rendered.units, images: settled.images, warnings: [...pack.warnings] }
}

// ═════════════════════════════════════════════════════════════════════════════
// WORD
// ═════════════════════════════════════════════════════════════════════════════

type RunFmt = {
  b?: boolean; i?: boolean; u?: boolean; strike?: boolean; caps?: boolean
  color?: string; bg?: string; size?: number; vert?: 'sup' | 'sub'
}
type ParaFmt = {
  align?: string; heading?: number; left?: number; hanging?: number; firstLine?: number
  bg?: string; rule?: boolean; numId?: string; ilvl?: number; before?: number; after?: number
  pageBreak?: boolean
}
type WordStyle = { name: string; basedOn: string; run: RunFmt; para: ParaFmt }

const HIGHLIGHT: Record<string, string> = {
  yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff', blue: '#0000ff', red: '#ff0000',
  darkBlue: '#000080', darkCyan: '#008080', darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000',
  darkYellow: '#808000', darkGray: '#808080', lightGray: '#c0c0c0', black: '#000000',
}

/** <w:b/> es verdadero; <w:b w:val="0"/> lo apaga. undefined si no está. */
function toggle(parent: El | null, name: string): boolean | undefined {
  const el = parent ? kid(parent, name) : null
  if (!el) return undefined
  const value = at(el, 'val')
  return !(value === '0' || value === 'false' || value === 'none')
}

function readRun(rPr: El | null): RunFmt {
  const fmt: RunFmt = {}
  if (!rPr) return fmt
  const set = <K extends keyof RunFmt>(key: K, value: RunFmt[K] | undefined) => { if (value !== undefined) fmt[key] = value }
  set('b', toggle(rPr, 'b'))
  set('i', toggle(rPr, 'i'))
  set('strike', toggle(rPr, 'strike'))
  set('caps', toggle(rPr, 'caps'))
  const u = kid(rPr, 'u')
  if (u) fmt.u = at(u, 'val') !== 'none'
  const color = hex(at(kid(rPr, 'color'), 'val'))
  if (color) fmt.color = color
  const highlight = HIGHLIGHT[at(kid(rPr, 'highlight'), 'val')]
  const shade = hex(at(kid(rPr, 'shd'), 'fill'))
  if (highlight || shade) fmt.bg = highlight || shade
  const size = Number(at(kid(rPr, 'sz'), 'val'))
  if (size > 0) fmt.size = size / 2
  const vert = at(kid(rPr, 'vertAlign'), 'val')
  if (vert === 'superscript') fmt.vert = 'sup'
  if (vert === 'subscript') fmt.vert = 'sub'
  return fmt
}

function readPara(pPr: El | null): ParaFmt {
  const fmt: ParaFmt = {}
  if (!pPr) return fmt
  const jc = at(kid(pPr, 'jc'), 'val')
  if (jc) fmt.align = jc === 'both' || jc === 'distribute' ? 'justify' : jc === 'center' ? 'center' : jc === 'right' || jc === 'end' ? 'right' : 'left'
  const outline = kid(pPr, 'outlineLvl')
  if (outline && Number(at(outline, 'val')) < 6) fmt.heading = Number(at(outline, 'val')) + 1
  const ind = kid(pPr, 'ind')
  if (ind) {
    const left = Number(at(ind, 'left') || at(ind, 'start'))
    if (left) fmt.left = left / 20
    const hanging = Number(at(ind, 'hanging'))
    if (hanging) fmt.hanging = hanging / 20
    const first = Number(at(ind, 'firstLine'))
    if (first) fmt.firstLine = first / 20
  }
  const shade = hex(at(kid(pPr, 'shd'), 'fill'))
  if (shade) fmt.bg = shade
  const bottom = path(pPr, 'pBdr', 'bottom')
  if (bottom && !/^(nil|none)$/.test(at(bottom, 'val'))) fmt.rule = true
  const numPr = kid(pPr, 'numPr')
  if (numPr) {
    fmt.numId = at(kid(numPr, 'numId'), 'val')
    fmt.ilvl = Number(at(kid(numPr, 'ilvl'), 'val')) || 0
  }
  const spacing = kid(pPr, 'spacing')
  if (spacing) {
    if (at(spacing, 'before')) fmt.before = Number(at(spacing, 'before')) / 20
    if (at(spacing, 'after')) fmt.after = Number(at(spacing, 'after')) / 20
  }
  if (toggle(pPr, 'pageBreakBefore')) fmt.pageBreak = true
  return fmt
}

function runCss(fmt: RunFmt, base?: RunFmt): string {
  const css: string[] = []
  if (fmt.b !== undefined && fmt.b !== base?.b) css.push(`font-weight:${fmt.b ? 700 : 400}`)
  if (fmt.i !== undefined && fmt.i !== base?.i) css.push(`font-style:${fmt.i ? 'italic' : 'normal'}`)
  const deco = [fmt.u ? 'underline' : '', fmt.strike ? 'line-through' : ''].filter(Boolean).join(' ')
  if (deco) css.push(`text-decoration:${deco}`)
  if (fmt.caps) css.push('text-transform:uppercase')
  if (fmt.color && fmt.color !== base?.color) css.push(`color:${fmt.color}`)
  if (fmt.bg) css.push(`background:${fmt.bg}`)
  if (fmt.size && fmt.size !== base?.size) css.push(`font-size:${round(fmt.size, 1)}pt`)
  if (fmt.vert) css.push(`vertical-align:${fmt.vert === 'sup' ? 'super' : 'sub'};font-size:.75em`)
  return css.join(';')
}

function toRoman(value: number): string {
  const table: Array<[number, string]> = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]
  let out = ''
  let rest = Math.max(1, Math.min(3999, value))
  for (const [n, s] of table) while (rest >= n) { out += s; rest -= n }
  return out
}

function toLetters(value: number): string {
  let out = ''
  let rest = Math.max(1, value)
  while (rest > 0) { rest -= 1; out = String.fromCharCode(97 + (rest % 26)) + out; rest = Math.floor(rest / 26) }
  return out
}

function numberAs(format: string, value: number): string {
  switch (format) {
    case 'lowerLetter': return toLetters(value)
    case 'upperLetter': return toLetters(value).toUpperCase()
    case 'lowerRoman': return toRoman(value)
    case 'upperRoman': return toRoman(value).toUpperCase()
    case 'decimalZero': return String(value).padStart(2, '0')
    default: return String(value)
  }
}

function renderDocx(pack: Pack): { html: string; units: number } {
  const PART = 'word/document.xml'
  const document = pack.doc(PART)
  const body = document ? find(document, 'body') : null
  if (!body) throw new Error('El archivo no parece un documento de Word: le falta word/document.xml.')
  const rels = pack.relsOf(PART)

  // ── Estilos ──
  const styles = new Map<string, WordStyle>()
  const stylesDoc = pack.doc('word/styles.xml')
  let defaultPara = ''
  let docRun: RunFmt = {}
  if (stylesDoc) {
    docRun = readRun(path(find(stylesDoc, 'docDefaults'), 'rPrDefault', 'rPr'))
    for (const style of findAll(stylesDoc, 'style')) {
      const id = at(style, 'styleId')
      if (!id) continue
      styles.set(id, {
        name: at(kid(style, 'name'), 'val'),
        basedOn: at(kid(style, 'basedOn'), 'val'),
        run: readRun(kid(style, 'rPr')),
        para: readPara(kid(style, 'pPr')),
      })
      if (at(style, 'type') === 'paragraph' && at(style, 'default') === '1') defaultPara = id
    }
  }
  const resolved = new Map<string, { run: RunFmt; para: ParaFmt; name: string }>()
  const styleOf = (id: string): { run: RunFmt; para: ParaFmt; name: string } => {
    if (!id || !styles.has(id)) return { run: {}, para: {}, name: '' }
    if (resolved.has(id)) return resolved.get(id)!
    const chain: WordStyle[] = []
    let cursor = id
    for (let depth = 0; cursor && styles.has(cursor) && depth < 12; depth += 1) {
      const style = styles.get(cursor)!
      chain.unshift(style)
      cursor = style.basedOn
    }
    const out = { run: {} as RunFmt, para: {} as ParaFmt, name: styles.get(id)!.name }
    for (const style of chain) { Object.assign(out.run, style.run); Object.assign(out.para, style.para) }
    // El nivel de un título lo dice su nombre, en cualquiera de los dos idiomas.
    for (const style of chain) {
      const match = /^(?:heading|t[ií]tulo|encabezado)\s*(\d)$/i.exec(style.name)
      if (match) out.para.heading = Math.min(6, Number(match[1]))
      else if (/^(title|t[ií]tulo|puesto)$/i.test(style.name)) out.para.heading = 1
    }
    resolved.set(id, out)
    return out
  }

  // ── Numeración ──
  type Level = { start: number; format: string; text: string; left?: number; hanging?: number }
  const abstracts = new Map<string, Map<number, Level>>()
  const nums = new Map<string, string>()
  const numbering = pack.doc('word/numbering.xml')
  if (numbering) {
    for (const abstract of findAll(numbering, 'abstractNum')) {
      const levels = new Map<number, Level>()
      for (const lvl of kids(abstract, 'lvl')) {
        const ind = path(lvl, 'pPr', 'ind')
        levels.set(Number(at(lvl, 'ilvl')) || 0, {
          start: Number(at(kid(lvl, 'start'), 'val')) || 1,
          format: at(kid(lvl, 'numFmt'), 'val') || 'decimal',
          text: at(kid(lvl, 'lvlText'), 'val'),
          left: ind && at(ind, 'left') ? Number(at(ind, 'left')) / 20 : undefined,
          hanging: ind && at(ind, 'hanging') ? Number(at(ind, 'hanging')) / 20 : undefined,
        })
      }
      abstracts.set(at(abstract, 'abstractNumId'), levels)
    }
    for (const num of findAll(numbering, 'num')) nums.set(at(num, 'numId'), at(kid(num, 'abstractNumId'), 'val'))
  }
  const counters = new Map<string, number[]>()
  const marker = (numId: string, ilvl: number): { text: string; level?: Level } | null => {
    if (!numId || numId === '0') return null
    const levels = abstracts.get(nums.get(numId) || '')
    const level = levels?.get(ilvl)
    if (!levels || !level) return { text: '•' }
    const state = counters.get(numId) || []
    state[ilvl] = (state[ilvl] ?? level.start - 1) + 1
    state.length = ilvl + 1
    counters.set(numId, state)
    if (level.format === 'bullet') {
      const char = level.text || '•'
      // Las viñetas de Symbol y Wingdings son códigos privados: fuera de su fuente no se ven.
      const code = char.codePointAt(0) || 0
      return { text: code >= 0xe000 || char === 'o' || char === '§' ? (ilvl % 2 ? '◦' : '•') : char, level }
    }
    if (level.format === 'none') return { text: '', level }
    const text = (level.text || '%1.').replace(/%(\d)/g, (_m, n) => {
      const at_ = Number(n) - 1
      const lvl = levels.get(at_)
      return numberAs(lvl?.format || 'decimal', state[at_] ?? lvl?.start ?? 1)
    })
    return { text, level }
  }

  let headings = 0
  /** Cajas de texto flotantes de un párrafo: se pintan después de él. */
  let floating: string[] = []

  const drawing = (node: El): string => {
    const blip = find(node, 'blip')
    const embed = blip ? at(blip, 'embed') || at(blip, 'link') : ''
    const boxes = findAll(node, 'txbxContent')
    if (!embed) {
      for (const box of boxes) floating.push(`<div class="lb-caja">${blocks(box)}</div>`)
      if (!boxes.length && find(node, 'chart')) pack.warnings.add('Hay gráficos incrustados que no se convierten: se ven en el original.')
      return ''
    }
    const rel = rels.get(embed)
    const mark = rel && !rel.external ? pack.image(rel.target) : ''
    if (!mark) return '<span class="lb-noimg">Imagen no visible en el navegador</span>'
    const extent = find(node, 'extent')
    const width = extent ? Math.round(Number(at(extent, 'cx')) / 9525) : 0
    const height = extent ? Math.round(Number(at(extent, 'cy')) / 9525) : 0
    const alt = at(find(node, 'docPr'), 'descr')
    return `<img src="${mark}" alt="${esc(alt)}" loading="lazy"${width && height ? ` width="${width}" height="${height}"` : ''}>`
  }

  const runContent = (run: El): string => {
    let out = ''
    for (const child of kids(run)) {
      switch (child.localName) {
        case 't': out += esc(child.textContent || ''); break
        case 'tab': out += '<span class="lb-tab"></span>'; break
        case 'br': out += at(child, 'type') === 'page' ? '' : '<br>'; break
        case 'cr': out += '<br>'; break
        case 'noBreakHyphen': out += '‑'; break
        case 'softHyphen': break
        case 'sym': out += '•'; break
        case 'drawing': out += drawing(child); break
        case 'pict': case 'object': {
          const data = find(child, 'imagedata')
          const rel = data ? rels.get(rid(data)) : null
          const mark = rel && !rel.external ? pack.image(rel.target) : ''
          if (mark) out += `<img src="${mark}" alt="${esc(at(data, 'title'))}" loading="lazy">`
          for (const box of findAll(child, 'txbxContent')) floating.push(`<div class="lb-caja">${blocks(box)}</div>`)
          break
        }
        case 'AlternateContent': {
          const choice = kid(child, 'Choice') || kid(child, 'Fallback')
          if (choice) out += runContent(choice)
          break
        }
        default: break
      }
    }
    return out
  }

  const inline = (node: El, base: RunFmt, link = ''): string => {
    let out = ''
    for (const child of kids(node)) {
      switch (child.localName) {
        case 'r': {
          const rPr = kid(child, 'rPr')
          const fmt: RunFmt = { ...base, ...styleOf(at(rPr ? kid(rPr, 'rStyle') : null, 'val')).run, ...readRun(rPr) }
          const content = runContent(child)
          if (!content) break
          const css = runCss(fmt, {})
          out += css ? `<span style="${css}">${content}</span>` : content
          break
        }
        case 'hyperlink': {
          const rel = rels.get(rid(child))
          const href = rel?.external ? safeHref(rel.target) : ''
          const content = inline(child, base, href)
          out += href && !link ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${content}</a>` : content
          break
        }
        case 'ins': case 'smartTag': case 'fldSimple': case 'moveTo':
          out += inline(child, base, link)
          break
        case 'sdt': {
          const content = kid(child, 'sdtContent')
          if (content) out += inline(content, base, link)
          break
        }
        case 'oMath': case 'oMathPara':
          out += `<span class="lb-math">${esc(findAll(child, 't').map((t) => t.textContent || '').join(''))}</span>`
          break
        default: break
      }
    }
    return out
  }

  let lastEmpty = false
  const paragraph = (p: El): string => {
    const pPr = kid(p, 'pPr')
    const styleId = at(pPr ? kid(pPr, 'pStyle') : null, 'val') || defaultPara
    const style = styleOf(styleId)
    const fmt: ParaFmt = { ...style.para, ...readPara(pPr) }
    // El formato de carácter del párrafo: valores del documento y de su estilo.
    const base: RunFmt = { ...docRun, ...style.run }
    floating = []
    const content = inline(p, base)
    const after = floating.join('')
    floating = []

    const hasText = content.replace(/<span class="lb-tab"><\/span>|<br>/g, '').trim() !== ''
    if (!hasText) {
      if (lastEmpty || after) return after
      lastEmpty = true
      return '<p class="lb-vacio"></p>'
    }
    lastEmpty = false

    const css: string[] = []
    if (fmt.align && fmt.align !== 'left') css.push(`text-align:${fmt.align}`)
    if (fmt.bg) css.push(`background:${fmt.bg};padding:.25em .5em`)
    if (fmt.rule) css.push('border-bottom:1px solid #94a3b8;padding-bottom:.2em')

    let lead = ''
    const mark = fmt.heading ? null : marker(fmt.numId || '', fmt.ilvl || 0)
    if (mark) {
      const left = fmt.left ?? mark.level?.left ?? 36 * ((fmt.ilvl || 0) + 1)
      const hanging = Math.max(14, fmt.hanging ?? mark.level?.hanging ?? 18)
      css.push(`padding-left:${round(left, 1)}pt;text-indent:-${round(hanging, 1)}pt`)
      lead = `<span class="lb-mk" style="width:${round(hanging, 1)}pt">${esc(mark.text)}</span>`
    } else {
      if (fmt.left) css.push(`margin-left:${round(Math.min(fmt.left, 216), 1)}pt`)
      if (fmt.firstLine) css.push(`text-indent:${round(Math.min(fmt.firstLine, 72), 1)}pt`)
      else if (fmt.hanging && fmt.left) css.push(`text-indent:-${round(Math.min(fmt.hanging, fmt.left), 1)}pt`)
    }

    const tag = fmt.heading ? `h${fmt.heading}` : 'p'
    if (fmt.heading) headings += 1
    const cls = mark ? ' class="lb-li"' : /^toc\s?\d/i.test(style.name) ? ' class="lb-toc"' : ''
    const breakBefore = fmt.pageBreak ? '<hr class="lb-salto">' : ''
    return `${breakBefore}<${tag}${cls}${css.length ? ` style="${css.join(';')}"` : ''}>${lead}${content}</${tag}>${after}`
  }

  const table = (tbl: El): string => {
    const grid = kids(kid(tbl, 'tblGrid') || tbl, 'gridCol').map((col) => Number(at(col, 'w')) || 0)
    const total = grid.reduce((sum, w) => sum + w, 0)
    const borders = path(tbl, 'tblPr', 'tblBorders')
    const off = (side: string) => { const el = borders ? kid(borders, side) : null; return !!el && /^(nil|none)$/.test(at(el, 'val')) }
    const bare = !!borders && off('top') && off('insideH') && off('insideV')

    type Cell = { el: El; col: number; span: number; merge: '' | 'restart' | 'continue' }
    const rows: Array<{ header: boolean; cells: Cell[] }> = kids(tbl, 'tr').map((tr) => {
      let col = Number(at(path(tr, 'trPr', 'gridBefore'), 'val')) || 0
      const cells: Cell[] = []
      for (const tc of kids(tr, 'tc')) {
        const tcPr = kid(tc, 'tcPr')
        const span = Number(at(tcPr ? kid(tcPr, 'gridSpan') : null, 'val')) || 1
        const vMerge = tcPr ? kid(tcPr, 'vMerge') : null
        cells.push({ el: tc, col, span, merge: vMerge ? (at(vMerge, 'val') === 'restart' ? 'restart' : 'continue') : '' })
        col += span
      }
      return { header: !!path(tr, 'trPr', 'tblHeader'), cells }
    })

    let html = `<table class="lb-tabla${bare ? ' lb-sin-borde' : ''}">`
    if (total > 0 && grid.length > 1) {
      html += `<colgroup>${grid.map((w) => `<col style="width:${round((w / total) * 100, 2)}%">`).join('')}</colgroup>`
    }
    rows.forEach((row, index) => {
      html += `<tr${row.header ? ' class="lb-cab"' : ''}>`
      for (const cell of row.cells) {
        if (cell.merge === 'continue') continue
        let rowspan = 1
        if (cell.merge === 'restart') {
          for (let next = index + 1; next < rows.length; next += 1) {
            if (rows[next].cells.some((other) => other.col === cell.col && other.merge === 'continue')) rowspan += 1
            else break
          }
        }
        const tcPr = kid(cell.el, 'tcPr')
        const css: string[] = []
        const fill = hex(at(tcPr ? kid(tcPr, 'shd') : null, 'fill'))
        if (fill) css.push(`background:${fill}`)
        const vAlign = at(tcPr ? kid(tcPr, 'vAlign') : null, 'val')
        if (vAlign === 'center') css.push('vertical-align:middle')
        if (vAlign === 'bottom') css.push('vertical-align:bottom')
        const keepEmpty = lastEmpty
        lastEmpty = true // una celda no empieza con un renglón en blanco
        const inner = blocks(cell.el)
        lastEmpty = keepEmpty
        html += `<td${cell.span > 1 ? ` colspan="${cell.span}"` : ''}${rowspan > 1 ? ` rowspan="${rowspan}"` : ''}${css.length ? ` style="${css.join(';')}"` : ''}>${inner}</td>`
      }
      html += '</tr>'
    })
    lastEmpty = false
    return `${html}</table>`
  }

  function blocks(container: El): string {
    let out = ''
    for (const child of kids(container)) {
      if (child.localName === 'p') out += paragraph(child)
      else if (child.localName === 'tbl') out += table(child)
      else if (child.localName === 'sdt') { const content = kid(child, 'sdtContent'); if (content) out += blocks(content) }
      else if (child.localName === 'ins' || child.localName === 'customXml') out += blocks(child)
    }
    return out
  }

  const html = blocks(body).replace(/(<p class="lb-vacio"><\/p>)+$/, '')
  return { html: `<div class="lb-doc lb-docx">${html}</div>`, units: headings }
}

// ═════════════════════════════════════════════════════════════════════════════
// POWERPOINT
// ═════════════════════════════════════════════════════════════════════════════

type Box = { x: number; y: number; w: number; h: number }
/** De las coordenadas de un grupo a las de la diapositiva: X = ox + x·sx. */
type Tf = { ox: number; oy: number; sx: number; sy: number }
type TextDefaults = { size?: number; b?: boolean; i?: boolean; color?: string; align?: string; bullet?: string; font?: string }

const CLIP: Record<string, string> = {
  triangle: 'polygon(50% 0,0 100%,100% 100%)',
  rtTriangle: 'polygon(0 0,0 100%,100% 100%)',
  diamond: 'polygon(50% 0,100% 50%,50% 100%,0 50%)',
  parallelogram: 'polygon(20% 0,100% 0,80% 100%,0 100%)',
  trapezoid: 'polygon(20% 0,80% 0,100% 100%,0 100%)',
  hexagon: 'polygon(20% 0,80% 0,100% 50%,80% 100%,20% 100%,0 50%)',
  pentagon: 'polygon(50% 0,100% 38%,81% 100%,19% 100%,0 38%)',
  homePlate: 'polygon(0 0,80% 0,100% 50%,80% 100%,0 100%)',
  chevron: 'polygon(0 0,80% 0,100% 50%,80% 100%,0 100%,20% 50%)',
  rightArrow: 'polygon(0 25%,65% 25%,65% 0,100% 50%,65% 100%,65% 75%,0 75%)',
  leftArrow: 'polygon(100% 25%,35% 25%,35% 0,0 50%,35% 100%,35% 75%,100% 75%)',
  downArrow: 'polygon(25% 0,75% 0,75% 65%,100% 65%,50% 100%,0 65%,25% 65%)',
  upArrow: 'polygon(25% 100%,75% 100%,75% 35%,100% 35%,50% 0,0 35%,25% 35%)',
}

function renderPptx(pack: Pack): { html: string; units: number } {
  const PRES = 'ppt/presentation.xml'
  const presentation = pack.doc(PRES)
  if (!presentation) throw new Error('El archivo no parece una presentación de PowerPoint: le falta ppt/presentation.xml.')
  const size = find(presentation, 'sldSz')
  const W = Number(at(size, 'cx')) || 12192000
  const H = Number(at(size, 'cy')) || 6858000
  const widthPt = W / 12700

  /** Longitud en EMU → unidades del ancho del lienzo, para que todo escale con él. */
  const cq = (emu: number) => `${round((emu / W) * 100, 3)}cqw`
  const fontCq = (pt: number) => `${round((pt / widthPt) * 100, 3)}cqw`

  // ── Tema: colores y fuentes ──
  const themes = new Map<string, { colors: Record<string, string>; major: string; minor: string }>()
  const themeOf = (masterPart: string) => {
    if (themes.has(masterPart)) return themes.get(masterPart)!
    const out = { colors: {} as Record<string, string>, major: '', minor: '' }
    const rel = [...pack.relsOf(masterPart).values()].find((row) => row.type === 'theme')
    const doc = rel ? pack.doc(rel.target) : null
    const scheme = doc ? find(doc, 'clrScheme') : null
    for (const entry of scheme ? kids(scheme) : []) {
      const value = kid(entry, 'srgbClr') ? at(kid(entry, 'srgbClr'), 'val') : at(kid(entry, 'sysClr'), 'lastClr')
      if (hex(value)) out.colors[entry.localName] = hex(value)
    }
    const fonts = doc ? find(doc, 'fontScheme') : null
    out.major = at(path(fonts, 'majorFont', 'latin'), 'typeface')
    out.minor = at(path(fonts, 'minorFont', 'latin'), 'typeface')
    const map: Record<string, string> = { tx1: 'dk1', tx2: 'dk2', bg1: 'lt1', bg2: 'lt2' }
    const clrMap = find(pack.doc(masterPart), 'clrMap')
    for (const key of Object.keys(map)) {
      const target = (clrMap && at(clrMap, key)) || map[key]
      if (out.colors[target]) out.colors[key] = out.colors[target]
    }
    themes.set(masterPart, out)
    return out
  }

  type Ctx = { part: string; theme: ReturnType<typeof themeOf>; layout: El | null; master: El | null }

  /** El color de un nodo que contiene srgbClr, schemeClr…; '' si no lo hay. */
  const colorIn = (node: El | null, ctx: Ctx): string => {
    if (!node) return ''
    let base = ''
    let source: El | null = null
    for (const child of kids(node)) {
      if (child.localName === 'srgbClr') { base = hex(at(child, 'val')); source = child }
      else if (child.localName === 'schemeClr') { base = ctx.theme.colors[at(child, 'val')] || ''; source = child }
      else if (child.localName === 'sysClr') { base = hex(at(child, 'lastClr')); source = child }
      else if (child.localName === 'prstClr') { base = at(child, 'val') === 'white' ? '#ffffff' : at(child, 'val') === 'black' ? '#000000' : ''; source = child }
      if (base) break
    }
    if (!base || !source) return ''
    let [r, g, b] = [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16))
    let alpha = 1
    for (const mod of kids(source)) {
      const value = Number(at(mod, 'val')) / 100000
      if (mod.localName === 'alpha') alpha = value
      // Aproximación suficiente: aclarar hacia el blanco, oscurecer hacia el negro.
      if (mod.localName === 'lumMod') [r, g, b] = [r, g, b].map((c) => c * value)
      if (mod.localName === 'lumOff') [r, g, b] = [r, g, b].map((c) => c + 255 * value)
      if (mod.localName === 'tint') [r, g, b] = [r, g, b].map((c) => c + (255 - c) * (1 - value))
      if (mod.localName === 'shade') [r, g, b] = [r, g, b].map((c) => c * value)
    }
    const clamp = (c: number) => Math.max(0, Math.min(255, Math.round(c)))
    return alpha < 1
      ? `rgba(${clamp(r)},${clamp(g)},${clamp(b)},${round(alpha, 2)})`
      : `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('')}`
  }

  /** Relleno de un spPr / tcPr / bgPr: color, imagen o degradado. undefined = no dice nada. */
  const fillOf = (props: El | null, ctx: Ctx): string | undefined => {
    if (!props) return undefined
    if (kid(props, 'noFill')) return ''
    const solid = kid(props, 'solidFill')
    if (solid) return colorIn(solid, ctx) || ''
    const grad = kid(props, 'gradFill')
    if (grad) {
      const stops = findAll(grad, 'gs').map((gs) => colorIn(gs, ctx)).filter(Boolean)
      if (stops.length > 1) return `linear-gradient(135deg,${stops.join(',')})`
      return stops[0] || ''
    }
    const blip = kid(props, 'blipFill')
    if (blip) {
      const rel = pack.relsOf(ctx.part).get(at(find(blip, 'blip'), 'embed'))
      const mark = rel && !rel.external ? pack.image(rel.target) : ''
      return mark ? `url("${mark}") center/cover no-repeat` : ''
    }
    return undefined
  }

  const boxOf = (xfrm: El | null): Box | null => {
    const off = xfrm ? kid(xfrm, 'off') : null
    const ext = xfrm ? kid(xfrm, 'ext') : null
    if (!off || !ext) return null
    return { x: Number(at(off, 'x')) || 0, y: Number(at(off, 'y')) || 0, w: Number(at(ext, 'cx')) || 0, h: Number(at(ext, 'cy')) || 0 }
  }

  const place = (box: Box, tf: Tf): Box => ({ x: tf.ox + box.x * tf.sx, y: tf.oy + box.y * tf.sy, w: box.w * tf.sx, h: box.h * tf.sy })

  const boxCss = (box: Box, rot = 0): string =>
    `left:${round((box.x / W) * 100)}%;top:${round((box.y / H) * 100)}%;width:${round((box.w / W) * 100)}%;height:${round((box.h / H) * 100)}%` +
    (rot ? `;transform:rotate(${round(rot / 60000, 2)}deg)` : '')

  /** El marcador de posición equivalente en el diseño o en el patrón. */
  const placeholderIn = (root: El | null, ph: El): El | null => {
    if (!root) return null
    const type = at(ph, 'type')
    const idx = at(ph, 'idx')
    const all = findAll(find(root, 'spTree') || root, 'sp')
    const phOf = (sp: El) => path(sp, 'nvSpPr', 'nvPr', 'ph')
    const same = (a: string, b: string) => a === b || (/^(title|ctrTitle)$/.test(a) && /^(title|ctrTitle)$/.test(b)) || (/^(body|subTitle|)$/.test(a) && /^(body|subTitle|)$/.test(b))
    return (
      (idx && all.find((sp) => phOf(sp) && at(phOf(sp), 'idx') === idx)) ||
      all.find((sp) => phOf(sp) && same(at(phOf(sp), 'type'), type) && (type || !idx)) ||
      null
    )
  }

  /** Valores por omisión del texto de un nivel: de la forma, su diseño, su patrón. */
  const textDefaults = (sp: El, ph: El | null, level: number, ctx: Ctx): TextDefaults => {
    const out: TextDefaults = {}
    const read = (lstStyle: El | null) => {
      const pPr = lstStyle ? kid(lstStyle, `lvl${level + 1}pPr`) : null
      if (!pPr) return
      const def = kid(pPr, 'defRPr')
      if (at(pPr, 'algn')) out.align = at(pPr, 'algn')
      if (kid(pPr, 'buNone')) out.bullet = ''
      else if (kid(pPr, 'buChar')) out.bullet = at(kid(pPr, 'buChar'), 'char') || '•'
      if (!def) return
      if (at(def, 'sz')) out.size = Number(at(def, 'sz')) / 100
      if (at(def, 'b')) out.b = at(def, 'b') === '1'
      if (at(def, 'i')) out.i = at(def, 'i') === '1'
      const color = colorIn(kid(def, 'solidFill'), ctx)
      if (color) out.color = color
      const face = at(kid(def, 'latin'), 'typeface')
      if (face) out.font = face
    }
    const type = ph ? at(ph, 'type') : ''
    const styles = ctx.master ? find(ctx.master, 'txStyles') : null
    // De lo más general a lo más concreto: lo último que se lee es lo que manda.
    if (styles) read(kid(styles, !ph ? 'otherStyle' : /title/i.test(type) ? 'titleStyle' : 'bodyStyle'))
    if (ph) {
      read(path(placeholderIn(ctx.master, ph), 'txBody', 'lstStyle'))
      read(path(placeholderIn(ctx.layout, ph), 'txBody', 'lstStyle'))
    }
    read(path(sp, 'txBody', 'lstStyle'))
    return out
  }

  const fontFamily = (face: string, ctx: Ctx): string => {
    const name = face === '+mj-lt' ? ctx.theme.major : face === '+mn-lt' ? ctx.theme.minor : face
    return name && /^[\w .-]+$/.test(name) ? `'${name}',system-ui,sans-serif` : ''
  }

  const textBody = (txBody: El | null, sp: El | null, ph: El | null, ctx: Ctx, fallbackColor: string, cellSize?: number): string => {
    if (!txBody) return ''
    const bodyPr = kid(txBody, 'bodyPr')
    const fit = bodyPr ? kid(bodyPr, 'normAutofit') : null
    const scale = fit && at(fit, 'fontScale') ? Number(at(fit, 'fontScale')) / 100000 : 1
    let html = ''
    for (const p of kids(txBody, 'p')) {
      const pPr = kid(p, 'pPr')
      const level = Number(at(pPr, 'lvl')) || 0
      const def = sp ? textDefaults(sp, ph, level, ctx) : {}
      const endSize = Number(at(kid(p, 'endParaRPr'), 'sz')) / 100
      const css: string[] = []
      const align = at(pPr, 'algn') || def.align || ''
      if (align === 'ctr') css.push('text-align:center')
      else if (align === 'r') css.push('text-align:right')
      else if (align === 'just') css.push('text-align:justify')
      const marL = at(pPr, 'marL') ? Number(at(pPr, 'marL')) : level * 342900
      if (marL > 0) css.push(`margin-left:${cq(marL)}`)
      const before = Number(at(path(pPr, 'spcBef', 'spcPts'), 'val')) / 100
      if (before > 0) css.push(`margin-top:${fontCq(before)}`)
      const after = Number(at(path(pPr, 'spcAft', 'spcPts'), 'val')) / 100
      if (after > 0) css.push(`margin-bottom:${fontCq(after)}`)
      const spacing = Number(at(path(pPr, 'lnSpc', 'spcPct'), 'val')) / 100000
      if (spacing > 0) css.push(`line-height:${round(spacing * 1.2, 2)}`)

      let bullet = def.bullet || ''
      if (pPr && kid(pPr, 'buNone')) bullet = ''
      else if (pPr && kid(pPr, 'buChar')) bullet = at(kid(pPr, 'buChar'), 'char') || '•'
      else if (pPr && kid(pPr, 'buAutoNum')) bullet = '•'
      if (bullet && (bullet.codePointAt(0) || 0) >= 0xe000) bullet = '•'

      let content = ''
      let firstSize = 0
      for (const child of kids(p)) {
        if (child.localName === 'br') { content += '<br>'; continue }
        if (child.localName !== 'r' && child.localName !== 'fld') continue
        const rPr = kid(child, 'rPr')
        const text = esc(kid(child, 't')?.textContent || '')
        if (!text) continue
        const run: string[] = []
        const sizePt = ((rPr && at(rPr, 'sz') ? Number(at(rPr, 'sz')) / 100 : def.size || cellSize || 18)) * scale
        if (!firstSize) firstSize = sizePt
        run.push(`font-size:${fontCq(sizePt)}`)
        const bold = rPr && at(rPr, 'b') ? at(rPr, 'b') === '1' : def.b
        if (bold) run.push('font-weight:700')
        const italic = rPr && at(rPr, 'i') ? at(rPr, 'i') === '1' : def.i
        if (italic) run.push('font-style:italic')
        const deco = [rPr && at(rPr, 'u') && at(rPr, 'u') !== 'none' ? 'underline' : '', rPr && /Strike/.test(at(rPr, 'strike')) ? 'line-through' : ''].filter(Boolean).join(' ')
        if (deco) run.push(`text-decoration:${deco}`)
        if (rPr && /^(all|small)$/.test(at(rPr, 'cap'))) run.push('text-transform:uppercase')
        const color = colorIn(rPr ? kid(rPr, 'solidFill') : null, ctx) || def.color || fallbackColor
        if (color) run.push(`color:${color}`)
        const mark = colorIn(rPr ? kid(rPr, 'highlight') : null, ctx)
        if (mark) run.push(`background:${mark}`)
        const family = fontFamily(at(rPr ? kid(rPr, 'latin') : null, 'typeface') || def.font || '', ctx)
        if (family) run.push(`font-family:${family}`)
        const baseline = rPr ? Number(at(rPr, 'baseline')) : 0
        if (baseline) run.push(`vertical-align:${baseline > 0 ? 'super' : 'sub'}`)
        const link = rPr ? kid(rPr, 'hlinkClick') : null
        const rel = link ? pack.relsOf(ctx.part).get(rid(link)) : null
        const href = rel?.external ? safeHref(rel.target) : ''
        const span = `<span style="${run.join(';')}">${text}</span>`
        content += href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${span}</a>` : span
      }
      if (!content.replace(/<br>/g, '')) {
        // Un renglón en blanco ocupa lo que diga su tamaño: es separación deliberada.
        html += `<p style="font-size:${fontCq((endSize || def.size || cellSize || 18) * scale)}">&nbsp;</p>`
        continue
      }
      if (bullet) content = `<span style="font-size:${fontCq(firstSize || 18)};color:${def.color || fallbackColor || 'inherit'}">${esc(bullet)}&nbsp;</span>${content}`
      html += `<p${css.length ? ` style="${css.join(';')}"` : ''}>${content}</p>`
    }
    return html
  }

  const emptyTf: Tf = { ox: 0, oy: 0, sx: 1, sy: 1 }

  const picture = (pic: El, tf: Tf, ctx: Ctx): string => {
    const spPr = kid(pic, 'spPr')
    const raw = boxOf(spPr ? kid(spPr, 'xfrm') : null)
    if (!raw) return ''
    const box = place(raw, tf)
    const fill = kid(pic, 'blipFill')
    const rel = pack.relsOf(ctx.part).get(at(fill ? find(fill, 'blip') : null, 'embed'))
    const mark = rel && !rel.external ? pack.image(rel.target) : ''
    const alt = at(path(pic, 'nvPicPr', 'cNvPr'), 'descr') || at(path(pic, 'nvPicPr', 'cNvPr'), 'name')
    const prst = at(spPr ? kid(spPr, 'prstGeom') : null, 'prst')
    const radius = prst === 'ellipse' ? ';border-radius:50%' : prst === 'roundRect' ? `;border-radius:${cq(Math.min(box.w, box.h) * 0.1667)}` : ''
    const style = `${boxCss(box, Number(at(spPr ? kid(spPr, 'xfrm') : null, 'rot')) || 0)}${radius}`
    if (!mark) return `<div class="lb-f lb-hueco" style="${style}"><span>${esc(alt || 'Imagen')}</span></div>`
    const media = find(pic, 'videoFile') ? '<span class="lb-play">▶ video</span>' : find(pic, 'audioFile') ? '<span class="lb-play">♪ audio</span>' : ''
    // Recorte: la imagen se agranda y se desplaza dentro de su marco.
    const crop = fill ? kid(fill, 'srcRect') : null
    const [l, t, r, b] = ['l', 't', 'r', 'b'].map((side) => (Number(at(crop, side)) || 0) / 100000)
    let img = 'width:100%;height:100%'
    if (crop && l + r < 0.95 && t + b < 0.95 && (l || t || r || b)) {
      const kw = 1 / (1 - l - r)
      const kh = 1 / (1 - t - b)
      img = `position:absolute;width:${round(kw * 100, 2)}%;height:${round(kh * 100, 2)}%;left:${round(-l * kw * 100, 2)}%;top:${round(-t * kh * 100, 2)}%`
    }
    return `<div class="lb-f lb-pic" style="${style}"><img src="${mark}" alt="${esc(alt)}" loading="lazy" style="${img}">${media}</div>`
  }

  const shape = (sp: El, tf: Tf, ctx: Ctx, fromTemplate: boolean): string => {
    const ph = path(sp, 'nvSpPr', 'nvPr', 'ph')
    // Lo que el diseño y el patrón aportan son sus adornos, no sus marcadores vacíos.
    if (fromTemplate && ph) return ''
    const spPr = kid(sp, 'spPr')
    let xfrm = spPr ? kid(spPr, 'xfrm') : null
    if (!xfrm && ph) {
      xfrm = path(placeholderIn(ctx.layout, ph), 'spPr', 'xfrm') || path(placeholderIn(ctx.master, ph), 'spPr', 'xfrm')
    }
    let raw = boxOf(xfrm)
    const txBody = kid(sp, 'txBody')
    if (!raw) {
      if (!txBody) return ''
      const title = !!ph && /title/i.test(at(ph, 'type'))
      raw = title ? { x: W * 0.05, y: H * 0.05, w: W * 0.9, h: H * 0.16 } : { x: W * 0.05, y: H * 0.25, w: W * 0.9, h: H * 0.65 }
    }
    const box = place(raw, tf)
    const prst = at(spPr ? kid(spPr, 'prstGeom') : null, 'prst') || 'rect'
    const styleRef = kid(sp, 'style')

    // Líneas y conectores: una raya de esquina a esquina.
    if (sp.localName === 'cxnSp' || prst === 'line' || /Connector/.test(prst)) {
      const ln = spPr ? kid(spPr, 'ln') : null
      const color = colorIn(ln ? kid(ln, 'solidFill') : null, ctx) || colorIn(styleRef ? kid(styleRef, 'lnRef') : null, ctx) || '#64748b'
      const width = Math.max(0.6, (Number(at(ln, 'w')) || 9525) / 12700)
      const flip = at(xfrm, 'flipV') === '1' !== (at(xfrm, 'flipH') === '1')
      return `<svg class="lb-f lb-linea" style="${boxCss(box)}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">` +
        `<line x1="0" y1="${flip ? 100 : 0}" x2="100" y2="${flip ? 0 : 100}" stroke="${color}" stroke-width="${round(width, 2)}" vector-effect="non-scaling-stroke"/></svg>`
    }

    const css: string[] = [boxCss(box, Number(at(xfrm, 'rot')) || 0)]
    let fill = fillOf(spPr, ctx)
    if (fill === undefined && !ph && styleRef && Number(at(kid(styleRef, 'fillRef'), 'idx')) > 0) fill = colorIn(kid(styleRef, 'fillRef'), ctx)
    if (fill) css.push(`background:${fill}`)

    const ln = spPr ? kid(spPr, 'ln') : null
    let line = ''
    if (ln && !kid(ln, 'noFill')) line = colorIn(kid(ln, 'solidFill'), ctx)
    if (!ln && !ph && styleRef && Number(at(kid(styleRef, 'lnRef'), 'idx')) > 0) line = colorIn(kid(styleRef, 'lnRef'), ctx)
    if (line) {
      const dashed = ln && kid(ln, 'prstDash') && at(kid(ln, 'prstDash'), 'val') !== 'solid'
      css.push(`border:${cq(Math.max(6350, Number(at(ln, 'w')) || 9525))} ${dashed ? 'dashed' : 'solid'} ${line}`)
    }

    if (prst === 'ellipse') css.push('border-radius:50%')
    else if (/^(roundRect|round\dRect|round\d\w+Rect|flowChartAlternateProcess)$/.test(prst)) {
      const adj = Number(/val (\d+)/.exec(at(find(spPr, 'gd'), 'fmla'))?.[1] ?? 16667) / 100000
      css.push(`border-radius:${cq(Math.min(box.w, box.h) * Math.min(0.5, adj))}`)
    } else if (CLIP[prst]) css.push(`clip-path:${CLIP[prst]}`)

    const bodyPr = txBody ? kid(txBody, 'bodyPr') : null
    const inset = (side: string, fallback: number) => (bodyPr && at(bodyPr, side) !== '' ? Number(at(bodyPr, side)) : fallback)
    const anchor = (bodyPr && at(bodyPr, 'anchor')) ||
      (ph ? at(path(placeholderIn(ctx.layout, ph), 'txBody', 'bodyPr'), 'anchor') || at(path(placeholderIn(ctx.master, ph), 'txBody', 'bodyPr'), 'anchor') : '') || 't'
    css.push(`padding:${cq(inset('tIns', 45720))} ${cq(inset('rIns', 91440))} ${cq(inset('bIns', 45720))} ${cq(inset('lIns', 91440))}`)
    css.push(`justify-content:${anchor === 'ctr' ? 'center' : anchor === 'b' ? 'flex-end' : 'flex-start'}`)

    const fontRef = styleRef ? colorIn(kid(styleRef, 'fontRef'), ctx) : ''
    const inner = textBody(txBody, sp, ph, ctx, fontRef || ctx.theme.colors.tx1 || '#000000')
    if (!inner && !fill && !line) return ''
    return `<div class="lb-f" style="${css.join(';')}">${inner}</div>`
  }

  const frame = (gf: El, tf: Tf, ctx: Ctx): string => {
    const raw = boxOf(kid(gf, 'xfrm'))
    if (!raw) return ''
    const box = place(raw, tf)
    const tbl = find(gf, 'tbl')
    if (!tbl) {
      const pic = find(gf, 'pic')
      if (pic) return picture(pic, tf, ctx)
      const what = find(gf, 'chart') ? 'Gráfico' : find(gf, 'relIds') ? 'Diagrama SmartArt' : 'Objeto incrustado'
      pack.warnings.add(`${what}: no se convierte y se ve en el original.`)
      return `<div class="lb-f lb-hueco" style="${boxCss(box)}"><span>${what} (ver el original)</span></div>`
    }
    const grid = kids(kid(tbl, 'tblGrid') || tbl, 'gridCol').map((col) => Number(at(col, 'w')) || 0)
    const total = grid.reduce((sum, w) => sum + w, 0) || 1
    const firstRow = at(kid(tbl, 'tblPr'), 'firstRow') === '1'
    const accent = ctx.theme.colors.accent1 || '#334155'
    let html = `<div class="lb-f" style="${boxCss(box)};padding:0"><table class="lb-ptabla"><colgroup>${grid.map((w) => `<col style="width:${round((w / total) * 100, 2)}%">`).join('')}</colgroup>`
    kids(tbl, 'tr').forEach((tr, rowIndex) => {
      html += `<tr style="height:${cq(Number(at(tr, 'h')) || 0)}">`
      for (const tc of kids(tr, 'tc')) {
        if (at(tc, 'hMerge') === '1' || at(tc, 'vMerge') === '1') continue
        const tcPr = kid(tc, 'tcPr')
        const css: string[] = []
        const fill = fillOf(tcPr, ctx)
        const header = firstRow && rowIndex === 0 && fill === undefined
        if (fill) css.push(`background:${fill}`)
        else if (header) css.push(`background:${accent}`)
        const anchor = at(tcPr, 'anchor')
        if (anchor === 'ctr') css.push('vertical-align:middle')
        if (anchor === 'b') css.push('vertical-align:bottom')
        const span = Number(at(tc, 'gridSpan')) || 1
        const rows = Number(at(tc, 'rowSpan')) || 1
        const inner = textBody(kid(tc, 'txBody'), null, null, ctx, header ? '#ffffff' : ctx.theme.colors.tx1 || '#000000', 14)
        html += `<td${span > 1 ? ` colspan="${span}"` : ''}${rows > 1 ? ` rowspan="${rows}"` : ''}${css.length ? ` style="${css.join(';')}"` : ''}>${inner}</td>`
      }
      html += '</tr>'
    })
    return `${html}</table></div>`
  }

  const tree = (container: El, tf: Tf, ctx: Ctx, fromTemplate: boolean): string => {
    let html = ''
    for (const child of kids(container)) {
      switch (child.localName) {
        case 'sp': case 'cxnSp': html += shape(child, tf, ctx, fromTemplate); break
        case 'pic': html += picture(child, tf, ctx); break
        case 'graphicFrame': html += frame(child, tf, ctx); break
        case 'grpSp': {
          const xfrm = path(child, 'grpSpPr', 'xfrm')
          const outer = boxOf(xfrm)
          const chOff = xfrm ? kid(xfrm, 'chOff') : null
          const chExt = xfrm ? kid(xfrm, 'chExt') : null
          let inner = tf
          if (outer && chOff && chExt && Number(at(chExt, 'cx')) && Number(at(chExt, 'cy'))) {
            const sx = outer.w / Number(at(chExt, 'cx'))
            const sy = outer.h / Number(at(chExt, 'cy'))
            inner = {
              sx: tf.sx * sx,
              sy: tf.sy * sy,
              ox: tf.ox + (outer.x - Number(at(chOff, 'x')) * sx) * tf.sx,
              oy: tf.oy + (outer.y - Number(at(chOff, 'y')) * sy) * tf.sy,
            }
          }
          html += tree(child, inner, ctx, fromTemplate)
          break
        }
        case 'AlternateContent': {
          const branch = kid(child, 'Fallback') || kid(child, 'Choice')
          if (branch) html += tree(branch, tf, ctx, fromTemplate)
          break
        }
        default: break
      }
    }
    return html
  }

  const backgroundOf = (root: El | null, ctx: Ctx): string | undefined => {
    const bg = root ? path(find(root, 'cSld') || root, 'bg') : null
    if (!bg) return undefined
    const props = kid(bg, 'bgPr')
    if (props) return fillOf(props, ctx)
    return colorIn(kid(bg, 'bgRef'), ctx) || undefined
  }

  // ── Diapositivas, en su orden ──
  const presRels = pack.relsOf(PRES)
  const slideParts = findAll(find(presentation, 'sldIdLst') || presentation, 'sldId')
    .map((entry) => presRels.get(rid(entry))?.target || '')
    .filter((part) => part && pack.has(part))
  if (!slideParts.length) throw new Error('La presentación no tiene diapositivas.')

  let html = ''
  slideParts.forEach((part, index) => {
    const slide = pack.doc(part)
    if (!slide) return
    const rels = [...pack.relsOf(part).values()]
    const layoutPart = rels.find((row) => row.type === 'slideLayout')?.target || ''
    const layout = layoutPart ? pack.doc(layoutPart) : null
    const masterPart = layoutPart ? [...pack.relsOf(layoutPart).values()].find((row) => row.type === 'slideMaster')?.target || '' : ''
    const master = masterPart ? pack.doc(masterPart) : null
    const theme = masterPart ? themeOf(masterPart) : { colors: {}, major: '', minor: '' }

    const ctx: Ctx = { part, theme, layout, master }
    const masterCtx: Ctx = { ...ctx, part: masterPart }
    const layoutCtx: Ctx = { ...ctx, part: layoutPart }

    const background =
      backgroundOf(slide, ctx) ?? backgroundOf(layout, layoutCtx) ?? backgroundOf(master, masterCtx) ?? '#ffffff'

    let canvas = ''
    const root = (doc: El | null) => (doc ? find(doc, 'spTree') : null)
    const showMaster = at(find(slide, 'sld') || slide.documentElement, 'showMasterSp') !== '0'
    const layoutShows = !layout || at(layout.documentElement, 'showMasterSp') !== '0'
    if (showMaster && layoutShows && root(master)) canvas += tree(root(master), emptyTf, masterCtx, true)
    if (showMaster && root(layout)) canvas += tree(root(layout), emptyTf, layoutCtx, true)
    if (root(slide)) canvas += tree(root(slide), emptyTf, ctx, false)

    // El título de la pantalla, para el rótulo y para ubicar los comentarios.
    const titleSp = findAll(slide, 'sp').find((sp) => /title/i.test(at(path(sp, 'nvSpPr', 'nvPr', 'ph'), 'type')))
    const title = titleSp ? findAll(titleSp, 't').map((t) => t.textContent || '').join(' ').replace(/\s+/g, ' ').trim().slice(0, 140) : ''

    // Notas del orador: en un guion son las notas de producción.
    let notes = ''
    const notesPart = rels.find((row) => row.type === 'notesSlide')?.target || ''
    const notesDoc = notesPart ? pack.doc(notesPart) : null
    if (notesDoc) {
      const body = findAll(notesDoc, 'sp').find((sp) => at(path(sp, 'nvSpPr', 'nvPr', 'ph'), 'type') === 'body')
      for (const p of body ? findAll(body, 'p') : []) {
        let line = ''
        for (const child of kids(p)) {
          if (child.localName === 'br') line += '<br>'
          else if (child.localName === 'r') {
            const text = esc(kid(child, 't')?.textContent || '')
            line += at(kid(child, 'rPr'), 'b') === '1' ? `<b>${text}</b>` : text
          }
        }
        if (line.trim()) notes += `<p>${line}</p>`
      }
    }

    const hidden = at(slide.documentElement, 'show') === '0'
    const n = index + 1
    html +=
      `<section class="lb-pant${hidden ? ' lb-oculta' : ''}" id="pantalla-${n}">` +
      `<h2 class="lb-pant-t"><b>Pantalla ${n}</b>${title ? ` · ${esc(title)}` : ''}${hidden ? ' · <i>oculta</i>' : ''}</h2>` +
      `<div class="lb-lienzo" style="aspect-ratio:${W}/${H};background:${background || '#ffffff'}">${canvas}</div>` +
      (notes ? `<div class="lb-notas"><h3>Notas de producción</h3>${notes}</div>` : '') +
      '</section>'
  })

  return { html: `<div class="lb-doc lb-pptx">${html}</div>`, units: slideParts.length }
}

// ═════════════════════════════════════════════════════════════════════════════
// LA HOJA DE ESTILO
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Los estilos de la lectura. Viven aquí, junto al HTML que visten, y se sirven
 * con la página y no con el fragmento guardado: así se pueden afinar sin
 * volver a convertir ningún documento.
 */
export const OFFICE_CSS = `
.lb-doc{box-sizing:border-box;margin:0 auto;color:#0f172a;font-family:Calibri,'Segoe UI',system-ui,-apple-system,sans-serif}
.lb-doc *{box-sizing:border-box}
.lb-docx{max-width:860px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:56px 64px;font-size:11pt;line-height:1.5;
  box-shadow:0 1px 3px rgba(15,23,42,.06);overflow-wrap:anywhere}
.lb-docx p{margin:0 0 .55em}
.lb-docx h1,.lb-docx h2,.lb-docx h3,.lb-docx h4,.lb-docx h5,.lb-docx h6{margin:1.1em 0 .45em;line-height:1.25;font-weight:700}
.lb-docx h1{font-size:18pt}.lb-docx h2{font-size:15pt}.lb-docx h3{font-size:13pt}.lb-docx h4,.lb-docx h5,.lb-docx h6{font-size:11.5pt}
.lb-docx img{max-width:100%;height:auto;vertical-align:middle}
.lb-docx a{color:#1d4ed8}
.lb-vacio{height:.7em;margin:0!important}
.lb-li .lb-mk{display:inline-block;text-indent:0}
.lb-tab{display:inline-block;width:2em}
.lb-toc .lb-tab{width:1em}
.lb-salto{border:0;border-top:1px dashed #cbd5e1;margin:2em 0}
.lb-math{font-family:'Cambria Math',Cambria,serif;font-style:italic}
.lb-noimg{display:inline-block;padding:.3em .6em;border:1px dashed #cbd5e1;border-radius:4px;color:#64748b;font-size:9pt}
.lb-caja{border:1px solid #cbd5e1;border-radius:4px;padding:.6em .8em;margin:.6em 0}
.lb-tabla{border-collapse:collapse;width:100%;margin:.7em 0 1em;table-layout:fixed}
.lb-tabla td{border:1px solid #94a3b8;padding:.35em .55em;vertical-align:top}
.lb-tabla td>p:last-child{margin-bottom:0}
.lb-tabla.lb-sin-borde td{border-color:transparent}
.lb-pptx{max-width:1120px}
.lb-pant{margin:0 0 28px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.06)}
.lb-pant-t{margin:0;padding:9px 14px;font:500 13px/1.3 system-ui,-apple-system,sans-serif;color:#475569;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.lb-pant-t b{color:#0f172a;font-weight:800}
.lb-oculta .lb-lienzo{opacity:.55}
.lb-lienzo{position:relative;width:100%;container-type:inline-size;overflow:hidden;line-height:1.2}
.lb-f{position:absolute;display:flex;flex-direction:column;overflow:visible}
.lb-f p{margin:0;min-width:0;overflow-wrap:break-word}
.lb-pic{overflow:hidden;padding:0}
.lb-pic img{display:block;object-fit:fill}
.lb-play{position:absolute;left:6px;bottom:6px;padding:2px 7px;border-radius:99px;background:rgba(15,23,42,.8);color:#fff;font:700 11px/1.4 system-ui,sans-serif}
.lb-linea{overflow:visible;min-width:1px;min-height:1px}
.lb-hueco{align-items:center;justify-content:center;border:1px dashed #94a3b8;background:rgba(148,163,184,.12);color:#475569;font:600 1.1cqw/1.3 system-ui,sans-serif;text-align:center}
.lb-ptabla{border-collapse:collapse;width:100%;height:100%;table-layout:fixed}
.lb-ptabla td{border:1px solid rgba(100,116,139,.45);padding:.4cqw .6cqw;vertical-align:top}
.lb-notas{padding:12px 16px 14px;border-top:1px solid #e2e8f0;background:#fffbeb;font:400 13.5px/1.55 system-ui,-apple-system,sans-serif;color:#422006}
.lb-notas h3{margin:0 0 6px;font:800 10.5px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#92400e}
.lb-notas p{margin:0 0 .45em}
@media (max-width:720px){.lb-docx{padding:28px 20px}}
@media print{.lb-pant{break-inside:avoid}}
`
