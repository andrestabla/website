import nodemailer from 'nodemailer'
import { prisma } from '../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from '../_lib/integrations.js'
import { generateStyledEmail } from '../_lib/email-templates.js'
import { findAdminUserByIdentifier, issueCredentialSetupToken } from '../_lib/admin-users.js'

type VercelRequest = any
type VercelResponse = any

const TOKEN_PURPOSE = 'PASSWORD_RESET'
// Respuesta genérica: no revela si el correo existe (anti-enumeración).
const GENERIC_OK =
  'Si el correo corresponde a una cuenta activa, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada y la carpeta de spam.'

function parseBody(req: VercelRequest) {
  if (!req.body) return {}
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
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

async function getSmtpConfig() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data))
  if (!integrations.smtp.enabled) return null
  const cfg = integrations.smtp.config
  if (!cfg.host || !cfg.user || !cfg.password || !cfg.fromEmail) return null
  return cfg
}

async function sendResetEmail(email: string, displayName: string, resetUrl: string, expiresAt: Date) {
  const smtp = await getSmtpConfig()
  if (!smtp) return false
  const secure = smtp.encryption === 'ssl' || String(smtp.port) === '465'
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port || '587'),
    secure,
    auth: { user: smtp.user, pass: smtp.password },
    tls: smtp.encryption === 'none' ? { rejectUnauthorized: false } : undefined,
  })
  const fromName = smtp.fromName || 'Algoritmo T'
  const html = generateStyledEmail({
    title: 'Restablece tu contraseña',
    preheader: 'Enlace seguro de un solo uso para definir una nueva contraseña.',
    contentHtml: `
      <p>Hola <strong>${displayName || ''}</strong>,</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta del Ecosistema digital Algoritmo T.</p>
      <p>Define una nueva contraseña desde el siguiente enlace seguro:</p>
      <p><a href="${resetUrl}" class="button">Restablecer contraseña</a></p>
      <table class="data-table">
        <tr><td class="label">Expira</td><td>${expiresAt.toLocaleString('es-CO')}</td></tr>
      </table>
      <p style="margin-top:20px;color:#64748b;font-size:13px;">Este enlace se invalida automáticamente después de su uso o cuando vence. Si no solicitaste este cambio, ignora este correo: tu contraseña actual seguirá siendo válida.</p>
    `,
  })
  await transporter.sendMail({
    from: `${fromName} <${smtp.fromEmail}>`,
    to: email,
    subject: 'Restablece tu contraseña · Algoritmo T',
    html,
  })
  return true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = parseBody(req)
    const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : ''
    if (!identifier) {
      return res.status(400).json({ ok: false, error: 'Ingresa tu correo o usuario.' })
    }

    // Solo cuentas activas: evita que un usuario suspendido se reactive vía el flujo de setup.
    const user = await findAdminUserByIdentifier(identifier)

    if (user && user.email) {
      const { rawToken, expiresAt } = await issueCredentialSetupToken({
        userId: user.id,
        purpose: TOKEN_PURPOSE,
        metadata: { via: 'ecosistema-forgot-password' },
      })
      const resetUrl = `${getPublicOrigin(req)}/admin/setup?token=${encodeURIComponent(rawToken)}&mode=reset`
      try {
        await sendResetEmail(user.email, user.displayName, resetUrl, expiresAt)
      } catch (mailError) {
        console.error('api/admin/password-reset email error', mailError)
        // No revelamos el fallo al cliente (respuesta genérica).
      }
    }

    // Siempre respuesta genérica.
    return res.status(200).json({ ok: true, message: GENERIC_OK })
  } catch (error) {
    console.error('api/admin/password-reset error', error)
    // Aún así respondemos genérico para no filtrar estado del sistema.
    return res.status(200).json({ ok: true, message: GENERIC_OK })
  }
}
