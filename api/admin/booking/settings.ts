import { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../_lib/prisma.js'
import { requireAdminSession } from '../../_lib/admin-auth.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from '../../_lib/integrations.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = requireAdminSession(req, res)
  if (!admin) return

  if (req.method === 'GET') {
    try {
      const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
      const integrations = sanitizeIntegrations(snapshot?.data)
      return res.status(200).json({
        mandatoryGuests: integrations.google_calendar.config.mandatoryGuests || ''
      })
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { mandatoryGuests } = req.body
      const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
      const integrations = sanitizeIntegrations(snapshot?.data)
      
      integrations.google_calendar.config.mandatoryGuests = mandatoryGuests
      
      await prisma.cmsSnapshot.upsert({
        where: { id: INTEGRATIONS_SNAPSHOT_ID },
        update: { data: integrations as any },
        create: { id: INTEGRATIONS_SNAPSHOT_ID, data: integrations as any }
      })
      
      return res.status(200).json({ success: true })
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
