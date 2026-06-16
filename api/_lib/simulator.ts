/**
 * AlgoritmoT - Simulador de Transformación Digital
 *
 * Anclas de inversión (USD) por tramo de colaboradores y metadata de las 6 fases.
 * Las cifras son anclas deterministas calculadas en el servidor; la IA solo
 * contextualiza intervenciones y productos por sector (nunca inventa montos).
 */

export type HeadcountKey = '1-10' | '11-50' | '51-200' | '201-500' | '500+'

export const SIMULATOR_CURRENCY = 'USD'

// Rango total (USD) de una transformación digital completa por tramo de personas.
const HEADCOUNT_INVESTMENT: Record<HeadcountKey, [number, number]> = {
  '1-10': [8000, 20000],
  '11-50': [20000, 55000],
  '51-200': [55000, 140000],
  '201-500': [140000, 320000],
  '500+': [320000, 750000],
}

const HEADCOUNT_LABEL: Record<HeadcountKey, string> = {
  '1-10': '1 a 10 colaboradores',
  '11-50': '11 a 50 colaboradores',
  '51-200': '51 a 200 colaboradores',
  '201-500': '201 a 500 colaboradores',
  '500+': 'Más de 500 colaboradores',
}

export type SimulatorPhaseMeta = {
  id: string
  index: number
  name: string
  tagline: string
  description: string
  methods: string[]
  weight: number
}

// Las 6 fases reales de la línea "Empresas" (Servicios_empresas). El peso reparte
// el rango total entre fases (suma = 1.0).
export const SIMULATOR_PHASES: SimulatorPhaseMeta[] = [
  {
    id: 'adn',
    index: 1,
    name: 'Captura del ADN Digital',
    tagline: 'Diagnóstico Estratégico',
    description:
      'Diagnóstico 360°: mapeamos el modelo de negocio (Business Model Canvas), la propuesta de valor (Value Proposition Canvas) y la madurez digital (MD-IA) para construir un roadmap priorizado de iniciativas.',
    methods: ['Business Model Canvas', 'Value Proposition Canvas', 'Evaluación MD-IA'],
    weight: 0.1,
  },
  {
    id: 'bpmn',
    index: 2,
    name: 'Mapeo de Procesos',
    tagline: 'Optimización Digital (BPMN)',
    description:
      'Hacemos visibles los procesos "invisibles" con el estándar BPMN 2.x, identificamos desperdicios con Value Stream Mapping (Lean) y los rediseñamos del estado actual (as-is) al óptimo (to-be).',
    methods: ['Diagramas BPMN 2.x', 'Value Stream Mapping', 'Matriz de KPIs'],
    weight: 0.12,
  },
  {
    id: 'sociotecnico',
    index: 3,
    name: 'Humano vs. Tecnología',
    tagline: 'IA Responsable',
    description:
      'Decidimos con criterio objetivo qué tareas hace una persona, cuáles se automatizan y cuáles funcionan en colaboración humano-IA, bajo marcos de IA responsable (NIST AI RMF) y diseño centrado en el humano (ISO 9241).',
    methods: ['Matriz Humano/Tecnología', 'Gobernanza de IA (NIST)', 'Plan de mitigación de riesgos'],
    weight: 0.1,
  },
  {
    id: 'desarrollo',
    index: 4,
    name: 'Diseño y Desarrollo',
    tagline: 'Soluciones a Medida (Ágil)',
    description:
      'Construimos la solución digital a medida en sprints ágiles (Scrum), con versiones funcionales cada 2 semanas: desde prototipos validados hasta plataformas cloud escalables alineadas a tus procesos.',
    methods: ['Blueprint Tecnológico', 'Prototipado Rápido', 'Validación con Usuarios'],
    weight: 0.33,
  },
  {
    id: 'implementacion',
    index: 5,
    name: 'Implementación',
    tagline: 'Transformación Real',
    description:
      'Plan de 12 semanas en 6 fases (configuración, migración, capacitación, UAT, go-live y estabilización) con gestión del cambio (modelo de 8 pasos de Kotter) para una adopción sin contratiempos.',
    methods: ['Migración de Datos', 'Gestión del Cambio (Kotter)', 'Soporte Post-Lanzamiento'],
    weight: 0.22,
  },
  {
    id: 'mejora',
    index: 6,
    name: 'Mejora Continua',
    tagline: 'Tecnología Resiliente',
    description:
      'Ciclo PDCA mensual para monitorear KPIs en tiempo real, detectar desviaciones a tiempo y aplicar mejoras iterativas, con un retainer que mantiene la solución en su punto óptimo y la hace evolucionar.',
    methods: ['Dashboards en Tiempo Real', 'Análisis de SLA/SLO', 'Roadmap de Mejoras (PDCA)'],
    weight: 0.13,
  },
]

export function isHeadcountKey(value: unknown): value is HeadcountKey {
  return typeof value === 'string' && value in HEADCOUNT_INVESTMENT
}

export function getHeadcountLabel(headcount: string): string {
  return HEADCOUNT_LABEL[headcount as HeadcountKey] || headcount
}

function roundTo(value: number, step = 100): number {
  return Math.round(value / step) * step
}

export type PhaseInvestment = { id: string; min: number; max: number }

/** Calcula el rango de inversión (USD) por fase y el total, según el tramo de personas. */
export function computeInvestment(headcount: string): {
  total: { min: number; max: number }
  phases: PhaseInvestment[]
} {
  const key: HeadcountKey = isHeadcountKey(headcount) ? headcount : '11-50'
  const [totalMin, totalMax] = HEADCOUNT_INVESTMENT[key]
  const phases = SIMULATOR_PHASES.map((phase) => ({
    id: phase.id,
    min: roundTo(totalMin * phase.weight),
    max: roundTo(totalMax * phase.weight),
  }))
  return { total: { min: totalMin, max: totalMax }, phases }
}

export function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')} USD`
}

export function formatUsdRange(min: number, max: number): string {
  return `${formatUsd(min)} – ${formatUsd(max)}`
}
