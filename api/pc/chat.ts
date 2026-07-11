import { pcSessionState } from '../_lib/pc-auth.js'
import { prisma } from '../_lib/prisma.js'
import { generateChatWithAI } from '../_lib/ai.js'

type VercelRequest = any
type VercelResponse = any

const db = () => (prisma as any).pcBoard
const shareDb = () => (prisma as any).pcBoardShare

async function hasAccess(board: any, userId: string): Promise<boolean> {
  if (!board) return false
  if (board.ownerId === userId) return true
  const share = await shareDb().findUnique({ where: { boardId_userId: { boardId: board.id, userId } } })
  return !!share
}

/** Serializa el tablero (con metadatos de categorías) como contexto para la IA. */
function serializeBoard(board: any): string {
  const cols: any[] = Array.isArray(board.columns) ? board.columns : []
  const rows: any[] = Array.isArray(board.rows) ? board.rows : []
  const header = cols.map((c) => c.name).join(' | ')
  const lines = rows.slice(0, 150).map((r, i) => `${i + 1} | ` + cols.map((c) => String(r.cells?.[c.id] ?? '').slice(0, 160)).join(' | '))
  const truncated = rows.length > 150 ? `\n(Se muestran 150 de ${rows.length} filas.)` : ''

  let meta = ''
  for (const c of cols) {
    if (c.type === 'select' && Array.isArray(c.optionFields) && c.optionFields.length && Array.isArray(c.options)) {
      const withMeta = c.options.filter((o: any) => o.meta && Object.values(o.meta).some((v) => v))
      if (withMeta.length) {
        meta +=
          `\nMetadatos de la categoría "${c.name}":\n` +
          withMeta
            .map((o: any) => `- ${o.value}: ` + c.optionFields.map((f: any) => `${f.label}=${o.meta?.[f.id] || ''}`).filter((s: string) => !s.endsWith('=')).join(', '))
            .join('\n')
      }
    }
  }

  return `Tablero: ${board.title}\nColumnas: ${header}\nFilas (formato: N | ${header}):\n${lines.join('\n')}${truncated}${meta}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const question = String(body.question || '').slice(0, 2000).trim()
    if (!question) return res.status(400).json({ ok: false, error: 'Pregunta requerida' })

    // Resolver tablero: por sesión (boardId) o por token público
    let board: any = null
    if (body.token) {
      board = await db().findUnique({ where: { shareToken: String(body.token).slice(0, 60) } })
      if (!board || !board.shareEnabled) return res.status(404).json({ ok: false, error: 'Tablero no disponible' })
    } else {
      const { session, allowed } = pcSessionState(req)
      if (!session) return res.status(401).json({ ok: false, error: 'Unauthenticated' })
      if (!allowed) return res.status(403).json({ ok: false, error: 'No Project Control access' })
      const boardId = String(body.boardId || '').slice(0, 40)
      board = boardId ? await db().findUnique({ where: { id: boardId } }) : null
      if (!board || !(await hasAccess(board, session.userId))) return res.status(404).json({ ok: false, error: 'Tablero no encontrado' })
    }

    const history = Array.isArray(body.history)
      ? body.history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-8)
          .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }))
      : []

    const system =
      `Eres un asistente que responde preguntas SOBRE el siguiente tablero de seguimiento. ` +
      `Usa ÚNICAMENTE los datos proporcionados; si algo no está en los datos, dilo claramente. ` +
      `Responde en español, de forma concreta y breve, con cifras cuando apliquen. Puedes contar, filtrar y resumir.\n\n` +
      `=== DATOS DEL TABLERO ===\n${serializeBoard(board)}\n=== FIN DE DATOS ===`

    const { providerUsed, text } = await generateChatWithAI({
      system,
      messages: [...history, { role: 'user', content: question }],
      provider: 'auto',
      temperature: 0.3,
      maxTokens: 700,
    })

    return res.status(200).json({ ok: true, reply: text, providerUsed })
  } catch (error: any) {
    console.error('api/pc/chat error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Internal server error' })
  }
}
