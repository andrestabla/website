import { biSessionState } from '../_lib/bi-auth.js'
import { generateChatWithAI } from '../_lib/ai.js'

type VercelRequest = any
type VercelResponse = any

export const maxDuration = 30

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const SECTION_CONTEXT: Record<string, string> = {
  oferta:
    'Observatorio de oferta educativa. Fuente: MEN / SNIES (registro calificado de programas de educación superior). Cubre programas, instituciones (IES), niveles académicos y de formación, modalidades, áreas de conocimiento y distribución geográfica (departamentos, municipios, regiones). Incluye además una pestaña de Matrícula (estudiantes matriculados, SNIES 2015–2024, agregados oficiales filtrables por año/departamento/área/nivel/sector; desgloses 2022–2024 calibrados al total oficial del MEN) y una pestaña de Deserción (SPADIES/SNIES 2019–2024: tasa anual —2023 oficial: 8,97%—, cohortes, mapa territorial y prioridad de intervención; los desgloses territoriales y por área/programa son estimaciones analíticas calibradas con cifras oficiales, no microdatos).',
  laboral:
    'Observatorio laboral y de empleabilidad. Fuentes: prospectiva de competencias LATAM, Observatorio Laboral para la Educación (OLE), OIT y DANE. Cubre demanda de competencias (IA, digital, verde, blandas), empleabilidad y vinculación formal de graduados, ingresos, reskilling y mercado laboral (desocupación, informalidad, ocupación).',
  regional:
    'Análisis regional histórico y prospectivo. Cruza oferta (SNIES) con demanda territorial. Cubre pertinencia territorial (matriz oferta↔demanda por departamento y disciplina), demanda potencial por cohortes, y recomendación de programas por región/departamento. Varias cifras son índices modelados o estimaciones prospectivas.',
  workspace: 'Workspace analítico de Algoritmo BI.',
}

function buildSystem(sectionKey: string, block?: { title?: string; hint?: string; digest?: string }, viewContext?: string): string {
  const sectionInfo = SECTION_CONTEXT[sectionKey] || 'Plataforma de inteligencia de negocio de Algoritmo BI sobre educación superior en Colombia.'
  const hasFilters = !!(viewContext && viewContext.trim())
  const filterBlock = hasFilters
    ? `\n\n=== CONTEXTO ACTUAL DE LA VISTA (filtros y selección activos) ===
${viewContext}
IMPORTANTE: los datos del bloque están CALCULADOS CON ESTOS FILTROS APLICADOS. Interpreta SIEMPRE dentro de ese recorte y menciónalo explícitamente (p. ej. "entre los programas del SENA…", "para el año 2025…", "en la región Caribe…"). NO presentes cifras filtradas como si fueran el total nacional; si el filtro cambia la lectura, dilo.
=== FIN DEL CONTEXTO ===`
    : ''
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
- Responde en español, claro y profesional, en 2–4 párrafos cortos o viñetas (no telegráfico, pero sin relleno). Prioriza el insight.
- Contextualiza SIEMPRE con los filtros/selección activos de la vista: encuadra la lectura en ese recorte y sé explícito al respecto.
- Al interpretar un bloque, cubre: (1) qué muestra en este recorte, (2) el patrón o hallazgo relevante con cifras concretas (líderes, rezagados, concentración, brecha, tendencia, participación %), y (3) una lectura accionable o advertencia para decidir.
- Usa ÚNICAMENTE los datos del bloque y el contexto de la vista; aporta conocimiento del dominio pero NO inventes cifras que no estén en los datos.
- Cuando cites números, tómalos de los datos provistos. Señala si un indicador es modelado, estimado o prospectivo.
- Español natural; evita clichés y muletillas de IA (nada de "en la era digital", "desbloquear el potencial", "sin fisuras", "robusto", ni rayas decorativas).
- Si algo no está en los datos, dilo y sugiere qué otro bloque o filtro lo respondería.${filterBlock}${blockBlock}`
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

    const viewContext = typeof body.context === 'string' ? body.context.slice(0, 1500) : ''

    const rawMessages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []
    const messages = rawMessages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 3000) }))
      .slice(-12)

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ ok: false, error: 'Falta el mensaje del usuario' })
    }

    const system = buildSystem(sectionKey, block, viewContext)
    const { text, providerUsed } = await generateChatWithAI({
      system,
      messages,
      provider: 'auto',
      temperature: 0.4,
      maxTokens: 1100,
    })

    return res.status(200).json({ ok: true, reply: text, providerUsed })
  } catch (error: any) {
    console.error('api/bi/assistant error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Internal server error' })
  }
}
