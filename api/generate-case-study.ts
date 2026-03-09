import { generateJsonWithAI } from './_lib/ai.js'

export const config = {
    runtime: 'edge',
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    }

    try {
        const body = await req.json()
        const { industry, processName, maturity } = body

        if (!industry || !processName || !maturity) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
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
            temperature: 0.7, // slightly more creative for storytelling
            maxTokens: 1000,
        })

        return new Response(JSON.stringify({ success: true, caseStudy: data, providerUsed }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('generate-case-study API Error:', error)
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 })
    }
}
