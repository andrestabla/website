/**
 * AlgoritmoT - Simulador de Transformación Digital
 *
 * Modelo de estimación (USD) detallado y metadata de las 6 fases.
 * Las cifras son anclas deterministas calculadas en el servidor; la IA solo
 * contextualiza intervenciones y productos por sector (nunca inventa montos).
 *
 * Lógica de costeo:
 *  - Fase 1 (Diagnóstico): piso de entrada de 5.000 USD.
 *  - Fase 2 (Mapeo): depende del nº de procesos, estimado a partir del nº de
 *    colaboradores (más personas → más procesos), con un precio por proceso.
 *  - Fase 4 (Diseño/Desarrollo): depende del nº de soluciones digitales y su
 *    alcance técnico, con un precio por solución.
 *  - Fase 6 (Mejora continua): retainer mensual (recurrente).
 *  - La madurez digital aplica un factor de esfuerzo sobre las fases de trabajo.
 */

export type HeadcountKey = '1-10' | '11-50' | '51-200' | '201-500' | '500+'
export type MaturityKey = 'inicial' | 'en-desarrollo' | 'consolidado'

export const SIMULATOR_CURRENCY = 'USD'

// Piso mínimo de entrada para un diagnóstico (USD).
export const DIAGNOSTIC_FLOOR = 5000

type HeadcountProfile = {
  diagnostic: [number, number]
  processes: [number, number]
  solutions: [number, number]
  monthly: [number, number]
}

// Perfil por tramo de colaboradores: diagnóstico, nº estimado de procesos,
// nº estimado de soluciones digitales y retainer mensual (USD).
const HEADCOUNT_PROFILE: Record<HeadcountKey, HeadcountProfile> = {
  '1-10': { diagnostic: [5000, 8000], processes: [3, 6], solutions: [1, 2], monthly: [1200, 2500] },
  '11-50': { diagnostic: [6000, 12000], processes: [6, 12], solutions: [2, 3], monthly: [1800, 4000] },
  '51-200': { diagnostic: [9000, 18000], processes: [12, 25], solutions: [3, 5], monthly: [3000, 7000] },
  '201-500': { diagnostic: [14000, 28000], processes: [25, 45], solutions: [4, 7], monthly: [5000, 12000] },
  '500+': { diagnostic: [20000, 40000], processes: [45, 80], solutions: [6, 10], monthly: [8000, 20000] },
}

// Precio por proceso mapeado (BPMN as-is/to-be) y por solución digital (según alcance).
const PER_PROCESS: [number, number] = [600, 1200]
const PER_SOLUTION: [number, number] = [8000, 30000]

const HEADCOUNT_LABEL: Record<HeadcountKey, string> = {
  '1-10': '1 a 10 colaboradores',
  '11-50': '11 a 50 colaboradores',
  '51-200': '51 a 200 colaboradores',
  '201-500': '201 a 500 colaboradores',
  '500+': 'Más de 500 colaboradores',
}

export const SIMULATOR_MATURITIES: Array<{ value: MaturityKey; label: string; description: string; factor: number }> = [
  {
    value: 'inicial',
    label: 'Inicial',
    description: 'Procesos manuales o no documentados; poca o nula digitalización.',
    factor: 1.15,
  },
  {
    value: 'en-desarrollo',
    label: 'En desarrollo',
    description: 'Algunos procesos digitales o documentados; herramientas dispersas.',
    factor: 1.0,
  },
  {
    value: 'consolidado',
    label: 'Consolidado',
    description: 'Sistemas integrados; se busca optimización avanzada e IA.',
    factor: 0.95,
  },
]

const MATURITY_FACTOR: Record<MaturityKey, number> = {
  inicial: 1.15,
  'en-desarrollo': 1.0,
  consolidado: 0.95,
}

export type SimulatorPhaseMeta = {
  id: string
  index: number
  name: string
  tagline: string
  description: string
  methods: string[]
}

// Las 6 fases reales de la línea "Empresas" (Servicios_empresas).
export const SIMULATOR_PHASES: SimulatorPhaseMeta[] = [
  {
    id: 'adn',
    index: 1,
    name: 'Captura del ADN Digital',
    tagline: 'Diagnóstico Estratégico',
    description:
      'Diagnóstico 360°: mapeamos el modelo de negocio (Business Model Canvas), la propuesta de valor (Value Proposition Canvas) y la madurez digital (MD-IA) para construir un roadmap priorizado de iniciativas.',
    methods: ['Business Model Canvas', 'Value Proposition Canvas', 'Evaluación MD-IA'],
  },
  {
    id: 'bpmn',
    index: 2,
    name: 'Mapeo de Procesos',
    tagline: 'Optimización Digital (BPMN)',
    description:
      'Hacemos visibles los procesos con el estándar BPMN 2.x, identificamos desperdicios con Value Stream Mapping (Lean) y los rediseñamos del estado actual (as-is) al óptimo (to-be). El alcance depende del número de procesos a mapear.',
    methods: ['Diagramas BPMN 2.x', 'Value Stream Mapping', 'Matriz de KPIs'],
  },
  {
    id: 'sociotecnico',
    index: 3,
    name: 'Humano vs. Tecnología',
    tagline: 'IA Responsable',
    description:
      'Decidimos con criterio objetivo qué tareas hace una persona, cuáles se automatizan y cuáles funcionan en colaboración humano-IA, bajo marcos de IA responsable (NIST AI RMF) y diseño centrado en el humano (ISO 9241).',
    methods: ['Matriz Humano/Tecnología', 'Gobernanza de IA (NIST)', 'Plan de mitigación de riesgos'],
  },
  {
    id: 'desarrollo',
    index: 4,
    name: 'Diseño y Desarrollo',
    tagline: 'Soluciones a Medida (Ágil)',
    description:
      'Construimos las soluciones digitales a medida en sprints ágiles (Scrum), con versiones funcionales cada 2 semanas. El alcance depende del número de soluciones y la complejidad técnica de cada una.',
    methods: ['Blueprint Tecnológico', 'Prototipado Rápido', 'Validación con Usuarios'],
  },
  {
    id: 'implementacion',
    index: 5,
    name: 'Implementación',
    tagline: 'Transformación Real',
    description:
      'Plan de 12 semanas en 6 fases (configuración, migración, capacitación, UAT, go-live y estabilización) con gestión del cambio (modelo de 8 pasos de Kotter) para una adopción sin contratiempos.',
    methods: ['Migración de Datos', 'Gestión del Cambio (Kotter)', 'Soporte Post-Lanzamiento'],
  },
  {
    id: 'mejora',
    index: 6,
    name: 'Mejora Continua',
    tagline: 'Tecnología Resiliente',
    description:
      'Ciclo PDCA mensual para monitorear KPIs en tiempo real, detectar desviaciones a tiempo y aplicar mejoras iterativas, con un retainer mensual que mantiene la solución en su punto óptimo y la hace evolucionar.',
    methods: ['Dashboards en Tiempo Real', 'Análisis de SLA/SLO', 'Roadmap de Mejoras (PDCA)'],
  },
]

export function isHeadcountKey(value: unknown): value is HeadcountKey {
  return typeof value === 'string' && value in HEADCOUNT_PROFILE
}

export function isMaturityKey(value: unknown): value is MaturityKey {
  return typeof value === 'string' && value in MATURITY_FACTOR
}

export function getHeadcountLabel(headcount: string): string {
  return HEADCOUNT_LABEL[headcount as HeadcountKey] || headcount
}

export function getMaturityLabel(maturity: string): string {
  return SIMULATOR_MATURITIES.find((m) => m.value === maturity)?.label || maturity || 'No definida'
}

function roundTo(value: number, step = 100): number {
  return Math.round(value / step) * step
}

export type PhaseEstimate = {
  id: string
  min: number
  max: number
  recurring?: boolean
  period?: string
  basis?: string
}

export type SimulatorEstimate = {
  phases: PhaseEstimate[]
  processes: { min: number; max: number }
  solutions: { min: number; max: number }
  totalProject: { min: number; max: number }
  monthly: { min: number; max: number }
}

/** Calcula la estimación detallada (USD) por fase según tamaño y madurez digital. */
export function computeEstimate(headcount: string, maturity: string): SimulatorEstimate {
  const key: HeadcountKey = isHeadcountKey(headcount) ? headcount : '11-50'
  const profile = HEADCOUNT_PROFILE[key]
  const f = isMaturityKey(maturity) ? MATURITY_FACTOR[maturity] : 1.0

  const [procMin, procMax] = profile.processes
  const [solMin, solMax] = profile.solutions

  const adnMin = Math.max(DIAGNOSTIC_FLOOR, profile.diagnostic[0] * f)
  const adnMax = Math.max(adnMin, profile.diagnostic[1] * f)

  const bpmnMin = procMin * PER_PROCESS[0] * f
  const bpmnMax = procMax * PER_PROCESS[1] * f

  const socioMin = bpmnMin * 0.35
  const socioMax = bpmnMax * 0.5

  const devMin = solMin * PER_SOLUTION[0]
  const devMax = solMax * PER_SOLUTION[1]

  const implMin = devMin * 0.4 * f
  const implMax = devMax * 0.6 * f

  const phases: PhaseEstimate[] = [
    { id: 'adn', min: adnMin, max: adnMax },
    { id: 'bpmn', min: bpmnMin, max: bpmnMax, basis: `${procMin}–${procMax} procesos` },
    { id: 'sociotecnico', min: socioMin, max: socioMax },
    { id: 'desarrollo', min: devMin, max: devMax, basis: `${solMin}–${solMax} soluciones digitales` },
    { id: 'implementacion', min: implMin, max: implMax },
    { id: 'mejora', min: profile.monthly[0], max: profile.monthly[1], recurring: true, period: 'mensual' },
  ].map((p) => ({ ...p, min: roundTo(p.min), max: roundTo(p.max) }))

  const oneTime = phases.filter((p) => !p.recurring)
  const totalProject = {
    min: oneTime.reduce((sum, p) => sum + p.min, 0),
    max: oneTime.reduce((sum, p) => sum + p.max, 0),
  }

  return {
    phases,
    processes: { min: procMin, max: procMax },
    solutions: { min: solMin, max: solMax },
    totalProject,
    monthly: { min: roundTo(profile.monthly[0]), max: roundTo(profile.monthly[1]) },
  }
}

// ---- Diagnóstico de Madurez Digital (MD-IA) — Fase 1 ----
// Modelo fiel al deliverable real: 6 dimensiones, radar vs benchmark, DQ y AIQ.

export type MaturityDimension = { id: string; name: string; weightAIQ: number }

export const MD_DIMENSIONS: MaturityDimension[] = [
  { id: 'estrategia', name: 'Estrategia', weightAIQ: 0.25 },
  { id: 'infra', name: 'Infraestructura & Datos', weightAIQ: 0.3 },
  { id: 'talento', name: 'Talento & Cultura', weightAIQ: 0.1 },
  { id: 'gob', name: 'Gobernanza & Liderazgo', weightAIQ: 0.25 },
  { id: 'procesos', name: 'Procesos & Automatización', weightAIQ: 0.05 },
  { id: 'cx', name: 'Experiencia del cliente', weightAIQ: 0.05 },
]

// Benchmark de industria (referencia del deliverable MD-IA original).
const MD_BENCHMARK: Record<string, number> = {
  estrategia: 72,
  infra: 75,
  talento: 68,
  gob: 70,
  procesos: 66,
  cx: 71,
}

const MD_BASE_BY_MATURITY: Record<MaturityKey, number> = {
  inicial: 28,
  'en-desarrollo': 50,
  consolidado: 70,
}

export type MaturityLevel = 'bajo' | 'intermedio' | 'alto'

export function levelForScore(score: number): MaturityLevel {
  if (score < 34) return 'bajo'
  if (score < 67) return 'intermedio'
  return 'alto'
}

function hashString(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0
  }
  return h
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export type MaturityDiagnostic = {
  dimensions: Array<{ id: string; name: string; score: number; benchmark: number; level: MaturityLevel; weightAIQ: number }>
  dq: number
  aiq: number
}

/**
 * Calcula un Diagnóstico de Madurez Digital coherente con el nivel declarado y
 * el sector. Los puntajes son deterministas por (sector, madurez) para que el
 * radar sea estable; la IA solo añade la interpretación textual.
 */
export function computeMaturityDiagnostic(sector: string, maturity: string): MaturityDiagnostic {
  const base = isMaturityKey(maturity) ? MD_BASE_BY_MATURITY[maturity] : 50
  const dimensions = MD_DIMENSIONS.map((dim) => {
    const offset = (hashString(`${sector}|${dim.id}`) % 25) - 12 // -12..+12
    const score = Math.round(clamp(base + offset, 5, 95))
    return {
      id: dim.id,
      name: dim.name,
      score,
      benchmark: MD_BENCHMARK[dim.id] ?? 70,
      level: levelForScore(score),
      weightAIQ: dim.weightAIQ,
    }
  })

  const dq = Math.round((dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length) * 10) / 10
  const aiq = Math.round(dimensions.reduce((s, d) => s + d.score * d.weightAIQ, 0) * 10) / 10

  return { dimensions, dq, aiq }
}

export function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')} USD`
}

export function formatUsdRange(min: number, max: number): string {
  return `${formatUsd(min)} – ${formatUsd(max)}`
}
