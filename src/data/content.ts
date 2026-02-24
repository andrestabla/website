import {
    Fingerprint,
    Workflow,
    BrainCircuit,
    Layout,
    Rocket,
    BarChart3,
    ShieldCheck,
    Cpu,
    UserCheck
} from 'lucide-react'

export const content = {
    hero: {
        title: "Digital Mastery para Organizaciones del Mañana",
        subtitle: "Elevamos tu madurez digital combinando intensidad tecnológica con capacidad de gestión humana.",
        highlight: "Industria 5.0",
        cta: "Iniciar Transformación",
        secondaryCta: "Ver Servicios",
    },
    services: {
        title: "Portafolio de Servicios Digitales",
        subtitle: "Nuestro método sistemático para capturar valor y asegurar la adopción real.",
        items: [
            {
                id: "dna",
                title: "Captura del ADN",
                description: "Consultoría estratégica para mapear el modelo de negocio y procesos antes de digitalizar.",
                icon: Fingerprint,
                features: ["Value Proposition Canvas", "Diagnóstico de Madurez", "Mapeo de Promesa"],
                cta: "Solicitar Diagnóstico",
            },
            {
                id: "processes",
                title: "Mapeo de Procesos",
                description: "Optimizamos flujos de trabajo con BPMN 2.x para eliminar ineficiencias y automatizar con inteligencia.",
                icon: Workflow,
                features: ["BPMN 2.x Standard", "Process Mining", "Value Stream Mapping"],
                cta: "Optimizar Procesos",
            },
            {
                id: "human-tech",
                title: "Decisión Humano vs Tech",
                description: "Diseñamos una distribución socio-técnica: qué automatizar y dónde priorizar el talento humano.",
                icon: BrainCircuit,
                features: ["Diseño Humano-Céntrico", "IA Responsable", "Matriz Human-Tech"],
                cta: "Balancear Mi Equipo",
            },
            {
                id: "solutions",
                title: "Diseño y Desarrollo",
                description: "Construimos soluciones personalizadas, desde prototipos rápidos hasta productos finales funcionales.",
                icon: Layout,
                features: ["Metodologías Ágiles", "Integración Cloud/IA", "Arquitectura de Datos"],
                cta: "Construir Solución",
            },
            {
                id: "implementation",
                title: "Implementación",
                description: "Despliegue integral con acompañamiento humano para asegurar una adopción sin fricciones.",
                icon: Rocket,
                features: ["Capacitación de Usuarios", "Migración de Datos", "Soporte Post-Lanzamiento"],
                cta: "Programar Lanzamiento",
            },
            {
                id: "improvement",
                title: "Seguimiento y Mejora",
                description: "Optimización constante (SLA/SLO) para mantener la resiliencia y el valor a largo plazo.",
                icon: BarChart3,
                features: ["Ciclo PDCA", "Dashboards KPI", "Gestión de Conocimiento"],
                cta: "Ver Métricas",
            },
        ]
    },
    products: {
        title: "Soluciones Empaquetadas",
        items: [
            {
                title: "Diagnóstico MD-IA",
                description: "Evaluación integral de madurez digital y de IA con hoja de ruta priorizada.",
                price: "Consultar Presupuesto",
                icon: ShieldCheck,
            },
            {
                title: "Prototipo MVP",
                description: "Validación de idea en 4 semanas con un prototipo funcional integrado.",
                price: "Entrega Rápida",
                icon: Cpu,
            },
            {
                title: "Retainer de Mejora",
                description: "Soporte y evolución continua mensual para tus soluciones digitales.",
                price: "Suscripción Mensual",
                icon: UserCheck,
            },
        ]
    },
    frameworks: {
        title: "Confianza y Estándares",
        items: [
            {
                name: "Industry 5.0",
                description: "Foco en sostenibilidad, resiliencia y centralidad humana.",
                organization: "UE",
            },
            {
                name: "ISO 9241-210",
                description: "Estándar de diseño centrado en el ser humano.",
                organization: "ISO",
            },
            {
                name: "NIST AI RMF",
                description: "Gestión de riesgos en Inteligencia Artificial.",
                organization: "NIST",
            },
        ]
    }
}
