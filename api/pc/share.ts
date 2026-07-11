import crypto from 'node:crypto'
import { pcSessionState } from '../_lib/pc-auth.js'
import { prisma } from '../_lib/prisma.js'

type VercelRequest = any
type VercelResponse = any

const db = () => (prisma as any).pcBoard
const shareDb = () => (prisma as any).pcBoardShare
const userDb = () => (prisma as any).adminUser

async function collaborators(boardId: string) {
  const shares = await shareDb().findMany({ where: { boardId } })
  const ids = shares.map((s: any) => s.userId)
  const users = ids.length
    ? await userDb().findMany({ where: { id: { in: ids } }, select: { id: true, username: true, displayName: true, email: true } })
    : []
  const byId = new Map(users.map((u: any) => [u.id, u]))
  return shares.map((s: any) => {
    const u: any = byId.get(s.userId)
    return { userId: s.userId, role: s.role, username: u?.username || '', displayName: u?.displayName || s.userId, email: u?.email || '' }
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = pcSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Unauthenticated' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'No Project Control access' })
  const userId = session.userId

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const boardId = String(body.boardId || '').slice(0, 40)
    const op = String(body.op || '')
    if (!boardId) return res.status(400).json({ ok: false, error: 'boardId requerido' })

    const board = await db().findUnique({ where: { id: boardId } })
    if (!board) return res.status(404).json({ ok: false, error: 'Tablero no encontrado' })
    if (board.ownerId !== userId) return res.status(403).json({ ok: false, error: 'Solo el dueño gestiona el uso compartido' })

    if (op === 'list') {
      return res.status(200).json({ ok: true, collaborators: await collaborators(boardId) })
    }

    if (op === 'public-on') {
      const shareToken = board.shareToken || crypto.randomUUID()
      await db().update({ where: { id: boardId }, data: { shareEnabled: true, shareToken } })
      return res.status(200).json({ ok: true, shareEnabled: true, shareToken })
    }

    if (op === 'public-off') {
      await db().update({ where: { id: boardId }, data: { shareEnabled: false } })
      return res.status(200).json({ ok: true, shareEnabled: false, shareToken: board.shareToken || null })
    }

    if (op === 'add-user') {
      const identifier = String(body.identifier || '').trim().toLowerCase()
      const role = body.role === 'EDIT' ? 'EDIT' : 'VIEW'
      if (!identifier) return res.status(400).json({ ok: false, error: 'Usuario requerido' })
      const target = await userDb().findFirst({
        where: { OR: [{ username: identifier }, { email: identifier }] },
        select: { id: true },
      })
      if (!target) return res.status(404).json({ ok: false, error: 'No existe un usuario con ese usuario/correo' })
      if (target.id === board.ownerId) return res.status(400).json({ ok: false, error: 'El dueño ya tiene acceso' })
      await shareDb().upsert({
        where: { boardId_userId: { boardId, userId: target.id } },
        create: { boardId, userId: target.id, role },
        update: { role },
      })
      return res.status(200).json({ ok: true, collaborators: await collaborators(boardId) })
    }

    if (op === 'set-role') {
      const targetId = String(body.userId || '')
      const role = body.role === 'EDIT' ? 'EDIT' : 'VIEW'
      await shareDb().updateMany({ where: { boardId, userId: targetId }, data: { role } })
      return res.status(200).json({ ok: true, collaborators: await collaborators(boardId) })
    }

    if (op === 'remove-user') {
      const targetId = String(body.userId || '')
      await shareDb().deleteMany({ where: { boardId, userId: targetId } })
      return res.status(200).json({ ok: true, collaborators: await collaborators(boardId) })
    }

    return res.status(400).json({ ok: false, error: 'Operación no válida' })
  } catch (error: any) {
    console.error('api/pc/share error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Internal server error' })
  }
}
