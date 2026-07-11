import { pcSessionState } from '../_lib/pc-auth.js'
import { prisma } from '../_lib/prisma.js'
import { sanitizeColumns, sanitizeRows, sanitizePublicView } from '../_lib/pc-board.js'

type VercelRequest = any
type VercelResponse = any

const db = () => (prisma as any).pcBoard
const shareDb = () => (prisma as any).pcBoardShare

/** Resuelve el nivel de acceso del usuario al tablero: 'owner' | 'EDIT' | 'VIEW' | null. */
async function resolveAccess(board: any, userId: string): Promise<'owner' | 'EDIT' | 'VIEW' | null> {
  if (!board) return null
  if (board.ownerId === userId) return 'owner'
  const share = await shareDb().findUnique({ where: { boardId_userId: { boardId: board.id, userId } } })
  if (!share) return null
  return share.role === 'EDIT' ? 'EDIT' : 'VIEW'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = pcSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Unauthenticated' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'No Project Control access' })
  const userId = session.userId

  const id = String(req.query?.id || '').slice(0, 40)
  if (!id) return res.status(400).json({ ok: false, error: 'id requerido' })

  try {
    const board = await db().findUnique({ where: { id }, include: { shares: true } })
    const access = await resolveAccess(board, userId)
    if (!board || !access) return res.status(404).json({ ok: false, error: 'Tablero no encontrado' })

    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        board: {
          id: board.id,
          title: board.title,
          description: board.description || '',
          columns: board.columns || [],
          rows: board.rows || [],
          shareEnabled: !!board.shareEnabled,
          shareToken: access === 'owner' ? board.shareToken || null : null,
          publicView: board.publicView || null,
          access,
          isOwner: access === 'owner',
          collaborators:
            access === 'owner'
              ? (board.shares || []).map((s: any) => ({ userId: s.userId, role: s.role }))
              : [],
        },
      })
    }

    if (req.method === 'PUT') {
      if (access === 'VIEW') return res.status(403).json({ ok: false, error: 'Solo lectura' })
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
      const data: any = {}
      if (typeof body.title === 'string') data.title = body.title.slice(0, 200)
      if (typeof body.description === 'string') data.description = body.description.slice(0, 2000)
      if (body.columns !== undefined) data.columns = sanitizeColumns(body.columns)
      if (body.rows !== undefined) {
        const cols = data.columns ?? board.columns ?? []
        data.rows = sanitizeRows(body.rows, cols)
      }
      if (body.publicView !== undefined) data.publicView = sanitizePublicView(body.publicView)
      await db().update({ where: { id }, data })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      if (access !== 'owner') return res.status(403).json({ ok: false, error: 'Solo el dueño puede eliminar' })
      await db().delete({ where: { id } })
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, PUT, DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error: any) {
    console.error('api/pc/board error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Internal server error' })
  }
}
