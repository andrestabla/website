import { biSessionState } from '../_lib/bi-auth.js'
import { generateChatWithAI } from '../_lib/ai.js'

type VercelRequest = any
type VercelResponse = any

export const maxDuration = 30

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const SECTION_CONTEXT: Record<string, string> = {
  oferta:
    'Observatorio de oferta educativa. Fuente: MEN / SNIES (registro calificado de programas de educación superior). Cubre programas, instituciones (IES), niveles académicos y de formación, modalidades, áreas de conocimiento y distribución geográfica (departamentos, municipios, regiones).',
  laboral:
    'Observatorio laboral y de empleabilidad. Fuentes: prospectiva de competencias LATAM, Observatorio Laboral para la Educación (OLE), OIT y DANE. Cubre demanda de competencias (IA, digital, verde, blandas), empleabilidad y vinculación formal de graduados, ingresos, reskilling y mercado laboral (desocupación, informalidad, ocupación).',
  regional:
    'Análisis regional histórico y prospectivo. Cruza oferta (SNIES) con demanda territorial. Cubre pertinencia territorial (matriz oferta↔demanda por departamento y disciplina), demanda potencial por cohortes, y recomendación de programas por región/departamento. Varias cifras son índices modelados o estimaciones prospectivas.',
  workspace: 'Workspace analítico de Algoritmo BI.',
}

function buildSystem(sectionKey: string, block?: { title?: string; hint?: string; digest?: string }): string {
  const sectionInfo = SECTION_CONTEXT[sectionKey] || 'Plataforma de inteligencia de negocio de Algoritmo BI sobre educación superior en Colombia.'
  const blockBlock =
    block && (block.title || block.digest)
      ? `\n\n=== BLOQUE SEÑALADO POR EL USUARIO ===
Título: ${block.title || '(sin título)'}${block.hint ? `\nDescripción: ${block.hint}` : ''}${
          block.digest ? `\nDatos que muestra (etiqueta: valor):\n${block.digest}` : '\n(Este bloque no expone datos numéricos directos; interpreta a partir del título y la descripción.)'
        }
=== FIN DEL BLOQUE ===`
      : ''

  return `Eres BIA, el asistente analítico de Algoritmo BI. Ayudas a analistas y directivos a interpretar tableros de datos sobre la educación superior y el mercado laboral en Colombia.

SECCIÓN ACTUAL: ${sectionInfo}

Reglas:
- Responde en español, de forma clara, profesional y directa.
- Sé conciso: 3 a 6 frases o viñetas breves. Prioriza el insight sobre la descripción literal.
- Al interpretar un bloque, explica (1) qué muestra, (2) el patrón o hallazgo relevante (concentración, brecha, tendencia, líderes/rezagados) y (3) una lectura útil o advertencia para decidir.
- Usa ÚNICAMENTE los datos del bloque señalado y el contexto de la sección; puedes aportar conocimiento general del dominio, pero NO inventes cifras que no estén en los datos.
- Cuando cites números, tómalos de los datos provistos. Señala cuando un indicador sea modelado, estimado o prospectivo.
- Escribe en español natural; evita clichés y muletillas de IA (nada de "en la era digital", "desbloquear el potencial", "sin fisuras", "robusto", ni rayas decorativas).
- Si te preguntan algo fuera de los datos disponibles, dilo con honestidad y sugiere qué otro bloque o filtro podría responderlo.${blockBlock}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const { session, allowed } = biSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Unauthenticated' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'No BI access' })

  try {
    const body = req.body || {}
    const sectionKey = String(body.section || '').toLowerCase().trim() || 'workspace'
    const block =
      body.block && typeof body.block === 'object'
        ? {
            title: String(body.block.title || '').slice(0, 200),
            hint: String(body.block.hint || '').slice(0, 400),
            digest: String(body.block.digest || '').slice(0, 6000),
          }
        : undefined

    const rawMessages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []
    const messages = rawMessages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 3000) }))
      .slice(-12)

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ ok: false, error: 'Falta el mensaje del usuario' })
    }

    const system = buildSystem(sectionKey, block)
    const { text, providerUsed } = await generateChatWithAI({
      system,
      messages,
      provider: 'auto',
      temperature: 0.4,
      maxTokens: 700,
    })

    return res.status(200).json({ ok: true, reply: text, providerUsed })
  } catch (error: any) {
    console.error('api/bi/assistant error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Internal server error' })
  }
}
