import "dotenv/config";
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    // Clear existing data
    await prisma.hero.deleteMany()
    await prisma.service.deleteMany()
    await prisma.product.deleteMany()
    await prisma.siteConfig.deleteMany()

    // Seed Hero
    await prisma.hero.create({
        data: {
            title: "Digital Mastery para Organizacionales del Mañana",
            subtitle: "Elevamos tu madurez digital combinando intensidad tecnológica con capacidad de gestión humana.",
            highlight: "Industria 5.0",
            cta: "Iniciar Transformación",
            secondaryCta: "Ver Servicios",
        }
    })

    // Seed Services
    const services = [
        {
            order: 1,
            title: "Captura del ADN",
            description: "Consultoría estratégica para mapear el modelo de negocio y procesos antes de digitalizar.",
            icon: "Fingerprint",
            features: ["Value Proposition Canvas", "Diagnóstico de Madurez", "Mapeo de Promesa"],
            cta: "Solicitar Diagnóstico",
        },
        {
            order: 2,
            title: "Mapeo de Procesos",
            description: "Optimizamos flujos de trabajo con BPMN 2.x para eliminar ineficiencias y automatizar con inteligencia.",
            icon: "Workflow",
            features: ["BPMN 2.x Standard", "Process Mining", "Value Stream Mapping"],
            cta: "Optimizar Procesos",
        },
        {
            order: 3,
            title: "Decisión Humano vs Tech",
            description: "Diseñamos una distribución socio-técnica: qué automatizar y dónde priorizar el talento humano.",
            icon: "BrainCircuit",
            features: ["Diseño Humano-Céntrico", "IA Responsable", "Matriz Human-Tech"],
            cta: "Balancear Mi Equipo",
        },
        {
            order: 4,
            title: "Diseño y Desarrollo",
            description: "Construimos soluciones personalizadas, desde prototipos rápidos hasta productos finales funcionales.",
            icon: "Layout",
            features: ["Metodologías Ágiles", "Integración Cloud/IA", "Arquitectura de Datos"],
            cta: "Construir Solución",
        },
        {
            order: 5,
            title: "Implementación",
            description: "Despliegue integral con acompañamiento humano para asegurar una adopción sin fricciones.",
            icon: "Rocket",
            features: ["Capacitación de Usuarios", "Migración de Datos", "Soporte Post-Lanzamiento"],
            cta: "Programar Lanzamiento",
        },
        {
            order: 6,
            title: "Seguimiento y Mejora",
            description: "Optimización constante (SLA/SLO) para mantener la resiliencia y el valor a largo plazo.",
            icon: "BarChart3",
            features: ["Ciclo PDCA", "Dashboards KPI", "Gestión de Conocimiento"],
            cta: "Ver Métricas",
        },
    ]

    for (const s of services) {
        await prisma.service.create({ data: s })
    }

    // Seed Products
    const products = [
        {
            order: 1,
            title: "Diagnóstico MD-IA",
            description: "Evaluación integral de madurez digital y de IA con hoja de ruta priorizada.",
            price: "Consultar Presupuesto",
            icon: "ShieldCheck",
        },
        {
            order: 2,
            title: "Prototipo MVP",
            description: "Validación de idea en 4 semanas con un prototipo funcional integrado.",
            price: "Entrega Rápida",
            icon: "Cpu",
        },
        {
            order: 3,
            title: "Retainer de Mejora",
            description: "Soporte y evolución continua mensual para tus soluciones digitales.",
            price: "Suscripción Mensual",
            icon: "UserCheck",
        },
    ]

    for (const p of products) {
        await prisma.product.create({ data: p })
    }

    // Seed Site Config
    await prisma.siteConfig.create({
        data: {
            name: "AlgoritmoT",
            description: "Liderando la Transformación Digital y la Madurez de IA con un enfoque humano-céntrico (Industria 5.0).",
            url: "https://algoritmot.com",
            email: "hola@algoritmot.com",
            address: "Bogotá, Colombia",
            linkedin: "https://linkedin.com/company/algoritmot",
        }
    })

    console.log('Seed completed successfully')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
