import { biSessionState } from '../_lib/bi-auth.js'
import { generateChatWithAI } from '../_lib/ai.js'

type VercelRequest = any
type VercelResponse = any

export const maxDuration = 60

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const KNOWLEDGE_BASE = `Base de conocimiento de Algoritmo BI (educación superior de Colombia). Datos disponibles en la plataforma:
- Oferta educativa (MEN/SNIES): 27.005 programas registrados (14.644 vigentes), 361 IES, 33 departamentos, 8 áreas de conocimiento; distribución por sector, nivel académico/formación, modalidad, municipio.
- Empleabilidad (OLE/MEN · SNIES · DANE-GEIH): vinculación formal, empleabilidad, ingreso mediano y atractivo laboral por área de conocimiento y departamento (2021–2025).
- Competencias y prospectiva (BID · OIT · CEPAL): 82 competencias, 18 países LATAM, competencias emergentes, reskilling, vacío formativo.
- Mercado laboral (DANE): desocupación, informalidad y ocupación por departamento.
- Análisis regional: pertinencia territorial (oferta↔demanda por departamento y disciplina), demanda potencial por cohortes (2021–2026) y recomendación de programas por región/departamento.`

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
    const rawMessages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []
    const messages = rawMessages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 8000) }))
      .slice(-16)
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ ok: false, error: 'Falta el mensaje del usuario' })
    }

    const attachments: Array<{ name?: string; text?: string }> = Array.isArray(body.attachments) ? body.attachments : []
    const attachBlock = attachments.length
      ? '\n\n=== ARCHIVOS ADJUNTOS DEL USUARIO ===\n' +
        attachments
          .map((a) => {
            const name = String(a?.name || 'archivo')
            const text = typeof a?.text === 'string' ? a.text.slice(0, 12000) : ''
            return text
              ? `--- ${name} ---\n${text}`
              : `--- ${name} --- (adjuntado; sin texto extraíble en esta versión)`
          })
          .join('\n\n') +
        '\n=== FIN DE ARCHIVOS ==='
      : ''

    const webNote = body.webAccess
      ? '\n\nEl usuario activó "acceso a Internet", pero la búsqueda web aún no está habilitada; indícalo si te piden datos externos y trabaja con la base de conocimiento y los archivos.'
      : ''

    const system = `Eres el copiloto de investigación y análisis de Algoritmo BI. Ayudas a directivos y analistas a producir informes y productos académicos de calidad (diagnósticos, hojas de ruta, propuestas de programas, análisis de pertinencia) sobre la educación superior y el mercado laboral en Colombia.

Reglas:
- Responde en español, con rigor y estructura. Cuando produzcas un documento, usa Markdown (títulos ##, listas, tablas, negritas) para que se vea como un informe editorial.
- Apóyate en la base de conocimiento de la plataforma y en los archivos adjuntos del usuario. No inventes cifras: si un dato no está disponible, dilo y explica cómo obtenerlo.
- Sé accionable: entrega conclusiones, prioridades y recomendaciones, no solo descripciones.
- Evita muletillas de IA y relleno.

=== BASE DE CONOCIMIENTO ===
${KNOWLEDGE_BASE}
=== FIN BASE DE CONOCIMIENTO ===${attachBlock}${webNote}`

    const { text, providerUsed } = await generateChatWithAI({
      system,
      messages,
      provider: 'auto',
      temperature: 0.5,
      maxTokens: 2000,
    })
    return res.status(200).json({ ok: true, reply: text, providerUsed })
  } catch (error: any) {
    console.error('api/bi/workspace-chat error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Internal server error' })
  }
}
