/**
 * Learning Builder · la puerta de un enlace protegido por código.
 *
 * Cuando un recurso se comparte con código, no basta con pedirlo en la
 * página: sus archivos —el HTML del paquete, sus imágenes— se piden por su
 * propia ruta, y si esa ruta no exigiera lo mismo, bastaría con pedir
 * directamente `…/a/index.html` para saltarse el código. La comprobación vive
 * aquí para que la página y los archivos no puedan divergir.
 *
 * La prueba de haber acertado es un HMAC del código guardado en una cookie:
 * ni el código ni nada reversible viajan de vuelta al navegador.
 */
import crypto from 'node:crypto'

type VercelRequest = any

/** 12 horas: suficiente para una sesión de estudio sin volver a pedir el código. */
export const ACCESS_TTL_SECONDS = 60 * 60 * 12

function secret(): string {
  const configured = process.env.ADMIN_SESSION_SECRET
  if (configured && configured.trim()) return configured
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
    throw new Error('Missing ADMIN_SESSION_SECRET')
  }
  return 'algoritmot-admin-session-dev-secret'
}

/** Prueba de que este visitante ya acertó el código de este recurso. */
export function accessToken(publicId: string, code: string): string {
  return crypto.createHmac('sha256', secret()).update(`lb-access:${publicId}:${code}`).digest('base64url')
}

export function cookieName(publicId: string): string {
  return `lb_a_${publicId.replace(/[^A-Za-z0-9]/g, '')}`
}

export function readCookie(req: VercelRequest, name: string): string {
  const raw = req.headers?.cookie
  if (!raw || typeof raw !== 'string') return ''
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return ''
}

/** ¿Trae ya la prueba de haber acertado el código de este recurso? */
export function hasAccess(req: VercelRequest, publicId: string, shareCode: string | null): boolean {
  if (!shareCode) return false
  return readCookie(req, cookieName(publicId)) === accessToken(publicId, shareCode)
}

/** La cookie que se deja al acertar. */
export function accessCookie(publicId: string, code: string): string {
  const parts = [
    `${cookieName(publicId)}=${encodeURIComponent(accessToken(publicId, code))}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${ACCESS_TTL_SECONDS}`,
  ]
  if (process.env.VERCEL_ENV || process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}
