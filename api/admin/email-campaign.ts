import nodemailer from 'nodemailer'
import { prisma } from '../_lib/prisma.js'
import { requireAdminSession } from '../_lib/admin-auth.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from '../_lib/integrations.js'
import { safeString } from '../_lib/analytics.js'
import { buildMarketingEmailHtml, type MarketingEmailTemplateId } from '../_lib/marketing-email-template.js'

type VercelRequest = any
type VercelResponse = any
const CMS_ID = 'main'
const TEMPLATE_IDS: MarketingEmailTemplateId[] = ['executive', 'minimal', 'spotlight']

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

async function getSmtpConfig() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data))
  if (!integrations.smtp.enabled) return null
  const cfg = integrations.smtp.config
  if (!cfg.host || !cfg.user || !cfg.password || !cfg.fromEmail) return null
  return cfg
}

async function getSiteBranding() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: CMS_ID } })
  const data = (snapshot?.data || {}) as any
  const siteUrl = String(data?.site?.url || 'https://algoritmot.com').replace(/\/+$/, '')
  const siteName = String(data?.site?.name || 'AlgoritmoT').trim() || 'AlgoritmoT'
  const rawLogoUrl = String(data?.design?.logoUrl || data?.design?.logoFooterUrl || '').trim()
  const logoUrl = rawLogoUrl.startsWith('http') ? rawLogoUrl : rawLogoUrl ? `${siteUrl}${rawLogoUrl.startsWith('/') ? '' : '/'}${rawLogoUrl}` : ''
  return { siteUrl, siteName, logoUrl }
}

function normalizeTemplateId(input: unknown): MarketingEmailTemplateId {
  const normalized = String(input || '').trim().toLowerCase()
  return TEMPLATE_IDS.includes(normalized as MarketingEmailTemplateId)
    ? (normalized as MarketingEmailTemplateId)
    : 'executive'
}

function ensureAbsoluteUrl(baseUrl: string, maybeRelative: string) {
  if (!maybeRelative) return baseUrl
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative
  return `${baseUrl}${maybeRelative.startsWith('/') ? '' : '/'}${maybeRelative}`
}

function appendTrackingPixel(html: string, trackingUrl: string) {
  const pixel = `<img src="${trackingUrl}" alt="" width="1" height="1" style="display:block;border:0;outline:none;text-decoration:none;width:1px;height:1px;" />`
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${pixel}</body>`)
  }
  return `${html}${pixel}`
}

async function getUnsubscribedEmailSet() {
  const rows = await prisma.marketingEmailRecipient.findMany({
    where: { status: 'unsubscribed' },
    distinct: ['email'],
    select: { email: true },
    take: 10000,
  })
  return new Set(rows.map((row) => String(row.email || '').trim().toLowerCase()).filter(Boolean))
}

function appendUnsubscribeFooterHtml(
  html: string,
  templateId: MarketingEmailTemplateId,
  unsubscribeUrl: string
) {
  if (!unsubscribeUrl) return html
  if (html.includes('data-mkt-unsubscribe-link="1"')) return html

  const isDark = templateId === 'executive' || templateId === 'spotlight'
  const textColor = isDark ? '#94a3b8' : '#64748b'
  const linkColor = isDark ? '#38bdf8' : '#1d4ed8'
  const borderColor = isDark ? '#1e293b' : '#e2e8f0'

  const block = `
<div data-mkt-unsubscribe-link="1" style="margin:22px 0 0 0;padding:14px 0 0 0;border-top:1px solid ${borderColor};font-size:12px;line-height:1.6;color:${textColor};text-align:center;">
  Si no quieres recibir más correos, <a href="${unsubscribeUrl}" style="color:${linkColor};font-weight:700;text-decoration:underline;">No estoy interesado</a>.
</div>
`

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${block}</body>`)
  }
  return `${html}${block}`
}

function appendUnsubscribeFooterText(text: string, unsubscribeUrl: string) {
  if (!unsubscribeUrl) return text
  if (text.includes('No estoy interesado')) return text
  return `${text}\n\nNo estoy interesado: ${unsubscribeUrl}`.trim()
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
    const { siteUrl, siteName, logoUrl } = await getSiteBranding()

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const campaignName = safeString(body?.campaignName, 140) || 'Campaign'
    const subject = safeString(body?.subject, 180)
    const preheader = safeString(body?.preheader, 220)
    const bodyText = safeString(body?.bodyText, 50000)
    const ctaLabel = safeString(body?.ctaLabel, 80) || 'Conocer más'
    const ctaHref = safeString(body?.ctaHref, 2000) || '/#contacto'
    const templateId = normalizeTemplateId(body?.templateId)
    const html = safeString(body?.html, 120000)
    const text = safeString(body?.text, 50000)
    const senderName = safeString(body?.fromName, 100) || safeString(smtp.fromName, 100) || 'Marketing'
    const recipientsRaw = parseRecipients(body?.recipients)
    const recipients = uniqueEmails(recipientsRaw).slice(0, 500)
    const unsubscribedSet = await getUnsubscribedEmailSet()
    const skippedUnsubscribed = recipients.filter((email) => unsubscribedSet.has(email))
    const allowedRecipients = recipients.filter((email) => !unsubscribedSet.has(email))
    const previewOnly = body?.previewOnly === true

    if (!subject) return res.status(400).json({ ok: false, error: 'subject is required' })
    if (!html && !text && !bodyText) return res.status(400).json({ ok: false, error: 'html, text or bodyText is required' })
    if (recipients.length === 0) return res.status(400).json({ ok: false, error: 'At least one valid recipient is required' })
    if (allowedRecipients.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Todos los destinatarios están marcados como "No interesado".',
      })
    }

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

    const from = `${senderName} <${smtp.fromEmail}>`
    const ctaUrl = ensureAbsoluteUrl(siteUrl, ctaHref)
    const htmlBody =
      html ||
      buildMarketingEmailHtml({
        templateId,
        logoUrl,
        siteName,
        campaignName,
        subject,
        preheader: preheader || undefined,
        bodyText: bodyText || text || '',
        ctaLabel,
        ctaUrl,
      })
    const textBody = text || `${preheader ? `${preheader}\n\n` : ''}${bodyText || ''}\n\n${ctaLabel}: ${ctaUrl}`.trim()

    if (previewOnly) {
      const previewRecipient = allowedRecipients[0]
      const previewUnsubscribeUrl =
        `${siteUrl}/api/marketing/unsubscribe` +
        `?preview=1` +
        `&email=${encodeURIComponent(previewRecipient)}` +
        `&cn=${encodeURIComponent(campaignName)}` +
        `&cs=${encodeURIComponent(subject)}`
      await transporter.sendMail({
        from,
        to: previewRecipient,
        subject: `[PREVIEW] ${subject}`,
        html: appendUnsubscribeFooterHtml(htmlBody, templateId, previewUnsubscribeUrl),
        text: appendUnsubscribeFooterText(textBody, previewUnsubscribeUrl),
        headers: {
          'List-Unsubscribe': `<${previewUnsubscribeUrl}>`,
        },
      })
      return res.status(200).json({
        ok: true,
        preview: true,
        sent: 1,
        failed: 0,
        templateId,
        skippedUnsubscribed: skippedUnsubscribed.length,
      })
    }

    const campaign = await prisma.marketingEmailCampaign.create({
      data: {
        name: campaignName,
        subject,
        preheader: preheader || null,
        templateId,
        fromName: senderName,
        fromEmail: smtp.fromEmail,
        previewOnly: false,
        createdByUserId: session.userId,
        createdByName: session.username,
      },
    })

    const batches = chunk(allowedRecipients, 20)
    const success: Array<{ recipient: string; recordId: string; messageId: string | null }> = []
    const failed: Array<{ recipient: string; reason: string }> = []

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(async (recipient) => {
          const record = await prisma.marketingEmailRecipient.create({
            data: {
              campaignId: campaign.id,
              email: recipient,
              status: 'pending',
            },
          })

          const trackingUrl = `${siteUrl}/api/marketing/open?rid=${encodeURIComponent(record.id)}&cid=${encodeURIComponent(campaign.id)}`
          const unsubscribeUrl =
            `${siteUrl}/api/marketing/unsubscribe` +
            `?rid=${encodeURIComponent(record.id)}` +
            `&cid=${encodeURIComponent(campaign.id)}` +
            `&email=${encodeURIComponent(recipient)}` +
            `&cn=${encodeURIComponent(campaignName)}` +
            `&cs=${encodeURIComponent(subject)}`
          const finalHtml = appendTrackingPixel(
            appendUnsubscribeFooterHtml(htmlBody, templateId, unsubscribeUrl),
            trackingUrl
          )
          const finalText = appendUnsubscribeFooterText(textBody, unsubscribeUrl)
          const message = await transporter.sendMail({
            from,
            to: recipient,
            subject,
            html: finalHtml,
            text: finalText,
            headers: {
              'x-campaign-name': campaignName,
              'x-campaign-id': campaign.id,
              'x-template-id': templateId,
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          })
          return { recipient, recordId: record.id, messageId: message.messageId ? String(message.messageId) : null }
        })
      )
      results.forEach((result, index) => {
        const recipient = batch[index]
        if (result.status === 'fulfilled') {
          success.push(result.value)
          return
        }
        failed.push({
          recipient,
          reason: result.reason instanceof Error ? result.reason.message : 'Send failed',
        })
      })

      await Promise.all(
        success
          .filter((item) => batch.includes(item.recipient))
          .map((item) =>
            prisma.marketingEmailRecipient.update({
              where: { id: item.recordId },
              data: {
                status: 'sent',
                sentAt: new Date(),
                messageId: item.messageId,
              },
            })
          )
      )

      await Promise.all(
        failed
          .filter((item) => batch.includes(item.recipient))
          .map((item) =>
            prisma.marketingEmailRecipient.updateMany({
              where: { campaignId: campaign.id, email: item.recipient },
              data: {
                status: 'failed',
                failureReason: safeString(item.reason, 500) || 'Send failed',
              },
            })
          )
      )
    }

    await prisma.marketingEmailCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount: success.length,
        failedCount: failed.length,
      },
    })

    await prisma.analyticsEvent.create({
      data: {
        visitorId: `admin_${session.userId}`,
        sessionId: undefined,
        eventType: 'email_campaign_send',
        path: '/admin/marketing',
        pageTitle: 'Email Campaign',
        metadata: {
          campaignId: campaign.id,
          campaignName,
          subject,
          templateId,
          fromName: senderName,
          sent: success.length,
          failed: failed.length,
          skippedUnsubscribed: skippedUnsubscribed.length,
        },
      },
    })

    return res.status(200).json({
      ok: true,
      preview: false,
      campaignId: campaign.id,
      sent: success.length,
      failed: failed.length,
      templateId,
      skippedUnsubscribed: skippedUnsubscribed.length,
      skippedRecipients: skippedUnsubscribed.slice(0, 20),
      failedRecipients: failed.slice(0, 20),
    })
  } catch (error) {
    console.error('api/admin/email-campaign error', error)
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Email campaign failed' })
  }
}
