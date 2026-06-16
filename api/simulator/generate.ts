import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateJsonWithAI } from '../_lib/ai.js'
import { prisma } from '../_lib/prisma.js'
import { getGeoFromRequest, safeString } from '../_lib/analytics.js'
import {
  SIMULATOR_PHASES,
  SIMULATOR_CURRENCY,
  computeInvestment,
  getHeadcountLabel,
  formatUsdRange,
} from '../_lib/simulator.js'

export const maxDuration = 60

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body || {}
    const { sector, orgType, headcount, visitorId, sessionId } = body

    if (!sector || !orgType || !headcount) {
      return res.status(400).json({ error: 'Faltan datos del simulador (sector, tipo de organización o colaboradores)' })
    }

    const investment = computeInvestment(headcount)
    const headcountLabel = getHeadcountLabel(headcount)

    const phasesForPrompt = SIMULATOR_PHASES.map((phase, i) => {
      const inv = investment.phases[i]
      return `Fase ${phase.index} — ${phase.name} (${phase.tagline})
  Descripción: ${phase.description}
  Métodos: ${phase.methods.join(', ')}
  Inversión asignada (NO la modifiques, úsala como referencia): ${formatUsdRange(inv.min, inv.max)}`
    }).join('\n\n')

    const prompt = `
Eres un consultor senior de transformación digital de Algoritmo T. Tu tono es experto, directo y contundente, pero claro para una audiencia de negocio.

CONTEXTO DEL CLIENTE:
- Sector / Industria: ${sector}
- Tipo de organización: ${orgType}
- Tamaño (colaboradores): ${headcountLabel}
- Moneda de la simulación: ${SIMULATOR_CURRENCY}
- Inversión total estimada de la transformación completa: ${formatUsdRange(investment.total.min, investment.total.max)}

LAS 6 FASES (con su inversión ya asignada por el sistema, NO inventes montos):
${phasesForPrompt}

OBJETIVO:
Personaliza una propuesta de transformación digital ACUMULATIVA para este cliente. Para CADA una de las 6 fases (en el mismo orden e ids) genera contenido específico para el sector "${sector}" y una organización de ${headcountLabel}:
- "interventions": 3 a 4 intervenciones o actividades de consultoría concretas que Algoritmo T realizaría en esa fase para este sector.
- "products": 3 a 4 ejemplos de productos/entregables tangibles que el cliente obtendría en esa fase (específicos del sector, no genéricos).
- "rationale": 1 frase que justifique por qué la inversión de esa fase tiene sentido para este cliente.
- "kpi": 1 métrica de impacto esperada y realista para esa fase en este sector (ej. "-40% en tiempo de ciclo").

Además genera:
- "headline": un título de propuesta atractivo y específico para este cliente.
- "executiveSummary": 2-3 frases que resuman la oportunidad de transformación digital para este sector y tamaño.

RESTRICCIONES:
- Responde en español.
- NO inventes ni cambies cifras de inversión: ya están asignadas por el sistema.
- Específico del sector "${sector}", sin relleno genérico.
- Respuesta en JSON PURO con esta estructura EXACTA:
{
  "headline": "...",
  "executiveSummary": "...",
  "phases": [
    { "id": "adn", "interventions": ["..."], "products": ["..."], "rationale": "...", "kpi": "..." },
    { "id": "bpmn", "interventions": ["..."], "products": ["..."], "rationale": "...", "kpi": "..." },
    { "id": "sociotecnico", "interventions": ["..."], "products": ["..."], "rationale": "...", "kpi": "..." },
    { "id": "desarrollo", "interventions": ["..."], "products": ["..."], "rationale": "...", "kpi": "..." },
    { "id": "implementacion", "interventions": ["..."], "products": ["..."], "rationale": "...", "kpi": "..." },
    { "id": "mejora", "interventions": ["..."], "products": ["..."], "rationale": "...", "kpi": "..." }
  ]
}
`

    const { data, providerUsed } = await generateJsonWithAI({
      prompt,
      temperature: 0.6,
      maxTokens: 2400,
    })

    const aiPhases: Record<string, any> = {}
    if (Array.isArray(data?.phases)) {
      for (const p of data.phases) {
        if (p && typeof p.id === 'string') aiPhases[p.id] = p
      }
    }

    const toStringArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.map((v) => String(v)).filter(Boolean).slice(0, 6) : []

    const phases = SIMULATOR_PHASES.map((phase, i) => {
      const inv = investment.phases[i]
      const ai = aiPhases[phase.id] || {}
      return {
        id: phase.id,
        index: phase.index,
        name: phase.name,
        tagline: phase.tagline,
        description: phase.description,
        methods: phase.methods,
        investment: { min: inv.min, max: inv.max },
        interventions: toStringArray(ai.interventions),
        products: toStringArray(ai.products),
        rationale: typeof ai.rationale === 'string' ? ai.rationale : '',
        kpi: typeof ai.kpi === 'string' ? ai.kpi : '',
      }
    })

    const proposal = {
      headline: typeof data?.headline === 'string' ? data.headline : `Transformación digital para ${sector}`,
      executiveSummary: typeof data?.executiveSummary === 'string' ? data.executiveSummary : '',
      currency: SIMULATOR_CURRENCY,
      total: investment.total,
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
          proposal: proposal as any,
          headline: safeString(proposal.headline, 240),
          investmentMin: investment.total.min,
          investmentMax: investment.total.max,
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
            investmentMin: investment.total.min,
            investmentMax: investment.total.max,
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
