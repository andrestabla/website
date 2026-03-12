import nodemailer from 'nodemailer'
import { requireAdminSession } from '../_lib/admin-auth.js'
import { prisma } from '../_lib/prisma.js'
import {
  ADMIN_MODULES,
  generateSecurePassword,
  getDefaultPermissionMapForRole,
  issueCredentialSetupToken,
  listAdminUsers,
  sanitizePermissionInput,
  upsertAdminUserPermissions,
  type AdminPermissionMap,
  type AdminRoleKey,
  hashPassword,
} from '../_lib/admin-users.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from '../_lib/integrations.js'
import { generateStyledEmail } from '../_lib/email-templates.js'
import { safeString } from '../_lib/analytics.js'

type VercelRequest = any
type VercelResponse = any

const ALLOWED_ROLES: AdminRoleKey[] = ['SUPERADMIN', 'ADMIN', 'EDITOR', 'ANALYST']

function parseBody(req: VercelRequest) {
  if (!req.body) return {}
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
}

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

function normalizeUsernameCandidate(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28)
  return base || 'user'
}

async function getUniqueUsername(input: string) {
  const base = normalizeUsernameCandidate(input)
  let candidate = base
  let index = 1
  // Non-interactive uniqueness loop.
  while (true) {
    const exists = await prisma.adminUser.findUnique({
      where: { username: candidate },
      select: { id: true },
    } as any)
    if (!exists) return candidate
    candidate = `${base}${index}`.slice(0, 30)
    index += 1
  }
}

function getRole(value: unknown): AdminRoleKey {
  const role = typeof value === 'string' ? value.toUpperCase() : ''
  if (ALLOWED_ROLES.includes(role as AdminRoleKey)) return role as AdminRoleKey
  return 'ADMIN'
}

async function getSmtpConfig() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data))
  if (!integrations.smtp.enabled) return null
  const cfg = integrations.smtp.config
  if (!cfg.host || !cfg.user || !cfg.password || !cfg.fromEmail) return null
  return cfg
}

function getPublicOrigin(req: VercelRequest) {
  const configured =
    process.env.SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL
  if (configured && configured.trim()) return configured.trim().replace(/\/$/, '')

  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || 'www.algoritmot.com')
  const proto = String(req.headers?.['x-forwarded-proto'] || 'https')
  return `${proto}://${host}`
}

async function sendSetupEmail(input: {
  req: VercelRequest
  email: string
  displayName: string
  username: string
  token: string
  expiresAt: Date
}) {
  const smtp = await getSmtpConfig()
  if (!smtp) return { sent: false, reason: 'SMTP_NOT_CONFIGURED' as const }

  const secure = smtp.encryption === 'ssl' || String(smtp.port) === '465'
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port || '587'),
    secure,
    auth: {
      user: smtp.user,
      pass: smtp.password,
    },
    tls: smtp.encryption === 'none' ? { rejectUnauthorized: false } : undefined,
  })

  const fromName = smtp.fromName || 'Algoritmo T'
  const setupUrl = `${getPublicOrigin(input.req)}/admin/setup?token=${encodeURIComponent(input.token)}`
  const html = generateStyledEmail({
    title: 'Acceso seguro al panel de administración',
    preheader: 'Configura tus credenciales de acceso en un enlace seguro de un solo uso.',
    contentHtml: `
      <p>Hola <strong>${input.displayName}</strong>,</p>
      <p>Se creó tu usuario en el panel administrativo de AlgoritmoT.</p>
      <table class="data-table">
        <tr><td class="label">Usuario</td><td>${input.username}</td></tr>
        <tr><td class="label">Email</td><td>${input.email}</td></tr>
        <tr><td class="label">Expira</td><td>${new Date(input.expiresAt).toLocaleString('es-CO')}</td></tr>
      </table>
      <p>Para activar tu acceso, define tu contraseña desde el siguiente enlace seguro:</p>
      <p><a href="${setupUrl}" class="button">Configurar credenciales</a></p>
      <p style="margin-top:24px;color:#64748b;font-size:13px;">Este enlace se invalida automáticamente después de su uso o cuando vence.</p>
    `,
  })

  await transporter.sendMail({
    from: `${fromName} <${smtp.fromEmail}>`,
    to: input.email,
    subject: 'Configura tu acceso al panel de AlgoritmoT',
    html,
  })

  return { sent: true as const, reason: null }
}

function serializeUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    email: user.email || null,
    displayName: user.displayName,
    role: user.role,
    active: !!user.active,
    passwordSetupRequired: !!user.passwordSetupRequired,
    suspendedAt: user.suspendedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    permissions: user.permissionsMap,
  }
}

async function fetchNavigationLogs(limit = 200) {
  const logs = await prisma.adminNavigationLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  } as any)
  return logs
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireAdminSession(req, res)
  if (!session) return

  try {
    if (req.method === 'GET') {
      const includeLogs = String(req.query?.logs || '') === '1'
      const logLimit = Math.min(Math.max(Number(req.query?.limitLogs || 150), 20), 500)
      const users = await listAdminUsers()
      const logs = includeLogs ? await fetchNavigationLogs(logLimit) : []
      return res.status(200).json({
        ok: true,
        modules: ADMIN_MODULES,
        users: users.map(serializeUser),
        logs,
      })
    }

    if (req.method === 'POST') {
      const body = parseBody(req)
      const displayName = safeString(body?.displayName, 120)
      const email = normalizeEmail(body?.email)
      const requestedUsername = safeString(body?.username, 80)
      const role = getRole(body?.role)
      const useDefaultPermissions = body?.permissions == null
      const permissionMap: AdminPermissionMap = useDefaultPermissions
        ? getDefaultPermissionMapForRole(role)
        : sanitizePermissionInput(body?.permissions)

      if (!displayName) {
        return res.status(400).json({ ok: false, error: 'Nombre de usuario requerido.' })
      }
      if (!email || !email.includes('@')) {
        return res.status(400).json({ ok: false, error: 'Email válido requerido.' })
      }

      const usernameSeed = requestedUsername || email.split('@')[0] || displayName
      const username = await getUniqueUsername(usernameSeed)
      const temporaryPassword = generateSecurePassword(30)

      const created = await prisma.adminUser.create({
        data: {
          username,
          email,
          displayName,
          role,
          active: true,
          passwordSetupRequired: true,
          passwordHash: hashPassword(temporaryPassword),
        },
      } as any)

      await upsertAdminUserPermissions(created.id, permissionMap)
      const { rawToken, expiresAt } = await issueCredentialSetupToken({
        userId: created.id,
        createdByUserId: session.userId,
        createdByName: session.username,
      })

      let delivery: { sent: boolean; reason: string | null } = { sent: false, reason: null }
      try {
        delivery = await sendSetupEmail({
          req,
          email,
          displayName: created.displayName,
          username: created.username,
          token: rawToken,
          expiresAt,
        })
      } catch (mailError) {
        console.error('admin users setup email send error', mailError)
        delivery = { sent: false, reason: 'SMTP_SEND_FAILED' }
      }

      await prisma.adminAuditLog.create({
        data: {
          actorUserId: session.userId,
          actorUsername: session.username,
          actorRole: session.role,
          action: 'ADMIN_USER_CREATE',
          resource: 'admin-user',
          resourceId: created.id,
          metadata: {
            username: created.username,
            email: created.email,
            role: created.role,
            emailSent: delivery.sent,
            emailReason: delivery.reason,
          },
        },
      } as any)

      const users = await listAdminUsers()
      return res.status(200).json({
        ok: true,
        users: users.map(serializeUser),
        emailDelivery: delivery,
      })
    }

    if (req.method === 'PATCH') {
      const body = parseBody(req)
      const action = safeString(body?.action, 60)
      const userId = safeString(body?.userId, 120)
      if (!action || !userId) {
        return res.status(400).json({ ok: false, error: 'action y userId son requeridos.' })
      }

      const currentUser = await prisma.adminUser.findUnique({
        where: { id: userId },
      } as any)
      if (!currentUser) {
        return res.status(404).json({ ok: false, error: 'Usuario no encontrado.' })
      }

      if (action === 'suspend') {
        if (userId === session.userId) {
          return res.status(400).json({ ok: false, error: 'No puedes suspender tu propia cuenta.' })
        }
        await prisma.adminUser.update({
          where: { id: userId },
          data: { active: false, suspendedAt: new Date() },
        } as any)
      } else if (action === 'activate') {
        await prisma.adminUser.update({
          where: { id: userId },
          data: { active: true, suspendedAt: null },
        } as any)
      } else if (action === 'update_access') {
        const role = getRole(body?.role || currentUser.role)
        const permissionMap = body?.permissions == null
          ? getDefaultPermissionMapForRole(role)
          : sanitizePermissionInput(body.permissions)
        await prisma.adminUser.update({
          where: { id: userId },
          data: { role },
        } as any)
        await upsertAdminUserPermissions(userId, permissionMap)
      } else if (action === 'resend_credentials') {
        if (!currentUser.email) {
          return res.status(400).json({ ok: false, error: 'El usuario no tiene email configurado.' })
        }
        const temporaryPassword = generateSecurePassword(30)
        await prisma.adminUser.update({
          where: { id: userId },
          data: {
            passwordHash: hashPassword(temporaryPassword),
            passwordSetupRequired: true,
          },
        } as any)

        const { rawToken, expiresAt } = await issueCredentialSetupToken({
          userId,
          createdByUserId: session.userId,
          createdByName: session.username,
          purpose: 'RESET_PASSWORD',
        })
        await sendSetupEmail({
          req,
          email: currentUser.email,
          displayName: currentUser.displayName,
          username: currentUser.username,
          token: rawToken,
          expiresAt,
        })
      } else if (action === 'delete') {
        if (userId === session.userId) {
          return res.status(400).json({ ok: false, error: 'No puedes eliminar tu propia cuenta.' })
        }
        if (currentUser.role === 'SUPERADMIN') {
          const activeSuperadmins = await prisma.adminUser.count({
            where: { role: 'SUPERADMIN', active: true },
          } as any)
          if (activeSuperadmins <= 1) {
            return res.status(400).json({ ok: false, error: 'Debe existir al menos un SUPERADMIN activo.' })
          }
        }
        await prisma.adminUser.delete({
          where: { id: userId },
        } as any)
      } else {
        return res.status(400).json({ ok: false, error: 'Acción no soportada.' })
      }

      await prisma.adminAuditLog.create({
        data: {
          actorUserId: session.userId,
          actorUsername: session.username,
          actorRole: session.role,
          action: `ADMIN_USER_${action.toUpperCase()}`,
          resource: 'admin-user',
          resourceId: userId,
          metadata: {
            role: body?.role,
            permissions: body?.permissions || null,
          },
        },
      } as any)

      const users = await listAdminUsers()
      return res.status(200).json({ ok: true, users: users.map(serializeUser) })
    }

    if (req.method === 'DELETE') {
      const userId = safeString(req.query?.id, 120)
      if (!userId) return res.status(400).json({ ok: false, error: 'id requerido.' })
      req.body = { action: 'delete', userId }
      req.method = 'PATCH'
      return handler(req, res)
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error: any) {
    console.error('api/admin/users error', error)
    if (error?.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'El email o username ya existe.' })
    }
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
