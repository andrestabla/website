import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateChatWithAI } from '../_lib/ai.js'
import { prisma } from '../_lib/prisma.js'
import { getGeoFromRequest, safeString } from '../_lib/analytics.js'
import { METHODOLOGY_KB } from '../_lib/methodology.js'

export const maxDuration = 30

const AGENT_NAME = 'Atenea'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body || {}
    const mode = body.mode === 'tecnico' ? 'tecnico' : 'simple'
    const rawMessages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []

    const messages = rawMessages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
      .slice(-10)

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Falta el mensaje del usuario' })
    }

    const toneInstruction =
      mode === 'tecnico'
        ? 'El usuario pidió una explicación TÉCNICA: usa el vocabulario preciso de la metodología (DQ/AIQ, dimensiones MD-IA, BPMN, horizontes H1/H2/H3, ponderaciones) y sé riguroso.'
        : 'El usuario pidió una explicación SIMPLE: usa lenguaje claro de negocio, sin tecnicismos innecesarios, con analogías si ayudan.'

    const system = `Eres ${AGENT_NAME}, la agente de transformación digital de AlgoritmoT. Respondes dudas de visitantes sobre la metodología y el servicio de transformación digital de AlgoritmoT.

Reglas:
- Responde en español, en primera persona, de forma cercana y profesional.
- Básate ÚNICAMENTE en la base de conocimiento de AlgoritmoT que está abajo. Si te preguntan algo fuera de ese alcance, dilo con honestidad y reconduce hacia cómo AlgoritmoT podría ayudar (sugiere agendar un diagnóstico).
- Sé concreta y breve (2-5 frases salvo que pidan más detalle). Usa viñetas solo si aportan claridad.
- Escribe en español natural; evita clichés y muletillas de IA (no uses frases como "en la era digital", "desbloquear el potencial", "sin fisuras", "robusto", "aprovechar el poder de", ni rayas decorativas).
- No inventes cifras ni prometas resultados garantizados; la inversión y los puntajes del simulador son referenciales y se precisan tras el diagnóstico.
- ${toneInstruction}

=== BASE DE CONOCIMIENTO (Metodología AlgoritmoT) ===
${METHODOLOGY_KB}
=== FIN BASE DE CONOCIMIENTO ===`

    const { text, providerUsed } = await generateChatWithAI({
      system,
      messages,
      temperature: 0.4,
      maxTokens: 700,
    })

    try {
      const geo = getGeoFromRequest(req)
      await prisma.analyticsEvent.create({
        data: {
          visitorId: safeString(body.visitorId, 120) || 'simulador',
          sessionId: safeString(body.sessionId, 120),
          eventType: 'simulator_chat',
          path: '/empresas/simulador',
          pageTitle: 'Simulador de Transformación Digital',
          sectionId: 'simulador-chat',
          country: geo.country,
          region: geo.region,
          city: geo.city,
          metadata: {
            mode,
            question: messages[messages.length - 1].content.slice(0, 400),
            providerUsed: safeString(providerUsed, 80),
          },
        },
      } as any)
    } catch (analyticsError) {
      console.error('simulator chat analytics log failed', analyticsError)
    }

    return res.status(200).json({ success: true, reply: text, providerUsed })
  } catch (error: any) {
    console.error('simulator/chat API Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
