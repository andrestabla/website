import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateJsonWithAI } from './_lib/ai.js'

export const maxDuration = 60; // Allow 60s in production

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const body = req.body || {}
        const { industry, processName, maturity } = body

        if (!industry || !processName || !maturity) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        const prompt = `
Eres un consultor senior y estratega de transformación digital en Algoritmo T. Tu lenguaje debe ser ACADÉMICO, SOBRIO, EMPÍRICO y ESTRUCTURADO. 

RESTRICCIONES CRÍTICAS:
1. PROHIBIDO el lenguaje figurado o metafórico (ej: marea de datos, niebla del fraude, laberinto operativo, torbellino, etc.). Usa términos precisos y descriptivos.
2. EVITA ESTRUCTURAS PREDECIBLES DE IA (ej: "En el dinámico mundo de...", "Entendemos tus desafíos"). 
3. Toda afirmación debe sonar como un informe de consultoría estratégica de alto nivel, con rigor científico y técnico.
4. Soporta tus argumentos con la lógica de optimización de procesos y arquitecturas escalables.
5. Usa un español IMPECABLE y formal, eliminando adjetivos innecesarios o dramáticos.

Contexto del usuario:
- Industria: ${industry}
- Proceso: ${processName}
- Madurez Digital: ${maturity}

TU MISIÓN:
Generar una propuesta técnico-consultiva que proyecte una visión de transformación basada en la metodología de Algoritmo T.

REQUISITOS DEL JSON:
- "title": Título técnico y formal. Evita sensacionalismo.
- "challenge": Describe la ineficiencia operativa o el cuello de botella técnico identificado (50-70 palabras). Usa lenguaje directo y formal.
- "solution": Describe la intervención técnica detallando la arquitectura de sistemas, flujos de integración y protocolos (70-100 palabras). Sé específico (ej: "Implementación de arquitectura orientada a servicios (SOA)", "Orquestación vía Kubernetes", "Protocolos de comunicación balanceados").
- "results": Impacto proyectado en el negocio. DEBES hablar en FUTURO ("La transformación impactará...", "La infraestructura permitirá...", "Se optimizará..."). Habla de indicadores de rendimiento (KPIs) y eficiencia estructural.
- "tangibleProducts": Lista de 3-4 activos técnicos reales (ej: "Pipeline de datos ETL automatizado", "Modelo de inferencia en tiempo real", "Dashboard de telemetría operativa").
- "mermaidDiagram": Crea un diagrama de Mermaid.js (flowchart TD) con ALTO DETALLE TÉCNICO. Representa la arquitectura propuesta: capas de persistencia, lógica de negocio, balanceadores, capas de seguridad y puntos de integración. Asegúrate de que los IDs de los nodos sean cortos y la sintaxis sea perfecta.

Estructura de respuesta (JSON puro):
{
  "title": "...",
  "challenge": "...",
  "solution": "...",
  "results": "...",
  "tangibleProducts": [...],
  "mermaidDiagram": "..."
}
`

        const { data, providerUsed } = await generateJsonWithAI({
            prompt,
            temperature: 0.7, 
            maxTokens: 1500, // Increased maxTokens for diagram and extra fields
        })

        return res.status(200).json({ success: true, caseStudy: data, providerUsed })

    } catch (error: any) {
        console.error('generate-case-study API Error:', error)
        return res.status(500).json({ error: error.message || 'Internal server error' })
    }
}
