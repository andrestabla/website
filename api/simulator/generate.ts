import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateJsonWithAI } from '../_lib/ai.js'
import { prisma } from '../_lib/prisma.js'
import { getGeoFromRequest, safeString } from '../_lib/analytics.js'
import {
  SIMULATOR_PHASES,
  SIMULATOR_CURRENCY,
  computeEstimate,
  computeMaturityDiagnostic,
  getHeadcountLabel,
  getMaturityLabel,
  formatUsdRange,
} from '../_lib/simulator.js'

export const maxDuration = 60

const AGENT_NAME = 'Atenea'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body || {}
    const { sector, orgType, headcount, maturity, visitorId, sessionId } = body
    const orgContext = safeString(body.orgContext, 1500) || ''

    if (!sector || !orgType || !headcount || !maturity) {
      return res.status(400).json({ error: 'Faltan datos del simulador (sector, organización, colaboradores o madurez)' })
    }

    const estimate = computeEstimate(headcount, maturity)
    const diagnostic = computeMaturityDiagnostic(sector, maturity)
    const headcountLabel = getHeadcountLabel(headcount)
    const maturityLabel = getMaturityLabel(maturity)

    const diagnosticForPrompt = diagnostic.dimensions
      .map((d) => `  - ${d.name}: ${d.score}/100 (nivel ${d.level}; benchmark industria ${d.benchmark})`)
      .join('\n')

    const phasesForPrompt = SIMULATOR_PHASES.map((phase, i) => {
      const est = estimate.phases[i]
      const money = est.recurring
        ? `${formatUsdRange(est.min, est.max)} / mes (retainer recurrente)`
        : formatUsdRange(est.min, est.max)
      return `Fase ${phase.index} — ${phase.name} (${phase.tagline})
  Descripción base: ${phase.description}
  Métodos: ${phase.methods.join(', ')}
  ${est.basis ? `Base de cálculo: ${est.basis}` : ''}
  Inversión asignada (NO la modifiques): ${money}`
    }).join('\n\n')

    const prompt = `
Eres ${AGENT_NAME}, una agente de IA experta en transformación digital de Algoritmo T. Hablas en PRIMERA PERSONA, te diriges al cliente de forma cercana, consultiva y profesional (trato de "tú"). Eres concreta y contundente, sin relleno.

CONTEXTO DEL CLIENTE (úsalo para personalizar TODO):
- Sector / Industria: ${sector}
- Tipo de organización: ${orgType}
- Tamaño: ${headcountLabel}
- Madurez digital actual: ${maturityLabel}
- Procesos estimados a mapear: ${estimate.processes.min}–${estimate.processes.max}
- Soluciones digitales estimadas: ${estimate.solutions.min}–${estimate.solutions.max}
- Inversión del proyecto (Fases 1–5): ${formatUsdRange(estimate.totalProject.min, estimate.totalProject.max)}
- Retainer mensual (Fase 6): ${formatUsdRange(estimate.monthly.min, estimate.monthly.max)} / mes
- Moneda: ${SIMULATOR_CURRENCY}

DIAGNÓSTICO DE MADUREZ DIGITAL (MD-IA) ya calculado por el sistema (NO cambies los puntajes; DQ=${diagnostic.dq}, AIQ=${diagnostic.aiq}):
${diagnosticForPrompt}
${orgContext ? `\nLO QUE EL CLIENTE CONTÓ SOBRE SU ORGANIZACIÓN (misión, a qué se dedica, sitio web — úsalo para personalizar TODO):\n"""${orgContext}"""` : ''}

LAS 6 FASES (con su inversión YA asignada por el sistema, NO inventes montos):
${phasesForPrompt}

OBJETIVO:
Construye una propuesta de transformación digital ACUMULATIVA, MUY ESPECÍFICA para este cliente (sector "${sector}", ${headcountLabel}, madurez "${maturityLabel}"). La profundidad importa: para CADA fase explica con detalle qué se hace, cómo se hace y qué productos concretos quedarían para ESTA organización.

Para CADA una de las 6 fases (en el mismo orden e ids) genera:
- "whatWeDo": 2-3 frases que expliquen QUÉ se hace en esta fase para este cliente concreto.
- "howWeDo": 2-3 frases que expliquen CÓMO se hace (método, herramientas, marcos), aterrizado a su contexto.
- "interventions": 3 a 5 intervenciones/actividades de consultoría concretas para este sector.
- "products": 3 a 5 EJEMPLOS de productos/entregables específicos y tangibles que quedarían para esta organización (nómbralos como si ya existieran para este cliente; específicos del sector, no genéricos).
- "kpi": 1 métrica de impacto realista para esta fase en este sector.
- "rationale": 1 frase que justifique la inversión de esta fase para este cliente.
- "agentNote": 1 frase breve en PRIMERA PERSONA tuya (${AGENT_NAME}) comentando esta fase al cliente.

Consideraciones especiales:
- En la Fase 2 (Mapeo), refiérete explícitamente a los ${estimate.processes.min}–${estimate.processes.max} procesos estimados.
- En la Fase 4 (Diseño y Desarrollo), refiérete a las ${estimate.solutions.min}–${estimate.solutions.max} soluciones digitales y su alcance técnico.
- Si la madurez es "Inicial", enfatiza más base/documentación; si es "Consolidado", enfatiza optimización avanzada e IA.

Además genera:
- "agentName": "${AGENT_NAME}".
- "agentIntro": un saludo en primera persona (2-3 frases) donde te presentas, reconoces su contexto (sector, tamaño, madurez) y resumes la oportunidad de transformación.
- "headline": un título de propuesta atractivo y específico para este cliente.
- "executiveSummary": 2-3 frases que resuman la oportunidad para este sector, tamaño y madurez.
- "diagnostic": objeto del Diagnóstico de Madurez Digital con:
    - "summary": 2-3 frases interpretando el resultado global (DQ ${diagnostic.dq}, AIQ ${diagnostic.aiq}) para este sector.
    - "dimensions": array con una entrada por dimensión { "id": "...", "interpretation": "1 frase específica del sector según su nivel y la brecha vs el benchmark" }. Usa estos ids en orden: ${diagnostic.dimensions.map((d) => d.id).join(', ')}.

RESTRICCIONES:
- Responde en español natural y profesional. Evita clichés y muletillas de IA: no uses frases como "en la era digital", "desbloquear el potencial", "sin fisuras", "robusto", "de vanguardia", "aprovechar el poder de", ni rayas decorativas (—). Escribe como un consultor humano: concreto, directo y específico.
- NO inventes ni cambies cifras de inversión: ya están asignadas por el sistema.
- Específico del cliente, sin relleno genérico.
- Respuesta en JSON PURO con esta estructura EXACTA:
{
  "agentName": "${AGENT_NAME}",
  "agentIntro": "...",
  "headline": "...",
  "executiveSummary": "...",
  "diagnostic": { "summary": "...", "dimensions": [ { "id": "estrategia", "interpretation": "..." } ] },
  "phases": [
    { "id": "adn", "whatWeDo": "...", "howWeDo": "...", "interventions": ["..."], "products": ["..."], "kpi": "...", "rationale": "...", "agentNote": "..." },
    { "id": "bpmn", "whatWeDo": "...", "howWeDo": "...", "interventions": ["..."], "products": ["..."], "kpi": "...", "rationale": "...", "agentNote": "..." },
    { "id": "sociotecnico", "whatWeDo": "...", "howWeDo": "...", "interventions": ["..."], "products": ["..."], "kpi": "...", "rationale": "...", "agentNote": "..." },
    { "id": "desarrollo", "whatWeDo": "...", "howWeDo": "...", "interventions": ["..."], "products": ["..."], "kpi": "...", "rationale": "...", "agentNote": "..." },
    { "id": "implementacion", "whatWeDo": "...", "howWeDo": "...", "interventions": ["..."], "products": ["..."], "kpi": "...", "rationale": "...", "agentNote": "..." },
    { "id": "mejora", "whatWeDo": "...", "howWeDo": "...", "interventions": ["..."], "products": ["..."], "kpi": "...", "rationale": "...", "agentNote": "..." }
  ]
}
`

    const { data, providerUsed } = await generateJsonWithAI({
      prompt,
      temperature: 0.6,
      maxTokens: 4200,
    })

    const aiPhases: Record<string, any> = {}
    if (Array.isArray(data?.phases)) {
      for (const p of data.phases) {
        if (p && typeof p.id === 'string') aiPhases[p.id] = p
      }
    }

    const toStringArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.map((v) => String(v)).filter(Boolean).slice(0, 6) : []
    const toStr = (value: unknown): string => (typeof value === 'string' ? value : '')

    const phases = SIMULATOR_PHASES.map((phase, i) => {
      const est = estimate.phases[i]
      const ai = aiPhases[phase.id] || {}
      return {
        id: phase.id,
        index: phase.index,
        name: phase.name,
        tagline: phase.tagline,
        description: phase.description,
        methods: phase.methods,
        investment: { min: est.min, max: est.max },
        recurring: !!est.recurring,
        period: est.period || null,
        basis: est.basis || null,
        whatWeDo: toStr(ai.whatWeDo),
        howWeDo: toStr(ai.howWeDo),
        interventions: toStringArray(ai.interventions),
        products: toStringArray(ai.products),
        kpi: toStr(ai.kpi),
        rationale: toStr(ai.rationale),
        agentNote: toStr(ai.agentNote),
      }
    })

    const aiDiagDims: Record<string, string> = {}
    if (data?.diagnostic && Array.isArray(data.diagnostic.dimensions)) {
      for (const d of data.diagnostic.dimensions) {
        if (d && typeof d.id === 'string') aiDiagDims[d.id] = toStr(d.interpretation)
      }
    }
    const diagnosticOut = {
      dq: diagnostic.dq,
      aiq: diagnostic.aiq,
      summary: toStr(data?.diagnostic?.summary),
      dimensions: diagnostic.dimensions.map((d) => ({
        id: d.id,
        name: d.name,
        score: d.score,
        benchmark: d.benchmark,
        level: d.level,
        interpretation: aiDiagDims[d.id] || '',
      })),
    }

    const proposal = {
      agentName: toStr(data?.agentName) || AGENT_NAME,
      agentIntro: toStr(data?.agentIntro),
      headline: toStr(data?.headline) || `Transformación digital para ${sector}`,
      executiveSummary: toStr(data?.executiveSummary),
      diagnostic: diagnosticOut,
      currency: SIMULATOR_CURRENCY,
      sector,
      orgType,
      headcount,
      maturity,
      orgContext,
      processes: estimate.processes,
      solutions: estimate.solutions,
      totalProject: estimate.totalProject,
      monthly: estimate.monthly,
      total: estimate.totalProject,
      phases,
    }

    let runId: string | null = null
    try {
      const geo = getGeoFromRequest(req)
      const run = await prisma.simulatorRun.create({
        data: {
          visitorId: safeString(visitorId, 120) || 'simulador',
          sessionId: safeString(sessionId, 120),
          sector: safeString(sector, 160) || 'No definido',
          orgType: safeString(orgType, 120) || 'No definido',
          headcount: safeString(headcount, 40) || 'No definido',
          maturity: safeString(maturity, 40),
          orgContext: orgContext || null,
          proposal: proposal as any,
          headline: safeString(proposal.headline, 240),
          investmentMin: estimate.totalProject.min,
          investmentMax: estimate.totalProject.max,
          currency: SIMULATOR_CURRENCY,
          providerUsed: safeString(providerUsed, 80),
          status: 'completed',
          country: geo.country,
          region: geo.region,
          city: geo.city,
        } as any,
      })
      runId = run.id
    } catch (persistError) {
      console.error('simulator generate persist failed', persistError)
    }

    try {
      const geo = getGeoFromRequest(req)
      await prisma.analyticsEvent.create({
        data: {
          visitorId: safeString(visitorId, 120) || 'simulador',
          sessionId: safeString(sessionId, 120),
          eventType: 'simulator_completed',
          path: '/empresas/simulador',
          pageTitle: 'Simulador de Transformación Digital',
          sectionId: 'simulador',
          country: geo.country,
          region: geo.region,
          city: geo.city,
          metadata: {
            runId,
            sector: safeString(sector, 160),
            orgType: safeString(orgType, 120),
            headcount: safeString(headcount, 40),
            maturity: safeString(maturity, 40),
            investmentMin: estimate.totalProject.min,
            investmentMax: estimate.totalProject.max,
            providerUsed: safeString(providerUsed, 80),
          },
        },
      } as any)
    } catch (analyticsError) {
      console.error('simulator generate analytics log failed', analyticsError)
    }

    return res.status(200).json({ success: true, runId, proposal, providerUsed })
  } catch (error: any) {
    console.error('simulator/generate API Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
