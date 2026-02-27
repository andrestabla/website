import { prisma } from './_lib/prisma.js'
import { getGeoFromRequest, safeString } from './_lib/analytics.js'

type VercelRequest = any
type VercelResponse = any

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function dispatchWebhook(payload: any): Promise<{ sent: boolean; status: number | undefined }> {
  const url = process.env.CONTACT_FORM_WEBHOOK_URL
  if (!url) return { sent: false, status: undefined }
  const secret = process.env.CONTACT_FORM_WEBHOOK_SECRET || ''
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-contact-form-secret': secret } : {}),
    },
    body: JSON.stringify(payload),
  })
  return { sent: response.ok, status: response.status }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const name = safeString(body?.name, 120) || ''
    const email = safeString(body?.email, 180) || ''
    const requirement = safeString(body?.requirement, 3000) || ''
    const context = safeString(body?.context, 40) || 'general'
    const serviceSlug = safeString(body?.serviceSlug, 120)
    const path = safeString(body?.path, 300)

    if (!name || !email || !requirement) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' })
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email' })
    }

    const geo = getGeoFromRequest(req)
    await prisma.analyticsEvent.create({
      data: {
        visitorId: safeString(body?.visitorId, 120) || `contact_${Date.now().toString(36)}`,
        sessionId: safeString(body?.sessionId, 120) || undefined,
        eventType: 'contact_form_submit',
        path: path || undefined,
        pageTitle: 'Contact Form',
        sectionId: 'contact-form',
        country: geo.country,
        region: geo.region,
        city: geo.city,
        metadata: {
          name,
          email,
          requirement,
          context,
          serviceSlug: serviceSlug || null,
        },
      },
    })

    let webhook = { sent: false as boolean, status: undefined as number | undefined }
    try {
      webhook = await dispatchWebhook({
        submittedAt: new Date().toISOString(),
        name,
        email,
        requirement,
        context,
        serviceSlug: serviceSlug || null,
        path: path || null,
        geo,
      })
    } catch {
      webhook = { sent: false, status: undefined }
    }

    return res.status(200).json({ ok: true, webhook })
  } catch (error) {
    console.error('api/contact-submit error', error)
    return res.status(500).json({ ok: false, error: 'Contact submit failed' })
  }
}
