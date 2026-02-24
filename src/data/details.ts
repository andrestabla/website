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

export const formMicrocopy = {
    submit: ["Enviar", "Enviar solicitud", "Contactar ahora"],
    confirm: ["Aceptar", "¡Listo!", "Confirmar"],
    placeholders: {
        email: ["tu@correo.com", "email@ejemplo.com", "nombre@dominio.com"],
        name: ["Tu nombre", "Nombre completo", "Nombre"]
    },
    success: [
        "¡Gracias! Te contactaremos pronto.",
        "Solicitud recibida, te avisamos.",
        "¡Listo! Reviso tu mensaje.",
        "Pronto recibirás una llamada.",
        "Tu consulta fue enviada con éxito.",
        "Hemos recibido tu solicitud."
    ],
    error: [
        "Error al enviar. Intenta de nuevo.",
        "No pudimos procesar tu solicitud.",
        "Algo salió mal. Por favor reintenta.",
        "Falta información. Completa todos los campos.",
        "Verifica los datos ingresados.",
        "Debes completar todos los campos."
    ]
}

export const servicesDetail = [
    {
        slug: 'captura-adn',
        title: 'Captura del ADN',
        highlight: 'Diagnóstico Estratégico',
        subtitle: 'Entendemos tu modelo de negocio y procesos clave para diseñar soluciones digitales efectivas.',
        description: 'Una consultoría estratégica para mapear la esencia de la empresa antes de digitalizarla.',
        descriptionLong: 'Realizamos un diagnóstico completo de tu organización (propuesta de valor, segmentos, procesos y tecnología actual) para sentar las bases de tu transformación digital. Así garantizamos soluciones alineadas a tus objetivos y cultura, maximizando el valor desde el inicio.',
        ctaPrimary: 'Solicita tu diagnóstico hoy',
        ctaSecondary: 'Agendar asesoría gratuita',
        tracking: '?utm_campaign=captura_adn&utm_medium=web&utm_source=landing',
        seoTitle: 'Captura del ADN Digital – Diagnóstico Estratégico',
        seoDescription: 'Mapeamos tu modelo de negocio y procesos esenciales para diseñar soluciones digitales personalizadas. ¡Comienza tu transformación digital hoy!',
        icon: Search,
        features: ['Value Proposition Canvas', 'Business Model Canvas', 'Identificación de Quick Wins'],
        variants: [
            { tone: 'Corporativo', titular: 'Descubrimos el ADN digital de tu empresa', rationale: 'Evoca profesionalismo y precisión.' },
            { tone: 'Humano', titular: 'Conoce tu negocio en profundidad antes de digitalizar', rationale: 'Habla directamente al cliente.' },
            { tone: 'Técnico', titular: 'Análisis integral del ADN empresarial para soluciones a medida', rationale: 'Resalta meticulosidad.' }
        ],
        ctaVariants: [
            { original: 'Solicitar diagnóstico', alt: ['Obtener mi informe estratégico', 'Agendar asesoría gratuita', 'Comienza tu análisis', 'Solicita tu diagnóstico hoy', 'Iniciar diagnóstico MD-IA', 'Evaluar mi madurez digital'] },
            { original: '¡Entender mi negocio ahora!', alt: ['Descubre tu punto de partida', 'Evaluar mi empresa ahora', 'Mostrar mis brechas', 'Empezar diagnóstico rápido', 'Conocer mis oportunidades', 'Conectar mi negocio digital'] },
            { original: 'Iniciar mapeo estratégico', alt: ['Mapear procesos clave', 'Comenzar workshop de procesos', 'Trazar mi roadmap digital', 'Explorar mis procesos', 'Planificar transformación', 'Organizar procesos ahora'] }
        ],
        abHypothesis: '“Solicita tu diagnóstico hoy” vs “Agendar asesoría gratuita”: Evaluar urgencia vs valor gratuito.'
    },
    {
        slug: 'mapeo-procesos',
        title: 'Mapeo de Procesos',
        highlight: 'Optimización Digital',
        subtitle: 'Diagramamos cada paso clave para eliminar cuellos de botella y automatizar con inteligencia.',
        description: 'Optimizamos tus flujos de trabajo para la era digital.',
        descriptionLong: 'Realizamos un mapeo detallado de tus procesos actuales (usando BPMN y Lean) para identificar ineficiencias y diseñar flujos optimizados. Con esta visibilidad, automatizamos tareas repetitivas y mejoramos tu productividad.',
        ctaPrimary: 'Optimizar mis procesos',
        ctaSecondary: 'Reservar sesión de mapeo',
        tracking: '?utm_campaign=mapeo_procesos&utm_medium=web&utm_source=landing',
        seoTitle: 'Mapeo de Procesos BPMN – Optimización Digital',
        seoDescription: 'Modelamos y optimizamos tus procesos clave para lograr flujos más rápidos y eficientes.',
        icon: Network,
        features: ['Diagramas BPMN 2.0', 'Value Stream Mapping', 'Matriz de KPIs'],
        variants: [
            { tone: 'Corporativo', titular: 'Modelamos tus procesos hacia la eficiencia', rationale: 'Enfatiza mejora de eficiencia.' },
            { tone: 'Humano', titular: 'Transformamos cómo trabajas para que sea más simple', rationale: 'Focado en beneficio personal.' },
            { tone: 'Técnico', titular: 'Diseño y optimización de procesos con BPMN', rationale: 'Subraya rigor.' }
        ],
        ctaVariants: [
            { original: 'Ver ejemplos de mapeo', alt: ['Ver casos de éxito', 'Explorar estudios de caso', 'Ver infografías BPMN', 'Descubrir optimizaciones', 'Ejemplos de eficiencia', 'Galería de procesos'] },
            { original: 'Optimizar mis procesos', alt: ['Hacer mi negocio más eficiente', 'Automatizar mi flujo de trabajo', 'Reducir tiempos ya', 'Acelerar mis procesos', 'Mejorar mi productividad', 'Simplificar mis tareas'] },
            { original: 'Agendar workshop', alt: ['Programar taller estratégico', 'Reservar sesión de mapeo', 'Iniciar workshop digital', 'Planificar sesion de procesos', 'Coordinar workshop personalizado', 'Agenda tu workshop'] }
        ],
        abHypothesis: '“Optimizar mis procesos” vs “Ver casos de éxito”: Acción propia vs prueba social.'
    },
    {
        slug: 'humano-vs-tecnologia',
        title: 'Decisión Humano vs Tecnología',
        highlight: 'IA Responsable',
        subtitle: 'Decidimos juntos dónde poner el talento humano y dónde la tecnología para maximizar resultados.',
        description: 'Equilibrio humano-tecnológico para soluciones responsables.',
        descriptionLong: 'Analizamos cada proceso para determinar qué debe seguir en manos de tus colaboradores y qué puede automatizarse con IA/RPA. Así, preservamos la creatividad y la supervisión humana donde más importa.',
        ctaPrimary: 'Potencia tu equipo con IA',
        ctaSecondary: 'Solicita tu estrategia IA',
        tracking: '?utm_campaign=humano_vs_tecnologia&utm_medium=web&utm_source=landing',
        seoTitle: 'Automatización Humano-Tecnología – IA Responsable',
        seoDescription: 'Diseñamos tu estrategia de automatización midiendo qué tareas realiza tu equipo.',
        icon: Users,
        features: ['Matriz de Responsabilidad Humano/Tech', 'Gobernanza de IA (NIST)', 'Plan de Mitigación de Riesgos'],
        variants: [
            { tone: 'Corporativo', titular: 'Define qué tareas debe hacer tu equipo o la tecnología' },
            { tone: 'Humano', titular: 'Potencia a tu equipo, automatizando lo repetitivo' },
            { tone: 'Técnico', titular: 'Estrategia de automatización: humano vs IA' }
        ],
        ctaVariants: [
            { original: 'Balancear mi equipo y tecnología', alt: ['Potencia tu equipo con IA', 'Automatizar con sentido', 'Equilibra persona y máquina', 'Implementar IA responsable', 'Mejorar tu trabajo diario', 'Liderar la automatización'] },
            { original: 'Solicitar estrategia IA/RPA', alt: ['Diseñar mi plan de IA', 'Solicita tu estrategia IA', 'Estrategia de automatización', 'Planificar IA y RPA', 'Configurar proyectos de IA', 'Desarrollar roadmap IA'] },
            { original: 'Descubre cómo automatizar', alt: ['Empieza a automatizar hoy', 'Tu empresa hiperconectada', 'Redefinir tus procesos', 'Incrementar mi productividad', 'Adoptar IA rápidamente', 'Digitalizar mis tareas'] }
        ],
        abHypothesis: '“Potencia tu equipo con IA” vs “Automatizar con sentido”: Empoderamiento vs enfoque racional.'
    },
    {
        slug: 'diseno-desarrollo',
        title: 'Diseño y Desarrollo de Soluciones',
        highlight: 'Metodologías Ágiles',
        subtitle: 'De la idea al prototipo: desarrollamos la solución ideal para tu negocio.',
        description: 'Construimos prototipos y soluciones digitales personalizadas.',
        descriptionLong: 'Desarrollamos desde prototipos rápidos hasta productos finales usando metodologías ágiles. Integramos tu infraestructura actual con nuevas herramientas.',
        ctaPrimary: 'Crear mi prototipo ahora',
        ctaSecondary: 'Desarrollar mi plataforma',
        tracking: '?utm_campaign=diseno_desarrollo&utm_medium=web&utm_source=landing',
        seoTitle: 'Diseño y Desarrollo de Software – Soluciones a Medida',
        seoDescription: 'Construimos prototipos y aplicaciones personalizadas.',
        icon: Code,
        features: ['Blueprint Tecnológico', 'Prototipado Rápido', 'Validación con Usuarios'],
        variants: [
            { tone: 'Corporativo', titular: 'Creamos soluciones digitales a tu medida' },
            { tone: 'Humano', titular: 'Diseñamos tecnología que crece contigo' },
            { tone: 'Técnico', titular: 'Prototipado rápido con tecnología ágil' }
        ],
        ctaVariants: [
            { original: 'Solicitar prototipo', alt: ['Construye tu prototipo', 'Iniciar prototipado ya', 'Crear demo personal', 'Probar tu idea', 'Hacer mi primer prototipo', 'Validar mi proyecto'] },
            { original: 'Construir mi solución digital', alt: ['Llevar al siguiente nivel', 'Implementar mi solución', 'Desarrollar mi plataforma', 'Materializar mi proyecto', 'Crear mi app ahora', 'Digitalizar mi producto'] },
            { original: 'Ver demo rápida', alt: ['Ver prototipo en acción', 'Demo de 5 minutos', 'Tour rápido del producto', 'Explorar demo online', 'Mira la solución', 'Ejemplo práctico aquí'] }
        ],
        abHypothesis: '“Crear mi prototipo ahora” vs “Ver demo rápida”: CTA personalizada vs exploración.'
    },
    {
        slug: 'implementacion',
        title: 'Implementación',
        highlight: 'Transformación Real',
        subtitle: 'Capacitación, despliegue técnico y seguimiento inicial para que todo funcione sin contratiempos.',
        description: 'Lanzamos la tecnología con adopción garantizada.',
        descriptionLong: 'Nos encargamos de poner en marcha la solución: configuramos los sistemas, migramos datos y formamos a tus usuarios.',
        ctaPrimary: 'Iniciar despliegue ahora',
        ctaSecondary: 'Soporte inmediato',
        tracking: '?utm_campaign=implementacion&utm_medium=web&utm_source=landing',
        seoTitle: 'Implementación de Soluciones – Transformación Digital',
        seoDescription: 'Desplegamos tu solución en producción asegurando integración.',
        icon: Rocket,
        features: ['Migración de Datos', 'Gestión del Cambio (Kotter)', 'Soporte Post-Lanzamiento'],
        variants: [
            { tone: 'Corporativo', titular: 'Implementamos tu solución con éxito' },
            { tone: 'Humano', titular: 'Acompañamos a tu equipo en cada paso del cambio' },
            { tone: 'Técnico', titular: 'Despliegue integral y soporte continuo' }
        ],
        ctaVariants: [
            { original: 'Programar implementación', alt: ['Iniciar despliegue ahora', 'Agendar kickoff', 'Llevarlo a producción', 'Migrar a producción', 'Implementar solución hoy', 'Activar mi proyecto'] },
            { original: 'Plan de cambio completo', alt: ['Cambio garantizado', 'Asistir mi transición', 'Planificar implementación', 'Preparar equipo', 'Soporte en cada paso', 'Acompañar mi equipo'] },
            { original: 'Contacto de soporte 24/7', alt: ['Soporte inmediato', 'Asistencia permanente', 'Protección total 24h', 'Acceso a helpdesk', 'Ayuda técnica al instante', 'Equipo de soporte'] }
        ],
        abHypothesis: '“Iniciar despliegue ahora” vs “Cambio garantizado”: Urgencia vs promesa de seguridad.'
    },
    {
        slug: 'seguimiento-mejora',
        title: 'Seguimiento y Mejora Continua',
        highlight: 'Resiliencia Operativa',
        subtitle: 'Supervisamos métricas clave y ajustamos la solución para maximizar su impacto.',
        description: 'Optimización constante con enfoque humano.',
        descriptionLong: 'Medimos el desempeño (SLA/SLO) usando dashboards personalizados.',
        ctaPrimary: 'Analizar resultados ahora',
        ctaSecondary: 'Suscribirme a mejoras continuas',
        tracking: '?utm_campaign=mejora_continua&utm_medium=web&utm_source=landing',
        seoTitle: 'Soporte y Mejora Continua – Tecnología Resiliente',
        seoDescription: 'Monitoreamos tus soluciones digitales con dashboards KPI.',
        icon: LineChart,
        features: ['Dashboards en Tiempo Real', 'Análisis de SLA/SLO', 'Roadmap de Mejoras'],
        variants: [
            { tone: 'Corporativo', titular: 'Monitoreamos y mejoramos tus procesos' },
            { tone: 'Humano', titular: 'Siempre creciendo: tu tecnología al día' },
            { tone: 'Técnico', titular: 'Dashboard de KPIs y ajustes proactivos' }
        ],
        ctaVariants: [
            { original: 'Ver métrica de rendimiento', alt: ['Analizar resultados ahora', 'Dashboard personalizado', 'Mis datos en tiempo real', 'Ver KPIs clave', 'Monitorear mi sistema', 'Acceder a métricas'] },
            { original: 'Contratar seguimiento mensual', alt: ['Mantenerme siempre optimizado', 'Suscribirme a mejoras continuas', 'Cobertura mensual total', 'Plan de mejora constante', 'Actualización permanente', 'Soporte y evolución'] },
            { original: 'Optimizar mi solución ya', alt: ['Mejorar mis resultados', 'Actualizar mi plataforma', 'Potenciar mi rendimiento', 'Aumentar mi estabilidad', 'Llevar al siguiente nivel', 'Activa mejoras ahora'] }
        ],
        abHypothesis: '“Analizar resultados ahora” vs “Suscribirme a mejoras continuas”: Acción inmediata vs plan a largo plazo.'
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
        seoDescription: 'Informe ejecutivo de madurez digital e IA con hoja de ruta priorizada.',
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
        seoDescription: 'Desarrollo rápido de prototipo funcional para validar tu proyecto digital.',
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
        seoDescription: 'Cobertura mensual de soporte, actualización y optimización de tu solución digital.',
        icon: Infinity,
        variants: [
            { tone: 'Corporativo', titular: 'Soporte y Mejora Continua' },
            { tone: 'Humano', titular: 'Siempre juntos mejorando tu tecnología' },
            { tone: 'Técnico', titular: 'Mantenimiento e Iteración Continua' }
        ]
    }
]
