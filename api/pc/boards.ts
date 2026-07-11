import { pcSessionState } from '../_lib/pc-auth.js'
import { prisma } from '../_lib/prisma.js'
import { sanitizeColumns, sanitizeRows } from '../_lib/pc-board.js'

type VercelRequest = any
type VercelResponse = any

const db = () => (prisma as any).pcBoard
const shareDb = () => (prisma as any).pcBoardShare

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = pcSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Unauthenticated' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'No Project Control access' })
  const userId = session.userId

  try {
    if (req.method === 'GET') {
      const [owned, shared] = await Promise.all([
        db().findMany({ where: { ownerId: userId }, orderBy: { updatedAt: 'desc' } }),
        shareDb().findMany({ where: { userId }, include: { board: true } }),
      ])
      const summarize = (b: any, role: 'owner' | 'VIEW' | 'EDIT') => ({
        id: b.id,
        title: b.title,
        description: b.description || '',
        columnsCount: Array.isArray(b.columns) ? b.columns.length : 0,
        rowsCount: Array.isArray(b.rows) ? b.rows.length : 0,
        shareEnabled: !!b.shareEnabled,
        updatedAt: b.updatedAt,
        role,
      })
      const boards = [
        ...owned.map((b: any) => summarize(b, 'owner')),
        ...shared
          .filter((s: any) => s.board)
          .map((s: any) => summarize(s.board, s.role === 'EDIT' ? 'EDIT' : 'VIEW')),
      ]
      return res.status(200).json({ ok: true, boards })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
      const title = String(body.title || 'Tablero sin título').slice(0, 200)
      const description = body.description ? String(body.description).slice(0, 2000) : null
      const columns = sanitizeColumns(body.columns)
      const rows = sanitizeRows(body.rows, columns)
      const created = await db().create({
        data: { ownerId: userId, title, description, columns, rows },
      })
      return res.status(200).json({ ok: true, id: created.id })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error: any) {
    console.error('api/pc/boards error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Internal server error' })
  }
}
