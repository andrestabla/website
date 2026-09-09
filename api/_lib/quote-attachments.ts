/**
 * Cotizador — archivos adjuntos del asistente.
 *
 * El consultor sube un archivo al chat de una cotización para que la IA lo use
 * como referencia o para volcarlo tal cual en la propuesta. Todo archivo se
 * lleva a Markdown: es el formato que la IA lee sin ruido y el que después se
 * convierte, sin resumir ni recortar, en páginas editables del documento
 * (content.pages). El consultor puede subir .md directamente; si sube .docx,
 * .pdf, .html o .txt, aquí se convierte con el 100 % de su contenido.
 *
 *  - extractMarkdown: archivo → Markdown.
 *  - markdownToPages: Markdown → páginas con bloques tipados (todo editable,
 *    incluidos los nombres de las secciones).
 *  - sanitizePages: valida páginas que vienen de la IA o del cliente.
 */
import { uploadImageToR2 } from './r2.js'

export type SourceFormat = 'md' | 'docx' | 'pdf' | 'html' | 'txt'

export type Extracted = {
  markdown: string
  sourceFormat: SourceFormat
  /** true cuando el archivo no venía en Markdown y hubo que convertirlo. */
  converted: boolean
  /** true si el contenido superó el tope y se recortó. */
  truncated: boolean
}

/** Tope por adjunto. Una propuesta larga ronda 60–120k caracteres. */
export const ATTACHMENT_MAX_CHARS = 400_000
/** Tope del archivo subido (el cuerpo JSON en Vercel se corta cerca de 4,5 MB). */
export const ATTACHMENT_MAX_BYTES = 3.5 * 1024 * 1024

// ── Markdown: limpieza ───────────────────────────────────────────────────────

/** Normaliza saltos y espacios sin tocar el contenido. */
export function tidyMarkdown(text: string): { markdown: string; truncated: boolean } {
  const clean = String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { markdown: clean.slice(0, ATTACHMENT_MAX_CHARS), truncated: clean.length > ATTACHMENT_MAX_CHARS }
}

export function detectFormat(fileName: string, mimeType: string): SourceFormat {
  const name = fileName.toLowerCase()
  const mime = (mimeType || '').toLowerCase()
  if (name.endsWith('.md') || name.endsWith('.markdown') || mime.includes('markdown')) return 'md'
  if (name.endsWith('.docx') || mime.includes('wordprocessingml')) return 'docx'
  if (name.endsWith('.pdf') || mime.includes('pdf')) return 'pdf'
  if (name.endsWith('.html') || name.endsWith('.htm') || mime.includes('html')) return 'html'
  return 'txt'
}

// ── Extracción ───────────────────────────────────────────────────────────────

/**
 * Convierte el archivo a Markdown. Las imágenes incrustadas en un .docx se
 * suben a R2 para que la propuesta las muestre; si R2 no está disponible se
 * conserva el pie de la imagen como nota, para no perder contenido.
 */
export async function extractMarkdown(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  opts: { uploadedBy?: string } = {}
): Promise<Extracted> {
  const sourceFormat = detectFormat(fileName, mimeType)

  if (sourceFormat === 'md') {
    const { markdown, truncated } = tidyMarkdown(buffer.toString('utf8'))
    return { markdown, sourceFormat, converted: false, truncated }
  }

  if (sourceFormat === 'docx') {
    const mammoth: any = await import('mammoth')
    const lib = mammoth.default ?? mammoth
    let counter = 0
    const convertImage = lib.images.imgElement(async (image: any) => {
      counter += 1
      try {
        const contentType = String(image.contentType || 'image/png')
        const raw: Buffer = await image.read()
        const { url } = await uploadImageToR2({
          buffer: raw,
          contentType,
          filename: `${fileName.replace(/\.[a-z0-9]+$/i, '')}-img-${counter}`,
          folder: 'cotizador/adjuntos',
          uploadedBy: opts.uploadedBy,
        })
        return { src: url }
      } catch {
        // sin R2: la imagen queda referenciada por su pie, no se pierde el texto
        return { src: '', alt: image.altText || `Imagen ${counter} del documento` }
      }
    })
    const result = await lib.convertToMarkdown({ buffer }, { convertImage })
    const { markdown, truncated } = tidyMarkdown(normalizeMammoth(String(result?.value || '')))
    return { markdown, sourceFormat, converted: true, truncated }
  }

  if (sourceFormat === 'pdf') {
    await ensurePdfRuntime()
    const mod: any = await import('pdf-parse')
    const parser = new mod.PDFParse({ data: new Uint8Array(buffer) })
    let text = ''
    try {
      const result = await parser.getText()
      const pages: Array<{ text: string }> = Array.isArray(result?.pages) ? result.pages : []
      text = pages.length ? pages.map((p) => String(p.text || '')).join('\n\n') : String(result?.text || '')
    } finally {
      await parser.destroy().catch(() => undefined)
    }
    const { markdown, truncated } = tidyMarkdown(plainTextToMarkdown(text))
    return { markdown, sourceFormat, converted: true, truncated }
  }

  if (sourceFormat === 'html') {
    const { markdown, truncated } = tidyMarkdown(htmlToMarkdown(buffer.toString('utf8')))
    return { markdown, sourceFormat, converted: true, truncated }
  }

  const { markdown, truncated } = tidyMarkdown(plainTextToMarkdown(buffer.toString('utf8')))
  return { markdown, sourceFormat: 'txt', converted: true, truncated }
}

// ── Entorno para pdfjs en Node ───────────────────────────────────────────────

/**
 * pdfjs (motor de pdf-parse) evalúa `new DOMMatrix()` al cargar el módulo. En
 * Node lo cubre con @napi-rs/canvas, un binario nativo que en la función de
 * Vercel no siempre está disponible: sin él, la subida de un PDF fallaba con
 * «DOMMatrix is not defined». Extraer texto no dibuja nada, así que basta una
 * matriz 2D mínima cuando el binario falta.
 */
export class MinimalDOMMatrix {
  a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
  constructor(init?: number[] | string | { a: number; b: number; c: number; d: number; e: number; f: number }) {
    if (Array.isArray(init) && init.length >= 6) {
      const [a, b, c, d, e, f] = init.length === 16 ? [init[0], init[1], init[4], init[5], init[12], init[13]] : init
      Object.assign(this, { a, b, c, d, e, f })
    } else if (init && typeof init === 'object' && !Array.isArray(init)) {
      Object.assign(this, { a: init.a, b: init.b, c: init.c, d: init.d, e: init.e, f: init.f })
    }
  }
  get m11() { return this.a } get m12() { return this.b } get m21() { return this.c } get m22() { return this.d } get m41() { return this.e } get m42() { return this.f }
  get is2D() { return true }
  get isIdentity() { return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0 }
  multiply(o: MinimalDOMMatrix) {
    return new MinimalDOMMatrix([
      this.a * o.a + this.c * o.b, this.b * o.a + this.d * o.b,
      this.a * o.c + this.c * o.d, this.b * o.c + this.d * o.d,
      this.a * o.e + this.c * o.f + this.e, this.b * o.e + this.d * o.f + this.f,
    ])
  }
  multiplySelf(o: MinimalDOMMatrix) { return Object.assign(this, this.multiply(o)) }
  preMultiplySelf(o: MinimalDOMMatrix) { return Object.assign(this, o.multiply(this)) }
  translate(tx = 0, ty = 0) { return this.multiply(new MinimalDOMMatrix([1, 0, 0, 1, tx, ty])) }
  translateSelf(tx = 0, ty = 0) { return this.multiplySelf(new MinimalDOMMatrix([1, 0, 0, 1, tx, ty])) }
  scale(sx = 1, sy = sx) { return this.multiply(new MinimalDOMMatrix([sx, 0, 0, sy, 0, 0])) }
  scaleSelf(sx = 1, sy = sx) { return this.multiplySelf(new MinimalDOMMatrix([sx, 0, 0, sy, 0, 0])) }
  inverse() {
    const det = this.a * this.d - this.b * this.c
    if (!det) return new MinimalDOMMatrix([NaN, NaN, NaN, NaN, NaN, NaN])
    return new MinimalDOMMatrix([
      this.d / det, -this.b / det, -this.c / det, this.a / det,
      (this.c * this.f - this.d * this.e) / det, (this.b * this.e - this.a * this.f) / det,
    ])
  }
  invertSelf() { return Object.assign(this, this.inverse()) }
  transformPoint(p: { x?: number; y?: number } = {}) {
    const x = p.x ?? 0, y = p.y ?? 0
    return { x: this.a * x + this.c * y + this.e, y: this.b * x + this.d * y + this.f, z: 0, w: 1 }
  }
  toFloat32Array() { return new Float32Array([this.a, this.b, 0, 0, this.c, this.d, 0, 0, 0, 0, 1, 0, this.e, this.f, 0, 1]) }
  toFloat64Array() { return new Float64Array(this.toFloat32Array()) }
}

/** Deja DOMMatrix (y compañía) definidos antes de cargar pdf-parse. */
export async function ensurePdfRuntime() {
  const g = globalThis as any
  if (typeof g.DOMMatrix === 'undefined') {
    try {
      const canvas: any = await import('@napi-rs/canvas')
      if (canvas?.DOMMatrix) g.DOMMatrix = canvas.DOMMatrix
      if (canvas?.ImageData && typeof g.ImageData === 'undefined') g.ImageData = canvas.ImageData
      if (canvas?.Path2D && typeof g.Path2D === 'undefined') g.Path2D = canvas.Path2D
    } catch {
      // sin binario nativo: matriz mínima, suficiente para extraer texto
    }
    if (typeof g.DOMMatrix === 'undefined') g.DOMMatrix = MinimalDOMMatrix
  }
  // Sin Web Workers, pdfjs carga el worker con un import dinámico de ruta
  // calculada que el empaquetador de Vercel no rastrea, y la función se
  // despliega sin ese archivo. Importarlo aquí con ruta literal lo incluye
  // en el bundle; pdfjs usa `globalThis.pdfjsWorker` antes de buscarlo en disco.
  if (!g.pdfjsWorker) {
    try {
      // @ts-ignore: el worker no publica tipos; solo interesa que viaje en el bundle
      g.pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
    } catch {
      // se deja que pdfjs intente su propia carga
    }
  }
}

/** mammoth escribe __negrita__ y escapa signos; el visor entiende **negrita** y texto limpio. */
function normalizeMammoth(md: string): string {
  return md
    .replace(/<a\s+id="[^"]*"\s*><\/a>/g, '') // anclajes de los encabezados de Word
    .replace(/<\/?(?:a|span|div|br)\b[^>]*>/g, '')
    .replace(/__([^_\n]+)__/g, '**$1**')
    .replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, '$1')
    .replace(/!\[([^\]]*)\]\(\)/g, (_m, alt) => (alt ? `*[Imagen: ${alt}]*` : ''))
}

/**
 * Texto plano (PDF, .txt) → Markdown. Reconstruye lo que el formato perdió:
 * títulos numerados o en mayúsculas, viñetas y párrafos partidos por el ancho
 * de la página. No inventa nada: cada línea del original sigue ahí.
 */
export function plainTextToMarkdown(text: string): string {
  const lines = String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\f/g, '\n\n')
    .split('\n')
  const out: string[] = []
  let para: string[] = []

  // líneas que se repiten en el documento (encabezado o pie corrido de cada página): no son títulos
  const counts = new Map<string, number>()
  for (const l of lines) { const t = l.trim(); if (t.length > 6) counts.set(t, (counts.get(t) || 0) + 1) }
  const isRunning = (t: string) => (counts.get(t) || 0) >= 3

  const flush = () => {
    if (para.length) {
      out.push(para.join(' ').replace(/\s+/g, ' ').trim())
      para = []
    }
  }

  const isHeading = (line: string, next: string) => {
    const t = line.trim()
    if (t.length < 3 || t.length > 90) return 0
    if (/^#{1,6}\s/.test(t)) return 0 // ya es Markdown
    if (/\t|[%→←]/.test(t)) return 0 // celdas de tabla o rótulos de gráfico pegados en una línea
    if (isRunning(t)) return 0
    // «P R O P U E S T A»: rótulo con letras espaciadas de un PDF diagramado, no un título
    if (t.split(/\s+/).filter((w) => w.length === 1).length >= t.split(/\s+/).length * 0.6) return 0
    if (/[.:;,]$/.test(t) && !/^\d+(\.\d+)*\.?\s/.test(t)) return 0
    // entrada de un índice: «07 Equipo consultor 18»
    if (/^\d+(\.\d+)*\.?\s.+\s\d{1,3}$/.test(t)) return 0
    // numeración jerárquica: "1. Título", "2.3 Alcance", "III. Anexos"
    const numbered = /^(\d+(?:\.\d+)*)\.?\s+\S/.exec(t)
    if (numbered && /[A-Za-zÁÉÍÓÚÑ]/.test(t) && !/^\d+(\.\d+)*\.?\s+[a-záéíóúñ]/.test(t)) {
      return Math.min(3, numbered[1].split('.').length + 1)
    }
    if (/^[IVXLC]+\.\s+\S/.test(t)) return 2
    // MAYÚSCULAS sostenidas
    const letters = t.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '')
    if (letters.length >= 8 && letters === letters.toUpperCase() && t.length <= 90) return 2
    // Título corto en Title Case (dos o más palabras) seguido de texto largo
    const words = t.split(/\s+/)
    const titled = words.filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w)).length
    if (words.length >= 2 && words.length <= 8 && titled >= Math.ceil(words.length * 0.7) && !next.trim().startsWith('-') && next.trim().length > 40) return 3
    return 0
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const t = raw.trim()
    const next = lines[i + 1] ?? ''
    if (!t) { flush(); continue }
    if (/^[•·▪◦●○■□➢➤►\-–—*]\s+/.test(t)) {
      flush()
      out.push(`- ${t.replace(/^[•·▪◦●○■□➢➤►\-–—*]\s+/, '')}`)
      continue
    }
    if (/^\d+[.)]\s+/.test(t) && t.length < 200 && !/[A-ZÁÉÍÓÚÑ][^.]{0,60}$/.test(t.replace(/^\d+[.)]\s+/, ''))) {
      flush()
      out.push(`${t.replace(/^(\d+)[.)]\s+/, '$1. ')}`)
      continue
    }
    const level = isHeading(t, next)
    if (level) {
      flush()
      out.push(`${'#'.repeat(level)} ${t}`)
      continue
    }
    // línea partida por el ancho: se une con la siguiente
    para.push(t)
    const endsSentence = /[.!?:;»")\]]$/.test(t)
    const nextStartsLower = /^[a-záéíóúñü(]/.test(next.trim())
    if (!next.trim() || (endsSentence && !nextStartsLower && next.trim().length > 0 && /^[A-ZÁÉÍÓÚÑ0-9•\-–]/.test(next.trim()) && t.length < 60)) {
      flush()
    }
  }
  flush()
  // los ítems consecutivos de una lista se separan con un solo salto
  return out.reduce((acc, line, i) => {
    if (i === 0) return line
    const prevItem = /^(-|\d+\.)\s/.test(out[i - 1])
    const thisItem = /^(-|\d+\.)\s/.test(line)
    return acc + (prevItem && thisItem ? '\n' : '\n\n') + line
  }, '')
}

/** HTML → Markdown con encabezados, párrafos, listas, tablas, énfasis y enlaces. */
export function htmlToMarkdown(html: string): string {
  let h = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
  // tablas
  h = h.replace(/<table[\s\S]*?<\/table>/gi, (table) => {
    const rows = Array.from(table.matchAll(/<tr[\s\S]*?<\/tr>/gi)).map((m) =>
      Array.from(m[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)).map((c) => inlineHtml(c[1]).replace(/\|/g, '/').trim())
    )
    if (!rows.length) return ''
    const [head, ...body] = rows
    const cols = Math.max(...rows.map((r) => r.length))
    const pad = (r: string[]) => Array.from({ length: cols }, (_, i) => r[i] ?? '')
    return `\n\n| ${pad(head).join(' | ')} |\n| ${pad(head).map(() => '---').join(' | ')} |\n${body.map((r) => `| ${pad(r).join(' | ')} |`).join('\n')}\n\n`
  })
  h = h
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, n, t) => `\n\n${'#'.repeat(Number(n))} ${inlineHtml(t)}\n\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, t) => `\n- ${inlineHtml(t)}`)
    .replace(/<\/(ul|ol)>/gi, '\n\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, t) => `\n\n> ${inlineHtml(t).replace(/\n+/g, ' ')}\n\n`)
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '\n\n![$2]($1)\n\n')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '\n\n![$1]($2)\n\n')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '\n\n![]($1)\n\n')
    .replace(/<hr[^>]*>/gi, '\n\n---\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|header|footer|main|figure|figcaption|dd|dt|tr)>/gi, '\n\n')
  return decodeEntities(inlineHtml(h)).replace(/[ \t]+\n/g, '\n')
}

function inlineHtml(fragment: string): string {
  return decodeEntities(
    String(fragment || '')
      .replace(/<(b|strong)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi, '**$2**')
      .replace(/<(i|em)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi, '*$2*')
      .replace(/<code(?:\s[^>]*)?>([\s\S]*?)<\/code>/gi, '`$1`')
      .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
  )
}

function decodeEntities(text: string): string {
  const map: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
    hellip: '…', laquo: '«', raquo: '»', copy: '©', reg: '®', deg: '°', iexcl: '¡', iquest: '¿',
  }
  return text
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => map[name.toLowerCase()] ?? m)
}

// ── Markdown → páginas ───────────────────────────────────────────────────────

export type PageBlock = Record<string, any> & { type: string }
export type DocPage = {
  id: string
  num?: string
  kicker?: string
  title?: string
  tocHidden?: boolean
  blocks: PageBlock[]
}

type MdNode =
  | { type: 'h'; level: number; text: string }
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'hr' }
  | { type: 'img'; url: string; alt: string }
  | { type: 'code'; text: string }

/** Marcas inline que el visor entiende: **·**, *·*, `·`, [t](u). Se unifican las variantes. */
function inlineMd(text: string): string {
  return String(text || '')
    .replace(/__([^_\n]+)__/g, '**$1**')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, '$1*$2*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/** Tokeniza el Markdown en nodos de bloque. Sin dependencias: cubre lo que trae una propuesta. */
export function parseMarkdown(markdown: string): MdNode[] {
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n')
  const nodes: MdNode[] = []
  let i = 0
  let para: string[] = []

  const flushPara = () => {
    if (!para.length) return
    const text = inlineMd(para.join(' '))
    para = []
    if (!text) return
    // imagen sola dentro de un párrafo
    const img = /^!\[([^\]]*)\]\(([^)\s]*)\)$/.exec(text)
    if (img) { nodes.push({ type: 'img', url: img[2], alt: img[1] }); return }
    // imágenes intercaladas: se separan del texto para que cada una sea un bloque
    const parts = text.split(/(!\[[^\]]*\]\([^)\s]*\))/g).filter(Boolean)
    for (const part of parts) {
      const m = /^!\[([^\]]*)\]\(([^)\s]*)\)$/.exec(part)
      if (m) nodes.push({ type: 'img', url: m[2], alt: m[1] })
      else if (part.trim()) nodes.push({ type: 'p', text: part.trim() })
    }
  }

  const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l)
  const isSeparator = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l)
  const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => inlineMd(c))

  while (i < lines.length) {
    const line = lines[i]
    const t = line.trim()

    if (!t) { flushPara(); i += 1; continue }

    // bloque de código
    if (/^```/.test(t)) {
      flushPara()
      const buf: string[] = []
      i += 1
      while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i += 1 }
      i += 1
      nodes.push({ type: 'code', text: buf.join('\n') })
      continue
    }

    // encabezado
    const h = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(t)
    if (h) { flushPara(); nodes.push({ type: 'h', level: h[1].length, text: inlineMd(h[2]) }); i += 1; continue }

    // encabezado setext (línea seguida de === o ---)
    const under = (lines[i + 1] ?? '').trim()
    if (para.length === 0 && t.length <= 120 && /^(=+|-{3,})$/.test(under) && !isTableRow(t)) {
      flushPara()
      nodes.push({ type: 'h', level: under.startsWith('=') ? 1 : 2, text: inlineMd(t) })
      i += 2
      continue
    }

    // regla
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flushPara(); nodes.push({ type: 'hr' }); i += 1; continue }

    // tabla
    if (isTableRow(t) && isSeparator(lines[i + 1] ?? '')) {
      flushPara()
      const headers = cells(t)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && isTableRow(lines[i])) { rows.push(cells(lines[i])); i += 1 }
      nodes.push({ type: 'table', headers, rows })
      continue
    }

    // cita
    if (/^>\s?/.test(t)) {
      flushPara()
      const buf: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i += 1 }
      nodes.push({ type: 'quote', text: inlineMd(buf.join('\n').replace(/\n{2,}/g, '\n\n')) })
      continue
    }

    // lista (viñetas o numerada; los niveles anidados se aplanan)
    if (/^([-*+•]|\d+[.)])\s+/.test(t)) {
      flushPara()
      const items: string[] = []
      while (i < lines.length) {
        const l = lines[i]
        const lt = l.trim()
        if (!lt) {
          // línea en blanco: la lista sigue solo si la siguiente también es ítem
          const after = (lines[i + 1] ?? '').trim()
          if (/^([-*+•]|\d+[.)])\s+/.test(after)) { i += 1; continue }
          break
        }
        const m = /^([-*+•]|\d+[.)])\s+(.*)$/.exec(lt)
        if (m) { items.push(inlineMd(m[2])); i += 1; continue }
        // continuación indentada del ítem anterior
        if (/^\s{2,}/.test(l) && items.length) { items[items.length - 1] += ` ${inlineMd(lt)}`; i += 1; continue }
        break
      }
      nodes.push({ type: 'list', items: items.filter(Boolean) })
      continue
    }

    para.push(t)
    i += 1
  }
  flushPara()
  return nodes
}

/** Peso aproximado de un bloque en «caracteres de página»: sirve para partir hojas A4. */
function blockWeight(b: PageBlock): number {
  switch (b.type) {
    case 'p':
    case 'lede':
      return String(b.text || '').length + 60
    case 'h3':
      return 120
    case 'note':
      return String(b.text || '').length + 40
    case 'list':
      return (b.items as string[]).reduce((s, it) => s + it.length + 50, 0) + 40
    case 'box':
      return String(b.body || '').length + String(b.title || '').length + 220
    case 'table': {
      const rows: string[][] = b.rows || []
      const cols = Math.max(1, (b.headers || []).length, ...rows.map((r) => r.length))
      return rows.reduce((s, r) => s + Math.max(70, ...r.map((c) => c.length)) * Math.ceil(cols / 2), 0) + 200
    }
    case 'img':
      return b.wide ? 900 : 600
    case 'grid': {
      const cells: PageBlock[][] = Array.isArray(b.cells) ? b.cells : []
      const cols = Math.max(1, Number(b.cols) || cells.length || 1)
      const heights = cells.map((cell) => cell.reduce((s, x) => s + blockWeight(x), 0))
      // las celdas van en paralelo: pesa la fila más alta, por filas de `cols` celdas
      let total = 0
      for (let i = 0; i < heights.length; i += cols) total += Math.max(0, ...heights.slice(i, i + cols))
      return total + 120
    }
    case 'icon':
      return 160
    case 'button':
      return 120
    default:
      return 300
  }
}

/**
 * Parte en hojas A4 las páginas que desbordan: la continuación conserva el
 * título y se oculta del índice. Lo usan el conversor del esquema clásico y
 * el guardado de páginas que la IA o el editor dejan demasiado largas.
 */
export function splitPagesByCapacity(pages: DocPage[]): DocPage[] {
  const out: DocPage[] = []
  const ids = new Set<string>()
  for (const page of pages) {
    const pieces: PageBlock[] = []
    for (const b of page.blocks) {
      const w = blockWeight(b)
      if (w <= PAGE_CAPACITY) { pieces.push(b); continue }
      if (b.type === 'table') {
        const rows: string[][] = b.rows
        const per = Math.max(3, Math.floor(rows.length * (PAGE_CAPACITY / w)))
        for (let k = 0; k < rows.length; k += per) pieces.push({ ...b, rows: rows.slice(k, k + per) })
      } else if (b.type === 'p' || b.type === 'lede') {
        for (const piece of splitLongText(String(b.text), PAGE_CAPACITY - 300)) pieces.push({ ...b, text: piece })
      } else if (b.type === 'list') {
        for (const piece of chunkList(b.items as string[], PAGE_CAPACITY - 300)) pieces.push({ ...b, items: piece })
      } else {
        pieces.push(b)
      }
    }
    let chunk: PageBlock[] = []
    let acc = 0
    let part = 0
    const emit = () => {
      let id = part === 0 ? page.id : `${page.id}-${part + 1}`
      while (ids.has(id)) id = `${id}-${Math.random().toString(36).slice(2, 5)}`
      ids.add(id)
      out.push({ ...page, id, ...(part > 0 ? { tocHidden: true } : {}), blocks: chunk })
      part += 1
      chunk = []
      acc = 0
    }
    for (const b of pieces) {
      const w = blockWeight(b)
      if (chunk.length && acc + w > PAGE_CAPACITY) emit()
      chunk.push(b)
      acc += w
    }
    if (chunk.length || part === 0) emit()
  }
  return out
}

/** Cuánto contenido cabe en una hoja A4 del visor sin que se reduzca la letra. */
const PAGE_CAPACITY = 2600

const slug = (text: string) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'pagina'

function nodeToBlock(node: MdNode): PageBlock | null {
  switch (node.type) {
    case 'p': return { type: 'p', text: node.text }
    case 'list': return node.items.length ? { type: 'list', items: node.items } : null
    case 'quote': return { type: 'box', title: '', body: node.text }
    case 'table': {
      const cols = Math.max(node.headers.length, ...node.rows.map((r) => r.length))
      const pad = (r: string[]) => Array.from({ length: cols }, (_, k) => r[k] ?? '')
      const headers = node.headers.some((h) => h.trim()) ? pad(node.headers) : undefined
      const rows = node.rows.map(pad)
      if (!rows.length && !headers) return null
      return { type: 'table', ...(headers ? { headers } : {}), rows: rows.length ? rows : [pad([])], firstCol: 'plain' }
    }
    case 'img': return node.url ? { type: 'img', url: node.url, caption: node.alt, wide: true } : (node.alt ? { type: 'note', text: `[Imagen: ${node.alt}]` } : null)
    case 'code': return node.text.trim() ? { type: 'p', text: node.text.split('\n').map((l) => `\`${l}\``).join('\n') } : null
    case 'h': return { type: 'h3', text: node.text }
    default: return null
  }
}

export type PagesResult = {
  pages: DocPage[]
  /** Título del documento, si el Markdown arranca con un encabezado único de primer nivel. */
  docTitle: string | null
}

/**
 * Convierte el Markdown en páginas del documento. Reglas:
 *  - Un encabezado de primer nivel único al inicio es el título del documento.
 *  - Los encabezados del nivel superior abren página; los del siguiente nivel
 *    abren página con el capítulo como antetítulo cuando sus secciones son
 *    sustanciales, o quedan como subtítulos dentro de la página si son cortas.
 *  - Una sección que no cabe en una hoja A4 continúa en páginas siguientes con
 *    el mismo título, ocultas del índice.
 * Nada se resume ni se omite: cada nodo del Markdown termina en un bloque.
 */
export function markdownToPages(markdown: string, opts: { fallbackTitle?: string; startNum?: number } = {}): PagesResult {
  const nodes = parseMarkdown(markdown)
  let docTitle: string | null = null

  // título del documento: primer nodo, encabezado del nivel mínimo, sin otro igual
  const headings = nodes.filter((n): n is Extract<MdNode, { type: 'h' }> => n.type === 'h')
  if (headings.length && nodes[0]?.type === 'h') {
    const top = Math.min(...headings.map((h) => h.level))
    const first = nodes[0] as Extract<MdNode, { type: 'h' }>
    if (first.level === top && headings.filter((h) => h.level === top).length === 1) {
      docTitle = first.text
      nodes.shift()
    }
  }

  const rest = nodes.filter((n): n is Extract<MdNode, { type: 'h' }> => n.type === 'h')
  const levels = [...new Set(rest.map((h) => h.level))].sort((a, b) => a - b)
  const L1 = levels[0] ?? 0
  const L2 = levels[1] ?? 0

  // ¿el segundo nivel abre página? Solo si sus secciones son sustanciales.
  let splitL2 = false
  if (L2) {
    let count = 0
    let weight = 0
    let current = 0
    let inL2 = false
    for (const n of nodes) {
      if (n.type === 'h' && n.level <= L2) {
        if (inL2) { weight += current; count += 1 }
        inL2 = n.level === L2
        current = 0
        continue
      }
      if (inL2) { const b = nodeToBlock(n); if (b) current += blockWeight(b) }
    }
    if (inL2) { weight += current; count += 1 }
    splitL2 = count > 0 && weight / count >= 900
  }

  type Section = { title: string; kicker: string; blocks: PageBlock[] }
  const sections: Section[] = []
  let chapter = ''
  let section: Section | null = null
  const open = (title: string, kicker: string) => {
    // la sección anterior quedó sin cuerpo (dos títulos seguidos, un índice…):
    // su título no se pierde, pasa como subtítulo al inicio de la nueva
    const carried: PageBlock[] = []
    const last = sections[sections.length - 1]
    if (section && last === section && !section.blocks.length && section.title) {
      sections.pop()
      carried.push({ type: 'h3', text: section.title })
    }
    section = { title, kicker, blocks: carried }
    sections.push(section)
  }

  for (const n of nodes) {
    if (n.type === 'hr') { section = null; continue } // una regla cierra la página
    if (n.type === 'h') {
      if (n.level === L1) { chapter = n.text; open(n.text, ''); continue }
      if (n.level === L2 && splitL2) { open(n.text, chapter); continue }
      if (!section) open(chapter || docTitle || opts.fallbackTitle || 'Contenido', '')
      section!.blocks.push({ type: 'h3', text: n.text })
      continue
    }
    const block = nodeToBlock(n)
    if (!block) continue
    if (!section) open(docTitle || opts.fallbackTitle || 'Contenido', '')
    section!.blocks.push(block)
  }

  // partir por capacidad de hoja
  const pages: DocPage[] = []
  const ids = new Set<string>()
  let num = opts.startNum ?? 1
  for (const s of sections) {
    if (!s.blocks.length && !s.title) continue
    const base = slug(s.title)
    const numStr = String(num).padStart(2, '0')
    num += 1
    let acc = 0
    let chunk: PageBlock[] = []
    let part = 0
    const emit = () => {
      let id = part === 0 ? base : `${base}-${part + 1}`
      while (ids.has(id)) id = `${id}-${Math.random().toString(36).slice(2, 5)}`
      ids.add(id)
      pages.push({
        id,
        num: numStr,
        kicker: s.kicker,
        title: s.title,
        ...(part > 0 ? { tocHidden: true } : {}),
        blocks: chunk,
      })
      part += 1
      chunk = []
      acc = 0
    }
    // un bloque que por sí solo desborda la hoja se trocea antes de empaquetar
    const pieces: PageBlock[] = []
    for (const b of s.blocks) {
      const w = blockWeight(b)
      if (w <= PAGE_CAPACITY) { pieces.push(b); continue }
      if (b.type === 'table') {
        const rows: string[][] = b.rows
        const per = Math.max(3, Math.floor(rows.length * (PAGE_CAPACITY / w)))
        for (let k = 0; k < rows.length; k += per) pieces.push({ ...b, rows: rows.slice(k, k + per) })
      } else if (b.type === 'p' || b.type === 'lede') {
        for (const piece of splitLongText(String(b.text), PAGE_CAPACITY - 300)) pieces.push({ ...b, text: piece })
      } else if (b.type === 'list') {
        for (const piece of chunkList(b.items as string[], PAGE_CAPACITY - 300)) pieces.push({ ...b, items: piece })
      } else {
        pieces.push(b)
      }
    }
    for (const b of pieces) {
      const w = blockWeight(b)
      if (chunk.length && acc + w > PAGE_CAPACITY) emit()
      chunk.push(b)
      acc += w
    }
    if (chunk.length || part === 0) emit()
  }

  return { pages, docTitle }
}

function splitLongText(text: string, max: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const out: string[] = []
  let buf = ''
  for (const s of sentences) {
    if (buf && buf.length + s.length + 1 > max) { out.push(buf); buf = s }
    else buf = buf ? `${buf} ${s}` : s
  }
  if (buf) out.push(buf)
  return out.length ? out : [text]
}

function chunkList(items: string[], max: number): string[][] {
  const out: string[][] = []
  let buf: string[] = []
  let acc = 0
  for (const it of items) {
    if (buf.length && acc + it.length + 50 > max) { out.push(buf); buf = []; acc = 0 }
    buf.push(it)
    acc += it.length + 50
  }
  if (buf.length) out.push(buf)
  return out
}

// ── Saneado de páginas (lo que llega de la IA o del cliente) ─────────────────

const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const sl = (v: unknown, max: number, each: number) =>
  Array.isArray(v) ? v.map((x) => s(x, each)).filter(Boolean).slice(0, max) : []
const align = (v: unknown) => (['left', 'center', 'right', 'justify'].includes(v as string) ? { align: v } : {})
const tone = (v: unknown) => (['cyan', 'deep', 'gold'].includes(v as string) ? v : 'cyan')
const num = (v: unknown, def = 1) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : def }

export const PAGE_BLOCK_TYPES = new Set([
  'lede', 'p', 'h3', 'list', 'box', 'note', 'table', 'cards', 'phase', 'img', 'invoice', 'payments', 'toc', 'team', 'letterhead', 'timeline', 'gantt',
  'grid', 'icon', 'button',
])
const ICON_COLORS = new Set(['navy', 'cyan', 'gold', 'muted'])
const safeUrl = (v: unknown) => {
  const u = s(v, 1000)
  return /^(https?:\/\/|mailto:|tel:|\/)/i.test(u) ? u : ''
}

export function sanitizeBlock(raw: any): PageBlock | null {
  if (!raw || typeof raw !== 'object') return null
  const type = String(raw.type || '')
  switch (type) {
    case 'lede':
    case 'p':
    case 'h3':
    case 'note': {
      const text = s(raw.text, type === 'p' || type === 'lede' ? 8000 : 600)
      return text ? { type, text, ...align(raw.align) } : null
    }
    case 'list': {
      const items = sl(raw.items, 40, 800)
      return items.length ? { type, items, ...align(raw.align) } : null
    }
    case 'box': {
      const body = s(raw.body, 4000)
      return body ? { type, title: s(raw.title, 200), body, ...align(raw.align) } : null
    }
    case 'table': {
      const rows = Array.isArray(raw.rows) ? raw.rows.slice(0, 60).map((r: any) => sl(Array.isArray(r) ? r : [], 10, 600)).filter((r: string[]) => r.length) : []
      const headers = sl(raw.headers, 10, 200)
      if (!rows.length && !headers.length) return null
      const out: PageBlock = { type, rows }
      if (headers.length) out.headers = headers
      if (raw.firstCol === 'plain' || raw.firstCol === 'key') out.firstCol = raw.firstCol
      if (Array.isArray(raw.colAlign)) out.colAlign = raw.colAlign.map((a: unknown) => (['left', 'center', 'right', 'justify'].includes(a as string) ? a : 'left'))
      return out
    }
    case 'cards': {
      const items = Array.isArray(raw.items)
        ? raw.items.slice(0, 9).map((c: any) => ({ tag: s(c?.tag, 60), title: s(c?.title, 200), body: s(c?.body, 2000), foot: s(c?.foot, 300) })).filter((c: any) => c.title || c.body)
        : []
      return items.length ? { type, cols: raw.cols === 3 ? 3 : 2, items } : null
    }
    case 'phase': {
      const defs = Array.isArray(raw.defs) ? raw.defs.slice(0, 12).map((d: any) => ({ term: s(d?.term, 80), desc: s(d?.desc, 1500), ...(d?.strong ? { strong: true } : {}) })).filter((d: any) => d.term || d.desc) : []
      const name = s(raw.name, 200)
      return name || defs.length ? { type, id: s(raw.id, 40), name, when: s(raw.when, 120), defs } : null
    }
    case 'img': {
      const url = s(raw.url, 1000)
      return url ? { type, url, caption: s(raw.caption, 400), wide: raw.wide !== false } : null
    }
    case 'grid': {
      // cuadrícula de 2 a 6 columnas; cada celda es una lista de elementos (sin cuadrículas anidadas)
      const cols = Math.min(6, Math.max(2, num(raw.cols, 2)))
      const rawCells: unknown[] = Array.isArray(raw.cells) ? raw.cells.slice(0, 12) : []
      const cells = rawCells.map((cell) => (Array.isArray(cell) ? cell.map((b) => (b && typeof b === 'object' && (b as any).type !== 'grid' ? sanitizeBlock(b) : null)).filter(Boolean).slice(0, 12) : []))
      while (cells.length < cols) cells.push([])
      return { type, cols, cells, ...(raw.gap === 'sm' ? { gap: 'sm' } : {}) }
    }
    case 'icon': {
      const name = s(raw.name, 60).toLowerCase()
      if (!/^[a-z0-9-]+$/.test(name)) return null
      return { type, name, size: Math.min(160, Math.max(16, num(raw.size, 40))), color: ICON_COLORS.has(raw.color) ? raw.color : 'navy', label: s(raw.label, 160), ...align(raw.align) }
    }
    case 'button': {
      const label = s(raw.label, 120)
      const url = safeUrl(raw.url)
      return label ? { type, label, url, style: raw.style === 'outline' ? 'outline' : 'primary', ...align(raw.align) } : null
    }
    case 'invoice': {
      const rows = Array.isArray(raw.rows) ? raw.rows.slice(0, 30).map((r: any) => ({ concept: s(r?.concept, 300), detail: s(r?.detail, 800), amount: s(r?.amount, 60) })).filter((r: any) => r.concept) : []
      const out: PageBlock = { type, note: s(raw.note, 1000) }
      if (rows.length) out.rows = rows
      if (raw.totalLabel) out.totalLabel = s(raw.totalLabel, 120)
      if (raw.total) out.total = s(raw.total, 60)
      return out
    }
    case 'payments': {
      const items = Array.isArray(raw.items) ? raw.items.slice(0, 10).map((p: any) => ({ pct: s(p?.pct, 20), label: s(p?.label, 400) })).filter((p: any) => p.pct || p.label) : []
      return items.length ? { type, items } : null
    }
    case 'toc':
      return { type, note: s(raw.note, 400) }
    case 'team': {
      const items = Array.isArray(raw.items) ? raw.items.slice(0, 12).map((m: any) => ({ role: s(m?.role, 160), dedication: s(m?.dedication, 200), functions: sl(m?.functions, 10, 300) })).filter((m: any) => m.role) : []
      return items.length ? { type, items } : null
    }
    case 'letterhead':
      return { type, date: s(raw.date, 80), addressee: s(raw.addressee, 600), subject: s(raw.subject, 400), salutation: s(raw.salutation, 160) }
    case 'timeline': {
      const segments = Array.isArray(raw.segments) ? raw.segments.slice(0, 10).map((g: any) => ({ label: s(g?.label, 80), weight: Math.max(1, num(g?.weight, 1)), tone: tone(g?.tone) })) : []
      return segments.length ? { type, segments, marks: sl(raw.marks, 12, 80), note: s(raw.note, 400) } : null
    }
    case 'gantt': {
      const cols = sl(raw.cols, 24, 40)
      const rows = Array.isArray(raw.rows) ? raw.rows.slice(0, 24).map((r: any) => ({ label: s(r?.label, 160), from: Math.max(1, num(r?.from, 1)), to: Math.max(1, num(r?.to, 1)), tone: tone(r?.tone), ...(r?.bold ? { bold: true } : {}) })).filter((r: any) => r.label) : []
      return cols.length && rows.length ? { type, cols, rows, note: s(raw.note, 400) } : null
    }
    default:
      return null
  }
}

export function sanitizePage(raw: any, index: number, used: Set<string>): DocPage | null {
  if (!raw || typeof raw !== 'object') return null
  const blocks = Array.isArray(raw.blocks) ? raw.blocks.map(sanitizeBlock).filter(Boolean).slice(0, 60) as PageBlock[] : []
  const title = s(raw.title, 200)
  if (!blocks.length && !title) return null
  let id = s(raw.id, 60).replace(/[^a-zA-Z0-9_-]/g, '') || `${slug(title) || 'pag'}-${index + 1}`
  while (used.has(id)) id = `${id}-${Math.random().toString(36).slice(2, 5)}`
  used.add(id)
  return {
    id,
    num: s(raw.num, 8),
    kicker: s(raw.kicker, 120),
    title,
    ...(raw.tocHidden === true ? { tocHidden: true } : {}),
    blocks,
  }
}

export function sanitizePages(raw: unknown): DocPage[] {
  if (!Array.isArray(raw)) return []
  const used = new Set<string>()
  return raw.slice(0, 80).map((p, i) => sanitizePage(p, i, used)).filter(Boolean) as DocPage[]
}

/** Renumera las páginas 01, 02… conservando el número compartido de las continuaciones. */
export function renumberPages(pages: DocPage[]): DocPage[] {
  let n = 0
  let prevTitle: string | undefined
  return pages.map((p) => {
    const continuation = p.tocHidden && p.title && p.title === prevTitle
    if (!continuation) n += 1
    prevTitle = p.title
    return { ...p, num: p.num === '—' ? '—' : String(n).padStart(2, '0') }
  })
}
