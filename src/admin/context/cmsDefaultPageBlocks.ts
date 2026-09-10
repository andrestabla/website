import type {
    HeroContent,
    HomePageContent,
    PlainServiceCopy,
    ProductItem,
    ServiceItem,
    SiteConfig,
    SitePageBlock,
    SitePageBlockType,
} from './CMSContext'
import { content as defaultContent } from '../../data/content'

/**
 * Contenido por defecto de las landings gestionadas (servicios, educacion,
 * plataformas, virtualizacion, auditoria y el caso transversal).
 *
 * Vivia dentro de CMSContext, que es parte del chunk de entrada: eran ~96 KB de
 * texto que descargaba y parseaba cualquier visitante, aunque el servidor le
 * mandara el contenido real por /api/cms. Aqui se carga con import() dinamico y
 * solo cuando de verdad hace falta reconstruir los bloques de una pagina.
 *
 * Solo se importan tipos de CMSContext, asi que no hay ciclo en tiempo de
 * ejecucion: las dependencias de valor llegan por el parametro `deps`.
 */

export type DefaultBlocksDeps = {
    staticServices: ServiceItem[]
    staticProducts: ProductItem[]
    staticHero: HeroContent
    staticSite: SiteConfig
    staticHomePage: HomePageContent
    getServicesPlainCopy: (slug: string, fallbackDescription: string) => PlainServiceCopy
}

// Los tres generadores que necesitan estos valores solo se ejecutan desde
// createSpecializedBlocks, que los asigna antes de despachar.
let staticServices: ServiceItem[] = []
let staticProducts: ProductItem[] = []
let staticHero: HeroContent = {} as HeroContent
let staticSite: SiteConfig = {} as SiteConfig
let staticHomePage: HomePageContent = {} as HomePageContent
let getServicesPlainCopy: DefaultBlocksDeps['getServicesPlainCopy'] = () => ({}) as PlainServiceCopy

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

const EDUCATION_LANDING_WORKFLOW = [
    { title: '1. Diagnóstico y Análisis', body: 'Evaluamos el ecosistema digital actual y las necesidades pedagógicas de la institución.' },
    { title: '2. Diseño de Solución', body: 'Co-creamos una hoja de ruta que integre tecnología, metodología activa y formación docente.' },
    { title: '3. Implementación Estratégica', body: 'Desplegamos plataformas, producimos contenidos y certificamos competencias digitales.' },
    { title: '4. Seguimiento y Evolución', body: 'Acompañamos la adopción del modelo para asegurar resultados académicos y operativos.' },
]

const EDUCATION_LANDING_FAQ = [
    {
        title: '¿Cómo aseguran la calidad pedagógica en la virtualización?',
        body: 'Trabajamos con expertos en diseño instruccional que aseguran que el contenido sea efectivo, motivador y centrado en el estudiante.',
    },
    {
        title: '¿Sus plataformas son compatibles con sistemas que ya usamos?',
        body: 'Sí, implementamos soluciones que se integran con sus sistemas académico-administrativos existentes mediante estándares abiertos.',
    },
    {
        title: '¿En qué consiste la formación para docentes?',
        body: 'Es un acompañamiento práctico donde los docentes aprenden a usar herramientas digitales mientras rediseñan sus propias experiencias de aprendizaje.',
    },
    {
        title: '¿Ofrecen soporte técnico post-implementación?',
        body: 'No solo soporte técnico, sino acompañamiento en la adopción del modelo educativo para garantizar que la inversión genere impacto real.',
    },
]

const EDUCATION_LANDING_CLIENTS = [
    {
        id: 'cliente-1',
        title: 'CESA',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/CESA.svg',
    },
    {
        id: 'cliente-2',
        title: 'Ibero',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/ibero.png',
    },
    {
        id: 'cliente-3',
        title: 'La Salle',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/La-Salle-color-RGB.png',
    },
    {
        id: 'cliente-4',
        title: 'Mobile Citi Academy',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/LOGO+MOBILE+CITI+ACADEMY+VF.png',
    },
    {
        id: 'cliente-5',
        title: 'Inetum',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/LOGO_INETUM.jpg',
    },
    {
        id: 'cliente-6',
        title: 'UDI',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/logos-udi-1-02.png',
    },
    {
        id: 'cliente-7',
        title: 'San Martín',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/SanMarti%CC%81n.png',
    },
    {
        id: 'cliente-8',
        title: 'Santo Tomás',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/SANTO_TOMA%CC%81S_Principal.webp',
    },
    {
        id: 'cliente-9',
        title: 'UTB',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/UTB.png',
    },
    {
        id: 'cliente-10',
        title: 'Carmenza Alarcón',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/Logo+CA3.svg',
    },
]

const PLATAFORMAS_LANDING_WORKFLOW = [
    { title: '1. Despliegue', body: 'Instalación y configuración de la infraestructura tecnológica base de acuerdo con los requerimientos operativos y de seguridad.' },
    { title: '2. Personalización', body: 'Adaptación de la interfaz gráfica al libro de marca y configuración de reglas funcionales específicas del modelo.' },
    { title: '3. Documentación y transferencia', body: 'Entrega de manuales técnicos, guías de usuario y capacitación a los roles clave para asegurar independencia técnica.' },
    { title: '4. Administración y soporte', body: 'Servicio de mantenimiento, monitoreo y soporte a usuarios para garantizar la continuidad y evolución del sistema.' },
]

const PLATAFORMAS_LANDING_FEATURES = [
    'Reportes y analíticas de aprendizaje',
    'Control del progreso de avance por curso',
    'Experiencia de usuario personalizada según roles',
    'Flujo de certificación automática',
    'Pasarela de pagos',
    'Herramienta de autoría de contenidos integrada',
    'Rutas de aprendizaje personalizadas',
    'Sistemas de videoconferencias integrados',
    'Sistema de notificaciones personalizadas',
    'Gamificación configurable por grupos o cursos',
    'Bloques de valoración de cursos y contenidos',
    'Sistema de recomendación de cursos',
    'Más de 50 funcionalidades adicionales...'
]

function createServicesLandingBlocks(_pageTitle: string): SitePageBlock[] {
    const serviceItems = staticServices.map((service, index) => {
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

    const blocks: SitePageBlock[] = [
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
                email: staticSite.contactEmail,
                secondaryLabel: 'LinkedIn de AlgoritmoT',
                secondaryHref: staticSite.linkedin,
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
                primaryHref: 'https://wa.me/573044544525',
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

function createClassicHomeBlocks(pageTitle: string, pageDescription: string, accentColor: string): SitePageBlock[] {
    const servicesItems = staticServices.map((service) => ({
        title: service.title,
        body: service.description,
        url: `/servicios/${service.slug}`,
    }))
    const productsItems = staticProducts.map((product) => ({
        title: product.title,
        body: product.description,
        value: product.price,
        url: `/productos/${product.slug}`,
    }))
    const frameworksItems = defaultContent.frameworks.items.map((item) => ({
        title: item.organization,
        body: `${item.name}: ${item.description}`,
    }))

    const blocks: SitePageBlock[] = [
        {
            id: 'hero',
            type: 'hero',
            name: 'Hero clásico',
            visible: true,
            order: 0,
            content: {
                eyebrow: staticHero.highlight,
                title: pageTitle,
                subtitle: staticHero.title,
                body: pageDescription || staticHero.subtitle,
                primaryLabel: staticHero.cta || 'Iniciar transformación',
                primaryHref: '/#contacto',
                secondaryLabel: staticHero.secondaryCta || 'Ver servicios',
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
                title: staticHomePage.servicesSection.title,
                body: staticHomePage.servicesSection.subtitle,
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
                title: staticHomePage.productsSection.title,
                body: staticHomePage.productsSection.subtitle,
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
                title: staticHomePage.frameworksSection.title,
                body: staticHomePage.frameworksSection.subtitle,
                items: frameworksItems.map((item) => item.body),
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
                title: `${staticHomePage.contactSection.titlePrefix} ${staticHomePage.contactSection.titleAccent}`,
                body: 'Canales directos para iniciar una conversación estratégica.',
                email: staticSite.contactEmail,
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
                primaryHref: 'https://wa.me/573044544525',
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

function createTransversalCaseBlocks(): SitePageBlock[] {
    const serviceBySlug = new Map(staticServices.map((service) => [service.slug, service]))
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

    const blocks: SitePageBlock[] = [
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
                backgroundColor: '#020617',
                backgroundGradient: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)',
                textColor: '#f8fafc',
                align: 'left',
                paddingY: '7.5rem',
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
                backgroundColor: '#020617',
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
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
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
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                radius: '1.5rem',
                paddingY: '5rem',
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
                backgroundColor: '#f8fafc',
                textColor: '#334155',
                align: 'left',
                paddingY: '4.5rem',
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
                backgroundColor: '#f1f5f9',
                textColor: '#0f172a',
                align: 'left',
                columns: '2',
                paddingY: '5rem',
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
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '4.5rem',
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
                paddingY: '5.5rem',
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
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '2',
                paddingY: '5.5rem',
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
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '6rem',
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
                paddingY: '5.5rem',
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
                backgroundColor: '#f1f5f9',
                textColor: '#0f172a',
                align: 'left',
                columns: '2',
                paddingY: '5rem',
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
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '4',
                paddingY: '6rem',
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
                radius: '1.5rem',
                maxHeight: '560px',
                paddingY: '5.5rem',
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
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
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
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '3',
                paddingY: '5.5rem',
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
                backgroundColor: '#020617',
                textColor: '#f8fbff',
                align: 'left',
                paddingY: '5.5rem',
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
                backgroundColor: '#000000',
                textColor: '#f8fbff',
                align: 'left',
                columns: '4',
                paddingY: '5rem',
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
                paddingY: '5.5rem',
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
                backgroundColor: '#f1f5f9',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
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
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '6rem',
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
                email: staticSite.contactEmail,
                primaryLabel: 'Quiero transformar mi operación',
                primaryHref: '#cta-final',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
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
                backgroundColor: '#020617',
                backgroundGradient: 'linear-gradient(115deg, #020617 0%, #0f172a 100%)',
                textColor: '#f8fafc',
                align: 'center',
                paddingY: '6.5rem',
            },
        },
    ]

    return blocks.map((block, index) => ({ ...block, order: index }))
}

function createNavigationSelectorBlocks(): SitePageBlock[] {
    return [
        {
            id: 'selector',
            type: 'navigation-selector',
            name: 'Selector de Navegación',
            visible: true,
            order: 0,
            content: {
                corporateTitle: 'SOLUCIONES PARA EMPRESA',
                corporateDescription: 'Optimización operativa, automatización de procesos y despliegue estratégico de IA.',
                corporateCta: 'INGRESAR',
                educationTitle: 'SOLUCIONES EDUCATIVAS',
                educationDescription: 'Transformación digital para instituciones, colegios y centros de formación técnica.',
                educationCta: 'INGRESAR',
                logoText: 'ALGORITMOT'
            },
            style: {
                backgroundColor: '#0f172a',
                paddingY: '0',
            }
        }
    ]
}

const VIRTUALIZACION_EXPERIENCIAS = [
    {
        title: 'Maestría en Entornos Globales',
        body: 'Virtualización 100% de posgrado con simuladores de negocios y foros internacionales.',
        url: '#maestria',
        clientName: 'La Salle',
        imageUrl: 'https://portafolio1.s3.us-east-1.amazonaws.com/LaSalle/LaSalle6.png',
        images: [
            'https://portafolio1.s3.us-east-1.amazonaws.com/LaSalle/LaSalle6.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/LaSalle/LaSalle5.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/LaSalle/LaSalle4.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/LaSalle/LaSalle4.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/LaSalle/LaSalle2.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/LaSalle/LaSalle1.png',
        ],
    },
    {
        title: 'Pregrado en Ingeniería Digital',
        body: 'Estructuración didáctica de 40 materias con laboratorios virtuales y realidad aumentada.',
        url: '#pregrado',
        clientName: 'UTB',
        imageUrl: 'https://portafolio1.s3.us-east-1.amazonaws.com/UTB/UTB9.png',
        images: [
            'https://portafolio1.s3.us-east-1.amazonaws.com/UTB/UTB9.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/UTB/UTB8.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/UTB/UTB7.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/UTB/UTB6.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/UTB/UTB5.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/UTB/UTB4.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/UTB/UTB3.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/UTB/UTB2.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/UTB/UTB1.png',
        ],
    },
    {
        title: 'Certificación en Liderazgo Ágil',
        body: 'Curso corto gamificado con entrega de micro-credenciales y badges digitales.',
        url: '#liderazgo',
        clientName: 'USANMARTÍN',
        imageUrl: 'https://portafolio1.s3.us-east-1.amazonaws.com/usanmartin/USANMARTIN1.png',
        images: [
            'https://portafolio1.s3.us-east-1.amazonaws.com/usanmartin/USANMARTIN1.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/usanmartin/USANMARTIN2.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/usanmartin/USANMARTIN3.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/usanmartin/USANMARTIN4.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/usanmartin/USANMARTIN5.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/usanmartin/USANMARTIN6.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/usanmartin/USANMARTIN7.png',
        ],
    },
    {
        title: 'Diplomado en Data Science',
        body: 'Contenidos interactivos con cuadernos de Jupyter integrados y videoclases 4K.',
        url: '#datascience',
        clientName: 'USTA',
        imageUrl: 'https://portafolio1.s3.us-east-1.amazonaws.com/USTA/USTA1.png',
        images: [
            'https://portafolio1.s3.us-east-1.amazonaws.com/USTA/USTA1.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/USTA/USTA2.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/USTA/USTA3.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/USTA/USTA4.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/USTA/USTA5.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/USTA/USTA6.png',
        ],
    },
    {
        title: 'Programas Ejecutivos CESA',
        body: 'Virtualización de programas con enfoque en formación ejecutiva y experiencias de alto impacto.',
        url: '#cesa',
        clientName: 'CESA',
        imageUrl: 'https://portafolio1.s3.us-east-1.amazonaws.com/CESA/CESA1.png',
        images: [
            'https://portafolio1.s3.us-east-1.amazonaws.com/CESA/CESA1.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/CESA/CESA2.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/CESA/CESA3.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/CESA/CESA4.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/CESA/CESA5.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/CESA/CESA6.png',
        ],
    },
    {
        title: 'Programa de Formación EEQ',
        body: 'Virtualización de contenidos formativos con foco en continuidad operativa y aprendizaje aplicado.',
        url: '#eeq',
        clientName: 'EEQ',
        imageUrl: 'https://portafolio1.s3.us-east-1.amazonaws.com/EQUEBEC/EQUEBEC1.png',
        images: [
            'https://portafolio1.s3.us-east-1.amazonaws.com/EQUEBEC/EQUEBEC1.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/EQUEBEC/EQUEBEC2.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/EQUEBEC/EQUEBEC3.png',
        ],
    },
    {
        title: 'Campus Virtual Estudiemos Web',
        body: 'Implementación de ecosistema e-learning con rutas formativas, contenidos dinámicos y seguimiento académico.',
        url: '#estudiemos-web',
        clientName: 'Estudiemos Web',
        imageUrl: 'https://portafolio1.s3.us-east-1.amazonaws.com/EstudiemosWeb/EW1.png',
        images: [
            'https://portafolio1.s3.us-east-1.amazonaws.com/EstudiemosWeb/EW1.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/EstudiemosWeb/EW2.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/EstudiemosWeb/EW3.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/EstudiemosWeb/EW4.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/EstudiemosWeb/EW5.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/EstudiemosWeb/EW6.png',
        ],
    },
    {
        title: 'Campus Digital UDI',
        body: 'Despliegue de experiencia virtual con contenidos modulares, recursos multimedia y rutas académicas guiadas.',
        url: '#udi',
        clientName: 'UDI',
        imageUrl: 'https://portafolio1.s3.us-east-1.amazonaws.com/UDI/UDI1.png',
        images: [
            'https://portafolio1.s3.us-east-1.amazonaws.com/UDI/UDI1.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/UDI/UDI2.png',
            'https://portafolio1.s3.us-east-1.amazonaws.com/UDI/UDI3.png',
        ],
    },
]

const VIRTUALIZACION_LANDING_WORKFLOW = [
    { title: 'Asesoría pedagógica', description: 'Definición de objetivos y estrategias de aprendizaje.' },
    { title: 'Autoría de contenidos', description: 'Creación de materiales por expertos temáticos.' },
    { title: 'Diseño instruccional', description: 'Estructuración pedagógica y didáctica del curso.' },
    { title: 'Corrección de estilo', description: 'Revisión gramatical y coherencia editorial.' },
    { title: 'Producción multimedia', description: 'Desarrollo de videos, interactivos y gráficos.' },
    { title: 'Montaje sobre LMS', description: 'Configuración y despliegue en la plataforma.' },
    { title: 'Quality Assurance', description: 'Pruebas rigurosas de funcionamiento y navegación.' },
    { title: 'Auditoría aulas virtuales', description: 'Verificación de estándares de calidad final.' },
]

const AUDITORIA_LANDING_EJES = [
    {
        title: 'Cumplimiento institucional',
        body: 'Verificamos la creación, implementación y evaluación de aulas virtuales frente al modelo pedagógico y los lineamientos internos.',
        icon: 'Building2',
    },
    {
        title: 'Calidad pedagógica',
        body: 'Evaluamos coherencia entre resultados de aprendizaje, actividades, recursos y criterios de evaluación.',
        icon: 'GraduationCap',
    },
    {
        title: 'Experiencia del estudiante',
        body: 'Analizamos navegación, accesibilidad, usabilidad y soporte para favorecer retención y logro académico.',
        icon: 'Users',
    },
    {
        title: 'Evidencia y trazabilidad',
        body: 'Documentamos fortalezas, brechas y oportunidades de mejora con evidencias concretas por estándar.',
        icon: 'LineChart',
    },
]

const AUDITORIA_QM_STANDARDS = [
    {
        title: '1. Descripción general e introducción',
        body: 'Inicio del curso, estructura, políticas, requisitos técnicos y expectativas de comunicación.',
        icon: 'BookOpenText',
        value: 75,
        scoreLabel: '75%',
    },
    {
        title: '2. Objetivos de aprendizaje',
        body: 'Resultados medibles, centrados en el estudiante y alineados con actividades y evaluaciones.',
        icon: 'GraduationCap',
        value: 87,
        scoreLabel: '87%',
    },
    {
        title: '3. Evaluación y medición',
        body: 'Criterios claros de calificación, evaluaciones variadas y retroalimentación oportuna.',
        icon: 'LineChart',
        value: 85,
        scoreLabel: '85%',
    },
    {
        title: '4. Materiales didácticos',
        body: 'Recursos pertinentes, actualizados y conectados con los resultados esperados del curso.',
        icon: 'Layers',
        value: 92,
        scoreLabel: '92%',
    },
    {
        title: '5. Actividades e interacción',
        body: 'Actividades activas con interacción tutor-estudiante y colaboración entre pares.',
        icon: 'Users',
        value: 100,
        scoreLabel: '100%',
    },
    {
        title: '6. Tecnología del curso',
        body: 'Herramientas tecnológicas que soportan el aprendizaje y promueven participación.',
        icon: 'Settings2',
        value: 88,
        scoreLabel: '88%',
    },
    {
        title: '7. Apoyo al estudiante',
        body: 'Acceso a soporte técnico, servicios académicos y recursos institucionales de acompañamiento.',
        icon: 'Building2',
        value: 50,
        scoreLabel: '50%',
    },
    {
        title: '8. Accesibilidad y usabilidad',
        body: 'Diseño navegable, legible y accesible para distintos perfiles y necesidades de aprendizaje.',
        icon: 'Rocket',
        value: 67,
        scoreLabel: '67%',
    },
]

const AUDITORIA_LANDING_WORKFLOW = [
    {
        title: '1. Alistamiento y muestra',
        description: 'Definimos alcance, criterios y selección de módulos o aulas virtuales a revisar.',
    },
    {
        title: '2. Recolección de evidencia',
        description: 'Aplicamos instrumentos por estándar QM y registramos hallazgos técnicos y pedagógicos.',
    },
    {
        title: '3. Análisis y ponderación',
        description: 'Consolidamos resultados por estándar para identificar fortalezas, brechas y riesgos.',
    },
    {
        title: '4. Ruta de mejoramiento',
        description: 'Entregamos recomendaciones priorizadas con acciones concretas para elevar la calidad.',
    },
]

const AUDITORIA_LANDING_FAQ = [
    {
        title: '¿La auditoría aplica solo para programas 100% virtuales?',
        body: 'No. También aplica para programas híbridos o blended que utilicen LMS y recursos digitales.',
    },
    {
        title: '¿Qué recibe la institución al finalizar?',
        body: 'Un informe con resultados por estándar, evidencias, oportunidades de mejora y ruta de acción priorizada.',
    },
    {
        title: '¿Cuánto tiempo toma una auditoría?',
        body: 'Depende del número de módulos y la profundidad del análisis, pero se define desde la fase de alistamiento.',
    },
    {
        title: '¿Se puede acompañar la implementación del plan de mejora?',
        body: 'Sí. Podemos continuar con asesoría pedagógica y técnica para ejecutar la ruta de mejoramiento.',
    },
]

const AUDITORIA_LANDING_RESOURCES = [
    {
        title: 'Rúbrica QM Higher Education',
        body: 'Marco internacional para evaluar cursos virtuales en educación superior.',
        label: 'Ver referencia',
        url: 'https://www.qualitymatters.org/qa-resources/rubric-standards/higher-ed-rubric',
        icon: 'ShieldCheck',
    },
    {
        title: 'Matriz de hallazgos',
        body: 'Consolidado por estándar y subestándar con evidencias observables.',
        label: 'Solicitar muestra',
        url: '#contacto',
        icon: 'LayoutDashboard',
    },
    {
        title: 'Informe ejecutivo',
        body: 'Resumen de brechas críticas, fortalezas y prioridades de intervención.',
        label: 'Ver estructura',
        url: '#contacto',
        icon: 'BarChart3',
    },
    {
        title: 'Plan de mejoramiento',
        body: 'Ruta de acción por fases con recomendaciones pedagógicas y técnicas.',
        label: 'Hablar con un consultor',
        url: '#contacto',
        icon: 'Target',
    },
]

function createEducationLandingBlocks(): SitePageBlock[] {
    const blocks: SitePageBlock[] = [
        {
            id: 'hero',
            type: 'hero',
            name: 'Hero Principal',
            visible: true,
            order: 0,
            content: {
                eyebrow: 'Soluciones para universidades',
                title: 'Experiencias de aprendizaje auténticas',
                body: 'Diseñando programas académicos, formando docentes, produciendo contenidos educativos y optimizando la operación académico-administrativa.',
                primaryLabel: 'Conoce nuestra plataforma',
                primaryHref: '#servicios',
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
            name: 'Cifras de Impacto',
            visible: true,
            order: 1,
            content: {
                title: 'Experiencia y resultados',
                items: [
                    '500+ Docentes formados',
                    '10+ Plataformas implementadas',
                    '100+ Programas diseñados',
                    '1500+ Cursos producidos'
                ],
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0b1323',
                align: 'left',
                columns: '4',
                paddingY: '2rem',
            },
        },
        {
            id: 'servicios',
            type: 'grid',
            name: 'Servicios Educación',
            visible: true,
            order: 2,
            content: {
                eyebrow: 'Nuestras Soluciones',
                title: 'Programas y plataformas de aprendizaje',
                body: 'Desarrollamos ecosistemas educativos que promueven la interacción y el aprendizaje activo.',
                items: [
                    {
                        id: 'plataformas-lms',
                        title: 'Plataformas de aprendizaje',
                        eyebrow: 'Infraestructura flexible',
                        inSimpleWords: 'Implementación de entornos virtuales que posibilitan experiencias de aprendizaje auténticas y escalables.',
                        businessBenefit: 'Centralización de la operación académica y trazabilidad de procesos.',
                        idealWhen: 'La institución necesita robustecer su presencia digital.',
                        label: 'Conocer más',
                        url: '#contacto',
                    },
                    {
                        id: 'virtualizacion',
                        title: 'Virtualización de programas',
                        eyebrow: 'Co-creación de contenidos',
                        inSimpleWords: 'Diseño de contenidos y programas mediados digitalmente con foco en el aprendizaje activo.',
                        businessBenefit: 'Oferta académica moderna, atractiva y de alta calidad pedagógica.',
                        idealWhen: 'Se busca transformar un programa presencial a una modalidad híbrida o virtual.',
                        label: 'Conocer más',
                        url: '#contacto',
                    },
                    {
                        id: 'auditoria-qm',
                        title: 'Auditoría de programas virtuales',
                        eyebrow: 'Calidad internacional',
                        inSimpleWords: 'Evaluación y certificación de la calidad pedagógica y técnica de tus cursos virtuales bajo estándares globales QM (Quality Matters).',
                        businessBenefit: 'Aseguramiento de la esencia académica y mejora en los índices de retención.',
                        idealWhen: 'Buscas validar la efectividad de tus programas o prepararte para acreditaciones.',
                        label: 'Conocer más',
                        url: '/auditoria-programas-virtuales#servicios',
                    },
                    {
                        id: 'edu-digital',
                        title: 'Programa Educación digital',
                        eyebrow: 'Formación continua',
                        inSimpleWords: 'Capacitación integral para el cuerpo docente sobre herramientas y metodologías del siglo XXI.',
                        businessBenefit: 'Mejora en la calidad educativa y adopción tecnológica institucional.',
                        idealWhen: 'Se requiere actualizar las competencias digitales de los profesores.',
                        label: 'Conocer más',
                        url: '#contacto',
                        openInNewTab: true,
                    }
                ],
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '3',
                paddingY: '5rem',
            },
        },
        {
            id: 'flujo',
            type: 'timeline',
            name: 'Cómo trabajamos',
            visible: true,
            order: 3,
            content: {
                eyebrow: 'Cómo trabajamos',
                title: 'Cómo trabajamos',
                items: EDUCATION_LANDING_WORKFLOW,
                badges: ['Metodología', 'Acompañamiento', 'Innovación'],
            },
            style: {
                backgroundColor: '#0f172a',
                textColor: '#ffffff',
                align: 'left',
                paddingY: '4rem',
            },
        },
        {
            id: 'clientes',
            type: 'carousel',
            name: 'Clientes',
            visible: true,
            order: 4,
            content: {
                title: 'Clientes',
                body: 'Instituciones y empresas que han confiado en nosotros',
                items: EDUCATION_LANDING_CLIENTS,
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
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
                items: EDUCATION_LANDING_FAQ,
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
            name: 'Contacto Educación',
            visible: true,
            order: 6,
            content: {
                eyebrow: 'Iniciemos tu proyecto',
                title: 'Hablemos de tus objetivos educativos',
                body: 'Cuéntanos sobre tus retos en formación y tecnología para diseñar una solución a medida.',
                email: 'andrestabla@algoritmot.com',
                secondaryLabel: 'WhatsApp Directo',
                secondaryHref: 'https://wa.me/573044544525',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
            },
        }
    ]
    return blocks
}

function createPlataformasLandingBlocks(): SitePageBlock[] {
    const blocks: SitePageBlock[] = [
        {
            id: 'hero',
            type: 'hero',
            name: 'Hero Servicio',
            visible: true,
            order: 0,
            content: {
                eyebrow: 'Plataformas de aprendizaje',
                title: 'Implementa o evoluciona tu ecosistema digital para el aprendizaje',
                body: '',
                primaryLabel: 'Hablar con un consultor',
                primaryHref: '#contacto',
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0b1323',
                align: 'left',
                paddingY: '8rem',
            },
        },
        {
            id: 'promesas',
            type: 'grid', // Will map to a grid essentially, or rely on renderPromisesBlock logic if it matches
            name: 'Tecnologías',
            visible: true,
            order: 1,
            content: {
                eyebrow: 'Tecnologías que posibilitan experiencias',
                items: [
                    { title: 'Campus virtual', body: 'Para el desarrollo de procesos de formación 100% en línea.' },
                    { title: 'Plataforma de aprendizaje', body: 'Para procesos de formación virtuales, presenciales o híbridos.' },
                    { title: 'Complementos', body: 'Tecnológicos que contribuyen al aprendizaje activo y en comunidad.' },
                ]
            },
            style: {
                backgroundColor: '#ffffff', // Fallback
                textColor: '#ffffff',
                align: 'left',
                columns: '3',
                paddingY: '6rem',
            },
        },
        {
            id: 'funcionalidades',
            type: 'feature-list',
            name: 'Funcionalidades',
            visible: true,
            order: 2,
            content: {
                title: 'Más que una plataforma...',
                items: PLATAFORMAS_LANDING_FEATURES.map((feat) => ({ title: feat }))
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
            id: 'clientes',
            type: 'carousel',
            name: 'Experiencias de Éxito',
            visible: true,
            order: 3,
            content: {
                title: 'Instituciones que confían en nosotros',
                body: 'Descubre cómo han transformado su operación educativa.',
                items: [
                    {
                        id: 'marca-ejecutiva',
                        title: 'Marca Ejecutiva',
                        body: 'Implementación y evolución de producto digital para formación ejecutiva.',
                        url: 'https://marcaejecutiva.co/',
                        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/Marca+Ejecutiva.svg',
                    },
                    {
                        id: 'icaza-jammoul',
                        title: 'Icaza-Jammoul',
                        body: 'Diagnóstico de madurez y definición de ruta de transformación digital.',
                        url: 'https://icazajammoul.com/login/index.php',
                        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/Icaza.svg',
                    },
                    {
                        id: 'inetum',
                        title: 'Inetum',
                        body: 'Acompañamiento continuo para optimizar desempeño y adopción del ecosistema.',
                        url: 'https://doyouspeakinetum.com/',
                        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/LOGO_INETUM.jpg',
                    },
                    {
                        id: 'estudiemos-web',
                        title: 'Estudiemos Web',
                        body: 'Desarrollo de solución educativa a medida para escalar la operación.',
                        url: 'https://estudiemosweb.com/',
                        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/logo+EW.png',
                    },
                    {
                        id: 'mobilecity-academy',
                        title: 'MobileCity Academy',
                        body: 'Evaluación de madurez y definición estratégica para nuevos productos de aprendizaje.',
                        url: 'https://mobilecitiacademy.com.co/login/index.php',
                        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/LOGO+MOBILE+CITI+ACADEMY+VF.png',
                    }
                ],
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                paddingY: '5rem',
            },
        },
        {
            id: 'tuprofe',
            type: 'tuprofe' as SitePageBlockType,
            name: 'Metodología Divergente',
            visible: true,
            order: 4,
            content: {
                eyebrow: 'Educación por proyectos',
                title: 'Metodología divergente impulsada por TuProfe',
                body: 'Conectamos diseño pedagógico, mentorías, evidencias y analítica en un ecosistema que prioriza el aprendizaje auténtico sobre la simple revisión de contenidos.',
                primaryLabel: 'Conoce TuProfe',
                primaryHref: 'https://profetabla.com/',
                imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&q=80',
                items: [
                    { title: 'Operación conectada', body: 'Planeación, entregas, correcciones grupales, mentorías y rúbricas en el mismo flujo visual.' },
                    { title: 'Métricas predictivas', body: 'Análisis del histórico de entregas y el "engagement" real (no solo clicks, sino interacción colaborativa).' },
                    { title: 'Gamificación de alto nivel', body: 'Economía de aprendizaje ligada a insignias públicas, validables e integradas con perfiles.' },
                    { title: 'Retroalimentación humana inteligente', body: 'Bancos de feedback reutilizables, comentarios de audio o video integrados sobre los entregables.' },
                    { title: 'Autonomía guiada', body: 'Las "etapas" se abren si y sólo si demuestras suficiencia, asegurando el desarrollo de competencias.' }
                ]
            },
            style: {
                backgroundColor: '#0f172a',
                textColor: '#ffffff',
                paddingY: '6rem',
            },
        },
        {
            id: 'flujo',
            type: 'timeline',
            name: 'Pasos de entrega',
            visible: true,
            order: 5,
            content: {
                eyebrow: 'Cómo trabajamos',
                title: 'Tu plataforma en 4 pasos:',
                items: PLATAFORMAS_LANDING_WORKFLOW,
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '6rem',
            },
        },
        {
            id: 'contacto',
            type: 'contact',
            name: 'Contacto Servicio',
            visible: true,
            order: 6,
            content: {
                eyebrow: 'Iniciemos tu proyecto',
                title: 'Hablemos de tus necesidades de plataforma',
                body: 'Escríbenos para conversar sobre configuraciones, integraciones y modelos de servicio.',
                email: 'andrestabla@algoritmot.com',
                secondaryLabel: 'WhatsApp Directo',
                secondaryHref: 'https://wa.me/573044544525',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
            },
        }
    ]
    return blocks
}

function createVirtualizacionLandingBlocks(): SitePageBlock[] {
    const blocks: SitePageBlock[] = [
        {
            id: 'hero',
            type: 'hero',
            name: 'Hero Servicio',
            visible: true,
            order: 0,
            content: {
                eyebrow: 'Experiencias de aprendizaje mediadas por tecnologías',
                title: 'Virtualización de programas',
                body: '',
                primaryLabel: 'Hablar con un consultor',
                primaryHref: '#contacto',
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0b1323',
                align: 'left',
                paddingY: '8rem',
            },
        },
        {
            id: 'gestion-planes',
            type: 'grid',
            name: 'Gestión planes de formación',
            visible: true,
            order: 1,
            content: {
                eyebrow: 'Somos su aliado en la creación y operación',
                title: 'Gestión planes de formación',
                items: [
                    { title: 'Programas de pregrado y posgrado', body: 'Acompañamiento integral en la formalización digital.', icon: 'GraduationCap' },
                    { title: 'Oferta de educación continua', body: 'Diplomados y certificados de alta calidad.', icon: 'BookOpenText' },
                    { title: 'Planes de formación organizacional', body: 'Entrenamiento corporativo escalable.', icon: 'Building2' },
                    { title: 'Formaciones a la medida', body: 'Proyectos específicos según necesidad.', icon: 'Users' },
                    { title: 'Cursos cortos', body: 'Experiencias ágiles de micro-aprendizaje.', icon: 'Rocket' }
                ]
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#ffffff',
                align: 'left',
                columns: '3',
                paddingY: '6rem',
            },
        },
        {
            id: 'contenidos',
            type: 'feature-list',
            name: 'Producción de contenidos',
            visible: true,
            order: 2,
            content: {
                title: 'Producción de contenidos educativos',
                items: [
                    { title: 'Cursos a la medida', body: 'Diseñamos, desarrollamos y virtualizamos programas atendiendo a proyectos específicos.', icon: 'BookOpenText' },
                    { title: 'Fábrica de contenidos', body: 'Producción masiva de contenidos administrando el 100% de la operación.', icon: 'Layers' },
                    { title: 'Implementación del proceso', body: 'Transferencia de la metodología Algoritmo e implementación tecnológica.', icon: 'Settings2' }
                ]
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '3',
                paddingY: '5rem',
            },
        },
        {
            id: 'experiencias',
            type: 'carousel',
            name: 'Casos de Virtualización',
            visible: true,
            order: 3,
            content: {
                title: 'Experiencias de virtualización exitosas',
                body: 'Conoce cómo hemos transformado la oferta educativa de diversas organizaciones.',
                items: VIRTUALIZACION_EXPERIENCIAS,
            },
            style: {
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                paddingY: '6rem',
            },
        },
        {
            id: 'maturity360',
            type: 'tuprofe' as SitePageBlockType,
            name: 'Plataforma Maturity360',
            visible: true,
            order: 4,
            content: {
                eyebrow: 'Plataforma especializada',
                title: 'Maturity360',
                body: 'Maturity360 centraliza la producción de cursos universitarios en una sola plataforma para coordinar flujo, roles, trazabilidad y control de calidad durante todo el proceso de virtualización.',
                primaryLabel: 'Ir a Maturity360',
                primaryHref: 'https://maturity360.co/',
                hideImage: true,
                imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
                items: [
                    { title: 'Objetivo claro de operación', body: 'Organizar de punta a punta la producción académica y técnica para que cada curso avance con responsables, etapas y evidencias visibles.' },
                    { title: 'Trazabilidad del proceso', body: 'Permite seguir cada curso por fases como planeación, escritura, validación instruccional, producción multimedia, LMS, QA y entrega.' },
                    { title: 'Roles y gobierno', body: 'Centraliza la coordinación entre equipos académicos, producción, soporte y gobierno institucional en un mismo entorno operativo.' },
                    { title: 'Analítica e indicadores', body: 'Integra lectura de desempeño, estado de avance e indicadores para tomar decisiones sobre tiempos, calidad y operación.' },
                    { title: 'Biblioteca y soporte', body: 'Articula recursos, curación de materiales y mesa de ayuda para sostener una operación más ordenada y escalable.' }
                ]
            },
            style: {
                backgroundColor: '#0f172a',
                textColor: '#ffffff',
                paddingY: '6rem',
            },
        },
        {
            id: 'flujo',
            type: 'timeline',
            name: 'Procesos ágiles',
            visible: true,
            order: 5,
            content: {
                eyebrow: 'Calidad asegurada',
                title: 'Procesos ágiles que generan valor',
                items: VIRTUALIZACION_LANDING_WORKFLOW,
                primaryLabel: 'Ver casos de éxito',
                primaryHref: '/servicios/casos-de-exito'
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '6rem',
            },
        },
        {
            id: 'contacto',
            type: 'contact',
            name: 'Contacto Servicio',
            visible: true,
            order: 6,
            content: {
                eyebrow: 'Iniciemos tu proyecto',
                title: 'Hablemos de tus necesidades de virtualización',
                body: 'Escríbenos para conversar sobre modelos de producción y operación de programas.',
                email: 'andrestabla@algoritmot.com',
                secondaryLabel: 'WhatsApp Directo',
                secondaryHref: 'https://wa.me/573044544525',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
            },
        }
    ]
    return blocks
}

function createAuditoriaLandingBlocks(): SitePageBlock[] {
    const blocks: SitePageBlock[] = [
        {
            id: 'hero',
            type: 'hero',
            name: 'Hero Servicio',
            visible: true,
            order: 0,
            content: {
                eyebrow: 'Auditoría de programas virtuales',
                title: 'Asegura la calidad de tus aulas virtuales con estándares QM',
                body: 'Evoluciona tu operación educativa con una evaluación rigurosa del cumplimiento técnico y pedagógico, enfocada en la retención estudiantil y la excelencia académica.',
                primaryLabel: 'Solicitar auditoría',
                primaryHref: '#contacto',
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0b1323',
                align: 'left',
                paddingY: '8rem',
            },
        },
        {
            id: 'promesas',
            type: 'grid',
            name: 'Indicadores de referencia',
            visible: true,
            order: 1,
            content: {
                title: 'Indicadores de referencia en auditoría',
                body: 'Consolidamos auditoría técnica-pedagógica y encuestas de percepción para entregar una lectura holística con resultados accionables.',
                radarTitle: 'Gráfica radial dinámica comparativa por estándar (0-100)',
                radarLegendGeneral: 'Promedio general',
                radarLegendFaculty: 'Facultad (ejemplo)',
                radarLegendProgram: 'Programa (ejemplo)',
                radarComparative: [
                    { standard: 'E1', general: 84, faculty: 78, program: 88 },
                    { standard: 'E2', general: 86, faculty: 80, program: 90 },
                    { standard: 'E3', general: 79, faculty: 73, program: 84 },
                    { standard: 'E4', general: 88, faculty: 82, program: 92 },
                    { standard: 'E5', general: 90, faculty: 85, program: 94 },
                    { standard: 'E6', general: 85, faculty: 79, program: 89 },
                    { standard: 'E7', general: 81, faculty: 75, program: 86 },
                    { standard: 'E8', general: 83, faculty: 77, program: 87 },
                ],
                items: [
                    {
                        title: 'Gráfica radial dinámica comparativa',
                        body: 'Resultados de los 8 estándares entre 0 y 100, con lectura general y comparativo por facultad y programa.',
                        value: 88,
                        metric: '8x3',
                        icon: 'LineChart',
                    },
                    {
                        title: 'Metodología integral con encuestas de percepción',
                        body: 'La metodología incorpora encuestas de percepción para obtener resultados más holísticos junto a los estándares QM.',
                        value: 92,
                        metric: 'Holístico',
                        icon: 'ShieldCheck',
                    },
                    {
                        title: 'Resultados por estándar y subestándar con evidencia',
                        body: 'Entregamos resultados generales por estándar y resultados por subestándar, sustentados en evidencia verificable.',
                        value: 90,
                        metric: 'Evidencia',
                        icon: 'LayoutDashboard',
                    },
                    {
                        title: 'Análisis cuantitativo y cualitativo con rutas de acción',
                        body: 'Presentamos análisis cuantitativo, cualitativo y rutas de acción específicas considerando prácticas de referentes de la industria.',
                        value: 94,
                        metric: 'Benchmark',
                        icon: 'Target',
                    },
                ],
            },
            style: {
                backgroundColor: '#0f172a',
                textColor: '#ffffff',
                align: 'left',
                columns: '3',
                paddingY: '6rem',
            },
        },
        {
            id: 'servicios',
            type: 'grid',
            name: 'Alcance de la auditoría',
            visible: true,
            order: 2,
            content: {
                eyebrow: 'Qué auditamos',
                title: 'Evaluación integral basada en evidencia',
                body: 'Analizamos cada aula virtual bajo marcos internacionales para detectar brechas y oportunidades de mejora real.',
                items: AUDITORIA_LANDING_EJES,
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '4',
                paddingY: '6rem',
            },
        },
        {
            id: 'estandares-qm',
            type: 'grid',
            name: 'Estándares QM',
            visible: true,
            order: 3,
            content: {
                title: '8 estándares fundamentales para el éxito virtual',
                body: 'Nuestra metodología se basa en la rúbrica Quality Matters para garantizar coherencia y rigor.',
                standardsFullLabel: 'Ver estándares completos',
                standardsFullHref: 'https://view.genially.com/62feddd288238d0018fca5f9',
                items: AUDITORIA_QM_STANDARDS,
            },
            style: {
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                align: 'left',
                columns: '2',
                paddingY: '5rem',
            },
        },
        {
            id: 'entregables',
            type: 'feature-list',
            name: 'Entregables',
            visible: true,
            order: 4,
            content: {
                title: 'Acciones concretas para tu institución',
                items: [
                    { title: 'Matriz detallada de hallazgos por curso.', icon: 'LayoutDashboard' },
                    { title: 'Priorización de brechas por nivel de criticidad.', icon: 'BarChart3' },
                    { title: 'Evidencias de cumplimiento técnico-pedagógico.', icon: 'BookOpenText' },
                    { title: 'Ruta de mejoramiento con hitos y responsables.', icon: 'Target' },
                    { title: 'Reporte ejecutivo para toma de decisiones.', icon: 'Rocket' },
                ],
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '3',
                paddingY: '5rem',
            },
        },
        {
            id: 'clientes',
            type: 'carousel',
            name: 'Clientes',
            visible: true,
            order: 5,
            content: {
                title: 'Cliente que confía en nuestras auditorías',
                body: 'Caso real de acompañamiento en aseguramiento de calidad académica virtual.',
                items: [
                    {
                        id: 'iberoamericana',
                        title: 'Corporación Universitaria Iberoamericana',
                        body: 'Acompañamiento en aseguramiento de calidad para programas virtuales.',
                        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/ibero.png',
                    },
                ],
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'center',
                paddingY: '5rem',
            },
        },
        {
            id: 'recursos',
            type: 'grid',
            name: 'Recursos',
            visible: true,
            order: 6,
            content: {
                eyebrow: 'Herramientas de seguimiento',
                title: 'Marcos de trabajo y decisión',
                body: 'Herramientas diseñadas para facilitar la gestión del cambio y el control de calidad.',
                items: AUDITORIA_LANDING_RESOURCES,
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                columns: '2',
                paddingY: '5rem',
            },
        },
        {
            id: 'flujo',
            type: 'timeline',
            name: 'Ruta de auditoría',
            visible: true,
            order: 7,
            content: {
                eyebrow: 'Metodología',
                title: 'Proceso de auditoría en 4 fases',
                items: AUDITORIA_LANDING_WORKFLOW,
                badges: ['Metodología QM', 'Evidencia Directa', 'Ruta Accionable'],
            },
            style: {
                backgroundColor: '#0f172a',
                textColor: '#ffffff',
                align: 'left',
                paddingY: '6rem',
            },
        },
        {
            id: 'faq',
            type: 'accordion',
            name: 'Preguntas frecuentes',
            visible: true,
            order: 8,
            content: {
                eyebrow: 'Resolviendo dudas',
                title: 'Lo que necesitas saber para empezar',
                items: AUDITORIA_LANDING_FAQ,
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
            name: 'Contacto Servicio',
            visible: true,
            order: 9,
            content: {
                eyebrow: 'Iniciemos hoy',
                title: 'Hablemos de tu calidad académica virtual',
                body: 'Escríbenos para agendar un diagnóstico inicial de tus programas en línea.',
                email: 'andrestabla@algoritmot.com',
                secondaryLabel: 'WhatsApp Consultoría',
                secondaryHref: 'https://wa.me/573044544525',
                serviceSlug: 'auditoria-virtual',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                paddingY: '6rem',
            },
        },
    ]

    return blocks
}

/**
 * Devuelve los bloques por defecto de una pagina con maquetacion propia, o null
 * si esa pagina usa el andamiaje generico (que se queda en CMSContext porque es
 * pequeno y hace falta de forma sincrona).
 */
export function createSpecializedBlocks(
    pageId: string,
    title: string,
    description: string,
    accentColor: string,
    deps: DefaultBlocksDeps
): SitePageBlock[] | null {
    staticServices = deps.staticServices
    staticProducts = deps.staticProducts
    staticHero = deps.staticHero
    staticSite = deps.staticSite
    staticHomePage = deps.staticHomePage
    getServicesPlainCopy = deps.getServicesPlainCopy

    if (pageId === 'home-nav') return createNavigationSelectorBlocks()
    if (pageId === 'home-root') return createServicesLandingBlocks(title)
    if (pageId === 'home-edu') return createEducationLandingBlocks()
    if (pageId === 'servicio-plataformas') return createPlataformasLandingBlocks()
    if (pageId === 'virtualizacion-programas') return createVirtualizacionLandingBlocks()
    if (pageId === 'auditoria-programas-virtuales') return createAuditoriaLandingBlocks()
    if (pageId === 'home-inicio') return createClassicHomeBlocks(title, description, accentColor)
    if (pageId === 'case-transversal') return createTransversalCaseBlocks()
    return null
}
