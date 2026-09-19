/**
 * Learning Builder · directivas del workspace.
 *
 * Cada workspace (un cliente) fija cómo se ve y cómo se escribe todo lo que se
 * produce dentro de él. Son tres cuerpos separados a propósito, porque los
 * gobiernan personas distintas:
 *
 *  - `graphic`: la línea gráfica — color, tipografía, logo, aire. La fija quien
 *    cuida la marca del cliente.
 *  - `instructional`: el modelo pedagógico — cómo se llama cada pantalla, qué
 *    secciones son obligatorias, qué bloques existen, qué exige la revisión y
 *    con qué voz escribe la IA. La fija el diseñador instruccional líder.
 *  - `exports`: qué se puede entregar y cómo se comparte.
 *
 * Viven en base de datos y aplican a todos los recursos del workspace: cambiar
 * una directiva cambia la validación y el render de todo el workspace, no de
 * una pieza suelta.
 *
 * Lo importa la UI y también el API, así que no puede depender de React.
 */
import { LB_BLOCK_TYPES, type LbBlockType } from './blocks'

export type LbGraphicDirectives = {
  accent: string
  accentDark: string
  surface: string
  text: string
  muted: string
  headingFont: string
  bodyFont: string
  logoUrl?: string
  footerText?: string
  /** Radio de las esquinas en px; 0 = recto. */
  corners: number
  /** Densidad de la composición: afecta márgenes y tamaño de texto. */
  density: 'compact' | 'regular' | 'airy'
}

export type LbSection = { key: string; title: string; hint?: string; required: boolean }

export type LbInstructionalDirectives = {
  /** Bloques habilitados; el editor solo ofrece estos. */
  blocks: LbBlockType[]
  /** Cómo llama el cliente a cada pantalla navegable: Lección, Tema, Momento… */
  lessonLabel: string
  minLessons: number
  maxLessons: number
  /** Secciones que todo recurso del workspace debe cubrir. */
  sections: LbSection[]
  rules: {
    minChecksPerLesson: number
    minChecksTotal: number
    maxParagraphChars: number
    requireImageAlt: boolean
    requireCoverSummary: boolean
    requireOutcomes: boolean
  }
  ai: {
    tone: string
    readingLevel: string
    blocksPerLesson: number
    /** Manual de estilo del cliente: terminología, citación, prohibiciones. */
    instructions: string
    /** Norma de citación que la IA debe seguir al usar fuentes de datos. */
    citationStyle: string
  }
}

export type LbExportDirectives = {
  scorm: boolean
  html: boolean
  publicLink: boolean
  /** Permite incrustar el recurso en otra página con <iframe>. */
  embed: boolean
  /** Prefijo del identifier del imsmanifest, por convención del campus. */
  scormPrefix: string
  /** Cuándo el paquete reporta "completed" al LMS. */
  completion: 'visit-all' | 'checks-passed' | 'immediate'
}

export type LbDirectives = {
  graphic: LbGraphicDirectives
  instructional: LbInstructionalDirectives
  exports: LbExportDirectives
}

export const LB_DEFAULT_DIRECTIVES: LbDirectives = {
  graphic: {
    accent: '#4f46e5',
    accentDark: '#3730a3',
    surface: '#ffffff',
    text: '#0f172a',
    muted: '#475569',
    headingFont: 'Montserrat, system-ui, sans-serif',
    bodyFont: 'system-ui, -apple-system, Segoe UI, sans-serif',
    footerText: '',
    corners: 12,
    density: 'regular',
  },
  instructional: {
    blocks: [...LB_BLOCK_TYPES],
    lessonLabel: 'Lección',
    minLessons: 2,
    maxLessons: 12,
    sections: [
      { key: 'inicio', title: 'Punto de partida', hint: 'Contexto y pregunta que abre la unidad.', required: true },
      { key: 'desarrollo', title: 'Desarrollo', hint: 'El cuerpo conceptual del tema.', required: true },
      { key: 'cierre', title: 'Cierre', hint: 'Síntesis y transferencia a la práctica.', required: true },
    ],
    rules: {
      minChecksPerLesson: 0,
      minChecksTotal: 1,
      maxParagraphChars: 1200,
      requireImageAlt: true,
      requireCoverSummary: true,
      requireOutcomes: false,
    },
    ai: {
      tone: 'Académico claro, en tercera persona, sin lenguaje comercial.',
      readingLevel: 'Pregrado',
      blocksPerLesson: 8,
      instructions: '',
      citationStyle: 'APA 7',
    },
  },
  exports: {
    scorm: true,
    html: true,
    publicLink: true,
    embed: true,
    scormPrefix: 'OVA',
    completion: 'visit-all',
  },
}

// ── Saneamiento ──────────────────────────────────────────────────────────────

function str(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[^\P{Cc}\n\t]/gu, '').slice(0, max)
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function color(value: unknown, fallback: string): string {
  const raw = str(value, 30).trim()
  return /^#[0-9a-fA-F]{3,8}$/.test(raw) ? raw : fallback
}

function url(value: unknown): string | undefined {
  const raw = str(value, 1200).trim()
  return raw && /^(https?:\/\/|\/)/i.test(raw) ? raw : undefined
}

function pick<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  const raw = str(value, 40)
  return (options as readonly string[]).includes(raw) ? (raw as T) : fallback
}

export function sanitizeSections(value: unknown, fallback: LbSection[]): LbSection[] {
  if (!Array.isArray(value)) return fallback
  const sections = value.slice(0, 12).map((section) => {
    const raw = (section && typeof section === 'object' ? section : {}) as Record<string, unknown>
    const key = str(raw.key, 40).replace(/[^a-zA-Z0-9_-]/g, '')
    return {
      key: key || `seccion-${Math.random().toString(36).slice(2, 8)}`,
      title: str(raw.title, 160) || 'Sección',
      hint: str(raw.hint, 400),
      required: raw.required !== false,
    }
  })
  // Dos secciones con la misma clave harían imposible saber cuál cubre una
  // lección, así que la segunda se descarta.
  const seen = new Set<string>()
  return sections.filter((section) => (seen.has(section.key) ? false : (seen.add(section.key), true)))
}

export function sanitizeDirectives(value: unknown): LbDirectives {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const base = LB_DEFAULT_DIRECTIVES

  const rawGraphic = (raw.graphic && typeof raw.graphic === 'object' ? raw.graphic : {}) as Record<string, unknown>
  const rawInstructional = (raw.instructional && typeof raw.instructional === 'object' ? raw.instructional : {}) as Record<string, unknown>
  const rawExports = (raw.exports && typeof raw.exports === 'object' ? raw.exports : {}) as Record<string, unknown>
  const rawRules = (rawInstructional.rules && typeof rawInstructional.rules === 'object' ? rawInstructional.rules : {}) as Record<string, unknown>
  const rawAi = (rawInstructional.ai && typeof rawInstructional.ai === 'object' ? rawInstructional.ai : {}) as Record<string, unknown>

  const blocks = Array.isArray(rawInstructional.blocks)
    ? LB_BLOCK_TYPES.filter((type) => (rawInstructional.blocks as unknown[]).includes(type))
    : base.instructional.blocks
  const minLessons = num(rawInstructional.minLessons, base.instructional.minLessons, 1, 40)

  return {
    graphic: {
      accent: color(rawGraphic.accent, base.graphic.accent),
      accentDark: color(rawGraphic.accentDark, base.graphic.accentDark),
      surface: color(rawGraphic.surface, base.graphic.surface),
      text: color(rawGraphic.text, base.graphic.text),
      muted: color(rawGraphic.muted, base.graphic.muted),
      headingFont: str(rawGraphic.headingFont, 200) || base.graphic.headingFont,
      bodyFont: str(rawGraphic.bodyFont, 200) || base.graphic.bodyFont,
      logoUrl: url(rawGraphic.logoUrl),
      footerText: str(rawGraphic.footerText, 300),
      corners: num(rawGraphic.corners, base.graphic.corners, 0, 40),
      density: pick(rawGraphic.density, ['compact', 'regular', 'airy'] as const, base.graphic.density),
    },
    instructional: {
      blocks: blocks.length ? blocks : base.instructional.blocks,
      lessonLabel: str(rawInstructional.lessonLabel, 40) || base.instructional.lessonLabel,
      minLessons,
      maxLessons: Math.max(minLessons, num(rawInstructional.maxLessons, base.instructional.maxLessons, 1, 40)),
      sections: sanitizeSections(rawInstructional.sections, base.instructional.sections),
      rules: {
        minChecksPerLesson: num(rawRules.minChecksPerLesson, base.instructional.rules.minChecksPerLesson, 0, 10),
        minChecksTotal: num(rawRules.minChecksTotal, base.instructional.rules.minChecksTotal, 0, 40),
        maxParagraphChars: num(rawRules.maxParagraphChars, base.instructional.rules.maxParagraphChars, 200, 8000),
        requireImageAlt: rawRules.requireImageAlt !== false,
        requireCoverSummary: rawRules.requireCoverSummary !== false,
        requireOutcomes: rawRules.requireOutcomes === true,
      },
      ai: {
        tone: str(rawAi.tone, 600) || base.instructional.ai.tone,
        readingLevel: str(rawAi.readingLevel, 120) || base.instructional.ai.readingLevel,
        blocksPerLesson: num(rawAi.blocksPerLesson, base.instructional.ai.blocksPerLesson, 3, 20),
        instructions: str(rawAi.instructions, 4000),
        citationStyle: str(rawAi.citationStyle, 60) || base.instructional.ai.citationStyle,
      },
    },
    exports: {
      scorm: rawExports.scorm !== false,
      html: rawExports.html !== false,
      publicLink: rawExports.publicLink !== false,
      embed: rawExports.embed !== false,
      scormPrefix: str(rawExports.scormPrefix, 40).replace(/[^A-Za-z0-9_-]/g, '') || base.exports.scormPrefix,
      completion: pick(rawExports.completion, ['visit-all', 'checks-passed', 'immediate'] as const, base.exports.completion),
    },
  }
}
