import { biSessionState } from '../_lib/bi-auth.js'
import { runBiAgent } from '../_lib/bi-agent.js'

type VercelRequest = any
type VercelResponse = any

export const maxDuration = 60

type ChatMessage = { role: 'user' | 'assistant'; content: string }

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
      ? '\n\n=== ARCHIVOS ADJUNTOS DEL USUARIO (prioridad 2, después de la base de datos) ===\n' +
        attachments
          .map((a) => {
            const name = String(a?.name || 'archivo')
            const text = typeof a?.text === 'string' ? a.text.slice(0, 12000) : ''
            return text ? `--- ${name} ---\n${text}` : `--- ${name} --- (adjuntado; sin texto extraíble en esta versión)`
          })
          .join('\n\n') +
        '\n=== FIN DE ARCHIVOS ==='
      : ''

    const webAccess = !!body.webAccess

    const system = `Eres el copiloto de investigación y análisis de Algoritmo BI. Tienes ACCESO EN VIVO a la base de datos real de la plataforma sobre educación superior y mercado laboral en Colombia, mediante herramientas. NUNCA digas que "no tienes acceso a bases de datos" ni des una guía genérica de cómo buscar: SÍ tienes los datos, consúltalos con las herramientas.

ORDEN DE PRIORIDAD DE FUENTES (obligatorio):
1) BASE DE DATOS de la plataforma — usa SIEMPRE las herramientas antes que el conocimiento general:
   • consultar_oferta_educativa — SNIES/MEN: programas, instituciones, áreas, departamentos, sector, nivel, modalidad (27.005 programas, 361 IES).
   • consultar_empleabilidad — OLE: vinculación formal, empleabilidad, ingreso, atractivo por área/departamento.
   • consultar_recomendaciones — programas a ofertar por región/departamento.
   • consultar_pertinencia — brechas oferta↔demanda por departamento.
   • consultar_matricula — SNIES: estudiantes matriculados 2015–2021 (2021: 2.448.271), por departamento/área/nivel/género/metodología/sector y top de programas e IES.
   • consultar_desercion — SPADIES/SNIES 2019–2024: tasa de deserción anual (2023 oficial: 8,97%; matrícula 2023: 2.475.833 y 2024: 2.553.560), cohortes, desgloses por departamento/área/nivel/programa y prioridad de intervención territorial (los desgloses son estimaciones analíticas calibradas: acláralo al citarlos).
2) ARCHIVOS adjuntos por el usuario.
3) BÚSQUEDA WEB (buscar_web)${webAccess ? ' — habilitada' : ' — NO habilitada en este mensaje'}: solo si el dato no está en la plataforma ni en los archivos.

CÓMO RESPONDER:
- Antes de responder cualquier pregunta sobre oferta, empleabilidad, pertinencia o recomendaciones, LLAMA a la herramienta correspondiente y usa sus cifras reales.
- Ejemplo: "¿qué universidades ofertan Administración de Empresas?" → consultar_oferta_educativa({ programa: "Administración de Empresas", agrupar_por: "institucion", limite: 60 }) y LISTA las instituciones con sus conteos y totales.
- Sé muy detallado y accionable: cifras concretas, rankings, listas y TABLAS en Markdown; añade contexto (totales, participación %, comparativas) y conclusiones.
- No inventes datos que la herramienta no devolvió; si algo no está, dilo y sugiere qué otra consulta lo resolvería.
- Responde en español, en Markdown editorial (## títulos, listas, **negritas**, tablas).

GRÁFICAS: cuando el usuario pida graficar/visualizar, o cuando una gráfica ayude a entender, INCLUYE una o VARIAS gráficas emitiendo bloques cercados \`\`\`chart con un JSON (además del texto/tabla). En informes largos, intercala varias gráficas junto a las secciones donde aporten (una por hallazgo clave). Usa SIEMPRE datos reales de las herramientas. Formatos:
- Barras/ranking/composición: \`\`\`chart
{"type":"barh","title":"Instituciones con más programas","data":[{"label":"Universidad X","value":20},{"label":"Universidad Y","value":15}]}
\`\`\`  (type: "barh" horizontal —ideal para rankings largos—, "bar" vertical, "donut" o "pie" para participación).
- Series temporales: \`\`\`chart
{"type":"line","title":"Evolución","x":["2021","2022","2023"],"series":[{"name":"Vinculación %","data":[70,73,75]}]}
\`\`\`
Limita a ~20 categorías (agrupa el resto si hace falta) y pon títulos claros.${attachBlock}`

    const { reply, toolsUsed } = await runBiAgent({ system, messages, webAccess })
    return res.status(200).json({ ok: true, reply, toolsUsed })
  } catch (error: any) {
    console.error('api/bi/workspace-chat error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Internal server error' })
  }
}
