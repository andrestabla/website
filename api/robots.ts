import { prisma } from './_lib/prisma.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

type CmsSnapshotData = {
  site?: {
    url?: string
  }
}

const CMS_ID = 'main'

function normalizeBaseUrl(input: string) {
  const raw = String(input || '').trim()
  const fallback = 'https://www.algoritmot.com'
  if (!raw) return fallback
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const parsed = new URL(normalized)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return fallback
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).send('Method not allowed')
  }

  try {
    const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: CMS_ID }, select: { data: true } })
    const cmsData = (snapshot?.data || {}) as CmsSnapshotData
    const baseUrl = normalizeBaseUrl(String(cmsData?.site?.url || process.env.SITE_URL || 'https://www.algoritmot.com'))
    const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').toLowerCase()
    const isPreviewHost = host.includes('vercel.app') || host.startsWith('localhost')

    const body = isPreviewHost
      ? [
          'User-agent: *',
          'Disallow: /',
          '',
          `Sitemap: ${baseUrl}/sitemap.xml`,
        ].join('\n')
      : [
          'User-agent: *',
          'Allow: /',
          'Disallow: /admin/',
          'Disallow: /api/',
          '',
          `Sitemap: ${baseUrl}/sitemap.xml`,
        ].join('\n')

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(body)
  } catch (error) {
    console.error('api/robots error', error)
    return res.status(500).send('User-agent: *\nDisallow: /')
  }
}
