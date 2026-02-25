type VercelRequest = any

export function getGeoFromRequest(req: VercelRequest) {
  const headers = req.headers || {}
  const header = (name: string) => {
    const value = headers[name] ?? headers[name.toLowerCase()]
    return typeof value === 'string' ? value : undefined
  }
  return {
    country: header('x-vercel-ip-country') || header('cf-ipcountry') || undefined,
    region: header('x-vercel-ip-country-region') || undefined,
    city: header('x-vercel-ip-city') || undefined,
  }
}

export function getClientIp(req: VercelRequest) {
  const xff = req.headers?.['x-forwarded-for']
  if (typeof xff === 'string' && xff) return xff.split(',')[0]?.trim()
  return undefined
}

export function safeString(value: unknown, max = 500) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, max)
}

export function safeInt(value: unknown) {
  const num = Number(value)
  if (!Number.isFinite(num)) return undefined
  return Math.max(0, Math.round(num))
}

