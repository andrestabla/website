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
Eres un consultor experto de Algoritmo T. Tu tono es académico, directo, simple, pero técnico y contundente.

OBJETIVO:
Generar una propuesta de optimización para el proceso "${processName}" en la industria "${industry}".

REQUISITOS DE CONTENIDO:
1. "title": Optimización de ${processName} en ${industry}.
2. "challenge": (Contexto) Explica en qué consiste el proceso y por qué es necesario intervenirlo digitalmente. Usa un tono positivo y argumentos basados en fuentes referentes del sector.
3. "solution": (Esbozo de propuesta) Explica el proceso, resultado y cómo se aseguraría su implementación, seguimiento y control. 
   DEBES USAR ESTE FORMATO EXACTO: "Podríamos implementar... [detalle técnico] a partir del mapeo y rediseño de... [proceso]. De tal modo que... [resultado]. Para asegurar su implementación haríamos... [acción]. Posteriormente, haríamos seguimiento y control para... [métrica/control]."
4. "results": (Impacto proyectado) Proyecta tres cifras de impacto específicas. Ejemplo: "[cifra de impacto 1], [cifra de impacto 2], [cifra de impacto 3]".
5. "tangibleProducts": Lista de productos generados, teniendo en cuenta los servicios empresariales de Algoritmo T (Ingeniería Humana, Despliegue IA, Madurez Orgánica).
6. "mermaidDiagram": (Arquitectura del proceso propuesta) Esquematiza cómo funcionaría la nueva versión del proceso, destacando exactamente dónde entrarían las tecnologías y cómo contribuirían. Usa Mermaid.js (flowchart TD).

RESTRICCIONES:
- Tono experto y contundente.
- Sin rodeos.
- Respuesta en JSON PURO.

Contexto del usuario:
- Industria: ${industry}
- Proceso: ${processName}
- Madurez Digital: ${maturity}

Estructura:
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
