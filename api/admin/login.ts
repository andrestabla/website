import {
  createAdminSessionToken,
  createTwoFactorChallengeToken,
  finalizeLogin,
  getTwoFactorChallenge,
  setTwoFactorCookie,
} from '../_lib/admin-auth.js'
import { prisma } from '../_lib/prisma.js'
import {
  ensureBootstrapAdminUser,
  findAdminUserByIdentifierAnyStatus,
  getSessionPermissionsForUser,
  registerAdminLogin,
  verifyPassword,
} from '../_lib/admin-users.js'
import { maskEmail, sendLoginCode, verifyLoginCode } from '../_lib/two-factor.js'

type VercelRequest = any
type VercelResponse = any

function sessionResponse(user: any) {
  const permissions = getSessionPermissionsForUser({
    role: user.role,
    permissions: user.permissions || [],
  })
  const token = createAdminSessionToken({
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    permissions,
  })
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      permissions,
    },
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const code = typeof body.code === 'string' ? body.code.trim() : ''

    // ── Paso 2: verificación del código enviado al correo ──────────────────
    if (code) {
      const challenge = getTwoFactorChallenge(req)
      if (!challenge) {
        return res.status(401).json({ ok: false, error: '2FA challenge expired', twoFactorExpired: true })
      }
      const result = await verifyLoginCode(challenge.userId, code)
      if (!result.ok) {
        if (result.reason === 'EXPIRED') {
          return res.status(401).json({ ok: false, error: 'Code expired', twoFactorExpired: true })
        }
        if (result.reason === 'TOO_MANY_ATTEMPTS') {
          return res.status(429).json({ ok: false, error: 'Too many attempts', twoFactorExpired: true })
        }
        return res.status(401).json({ ok: false, error: 'Invalid code', remaining: result.remaining })
      }

      const user = await prisma.adminUser.findUnique({
        where: { id: challenge.userId },
        include: { permissions: true },
      } as any)
      if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' })
      if (!user.active) return res.status(403).json({ ok: false, error: 'User suspended' })

      await registerAdminLogin(user.id)
      const { token, user: safeUser } = sessionResponse(user)
      finalizeLogin(res, token)
      return res.status(200).json({ ok: true, user: safeUser })
    }

    // ── Paso 1: verificación de credenciales y envío del código ────────────
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!identifier || !password) {
      return res.status(400).json({ ok: false, error: 'Missing credentials' })
    }

    await ensureBootstrapAdminUser()
    const user = await findAdminUserByIdentifierAnyStatus(identifier)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' })
    }
    if (!user.active) {
      return res.status(403).json({ ok: false, error: 'User suspended' })
    }
    if (user.passwordSetupRequired) {
      return res.status(403).json({ ok: false, error: 'Password setup required' })
    }
    if (!user.email) {
      return res.status(403).json({ ok: false, error: 'No email for 2FA', noEmail: true })
    }

    const delivery = await sendLoginCode({ id: user.id, email: user.email, displayName: user.displayName })
    if (!delivery.sent) {
      return res.status(503).json({ ok: false, error: 'Could not send verification code', reason: delivery.reason })
    }
    setTwoFactorCookie(res, createTwoFactorChallengeToken(user.id))
    return res.status(200).json({ ok: true, twoFactor: true, email: maskEmail(user.email) })
  } catch (error) {
    console.error('api/admin/login error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
