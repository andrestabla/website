import { VercelRequest, VercelResponse } from '@vercel/node'
import { google } from 'googleapis'
import { prisma } from '../../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from '../../_lib/integrations.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query

  if (!code || typeof code !== 'string') {
    return res.redirect('/admin/bookings?error=missing_code')
  }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect('/admin/bookings?error=missing_env_vars')
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${process.env.SITE_URL || 'https://www.algoritmot.com'}/api/admin/google-calendar/callback`
  )

  try {
    const { tokens } = await oauth2Client.getToken(code)
    
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()
    const connectedEmail = userInfo.data.email

    // Update integrations snapshot
    const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
    const integrations = sanitizeIntegrations(snapshot?.data)

    if (tokens.refresh_token) {
      integrations.google_calendar.config.refreshToken = tokens.refresh_token
    }
    
    integrations.google_calendar.config.calendarId = connectedEmail || 'primary'
    integrations.google_calendar.enabled = true
    integrations.google_calendar.status = 'configured'

    await prisma.cmsSnapshot.upsert({
      where: { id: INTEGRATIONS_SNAPSHOT_ID },
      create: { id: INTEGRATIONS_SNAPSHOT_ID, data: integrations as any },
      update: { data: integrations as any },
    })

    return res.redirect('/admin/bookings?success=google_connected')
  } catch (error) {
    console.error('Error in Google Calendar callback:', error)
    return res.redirect('/admin/bookings?error=oauth_failed')
  }
}
