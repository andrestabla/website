import { getAdminSession } from './admin-auth.js'

type VercelRequest = any

/**
 * Estado de acceso al módulo BI. Reutiliza la sesión firmada del sitio
 * (cookie admin_session). Acceso permitido a SUPERADMIN/ADMIN o a cualquier
 * usuario con el permiso de módulo 'BI' (gestionado en /admin/users).
 */
export function biSessionState(req: VercelRequest) {
  const session = getAdminSession(req)
  const allowed =
    !!session &&
    (session.role === 'SUPERADMIN' ||
      session.role === 'ADMIN' ||
      (session.permissions && (session.permissions as Record<string, boolean>).BI === true))
  return { session, allowed }
}
