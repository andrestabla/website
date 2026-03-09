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
Eres un consultor experto de Algoritmo T, una empresa premium especializada en automatización, IA y optimización de procesos.
Genera un caso de éxito ficticio pero altamente realista basado en los siguientes parámetros:
- Industria: ${industry}
- Proceso/Área: ${processName}
- Nivel de Madurez Actual: ${maturity}

El caso de éxito debe demostrar cómo Algoritmo T ayudó a transformar esta situación.
Debes devolver ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta, sin markdown ni texto extra:
{
  "title": "Un título atractivo y corporativo del caso (ej: Transformación Operativa en el sector Finanzas)",
  "challenge": "Describe brevemente el problema inicial o el dolor de la empresa (aprox 40-50 palabras)",
  "solution": "Describe qué hizo Algoritmo T (ej: mapeo de procesos, automatización, IA) para solucionar el problema (aprox 40-50 palabras)",
  "results": "Describe 2 o 3 resultados cuantitativos o cualitativos logrados (ej: reducción de tiempos del X%, visibilidad total) (aprox 40-50 palabras)"
}
`

        const { data, providerUsed } = await generateJsonWithAI({
            prompt,
            temperature: 0.7, 
            maxTokens: 1000,
        })

        return res.status(200).json({ success: true, caseStudy: data, providerUsed })

    } catch (error: any) {
        console.error('generate-case-study API Error:', error)
        return res.status(500).json({ error: error.message || 'Internal server error' })
    }
}
