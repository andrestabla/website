import { clearAdminSessionCookie, getAdminSession, resolveLiveSession } from '../_lib/admin-auth.js'

type VercelRequest = any
type VercelResponse = any

/**
 * Estado de la sesión para el sitio, el panel y el Ecosistema.
 *
 * El rol y los permisos salen de la base de datos, no de la cookie: cuando un
 * administrador guarda accesos en /admin/users, la siguiente lectura de este
 * endpoint ya devuelve el mapa nuevo. Si la cuenta fue suspendida o eliminada,
 * la sesión se cierra aquí mismo.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const token = getAdminSession(req)
  const session = await resolveLiveSession(token)

  if (token && !session) clearAdminSessionCookie(res)

  // La respuesta cambia en cuanto cambian los permisos: nunca se cachea.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')

  return res.status(200).json({
    ok: true,
    authenticated: !!session,
    user: session
      ? {
          id: session.userId,
          username: session.username,
          displayName: session.displayName,
          role: session.role,
          permissions: session.permissions || null,
        }
      : null,
  })
}
