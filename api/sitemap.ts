import { prisma } from './_lib/prisma.js'
import { CAMPAIGN_LANDINGS_SNAPSHOT_ID, sanitizeCampaignLandingsSnapshot } from './_lib/campaign-landings.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

type CmsSnapshotData = {
  site?: {
    url?: string
  }
  siteArchitecture?: {
    pages?: Array<{
      status?: string
      path?: string
    }>
  }
  services?: Array<{
    slug?: string
  }>
  products?: Array<{
    slug?: string
  }>
}

const CMS_ID = 'main'

type SitemapUrl = {
  path: string
  lastmod: string
  changefreq: 'daily' | 'weekly' | 'monthly'
  priority: string
}

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

function normalizePath(input: string) {
  const raw = String(input || '').trim()
  if (!raw) return '/'
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`
  if (withSlash === '/') return '/'
  return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash
}

function isIndexablePath(path: string) {
  const normalized = normalizePath(path)
  if (normalized === '/' || normalized === '/inicio') return false
  if (!normalized.startsWith('/')) return false
  if (normalized.startsWith('/admin')) return false
  if (normalized.startsWith('/api')) return false
  if (normalized.includes('/:') || normalized.includes('*') || normalized.includes('[') || normalized.includes(':')) return false
  return true
}

function toAbsoluteUrl(baseUrl: string, path: string) {
  const normalizedPath = normalizePath(path)
  return `${baseUrl}${normalizedPath}`
}

function xmlEscape(input: string) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function inferPriority(path: string) {
  const normalized = normalizePath(path)
  if (normalized === '/empresas' || normalized === '/educacion') return '1.0'
  if (normalized.startsWith('/servicios/') || normalized.startsWith('/productos/')) return '0.8'
  if (normalized.startsWith('/campanias/')) return '0.7'
  if (normalized.startsWith('/protocolos/')) return '0.6'
  if (normalized === '/politica-tratamiento-datos') return '0.3'
  return '0.7'
}

function inferChangefreq(path: string): SitemapUrl['changefreq'] {
  const normalized = normalizePath(path)
  if (normalized === '/empresas' || normalized === '/educacion') return 'daily'
  if (normalized.startsWith('/campanias/')) return 'weekly'
  return 'weekly'
}

function createXml(urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }>) {
  const rows = urls
    .map((url) => {
      return [
        '<url>',
        `<loc>${xmlEscape(url.loc)}</loc>`,
        `<lastmod>${xmlEscape(url.lastmod)}</lastmod>`,
        `<changefreq>${xmlEscape(url.changefreq)}</changefreq>`,
        `<priority>${xmlEscape(url.priority)}</priority>`,
        '</url>',
      ].join('')
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}</urlset>`
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (_req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).send('Method not allowed')
  }

  try {
    const [cmsSnapshot, campaignSnapshot] = await Promise.all([
      prisma.cmsSnapshot.findUnique({ where: { id: CMS_ID } }),
      prisma.cmsSnapshot.findUnique({ where: { id: CAMPAIGN_LANDINGS_SNAPSHOT_ID } }),
    ])

    const cmsData = (cmsSnapshot?.data || {}) as CmsSnapshotData
    const baseUrl = normalizeBaseUrl(String(cmsData?.site?.url || process.env.SITE_URL || 'https://www.algoritmot.com'))
    const lastmodFallback = (cmsSnapshot?.updatedAt || new Date()).toISOString()

    const byPath = new Map<string, SitemapUrl>()
    const put = (entry: SitemapUrl) => {
      const normalizedPath = normalizePath(entry.path)
      if (!isIndexablePath(normalizedPath)) return
      if (!byPath.has(normalizedPath)) {
        byPath.set(normalizedPath, { ...entry, path: normalizedPath })
      }
    }

    const staticPaths = [
      '/empresas',
      '/educacion',
      '/plataformas-de-aprendizaje',
      '/virtualizacion-programas',
      '/auditoria-programas-virtuales',
      '/generador-casos',
      '/landing-servicios',
      '/politica-tratamiento-datos',
      '/protocolos/ingenieria-humana',
      '/protocolos/despliegue-ia',
      '/protocolos/madurez-organica',
    ]
    for (const path of staticPaths) {
      put({
        path,
        lastmod: lastmodFallback,
        changefreq: inferChangefreq(path),
        priority: inferPriority(path),
      })
    }

    const pages = Array.isArray(cmsData?.siteArchitecture?.pages) ? cmsData.siteArchitecture.pages : []
    for (const page of pages) {
      if (String(page?.status || '') !== 'published') continue
      const path = normalizePath(String(page?.path || ''))
      put({
        path,
        lastmod: lastmodFallback,
        changefreq: inferChangefreq(path),
        priority: inferPriority(path),
      })
    }

    const services = Array.isArray(cmsData?.services) ? cmsData.services : []
    for (const service of services) {
      const slug = String(service?.slug || '').trim()
      if (!slug) continue
      const path = `/servicios/${slug}`
      put({
        path,
        lastmod: lastmodFallback,
        changefreq: inferChangefreq(path),
        priority: inferPriority(path),
      })
    }

    const products = Array.isArray(cmsData?.products) ? cmsData.products : []
    for (const product of products) {
      const slug = String(product?.slug || '').trim()
      if (!slug) continue
      const path = `/productos/${slug}`
      put({
        path,
        lastmod: lastmodFallback,
        changefreq: inferChangefreq(path),
        priority: inferPriority(path),
      })
    }

    const campaigns = sanitizeCampaignLandingsSnapshot(campaignSnapshot?.data).items
      .filter((item) => item.status === 'published')
    for (const item of campaigns) {
      const path = `/campanias/${item.slug}`
      put({
        path,
        lastmod: item.updatedAt || lastmodFallback,
        changefreq: 'weekly',
        priority: inferPriority(path),
      })
    }

    const urls = Array.from(byPath.values())
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((entry) => ({
        loc: toAbsoluteUrl(baseUrl, entry.path),
        lastmod: entry.lastmod,
        changefreq: entry.changefreq,
        priority: entry.priority,
      }))

    const xml = createXml(urls)
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(xml)
  } catch (error) {
    console.error('api/sitemap error', error)
    return res.status(500).send('Unable to generate sitemap')
  }
}
