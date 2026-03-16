export type ProjectPlannerIndustry =
  | 'educacion'
  | 'salud'
  | 'retail'
  | 'servicios-profesionales'
  | 'tecnologia'
  | 'manufactura'
  | 'finanzas'
  | 'marketing'
  | 'logistica'
  | 'otro'

export type ProjectNeedType = 'sitio-web' | 'automatizacion' | 'analitica' | 'chatbot' | 'otro'
export type ProjectComplexity = 'muy-facil' | 'facil' | 'moderado' | 'complejo' | 'muy-complejo'
export type MethodologyChoice = 'hazlo-tu-mismo' | 'algoritmot-por-mi' | 'ambas'
export type KnowledgeLevel = 'muy-basico' | 'basico' | 'intermedio'

export type SelfServiceAnswers = {
  knowledgeLevel: KnowledgeLevel
  hasLicensedAi: boolean
  willingToPayTools: boolean
}

export type PlannerProfile = {
  name: string
  email: string
  industry: ProjectPlannerIndustry
}

export type PlannerAiPayload = {
  assistantMessage: string
  summary: string
  complexity: ProjectComplexity
  complexityLabel: string
  detectedNeedType: ProjectNeedType
  detectedNeedLabel: string
  missingInfo: string[]
  followUpQuestions: string[]
  readyForProposal: boolean
  providerUsed?: 'openai' | 'gemini' | 'local'
}

export const INDUSTRY_OPTIONS: Array<{ value: ProjectPlannerIndustry; label: string }> = [
  { value: 'educacion', label: 'Educación' },
  { value: 'salud', label: 'Salud' },
  { value: 'retail', label: 'Retail y comercio' },
  { value: 'servicios-profesionales', label: 'Servicios profesionales' },
  { value: 'tecnologia', label: 'Tecnología y software' },
  { value: 'manufactura', label: 'Manufactura y operaciones' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'marketing', label: 'Marketing y ventas' },
  { value: 'logistica', label: 'Logística' },
  { value: 'otro', label: 'Otro' },
]

export const NEED_OPTIONS: Array<{ value: ProjectNeedType; label: string; prompt: string }> = [
  {
    value: 'sitio-web',
    label: 'Construcción de sitio web',
    prompt: 'Necesito crear o renovar un sitio web con objetivo claro de negocio, conversión o posicionamiento.',
  },
  {
    value: 'automatizacion',
    label: 'Automatización de proceso',
    prompt: 'Necesito automatizar un proceso operativo, comercial o administrativo que hoy se hace manualmente.',
  },
  {
    value: 'analitica',
    label: 'Analítica de datos',
    prompt: 'Necesito consolidar datos y generar análisis o reportes automáticos para tomar decisiones.',
  },
  {
    value: 'chatbot',
    label: 'Agente o chatbot',
    prompt: 'Necesito un agente conversacional o chatbot para responder, vender, clasificar o acompañar usuarios.',
  },
]

export const METHODOLOGY_OPTIONS: Array<{ value: MethodologyChoice; label: string; description: string }> = [
  {
    value: 'hazlo-tu-mismo',
    label: 'Hazlo tú mismo',
    description: 'Trabajamos contigo en sesiones guiadas para construir la solución sobre tu caso real.',
  },
  {
    value: 'algoritmot-por-mi',
    label: 'AlgoritmoT lo hace por mí',
    description: 'Nuestro equipo toma el desarrollo y te entrega una solución funcional con acompañamiento.',
  },
  {
    value: 'ambas',
    label: 'Muéstrame las 2 propuestas',
    description: 'Comparamos la ruta guiada contigo y la ruta ejecutada por nuestro equipo.',
  },
]

export const KNOWLEDGE_OPTIONS: Array<{ value: KnowledgeLevel; label: string }> = [
  { value: 'muy-basico', label: 'Muy básicos' },
  { value: 'basico', label: 'Básicos' },
  { value: 'intermedio', label: 'Intermedios' },
]

export const COMPLEXITY_LABELS: Record<ProjectComplexity, string> = {
  'muy-facil': 'Muy fácil',
  facil: 'Fácil',
  moderado: 'Moderado',
  complejo: 'Complejo',
  'muy-complejo': 'Muy complejo',
}

export const INDUSTRY_LABELS: Record<ProjectPlannerIndustry, string> = Object.fromEntries(
  INDUSTRY_OPTIONS.map((option) => [option.value, option.label])
) as Record<ProjectPlannerIndustry, string>

export const NEED_LABELS: Record<ProjectNeedType, string> = Object.fromEntries(
  [...NEED_OPTIONS, { value: 'otro' as ProjectNeedType, label: 'Otro', prompt: '' }].map((option) => [option.value, option.label])
) as Record<ProjectNeedType, string>

const SELF_SERVICE_SESSIONS: Record<KnowledgeLevel, Record<ProjectComplexity, number>> = {
  'muy-basico': {
    'muy-facil': 4,
    facil: 5,
    moderado: 8,
    complejo: 9,
    'muy-complejo': 10,
  },
  basico: {
    'muy-facil': 4,
    facil: 5,
    moderado: 8,
    complejo: 9,
    'muy-complejo': 10,
  },
  intermedio: {
    'muy-facil': 3,
    facil: 4,
    moderado: 7,
    complejo: 8,
    'muy-complejo': 9,
  },
}

const DONE_FOR_YOU_MAP: Record<ProjectComplexity, { timeline: string; investmentUsd: number }> = {
  'muy-facil': { timeline: '1 semana', investmentUsd: 450 },
  facil: { timeline: '1 a 2 semanas', investmentUsd: 700 },
  moderado: { timeline: '2 a 3 semanas', investmentUsd: 1200 },
  complejo: { timeline: '3 a 4 semanas', investmentUsd: 1800 },
  'muy-complejo': { timeline: '5 a 8 semanas', investmentUsd: 2500 },
}

export type SelfServiceProposal = {
  eligible: boolean
  recommended: boolean
  reason: string
  sessions?: number
  ratePerSessionUsd?: number
  investmentUsd?: number
  note: string
}

export type DoneForYouProposal = {
  timeline: string
  investmentUsd: number
  note: string
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function getSelfServiceSessions(knowledge: KnowledgeLevel, complexity: ProjectComplexity) {
  return SELF_SERVICE_SESSIONS[knowledge][complexity]
}

export function getSelfServiceRate(sessions: number) {
  if (sessions <= 1) return 50
  if (sessions <= 3) return 45
  return 40
}

export function buildSelfServiceProposal(
  complexity: ProjectComplexity,
  answers: SelfServiceAnswers
): SelfServiceProposal {
  if (!answers.hasLicensedAi || !answers.willingToPayTools) {
    return {
      eligible: false,
      recommended: false,
      reason:
        'Para la ruta Hazlo tú mismo necesitamos acceso a herramientas con licencia y disposición para asumir herramientas complementarias con costo mensual moderado. En este caso recomendamos la ruta “AlgoritmoT lo hace por mí”.',
      note:
        'La ruta guiada requiere al menos una herramienta IA con licencia y apertura para infraestructura ligera adicional.',
    }
  }

  const sessions = getSelfServiceSessions(answers.knowledgeLevel, complexity)
  const ratePerSessionUsd = getSelfServiceRate(sessions)
  const investmentUsd = sessions * ratePerSessionUsd

  return {
    eligible: true,
    recommended: true,
    reason:
      'Tu perfil sí es compatible con la ruta Hazlo tú mismo: podemos estructurar sesiones de trabajo guiadas para que construyas con criterio y avances sobre un caso real.',
    sessions,
    ratePerSessionUsd,
    investmentUsd,
    note:
      'La inversión cubre sesiones guiadas. Herramientas de terceros, servidores, bases de datos o automatizadores se cotizan por separado según el stack elegido.',
  }
}

export function buildDoneForYouProposal(complexity: ProjectComplexity): DoneForYouProposal {
  const scenario = DONE_FOR_YOU_MAP[complexity]
  return {
    timeline: scenario.timeline,
    investmentUsd: scenario.investmentUsd,
    note:
      'La inversión es aproximada. La cotización formal se presenta después del levantamiento detallado de requerimientos, integraciones y criterios de aceptación.',
  }
}

export function buildPlannerProposals({
  complexity,
  methodology,
  selfServiceAnswers,
}: {
  complexity: ProjectComplexity
  methodology: MethodologyChoice
  selfServiceAnswers?: SelfServiceAnswers | null
}) {
  const includeSelfService = methodology === 'hazlo-tu-mismo' || methodology === 'ambas'
  const includeDoneForYou = methodology === 'algoritmot-por-mi' || methodology === 'ambas'

  const selfService = includeSelfService && selfServiceAnswers
    ? buildSelfServiceProposal(complexity, selfServiceAnswers)
    : null

  const doneForYou = includeDoneForYou || (selfService && !selfService.eligible)
    ? buildDoneForYouProposal(complexity)
    : null

  return {
    selfService,
    doneForYou,
  }
}

export function getNeedLabel(value: ProjectNeedType) {
  return NEED_LABELS[value] || NEED_LABELS.otro
}

export function getIndustryLabel(value: ProjectPlannerIndustry) {
  return INDUSTRY_LABELS[value] || INDUSTRY_LABELS.otro
}

export function getComplexityLabel(value: ProjectComplexity) {
  return COMPLEXITY_LABELS[value]
}

export function getMethodologyLabel(value: MethodologyChoice) {
  return METHODOLOGY_OPTIONS.find((option) => option.value === value)?.label || value
}

export function buildPlannerEmailSubject(name: string, methodology: MethodologyChoice) {
  return `Plan de proyecto para ${name} · ${getMethodologyLabel(methodology)}`
}

export function detectNeedType(text: string, selected?: ProjectNeedType | 'otro') {
  const normalized = `${selected || ''} ${text || ''}`.toLowerCase()
  if (selected === 'sitio-web' || /(sitio|web|landing|pagina|página|wordpress|portafolio)/.test(normalized)) return 'sitio-web'
  if (selected === 'automatizacion' || /(automat|workflow|flujo|zap|make|n8n|repetitiv|cotiz|seguimiento|proceso)/.test(normalized)) return 'automatizacion'
  if (selected === 'analitica' || /(anal[ií]tic|dashboard|reporte|datos|bi|indicador|metric)/.test(normalized)) return 'analitica'
  if (selected === 'chatbot' || /(chatbot|bot|whatsapp|agente|asistente|faq|convers)/.test(normalized)) return 'chatbot'
  return 'otro'
}

export function inferComplexity(text: string): ProjectComplexity {
  const normalized = text.toLowerCase()
  const hardSignals = [
    /erp|sap|legacy|m[úu]ltiples sistemas|muchos sistemas|integraciones complejas|pagos|pasarela|marketplace|multi-tenant|multisede|gobernanza|roles complejos/,
    /api externa|api interna|sincronizaci[oó]n bidireccional|time series|predicci[oó]n|machine learning/,
  ]
  const mediumSignals = [
    /dashboard|crm|cotizador|automatizaci[oó]n comercial|formularios|base de datos|portal|agenda|embudo/,
    /whatsapp|correo|seguimiento|reportes|ventas|inventario/,
  ]
  const easySignals = [
    /landing|sitio web simple|formulario|faq|respuestas autom[aá]ticas|lead magnet|notificaci[oó]n|hoja de c[aá]lculo/,
  ]

  if (hardSignals.some((pattern) => pattern.test(normalized))) return normalized.includes('multi') || normalized.includes('legacy') ? 'muy-complejo' : 'complejo'
  if (mediumSignals.some((pattern) => pattern.test(normalized))) return 'moderado'
  if (easySignals.some((pattern) => pattern.test(normalized))) return 'facil'
  if (normalized.length < 120) return 'muy-facil'
  if (normalized.length < 220) return 'facil'
  if (normalized.length < 420) return 'moderado'
  if (normalized.length < 650) return 'complejo'
  return 'muy-complejo'
}

export function buildLocalPlannerResponse({
  text,
  selectedNeedType,
}: {
  text: string
  selectedNeedType?: ProjectNeedType | 'otro'
}): PlannerAiPayload {
  const detectedNeedType = detectNeedType(text, selectedNeedType)
  const complexity = inferComplexity(text)
  const normalized = text.toLowerCase()
  const missingInfo: string[] = []

  if (!/(cliente|usuario|equipo|área|area|rol|ventas|operaci[oó]n|admisiones|soporte)/.test(normalized)) missingInfo.push('usuario o equipo impactado')
  if (!/(hoy|actual|manual|excel|correo|whatsapp|crm|sistema)/.test(normalized)) missingInfo.push('cómo se hace hoy')
  if (!/(quiero|necesito|resultado|salida|objetivo|entregar|automatizar|medir)/.test(normalized)) missingInfo.push('resultado esperado')
  if (!/(tiempo|semana|urgente|mes|fecha|antes de)/.test(normalized)) missingInfo.push('urgencia o plazo')

  const followUpQuestions = [
    missingInfo.includes('usuario o equipo impactado') ? '¿Quién va a usar esta solución o qué equipo será el más impactado?' : null,
    missingInfo.includes('cómo se hace hoy') ? '¿Cómo se realiza hoy el proceso y en qué punto aparece el mayor cuello de botella?' : null,
    missingInfo.includes('resultado esperado') ? '¿Qué salida concreta esperas: sitio publicado, respuestas automáticas, cotización, tablero o algo más?' : null,
    missingInfo.includes('urgencia o plazo') ? '¿Para cuándo necesitas tener una primera versión funcionando?' : null,
  ].filter(Boolean) as string[]

  const readyForProposal = missingInfo.length <= 1 && text.trim().length >= 140

  return {
    assistantMessage: readyForProposal
      ? `Ya tenemos un nivel de precisión suficiente para bosquejar una propuesta. Clasifiqué tu caso como ${getComplexityLabel(complexity).toLowerCase()} dentro de ${getNeedLabel(detectedNeedType).toLowerCase()}.`
      : `Voy entendiendo tu necesidad. Por ahora la clasifiqué como ${getComplexityLabel(complexity).toLowerCase()} dentro de ${getNeedLabel(detectedNeedType).toLowerCase()}, pero todavía necesito uno o dos datos para afinar la propuesta.`,
    summary: text.trim().slice(0, 420),
    complexity,
    complexityLabel: getComplexityLabel(complexity),
    detectedNeedType,
    detectedNeedLabel: getNeedLabel(detectedNeedType),
    missingInfo,
    followUpQuestions,
    readyForProposal,
    providerUsed: 'local',
  }
}
