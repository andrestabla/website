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
Eres un socio consultor de Algoritmo T (Partner-level Digital Strategist). Tu objetivo es generar una propuesta de transformación digital de ALTA PERTINENCIA, RIGOR TÉCNICO y EXHAUSTIVIDAD.

CONTEXTO METODOLÓGICO DE ALGORITMO T (DEBES APLICAR ESTOS MARCOS):
- **Protocolo 01: Ingeniería Humana**: Ciencia de la adopción. Se enfoca en arquitectura cognitiva, diseño de hábitos digitales y redes de influencia interna para reducir la resistencia al cambio (que suele ser del 60-70% en proyectos fallidos).
- **Protocolo 02: Despliegue IA**: Fases de Evaluación de Readiness, Arquitectura de Solución (NIST AI RMF e ISO 42001), Despliegue Controlado (Pilotos medibles) y Sostenibilidad técnica.
- **Protocolo 03: Madurez Orgánica**: Modelo de 5 niveles (Inicial a Optimizado). Dimensiones: Estrategia Coherente, Procesos Vivos (automatización), Datos como Activo y Capacidad de Cambio Continuo.

ESTADÍSTICAS Y BENCHMARKS (ÚSALOS PARA SUSTENTAR EL DESAFÍO):
- Gartner: 80% de las organizaciones que intentan escalar negocios digitales fallarán hasta 2025 por falta de alineación.
- McKinsey: 70% de las transformaciones digitales fallan por cultura y procesos mal diseñados.
- NIST AI RMF: Referente obligado para gobernanza de IA responsable.

REQUISITOS DE CONTENIDO (MÁXIMA EXHAUSTIVIDAD):
1. "title": Título consultivo sofisticado.
2. "challenge": (Extensión: 100-150 palabras). Explica la ineficiencia técnica/operativa específica del proceso "${processName}" en la industria "${industry}". SUSTENTA con datos de mercado (simula o cita benchmarks de Gartner/McKinsey/NIST) y explica por qué el enfoque tradicional falla.
3. "solution": (Extensión: 150-200 palabras). Detalla la intervención bajo la metodología de Algoritmo T. Menciona específicamente cómo aplicarías Protocolo 01 (Ingeniería Humana) para la adopción y Protocolo 02 (Despliegue IA) para la infraestructura. Habla de orquestación, capas de datos, gobernanza y arquitectura técnica detallada.
4. "results": (Extensión: 100-150 palabras). Habla en FUTURO. Proyecta KPIs específicos (ej: reducción de latencia operativa, ROI en <120 días, incremento en la tasa de adopción digital) y cómo esto mueve la empresa en el modelo de Madurez Orgánica.
5. "tangibleProducts": Lista 4 activos de alto valor (ej: "Framework de Gobernanza NIST-aligned", "Pipeline ETL con validación cognitiva", etc.).
6. "mermaidDiagram": Diagrama Mermaid.js (flowchart TD) de ALTA COMPLEJIDAD. Debe mostrar el flujo desde el diagnóstico de readiness hasta la operación escalable, incluyendo bucles de retroalimentación y capas metodológicas de Algoritmo T.

RESTRICCIONES:
- Lenguaje ACADÉMICO, SOBRIO y FORMAL.
- PROHIBIDAS las metáforas (niebla, marea, etc.).
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
