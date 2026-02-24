import {
    Search,
    Network,
    Users,
    Code,
    Rocket,
    LineChart,
    ClipboardCheck,
    Zap,
    Infinity
} from 'lucide-react'

export const servicesDetail = [
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
        icon: Search,
        features: ['Value Proposition Canvas', 'Business Model Canvas', 'Identificación de Quick Wins'],
        variants: [
            { tone: 'Corporativo', titular: 'Descubrimos el ADN digital de tu empresa', rationale: 'Evoca profesionalismo y precisión.' },
            { tone: 'Humano', titular: 'Conoce tu negocio en profundidad antes de digitalizar', rationale: 'Habla directamente al cliente, muestra cercanía.' },
            { tone: 'Técnico', titular: 'Análisis integral del ADN empresarial para soluciones a medida', rationale: 'Resalta meticulosidad y enfoque a medida.' }
        ],
        abHypothesis: 'Probar “Descubrimos el ADN digital…” vs “Conoce tu negocio en profundidad…”: ¿Genera más clics la frase técnica vs la cercana?'
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
        icon: Network,
        features: ['Diagramas BPMN 2.0', 'Value Stream Mapping', 'Matriz de KPIs'],
        variants: [
            { tone: 'Corporativo', titular: 'Modelamos tus procesos hacia la eficiencia', rationale: 'Enfatiza mejora de eficiencia.' },
            { tone: 'Humano', titular: 'Transformamos cómo trabajas para que sea más simple', rationale: 'Lenguaje cercano, enfocado en beneficio personal.' },
            { tone: 'Técnico', titular: 'Diseño y optimización de procesos con BPMN', rationale: 'Subraya uso de estándares y rigor.' }
        ],
        abHypothesis: '¿Prefiere el público énfasis en eficiencia (resultado) o en el método (BPMN)?'
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
        icon: Users,
        features: ['Matriz de Responsabilidad Humano/Tech', 'Gobernanza de IA (NIST)', 'Plan de Mitigación de Riesgos'],
        variants: [
            { tone: 'Corporativo', titular: 'Define qué tareas debe hacer tu equipo o la tecnología', rationale: 'Destaca control ejecutivo y balance.' },
            { tone: 'Humano', titular: 'Potencia a tu equipo, automatizando lo repetitivo', rationale: 'Refleja apoyo al personal y valor humano.' },
            { tone: 'Técnico', titular: 'Estrategia de automatización: humano vs IA', rationale: 'Habla de “IA” específico, suena experto.' }
        ]
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
        seoDescription: 'Construimos prototipos y aplicaciones personalizadas que se integran con tus sistemas.',
        icon: Code,
        features: ['Blueprint Tecnológico', 'Prototipado Rápido', 'Validación con Usuarios'],
        variants: [
            { tone: 'Corporativo', titular: 'Creamos soluciones digitales a tu medida', rationale: 'Profesional, enfocado en personalización.' },
            { tone: 'Humano', titular: 'Diseñamos tecnología que crece contigo', rationale: 'Cercano, habla de crecimiento mutuo.' },
            { tone: 'Técnico', titular: 'Prototipado rápido con tecnología ágil', rationale: 'Resalta rapidez y agilidad.' }
        ]
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
        seoDescription: 'Desplegamos tu solución en producción asegurando integración y soporte continuo.',
        icon: Rocket,
        features: ['Migración de Datos', 'Gestión del Cambio (Kotter)', 'Soporte Post-Lanzamiento'],
        variants: [
            { tone: 'Corporativo', titular: 'Implementamos tu solución con éxito', rationale: 'Resalta confiabilidad y experiencia.' },
            { tone: 'Humano', titular: 'Acompañamos a tu equipo en cada paso del cambio', rationale: 'Muestra apoyo cercano.' },
            { tone: 'Técnico', titular: 'Despliegue integral y soporte continuo', rationale: 'Enfocado en procesos técnicos.' }
        ]
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
        icon: LineChart,
        features: ['Dashboards en Tiempo Real', 'Análisis de SLA/SLO', 'Roadmap de Mejoras'],
        variants: [
            { tone: 'Corporativo', titular: 'Monitoreamos y mejoramos tus procesos', rationale: 'Centrado en resultados medibles.' },
            { tone: 'Humano', titular: 'Siempre creciendo: tu tecnología al día', rationale: 'Habla de evolución continua.' },
            { tone: 'Técnico', titular: 'Dashboard de KPIs y ajustes proactivos', rationale: 'Muestra rigor en medición.' }
        ]
    }
]

export const productsDetail = [
    {
        slug: 'diagnostico-md-ia',
        title: 'Diagnóstico MD-IA',
        highlight: 'Auditoría de Madurez',
        description: 'Informe integral de madurez digital e IA.',
        descriptionLong: 'Evaluamos tus capacidades en estrategia, procesos, tecnología y cultura para identificar brechas clave. Te entregamos un reporte ejecutable con recomendaciones por etapas.',
        price: 'Paquete de Auditoría',
        ctaText: 'Solicitar diagnóstico',
        seoTitle: 'Diagnóstico MD-IA – Madurez Digital',
        seoDescription: 'Informe ejecutivo de madurez digital e IA con hoja de ruta priorizada. Mejora tu competitividad.',
        icon: ClipboardCheck,
        variants: [
            { tone: 'Corporativo', titular: 'Diagnóstico de Madurez Digital y de IA' },
            { tone: 'Humano', titular: '¿Listo para la transformación? Empieza por aquí' },
            { tone: 'Técnico', titular: 'Evaluación MD-IA: Nivel de Madurez Tecnológica' }
        ]
    },
    {
        slug: 'prototipo-funcional',
        title: 'Prototipo Funcional',
        highlight: 'MVP Acelerado',
        description: 'Versión mínima viable de tu solución.',
        descriptionLong: 'Validamos ideas rápido: armamos un prototipo funcional integrado con tus sistemas. Así compruebas el valor antes de invertir a gran escala.',
        price: 'Trial de 4 Semanas',
        ctaText: 'Agendar demo',
        seoTitle: 'Prototipo Funcional – MVP Ágil',
        seoDescription: 'Desarrollo rápido de prototipo funcional para validar tu proyecto digital. Mide impacto antes de escalar.',
        icon: Zap,
        variants: [
            { tone: 'Corporativo', titular: 'Prototipo de Solución en 4 semanas' },
            { tone: 'Humano', titular: 'Ve tu idea hecha realidad' },
            { tone: 'Técnico', titular: 'Desarrollo Ágil de MVP Digital' }
        ]
    },
    {
        slug: 'retainer-mejora',
        title: 'Retainer de Mejora',
        highlight: 'Soporte Continuo',
        description: 'Soporte continuo y optimización post-lanzamiento.',
        descriptionLong: 'Asegura la operatividad de tus sistemas con nuestro retainer mensual: ajustes proactivos, monitoreo y actualizaciones de seguridad.',
        price: 'Suscripción Mensual',
        ctaText: 'Ver detalles técnicos',
        seoTitle: 'Servicio de Mejora Continua – SLA Garantizado',
        seoDescription: 'Cobertura mensual de soporte, actualización y optimización de tu solución digital. Seguridad y rendimiento.',
        icon: Infinity,
        variants: [
            { tone: 'Corporativo', titular: 'Soporte y Mejora Continua' },
            { tone: 'Humano', titular: 'Siempre juntos mejorando tu tecnología' },
            { tone: 'Técnico', titular: 'Mantenimiento e Iteración Continua' }
        ]
    }
]
