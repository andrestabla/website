import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { ProxyAgent } from 'proxy-agent'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

async function main() {
    const connectionString = `${process.env.DATABASE_URL}`
    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    console.log('Seeding rich content (v4)...')

    // Hero
    await prisma.hero.upsert({
        where: { id: 'main-hero' },
        update: {
            highlight: 'Digital Strategy & Human Engineering',
            title: 'Maestría Digital en la Era de la Industria 5.0',
            subtitle: 'Transformamos organizaciones mediante la integración armónica de Inteligencia Artificial y Talento Humano.',
            cta: 'Iniciar Transformación',
            secondaryCta: 'Ver Casos de Éxito',
        },
        create: {
            id: 'main-hero',
            highlight: 'Digital Strategy & Human Engineering',
            title: 'Maestría Digital en la Era de la Industria 5.0',
            subtitle: 'Transformamos organizaciones mediante la integración armónica de Inteligencia Artificial y Talento Humano.',
            cta: 'Iniciar Transformación',
            secondaryCta: 'Ver Casos de Éxito',
        }
    })

    // Services
    const services = [
        {
            slug: 'captura-adn',
            title: 'Captura del ADN',
            highlight: 'Diagnóstico Estratégico',
            subtitle: 'Entendemos tu modelo de negocio y procesos clave para diseñar soluciones digitales efectivas.',
            description: 'Una consultoría estratégica para mapear la esencia de la empresa antes de digitalizarla.',
            descriptionLong: 'Realizamos un diagnóstico completo de tu organización (propuesta de valor, segmentos, procesos y tecnología actual) para sentar las bases de tu transformación digital. Así garantizamos soluciones alineadas a tus objetivos y cultura, maximizando el valor desde el inicio.',
            ctaText: 'Iniciar mapeo estratégico',
            seoTitle: 'Captura del ADN Digital – Diagnóstico Estratégico',
            seoDescription: 'Mapeamos tu modelo de negocio y procesos esenciales para diseñar soluciones digitales personalizadas. ¡Comienza tu transformación digital hoy!',
            iconName: 'Search',
            features: ['Value Proposition Canvas', 'Business Model Canvas', 'Identificación de Quick Wins']
        },
        {
            slug: 'mapeo-procesos',
            title: 'Mapeo de Procesos',
            highlight: 'Optimización Digital',
            subtitle: 'Diagramamos cada paso clave para eliminar cuellos de botella y automatizar con inteligencia.',
            description: 'Optimizamos tus flujos de trabajo para la era digital.',
            descriptionLong: 'Realizamos un mapeo detallado de tus procesos actuales (usando BPMN y Lean) para identificar ineficiencias y diseñar flujos optimizados. Con esta visibilidad, automatizamos tareas repetitivas y mejoramos tu productividad.',
            ctaText: 'Agendar workshop',
            seoTitle: 'Mapeo de Procesos BPMN – Optimización Digital',
            seoDescription: 'Modelamos y optimizamos tus procesos clave para lograr flujos más rápidos y eficientes. Aumenta la productividad automatizando con inteligencia.',
            iconName: 'Network',
            features: ['Diagramas BPMN 2.0', 'Value Stream Mapping', 'Matriz de KPIs']
        },
        {
            slug: 'humano-vs-tecnologia',
            title: 'Decisión Humano vs Tecnología',
            highlight: 'IA Responsable',
            subtitle: 'Decidimos juntos dónde poner el talento humano y dónde la tecnología para maximizar resultados.',
            description: 'Equilibrio humano-tecnológico para soluciones responsables.',
            descriptionLong: 'Analizamos cada proceso para determinar qué debe seguir en manos de tus colaboradores y qué puede automatizarse con IA/RPA. Así, preservamos la creatividad y la supervisión humana donde más importa.',
            ctaText: 'Solicitar estrategia IA/RPA',
            seoTitle: 'Automatización Humano-Tecnología – IA Responsable',
            seoDescription: 'Diseñamos tu estrategia de automatización midiendo qué tareas realiza tu equipo y cuáles podemos delegar a la tecnología.',
            iconName: 'Users',
            features: ['Matriz de Responsabilidad Humano/Tech', 'Gobernanza de IA (NIST)', 'Plan de Mitigación de Riesgos']
        },
        {
            slug: 'diseno-desarrollo',
            title: 'Diseño y Desarrollo de Soluciones',
            highlight: 'Metodologías Ágiles',
            subtitle: 'De la idea al prototipo: desarrollamos la solución ideal para tu negocio.',
            description: 'Construimos prototipos y soluciones digitales personalizadas.',
            descriptionLong: 'Desarrollamos desde prototipos rápidos hasta productos finales usando metodologías ágiles. Integramos tu infraestructura actual (cloud, APIs, CRM) con nuevas herramientas.',
            ctaText: 'Construir mi solución digital',
            seoTitle: 'Diseño y Desarrollo de Software – Soluciones a Medida',
            seoDescription: 'Construimos prototipos y aplicaciones personalizadas que se integran con tus sistemas. Aplica metodologías ágiles.',
            iconName: 'Code',
            features: ['Blueprint Tecnológico', 'Prototipado Rápido', 'Validación con Usuarios']
        },
        {
            slug: 'implementacion',
            title: 'Implementación',
            highlight: 'Transformación Real',
            subtitle: 'Capacitación, despliegue técnico y seguimiento inicial para que todo funcione sin contratiempos.',
            description: 'Lanzamos la tecnología con adopción garantizada.',
            descriptionLong: 'Nos encargamos de poner en marcha la solución: configuramos los sistemas, migramos datos y formamos a tus usuarios. Garantizamos una transición sin interrupciones.',
            ctaText: 'Programar implementación',
            seoTitle: 'Implementación de Soluciones – Transformación Digital',
            seoDescription: 'Desplegamos tu solución en producción asegurando integración y soporte continuo. Capacitación de usuarios.',
            iconName: 'Rocket',
            features: ['Migración de Datos', 'Gestión del Cambio (Kotter)', 'Soporte Post-Lanzamiento']
        },
        {
            slug: 'seguimiento-mejora',
            title: 'Seguimiento y Mejora Continua',
            highlight: 'Resiliencia Operativa',
            subtitle: 'Supervisamos métricas clave y ajustamos la solución para maximizar su impacto.',
            description: 'Optimización constante con enfoque humano.',
            descriptionLong: 'Medimos el desempeño (SLA/SLO) usando dashboards personalizados. Aplicamos mejoras continuas basadas en datos reales y feedback de usuarios.',
            ctaText: 'Optimizar mi solución ya',
            seoTitle: 'Soporte y Mejora Continua – Tecnología Resiliente',
            seoDescription: 'Monitoreamos tus soluciones digitales con dashboards KPI y realizamos ajustes continuos.',
            iconName: 'LineChart',
            features: ['Dashboards en Tiempo Real', 'Análisis de SLA/SLO', 'Roadmap de Mejoras']
        }
    ]

    for (const service of services) {
        await prisma.service.upsert({
            where: { slug: service.slug },
            update: service,
            create: service
        })
    }

    // Products
    const products = [
        {
            slug: 'diagnostico-md-ia',
            title: 'Diagnóstico MD-IA',
            description: 'Informe integral de madurez digital e IA.',
            descriptionLong: 'Evaluamos tus capacidades en estrategia, procesos, tecnología y cultura para identificar brechas clave. Te entregamos un reporte ejecutable con recomendaciones por etapas.',
            price: 'Paquete de Auditoría',
            ctaText: 'Solicitar diagnóstico',
            seoTitle: 'Diagnóstico MD-IA – Madurez Digital',
            seoDescription: 'Informe ejecutivo de madurez digital e IA con hoja de ruta priorizada. Mejora tu competitividad.',
            iconName: 'ClipboardCheck'
        },
        {
            slug: 'prototipo-funcional',
            title: 'Prototipo Funcional',
            description: 'Versión mínima viable de tu solución.',
            descriptionLong: 'Validamos ideas rápido: armamos un prototipo funcional integrado con tus sistemas. Así compruebas el valor antes de invertir a gran escala.',
            price: 'Trial de 4 Semanas',
            ctaText: 'Agendar demo',
            seoTitle: 'Prototipo Funcional – MVP Ágil',
            seoDescription: 'Desarrollo rápido de prototipo funcional para validar tu proyecto digital. Mide impacto antes de escalar.',
            iconName: 'Zap'
        },
        {
            slug: 'retainer-mejora',
            title: 'Retainer de Mejora',
            description: 'Soporte continuo y optimización post-lanzamiento.',
            descriptionLong: 'Asegura la operatividad de tus sistemas con nuestro retainer mensual: ajustes proactivos, monitoreo y actualizaciones de seguridad.',
            price: 'Suscripción Mensual',
            ctaText: 'Ver detalles técnicos',
            seoTitle: 'Servicio de Mejora Continua – SLA Garantizado',
            seoDescription: 'Cobertura mensual de soporte, actualización y optimización de tu solución digital. Seguridad y rendimiento.',
            iconName: 'Infinity'
        }
    ]

    for (const product of products) {
        await prisma.product.upsert({
            where: { slug: product.slug },
            update: product,
            create: product
        })
    }

    // Site Config
    await prisma.siteConfig.upsert({
        where: { id: 'site-config' },
        update: {
            name: 'AlgoritmoT',
            description: 'Liderando la Transformación Digital y la Madurez de IA con un enfoque humano-céntrico (Industria 5.0).',
            email: 'hola@algoritmot.com',
            address: 'Bogotá, Colombia',
            linkedin: 'https://linkedin.com/company/algoritmot',
            twitter: 'https://twitter.com/algoritmot',
        },
        create: {
            id: 'site-config',
            name: 'AlgoritmoT',
            description: 'Liderando la Transformación Digital y la Madurez de IA con un enfoque humano-céntrico (Industria 5.0).',
            email: 'hola@algoritmot.com',
            address: 'Bogotá, Colombia',
            linkedin: 'https://linkedin.com/company/algoritmot',
            twitter: 'https://twitter.com/algoritmot',
        }
    })

    console.log('Seeding complete.')
    await prisma.$disconnect()
    pool.end()
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
