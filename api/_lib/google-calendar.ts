import { google } from 'googleapis'
import { prisma } from './prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations, applyServerEnv } from './integrations.js'

async function getGoogleConfig() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data))
  return integrations.google_calendar.config
}

export async function createCalendarEvent({
  summary,
  description,
  startTime,
  endTime,
  userEmail,
  userName,
}: {
  summary: string
  description: string
  startTime: Date
  endTime: Date
  userEmail: string
  userName: string
}) {
  const config = await getGoogleConfig()
  
  const GOOGLE_CLIENT_ID = config.clientId || process.env.GOOGLE_CLIENT_ID || ''
  const GOOGLE_CLIENT_SECRET = config.clientSecret || process.env.GOOGLE_CLIENT_SECRET || ''
  const GOOGLE_REFRESH_TOKEN = config.refreshToken || process.env.GOOGLE_REFRESH_TOKEN || ''
  const GOOGLE_CALENDAR_ID = config.calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary'

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    console.warn('Google Calendar credentials not fully configured.')
    return null
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  try {
    const event = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody: {
        summary,
        description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
        attendees: [
          { email: userEmail, displayName: userName },
        ],
        conferenceData: {
          createRequest: {
            requestId: `meeting-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    })

    return event.data.id
  } catch (error) {
    console.error('Error creating Google Calendar event:', error)
    return null
  }
}
