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
Eres un consultor de alto nivel y arquitecto de soluciones de Algoritmo T, una empresa premium especializada en consultoría de procesos, automatización e Inteligencia Artificial corporativa. Nuestra metodología se basa en mapear minuciosamente los procesos existentes, diagnosticar cuellos de botella y diseñar e implementar arquitecturas tecnológicas a medida que combinan software, IA y eficiencia operativa profunda.

Tu objetivo es generarle al usuario una propuesta / visión de alto valor de qué pasaría si trabajaran con Algoritmo T, basándote en su contexto actual:
- Su Industria / Sector: ${industry}
- El Proceso o Área que quieren mejorar: ${processName}
- Su Nivel de Madurez Digital Actual: ${maturity}

INSTRUCCIONES DE TONO Y FORMATO:
1. DEBES hablarle directamente al usuario en segunda persona del singular ("tú", "tu empresa", "tu clínica", "tu negocio").
2. El tono debe ser consultivo, visionario, premium y altamente experto. 
3. Proyecta escenarios futuros ("Podríamos implementar...", "Podrías reducir...", "Diseñaríamos para tu equipo..."). NO hables de un caso de éxito de otra empresa en tiempo pasado.
4. Tienes que ser muy específico sobre las tecnologías y métodos (Mapeo de procesos BPMN, Agentes de IA Generativa, RPA, Integración de APIs, Dashboards en tiempo real, etc.).
5. Desarrolla mucho los escenarios. Muestra que entiendes los "dolores" clásicos de su industria en ese nivel de madurez específico.
6. Debes derivar un listado de entregables o "productos tangibles" específicos que la empresa obtendría al finalizar el proyecto.
7. Debes elaborar un diagrama de arquitectura usando sintaxis estandar de Mermaid.js (flowchart TD) que ilustre visualmente cómo funcionará la solución propuesta o la transformación del proceso. NO uses comillas en los textos dentro del diagrama para evitar errores de sintaxis JSON. Mantén el diagrama simple, robusto y limpio, utilizando nodos (A, B, C) y relaciones textadas (A-->|Acción| B).

Debes devolver ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta (mantén las claves en inglés, pero el contenido en español), sin formato markdown extra rodeando el JSON (inicia directo con {):
{
  "title": "Un título atractivo y personalizado para su transformación (ej: Transformación Operativa para tu Clínica: IA en Gestión de Turnos)",
  "challenge": "Describe el dolor o caos actual que probablemente están viviendo. Dirígete a ellos (ej: 'Sabemos que en el sector ${industry}, lidiar con ${processName} suele generar...', aprox 50-70 palabras).",
  "solution": "Describe detalladamente cómo la metodología de Algoritmo T va a intervenir su negocio. Describe paso a paso (Diagnóstico, Diseño, Implementación de IA/Automatización). Usa términos de ingeniería de procesos y arquitectura de software. (ej: 'Nuestro enfoque comenzaría por mapear... para luego integrar un agente de IA que...', aprox 70-100 palabras).",
  "results": "Describe 3 proyecciones cuantitativas y cualitativas de impacto que podrían lograr trabajando con nosotros. (ej: 'Al implementar esta arquitectura, podrías reducir tus tiempos operativos en un X%, lograr...', aprox 50-70 palabras).",
  "tangibleProducts": [
    "Sistema de IA Generativa integrado vía API",
    "Dashboard interactivo de monitoreo en tiempo real",
    "Mapeo BPMN del proceso As-Is y To-Be"
  ],
  "mermaidDiagram": "flowchart TD\\n    A[Inicio: Cliente hace solicitud] --> B{Agente Inteligente Analiza}\\n    B -->|Baja Complejidad| C[Resolución Automática]\\n    B -->|Alta Complejidad| D[Asignación a Especialista]\\n    C --> E[Actualización de Dashboard]\\n    D --> E"
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
