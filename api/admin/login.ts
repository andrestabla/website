import {
  createAdminSessionToken,
  setAdminSessionCookie,
} from '../_lib/admin-auth.js'
import {
  ensureBootstrapAdminUser,
  findAdminUserByIdentifier,
  registerAdminLogin,
  verifyPassword,
} from '../_lib/admin-users.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!identifier || !password) {
      return res.status(400).json({ ok: false, error: 'Missing credentials' })
    }

    await ensureBootstrapAdminUser()
    const user = await findAdminUserByIdentifier(identifier)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' })
    }

    await registerAdminLogin(user.id)
    const token = createAdminSessionToken({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role as any,
    })
    setAdminSessionCookie(res, token)
    return res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('api/admin/login error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
