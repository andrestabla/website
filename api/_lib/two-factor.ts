import crypto from 'node:crypto'
import nodemailer from 'nodemailer'
import { prisma } from './prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from './integrations.js'
import { generateStyledEmail } from './email-templates.js'

/**
 * Verificación en dos pasos por correo para el login (panel admin y BI).
 * El código se guarda en AdminCredentialToken (purpose LOGIN_2FA) para poder
 * limitar intentos y usos en el servidor (no en una cookie manipulable).
 */
const PURPOSE = 'LOGIN_2FA'
const CODE_TTL_MINUTES = 10
const MAX_ATTEMPTS = 5

function hashCode(userId: string, code: string) {
  return crypto.createHash('sha256').update(`${userId}:${String(code).trim()}`).digest('hex')
}

export function generateLoginCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

export function maskEmail(email: string) {
  const [name, domain] = String(email || '').split('@')
  if (!domain) return '***'
  const head = name.slice(0, 1)
  const tail = name.length > 2 ? name.slice(-1) : ''
  return `${head}${'*'.repeat(Math.max(1, name.length - (tail ? 2 : 1)))}${tail}@${domain}`
}

async function getSmtpConfig() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data))
  if (!integrations.smtp.enabled) return null
  const cfg = integrations.smtp.config
  if (!cfg.host || !cfg.user || !cfg.password || !cfg.fromEmail) return null
  return cfg
}

async function sendCodeEmail(email: string, displayName: string, code: string) {
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
    title: 'Tu código de verificación',
    preheader: `Código de acceso: ${code} (válido ${CODE_TTL_MINUTES} minutos).`,
    contentHtml: `
      <p>Hola <strong>${displayName || ''}</strong>,</p>
      <p>Usa este código para completar tu inicio de sesión:</p>
      <p style="text-align:center;margin:28px 0;">
        <span style="display:inline-block;font-size:34px;font-weight:800;letter-spacing:10px;color:#0f172a;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:14px 24px;">${code}</span>
      </p>
      <p style="color:#475569;">El código vence en ${CODE_TTL_MINUTES} minutos y solo puede usarse una vez.</p>
      <p style="margin-top:20px;color:#64748b;font-size:13px;">Si no intentaste iniciar sesión, ignora este correo y considera cambiar tu contraseña.</p>
    `,
  })
  await transporter.sendMail({
    from: `${fromName} <${smtp.fromEmail}>`,
    to: email,
    subject: `Tu código de acceso: ${code}`,
    html,
  })
  return true
}

/** Genera, guarda y envía por correo un código de verificación para el usuario. */
export async function sendLoginCode(user: { id: string; email: string | null; displayName: string }) {
  if (!user.email) return { sent: false as const, reason: 'NO_EMAIL' as const }
  const code = generateLoginCode()
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000)
  // Invalida cualquier código previo del usuario y crea el nuevo.
  await prisma.adminCredentialToken.deleteMany({ where: { userId: user.id, purpose: PURPOSE } } as any)
  await prisma.adminCredentialToken.create({
    data: { userId: user.id, tokenHash: hashCode(user.id, code), expiresAt, purpose: PURPOSE, metadata: { attempts: 0 } },
  } as any)

  try {
    const ok = await sendCodeEmail(user.email, user.displayName, code)
    if (!ok) return { sent: false as const, reason: 'SMTP_NOT_CONFIGURED' as const }
    return { sent: true as const, reason: null }
  } catch (error) {
    console.error('two-factor sendLoginCode email error', error)
    return { sent: false as const, reason: 'SMTP_SEND_FAILED' as const }
  }
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'EXPIRED' | 'TOO_MANY_ATTEMPTS' | 'INVALID'; remaining?: number }

/** Verifica el código; limita intentos y lo marca como usado al acertar. */
export async function verifyLoginCode(userId: string, code: string): Promise<VerifyResult> {
  const now = new Date()
  const token = await prisma.adminCredentialToken.findFirst({
    where: { userId, purpose: PURPOSE, usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
  } as any)
  if (!token) return { ok: false, reason: 'EXPIRED' }

  const attempts = Number((token.metadata as any)?.attempts || 0)
  if (attempts >= MAX_ATTEMPTS) {
    await prisma.adminCredentialToken.update({ where: { id: token.id }, data: { usedAt: now } } as any)
    return { ok: false, reason: 'TOO_MANY_ATTEMPTS' }
  }

  const expected = token.tokenHash
  const actual = hashCode(userId, code)
  const match =
    expected.length === actual.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))

  if (!match) {
    await prisma.adminCredentialToken.update({
      where: { id: token.id },
      data: { metadata: { attempts: attempts + 1 } },
    } as any)
    return { ok: false, reason: 'INVALID', remaining: Math.max(0, MAX_ATTEMPTS - attempts - 1) }
  }

  await prisma.adminCredentialToken.update({ where: { id: token.id }, data: { usedAt: now } } as any)
  return { ok: true }
}
