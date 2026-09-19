/**
 * Learning Builder · ruta de aprendizaje.
 *
 * Es la pieza de la que salen todas las demás: la propuesta de un curso
 * completo, en módulos y actividades, con sus resultados y sus horas. Se
 * entrega al cliente como mapa del curso y sirve al equipo como plan de
 * producción, porque cada actividad puede apuntar al recurso que la realiza
 * —por su código— y así se ve de un vistazo qué está hecho y qué falta.
 *
 * Lo importa la UI y también el API, así que no puede depender de React.
 */
import type { LbCover } from './blocks.js'
import type { LbDirectives } from './directives.js'
import {
  coverAnchors, coverIssues, ident, newLbId, num, pick, sanitizeCover, str,
  type LbAnchorTarget, type LbIssue,
} from './common.js'

/**
 * Qué es cada actividad. Los primeros coinciden con los tipos de recurso del
 * módulo, para que una actividad pueda apuntar a la pieza que la realiza; los
 * últimos son trabajo de aula que no produce un recurso digital.
 */
export const LB_ACTIVITY_KINDS = [
  'OVA', 'LECTURA', 'INTERACTIVE', 'PODCAST', 'VIDEO',
  'TALLER', 'FORO', 'EVALUACION', 'ENCUENTRO', 'PROYECTO',
] as const
export type LbActivityKind = (typeof LB_ACTIVITY_KINDS)[number]

export const LB_ACTIVITY_LABEL: Record<LbActivityKind, string> = {
  OVA: 'OVA navegable',
  LECTURA: 'Lectura',
  INTERACTIVE: 'Presentación interactiva',
  PODCAST: 'Pódcast',
  VIDEO: 'Video',
  TALLER: 'Taller',
  FORO: 'Foro',
  EVALUACION: 'Evaluación',
  ENCUENTRO: 'Encuentro sincrónico',
  PROYECTO: 'Proyecto',
}

/** Modalidad de trabajo de la actividad. */
export const LB_ACTIVITY_MODES = ['autonomo', 'acompanado', 'sincronico'] as const
export type LbActivityMode = (typeof LB_ACTIVITY_MODES)[number]

export const LB_ACTIVITY_MODE_LABEL: Record<LbActivityMode, string> = {
  autonomo: 'Autónomo',
  acompanado: 'Acompañado',
  sincronico: 'Sincrónico',
}

export type LbActivity = {
  id: string
  title: string
  kind: LbActivityKind
  mode: LbActivityMode
  /** Dedicación estimada del estudiante, en horas. */
  hours: number
  description?: string
  /** Qué entrega o demuestra el estudiante. */
  evidence?: string
  /** Código del recurso que ya realiza esta actividad: UNICAFAM-OVA-001. */
  resourceCode?: string
}

export type LbRouteModule = {
  id: string
  title: string
  /** De qué trata el módulo. */
  summary?: string
  /** Qué sabrá hacer el estudiante al terminarlo. */
  outcome?: string
  /** Semanas que ocupa en el calendario. */
  weeks?: number
  activities: LbActivity[]
}

export type LbRouteContent = {
  cover: LbCover
  /** Competencias del curso completo, por encima de los módulos. */
  competencies: string[]
  /** A quién va dirigido y de qué se parte. */
  audience?: string
  prerequisites?: string
  /** Cómo se evalúa el curso en conjunto. */
  assessment?: string
  modules: LbRouteModule[]
}

// ── Saneamiento ──────────────────────────────────────────────────────────────

const MAX_MODULES = 24
const MAX_ACTIVITIES = 30

function sanitizeActivity(value: unknown, index: number): LbActivity {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const activity: LbActivity = {
    id: ident(raw.id, 'a'),
    title: str(raw.title, 240) || `Actividad ${index + 1}`,
    kind: pick(raw.kind, LB_ACTIVITY_KINDS, 'LECTURA'),
    mode: pick(raw.mode, LB_ACTIVITY_MODES, 'autonomo'),
    hours: num(raw.hours, 2, 0, 200),
  }
  const description = str(raw.description, 2000); if (description) activity.description = description
  const evidence = str(raw.evidence, 1000); if (evidence) activity.evidence = evidence
  // El código de recurso es el identificador legible del módulo: WORKSPACE-TIP-000.
  const code = str(raw.resourceCode, 40).toUpperCase().replace(/[^A-Z0-9-]/g, '')
  if (/^[A-Z0-9]+-[A-Z]{3}-\d{3}$/.test(code)) activity.resourceCode = code
  return activity
}

function sanitizeModule(value: unknown, index: number): LbRouteModule {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const item: LbRouteModule = {
    id: ident(raw.id, 'm'),
    title: str(raw.title, 240) || `Módulo ${index + 1}`,
    activities: (Array.isArray(raw.activities) ? (raw.activities as unknown[]).slice(0, MAX_ACTIVITIES) : []).map(
      sanitizeActivity
    ),
  }
  const summary = str(raw.summary, 2000); if (summary) item.summary = summary
  const outcome = str(raw.outcome, 1000); if (outcome) item.outcome = outcome
  if (raw.weeks !== undefined) item.weeks = num(raw.weeks, 1, 0, 60)
  return item
}

export function sanitizeRoute(value: unknown): LbRouteContent {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const content: LbRouteContent = {
    cover: sanitizeCover(raw.cover),
    competencies: (Array.isArray(raw.competencies) ? (raw.competencies as unknown[]).slice(0, 12) : [])
      .map((row) => str(row, 400))
      .filter(Boolean),
    modules: (Array.isArray(raw.modules) ? (raw.modules as unknown[]).slice(0, MAX_MODULES) : []).map(sanitizeModule),
  }
  const audience = str(raw.audience, 1000); if (audience) content.audience = audience
  const prerequisites = str(raw.prerequisites, 1000); if (prerequisites) content.prerequisites = prerequisites
  const assessment = str(raw.assessment, 2000); if (assessment) content.assessment = assessment
  return content
}

export function scaffoldRoute(title: string): LbRouteContent {
  return {
    cover: { title, summary: '', outcomes: [] },
    competencies: [],
    modules: [
      {
        id: newLbId('m'),
        title: 'Módulo 1',
        summary: '',
        outcome: '',
        weeks: 2,
        activities: [
          { id: newLbId('a'), title: 'Lectura de apertura', kind: 'LECTURA', mode: 'autonomo', hours: 2 },
          { id: newLbId('a'), title: 'OVA del módulo', kind: 'OVA', mode: 'autonomo', hours: 3 },
        ],
      },
    ],
  }
}

// ── Validación ───────────────────────────────────────────────────────────────

export function validateRoute(content: LbRouteContent, directives: LbDirectives): LbIssue[] {
  const rules = directives.instructional.rules
  const issues: LbIssue[] = coverIssues(content.cover, rules)

  if (!content.modules.length) {
    issues.push({ level: 'error', message: 'La ruta no tiene ningún módulo.' })
  }
  if (!content.competencies.length) {
    issues.push({ level: 'warning', message: 'La ruta no declara competencias del curso.' })
  }

  for (const item of content.modules) {
    if (!item.activities.length) {
      issues.push({ level: 'error', lessonId: item.id, message: `«${item.title}» no tiene actividades.` })
    }
    if (!item.outcome) {
      issues.push({
        level: 'warning', lessonId: item.id,
        message: `«${item.title}» no dice qué sabrá hacer el estudiante al terminarlo.`,
      })
    }
    if (!item.activities.some((activity) => activity.evidence)) {
      issues.push({
        level: 'warning', lessonId: item.id,
        message: `Ninguna actividad de «${item.title}» pide una evidencia.`,
      })
    }
  }

  const hours = routeHours(content)
  if (hours === 0 && content.modules.length) {
    issues.push({ level: 'warning', message: 'La ruta no estima horas de dedicación.' })
  }

  return issues
}

// ── Utilidades ───────────────────────────────────────────────────────────────

export function routeHours(content: LbRouteContent): number {
  return content.modules.reduce(
    (total, item) => total + item.activities.reduce((sum, activity) => sum + activity.hours, 0),
    0
  )
}

export function routeActivityCount(content: LbRouteContent): number {
  return content.modules.reduce((total, item) => total + item.activities.length, 0)
}

/** Cuántas actividades ya tienen recurso producido. */
export function routeCoverage(content: LbRouteContent): { linked: number; total: number } {
  let linked = 0
  let total = 0
  for (const item of content.modules) {
    for (const activity of item.activities) {
      // Solo cuentan las que un recurso del módulo puede realizar.
      if (!['OVA', 'LECTURA', 'INTERACTIVE', 'PODCAST', 'VIDEO'].includes(activity.kind)) continue
      total += 1
      if (activity.resourceCode) linked += 1
    }
  }
  return { linked, total }
}

export function routeAnchorTargets(content: LbRouteContent): LbAnchorTarget[] {
  const targets = coverAnchors(content.cover)
  content.modules.forEach((item, index) => {
    targets.push({
      anchor: `lesson:${item.id}`,
      kind: 'lesson',
      label: `Módulo ${index + 1} · ${item.title}`,
      preview: item.outcome || item.summary || '',
      depth: 1,
    })
    for (const activity of item.activities) {
      targets.push({
        anchor: `block:${activity.id}`,
        kind: 'block',
        label: `${LB_ACTIVITY_LABEL[activity.kind]} · ${activity.title}`,
        preview: (activity.description || '').slice(0, 120),
        depth: 2,
      })
    }
  })
  return targets
}
