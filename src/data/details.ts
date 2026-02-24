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
        descriptionLong: 'Antes de digitalizar, hay que entender. Realizamos un diagnóstico 360° de tu organización: mapeamos tu modelo de negocio con el Business Model Canvas, identificamos la propuesta de valor con el Value Proposition Canvas y evaluamos tu madurez digital (MD-IA). El resultado es un roadmap claro de iniciativas priorizadas, con el que sabes exactamente qué digitalizar primero, por qué y cómo, maximizando el retorno desde la primera semana.',
        outcomes: [
            'Radar de Madurez Digital con tu posición en 6 dimensiones clave',
            'Business Model Canvas y Value Proposition Canvas documentados',
            'Roadmap priorizado de iniciativas digitales (90 días y 12 meses)',
            'Identificación de Quick Wins con ROI estimado',
            'Diagnóstico de brechas tecnológicas vs. benchmark de tu sector',
            'Informe ejecutivo listo para presentar a inversores o directivos',
        ],
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
        descriptionLong: 'Muchas empresas operan con procesos invisibles: nadie los ha documentado y cada empleado los hace diferente. Utilizamos el estándar BPMN 2.x para hacer visibles tus flujos de trabajo "as-is", identificar desperdicios con Value Stream Mapping (Lean) y rediseñarlos hacia un estado optimizado "to-be". El resultado: procesos más cortos, menos errores y equipos que saben exactamente qué hacer, cuándo y por qué.',
        outcomes: [
            'Diagramas BPMN 2.x de tus procesos actuales (as-is) y optimizados (to-be)',
            'Value Stream Map con identificación de desperdicios y actividades sin valor',
            'Reducción promedio del 60-90% en tiempos de ciclo de proceso',
            'Matriz de KPIs con indicadores por proceso y responsable',
            'Hoja de ruta de automatización priorizada por impacto',
            'Documentación lista para certificaciones ISO 9001 o similares',
        ],
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
        descriptionLong: 'La automatización sin estrategia destruye valor y genera resistencia. Analizamos cada tarea de tu empresa para decidir —con criterios objetivos y marcos de IA responsable (NIST AI RMF)— qué debe realizarlo un humano, qué puede automatizarse completamente y qué es mejor hacerlo en colaboración humano-IA. El resultado es un diseño sociotécnico que potencia a tu equipo, reduce el riesgo y cumple principios éticos internacionales.',
        outcomes: [
            'Matriz Humano-Tecnología con clasificación de todas tus actividades clave',
            'Diseño de la arquitectura sociotécnica óptima para tu empresa',
            'Plan de mitigación de riesgos de IA (gobernanza basada en NIST AI RMF)',
            'Guía de UX/UI centrada en el humano (principios ISO 9241-110)',
            'Especificación de automatizaciones RPA priorizadas por esfuerzo/impacto',
            'Programa de gestión del cambio para adopción sin resistencia',
        ],
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
        descriptionLong: 'Con el diagnóstico y el diseño de procesos claros, construimos la solución digital a tu medida. Trabajamos en sprints ágiles (Scrum), lo que significa que tienes versiones funcionales cada 2 semanas y puedes ajustar el rumbo en tiempo real. Desde prototipos validados hasta plataformas cloud escalables, garantizamos que cada línea de código está alineada con tus procesos y estrategia.',
        outcomes: [
            'Prototipo funcional validado con usuarios reales en las primeras 4 semanas',
            'Arquitectura de solución en capas documentada (front, lógica, IA, datos)',
            'Integraciones con tus sistemas actuales (ERP, CRM, herramientas SaaS)',
            'Dashboard de seguimiento del proyecto en tiempo real',
            'Código documentado, testeado y con cobertura de casos críticos',
            'Entrega final con capacitación técnica y documentación de arquitectura',
        ],
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
        descriptionLong: 'Un buen software fracasa si la implementación no está bien gestionada. Seguimos un plan de 12 semanas estructurado en 6 fases: configuración, migración de datos, capacitación, pruebas de aceptación (UAT), go-live y estabilización. Aplicamos el modelo de 8 pasos de Kotter para gestionar el cambio organizacional y garantizar que tu equipo adopte la solución con convicción y eficiencia.',
        outcomes: [
            'Cronograma de implementación detallado (12 semanas) con hitos medibles',
            'Plan de migración de datos con auditoría y validación de integridad',
            'Módulos de capacitación por rol (presencial o virtual)',
            'Pruebas UAT documentadas y aprobadas por usuarios clave',
            'Go-live sin interrupciones del negocio (ventana nocturna de cutover)',
            'Soporte intensivo post-lanzamiento durante las primeras 4 semanas',
        ],
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
        descriptionLong: 'El lanzamiento no es el final: es el comienzo. Implementamos un ciclo PDCA (Planificar-Ejecutar-Verificar-Actuar) mensual para monitorear tus KPIs en tiempo real, detectar desviaciones antes de que se conviertan en problemas y aplicar mejoras iterativas. Con un retainer mensual, tienes un equipo dedicado a que tu solución siempre opere en su punto óptimo y evolucione con las necesidades de tu negocio.',
        outcomes: [
            'Dashboard de KPIs personalizado con tus indicadores de negocio clave',
            'Ciclo PDCA mensual documentado con plan de mejora continua',
            'Alertas proactivas y resolución de incidencias con SLA garantizado',
            'Informe mensual de rendimiento con análisis de tendencias',
            'Actualizaciones de seguridad, rendimiento y funcionalidad programadas',
            'Backlog priorizado de mejoras evolutivas del sistema',
        ],
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
