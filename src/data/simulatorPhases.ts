/**
 * Contenido educativo del Simulador de Transformación Digital (línea Empresas).
 * Las descripciones reflejan las 6 fases reales de Servicios_empresas.
 */

export type SimulatorPhaseContent = {
  id: string
  index: number
  name: string
  tagline: string
  icon: string // nombre de icono lucide-react
  description: string
  methods: string[]
}

export const SIMULATOR_PHASES: SimulatorPhaseContent[] = [
  {
    id: 'adn',
    index: 1,
    name: 'Captura del ADN Digital',
    tagline: 'Diagnóstico Estratégico',
    icon: 'ScanSearch',
    description:
      'Antes de digitalizar, hay que entender. Hacemos un diagnóstico 360° de tu organización: mapeamos tu modelo de negocio (Business Model Canvas), tu propuesta de valor (Value Proposition Canvas) y evaluamos tu madurez digital (MD-IA) para construir un roadmap priorizado.',
    methods: ['Business Model Canvas', 'Value Proposition Canvas', 'Evaluación MD-IA'],
  },
  {
    id: 'bpmn',
    index: 2,
    name: 'Mapeo de Procesos',
    tagline: 'Optimización Digital (BPMN)',
    icon: 'Workflow',
    description:
      'Muchas empresas operan con "procesos invisibles". Los hacemos visibles con el estándar BPMN 2.x, identificamos desperdicios con Value Stream Mapping (Lean) y los rediseñamos del estado actual (as-is) al óptimo (to-be).',
    methods: ['Diagramas BPMN 2.x', 'Value Stream Mapping', 'Matriz de KPIs'],
  },
  {
    id: 'sociotecnico',
    index: 3,
    name: 'Humano vs. Tecnología',
    tagline: 'IA Responsable',
    icon: 'Scale',
    description:
      'La automatización sin estrategia destruye valor. Decidimos con criterio objetivo qué tareas hace una persona, cuáles se automatizan y cuáles funcionan en colaboración humano-IA, bajo marcos de IA responsable (NIST AI RMF) y diseño centrado en el humano (ISO 9241).',
    methods: ['Matriz Humano/Tecnología', 'Gobernanza de IA (NIST)', 'Mitigación de riesgos'],
  },
  {
    id: 'desarrollo',
    index: 4,
    name: 'Diseño y Desarrollo',
    tagline: 'Soluciones a Medida (Ágil)',
    icon: 'Code2',
    description:
      'De la idea al prototipo. Construimos tu solución digital a medida en sprints ágiles (Scrum), con versiones funcionales cada 2 semanas: desde prototipos validados hasta plataformas cloud escalables alineadas a tus procesos.',
    methods: ['Blueprint Tecnológico', 'Prototipado Rápido', 'Validación con Usuarios'],
  },
  {
    id: 'implementacion',
    index: 5,
    name: 'Implementación',
    tagline: 'Transformación Real',
    icon: 'Rocket',
    description:
      'Un buen software fracasa si la implementación no se gestiona bien. Ejecutamos un plan de 12 semanas en 6 fases (configuración, migración, capacitación, UAT, go-live y estabilización) con gestión del cambio (modelo de Kotter) para una adopción sin contratiempos.',
    methods: ['Migración de Datos', 'Gestión del Cambio (Kotter)', 'Soporte Post-Lanzamiento'],
  },
  {
    id: 'mejora',
    index: 6,
    name: 'Mejora Continua',
    tagline: 'Tecnología Resiliente',
    icon: 'RefreshCw',
    description:
      'El lanzamiento no es el final: es el comienzo. Implementamos un ciclo PDCA mensual para monitorear KPIs en tiempo real, detectar desviaciones a tiempo y aplicar mejoras iterativas que mantienen la solución en su punto óptimo.',
    methods: ['Dashboards en Tiempo Real', 'Análisis de SLA/SLO', 'Roadmap de Mejoras (PDCA)'],
  },
]

export const SIMULATOR_SECTORS = [
  'Finanzas y Banca',
  'Salud y Medicina',
  'Retail y Comercio Electrónico',
  'Manufactura y Logística',
  'Tecnología y Software',
  'Educación',
  'Servicios Profesionales',
  'Bienes Raíces y Construcción',
  'Energía y Servicios Públicos',
  'Agricultura y Tecnología Global',
  'Entretenimiento y Medios',
  'Transporte y Movilidad',
  'Hostelería y Turismo',
  'Telecomunicaciones',
  'Otro',
]

export const SIMULATOR_ORG_TYPES = [
  'Startup',
  'PyME / Pequeña empresa',
  'Mediana empresa',
  'Gran empresa / Corporativo',
  'Sector público / Gobierno',
  'ONG / Fundación',
  'Institución educativa',
]

export const SIMULATOR_HEADCOUNTS: Array<{ value: string; label: string }> = [
  { value: '1-10', label: '1 a 10 colaboradores' },
  { value: '11-50', label: '11 a 50 colaboradores' },
  { value: '51-200', label: '51 a 200 colaboradores' },
  { value: '201-500', label: '201 a 500 colaboradores' },
  { value: '500+', label: 'Más de 500 colaboradores' },
]

export type SimulatorProposalPhase = {
  id: string
  index: number
  name: string
  tagline: string
  description: string
  methods: string[]
  investment: { min: number; max: number }
  interventions: string[]
  products: string[]
  rationale: string
  kpi: string
}

export type SimulatorProposal = {
  headline: string
  executiveSummary: string
  currency: string
  total: { min: number; max: number }
  phases: SimulatorProposalPhase[]
}

export function formatUsd(value: number): string {
  return `$${Math.round(value || 0).toLocaleString('en-US')} USD`
}

export function formatUsdRange(min: number, max: number): string {
  return `${formatUsd(min)} – ${formatUsd(max)}`
}
