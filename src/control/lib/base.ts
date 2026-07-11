/**
 * Enrutado del módulo Project Control.
 *
 * Vive siempre bajo /control en el dominio principal. La vista pública de un
 * tablero compartido cuelga de /board/:token (sin login).
 */
export const CONTROL_BASE = '/control'
export const CONTROL_HOME = CONTROL_BASE

/** Construye una ruta absoluta del módulo respetando la base. */
export function controlPath(path = ''): string {
  if (!path || path === '/') return CONTROL_BASE
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${CONTROL_BASE}${clean}`
}

/** URL absoluta (con host) del enlace público de un tablero. */
export function publicBoardUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/board/${token}`
}
