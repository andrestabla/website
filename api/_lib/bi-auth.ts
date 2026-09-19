import { getLiveAdminSession } from './admin-auth.js'

type VercelRequest = any

/**
 * Estado de acceso al módulo BI. Reutiliza la sesión firmada del sitio
 * (cookie admin_session), pero el permiso se relee de la base de datos en cada
 * petición: lo que se guarde en /admin/users aplica de inmediato. Acceso
 * permitido a SUPERADMIN/ADMIN o a quien tenga el módulo 'BI'.
 */
export async function biSessionState(req: VercelRequest) {
  const session = await getLiveAdminSession(req)
  const allowed =
    !!session &&
    (session.role === 'SUPERADMIN' ||
      session.role === 'ADMIN' ||
      (session.permissions && (session.permissions as Record<string, boolean>).BI === true))
  return { session, allowed }
}
