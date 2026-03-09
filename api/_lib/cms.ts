import { content as defaultContent } from '../../src/data/content.js'
import { siteConfig as defaultSiteConfig } from '../../src/data/config.js'
import { servicesDetail, productsDetail } from '../../src/data/details.js'

type CMSState = {
  services: any[]
  products: any[]
  hero: any
  site: any
  design: any
  homePage: any
  siteArchitecture: any
}

const defaultDesign = {
  colorPrimary: '#1a2d5a',
  colorSecondary: '#2563eb',
  colorSurface: '#f8faff',
  colorAccent: '#3b82f6',
  colorDark: '#0f172a',
  fontBody: 'Space Grotesk',
  fontDisplay: 'Space Grotesk',
  borderRadius: 'none',
  buttonStyle: 'sharp',
  gridOpacity: '0.03',
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

const HOME_SECTION_IDS = ['hero', 'services', 'products', 'frameworks', 'contact'] as const
const HOME_RESPONSIVE_VIEWPORTS = ['desktop', 'tablet', 'mobile'] as const
const HOME_SECTION_BLOCK_IDS = {
  hero: ['headline', 'ctas', 'stats'],
  services: ['header', 'grid'],
  products: ['header', 'cards'],
  frameworks: ['header', 'items'],
  contact: ['header', 'channels', 'form'],
} as const

const SITE_PAGE_CATEGORIES = ['principal', 'servicios', 'productos', 'protocolos', 'legal', 'marketing', 'custom'] as const
const SITE_PAGE_STATUSES = ['published', 'draft'] as const
const SITE_PAGE_EDITORS = ['home', 'services', 'products', 'design', 'site', 'marketing', 'none'] as const
const SITE_PAGE_BLOCK_TYPES = [
  'hero', 'text', 'richtext', 'feature-list', 'cta', 'contact', 'spacer',
  'heading', 'button', 'image', 'video', 'embed', 'divider',
  'form', 'social', 'tabs', 'toggle', 'gallery', 'counter', 'lottie', 'accordion', 'carousel',
  'map', 'testimonial', 'progress', 'progressbar',
  'grid', 'timeline', 'bento', 'loopgrid', 'portfolio', 'pricing', 'flipbox', 'hotspots', 'navmenu',
  'icon', 'stats',
] as const
const SITE_PAGE_CATEGORY_SET = new Set<string>(SITE_PAGE_CATEGORIES)
const SITE_PAGE_STATUS_SET = new Set<string>(SITE_PAGE_STATUSES)
const SITE_PAGE_EDITOR_SET = new Set<string>(SITE_PAGE_EDITORS)
const SITE_PAGE_BLOCK_TYPE_SET = new Set<string>(SITE_PAGE_BLOCK_TYPES)

function normalizePagePath(path: unknown) {
  const raw = typeof path === 'string' ? path.trim() : ''
  if (!raw) return '/'
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`
  const compact = withSlash.replace(/\s+/g, '-').replace(/\/{2,}/g, '/')
  if (compact === '/') return '/'
  return compact.endsWith('/') ? compact.slice(0, -1) : compact
}

function normalizeCmsLink(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''

  if (raw.startsWith('#')) return `#${raw.replace(/^#+/, '').trim()}`
  if (raw.startsWith('/#')) return `/#${raw.replace(/^\/#+/, '').trim()}`

  if (/^(mailto:|tel:)/i.test(raw)) return raw
  if (/^https?:\/\//i.test(raw)) return raw

  if (/^\/https?:\/\//i.test(raw)) return raw.replace(/^\/(https?:\/\/)/i, '$1')
  if (/^\/https?:\//i.test(raw)) return raw.replace(/^\/https?:\//i, (match) => (match.includes('https') ? 'https://' : 'http://'))
  if (/^https?:\/[^/]/i.test(raw)) return raw.replace(/^https?:\//i, (match) => (match.toLowerCase().startsWith('https') ? 'https://' : 'http://'))

  return normalizePagePath(raw)
}

function createDefaultBlocks(title: string, description: string, accentColor: string) {
  return [
    {
      id: 'hero',
      type: 'hero',
      name: 'Hero principal',
      visible: true,
      order: 0,
      content: {
        eyebrow: 'Bloque inicial',
        title,
        body: description || 'Describe aquí el mensaje principal de la página.',
        primaryLabel: 'Contáctanos',
        primaryHref: '/#contacto',
        secondaryLabel: 'Ir al inicio',
        secondaryHref: '/inicio',
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '5rem',
      },
    },
    {
      id: 'content',
      type: 'text',
      name: 'Contenido principal',
      visible: true,
      order: 1,
      content: {
        title: '¿Qué incluye esta página?',
        body: 'Usa este bloque para explicar detalles del servicio, producto o propuesta de valor con lenguaje claro.',
      },
      style: {
        backgroundColor: '#f8fafc',
        textColor: '#334155',
        align: 'left',
        paddingY: '4rem',
      },
    },
    {
      id: 'cta',
      type: 'cta',
      name: 'Cierre con CTA',
      visible: true,
      order: 2,
      content: {
        title: '¿Listo para avanzar?',
        body: 'Podemos ayudarte a definir el siguiente paso para tu organización.',
        primaryLabel: 'Hablar con un asesor',
        primaryHref: '/#contacto',
      },
      style: {
        backgroundColor: accentColor || '#2563eb',
        textColor: '#ffffff',
        align: 'center',
        paddingY: '3.5rem',
      },
    },
  ]
}

const SERVICES_LANDING_RESULTS = [
  { title: 'Menos costos ocultos', body: 'Detectamos tareas repetitivas y errores operativos que hoy consumen tiempo y presupuesto.' },
  { title: 'Equipos más enfocados', body: 'Tu gente trabaja en decisiones importantes, no en apagar incendios todos los días.' },
  { title: 'Mejor experiencia para clientes', body: 'Procesos más ordenados se traducen en respuestas más rápidas y servicio más confiable.' },
  { title: 'Crecimiento con control', body: 'Escalas con una base sólida, sin depender de esfuerzos manuales difíciles de sostener.' },
]

const SERVICES_LANDING_WORKFLOW = [
  { title: '1. Escuchamos tu contexto', body: 'Partimos de tus metas de negocio, no de herramientas o modas.' },
  { title: '2. Definimos prioridades', body: 'Mostramos qué hacer primero para obtener resultados visibles en menor tiempo.' },
  { title: '3. Ejecutamos contigo', body: 'Diseñamos, implementamos y acompañamos a tu equipo durante todo el proceso.' },
  { title: '4. Medimos y mejoramos', body: 'Revisamos resultados y ajustamos para mantener el impacto en el tiempo.' },
]

const SERVICES_LANDING_FAQ = [
  {
    title: '¿Necesito tener un área de tecnología para empezar?',
    body: 'No. Traducimos lo técnico a decisiones de negocio para avanzar con claridad.',
  },
  {
    title: '¿Esto sirve para empresas pequeñas o solo grandes compañías?',
    body: 'Funciona para ambos casos. Ajustamos alcance según tamaño, etapa y prioridades de la empresa.',
  },
  {
    title: '¿Cuándo se empiezan a ver resultados?',
    body: 'Desde las primeras fases se identifican mejoras rápidas en orden, tiempos y foco operativo.',
  },
  {
    title: '¿Qué pasa después de implementar?',
    body: 'Seguimos contigo para medir desempeño, corregir desviaciones y mantener mejora continua.',
  },
]

type PlainServiceCopy = {
  inSimpleWords: string
  businessBenefit: string
  idealWhen: string
  outcomes: string[]
}

const SERVICES_LANDING_SIMPLE_COPY: Record<string, PlainServiceCopy> = {
  'captura-adn': {
    inSimpleWords: 'Nos sentamos contigo para entender cómo funciona hoy tu empresa y qué te está frenando.',
    businessBenefit: 'Evitas invertir a ciegas y priorizas solo lo que realmente mejora ventas, tiempos o costos.',
    idealWhen: 'Sientes que debes modernizarte, pero no tienes claridad de por dónde empezar.',
    outcomes: ['Mapa claro de prioridades', 'Plan por etapas fácil de ejecutar', 'Decisiones con menos riesgo'],
  },
  'mapeo-procesos': {
    inSimpleWords: 'Ordenamos tus procesos para que todos trabajen de forma más simple y consistente.',
    businessBenefit: 'Reduces reprocesos, errores y tiempos muertos en áreas clave del negocio.',
    idealWhen: 'Tu equipo depende de “como cada uno lo hace” y eso genera cuellos de botella.',
    outcomes: ['Procesos claros para todo el equipo', 'Menos retrabajo operativo', 'Mayor velocidad de respuesta al cliente'],
  },
  'humano-vs-tecnologia': {
    inSimpleWords: 'Definimos qué tareas debe hacer una persona y cuáles conviene automatizar.',
    businessBenefit: 'Tu equipo se enfoca en lo que aporta valor y la tecnología se encarga de lo repetitivo.',
    idealWhen: 'Quieres usar automatización o IA sin perder el control ni afectar la calidad.',
    outcomes: ['Roles más claros', 'Automatización con criterio', 'Menor riesgo en la operación'],
  },
  'diseno-desarrollo': {
    inSimpleWords: 'Construimos la solución digital que necesitas, desde una idea hasta una versión funcional.',
    businessBenefit: 'Obtienes una herramienta hecha para tu operación, no una plantilla genérica.',
    idealWhen: 'Ya sabes qué resolver y necesitas pasar rápido de la idea a algo usable.',
    outcomes: ['Prototipo validado en poco tiempo', 'Solución adaptada a tu empresa', 'Visibilidad continua del avance'],
  },
  implementacion: {
    inSimpleWords: 'Ponemos la solución en marcha con tu equipo, cuidando que el cambio funcione en la práctica.',
    businessBenefit: 'Aceleras la adopción y evitas interrupciones que afecten clientes o ingresos.',
    idealWhen: 'Tienes una herramienta lista, pero te preocupa que la implementación falle.',
    outcomes: ['Arranque controlado', 'Capacitación por rol', 'Soporte cercano en las primeras semanas'],
  },
  'seguimiento-mejora': {
    inSimpleWords: 'Medimos resultados y ajustamos continuamente para que la solución siga generando valor.',
    businessBenefit: 'No te quedas con un sistema estático: mejoras mes a mes según datos reales.',
    idealWhen: 'Quieres asegurar que la inversión siga rindiendo y evolucionando con tu negocio.',
    outcomes: ['Indicadores de desempeño claros', 'Plan de mejoras continuo', 'Evolución constante sin improvisar'],
  },
}

function getServicesPlainCopy(slug: string, fallbackDescription: string): PlainServiceCopy {
  return (
    SERVICES_LANDING_SIMPLE_COPY[slug] ?? {
      inSimpleWords: fallbackDescription,
      businessBenefit: 'Te ayuda a tomar decisiones con más claridad y menos riesgo.',
      idealWhen: 'Quieres mejorar resultados sin afectar la operación del día a día.',
      outcomes: ['Más orden operativo', 'Más foco del equipo', 'Más continuidad'],
    }
  )
}

function createServicesLandingBlocks(_pageTitle: string, siteEmail: string) {
  const serviceItems = servicesDetail.map((service, index) => {
    const plain = getServicesPlainCopy(service.slug, service.description)
    return {
      id: `service-${index + 1}`,
      eyebrow: `Servicio ${index + 1}`,
      title: service.title,
      inSimpleWords: plain.inSimpleWords,
      businessBenefit: plain.businessBenefit,
      idealWhen: plain.idealWhen,
      outcomes: plain.outcomes,
      label: 'Ver detalle del servicio',
      url: `/servicios/${service.slug}`,
    }
  })

  const blocks = [
    {
      id: 'hero',
      type: 'hero',
      name: 'Hero principal',
      visible: true,
      order: 0,
      content: {
        eyebrow: 'Servicios explicados sin tecnicismos',
        title: 'Te ayudamos a modernizar tu empresa paso a paso, con decisiones simples y enfocadas en resultados.',
        body: 'Diseñamos e implementamos mejoras reales para AlgoritmoT: menos fricción operativa, más orden interno y un mejor servicio para tus clientes.',
        primaryLabel: 'Ver servicios',
        primaryHref: '/#servicios-explicados',
        secondaryLabel: 'Quiero asesoría',
        secondaryHref: '/#contacto-simple',
      },
      style: {
        backgroundColor: 'transparent',
        textColor: '#0b1323',
        align: 'left',
        paddingY: '6rem',
      },
    },
    {
      id: 'promesas',
      type: 'feature-list',
      name: 'Promesas principales',
      visible: true,
      order: 1,
      content: {
        title: 'Hablamos en lenguaje de negocio',
        body: 'Acompañamos el proceso de extremo a extremo.',
        items: [
          'Hablamos en lenguaje de negocio',
          'Priorizamos impacto antes que complejidad',
          'Acompañamos desde diagnóstico hasta mejora',
        ],
      },
      style: {
        backgroundColor: 'transparent',
        textColor: '#0b1323',
        align: 'left',
        columns: '3',
        paddingY: '2rem',
      },
    },
    {
      id: 'servicios',
      type: 'grid',
      name: 'Servicios explicados',
      visible: true,
      order: 2,
      content: {
        eyebrow: 'Servicios de punta a punta',
        title: 'Qué hacemos y cómo beneficia a tu empresa',
        body: 'Cada servicio está explicado en tres preguntas simples: qué es, cómo te ayuda y cuándo te conviene.',
        items: serviceItems,
      },
      style: {
        backgroundColor: 'transparent',
        textColor: '#0f172a',
        align: 'left',
        columns: '2',
        paddingY: '5rem',
      },
    },
    {
      id: 'beneficios',
      type: 'grid',
      name: 'Beneficios directos',
      visible: true,
      order: 3,
      content: {
        eyebrow: 'Lo que puedes esperar',
        title: 'Beneficios directos para el negocio',
        body: 'Resultados visibles para operación y crecimiento con foco en impacto real.',
        items: SERVICES_LANDING_RESULTS,
      },
      style: {
        backgroundColor: 'transparent',
        textColor: '#0f172a',
        align: 'left',
        columns: '1',
        paddingY: '5rem',
      },
    },
    {
      id: 'flujo',
      type: 'timeline',
      name: 'Cómo trabajamos',
      visible: true,
      order: 4,
      content: {
        eyebrow: 'Cómo trabajamos',
        title: 'Cómo trabajamos',
        items: SERVICES_LANDING_WORKFLOW,
        badges: ['Rapidez', 'Acompañamiento', 'Control'],
      },
      style: {
        backgroundColor: '#0f172a',
        textColor: '#ffffff',
        align: 'left',
        paddingY: '4rem',
      },
    },
    {
      id: 'faq',
      type: 'accordion',
      name: 'Preguntas frecuentes',
      visible: true,
      order: 5,
      content: {
        eyebrow: 'Preguntas frecuentes',
        title: 'Respuestas claras para tomar decisiones',
        items: SERVICES_LANDING_FAQ,
      },
      style: {
        backgroundColor: 'transparent',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '5rem',
      },
    },
    {
      id: 'contacto',
      type: 'contact',
      name: 'Canales de contacto',
      visible: true,
      order: 6,
      content: {
        eyebrow: 'Hablemos de tu caso',
        title: 'Cuéntanos qué quieres mejorar',
        body: 'Te ayudamos a definir el mejor punto de inicio según tus objetivos de negocio y tu contexto actual.',
        email: siteEmail,
        secondaryLabel: 'LinkedIn de AlgoritmoT',
        secondaryHref: defaultSiteConfig.links.linkedin,
        formNameLabel: 'Identificación',
        formNamePlaceholder: 'Tu nombre',
        formEmailLabel: 'Canal de comunicación',
        formEmailPlaceholder: 'email@ejemplo.com',
        formRequirementLabel: 'Requerimiento técnico',
        formRequirementPlaceholder: '¿En qué fase de tu transformación digital te encuentras?',
        primaryLabel: 'Contactar ahora',
        primaryHref: '/#contacto',
        complianceText: 'Cumplimos con normativas de privacidad GDPR. Tus datos están seguros bajo protocolo SSL.',
      },
      style: {
        backgroundColor: 'transparent',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '5rem',
      },
    },
    {
      id: 'cta',
      type: 'cta',
      name: 'Cierre con CTA',
      visible: true,
      order: 7,
      content: {
        eyebrow: 'Cierre con CTA',
        title: '¿Listo para avanzar?',
        body: 'Agenda una conversación para priorizar decisiones y próximos pasos.',
        primaryLabel: 'Hablar con un asesor',
        primaryHref: '/#contacto',
      },
      style: {
        backgroundColor: 'transparent',
        textColor: '#0f172a',
        align: 'center',
        paddingY: '4rem',
      },
    },
  ]

  return blocks.map((block, index) => ({ ...block, order: index }))
}

function createClassicHomeBlocks(pageTitle: string, pageDescription: string, accentColor: string, siteEmail: string) {
  const servicesItems = servicesDetail.map((service) => ({
    title: service.title,
    body: service.description,
    url: `/servicios/${service.slug}`,
  }))
  const productsItems = productsDetail.map((product) => ({
    title: product.title,
    body: product.description,
    value: product.price,
    url: `/productos/${product.slug}`,
  }))
  const frameworkItems = defaultContent.frameworks.items.map((item: any) => ({
    title: item.organization,
    body: `${item.name}: ${item.description}`,
  }))

  const blocks = [
    {
      id: 'hero',
      type: 'hero',
      name: 'Hero clásico',
      visible: true,
      order: 0,
      content: {
        eyebrow: defaultContent.hero.highlight,
        title: pageTitle,
        subtitle: defaultContent.hero.title,
        body: pageDescription || defaultContent.hero.subtitle,
        primaryLabel: defaultContent.hero.cta || 'Iniciar transformación',
        primaryHref: '/#contacto',
        secondaryLabel: defaultContent.hero.secondaryCta || 'Ver servicios',
        secondaryHref: '/#servicios',
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '5rem',
      },
    },
    {
      id: 'servicios',
      type: 'grid',
      name: 'Servicios',
      visible: true,
      order: 1,
      content: {
        title: 'Portafolio de Servicios Digitales',
        body: 'Nuestro método sistemático para capturar valor y asegurar la adopción real.',
        items: servicesItems,
      },
      style: {
        backgroundColor: '#f8fafc',
        textColor: '#0f172a',
        align: 'left',
        columns: '3',
        paddingY: '4rem',
      },
    },
    {
      id: 'productos',
      type: 'grid',
      name: 'Productos',
      visible: true,
      order: 2,
      content: {
        title: 'Performance Modules',
        body: 'Soluciones sistematizadas para resultados predecibles y escalables.',
        items: productsItems,
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        columns: '3',
        paddingY: '4rem',
      },
    },
    {
      id: 'frameworks',
      type: 'feature-list',
      name: 'Frameworks y confianza',
      visible: true,
      order: 3,
      content: {
        title: defaultContent.frameworks.title,
        body: 'Marcos de trabajo globales para garantizar resiliencia y adopción.',
        items: frameworkItems.map((item) => item.body),
      },
      style: {
        backgroundColor: '#0f172a',
        textColor: '#ffffff',
        align: 'left',
        columns: '2',
        paddingY: '4rem',
      },
    },
    {
      id: 'contacto',
      type: 'contact',
      name: 'Contacto',
      visible: true,
      order: 4,
      content: {
        title: 'Iniciemos el despliegue',
        body: 'Canales directos para iniciar una conversación estratégica.',
        email: siteEmail,
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '3.5rem',
      },
    },
    {
      id: 'cta',
      type: 'cta',
      name: 'Cierre con CTA',
      visible: true,
      order: 5,
      content: {
        title: 'Iniciar transformación',
        body: 'Activa la siguiente etapa con un plan claro de ejecución.',
        primaryLabel: 'Hablar con un asesor',
        primaryHref: '/#contacto',
      },
      style: {
        backgroundColor: accentColor || '#2563eb',
        textColor: '#ffffff',
        align: 'center',
        paddingY: '3.5rem',
      },
    },
  ]

  return blocks.map((block, index) => ({ ...block, order: index }))
}

function createTransversalCaseBlocks(siteEmail: string) {
  const serviceBySlug = new Map(servicesDetail.map((service) => [service.slug, service]))
  const productBySlug = new Map(productsDetail.map((product) => [product.slug, product]))
  const flowStates = [
    'Reporte del incidente',
    'Triage y clasificación',
    'Asignación del caso',
    'Investigación',
    'Definición de medidas',
    'Verificación de cumplimiento',
    'Cierre del caso',
    'Evaluación de efectividad',
  ]

  const serviceAppliedItems = [
    {
      slug: 'captura-adn',
      icon: 'Search',
      what: 'Entendimos cómo funcionaba la gestión de incidentes en campo, desde el reporte hasta la revisión de medidas.',
      purpose: 'Identificar fricciones reales, puntos de fuga, tareas repetidas y decisiones críticas.',
      value: 'Se evitó una solución genérica y se intervino exactamente donde se perdía tiempo y control.',
    },
    {
      slug: 'mapeo-procesos',
      icon: 'Network',
      what: 'Convertimos un proceso disperso en un flujo único con estados, responsables, reglas y criterios comunes.',
      purpose: 'Ordenar la operación y eliminar ambigüedades entre áreas.',
      value: 'Menos reproceso, menos dependencia de memoria individual y más consistencia entre sedes.',
    },
    {
      slug: 'humano-vs-tecnologia',
      icon: 'Users',
      what: 'Definimos qué actividades se mantenían bajo criterio humano y cuáles se automatizaban.',
      purpose: 'Evitar sobreautomatizar decisiones sensibles y automatizar lo repetitivo.',
      value: 'El equipo SST se enfocó en investigar, decidir y prevenir; el sistema en alertar y trazar.',
    },
    {
      slug: 'diseno-desarrollo',
      icon: 'Code2',
      what: 'Construimos el módulo digital de incidentes con registro, evidencias, responsables, planes y estados.',
      purpose: 'Convertir el proceso rediseñado en una herramienta operativa real.',
      value: 'Solución hecha sobre su forma de operar, no una adaptación forzada a plantilla.',
    },
    {
      slug: 'implementacion',
      icon: 'Rocket',
      what: 'Desplegamos por fases, con piloto por sedes y capacitación por rol.',
      purpose: 'Poner la solución en marcha sin detener la operación.',
      value: 'Transición controlada, menor resistencia al cambio y adopción más rápida.',
    },
    {
      slug: 'seguimiento-mejora',
      icon: 'LineChart',
      what: 'Activamos tableros, comités de revisión e indicadores de evolución.',
      purpose: 'Medir desempeño y corregir desviaciones con datos reales.',
      value: 'El sistema no quedó instalado y olvidado: siguió mejorando mes a mes.',
    },
  ]

  const serviceJourneyItems = serviceAppliedItems.map((entry, index) => {
    const service = serviceBySlug.get(entry.slug)
    return {
      id: `servicio-${index + 1}`,
      eyebrow: `Servicio ${index + 1}`,
      icon: entry.icon,
      title: service?.title || `Servicio ${index + 1}`,
      body: entry.what,
      what: entry.what,
      purpose: entry.purpose,
      valueText: entry.value,
      label: 'Ver servicio',
      url: service ? `/servicios/${service.slug}` : '',
    }
  })

  const productItems = [
    {
      icon: 'MapPin',
      title: 'Diagnóstico MD-IA',
      body: 'Evaluación integral de madurez digital e IA aplicada a la operación. Dejó línea base, brechas críticas y ruta de transformación por sede.',
      url: '/productos/diagnostico-md-ia',
    },
    {
      icon: 'Settings2',
      title: 'Módulo Operativo de Gestión de Incidentes SST',
      body: 'Sistema para registrar, investigar, asignar, controlar y cerrar incidentes con trazabilidad de punta a punta.',
      url: '/productos/prototipo-funcional',
    },
    {
      icon: 'BarChart3',
      title: 'Tablero Ejecutivo y Analítica en Tiempo Real',
      body: 'Capa de visualización para operación y dirección: criticidad, SLA, cumplimiento de medidas y evolución por sede.',
      url: '#vista-ejecutiva',
    },
    {
      icon: 'Infinity',
      title: 'Retainer de Mejora Continua',
      body: 'Acompañamiento post-lanzamiento para optimizar alertas, reglas de seguimiento, indicadores y adopción continua.',
      url: '/productos/retainer-mejora',
    },
  ]

  const serviceToProductItems = [
    { title: 'Captura del ADN', body: 'Diagnóstico de operación actual y mapa de fricciones' },
    { title: 'Mapeo de procesos', body: 'Flujo validado y rediseñado con reglas comunes' },
    { title: 'Decisión humano vs tecnología', body: 'Modelo de automatización con control de riesgos' },
    { title: 'Diseño y desarrollo', body: 'Módulo operativo SST en producción' },
    { title: 'Implementación', body: 'Despliegue por fases y adopción por rol' },
    { title: 'Seguimiento continuo', body: 'Tablero ejecutivo + retainer de mejora' },
  ]

  const blocks = [
    {
      id: 'hero',
      type: 'hero',
      name: 'Caso transversal · Hero',
      visible: true,
      order: 0,
      content: {
        eyebrow: 'Caso real: salud y seguridad en el trabajo',
        title: 'De reportes por WhatsApp a control operativo en tiempo real',
        subtitle: 'Una empresa de salud y seguridad en el trabajo pasó de llamadas, correos y Excel a un flujo digital único, trazabilidad de punta a punta, responsables visibles, alertas automáticas y analítica en vivo.',
        body: 'Antes: cada incidente se reportaba por un canal distinto y el seguimiento dependía de perseguir personas. Después: cada caso entra a un solo flujo, queda asignado, se documenta con evidencia, activa medidas, controla vencimientos y permite evaluar resultados en tiempo real.',
        primaryLabel: 'Ver transformación completa',
        primaryHref: '#situacion-inicial',
        secondaryLabel: 'Ver resultados',
        secondaryHref: '#resultados-caso',
      },
      style: {
        backgroundColor: '#e2ece7',
        backgroundGradient: 'linear-gradient(120deg, rgba(226,236,231,0.96) 0%, rgba(245,248,246,0.94) 58%, rgba(255,248,224,0.76) 100%)',
        textColor: '#0b1323',
        align: 'left',
        paddingY: '7rem',
      },
    },
    {
      id: 'kpis-top',
      type: 'counter',
      name: 'KPIs principales',
      visible: true,
      order: 1,
      content: {
        title: 'Impacto visible desde el inicio',
        anchor: 'resultados-caso',
        items: [
          {
            label: 'Menos tiempo de respuesta al reporte inicial',
            value: 71,
            prefix: '-',
            suffix: '%',
            trend: '↓',
            status: 'ok',
            description: 'Se eliminaron transcripciones y reenvíos manuales.',
          },
          {
            label: 'Incidentes con trazabilidad completa',
            value: 96,
            suffix: '%',
            trend: '↑',
            status: 'ok',
            description: 'Cada caso quedó conectado con responsable, evidencia y cierre.',
          },
          {
            label: 'Medidas correctivas verificadas a tiempo',
            value: 89,
            suffix: '%',
            trend: '↑',
            status: 'ok',
            description: 'Las acciones pasaron de intención a gestión controlada.',
          },
        ],
      },
      style: {
        backgroundColor: '#0b1530',
        textColor: '#f8fbff',
        align: 'left',
        paddingY: '3.5rem',
      },
    },
    {
      id: 'caso-descripcion',
      type: 'richtext',
      name: 'Caso explicado',
      visible: true,
      order: 2,
      content: {
        title: 'Caso real: salud y seguridad en el trabajo',
        html: '<p>Una empresa de SST gestionaba incidentes desde múltiples canales: llamadas, WhatsApp, correos y hojas de cálculo. Cada área hacía seguimiento por separado, sin una vista consolidada del caso ni del riesgo operativo.</p><p>El resultado era predecible: tiempos largos de respuesta, tareas duplicadas, medidas correctivas sin cierre verificable, baja trazabilidad y poca capacidad para prevenir reincidencias.</p><p>Diseñamos e implementamos una solución integral para transformar ese proceso en una operación digital controlada, con seguimiento en tiempo real desde el reporte inicial hasta la evaluación de efectividad.</p>',
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#243448',
        align: 'left',
        paddingY: '4rem',
      },
    },
    {
      id: 'fotos-caso',
      type: 'gallery',
      name: 'Fotos narrativas',
      visible: true,
      order: 3,
      content: {
        title: 'Momentos del proceso en campo',
        body: 'Reporte, seguimiento y comité de revisión en una sola narrativa visual.',
        items: [
          {
            title: 'Reporte en campo',
            description: 'Registro inicial con criticidad y evidencia desde el origen.',
            body: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1800&auto=format&fit=crop',
          },
          {
            title: 'Seguimiento operativo',
            description: 'Responsables, fechas y acciones visibles para todo el equipo SST.',
            body: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=1800&auto=format&fit=crop',
          },
          {
            title: 'Comité con tablero',
            description: 'Revisión de vencimientos, criticidad y avance de medidas.',
            body: 'https://images.unsplash.com/photo-1581594549595-35f6edc7b762?q=80&w=1800&auto=format&fit=crop',
          },
        ],
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        radius: '0.75rem',
        paddingY: '4rem',
      },
    },
    {
      id: 'situacion-inicial',
      type: 'text',
      name: 'Situación inicial',
      visible: true,
      order: 4,
      content: {
        anchor: 'situacion-inicial',
        eyebrow: 'Situación inicial',
        title: 'Qué ocurría antes',
        body: 'Cuando se presentaba un incidente, el reporte podía llegar por cualquier canal. Luego alguien lo transcribía manualmente a Excel o lo reenviaba por correo. Desde ahí, cada responsable seguía el caso desde su propia lógica, con formatos distintos y evidencia dispersa.',
      },
      style: {
        backgroundColor: '#f8fbfa',
        textColor: '#334155',
        align: 'left',
        paddingY: '3.5rem',
      },
    },
    {
      id: 'consecuencias',
      type: 'feature-list',
      name: 'Consecuencias operativas',
      visible: true,
      order: 5,
      content: {
        title: 'Consecuencias operativas',
        body: 'Puntos críticos que impactaban tiempos, control y prevención.',
        items: [
          'Reportes incompletos o duplicados',
          'Investigación sin estándar único',
          'Medidas correctivas sin control de ejecución',
          'Cierres sin verificación de efectividad',
          'Falta de priorización por criticidad',
          'Cero visibilidad consolidada para comités y dirección',
        ],
      },
      style: {
        backgroundColor: '#eef4f2',
        textColor: '#0f172a',
        align: 'left',
        columns: '2',
        paddingY: '4rem',
      },
    },
    {
      id: 'transformacion',
      type: 'text',
      name: 'La transformación',
      visible: true,
      order: 6,
      content: {
        title: 'Qué transformamos',
        body: 'Pasamos de una gestión fragmentada a un flujo digital único de incidentes, con estados visibles, responsables definidos, evidencias centralizadas, alertas automáticas y tablero en vivo para seguimiento operativo y toma de decisiones.',
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '3.5rem',
      },
    },
    {
      id: 'antes-despues',
      type: 'grid',
      name: 'Antes vs después',
      visible: true,
      order: 7,
      content: {
        title: 'Operación manual vs operación controlada',
        body: 'Comparación directa para entender el salto operativo.',
        items: [
          {
            icon: 'Boxes',
            eyebrow: 'ANTES',
            title: 'Antes',
            body: 'Reportes en canales dispersos. Registro manual y duplicado. Investigación sin estándar único. Seguimiento por correos y llamadas. Medidas sin control visible. Cierres tardíos y sin evaluación consistente. Sin tablero consolidado.',
          },
          {
            icon: 'CheckCircle2',
            eyebrow: 'DESPUÉS',
            title: 'Después',
            body: 'Un solo flujo digital. Registro estructurado desde origen. Investigación con criterios comunes. Responsables y evidencias visibles. Alertas automáticas. Verificación y evaluación de efectividad. Tablero en vivo para decidir a tiempo.',
          },
        ],
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        columns: '2',
        paddingY: '4rem',
      },
    },
    {
      id: 'servicios-aplicados',
      type: 'grid',
      name: 'Servicios aplicados',
      visible: true,
      order: 8,
      content: {
        title: 'Cómo acompañamos el cambio (6 servicios)',
        body: 'Hablamos menos en consultoría y más en qué hicimos, para qué sirvió y qué valor dejó.',
        items: serviceJourneyItems,
      },
      style: {
        backgroundColor: '#e9f1ee',
        textColor: '#0f172a',
        align: 'left',
        columns: '2',
        paddingY: '4.5rem',
      },
    },
    {
      id: 'flujo-operativo',
      type: 'timeline',
      name: 'Flujo de 8 estados',
      visible: true,
      order: 9,
      content: {
        title: 'El nuevo flujo operativo',
        items: flowStates.map((state, index) => ({
          id: `estado-${index + 1}`,
          title: `${index + 1}. ${state}`,
          body: 'Estado controlado con responsable y evidencia.',
        })),
      },
      style: {
        backgroundColor: '#f7faf9',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '4.5rem',
      },
    },
    {
      id: 'productos-generados',
      type: 'grid',
      name: 'Productos generados',
      visible: true,
      order: 10,
      content: {
        anchor: 'productos-generados',
        title: 'Productos generados por el proyecto',
        body: 'No solo hubo acompañamiento: quedaron instalados productos concretos para operar y escalar.',
        items: productItems.map((product, index) => ({
          id: `producto-${index + 1}`,
          icon: product.icon,
          eyebrow: `Producto ${index + 1}`,
          title: product.title,
          body: product.body,
          url: product.url,
        })),
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        columns: '2',
        paddingY: '4.5rem',
      },
    },
    {
      id: 'servicio-producto',
      type: 'grid',
      name: 'Servicio → producto',
      visible: true,
      order: 11,
      content: {
        title: 'Qué hizo el servicio y qué producto dejó',
        body: 'Doble capa para conectar acompañamiento con entregables concretos.',
        items: serviceToProductItems.map((entry, index) => ({
          id: `mapa-${index + 1}`,
          icon: 'Link2',
          title: entry.title,
          body: entry.body,
        })),
      },
      style: {
        backgroundColor: '#eef4f2',
        textColor: '#0f172a',
        align: 'left',
        columns: '2',
        paddingY: '4rem',
      },
    },
    {
      id: 'arquitectura-simple',
      type: 'grid',
      name: 'Arquitectura simple',
      visible: true,
      order: 12,
      content: {
        title: 'Arquitectura simple del sistema',
        body: 'Usuario en campo → formulario de incidente → motor de estados → responsables → evidencias → alertas → dashboard → comité SST.',
        items: [
          { icon: 'UserRound', title: 'Usuario en campo', body: 'Registra incidente con evidencia inicial.' },
          { icon: 'ClipboardCheck', title: 'Formulario de incidente', body: 'Captura datos estructurados y criticidad.' },
          { icon: 'Settings', title: 'Motor de estados', body: 'Orquesta el flujo y los cambios de estado.' },
          { icon: 'Users', title: 'Responsables', body: 'Asigna dueño y fechas compromiso por tarea.' },
          { icon: 'UploadCloud', title: 'Evidencias', body: 'Centraliza soportes para verificar acciones.' },
          { icon: 'TriangleAlert', title: 'Alertas', body: 'Notifica vencimientos y riesgos prioritarios.' },
          { icon: 'LayoutGrid', title: 'Dashboard', body: 'Visibilidad operativa y ejecutiva en vivo.' },
          { icon: 'ShieldCheck', title: 'Comité SST', body: 'Decide, corrige y prioriza con datos.' },
        ],
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        columns: '4',
        paddingY: '4rem',
      },
    },
    {
      id: 'vista-ejecutiva',
      type: 'image',
      name: 'Vista ejecutiva',
      visible: true,
      order: 13,
      content: {
        anchor: 'vista-ejecutiva',
        title: 'Vista ejecutiva del sistema',
        body: 'La dirección ya no depende de reportes tardíos o fragmentados. En un solo tablero ve incidentes abiertos, criticidad, casos vencidos, avance de medidas, cumplimiento por sede y evolución mensual para decidir antes de que el problema escale.',
        previewMode: 'sst-dashboard',
        previewKpis: [
          { label: 'Incidentes abiertos', value: 38, delta: '-14%', status: 'warn', note: '12 de alta criticidad' },
          { label: 'Cumplimiento SLA', value: 87, delta: '+6%', status: 'ok', note: 'Mejora sostenida por sede' },
          { label: 'Medidas en tiempo', value: 89, delta: '+9%', status: 'ok', note: 'Seguimiento con alertas activas' },
          { label: 'Riesgo crítico', value: 11, delta: '-5 pts', status: 'risk', note: 'Tendencia a la baja mensual' },
        ],
        previewQueue: [
          { title: 'Caída en planta norte', owner: 'SST Medellín', sla: '6h', status: 'En investigación' },
          { title: 'Lesión lumbar en bodega', owner: 'SST Bogotá', sla: '4h', status: 'Medidas activas' },
          { title: 'Incidente con montacargas', owner: 'SST Cali', sla: '2h', status: 'Escalado' },
          { title: 'Falla de EPP en turno nocturno', owner: 'SST Barranquilla', sla: '8h', status: 'Verificación' },
        ],
        previewStages: [
          { label: 'Reporte', value: 100 },
          { label: 'Investigación', value: 93 },
          { label: 'Medidas', value: 91 },
          { label: 'Cierre', value: 87 },
        ],
        previewAlerts: [
          { label: '4 casos vencen en menos de 24h' },
          { label: '2 sedes requieren comité extraordinario' },
          { label: '1 patrón repetitivo en incidentes locativos' },
        ],
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        radius: '0.75rem',
        maxHeight: '560px',
        paddingY: '4rem',
      },
    },
    {
      id: 'resultados-comparativos',
      type: 'progress',
      name: 'Gráfica comparativa',
      visible: true,
      order: 14,
      content: {
        title: 'Gráfica de barras: antes vs después',
        body: 'Comparativo directo de los indicadores más comerciales del caso.',
        chartMode: 'compare',
        compareLabelA: 'Antes',
        compareLabelB: 'Después',
        items: [
          { label: 'Tiempo promedio de respuesta inicial', before: 100, value: 29 },
          { label: 'Tiempo promedio de cierre', before: 100, value: 44 },
          { label: 'Trazabilidad completa de incidentes', before: 34, value: 96 },
          { label: 'Medidas verificadas a tiempo', before: 38, value: 89 },
          { label: 'Cierres dentro de SLA', before: 41, value: 87 },
        ],
      },
      style: {
        backgroundColor: '#f8fbfa',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '4rem',
      },
    },
    {
      id: 'semaforo-sedes',
      type: 'grid',
      name: 'Semáforo por sede',
      visible: true,
      order: 15,
      content: {
        title: 'Semáforo operativo por sede',
        body: 'Vista rápida para saber dónde hay control, dónde hay atención y dónde intervenir primero.',
        chartMode: 'semaforo',
        items: [
          { title: 'Bogotá', value: 94, status: 'ok', body: 'Operación estable y medidas en cumplimiento.' },
          { title: 'Medellín', value: 86, status: 'ok', body: 'Buen desempeño con foco en reducir tiempos de cierre.' },
          { title: 'Cali', value: 74, status: 'warn', body: 'Aumentaron incidentes leves; se reforzó verificación semanal.' },
          { title: 'Barranquilla', value: 62, status: 'risk', body: 'Desviación en SLA y evidencia incompleta en algunos casos.' },
          { title: 'Bucaramanga', value: 88, status: 'ok', body: 'Alta trazabilidad y ejecución consistente por responsables.' },
          { title: 'Manizales', value: 69, status: 'warn', body: 'Control parcial; en curso plan de mejora por criticidad.' },
        ],
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        columns: '3',
        paddingY: '4rem',
      },
    },
    {
      id: 'donut-operacion',
      type: 'stats',
      name: 'Indicadores ejecutivos',
      visible: true,
      order: 16,
      content: {
        title: 'Indicadores ejecutivos en una mirada',
        body: 'Lectura rápida del estado operativo para comité y dirección.',
        chartMode: 'donut',
        items: [
          {
            label: 'Incidentes cerrados',
            value: 78,
            suffix: '%',
            trend: '22% abiertos',
            status: 'ok',
            color: '#3b82f6',
            description: 'La mayoría de casos ya completa su ciclo con verificación.',
          },
          {
            label: 'Medidas en tiempo',
            value: 89,
            suffix: '%',
            trend: '11% vencidas',
            status: 'ok',
            color: '#22c55e',
            description: 'Seguimiento automático de compromisos y alertas activas.',
          },
          {
            label: 'Cumplimiento promedio por sede',
            value: 86,
            suffix: '%',
            trend: '+4 pts vs mes anterior',
            status: 'warn',
            color: '#f59e0b',
            description: 'Evolución positiva con brechas controladas por sede.',
          },
        ],
      },
      style: {
        backgroundColor: '#0b1530',
        textColor: '#f8fbff',
        align: 'left',
        paddingY: '4rem',
      },
    },
    {
      id: 'heatmap-riesgo',
      type: 'grid',
      name: 'Heatmap de riesgo',
      visible: true,
      order: 17,
      content: {
        title: 'Heatmap por sede y tipo de incidente',
        body: 'Priorización por criticidad para actuar primero donde el riesgo operativo es mayor.',
        chartMode: 'heatmap',
        items: [
          { area: 'Bogotá', risk: 'Biológico', value: 41, body: 'Controlado con protocolo reforzado.' },
          { area: 'Bogotá', risk: 'Ergonómico', value: 33, body: 'Monitoreo preventivo mensual.' },
          { area: 'Medellín', risk: 'Locativo', value: 58, body: 'Incidentes en descenso tras ajustes.' },
          { area: 'Medellín', risk: 'Psicosocial', value: 46, body: 'Seguimiento por comité de bienestar.' },
          { area: 'Cali', risk: 'Biológico', value: 67, body: 'Plan de contención y auditoría interna.' },
          { area: 'Cali', risk: 'Mecánico', value: 72, body: 'Prioridad alta en medidas de mitigación.' },
          { area: 'Barranquilla', risk: 'Locativo', value: 79, body: 'Zona crítica con control semanal.' },
          { area: 'Barranquilla', risk: 'Ergonómico', value: 64, body: 'Ajustes en curso por reincidencia.' },
        ],
      },
      style: {
        backgroundColor: '#081026',
        textColor: '#f8fbff',
        align: 'left',
        columns: '4',
        paddingY: '4rem',
      },
    },
    {
      id: 'embudo-operativo',
      type: 'timeline',
      name: 'Embudo operativo',
      visible: true,
      order: 18,
      content: {
        title: 'Embudo del flujo de incidentes',
        body: 'Visualiza dónde se concentran cuellos de botella y cómo se corrigen.',
        items: [
          { title: 'Reporte (100%)', body: 'Ingreso completo de casos al flujo digital.' },
          { title: 'Triage (97%)', body: 'Clasificación rápida por criticidad y tipo.' },
          { title: 'Asignación (95%)', body: 'Responsable y fecha compromiso definidos.' },
          { title: 'Investigación (93%)', body: 'Análisis de causa con evidencia centralizada.' },
          { title: 'Medidas (91%)', body: 'Acciones correctivas ejecutadas por prioridad.' },
          { title: 'Verificación (89%)', body: 'Control de cumplimiento y calidad documental.' },
          { title: 'Cierre (87%)', body: 'Cierre con criterios comunes y trazabilidad.' },
          { title: 'Evaluación (84%)', body: 'Revisión de efectividad y prevención de reincidencias.' },
        ],
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '4rem',
      },
    },
    {
      id: 'evolucion-mensual',
      type: 'progress',
      name: 'Evolución mensual',
      visible: true,
      order: 19,
      content: {
        title: 'Línea de evolución mensual',
        body: 'Medimos, analizamos, decidimos, ajustamos y volvemos a medir para sostener la mejora.',
        items: [
          { label: 'Cumplimiento de planes de acción', value: 92 },
          { label: 'Cierres dentro del SLA', value: 87 },
          { label: 'Calidad documental en primera revisión', value: 86 },
        ],
      },
      style: {
        backgroundColor: '#e8f2ef',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '4rem',
      },
    },
    {
      id: 'faq-caso',
      type: 'accordion',
      name: 'Preguntas frecuentes',
      visible: true,
      order: 20,
      content: {
        title: 'Preguntas frecuentes',
        items: [
          {
            title: '¿Cómo pasaron de manual a digital sin detener la operación?',
            body: 'No se hizo de golpe. Primero se rediseñó el flujo, luego se probó en piloto por sedes y finalmente se desplegó por fases con capacitación por rol.',
          },
          {
            title: '¿Qué cambió realmente en el seguimiento de medidas correctivas?',
            body: 'Cada medida pasó a tener responsable, fecha compromiso, evidencia y estado visible. El seguimiento dejó de depender de perseguir personas por teléfono o correo.',
          },
          {
            title: '¿Cómo se aprovecha la analítica en tiempo real?',
            body: 'Los tableros permiten ver sedes con más incidentes, riesgos repetidos, acciones vencidas y casos que requieren intervención prioritaria para prevenir.',
          },
        ],
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '4rem',
      },
    },
    {
      id: 'contacto',
      type: 'contact',
      name: 'Contacto',
      visible: true,
      order: 21,
      content: {
        title: '¿Tu operación sigue dependiendo de WhatsApp, correos y Excel?',
        body: 'Diseñamos soluciones a la medida para convertir procesos críticos en operación visible, trazable y medible en tiempo real.',
        email: siteEmail,
        primaryLabel: 'Quiero transformar mi operación',
        primaryHref: '#cta-final',
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '3.5rem',
      },
    },
    {
      id: 'cta-final',
      type: 'cta',
      name: 'CTA final',
      visible: true,
      order: 22,
      content: {
        anchor: 'cta-final',
        title: '¿Listo para aplicar este modelo en tu empresa?',
        body: 'Te mostramos una ruta clara para pasar de procesos manuales a control operativo en tiempo real.',
        primaryLabel: 'Conoce cómo aplicar este modelo en tu empresa',
        primaryHref: '#contacto',
      },
      style: {
        backgroundColor: '#0b1530',
        backgroundGradient: 'linear-gradient(115deg, #081026 0%, #0f214a 100%)',
        textColor: '#f8fbff',
        align: 'center',
        paddingY: '4rem',
      },
    },
  ]

  return blocks.map((block, index) => ({ ...block, order: index }))
}

function createDefaultBlocksByPage(pageId: string, title: string, description: string, accentColor: string, siteEmail: string) {
  if (pageId === 'home-root') return createServicesLandingBlocks(title, siteEmail)
  if (pageId === 'home-inicio') return createClassicHomeBlocks(title, description, accentColor, siteEmail)
  if (pageId === 'case-transversal') return createTransversalCaseBlocks(siteEmail)
  return createDefaultBlocks(title, description, accentColor)
}

function isLegacyScaffoldBlocks(blocks: any[], pageTitle: string) {
  if (blocks.length !== 3) return false
  const hero = blocks.find((block) => block.id === 'hero')
  const content = blocks.find((block) => block.id === 'content')
  const cta = blocks.find((block) => block.id === 'cta')
  if (!hero || !content || !cta) return false
  const heroTitle = String(hero.content?.title || '')
  const contentTitle = String(content.content?.title || '')
  const contentBody = String(content.content?.body || '')
  const ctaTitle = String(cta.content?.title || '')
  const ctaLabel = String(cta.content?.primaryLabel || '')
  return (
    heroTitle === pageTitle &&
    contentTitle === '¿Qué incluye esta página?' &&
    contentBody.includes('Usa este bloque para explicar detalles') &&
    ctaTitle === '¿Listo para avanzar?' &&
    ctaLabel === 'Hablar con un asesor'
  )
}

function isOutdatedHomeRootBlocks(blocks: any[]) {
  const servicesBlock = blocks.find((block) => block.id === 'servicios')
  if (!servicesBlock) return true
  const items = Array.isArray(servicesBlock.content?.items) ? servicesBlock.content.items : []
  if (items.length === 0) return true
  const firstObjectItem = items.find((item: any) => item && typeof item === 'object')
  if (!firstObjectItem) return true
  return !('inSimpleWords' in firstObjectItem) || !('businessBenefit' in firstObjectItem) || !('idealWhen' in firstObjectItem)
}

function isOutdatedCaseTransversalBlocks(blocks: any[]) {
  if (!Array.isArray(blocks) || blocks.length === 0) return true
  const heroBlock = blocks.find((block) => block.id === 'hero')
  const requiredBlockIds = [
    'hero',
    'kpis-top',
    'situacion-inicial',
    'consecuencias',
    'servicios-aplicados',
    'flujo-operativo',
    'productos-generados',
    'resultados-comparativos',
    'semaforo-sedes',
    'donut-operacion',
    'heatmap-riesgo',
    'cta-final',
  ]
  const hasAllRequired = requiredBlockIds.every((id) => blocks.some((block) => block?.id === id))
  const heroBody = String(heroBlock?.content?.body || '').toLowerCase()
  const heroTitle = String(heroBlock?.content?.title || '').toLowerCase()
  if (!heroBlock) return true
  if (!hasAllRequired) return true

  // v1 del caso transversal (genérico): forzar actualización al caso SST.
  if (heroBody.includes('simulamos un caso real y aplicamos los 6 servicios en secuencia')) return true
  if (heroBody.includes('empresa de servicios b2b')) return true
  if (!heroTitle.includes('reportes por whatsapp')) return true

  return false
}

function migrateLegacyBuilderPage(pageId: string, title: string, description: string, accentColor: string, blocks: any[], siteEmail: string) {
  if (pageId === 'home-root' && isOutdatedHomeRootBlocks(blocks)) {
    return createDefaultBlocksByPage(pageId, title, description, accentColor, siteEmail)
  }
  if (pageId === 'case-transversal' && isOutdatedCaseTransversalBlocks(blocks)) {
    return createDefaultBlocksByPage(pageId, title, description, accentColor, siteEmail)
  }
  if (pageId !== 'home-root' && pageId !== 'home-inicio') return blocks
  if (!isLegacyScaffoldBlocks(blocks, title)) return blocks
  return createDefaultBlocksByPage(pageId, title, description, accentColor, siteEmail)
}

function sanitizeSitePageBlocks(rawBlocks: unknown, fallbackBlocks: any[]) {
  const sourceBlocks = Array.isArray(rawBlocks) ? rawBlocks : fallbackBlocks
  const fallbackById = new Map(fallbackBlocks.map((block) => [String(block.id), block]))
  const seenIds = new Set<string>()
  const normalized: any[] = []

  sourceBlocks.forEach((entry: any, index: number) => {
    if (!entry || typeof entry !== 'object') return

    const requestedId = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `block-${index + 1}`
    let id = requestedId
    let suffix = 2
    while (seenIds.has(id)) {
      id = `${requestedId}-${suffix}`
      suffix += 1
    }
    seenIds.add(id)

    const fallback = fallbackById.get(id) ?? fallbackBlocks[index]
    const type = SITE_PAGE_BLOCK_TYPE_SET.has(String(entry.type)) ? String(entry.type) : String(fallback?.type || 'text')
    const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : String(fallback?.name || `Bloque ${index + 1}`)
    const visible = typeof entry.visible === 'boolean' ? entry.visible : Boolean(fallback?.visible ?? true)
    const order = Number.isFinite(Number(entry.order)) ? Number(entry.order) : Number(fallback?.order ?? index)

    const rawContent = entry.content && typeof entry.content === 'object' ? entry.content : {}
    const fallbackContent = fallback?.content && typeof fallback.content === 'object' ? fallback.content : {}
    const content = {
      ...fallbackContent,
      ...rawContent,
    } as Record<string, any>
    if (typeof content.primaryHref === 'string') content.primaryHref = normalizeCmsLink(content.primaryHref)
    if (typeof content.secondaryHref === 'string') content.secondaryHref = normalizeCmsLink(content.secondaryHref)
    if (Array.isArray(content.items)) {
      content.items = content.items
        .filter((item: unknown) => typeof item === 'string' || (item && typeof item === 'object'))
        .map((item: any) => {
          if (!item || typeof item !== 'object') return item
          const next = { ...item } as Record<string, unknown>
          if (typeof next.url === 'string') next.url = normalizeCmsLink(next.url)
          if (typeof next.href === 'string') next.href = normalizeCmsLink(next.href)
          return next
        })
    }

    const rawStyle = entry.style && typeof entry.style === 'object' ? entry.style : {}
    const fallbackStyle = fallback?.style && typeof fallback.style === 'object' ? fallback.style : {}
    const style = {
      ...fallbackStyle,
      ...rawStyle,
    } as Record<string, any>
    if (style.align !== 'left' && style.align !== 'center' && style.align !== 'right') {
      style.align = 'left'
    }

    normalized.push({ id, type, name, visible, order, content, style })
  })

  if (normalized.length === 0) {
    return fallbackBlocks.map((block: any, index: number) => ({
      ...block,
      order: index,
      content: {
        ...(block?.content || {}),
        items: Array.isArray(block?.content?.items)
          ? block.content.items.map((item: any) => (item && typeof item === 'object' ? { ...item } : item))
          : [],
      },
      style: { ...(block?.style || {}) },
    }))
  }

  normalized.sort((a, b) => a.order - b.order)
  return normalized.map((block, index) => ({ ...block, order: index }))
}

export function getDefaultCmsSnapshot(): CMSState {
  const services = servicesDetail.map((s) => ({
    slug: s.slug,
    title: s.title,
    highlight: s.highlight,
    subtitle: s.subtitle,
    description: s.description,
    descriptionLong: s.descriptionLong,
    ctaPrimary: s.ctaPrimary,
    ctaSecondary: s.ctaSecondary ?? '',
    seoTitle: s.seoTitle ?? '',
    seoDescription: s.seoDescription ?? '',
    features: s.features,
    outcomes: (s as any).outcomes,
    variants: (s as any).variants,
  }))

  const products = productsDetail.map((p) => ({
    slug: p.slug,
    title: p.title,
    highlight: p.highlight,
    description: p.description,
    descriptionLong: p.descriptionLong ?? '',
    price: p.price ?? '',
    ctaText: p.ctaText ?? '',
    seoTitle: p.seoTitle ?? '',
    seoDescription: p.seoDescription ?? '',
    variants: (p as any).variants,
  }))

  const defaultServicePreviewPath = services[0]?.slug ? `/servicios/${services[0].slug}` : '/servicios/captura-adn'
  const defaultProductPreviewPath = products[0]?.slug ? `/productos/${products[0].slug}` : '/productos/diagnostico-md-ia'
  const siteEmail = defaultSiteConfig.contact.email
  const defaultSiteArchitecturePages = [
    {
      id: 'home-root',
      title: 'Home (Landing principal)',
      path: '/',
      description: 'Página principal pública del sitio.',
      category: 'principal',
      status: 'published',
      editor: 'home',
      template: 'immersive',
      navLabel: 'Inicio',
      showInNavigation: true,
      previewPath: '/',
      accentColor: '#2563eb',
      notes: 'Render principal del sitio.',
      order: 0,
      locked: true,
      blocks: createDefaultBlocksByPage('home-root', 'Home (Landing principal)', 'Página principal pública del sitio.', '#2563eb', siteEmail),
    },
    {
      id: 'home-inicio',
      title: 'Home clásica',
      path: '/inicio',
      description: 'Versión clásica del home original.',
      category: 'principal',
      status: 'published',
      editor: 'home',
      template: 'balanced',
      navLabel: 'Inicio clásico',
      showInNavigation: false,
      previewPath: '/inicio',
      accentColor: '#0ea5e9',
      notes: 'Útil para comparar versiones del Home.',
      order: 1,
      locked: true,
      blocks: createDefaultBlocksByPage('home-inicio', 'Home clásica', 'Versión clásica del home original.', '#0ea5e9', siteEmail),
    },
    {
      id: 'landing-servicios',
      title: 'Landing de servicios',
      path: '/landing-servicios',
      description: 'Landing simplificada orientada a conversión.',
      category: 'principal',
      status: 'published',
      editor: 'home',
      template: 'immersive',
      navLabel: 'Servicios',
      showInNavigation: false,
      previewPath: '/landing-servicios',
      accentColor: '#16a34a',
      notes: 'Página explicativa para público no técnico.',
      order: 2,
      locked: true,
      blocks: createDefaultBlocks('Landing de servicios', 'Landing simplificada orientada a conversión.', '#16a34a'),
    },
    {
      id: 'case-transversal',
      title: 'Caso transversal (servicios + productos)',
      path: '/caso-transversal',
      description: 'Caso SST de punta a punta: incidentes laborales, seguimiento, medidas y analítica en tiempo real.',
      category: 'principal',
      status: 'published',
      editor: 'home',
      template: 'immersive',
      navLabel: 'Caso transversal',
      showInNavigation: false,
      previewPath: '/caso-transversal',
      accentColor: '#0f172a',
      notes: 'Caso real editable de SST con énfasis en productos derivados.',
      order: 3,
      locked: false,
      blocks: createDefaultBlocksByPage(
        'case-transversal',
        'Caso transversal (servicios + productos)',
        'Caso SST de punta a punta: incidentes laborales, seguimiento, medidas y analítica en tiempo real.',
        '#0f172a',
        siteEmail
      ),
    },
    {
      id: 'services-template',
      title: 'Detalle de servicios (dinámico)',
      path: '/servicios/:slug',
      description: 'Plantilla para páginas de detalle de cada servicio.',
      category: 'servicios',
      status: 'published',
      editor: 'services',
      template: 'balanced',
      navLabel: 'Servicios',
      showInNavigation: false,
      previewPath: defaultServicePreviewPath,
      accentColor: '#0891b2',
      notes: 'Cada servicio se edita en el catálogo de Servicios.',
      order: 3,
      locked: true,
      blocks: createDefaultBlocks('Detalle de servicios', 'Plantilla para páginas de detalle de cada servicio.', '#0891b2'),
    },
    {
      id: 'products-template',
      title: 'Detalle de productos (dinámico)',
      path: '/productos/:slug',
      description: 'Plantilla para páginas de detalle de productos.',
      category: 'productos',
      status: 'published',
      editor: 'products',
      template: 'balanced',
      navLabel: 'Productos',
      showInNavigation: false,
      previewPath: defaultProductPreviewPath,
      accentColor: '#7c3aed',
      notes: 'Cada producto se edita desde el catálogo de Productos.',
      order: 4,
      locked: true,
      blocks: createDefaultBlocks('Detalle de productos', 'Plantilla para páginas de detalle de productos.', '#7c3aed'),
    },
    {
      id: 'protocol-human',
      title: 'Protocolo · Ingeniería humana',
      path: '/protocolos/ingenieria-humana',
      description: 'Página del protocolo de ingeniería humana.',
      category: 'protocolos',
      status: 'published',
      editor: 'site',
      template: 'immersive',
      navLabel: 'Ingeniería humana',
      showInNavigation: false,
      previewPath: '/protocolos/ingenieria-humana',
      accentColor: '#f97316',
      notes: 'Página informativa corporativa.',
      order: 5,
      locked: true,
      blocks: createDefaultBlocks('Ingeniería humana', 'Página del protocolo de ingeniería humana.', '#f97316'),
    },
    {
      id: 'protocol-ai',
      title: 'Protocolo · Despliegue IA',
      path: '/protocolos/despliegue-ia',
      description: 'Página del protocolo de despliegue IA.',
      category: 'protocolos',
      status: 'published',
      editor: 'site',
      template: 'immersive',
      navLabel: 'Despliegue IA',
      showInNavigation: false,
      previewPath: '/protocolos/despliegue-ia',
      accentColor: '#ec4899',
      notes: 'Página informativa corporativa.',
      order: 6,
      locked: true,
      blocks: createDefaultBlocks('Despliegue IA', 'Página del protocolo de despliegue IA.', '#ec4899'),
    },
    {
      id: 'protocol-maturity',
      title: 'Protocolo · Madurez orgánica',
      path: '/protocolos/madurez-organica',
      description: 'Página del protocolo de madurez orgánica.',
      category: 'protocolos',
      status: 'published',
      editor: 'site',
      template: 'immersive',
      navLabel: 'Madurez orgánica',
      showInNavigation: false,
      previewPath: '/protocolos/madurez-organica',
      accentColor: '#22c55e',
      notes: 'Página informativa corporativa.',
      order: 7,
      locked: true,
      blocks: createDefaultBlocks('Madurez orgánica', 'Página del protocolo de madurez orgánica.', '#22c55e'),
    },
    {
      id: 'data-policy',
      title: 'Política de tratamiento de datos',
      path: '/politica-tratamiento-datos',
      description: 'Página legal de consentimiento y tratamiento de datos.',
      category: 'legal',
      status: 'published',
      editor: 'site',
      template: 'compact',
      navLabel: 'Política de datos',
      showInNavigation: false,
      previewPath: '/politica-tratamiento-datos',
      accentColor: '#334155',
      notes: 'Editable desde Configuración global.',
      order: 8,
      locked: true,
      blocks: createDefaultBlocks('Política de datos', 'Página legal de consentimiento y tratamiento de datos.', '#334155'),
    },
    {
      id: 'campaign-template',
      title: 'Landing de campañas (dinámico)',
      path: '/campanias/:slug',
      description: 'Plantilla dinámica para campañas de marketing.',
      category: 'marketing',
      status: 'published',
      editor: 'marketing',
      template: 'immersive',
      navLabel: 'Campañas',
      showInNavigation: false,
      previewPath: '/campanias/demo',
      accentColor: '#14b8a6',
      notes: 'Las campañas se gestionan en Marketing.',
      order: 9,
      locked: true,
      blocks: createDefaultBlocks('Landing de campañas', 'Plantilla dinámica para campañas de marketing.', '#14b8a6'),
    },
  ]

  return cloneJson({
    services,
    products,
    hero: defaultContent.hero,
    site: {
      name: defaultSiteConfig.name,
      description: defaultSiteConfig.description,
      url: defaultSiteConfig.url,
      contactEmail: defaultSiteConfig.contact.email,
      contactAddress: defaultSiteConfig.contact.address,
      linkedin: defaultSiteConfig.links.linkedin,
      twitter: defaultSiteConfig.links.twitter,
      dataPolicyEnabled: 'true',
      dataPolicyVersion: 'v1',
      dataPolicyTitle: 'Política de tratamiento de datos',
      dataPolicySummary: 'Usamos cookies y analítica de navegación para mejorar la experiencia, medir interacción y optimizar el contenido del sitio. Puedes consultar el detalle de tratamiento y aceptar para continuar con analítica.',
      dataPolicyContent: 'Tratamos datos de navegación con fines de analítica, mejora continua, seguridad y optimización de la experiencia digital. Esto puede incluir ubicación geográfica aproximada por IP, páginas y secciones visitadas y tiempo de permanencia estimado por página, una vez otorgado el consentimiento.',
      dataPolicyLinkLabel: 'Leer política',
      dataPolicyAcceptLabel: 'Aceptar',
      dataPolicyRejectLabel: 'Continuar sin analítica',
      headerVariant: 'classic',
      headerSticky: 'true',
      headerCtaEnabled: 'true',
      headerCtaLabel: 'Iniciar transformación',
      headerCtaHref: '/#contacto',
      footerVariant: 'detailed',
      announcementEnabled: 'false',
      announcementText: 'Nuevo: sesión de diagnóstico sin costo para equipos directivos.',
      announcementHref: '/#contacto',
      announcementBgColor: '#0f172a',
      announcementTextColor: '#ffffff',
      pageTemplateHome: 'immersive',
      pageTemplateService: 'balanced',
      pageTemplateProduct: 'balanced',
      pageTemplateProtocol: 'immersive',
      pageTemplatePolicy: 'compact',
      performanceMode: 'standard',
      motionPreference: 'system',
      popupEnabled: 'false',
      popupTrigger: 'time',
      popupDelaySeconds: '8',
      popupScrollPercent: '40',
      popupFrequency: 'once_session',
      popupPages: 'all',
      popupTitle: 'Agenda una sesión estratégica',
      popupBody: 'Te ayudamos a definir un roadmap realista de transformación digital en 30 minutos.',
      popupCtaLabel: 'Quiero mi sesión',
      popupCtaHref: '/#contacto',
      popupDismissLabel: 'Ahora no',
      formSuccessMessage: 'Gracias. Te responderemos en menos de 24 horas hábiles.',
      formErrorMessage: 'No pudimos enviar tu solicitud. Inténtalo nuevamente en unos minutos.',
      notFoundTitle: 'La página que buscas no está disponible.',
      notFoundDescription: 'Es posible que haya cambiado de ruta o ya no exista. Te llevamos al inicio para continuar.',
      notFoundCtaLabel: 'Volver al inicio',
      notFoundCtaHref: '/',
    },
    design: defaultDesign,
    siteArchitecture: {
      pages: defaultSiteArchitecturePages,
    },
    homePage: {
      layout: {
        sectionOrder: [...HOME_SECTION_IDS],
        hiddenSections: [],
        sectionVisibility: Object.fromEntries(HOME_SECTION_IDS.map((id) => [id, { desktop: true, tablet: true, mobile: true }])) as any,
        blockVisibility: Object.fromEntries(
          HOME_SECTION_IDS.map((sectionId) => [
            sectionId,
            Object.fromEntries(HOME_SECTION_BLOCK_IDS[sectionId].map((blockId) => [blockId, { desktop: true, tablet: true, mobile: true }]))
          ])
        ) as any,
        blockOrder: {
          services: ['header', 'grid'],
          products: ['header', 'cards'],
          frameworks: ['header', 'items'],
          contact: ['header', 'channels', 'form'],
        },
        blockStyleOverrides: {
          services: {
            header: { titleSizeRem: { mobile: '3rem', tablet: '4rem', desktop: '4.5rem' } },
            grid: {
              columns: { mobile: '1', tablet: '2', desktop: '3' },
              itemLimit: { mobile: '4', tablet: '6', desktop: '6' },
            },
          },
          products: {
            header: { titleSizeRem: { mobile: '3rem', tablet: '4rem', desktop: '4.5rem' } },
            cards: {
              columns: { mobile: '1', tablet: '2', desktop: '3' },
              itemLimit: { mobile: '2', tablet: '3', desktop: '3' },
            },
          },
          frameworks: {
            header: { titleSizeRem: { mobile: '3rem', tablet: '4rem', desktop: '4.5rem' } },
            items: {
              columns: { mobile: '1', tablet: '2', desktop: '2' },
              itemLimit: { mobile: '2', tablet: '3', desktop: '3' },
            },
          },
          contact: {
            header: { titleSizeRem: { mobile: '3.5rem', tablet: '5rem', desktop: '6rem' } },
            channels: { gapRem: { mobile: '2rem', tablet: '2.5rem', desktop: '3rem' } },
            form: { layoutMode: { mobile: 'stack', tablet: 'stack', desktop: 'split' } },
          },
        },
      },
      hero: {
        stats: [
          { label: 'Stability', value: '99.9%' },
          { label: 'Performance', value: 'High-Tier' },
          { label: 'Standard', value: 'ISO 9241' },
        ],
        style: {
          backgroundColor: '#ffffff',
          backgroundImageUrl: '',
          rightPanelBackgroundColor: '#ffffff',
          rightPanelBackgroundImageUrl: '',
          sectionOverlayColor: '#ffffff',
          sectionOverlayOpacity: '0.92',
          rightPanelOverlayColor: '#ffffff',
          rightPanelOverlayOpacity: '0.90',
          titleColor: '#0f172a',
          titleAccentColor: '#2563eb',
          subtitleColor: '#64748b',
          highlightColor: '#1a2d5a',
          titleFontSizeMobile: '4.5rem',
          titleFontSizeTablet: '6rem',
          titleFontSizeDesktop: '8rem',
          subtitleFontSizeMobile: '1.5rem',
          subtitleFontSizeTablet: '1.75rem',
          subtitleFontSizeDesktop: '1.875rem',
          ctaGapMobile: '1rem',
          ctaGapTablet: '1rem',
          ctaGapDesktop: '1rem',
          ctaStackMobile: 'true',
          ctaStackTablet: 'false',
          ctaStackDesktop: 'false',
          titleFontWeight: '900',
          subtitleFontWeight: '500',
          titleLineHeight: '0.85',
          statsLabelColor: '#94a3b8',
          statsValueColor: '#0f172a',
          statsDividerColor: '#e2e8f0',
          statsPanelBorderColor: '#cbd5e1',
        },
      },
      servicesSection: {
        eyebrow: 'Infrastructure & Operations',
        title: 'Portafolio de Servicios Digitales',
        subtitle: 'Nuestro método sistemático para capturar valor y asegurar la adopción real.',
        sectionNumber: '01',
        style: { backgroundColor: '#f8fafc', backgroundImageUrl: '' },
      },
      productsSection: {
        eyebrow: 'Performance Modules',
        title: 'Performance Modules',
        subtitle: 'Soluciones sistematizadas para resultados predecibles y escalables.',
        availabilityPricingLabel: 'Availability & Pricing',
        deploySolutionLabel: 'Deploy Solution',
        style: { backgroundColor: '#ffffff', backgroundImageUrl: '' },
      },
      frameworksSection: {
        eyebrow: 'Compliance & Standards',
        title: defaultContent.frameworks.title,
        subtitle: 'Alineamos cada despliegue con los marcos de trabajo globales más exigentes para garantizar resiliencia y adopción.',
        items: defaultContent.frameworks.items.map((item: any) => ({
          organization: item.organization,
          name: item.name,
          description: item.description,
        })),
        style: { backgroundColor: '#0f172a', backgroundImageUrl: '', overlayOpacity: '0.10' },
      },
      contactSection: {
        eyebrow: 'System Access',
        titlePrefix: 'Iniciemos el',
        titleAccent: 'Despliegue',
        labels: {
          officialChannel: 'Official Channel',
          hubHq: 'Hub HQ',
          corporateNetwork: 'Corporate Network',
          linkedinProtocol: 'LinkedIn Protocol',
        },
        style: {
          backgroundColor: '#ffffff',
          backgroundImageUrl: '',
          formOuterBackgroundColor: '#ffffff',
          formOuterBackgroundImageUrl: '',
          formInnerBackgroundColor: '#ffffff',
        },
      },
    },
  })
}

function sanitizeSiteArchitecture(rawArchitecture: unknown, fallbackPages: any[], siteEmail: string) {
  const sourcePages = rawArchitecture && typeof rawArchitecture === 'object' && Array.isArray((rawArchitecture as any).pages)
    ? (rawArchitecture as any).pages
    : fallbackPages
  const defaultsById = new Map(fallbackPages.map((page: any) => [String(page.id), page]))
  const seenIds = new Set<string>()
  const normalized: any[] = []

  sourcePages.forEach((entry: any, index: number) => {
    if (!entry || typeof entry !== 'object') return
    const requestedId = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `page-${index + 1}`
    let id = requestedId
    let suffix = 2
    while (seenIds.has(id)) {
      id = `${requestedId}-${suffix}`
      suffix += 1
    }
    seenIds.add(id)

    const fallback = defaultsById.get(id)
    const title = typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : (fallback?.title || 'Nueva página')
    const path = normalizePagePath(entry.path ?? fallback?.path ?? `/pagina-${index + 1}`)
    const previewPath = normalizePagePath(entry.previewPath ?? fallback?.previewPath ?? path)
    const category = SITE_PAGE_CATEGORY_SET.has(String(entry.category)) ? String(entry.category) : String(fallback?.category || 'custom')
    const status = SITE_PAGE_STATUS_SET.has(String(entry.status)) ? String(entry.status) : String(fallback?.status || 'draft')
    const editor = SITE_PAGE_EDITOR_SET.has(String(entry.editor)) ? String(entry.editor) : String(fallback?.editor || 'none')
    const template = typeof entry.template === 'string' && entry.template.trim() ? entry.template.trim() : (fallback?.template || 'balanced')
    const navLabel = typeof entry.navLabel === 'string' && entry.navLabel.trim() ? entry.navLabel.trim() : (fallback?.navLabel || title)
    const description = typeof entry.description === 'string' ? entry.description : (fallback?.description || '')
    const accentColor = typeof entry.accentColor === 'string' && entry.accentColor.trim() ? entry.accentColor : (fallback?.accentColor || '#2563eb')
    const notes = typeof entry.notes === 'string' ? entry.notes : (fallback?.notes || '')
    const order = Number.isFinite(Number(entry.order)) ? Number(entry.order) : Number(fallback?.order ?? index)
    const showInNavigation = typeof entry.showInNavigation === 'boolean' ? entry.showInNavigation : Boolean(fallback?.showInNavigation)
    const locked = fallback?.locked === true ? true : entry.locked === true
    const fallbackBlocks = Array.isArray(fallback?.blocks) && fallback.blocks.length > 0
      ? fallback.blocks
      : createDefaultBlocksByPage(id, title, description, accentColor, siteEmail)
    const blocks = migrateLegacyBuilderPage(
      id,
      title,
      description,
      accentColor,
      sanitizeSitePageBlocks(entry.blocks, fallbackBlocks),
      siteEmail
    )

    normalized.push({
      id,
      title,
      path,
      description,
      category,
      status,
      editor,
      template,
      navLabel,
      showInNavigation,
      previewPath,
      accentColor,
      notes,
      order,
      locked,
      blocks,
    })
  })

  for (const defaultPage of fallbackPages) {
    if (!normalized.some((page) => page.id === defaultPage.id)) {
      const fallbackBlocks = Array.isArray(defaultPage?.blocks) && defaultPage.blocks.length > 0
        ? defaultPage.blocks
        : createDefaultBlocksByPage(
            defaultPage.id || `page-${normalized.length + 1}`,
            defaultPage.title || 'Página',
            defaultPage.description || '',
            defaultPage.accentColor || '#2563eb',
            siteEmail
          )
      normalized.push({
        ...defaultPage,
        blocks: sanitizeSitePageBlocks(fallbackBlocks, fallbackBlocks),
      })
    }
  }

  normalized.sort((a, b) => a.order - b.order)
  return {
    pages: normalized.map((page, index) => ({ ...page, order: index })),
  }
}

export function sanitizeCmsSnapshot(input: unknown): CMSState {
  const base = getDefaultCmsSnapshot()
  if (!input || typeof input !== 'object') return base
  const raw = input as any

  const services = Array.isArray(raw.services) ? raw.services : base.services
  const products = Array.isArray(raw.products) ? raw.products : base.products
  const siteEmail = typeof raw.site?.contactEmail === 'string' && raw.site.contactEmail.trim()
    ? raw.site.contactEmail.trim()
    : ((base as any).site?.contactEmail || defaultSiteConfig.contact.email)
  const siteArchitecture = sanitizeSiteArchitecture(raw.siteArchitecture, (base as any).siteArchitecture?.pages ?? [], siteEmail)
  const rawLayout = raw.homePage?.layout || {}
  const validHomeSectionIds = new Set(HOME_SECTION_IDS)
  const rawSectionOrder = Array.isArray(rawLayout.sectionOrder)
    ? rawLayout.sectionOrder.filter((id: any) => validHomeSectionIds.has(id))
    : []
  const sectionOrder = [...new Set([...rawSectionOrder, ...HOME_SECTION_IDS])]
  const hiddenSections = Array.isArray(rawLayout.hiddenSections)
    ? [...new Set(rawLayout.hiddenSections.filter((id: any) => validHomeSectionIds.has(id)))]
    : []
  const sectionVisibility = Object.fromEntries(
    HOME_SECTION_IDS.map((id) => {
      const rawSection = rawLayout.sectionVisibility && typeof rawLayout.sectionVisibility === 'object'
        ? rawLayout.sectionVisibility[id]
        : undefined
      return [
        id,
        Object.fromEntries(
          HOME_RESPONSIVE_VIEWPORTS.map((viewport) => [
            viewport,
            typeof rawSection?.[viewport] === 'boolean' ? rawSection[viewport] : true,
          ])
        ),
      ]
    })
  )
  const blockVisibility = Object.fromEntries(
    HOME_SECTION_IDS.map((sectionId) => {
      const rawSectionBlocks = rawLayout.blockVisibility && typeof rawLayout.blockVisibility === 'object'
        ? rawLayout.blockVisibility[sectionId]
        : undefined
      return [
        sectionId,
        Object.fromEntries(
          HOME_SECTION_BLOCK_IDS[sectionId].map((blockId) => {
            const rawBlock = rawSectionBlocks && typeof rawSectionBlocks === 'object'
              ? rawSectionBlocks[blockId]
              : undefined
            return [
              blockId,
              Object.fromEntries(
                HOME_RESPONSIVE_VIEWPORTS.map((viewport) => [
                  viewport,
                  typeof rawBlock?.[viewport] === 'boolean' ? rawBlock[viewport] : true,
                ])
              ),
            ]
          })
        ),
      ]
    })
  )
  const normalizeBlockOrder = <T extends string>(rawValue: unknown, fallback: readonly T[]): T[] => {
    const valid = new Set(fallback)
    const fromRaw = Array.isArray(rawValue) ? rawValue.filter((value): value is T => typeof value === 'string' && valid.has(value as T)) : []
    const unique = [...new Set(fromRaw)]
    for (const value of fallback) {
      if (!unique.includes(value)) unique.push(value)
    }
    return unique as T[]
  }
  const baseBlockOrder = (base as any).homePage.layout.blockOrder
  const blockOrder = {
    services: normalizeBlockOrder(rawLayout?.blockOrder?.services, baseBlockOrder.services),
    products: normalizeBlockOrder(rawLayout?.blockOrder?.products, baseBlockOrder.products),
    frameworks: normalizeBlockOrder(rawLayout?.blockOrder?.frameworks, baseBlockOrder.frameworks),
    contact: normalizeBlockOrder(rawLayout?.blockOrder?.contact, baseBlockOrder.contact),
  }
  const baseBlockStyles = (base as any).homePage.layout.blockStyleOverrides
  const rawBlockStyles = rawLayout.blockStyleOverrides && typeof rawLayout.blockStyleOverrides === 'object'
    ? rawLayout.blockStyleOverrides
    : {}
  const responsiveString = (value: any, fallback: any) =>
    Object.fromEntries(
      HOME_RESPONSIVE_VIEWPORTS.map((viewport) => [
        viewport,
        typeof value?.[viewport] === 'string' ? value[viewport] : fallback[viewport],
      ])
    )
  const blockStyleOverrides = {
    services: {
      header: {
        titleSizeRem: responsiveString(rawBlockStyles?.services?.header?.titleSizeRem, baseBlockStyles.services.header.titleSizeRem),
      },
      grid: {
        columns: responsiveString(rawBlockStyles?.services?.grid?.columns, baseBlockStyles.services.grid.columns),
        itemLimit: responsiveString(rawBlockStyles?.services?.grid?.itemLimit, baseBlockStyles.services.grid.itemLimit),
      },
    },
    products: {
      header: {
        titleSizeRem: responsiveString(rawBlockStyles?.products?.header?.titleSizeRem, baseBlockStyles.products.header.titleSizeRem),
      },
      cards: {
        columns: responsiveString(rawBlockStyles?.products?.cards?.columns, baseBlockStyles.products.cards.columns),
        itemLimit: responsiveString(rawBlockStyles?.products?.cards?.itemLimit, baseBlockStyles.products.cards.itemLimit),
      },
    },
    frameworks: {
      header: {
        titleSizeRem: responsiveString(rawBlockStyles?.frameworks?.header?.titleSizeRem, baseBlockStyles.frameworks.header.titleSizeRem),
      },
      items: {
        columns: responsiveString(rawBlockStyles?.frameworks?.items?.columns, baseBlockStyles.frameworks.items.columns),
        itemLimit: responsiveString(rawBlockStyles?.frameworks?.items?.itemLimit, baseBlockStyles.frameworks.items.itemLimit),
      },
    },
    contact: {
      header: {
        titleSizeRem: responsiveString(rawBlockStyles?.contact?.header?.titleSizeRem, baseBlockStyles.contact.header.titleSizeRem),
      },
      channels: {
        gapRem: responsiveString(rawBlockStyles?.contact?.channels?.gapRem, baseBlockStyles.contact.channels.gapRem),
      },
      form: {
        layoutMode: responsiveString(rawBlockStyles?.contact?.form?.layoutMode, baseBlockStyles.contact.form.layoutMode),
      },
    },
  }

  const normalizedDesign = { ...base.design, ...(raw.design || {}) }
  if (normalizedDesign.fontBody === 'Inter' && normalizedDesign.fontDisplay === 'Inter') {
    normalizedDesign.fontBody = 'Space Grotesk'
    normalizedDesign.fontDisplay = 'Space Grotesk'
  }
  if (normalizedDesign.fontBody === 'Space Grotesk' && normalizedDesign.fontDisplay === 'Fraunces') {
    normalizedDesign.fontDisplay = 'Space Grotesk'
  }

  return {
    ...base,
    ...raw,
    services: services.map((item: any, i: number) => ({ ...base.services[i], ...item })),
    products: products.map((item: any, i: number) => ({ ...base.products[i], ...item })),
    hero: { ...base.hero, ...(raw.hero || {}) },
    site: { ...base.site, ...(raw.site || {}) },
    design: normalizedDesign,
    siteArchitecture,
    homePage: {
      ...(base as any).homePage,
      ...(raw.homePage || {}),
      layout: {
        ...(base as any).homePage.layout,
        ...rawLayout,
        sectionOrder,
        hiddenSections,
        sectionVisibility,
        blockVisibility,
        blockOrder,
        blockStyleOverrides,
      },
      hero: {
        ...(base as any).homePage.hero,
        ...(raw.homePage?.hero || {}),
        stats: Array.isArray(raw.homePage?.hero?.stats) ? raw.homePage.hero.stats : (base as any).homePage.hero.stats,
        style: { ...(base as any).homePage.hero.style, ...(raw.homePage?.hero?.style || {}) },
      },
      servicesSection: {
        ...(base as any).homePage.servicesSection,
        ...(raw.homePage?.servicesSection || {}),
        style: { ...(base as any).homePage.servicesSection.style, ...(raw.homePage?.servicesSection?.style || {}) },
      },
      productsSection: {
        ...(base as any).homePage.productsSection,
        ...(raw.homePage?.productsSection || {}),
        style: { ...(base as any).homePage.productsSection.style, ...(raw.homePage?.productsSection?.style || {}) },
      },
      frameworksSection: {
        ...(base as any).homePage.frameworksSection,
        ...(raw.homePage?.frameworksSection || {}),
        items: Array.isArray(raw.homePage?.frameworksSection?.items) ? raw.homePage.frameworksSection.items : (base as any).homePage.frameworksSection.items,
        style: { ...(base as any).homePage.frameworksSection.style, ...(raw.homePage?.frameworksSection?.style || {}) },
      },
      contactSection: {
        ...(base as any).homePage.contactSection,
        ...(raw.homePage?.contactSection || {}),
        labels: { ...(base as any).homePage.contactSection.labels, ...(raw.homePage?.contactSection?.labels || {}) },
        style: { ...(base as any).homePage.contactSection.style, ...(raw.homePage?.contactSection?.style || {}) },
      },
    },
  }
}
