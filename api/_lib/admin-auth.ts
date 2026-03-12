import crypto from 'node:crypto'
import { ADMIN_MODULES, getDefaultPermissionMapForRole, type AdminModuleKey } from './admin-users.js'

type VercelRequest = any
type VercelResponse = any

const COOKIE_NAME = 'admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12

function isDeployedEnvironment() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview'
  )
}

type SessionPayload = {
  sub: 'admin'
  userId: string
  username: string
  displayName: string
  role: 'SUPERADMIN' | 'ADMIN' | 'EDITOR' | 'ANALYST'
  permissions?: Partial<Record<AdminModuleKey, boolean>>
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
  const configuredSecret = process.env.ADMIN_SESSION_SECRET
  if (configuredSecret && configuredSecret.trim()) return configuredSecret
  if (isDeployedEnvironment()) {
    throw new Error('Missing required env var ADMIN_SESSION_SECRET for admin auth')
  }
  return 'algoritmot-admin-session-dev-secret'
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
  & { permissions?: Partial<Record<AdminModuleKey, boolean>> }

function sanitizePermissionPayload(
  value: unknown
): Partial<Record<AdminModuleKey, boolean>> | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const normalized: Partial<Record<AdminModuleKey, boolean>> = {}
  let hasAny = false
  for (const module of ADMIN_MODULES) {
    if (Object.prototype.hasOwnProperty.call(record, module)) {
      normalized[module] = record[module] === true
      hasAny = true
    }
  }
  return hasAny ? normalized : undefined
}

function inferModuleFromRequest(req: VercelRequest): AdminModuleKey | null {
  const rawUrl = typeof req.url === 'string' ? req.url : ''
  const path = rawUrl.split('?')[0] || ''
  if (!path) return null

  if (path === '/api/admin/login' || path === '/api/admin/logout' || path === '/api/admin/session' || path === '/api/admin/account-setup') {
    return null
  }
  if (path === '/api/admin/navigation-log') return null
  if (path.startsWith('/api/admin/users')) return 'USERS'
  if (path.startsWith('/api/admin/leads')) return 'LEADS'
  if (path.startsWith('/api/admin/seo')) return 'SEO'
  if (path.startsWith('/api/admin/marketing') || path.startsWith('/api/admin/ai-copy') || path.startsWith('/api/admin/ai-email') || path.startsWith('/api/admin/email-campaign') || path.startsWith('/api/admin/campaign-landings') || path.startsWith('/api/admin/ai-landing') || path.startsWith('/api/admin/accessibility-scan')) return 'MARKETING'
  if (path.startsWith('/api/admin/integrations') || path.startsWith('/api/admin/smtp-test') || path.startsWith('/api/integrations')) return 'INTEGRATIONS'
  if (path.startsWith('/api/admin/design') || path.startsWith('/api/admin/upload')) return 'DESIGN'
  if (path.startsWith('/api/admin-metrics')) return 'ANALYTICS'
  if (path.startsWith('/api/cms') || path.startsWith('/api/cms-prewarm')) return 'SITE_BUILDER'
  return null
}

export function canAccessAdminModule(session: SessionPayload, module: AdminModuleKey) {
  if (session.role === 'SUPERADMIN') return true
  const tokenPermissions = session.permissions || undefined
  if (tokenPermissions && Object.prototype.hasOwnProperty.call(tokenPermissions, module)) {
    return tokenPermissions[module] === true
  }
  const fallback = getDefaultPermissionMapForRole(session.role)
  return fallback[module] === true
}

export function createAdminSessionToken(input: CreateSessionInput) {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    sub: 'admin',
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    ...input,
    permissions: sanitizePermissionPayload(input.permissions),
  }
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
    payload.permissions = sanitizePermissionPayload(payload.permissions)
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
  if (isDeployedEnvironment()) {
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

  const module = inferModuleFromRequest(req)
  if (module && !canAccessAdminModule(session, module)) {
    res.status(403).json({
      ok: false,
      error: `Sin permisos para el módulo ${module}`,
      module,
    })
    return null
  }

  return session
}
