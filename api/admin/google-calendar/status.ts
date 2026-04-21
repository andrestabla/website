import { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../_lib/prisma.js'
import { requireAdminSession } from '../../_lib/admin-auth.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from '../../_lib/integrations.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = requireAdminSession(req, res)
  if (!admin) return

  try {
    const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
    const integrations = sanitizeIntegrations(snapshot?.data)
    
    const config = integrations.google_calendar
    
    return res.status(200).json({
      enabled: config.enabled,
      status: config.status,
      connectedAccount: config.config.calendarId,
      hasRefreshToken: !!config.config.refreshToken,
      mandatoryGuests: config.config.mandatoryGuests || ''
    })
  } catch (error) {
    console.error('Error fetching Google Calendar status:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
