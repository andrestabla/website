import { getAdminSession } from './admin-auth.js'

type VercelRequest = any

/**
 * Estado de acceso al módulo Project Control. Reutiliza la sesión firmada del
 * sitio (cookie admin_session). Acceso permitido a SUPERADMIN/ADMIN o a cualquier
 * usuario con el permiso de módulo 'PROJECT_CONTROL' (gestionado en /admin/users).
 */
export function pcSessionState(req: VercelRequest) {
  const session = getAdminSession(req)
  const allowed =
    !!session &&
    (session.role === 'SUPERADMIN' ||
      session.role === 'ADMIN' ||
      (session.permissions && (session.permissions as Record<string, boolean>).PROJECT_CONTROL === true))
  return { session, allowed }
}
