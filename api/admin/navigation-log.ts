import { requireAdminSession, canAccessAdminModule } from '../_lib/admin-auth.js'
import { prisma } from '../_lib/prisma.js'
import { getClientIp, safeString } from '../_lib/analytics.js'

type VercelRequest = any
type VercelResponse = any

function parseBody(req: VercelRequest) {
  if (!req.body) return {}
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireAdminSession(req, res)
  if (!session) return

  try {
    if (req.method === 'POST') {
      const body = parseBody(req)
      const path = safeString(body?.path, 220)
      if (!path || !path.startsWith('/admin')) {
        return res.status(400).json({ ok: false, error: 'Invalid admin path' })
      }
      const action = safeString(body?.action, 60) || 'NAVIGATE'
      const fromPath = safeString(body?.fromPath, 220)
      const userAgent = safeString(req.headers?.['user-agent'], 500)

      await prisma.adminNavigationLog.create({
        data: {
          userId: session.userId,
          username: session.username,
          role: session.role,
          path,
          action,
          ip: getClientIp(req),
          userAgent,
          metadata: fromPath ? { fromPath } : undefined,
        },
      } as any)

      return res.status(200).json({ ok: true })
    }

    if (req.method === 'GET') {
      if (!canAccessAdminModule(session as any, 'USERS')) {
        return res.status(403).json({ ok: false, error: 'Sin permisos para ver logs de navegación.' })
      }
      const limit = Math.min(Math.max(Number(req.query?.limit || 200), 1), 500)
      const userId = safeString(req.query?.userId, 120)
      const logs = await prisma.adminNavigationLog.findMany({
        where: userId ? { userId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
      } as any)
      return res.status(200).json({ ok: true, logs })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('api/admin/navigation-log error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
