/**
 * Learning Builder · dominio compartido del OVA.
 *
 * Este archivo es la única fuente de verdad del formato: lo importa la UI del
 * editor (src/learning) y también el API (api/learning, api/_lib/lb-*), así que
 * no puede depender de React ni de APIs del navegador.
 *
 * Un OVA es una lista de lecciones y cada lección una lista de bloques
 * tipados. Qué bloques se permiten, qué estructura es obligatoria y con qué
 * marca se publica lo deciden las directivas del workspace (LbDirectives, en
 * directives.ts), que viven en base de datos: aquí no hay nada codificado por
 * cliente.
 */
import type { LbIssue } from './common.js'
import type { LbDirectives } from './directives.js'

export type { LbIssue }

// ── Bloques ──────────────────────────────────────────────────────────────────

export const LB_BLOCK_TYPES = [
  'heading',
  'paragraph',
  'statement',
  'note',
  'list',
  'table',
  'quote',
  'image',
  'video',
  'accordion',
  'tabs',
  'process',
  'timeline',
  'flashcards',
  'sorting',
  'check',
  'continue',
  'divider',
] as const

export type LbBlockType = (typeof LB_BLOCK_TYPES)[number]

export type LbMedia = { url: string; alt?: string }

/**
 * Un ítem sirve a todos los bloques de lista o interacción. Cada tipo usa los
 * campos que necesita y el saneador descarta el resto, de modo que cambiar un
 * bloque de tipo no arrastra datos invisibles.
 */
export type LbItem = {
  id: string
  title?: string
  description?: string
  media?: LbMedia
  /** proceso: intro | step | summary */
  kind?: string
  /** línea de tiempo: la fecha del hito */
  date?: string
  /** clasificación: pila a la que pertenece la tarjeta */
  pileId?: string
  /** comprobación: respuesta correcta */
  correct?: boolean
  /** comprobación de emparejar: la pareja de la derecha */
  match?: string
  /** comprobación: retroalimentación de esta opción */
  feedback?: string
  /** flashcards: reverso de la tarjeta */
  back?: string
}

export type LbBlock = {
  id: string
  type: LbBlockType
  /** Variante del bloque (ver LB_BLOCK_SPECS). */
  variant?: string
  /** Texto principal: prosa, título, statement, recuadro, enunciado, cita. */
  text?: string
  /** Segundo texto: pie de imagen, autor de la cita, pista del botón continuar. */
  caption?: string
  media?: LbMedia
  items?: LbItem[]
  /** clasificación: las pilas de destino */
  piles?: Array<{ id: string; title: string }>
  /** comprobación: exigir acierto para avanzar */
  required?: boolean
}

export type LbBlockSpec = {
  type: LbBlockType
  label: string
  /** Agrupación en la paleta del editor. */
  group: 'texto' | 'medios' | 'interaccion' | 'evaluacion' | 'estructura'
  hint: string
  variants?: Array<{ value: string; label: string }>
  /** Qué campos edita este bloque; gobierna el panel de propiedades. */
  fields: Array<'text' | 'caption' | 'media' | 'items' | 'piles' | 'required'>
  /** Subcampos que muestra cada ítem, cuando el bloque usa items. */
  itemFields?: Array<'title' | 'description' | 'media' | 'kind' | 'date' | 'pileId' | 'correct' | 'match' | 'feedback' | 'back'>
  itemLabel?: string
}

export const LB_BLOCK_SPECS: Record<LbBlockType, LbBlockSpec> = {
  heading: {
    type: 'heading', label: 'Título', group: 'texto', fields: ['text'],
    hint: 'Abre un apartado dentro de la lección.',
    variants: [{ value: 'h2', label: 'Título' }, { value: 'h3', label: 'Subtítulo' }],
  },
  paragraph: {
    type: 'paragraph', label: 'Párrafo', group: 'texto', fields: ['text'],
    hint: 'Prosa del contenido. Admite **negrita** y *cursiva*.',
  },
  statement: {
    type: 'statement', label: 'Frase destacada', group: 'texto', fields: ['text'],
    hint: 'Una idea sola en pantalla, a modo de pórtico.',
    variants: [{ value: 'a', label: 'Centrada' }, { value: 'b', label: 'Con filete' }, { value: 'c', label: 'Sobre color' }],
  },
  note: {
    type: 'note', label: 'Recuadro', group: 'texto', fields: ['text', 'caption'],
    hint: 'Nota al margen: dato clave, advertencia o ejemplo.',
    variants: [
      { value: 'info', label: 'Dato clave' },
      { value: 'warning', label: 'Advertencia' },
      { value: 'success', label: 'Buena práctica' },
      { value: 'example', label: 'Ejemplo' },
    ],
  },
  list: {
    type: 'list', label: 'Lista', group: 'texto', fields: ['items'], itemFields: ['title'], itemLabel: 'Elemento',
    hint: 'Enumera puntos con viñeta, número o casilla.',
    variants: [
      { value: 'bulleted', label: 'Viñetas' },
      { value: 'numbered', label: 'Numerada' },
      { value: 'checklist', label: 'Casillas' },
    ],
  },
  table: {
    type: 'table', label: 'Tabla', group: 'texto', fields: ['text', 'items'], itemFields: ['title', 'description'], itemLabel: 'Fila',
    hint: 'Dos columnas. El texto principal son los encabezados, separados por " | ".',
  },
  quote: {
    type: 'quote', label: 'Cita', group: 'texto', fields: ['text', 'caption'],
    hint: 'Cita textual con su fuente en norma APA.',
  },
  image: {
    type: 'image', label: 'Imagen', group: 'medios', fields: ['media', 'caption', 'text'],
    hint: 'Imagen con pie. La variante "texto al lado" la acompaña de prosa.',
    variants: [{ value: 'wide', label: 'Ancho completo' }, { value: 'aside', label: 'Texto al lado' }],
  },
  video: {
    type: 'video', label: 'Video', group: 'medios', fields: ['media', 'caption'],
    hint: 'URL de YouTube, Vimeo o archivo MP4.',
  },
  accordion: {
    type: 'accordion', label: 'Acordeón', group: 'interaccion', fields: ['items'],
    itemFields: ['title', 'description'], itemLabel: 'Panel',
    hint: 'Paneles que el estudiante abre uno a uno.',
  },
  tabs: {
    type: 'tabs', label: 'Pestañas', group: 'interaccion', fields: ['items'],
    itemFields: ['title', 'description', 'media'], itemLabel: 'Pestaña',
    hint: 'Contenido paralelo, una pestaña por faceta.',
  },
  process: {
    type: 'process', label: 'Proceso', group: 'interaccion', fields: ['items'],
    itemFields: ['title', 'description', 'kind'], itemLabel: 'Paso',
    hint: 'Pasos numerados que se recorren en orden.',
  },
  timeline: {
    type: 'timeline', label: 'Línea de tiempo', group: 'interaccion', fields: ['items'],
    itemFields: ['date', 'title', 'description'], itemLabel: 'Hito',
    hint: 'Hitos fechados en secuencia.',
  },
  flashcards: {
    type: 'flashcards', label: 'Tarjetas', group: 'interaccion', fields: ['items'],
    itemFields: ['title', 'back', 'media'], itemLabel: 'Tarjeta',
    hint: 'Tarjetas de dos caras para repasar conceptos.',
  },
  sorting: {
    type: 'sorting', label: 'Clasificación', group: 'interaccion', fields: ['items', 'piles'],
    itemFields: ['title', 'pileId'], itemLabel: 'Tarjeta',
    hint: 'El estudiante reparte tarjetas entre categorías.',
  },
  check: {
    type: 'check', label: 'Comprobación', group: 'evaluacion', fields: ['text', 'items', 'required'],
    itemFields: ['title', 'correct', 'match', 'feedback'], itemLabel: 'Opción',
    hint: 'Comprobación de conocimiento: no califica, retroalimenta.',
    variants: [
      { value: 'choice', label: 'Opción única' },
      { value: 'multiple', label: 'Opción múltiple' },
      { value: 'matching', label: 'Emparejar' },
      { value: 'fillin', label: 'Completar' },
    ],
  },
  continue: {
    type: 'continue', label: 'Continuar', group: 'estructura', fields: ['text', 'caption'],
    hint: 'Botón que retiene al estudiante hasta que decide avanzar.',
  },
  divider: {
    type: 'divider', label: 'Separador', group: 'estructura', fields: [],
    hint: 'Aire entre apartados.',
    variants: [{ value: 'space', label: 'Espacio' }, { value: 'line', label: 'Filete' }],
  },
}

export function defaultVariant(type: LbBlockType): string | undefined {
  return LB_BLOCK_SPECS[type].variants?.[0]?.value
}

// ── Contenido del OVA ────────────────────────────────────────────────────────

export type LbLesson = {
  id: string
  title: string
  /** Clave de la sección obligatoria que cubre esta lección, si aplica. */
  sectionKey?: string
  blocks: LbBlock[]
}

export type LbCover = {
  kicker?: string
  title?: string
  subtitle?: string
  summary?: string
  media?: LbMedia
  /** Resultados de aprendizaje declarados de la unidad. */
  outcomes?: string[]
}

export type LbContent = {
  cover: LbCover
  lessons: LbLesson[]
}


// ── Saneamiento ──────────────────────────────────────────────────────────────

const MAX_LESSONS = 40
const MAX_BLOCKS_PER_LESSON = 200
const MAX_ITEMS = 40
const MAX_TEXT = 8000

function str(value: unknown, max = 400): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[^\P{Cc}\n\t]/gu, '').slice(0, max)
}

function ident(value: unknown, prefix: string): string {
  const raw = str(value, 40).replace(/[^a-zA-Z0-9_-]/g, '')
  return raw || newId(prefix)
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function sanitizeMedia(value: unknown): LbMedia | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  const url = str(raw.url, 1200).trim()
  // Solo esquemas que un navegador puede pintar sin ejecutar nada.
  if (!url || !/^(https?:\/\/|\/)/i.test(url)) return undefined
  const alt = str(raw.alt, 300)
  return alt ? { url, alt } : { url }
}

function sanitizeItem(value: unknown): LbItem {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const item: LbItem = { id: ident(raw.id, 'i') }
  const title = str(raw.title, 600); if (title) item.title = title
  const description = str(raw.description, MAX_TEXT); if (description) item.description = description
  const media = sanitizeMedia(raw.media); if (media) item.media = media
  const kind = str(raw.kind, 30); if (kind) item.kind = kind
  const date = str(raw.date, 60); if (date) item.date = date
  const pileId = str(raw.pileId, 40); if (pileId) item.pileId = pileId
  if (raw.correct === true) item.correct = true
  const match = str(raw.match, 300); if (match) item.match = match
  const feedback = str(raw.feedback, 1000); if (feedback) item.feedback = feedback
  const back = str(raw.back, 1000); if (back) item.back = back
  return item
}

export function sanitizeBlock(value: unknown, allowed?: LbBlockType[]): LbBlock | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const type = String(raw.type || '') as LbBlockType
  if (!LB_BLOCK_TYPES.includes(type)) return null
  if (allowed && allowed.length && !allowed.includes(type)) return null

  const spec = LB_BLOCK_SPECS[type]
  const block: LbBlock = { id: ident(raw.id, 'b'), type }

  if (spec.variants) {
    const variant = str(raw.variant, 30)
    block.variant = spec.variants.some((v) => v.value === variant) ? variant : spec.variants[0].value
  }
  if (spec.fields.includes('text')) {
    const text = str(raw.text, MAX_TEXT)
    if (text) block.text = text
  }
  if (spec.fields.includes('caption')) {
    const caption = str(raw.caption, 1000)
    if (caption) block.caption = caption
  }
  if (spec.fields.includes('media')) {
    const media = sanitizeMedia(raw.media)
    if (media) block.media = media
  }
  if (spec.fields.includes('items')) {
    block.items = Array.isArray(raw.items) ? raw.items.slice(0, MAX_ITEMS).map(sanitizeItem) : []
  }
  if (spec.fields.includes('piles')) {
    const piles = Array.isArray(raw.piles) ? (raw.piles as unknown[]).slice(0, 8) : []
    block.piles = piles.map((pile) => {
      const rawPile = (pile && typeof pile === 'object' ? pile : {}) as Record<string, unknown>
      return { id: ident(rawPile.id, 'p'), title: str(rawPile.title, 120) }
    })
  }
  if (spec.fields.includes('required') && raw.required === true) block.required = true

  return block
}

export function sanitizeLesson(value: unknown, allowed?: LbBlockType[]): LbLesson {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const blocksRaw = Array.isArray(raw.blocks) ? raw.blocks.slice(0, MAX_BLOCKS_PER_LESSON) : []
  const blocks: LbBlock[] = []
  for (const candidate of blocksRaw) {
    const block = sanitizeBlock(candidate, allowed)
    if (block) blocks.push(block)
  }
  const lesson: LbLesson = {
    id: ident(raw.id, 'l'),
    title: str(raw.title, 240) || 'Sin título',
    blocks,
  }
  const sectionKey = str(raw.sectionKey, 40)
  if (sectionKey) lesson.sectionKey = sectionKey
  return lesson
}

export function sanitizeContent(value: unknown, directives?: LbDirectives): LbContent {
  const allowed = directives?.instructional.blocks
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const rawCover = (raw.cover && typeof raw.cover === 'object' ? raw.cover : {}) as Record<string, unknown>

  const cover: LbCover = {}
  const kicker = str(rawCover.kicker, 160); if (kicker) cover.kicker = kicker
  const title = str(rawCover.title, 240); if (title) cover.title = title
  const subtitle = str(rawCover.subtitle, 400); if (subtitle) cover.subtitle = subtitle
  const summary = str(rawCover.summary, 2000); if (summary) cover.summary = summary
  const media = sanitizeMedia(rawCover.media); if (media) cover.media = media
  if (Array.isArray(rawCover.outcomes)) {
    const outcomes = (rawCover.outcomes as unknown[]).slice(0, 12).map((o) => str(o, 400)).filter(Boolean)
    if (outcomes.length) cover.outcomes = outcomes
  }

  const lessonsRaw = Array.isArray(raw.lessons) ? raw.lessons.slice(0, MAX_LESSONS) : []
  return { cover, lessons: lessonsRaw.map((lesson) => sanitizeLesson(lesson, allowed)) }
}


// ── Validación contra las directivas del workspace ───────────────────────────


/**
 * Comprueba el recurso contra las directivas instruccionales de su workspace.
 * Los errores impiden publicar y exportar; las advertencias solo se muestran.
 * No modifica nada.
 */
export function validateOva(content: LbContent, directives: LbDirectives): LbIssue[] {
  const issues: LbIssue[] = []
  const structure = directives.instructional
  const rules = structure.rules

  if (!content.cover.title) issues.push({ level: 'error', message: 'La portada no tiene título.' })
  if (rules.requireCoverSummary && !content.cover.summary) {
    issues.push({ level: 'error', message: 'La portada necesita una presentación breve.' })
  }
  if (rules.requireOutcomes && !(content.cover.outcomes || []).length) {
    issues.push({ level: 'error', message: 'Faltan los resultados de aprendizaje de la unidad.' })
  }

  const label = structure.lessonLabel.toLowerCase()
  if (content.lessons.length < structure.minLessons) {
    issues.push({ level: 'error', message: `Este workspace exige al menos ${structure.minLessons} ${label}(es); hay ${content.lessons.length}.` })
  }
  if (content.lessons.length > structure.maxLessons) {
    issues.push({ level: 'error', message: `Este workspace admite máximo ${structure.maxLessons} ${label}(es); hay ${content.lessons.length}.` })
  }

  for (const section of structure.sections) {
    if (!section.required) continue
    if (!content.lessons.some((lesson) => lesson.sectionKey === section.key)) {
      issues.push({ level: 'error', message: `Falta la sección obligatoria «${section.title}».` })
    }
  }

  let totalChecks = 0
  for (const lesson of content.lessons) {
    const checks = lesson.blocks.filter((block) => block.type === 'check')
    totalChecks += checks.length
    if (rules.minChecksPerLesson && checks.length < rules.minChecksPerLesson) {
      issues.push({
        level: 'error', lessonId: lesson.id,
        message: `«${lesson.title}» necesita ${rules.minChecksPerLesson} comprobación(es) y tiene ${checks.length}.`,
      })
    }
    if (!lesson.blocks.length) {
      issues.push({ level: 'warning', lessonId: lesson.id, message: `«${lesson.title}» está vacía.` })
    }

    for (const block of lesson.blocks) {
      if (!structure.blocks.includes(block.type)) {
        issues.push({
          level: 'error', lessonId: lesson.id, blockId: block.id,
          message: `El bloque «${LB_BLOCK_SPECS[block.type].label}» no está habilitado en este workspace.`,
        })
      }
      if (block.type === 'paragraph' && (block.text || '').length > rules.maxParagraphChars) {
        issues.push({
          level: 'warning', lessonId: lesson.id, blockId: block.id,
          message: `Un párrafo supera los ${rules.maxParagraphChars} caracteres.`,
        })
      }
      if (block.type === 'image') {
        if (!block.media?.url) {
          issues.push({ level: 'error', lessonId: lesson.id, blockId: block.id, message: 'Hay una imagen sin archivo.' })
        } else if (rules.requireImageAlt && !block.media.alt) {
          issues.push({ level: 'error', lessonId: lesson.id, blockId: block.id, message: 'Una imagen no tiene texto alternativo.' })
        }
      }
      if (block.type === 'check') {
        const items = block.items || []
        if (!block.text) {
          issues.push({ level: 'error', lessonId: lesson.id, blockId: block.id, message: 'Una comprobación no tiene enunciado.' })
        }
        if (items.length < 2 && block.variant !== 'fillin') {
          issues.push({ level: 'error', lessonId: lesson.id, blockId: block.id, message: 'Una comprobación necesita al menos dos opciones.' })
        }
        if (block.variant !== 'matching' && block.variant !== 'fillin' && !items.some((item) => item.correct)) {
          issues.push({ level: 'error', lessonId: lesson.id, blockId: block.id, message: 'Una comprobación no tiene respuesta correcta marcada.' })
        }
        if (block.variant === 'matching' && items.some((item) => !item.match)) {
          issues.push({ level: 'error', lessonId: lesson.id, blockId: block.id, message: 'Un emparejamiento tiene parejas incompletas.' })
        }
      }
      if (block.type === 'sorting') {
        const piles = block.piles || []
        if (piles.length < 2) {
          issues.push({ level: 'error', lessonId: lesson.id, blockId: block.id, message: 'Una clasificación necesita al menos dos categorías.' })
        }
        if ((block.items || []).some((item) => !item.pileId || !piles.some((pile) => pile.id === item.pileId))) {
          issues.push({ level: 'error', lessonId: lesson.id, blockId: block.id, message: 'Hay tarjetas sin categoría asignada.' })
        }
      }
    }
  }

  if (rules.minChecksTotal && totalChecks < rules.minChecksTotal) {
    issues.push({ level: 'error', message: `El recurso necesita ${rules.minChecksTotal} comprobación(es) en total; hay ${totalChecks}.` })
  }

  return issues
}

/** Esqueleto inicial de un recurso nuevo, según las secciones obligatorias del workspace. */
export function scaffoldContent(directives: LbDirectives, title: string): LbContent {
  const sections = directives.instructional.sections
  return {
    cover: { title, summary: '', outcomes: [] },
    lessons: sections.map((section) => ({
      id: newId('l'),
      title: section.title,
      sectionKey: section.key,
      blocks: [
        { id: newId('b'), type: 'heading', variant: 'h2', text: section.title },
        { id: newId('b'), type: 'paragraph', text: section.hint || '' },
      ],
    })),
  }
}
