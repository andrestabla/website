/**
 * Learning Builder · entender un paquete de Articulate Rise.
 *
 * Un Rise no es un sitio de páginas: es una aplicación que pinta el curso
 * entero desde un solo archivo de datos, `scormcontent/runtime-data.js`. Sus
 * archivos HTML son el armazón —el arranque, el marco del bloque, la
 * despedida—, no las lecciones. Listarlos como «páginas» es enseñarle al
 * editor las tripas en vez del contenido.
 *
 * Las lecciones están dentro de ese archivo, y en los cursos de Algoritmo T
 * cada lección es un documento HTML completo incrustado como bloque `html`.
 * Eso encaja con el resto del módulo sin forzar nada: cada lección se sirve y
 * se corrige como cualquier otra página, y al publicar se vuelven a meter en
 * los datos del Rise.
 *
 * El archivo de datos es un JSONP con el JSON en base64:
 *
 *     __jsonp("runtime-data.js","eyJjb3Vyc2UiOn...")
 */

import type { LbPatch } from '../../src/learning/lib/final.js'

/** Dónde vive el contenido de un Rise dentro del paquete. */
export const RISE_DATA_PATH = 'scormcontent/runtime-data.js'

/**
 * Los bloques HTML de un Rise se pintan dentro de este marco, así que sus
 * rutas relativas —«../../lib/fonts/…»— se resuelven desde aquí. Servir una
 * lección suelta con otra base la dejaría sin tipografías.
 */
export const RISE_SANDBOX_DIR = 'scormcontent/lib/sandbox/'

const JSONP = /^__jsonp\(\s*"([^"]+)"\s*,\s*"([A-Za-z0-9+/=]+)"\s*\)\s*;?\s*$/

export type RiseLesson = {
  id: string
  title: string
  /** El documento HTML de la lección, cuando es un bloque `html`. */
  html: string | null
}

export type RiseData = {
  name: string
  course: any
  raw: any
}

export function isRiseData(text: string): boolean {
  return JSONP.test(text.trim())
}

export function parseRise(text: string): RiseData | null {
  const match = JSONP.exec(text.trim())
  if (!match) return null
  try {
    const raw = JSON.parse(Buffer.from(match[2], 'base64').toString('utf8'))
    if (!raw?.course) return null
    return { name: match[1], course: raw.course, raw }
  } catch {
    return null
  }
}

export function encodeRise(data: RiseData): string {
  const json = JSON.stringify({ ...data.raw, course: data.course })
  return `__jsonp("${data.name}","${Buffer.from(json, 'utf8').toString('base64')}")`
}

/**
 * El primer bloque `html` de una lección. Los cursos de Algoritmo T tienen
 * exactamente uno y ahí está todo el contenido; si algún día hubiera más de
 * uno, se edita el primero y los demás quedan como estaban, que es preferible
 * a no dejar editar nada.
 */
function htmlHolder(lesson: any): { holder: any; index: number } | null {
  for (const block of lesson?.items || []) {
    if (block?.type !== 'html') continue
    const inner = block.items || []
    const index = inner.findIndex((row: any) => typeof row?.srcdoc === 'string')
    if (index >= 0) return { holder: inner[index], index }
  }
  return null
}

export function riseLessons(data: RiseData): RiseLesson[] {
  return (data.course?.lessons || []).map((lesson: any) => ({
    id: String(lesson?.id || ''),
    title: String(lesson?.title || 'Lección sin título'),
    html: htmlHolder(lesson)?.holder?.srcdoc ?? null,
  })).filter((lesson: RiseLesson) => lesson.id)
}

// ── Rutas virtuales de las lecciones ─────────────────────────────────────────

/**
 * Una lección no es un archivo, así que se le da una ruta que no pueda
 * chocar con ninguna del paquete. El prefijo la identifica sin ambigüedad
 * para quien sirve y para quien exporta.
 */
const LESSON = /^~leccion\/([A-Za-z0-9_-]+)\.html$/

export function riseLessonPath(id: string): string {
  return `~leccion/${id}.html`
}

export function riseLessonId(path: string): string {
  return LESSON.exec(path)?.[1] || ''
}

export function isRiseLessonPath(path: string): boolean {
  return LESSON.test(path)
}

/**
 * Devuelve los datos con las correcciones metidas dentro de cada lección.
 *
 * No se reescribe el HTML aquí: se le añade el mismo script que aplica las
 * ediciones en el navegador, el que usa todo lo demás. Una sola forma de
 * aplicar una corrección, y por tanto una sola forma de equivocarse.
 */
export function riseWithEdits(
  data: RiseData,
  patches: Record<string, LbPatch[]>,
  inject: (html: string, pagePatches: LbPatch[]) => string
): RiseData {
  const lessons = (data.course?.lessons || []).map((lesson: any) => {
    const pagePatches = patches[riseLessonPath(String(lesson?.id || ''))]
    if (!pagePatches?.length) return lesson
    const found = htmlHolder(lesson)
    if (!found) return lesson

    const items = lesson.items.map((block: any) => {
      if (block?.type !== 'html') return block
      const inner = (block.items || []).map((row: any) =>
        row === found.holder ? { ...row, srcdoc: inject(row.srcdoc, pagePatches) } : row
      )
      return { ...block, items: inner }
    })
    return { ...lesson, items }
  })
  return { ...data, course: { ...data.course, lessons } }
}
