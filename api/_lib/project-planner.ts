export type ProjectNeedType = 'sitio-web' | 'automatizacion' | 'analitica' | 'chatbot' | 'otro'
export type ProjectComplexity = 'muy-facil' | 'facil' | 'moderado' | 'complejo' | 'muy-complejo'
export type MethodologyChoice = 'hazlo-tu-mismo' | 'algoritmot-por-mi' | 'ambas'
export type KnowledgeLevel = 'muy-basico' | 'basico' | 'intermedio'

export const COMPLEXITY_LABELS: Record<ProjectComplexity, string> = {
  'muy-facil': 'Muy fácil',
  facil: 'Fácil',
  moderado: 'Moderado',
  complejo: 'Complejo',
  'muy-complejo': 'Muy complejo',
}

export const NEED_LABELS: Record<ProjectNeedType, string> = {
  'sitio-web': 'Construcción de sitio web',
  automatizacion: 'Automatización de proceso',
  analitica: 'Analítica de datos',
  chatbot: 'Agente o chatbot',
  otro: 'Otro',
}

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

export function formatUsd(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function getComplexityLabel(value: ProjectComplexity) {
  return COMPLEXITY_LABELS[value]
}

export function getNeedLabel(value: ProjectNeedType) {
  return NEED_LABELS[value] || NEED_LABELS.otro
}

export function detectNeedType(text: string, selected?: string): ProjectNeedType {
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

export function estimateSelfService(complexity: ProjectComplexity, knowledge: KnowledgeLevel, hasLicensedAi: boolean, willingToPayTools: boolean) {
  if (!hasLicensedAi || !willingToPayTools) {
    return {
      eligible: false,
      recommended: false,
      reason:
        'Para la ruta Hazlo tú mismo necesitamos acceso a herramientas IA con licencia y apertura para infraestructura ligera con costo mensual moderado. En este caso recomendamos la ruta AlgoritmoT lo hace por mí.',
      note:
        'La ruta guiada funciona mejor cuando ya cuentas con una licencia IA y puedes asumir herramientas complementarias entre USD 10 y USD 30 al mes.',
    }
  }

  const sessions = SELF_SERVICE_SESSIONS[knowledge][complexity]
  const ratePerSessionUsd = sessions <= 1 ? 50 : sessions <= 3 ? 45 : 40
  return {
    eligible: true,
    recommended: true,
    sessions,
    ratePerSessionUsd,
    investmentUsd: sessions * ratePerSessionUsd,
    reason:
      'Tu perfil sí es compatible con una ruta guiada para construir el producto paso a paso con apoyo profesional.',
    note:
      'La inversión cubre sesiones de trabajo. Herramientas externas, servidores, bases de datos o automatizadores se definen según el stack elegido.',
  }
}

export function estimateDoneForYou(complexity: ProjectComplexity) {
  const scenario = DONE_FOR_YOU_MAP[complexity]
  return {
    timeline: scenario.timeline,
    investmentUsd: scenario.investmentUsd,
    note:
      'La inversión es aproximada. La cotización formal se presenta después del levantamiento detallado de requerimientos, integraciones y criterios de aceptación.',
  }
}
