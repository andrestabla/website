import nodemailer from 'nodemailer'
import { prisma } from '../_lib/prisma.js'
import { requireAdminSession } from '../_lib/admin-auth.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from '../_lib/integrations.js'
import { safeString } from '../_lib/analytics.js'

type VercelRequest = any
type VercelResponse = any

function parseRecipients(input: unknown) {
  if (Array.isArray(input)) {
    return input.map((value) => String(value || '').trim()).filter(Boolean)
  }
  if (typeof input === 'string') {
    return input
      .split(/[\n,;]+/g)
      .map((value) => value.trim())
      .filter(Boolean)
  }
  return []
}

function uniqueEmails(recipients: string[]) {
  const seen = new Set<string>()
  const valid: string[] = []
  for (const raw of recipients) {
    const email = raw.toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue
    if (seen.has(email)) continue
    seen.add(email)
    valid.push(email)
  }
  return valid
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function textToHtml(text: string) {
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#0f172a;">${text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')}</div>`
}

async function getSmtpConfig() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data))
  if (!integrations.smtp.enabled) return null
  const cfg = integrations.smtp.config
  if (!cfg.host || !cfg.user || !cfg.password || !cfg.fromEmail) return null
  return cfg
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const session = requireAdminSession(req, res)
  if (!session) return

  try {
    const smtp = await getSmtpConfig()
    if (!smtp) return res.status(400).json({ ok: false, error: 'SMTP no está configurado o activo en Integraciones' })

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const campaignName = safeString(body?.campaignName, 140) || 'Campaign'
    const subject = safeString(body?.subject, 180)
    const html = safeString(body?.html, 120000)
    const text = safeString(body?.text, 50000)
    const recipientsRaw = parseRecipients(body?.recipients)
    const recipients = uniqueEmails(recipientsRaw).slice(0, 500)
    const previewOnly = body?.previewOnly === true

    if (!subject) return res.status(400).json({ ok: false, error: 'subject is required' })
    if (!html && !text) return res.status(400).json({ ok: false, error: 'html or text content is required' })
    if (recipients.length === 0) return res.status(400).json({ ok: false, error: 'At least one valid recipient is required' })

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

    const fromName = smtp.fromName || 'Marketing'
    const from = `${fromName} <${smtp.fromEmail}>`
    const htmlBody = html || textToHtml(text || '')
    const textBody = text || String(htmlBody).replace(/<[^>]+>/g, ' ')

    if (previewOnly) {
      await transporter.sendMail({
        from,
        to: recipients[0],
        subject: `[PREVIEW] ${subject}`,
        html: htmlBody,
        text: textBody,
      })
      return res.status(200).json({ ok: true, preview: true, sent: 1, failed: 0 })
    }

    const batches = chunk(recipients, 20)
    const success: string[] = []
    const failed: Array<{ recipient: string; reason: string }> = []

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map((recipient) =>
          transporter.sendMail({
            from,
            to: recipient,
            subject,
            html: htmlBody,
            text: textBody,
            headers: {
              'x-campaign-name': campaignName,
            },
          })
        )
      )
      results.forEach((result, index) => {
        const recipient = batch[index]
        if (result.status === 'fulfilled') {
          success.push(recipient)
          return
        }
        failed.push({
          recipient,
          reason: result.reason instanceof Error ? result.reason.message : 'Send failed',
        })
      })
    }

    await prisma.analyticsEvent.create({
      data: {
        visitorId: `admin_${session.userId}`,
        sessionId: undefined,
        eventType: 'email_campaign_send',
        path: '/admin/marketing',
        pageTitle: 'Email Campaign',
        metadata: {
          campaignName,
          subject,
          sent: success.length,
          failed: failed.length,
        },
      },
    })

    return res.status(200).json({
      ok: true,
      preview: false,
      sent: success.length,
      failed: failed.length,
      failedRecipients: failed.slice(0, 20),
    })
  } catch (error) {
    console.error('api/admin/email-campaign error', error)
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Email campaign failed' })
  }
}
