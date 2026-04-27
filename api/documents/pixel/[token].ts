import { prisma } from '../../_lib/prisma.js'

type VercelRequest = any
type VercelResponse = any

// 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = String(req.query?.token || req.params?.token || '')

    if (token) {
      const share = await prisma.docShare.findUnique({ where: { shareToken: token } })
      if (share) {
        const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
        const userAgent = String(req.headers?.['user-agent'] || '')
        const country = String(req.headers?.['x-vercel-ip-country'] || '')
        await prisma.docShareEvent.create({
          data: { shareId: share.id, eventType: 'EMAIL_OPENED', ipAddress: ip, userAgent, country },
        }).catch(() => {})
      }
    }
  } catch {
    // Silently ignore tracking errors
  }

  res.setHeader('Content-Type', 'image/gif')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  return res.status(200).send(PIXEL)
}
