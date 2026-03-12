import { prisma } from '../_lib/prisma.js'
import {
  consumeCredentialSetupToken,
  hashPassword,
  verifyPassword,
} from '../_lib/admin-users.js'

type VercelRequest = any
type VercelResponse = any

function parseBody(req: VercelRequest) {
  if (!req.body) return {}
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function validatePassword(password: string) {
  if (password.length < 10) return 'La contraseña debe tener al menos 10 caracteres.'
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) return 'Incluye al menos una letra y un número.'
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const token = normalizeToken(req.query?.token)
      if (!token) return res.status(400).json({ ok: false, error: 'Token requerido.' })
      const record = await consumeCredentialSetupToken(token)
      if (!record) return res.status(404).json({ ok: false, error: 'Token inválido o vencido.' })
      return res.status(200).json({
        ok: true,
        user: {
          displayName: record.user.displayName,
          username: record.user.username,
          email: record.user.email || null,
          expiresAt: record.expiresAt,
        },
      })
    }

    if (req.method === 'POST') {
      const body = parseBody(req)
      const token = normalizeToken(body?.token)
      const password = typeof body?.password === 'string' ? body.password : ''
      const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : ''

      if (!token || !password || !confirmPassword) {
        return res.status(400).json({ ok: false, error: 'Completa todos los campos requeridos.' })
      }
      if (password !== confirmPassword) {
        return res.status(400).json({ ok: false, error: 'La confirmación de contraseña no coincide.' })
      }
      const validationError = validatePassword(password)
      if (validationError) {
        return res.status(400).json({ ok: false, error: validationError })
      }

      const record = await consumeCredentialSetupToken(token)
      if (!record) {
        return res.status(404).json({ ok: false, error: 'Token inválido o vencido.' })
      }

      // Prevent no-op resets if token leaked after setup.
      if (verifyPassword(password, record.user.passwordHash)) {
        return res.status(400).json({ ok: false, error: 'La nueva contraseña debe ser diferente.' })
      }

      const nextHash = hashPassword(password)
      await prisma.$transaction(async (tx: any) => {
        const update = await tx.adminCredentialToken.updateMany({
          where: {
            id: record.id,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { usedAt: new Date() },
        })
        if (update.count !== 1) throw new Error('TOKEN_ALREADY_USED')
        await tx.adminUser.update({
          where: { id: record.userId },
          data: {
            passwordHash: nextHash,
            passwordSetupRequired: false,
            active: true,
            suspendedAt: null,
          },
        })
      })
      await prisma.adminAuditLog.create({
        data: {
          actorUserId: record.userId,
          actorUsername: record.user.username,
          actorRole: record.user.role,
          action: 'ADMIN_ACCOUNT_SETUP',
          resource: 'admin-user',
          resourceId: record.userId,
          metadata: {
            purpose: record.purpose,
          },
        },
      } as any)

      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    if (error instanceof Error && error.message === 'TOKEN_ALREADY_USED') {
      return res.status(409).json({ ok: false, error: 'Token inválido o ya utilizado.' })
    }
    console.error('api/admin/account-setup error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
