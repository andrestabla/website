/**
 * Learning Builder · guion .docx → bloques editables.
 *
 * Los guiones de Algoritmo T se producen con python-docx aplicando formato
 * directo, no estilos de encabezado: un título es un párrafo enteramente en
 * negrita. Por eso el conversor no puede fiarse de `<h1>`/`<h2>` y usa esa
 * convención, que es la que el documento sí respeta.
 *
 * Lo que entra y cómo sale:
 *   párrafo en negrita y corto  → título (abre una pantalla nueva)
 *   párrafo normal              → párrafo, con **negrita** y *cursiva* dentro
 *   lista                       → lista con viñetas o numerada
 *   tabla                       → tabla de dos columnas
 *   imagen incrustada           → se sube a R2 y queda como bloque de imagen
 *
 * El resultado es fiel al documento y completamente editable, que es de lo que
 * se trata: el guion deja de vivir en un archivo y pasa a vivir en el módulo.
 */
import { newId, type LbBlock, type LbContent, type LbLesson } from '../../src/learning/lib/blocks.js'
import type { LbDirectives } from '../../src/learning/lib/directives.js'
import { uploadImageToR2 } from './r2.js'

/** Un título más largo que esto es, casi seguro, un párrafo enfático. */
const HEADING_MAX_CHARS = 120

function decode(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/** Conserva negrita y cursiva con la sintaxis que entiende el editor. */
function inlineMarkdown(html: string): string {
  return decode(
    html
      .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, (_m, _t, inner) => (decode(inner) ? `**${decode(inner)}**` : ''))
      .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, (_m, _t, inner) => (decode(inner) ? `*${decode(inner)}*` : ''))
  )
}

/**
 * ¿Este título abre pantalla nueva o es un subtítulo dentro de la actual?
 *
 * En estos guiones las secciones reales van rotuladas («APARTADO 3») o en
 * mayúsculas; los subtítulos van numerados («1.1. Qué es una competencia»).
 * Sin esta distinción cada negrita abriría una pantalla y el recurso quedaría
 * partido en decenas de trozos.
 */
function headingRank(text: string): 'lesson' | 'h2' | 'h3' {
  if (/^(apartado|anexo|módulo|unidad)\b/i.test(text)) return 'lesson'
  const letters = text.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '')
  if (letters.length > 3 && letters === letters.toUpperCase()) return 'lesson'
  if (/^\d+\.\d/.test(text)) return 'h3'
  return 'h2'
}

/** ¿Es este párrafo un título? Lo es si va entero en negrita y es corto. */
function headingText(paragraphHtml: string): string | null {
  const inner = paragraphHtml.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '').trim()
  const onlyStrong = /^(<strong>[\s\S]*?<\/strong>\s*)+$/i.test(inner)
  if (!onlyStrong) return null
  const text = decode(inner)
  if (!text || text.length > HEADING_MAX_CHARS) return null
  return text
}

export type DocxImport = {
  content: LbContent
  /** Lo que no se pudo traer, dicho sin adornos. */
  warnings: string[]
  stats: { lessons: number; blocks: number; images: number }
}

/**
 * Convierte el .docx en el guion del módulo.
 *
 * `uploadFolder` decide dónde quedan las imágenes en R2; si R2 no está
 * disponible la imagen se omite y se deja constancia en `warnings`, en vez de
 * romper la importación entera.
 */
export async function docxToContent(options: {
  buffer: Buffer
  title: string
  directives: LbDirectives
  uploadFolder?: string
  uploadedBy?: string
  /** Para simulaciones: convierte sin subir nada y anota cuántas quedarían. */
  skipImages?: boolean
}): Promise<DocxImport> {
  const { buffer, title, directives } = options
  const warnings: string[] = []
  let images = 0

  const mammoth: any = (await import('mammoth')).default ?? (await import('mammoth'))

  // Las imágenes se suben a R2 mientras se convierte; si falla, se anota.
  const convertImage = mammoth.images.imgElement(async (image: any) => {
    if (options.skipImages) { images += 1; return { src: '' } }
    try {
      const raw: Buffer = await image.read()
      const { url } = await uploadImageToR2({
        buffer: raw,
        contentType: String(image.contentType || 'image/png'),
        filename: `${title}-img-${images + 1}`,
        folder: options.uploadFolder || 'learning/guiones',
        uploadedBy: options.uploadedBy,
      })
      images += 1
      return { src: url, alt: image.altText || '' }
    } catch (error: any) {
      warnings.push(`Una imagen no se pudo subir a R2: ${error?.message || error}`)
      return { src: '' }
    }
  })

  const { value: html } = await mammoth.convertToHtml({ buffer }, { convertImage })

  const lessons: LbLesson[] = []
  let current: LbLesson | null = null
  const push = (block: LbBlock) => {
    if (!current) {
      current = { id: newId('l'), title, blocks: [] }
      lessons.push(current)
    }
    current.blocks.push(block)
  }
  const openLesson = (lessonTitle: string) => {
    current = { id: newId('l'), title: lessonTitle, blocks: [] }
    lessons.push(current)
  }

  // Se recorre el HTML por bloques de nivel superior, en orden de lectura.
  const pattern = /<(p|ul|ol|table)\b[^>]*>[\s\S]*?<\/\1>/gi
  for (const match of html.matchAll(pattern)) {
    const chunk = match[0]
    const tag = match[1].toLowerCase()

    if (tag === 'p') {
      const image = chunk.match(/<img[^>]+src="([^"]+)"[^>]*>/i)
      if (image && image[1]) {
        const alt = /alt="([^"]*)"/i.exec(chunk)?.[1] || ''
        push({ id: newId('b'), type: 'image', variant: 'wide', media: { url: image[1], alt } })
        continue
      }
      const heading = headingText(chunk)
      if (heading) {
        const rank = headingRank(heading)
        if (rank === 'lesson') {
          // Abre pantalla nueva, salvo que la actual esté todavía vacía.
          if (!current || current.blocks.length) openLesson(heading)
          else current.title = heading
          push({ id: newId('b'), type: 'heading', variant: 'h2', text: heading })
        } else {
          push({ id: newId('b'), type: 'heading', variant: rank, text: heading })
        }
        continue
      }
      const text = inlineMarkdown(chunk)
      if (text) push({ id: newId('b'), type: 'paragraph', text })
      continue
    }

    if (tag === 'ul' || tag === 'ol') {
      const items = [...chunk.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((li) => inlineMarkdown(li[1]))
        .filter(Boolean)
      if (items.length) {
        push({
          id: newId('b'),
          type: 'list',
          variant: tag === 'ol' ? 'numbered' : 'bulleted',
          items: items.map((text) => ({ id: newId('i'), title: text })),
        })
      }
      continue
    }

    // Tabla: la primera fila es el encabezado, el resto pares de celdas.
    const rows = [...chunk.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((tr) =>
      [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => inlineMarkdown(cell[1]))
    )
    if (!rows.length) continue
    const [head, ...rest] = rows
    if (rest.length) {
      push({
        id: newId('b'),
        type: 'table',
        text: head.slice(0, 2).join(' | '),
        items: rest.map((row) => ({ id: newId('i'), title: row[0] || '', description: row.slice(1).join(' · ') })),
      })
    } else {
      // Tabla de una sola fila: en estos guiones es una ficha, no una tabla.
      push({ id: newId('b'), type: 'note', variant: 'info', caption: head[0] || '', text: head.slice(1).join(' · ') })
    }
  }

  if (!lessons.length) warnings.push('El documento no tenía contenido convertible.')

  // La presentación de la portada: el primer párrafo con cuerpo real.
  const summary =
    lessons
      .flatMap((lesson) => lesson.blocks)
      .find((block) => block.type === 'paragraph' && (block.text || '').length > 120)?.text || ''

  // Las secciones obligatorias del workspace se reparten sobre lo importado,
  // para que la revisión no marque como ausente algo que sí está.
  const sections = directives.instructional.sections
  if (sections.length && lessons.length) {
    lessons[0].sectionKey = sections[0].key
    if (sections.length > 1) lessons[lessons.length - 1].sectionKey = sections[sections.length - 1].key
    const middle = sections[1]?.key || sections[0].key
    for (let i = 1; i < lessons.length - 1; i++) lessons[i].sectionKey = middle
  }

  return {
    content: {
      cover: { title, summary: summary.replace(/\*\*/g, '').slice(0, 1200), outcomes: [] },
      lessons,
    },
    warnings,
    stats: { lessons: lessons.length, blocks: lessons.reduce((n, l) => n + l.blocks.length, 0), images },
  }
}
