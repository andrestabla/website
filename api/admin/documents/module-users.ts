import { requireAdminSession } from '../../_lib/admin-auth.js'
import { listAdminUsers } from '../../_lib/admin-users.js'
import { isDocAdmin } from '../../_lib/doc-permissions.js'

type VercelRequest = any
type VercelResponse = any

/**
 * Lista los usuarios que actualmente tienen acceso al módulo "Documentos".
 * Se usa en el modal de permisos de un espacio para seleccionar/limitar accesos
 * por usuario. Solo administradores pueden consultarlo.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const session = requireAdminSession(req, res)
    if (!session) return
    if (!isDocAdmin(session)) {
      return res.status(403).json({ ok: false, error: 'Solo administradores' })
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    const users = await listAdminUsers()
    const data = users
      .filter((u: any) => u.active && (u.permissionsMap?.DOCUMENTS === true || u.role === 'SUPERADMIN' || u.role === 'ADMIN'))
      .map((u: any) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        email: u.email || null,
        role: u.role,
        isAdmin: u.role === 'SUPERADMIN' || u.role === 'ADMIN',
      }))

    return res.status(200).json({ ok: true, data })
  } catch (error) {
    console.error('api/admin/documents/module-users error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
