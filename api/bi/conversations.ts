import { biSessionState } from '../_lib/bi-auth.js'
import { prisma } from '../_lib/prisma.js'

type VercelRequest = any
type VercelResponse = any

const db = () => (prisma as any).biConversation

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = biSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Unauthenticated' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'No BI access' })
  const userId = session.userId

  try {
    if (req.method === 'GET') {
      const rows = await db().findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 50 })
      const threads = rows.map((r: any) => ({ id: r.id, title: r.title, messages: r.messages || [], updatedAt: r.updatedAt }))
      return res.status(200).json({ ok: true, threads })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
      const id = String(body.id || '').slice(0, 60)
      if (!id) return res.status(400).json({ ok: false, error: 'id requerido' })
      const title = String(body.title || '').slice(0, 200)
      const messages = Array.isArray(body.messages)
        ? body.messages
            .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 30000) }))
            .slice(-60)
        : []

      const existing = await db().findUnique({ where: { id } })
      if (existing && existing.userId !== userId) return res.status(403).json({ ok: false, error: 'No autorizado' })
      await db().upsert({
        where: { id },
        create: { id, userId, title, messages },
        update: { title, messages, userId },
      })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').slice(0, 60)
      if (!id) return res.status(400).json({ ok: false, error: 'id requerido' })
      await db().deleteMany({ where: { id, userId } })
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error: any) {
    console.error('api/bi/conversations error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Internal server error' })
  }
}
