import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../_lib/prisma.js'
import { requireAdminSession } from '../_lib/admin-auth.js'

function normalizeId(input: unknown) {
  const value = String(input || '').trim()
  return value || null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const session = requireAdminSession(req, res)
  if (!session) return

  try {
    const campaignId = normalizeId(req.query?.id)

    if (campaignId) {
      const campaign = await prisma.marketingEmailCampaign.findUnique({
        where: { id: campaignId },
        include: {
          recipients: {
            orderBy: [
              { sentAt: 'desc' },
              { createdAt: 'desc' },
            ],
            select: {
              id: true,
              email: true,
              status: true,
              sentAt: true,
              openedAt: true,
              lastOpenedAt: true,
              openCount: true,
              failureReason: true,
            },
          },
        },
      })

      if (!campaign) {
        return res.status(404).json({ ok: false, error: 'Campaign not found' })
      }

      return res.status(200).json({
        ok: true,
        item: {
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          preheader: campaign.preheader,
          templateId: campaign.templateId,
          bodyText: campaign.bodyText,
          ctaLabel: campaign.ctaLabel,
          ctaHref: campaign.ctaHref,
          renderedHtml: campaign.renderedHtml,
          renderedText: campaign.renderedText,
          fromName: campaign.fromName,
          fromEmail: campaign.fromEmail,
          previewOnly: campaign.previewOnly,
          sentCount: campaign.sentCount,
          failedCount: campaign.failedCount,
          createdAt: campaign.createdAt.toISOString(),
          updatedAt: campaign.updatedAt.toISOString(),
          recipients: campaign.recipients.map((recipient) => ({
            id: recipient.id,
            email: recipient.email,
            status: recipient.status,
            sentAt: recipient.sentAt ? recipient.sentAt.toISOString() : null,
            openedAt: recipient.openedAt ? recipient.openedAt.toISOString() : null,
            lastOpenedAt: recipient.lastOpenedAt ? recipient.lastOpenedAt.toISOString() : null,
            openCount: recipient.openCount,
            failureReason: recipient.failureReason,
          })),
        },
      })
    }

    const campaigns = await prisma.marketingEmailCampaign.findMany({
      where: { previewOnly: false },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        name: true,
        subject: true,
        templateId: true,
        fromName: true,
        createdAt: true,
        sentCount: true,
        failedCount: true,
        _count: {
          select: { recipients: true },
        },
        recipients: {
          take: 12,
          orderBy: { createdAt: 'asc' },
          select: {
            email: true,
            status: true,
            openedAt: true,
          },
        },
      },
    })

    return res.status(200).json({
      ok: true,
      items: campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        templateId: campaign.templateId,
        fromName: campaign.fromName,
        createdAt: campaign.createdAt.toISOString(),
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        recipientCount: campaign._count.recipients,
        recipientPreview: campaign.recipients.map((recipient) => recipient.email),
      })),
    })
  } catch (error) {
    console.error('api/admin/marketing-campaigns error', error)
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unable to load campaigns' })
  }
}
