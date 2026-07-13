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

    const serialize = (b: any) => ({
      id: b.id,
      title: b.title,
      description: b.description || '',
      columns: b.columns || [],
      rows: b.rows || [],
      shareEnabled: !!b.shareEnabled,
      shareToken: access === 'owner' ? b.shareToken || null : null,
      publicView: b.publicView || null,
      access,
      isOwner: access === 'owner',
      updatedAt: b.updatedAt ? new Date(b.updatedAt).toISOString() : null,
      collaborators:
        access === 'owner'
          ? (b.shares || []).map((s: any) => ({ userId: s.userId, role: s.role }))
          : [],
    })

    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, board: serialize(board) })
    }

    if (req.method === 'PUT') {
      if (access === 'VIEW') return res.status(403).json({ ok: false, error: 'Solo lectura' })
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})

      // Concurrencia optimista: si el cliente envía baseUpdatedAt y el tablero ya
      // cambió en el servidor (otro usuario guardó), rechazamos con 409 y le
      // devolvemos el estado actual para que el cliente combine y reintente.
      if (body.baseUpdatedAt) {
        const currentTs = board.updatedAt ? new Date(board.updatedAt).getTime() : 0
        const baseTs = new Date(body.baseUpdatedAt).getTime()
        if (Number.isFinite(baseTs) && currentTs && baseTs !== currentTs) {
          return res.status(409).json({ ok: false, code: 'CONFLICT', board: serialize(board) })
        }
      }

      const data: any = {}
      if (typeof body.title === 'string') data.title = body.title.slice(0, 200)
      if (typeof body.description === 'string') data.description = body.description.slice(0, 2000)
      if (body.columns !== undefined) data.columns = sanitizeColumns(body.columns)
      if (body.rows !== undefined) {
        const cols = data.columns ?? board.columns ?? []
        data.rows = sanitizeRows(body.rows, cols)
      }
      if (body.publicView !== undefined) data.publicView = sanitizePublicView(body.publicView)
      const updated = await db().update({ where: { id }, data })
      return res.status(200).json({ ok: true, updatedAt: updated.updatedAt ? new Date(updated.updatedAt).toISOString() : null })
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
