import crypto from 'node:crypto'
import { prisma } from './_lib/prisma.js'
import { getGeoFromRequest, getClientIp, safeString } from './_lib/analytics.js'

type VercelRequest = any
type VercelResponse = any

function hashPolicy(policyText: string, policyVersion: string) {
  return crypto.createHash('sha256').update(`${policyVersion}\n${policyText}`).digest('hex')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const visitorId = safeString(body?.visitorId, 120)
    const sessionId = safeString(body?.sessionId, 120)
    const path = safeString(body?.path, 300)
    const policyVersion = safeString(body?.policyVersion, 50) || 'v1'
    const policyText = safeString(body?.policyText, 20000) || ''

    if (!visitorId) return res.status(400).json({ ok: false, error: 'visitorId is required' })
    if (!policyText) return res.status(400).json({ ok: false, error: 'policyText is required' })

    const geo = getGeoFromRequest(req)
    const ip = getClientIp(req)
    const userAgent = safeString(req.headers?.['user-agent'], 500)
    const policyHash = hashPolicy(policyText, policyVersion)

    await prisma.privacyConsentAcceptance.create({
      data: {
        visitorId,
        sessionId,
        policyVersion,
        policyHash,
        path,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        userAgent,
        metadata: { ip },
      },
    })

    return res.status(200).json({
      ok: true,
      acceptedAt: new Date().toISOString(),
      policyVersion,
      policyHash,
      geo,
    })
  } catch (error) {
    console.error('api/privacy-consent error', error)
    return res.status(500).json({ ok: false, error: 'Consent could not be recorded' })
  }
}

