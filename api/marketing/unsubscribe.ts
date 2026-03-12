import { prisma } from '../_lib/prisma.js'

type VercelRequest = any
type VercelResponse = any

function pickFirst(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || '').trim()
  return String(value || '').trim()
}

function normalizeEmail(value: string) {
  const email = String(value || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ''
  return email
}

function normalizeText(value: string, max = 220) {
  return String(value || '').trim().slice(0, max)
}

function isTruthyFlag(value: unknown) {
  const normalized = pickFirst(value).toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'si'
}

async function resolveRecipientByEmail(email: string) {
  if (!email) return null
  const bySentAt = await prisma.marketingEmailRecipient.findFirst({
    where: { email, sentAt: { not: null } },
    orderBy: { sentAt: 'desc' },
    select: {
      id: true,
      campaignId: true,
      email: true,
      status: true,
      campaign: { select: { id: true, name: true, subject: true } },
    },
  })
  if (bySentAt) return bySentAt
  return prisma.marketingEmailRecipient.findFirst({
    where: { email },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      campaignId: true,
      email: true,
      status: true,
      campaign: { select: { id: true, name: true, subject: true } },
    },
  })
}

function renderResponsePage(params: {
  success: boolean
  title: string
  message: string
}) {
  const accent = params.success ? '#10b981' : '#f59e0b'
  const border = params.success ? '#6ee7b7' : '#fcd34d'
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${params.title}</title>
</head>
<body style="margin:0;padding:24px;background:#0b1223;color:#e2e8f0;font-family:Inter,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;">
    <tr>
      <td style="background:#0f172a;border:1px solid #1e293b;padding:28px;">
        <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#38bdf8;font-weight:900;margin-bottom:12px;">AlgoritmoT Email Preferences</div>
        <h1 style="margin:0 0 10px 0;font-size:30px;line-height:1.1;font-weight:900;color:#f8fafc;">${params.title}</h1>
        <p style="margin:0;font-size:16px;line-height:1.65;color:#cbd5e1;">${params.message}</p>
        <div style="margin-top:16px;padding:10px 12px;border:1px solid ${border};color:${accent};font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;display:inline-block;">
          ${params.success ? 'No interesado registrado' : 'Enlace inválido'}
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!['GET', 'POST'].includes(String(req.method || '').toUpperCase())) {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const recipientId = pickFirst(req.query?.rid || req.body?.rid)
    const campaignId = pickFirst(req.query?.cid || req.body?.cid)
    const emailParam = normalizeEmail(pickFirst(req.query?.email || req.body?.email))
    const campaignNameParam = normalizeText(pickFirst(req.query?.cn || req.body?.cn), 180)
    const campaignSubjectParam = normalizeText(pickFirst(req.query?.cs || req.body?.cs), 220)
    const previewMode = isTruthyFlag(req.query?.preview || req.body?.preview)

    let resolvedEmail = emailParam
    let updated = false
    let sourceCampaignId: string | null = null
    let sourceCampaignName: string | null = campaignNameParam || null
    let sourceCampaignSubject: string | null = campaignSubjectParam || null
    let resolution: 'recipient' | 'email_fallback' | 'email_only' | 'none' = 'none'

    if (previewMode) {
      await prisma.analyticsEvent.create({
        data: {
          visitorId: `mkt_unsub_preview_${(resolvedEmail || 'unknown').slice(0, 20)}`,
          eventType: 'email_campaign_unsubscribe_preview',
          path: '/api/marketing/unsubscribe',
          metadata: {
            campaignId: campaignId || null,
            campaignName: sourceCampaignName,
            campaignSubject: sourceCampaignSubject,
            recipientId: recipientId || null,
            email: resolvedEmail || null,
            preview: true,
            updated: false,
            resolution: 'none',
          },
        },
      }).catch(() => null)

      const title = 'Preferencia actualizada'
      const message = 'Este correo es una vista previa y no modificó tu estado real de suscripción.'
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(renderResponsePage({ success: true, title, message }))
    }

    if (recipientId && campaignId) {
      const recipient = await prisma.marketingEmailRecipient.findFirst({
        where: { id: recipientId, campaignId },
        select: {
          id: true,
          email: true,
          status: true,
          campaignId: true,
          campaign: { select: { id: true, name: true, subject: true } },
        },
      })
      if (recipient) {
        resolution = 'recipient'
        resolvedEmail = normalizeEmail(recipient.email) || resolvedEmail
        sourceCampaignId = recipient.campaignId || sourceCampaignId
        sourceCampaignName = recipient.campaign?.name || sourceCampaignName
        sourceCampaignSubject = recipient.campaign?.subject || sourceCampaignSubject
        if (recipient.status !== 'unsubscribed') {
          await prisma.marketingEmailRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'unsubscribed',
              failureReason: 'No interesado (opt-out)',
            },
          })
          updated = true
        }
      }
    }

    const canFallbackByEmail = !recipientId || !campaignId
    if (!updated && resolvedEmail && canFallbackByEmail) {
      const latestForEmail = await resolveRecipientByEmail(resolvedEmail)
      if (latestForEmail) {
        resolution = 'email_fallback'
        sourceCampaignId = latestForEmail.campaignId || sourceCampaignId
        sourceCampaignName = sourceCampaignName || latestForEmail.campaign?.name || null
        sourceCampaignSubject = sourceCampaignSubject || latestForEmail.campaign?.subject || null
      }
      if (latestForEmail && latestForEmail.status !== 'unsubscribed') {
        await prisma.marketingEmailRecipient.update({
          where: { id: latestForEmail.id },
          data: {
            status: 'unsubscribed',
            failureReason: 'No interesado (opt-out)',
          },
        })
        updated = true
      }
    }

    if (resolution === 'none' && resolvedEmail) {
      resolution = 'email_only'
    }

    if (resolvedEmail) {
      await prisma.marketingEmailRecipient.updateMany({
        where: {
          email: resolvedEmail,
          status: 'pending',
        },
        data: {
          status: 'unsubscribed',
          failureReason: 'No interesado (opt-out)',
        },
      }).catch(() => null)
    }

    await prisma.analyticsEvent.create({
      data: {
        visitorId: `mkt_unsub_${(recipientId || resolvedEmail || 'unknown').slice(0, 20)}`,
        eventType: 'email_campaign_unsubscribe',
        path: '/api/marketing/unsubscribe',
        metadata: {
          campaignId: sourceCampaignId || campaignId || null,
          campaignName: sourceCampaignName,
          campaignSubject: sourceCampaignSubject,
          recipientId: recipientId || null,
          email: resolvedEmail || null,
          preview: false,
          resolution,
          updated,
        },
      },
    }).catch(() => null)

    const success = Boolean(updated || resolvedEmail)
    const title = success ? 'Preferencia actualizada' : 'No pudimos procesar tu solicitud'
    const message = success
      ? 'Hemos registrado tu elección de "No estoy interesado". No volverás a recibir campañas de este tipo.'
      : 'Este enlace no es válido o ya expiró. Si necesitas ayuda, responde al correo recibido y te asistimos.'

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(success ? 200 : 400).send(renderResponsePage({ success, title, message }))
  } catch (error) {
    console.error('api/marketing/unsubscribe error', error)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(500).send(renderResponsePage({
      success: false,
      title: 'No fue posible registrar la baja',
      message: 'Tuvimos un inconveniente al procesar esta solicitud. Inténtalo nuevamente más tarde.',
    }))
  }
}
