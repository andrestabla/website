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
Eres un consultor senior y estratega de transformación digital en Algoritmo T. Tu lenguaje debe ser ESPONTÁNEO, EXPERTO y HUMANO. 

CRÍTICO: 
1. EVITA ESTRUCTURAS PREDECIBLES DE IA (ej: "En el dinámico mundo de...", "Como experto en...", "Entendemos tus desafíos"). 
2. NO uses listas con viñetas genéricas en el cuerpo del texto. 
3. Usa un español IMPECABLE, pero con giros lingüísticos propios de una conversación de alto nivel entre humanos (directo, persuasivo, sin rellenos).
4. Sé específico con procedimientos de automatización CONCRETOS (ej: "Sincronización vía webhooks", "Agentes autónomos de LangChain para triaje", "Validación cruzada en bases de datos vectoriales").

Contexto del usuario:
- Industria: ${industry}
- Proceso: ${processName}
- Madurez: ${maturity}

TU MISIÓN:
Imagínate que estás en una reunión privada con el CEO de esta empresa. Proyecta una visión de transformación real usando la metodología de Algoritmo T.

REQUISITOS DEL JSON:
- "title": Título disruptivo, corto y potente.
- "challenge": Describe el caos operativo actual con crudeza y empatía real (50-70 palabras). No uses frases hechas.
- "solution": Describe la intervención técnica y estratégica detalladamente. Habla de arquitectura, integración y flujo de datos (70-100 palabras).
- "results": Impacto tangible en el negocio. Evita porcentajes genéricos, habla de cambios estructurales.
- "tangibleProducts": Lista de 3-4 activos reales que entregamos (ej: "Protocolo de seguridad en Rust", "Infraestructura Cloud agnóstica").
- "mermaidDiagram": Crea un diagrama de Mermaid.js (flowchart TD) que VARIÉ según el proceso. No te limites a un inicio-fin lineal. Usa decisiones complejas, bucles de feedback o capas de servicios (Ej: Capa de Datos --> Capa de Lógica --> Interfaz). Asegúrate de que sea robusto y sin errores de sintaxis.

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
