import { getAdminSession } from '../_lib/admin-auth.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const session = getAdminSession(req)
  return res.status(200).json({
    ok: true,
    authenticated: !!session,
    user: session
      ? {
          id: session.userId,
          username: session.username,
          displayName: session.displayName,
          role: session.role,
        }
      : null,
  })
}
