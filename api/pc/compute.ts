import { pcSessionState } from '../_lib/pc-auth.js'
import { prisma } from '../_lib/prisma.js'
import { fetchConnectorSummary, parseConnectorUrl } from '../_lib/pc-connectors.js'
import { generateJsonWithAI, getAiAvailability } from '../_lib/ai.js'

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

function coerce(value: unknown, render: string): number | string | null {
  if (render === 'progress' || render === 'number') {
    const n = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''))
    if (!Number.isFinite(n)) return null
    if (render === 'progress') return Math.max(0, Math.min(100, Math.round(n)))
    return n
  }
  return value == null ? null : String(value).slice(0, 2000)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = pcSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Unauthenticated' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'No Project Control access' })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const boardId = String(body.boardId || '').slice(0, 40)
    const columnId = String(body.columnId || '').slice(0, 40)
    const rowId = String(body.rowId || '').slice(0, 40)
    if (!boardId || !columnId || !rowId) return res.status(400).json({ ok: false, error: 'boardId, columnId y rowId requeridos' })

    const board = await db().findUnique({ where: { id: boardId } })
    if (!board || !(await hasAccess(board, session.userId))) return res.status(404).json({ ok: false, error: 'Tablero no encontrado' })

    const columns: any[] = Array.isArray(board.columns) ? board.columns : []
    const rows: any[] = Array.isArray(board.rows) ? board.rows : []
    const col = columns.find((c) => c.id === columnId)
    const row = rows.find((r) => r.id === rowId)
    if (!col || !row) return res.status(404).json({ ok: false, error: 'Columna o fila no encontrada' })
    if (col.behavior?.mode !== 'formula') return res.status(400).json({ ok: false, error: 'La columna no es de tipo fórmula' })

    const render = col.behavior.render || 'text'
    const promptFormula = String(col.behavior.prompt || '').trim()

    // Contexto de la fila
    const contextLines = columns
      .filter((c) => c.id !== columnId)
      .map((c) => `- ${c.name}: ${row.cells?.[c.id] ?? ''}`)
      .join('\n')

    // Fuente externa (enlace)
    let sourceUrl = ''
    if (col.behavior.sourceColumnId && row.cells?.[col.behavior.sourceColumnId]) {
      sourceUrl = String(row.cells[col.behavior.sourceColumnId])
    } else {
      for (const c of columns) {
        const v = row.cells?.[c.id]
        if (typeof v === 'string' && parseConnectorUrl(v)) { sourceUrl = v; break }
      }
    }
    const summary = sourceUrl ? await fetchConnectorSummary(sourceUrl) : null

    // Fallback determinista sin IA: avance desde la fuente
    const ai = await getAiAvailability()
    if (!ai.openai && !ai.gemini) {
      if (summary && render === 'progress') {
        return res.status(200).json({ ok: true, value: summary.avgProgress, providerUsed: 'connector', source: summaryPublic(summary) })
      }
      return res.status(400).json({ ok: false, error: 'No hay proveedor de IA configurado (OpenAI/Gemini)' })
    }

    const prompt =
      `Eres un motor que calcula el valor de una celda de una tabla siguiendo una fórmula descrita en lenguaje natural.\n\n` +
      `FÓRMULA (en prosa):\n${promptFormula || '(sin descripción)'}\n\n` +
      `DATOS DE LA FILA (columna: valor):\n${contextLines || '(sin datos)'}\n\n` +
      (summary
        ? `FUENTE EXTERNA leída del enlace de la fila (integración nativa, datos reales):\n${summary.text}\n` +
          `JSON: ${JSON.stringify({ avgProgress: summary.avgProgress, doneProgress: summary.doneProgress, totalTasks: summary.totalTasks, byStatus: summary.byStatus })}\n\n`
        : sourceUrl
          ? `Nota: hay un enlace en la fila (${sourceUrl}) pero no se pudo leer su contenido.\n\n`
          : '') +
      `Instrucciones de salida:\n` +
      `- Devuelve ÚNICAMENTE JSON: {"value": <valor>, "note": "<explicación breve en español>"}.\n` +
      (render === 'progress'
        ? `- "value" debe ser un número ENTERO entre 0 y 100 (porcentaje de avance).\n`
        : render === 'number'
          ? `- "value" debe ser un número.\n`
          : `- "value" debe ser un texto corto.\n`) +
      `- Si no hay datos suficientes, da el mejor estimado y explícalo en "note".`

    const { providerUsed, data } = await generateJsonWithAI({ prompt, provider: 'openai', temperature: 0.1, maxTokens: 400 })
    const value = coerce(data?.value, render)
    return res.status(200).json({
      ok: true,
      value,
      note: typeof data?.note === 'string' ? data.note.slice(0, 400) : undefined,
      providerUsed,
      source: summary ? summaryPublic(summary) : undefined,
    })
  } catch (error: any) {
    console.error('api/pc/compute error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Internal server error' })
  }
}

function summaryPublic(s: any) {
  return { provider: s.provider, name: s.name, totalTasks: s.totalTasks, avgProgress: s.avgProgress, doneProgress: s.doneProgress }
}
