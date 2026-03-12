import { prisma } from '../_lib/prisma.js'

type VercelRequest = any
type VercelResponse = any

const PIXEL_GIF = Buffer.from('R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64')

function pickFirst(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || '').trim()
  return String(value || '').trim()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const recipientId = pickFirst(req.query?.rid)
    const campaignId = pickFirst(req.query?.cid)

    if (recipientId && campaignId) {
      const now = new Date()
      await prisma.marketingEmailRecipient.updateMany({
        where: { id: recipientId, campaignId, openedAt: null, status: { not: 'unsubscribed' } },
        data: { openedAt: now },
      })
      await prisma.marketingEmailRecipient.updateMany({
        where: { id: recipientId, campaignId, status: { not: 'unsubscribed' } },
        data: {
          lastOpenedAt: now,
          openCount: { increment: 1 },
        },
      })

      await prisma.analyticsEvent.create({
        data: {
          visitorId: `mkt_${recipientId.slice(0, 12)}`,
          eventType: 'email_campaign_open',
          path: '/api/marketing/open',
          metadata: {
            campaignId,
            recipientId,
          },
        },
      }).catch(() => null)
    }
  } catch (error) {
    console.error('api/marketing/open error', error)
  }

  res.setHeader('Content-Type', 'image/gif')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  return res.status(200).send(PIXEL_GIF)
}
