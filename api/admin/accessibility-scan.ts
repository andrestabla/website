import { requireAdminSession } from '../_lib/admin-auth.js'

type VercelRequest = any
type VercelResponse = any

type Finding = {
  id: string
  severity: 'high' | 'medium' | 'low'
  message: string
  count: number
  samples?: string[]
}

function stripTags(input: string) {
  return input.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const session = requireAdminSession(req, res)
  if (!session) return

  try {
    const path = String(req.query?.path || '/').trim()
    const safePath = path.startsWith('/') ? path : '/'
    const host = String(req.headers?.host || '').trim()
    const forwardedProto = String(req.headers?.['x-forwarded-proto'] || '').trim()
    const proto = forwardedProto || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https')
    if (!host) return res.status(400).json({ ok: false, error: 'Missing host header' })

    const targetUrl = `${proto}://${host}${safePath}`
    const response = await fetch(targetUrl)
    const html = await response.text()
    if (!response.ok) {
      return res.status(400).json({ ok: false, error: `Unable to fetch target (${response.status})` })
    }

    const findings: Finding[] = []

    const imgWithoutAlt = [...html.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/gi)].map((match) => match[0].slice(0, 160))
    if (imgWithoutAlt.length > 0) {
      findings.push({
        id: 'img-alt',
        severity: 'high',
        message: 'Se detectaron imágenes sin atributo alt.',
        count: imgWithoutAlt.length,
        samples: imgWithoutAlt.slice(0, 3),
      })
    }

    const buttonMatches = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)]
    const emptyButtons = buttonMatches
      .filter((m) => {
        const attrs = m[1] || ''
        const content = stripTags(m[2] || '')
        const hasAria = /\baria-label=|\btitle=/i.test(attrs)
        return !content && !hasAria
      })
      .map((m) => `<button${m[1]}>...</button>`.slice(0, 160))
    if (emptyButtons.length > 0) {
      findings.push({
        id: 'button-name',
        severity: 'high',
        message: 'Hay botones sin texto visible ni aria-label/title.',
        count: emptyButtons.length,
        samples: emptyButtons.slice(0, 3),
      })
    }

    const linkMatches = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    const emptyLinks = linkMatches
      .filter((m) => {
        const attrs = m[1] || ''
        const content = stripTags(m[2] || '')
        const hasAria = /\baria-label=|\btitle=/i.test(attrs)
        return !content && !hasAria
      })
      .map((m) => `<a${m[1]}>...</a>`.slice(0, 160))
    if (emptyLinks.length > 0) {
      findings.push({
        id: 'link-name',
        severity: 'medium',
        message: 'Hay enlaces sin texto visible ni aria-label/title.',
        count: emptyLinks.length,
        samples: emptyLinks.slice(0, 3),
      })
    }

    const headingLevels = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]))
    let headingJumps = 0
    for (let i = 1; i < headingLevels.length; i++) {
      if (headingLevels[i] - headingLevels[i - 1] > 1) headingJumps += 1
    }
    if (headingJumps > 0) {
      findings.push({
        id: 'heading-order',
        severity: 'low',
        message: 'Se detectaron saltos de jerarquía en encabezados (ej. h2 -> h4).',
        count: headingJumps,
      })
    }

    const hasLangAttr = /<html\b[^>]*\blang=/i.test(html)
    if (!hasLangAttr) {
      findings.push({
        id: 'html-lang',
        severity: 'medium',
        message: 'El documento no declara atributo lang en <html>.',
        count: 1,
      })
    }

    return res.status(200).json({
      ok: true,
      targetUrl,
      score: Math.max(0, 100 - findings.reduce((acc, item) => acc + (item.severity === 'high' ? 20 : item.severity === 'medium' ? 10 : 5), 0)),
      findings,
    })
  } catch (error) {
    console.error('api/admin/accessibility-scan error', error)
    return res.status(500).json({ ok: false, error: 'Accessibility scan failed' })
  }
}
