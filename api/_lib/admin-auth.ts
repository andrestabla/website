import crypto from 'node:crypto'

type VercelRequest = any
type VercelResponse = any

const COOKIE_NAME = 'admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12

type SessionPayload = {
  sub: 'admin'
  userId: string
  username: string
  displayName: string
  role: 'SUPERADMIN' | 'ADMIN' | 'EDITOR' | 'ANALYST'
  exp: number
  iat: number
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.OPENAI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    'algoritmot-admin-session-dev-secret'
  )
}

function sign(data: string) {
  return crypto.createHmac('sha256', getSessionSecret()).update(data).digest('base64url')
}

function parseCookies(req: VercelRequest) {
  const raw = req.headers?.cookie
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== 'string') return out
  for (const part of raw.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (!name) continue
    out[name] = decodeURIComponent(rest.join('=') || '')
  }
  return out
}

type CreateSessionInput = Pick<SessionPayload, 'userId' | 'username' | 'displayName' | 'role'>

export function createAdminSessionToken(input: CreateSessionInput) {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = { sub: 'admin', iat: now, exp: now + SESSION_TTL_SECONDS, ...input }
  const encoded = base64UrlEncode(JSON.stringify(payload))
  return `${encoded}.${sign(encoded)}`
}

export function verifyAdminSessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== 'string') return null
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null
  if (sign(encoded) !== signature) return null
  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as SessionPayload
    if (payload.sub !== 'admin') return null
    if (!payload.userId || !payload.username || !payload.displayName || !payload.role) return null
    if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

function buildCookie(value: string, maxAgeSeconds: number) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
    parts.push('Secure')
  }
  return parts.join('; ')
}

export function setAdminSessionCookie(res: VercelResponse, token: string) {
  res.setHeader('Set-Cookie', buildCookie(token, SESSION_TTL_SECONDS))
}

export function clearAdminSessionCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', buildCookie('', 0))
}

export function getAdminSession(req: VercelRequest) {
  const cookies = parseCookies(req)
  return verifyAdminSessionToken(cookies[COOKIE_NAME])
}

export function requireAdminSession(req: VercelRequest, res: VercelResponse) {
  const session = getAdminSession(req)
  if (!session) {
    res.status(401).json({ ok: false, error: 'Unauthorized' })
    return null
  }
  return session
}
