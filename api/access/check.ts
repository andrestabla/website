import { prisma } from '../_lib/prisma.js'
import { mergePermissionMapWithRows, type AdminModuleKey } from '../_lib/admin-users.js'

type VercelRequest = any
type VercelResponse = any

// Alias de plataforma → módulo/permiso. La llave del usuario es SIEMPRE el correo.
const PLATFORM_MODULE: Record<string, AdminModuleKey> = {
  profetabla: 'PROFE_TABLA',
  'profe-tabla': 'PROFE_TABLA',
  misproyectos: 'MIS_PROYECTOS',
  'mis-proyectos': 'MIS_PROYECTOS',
  bi: 'BI',
  'algoritmo-bi': 'BI',
  control: 'PROJECT_CONTROL',
  'project-control': 'PROJECT_CONTROL',
}

/**
 * Integración de acceso para plataformas hermanas (ProfeTabla, Mis Proyectos…).
 * Verifica, por CORREO, si un usuario tiene acceso a una plataforma.
 * Autenticación servidor-a-servidor mediante llave compartida (header x-access-key
 * o ?key=, contra la env ACCESS_API_KEY).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const configured = process.env.ACCESS_API_KEY
  if (!configured) return res.status(503).json({ ok: false, error: 'Access API not configured' })
  const provided = req.headers?.['x-access-key'] || req.query?.key
  if (!provided || String(provided) !== configured) return res.status(401).json({ ok: false, error: 'Unauthorized' })

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body) } catch { return {} } })() : (req.body ?? {})
  const email = String(req.query?.email ?? body.email ?? '').trim().toLowerCase()
  const platformRaw = String(req.query?.platform ?? body.platform ?? '').trim().toLowerCase()
  const module = PLATFORM_MODULE[platformRaw] || (platformRaw.toUpperCase() as AdminModuleKey)
  if (!email || !platformRaw) return res.status(400).json({ ok: false, error: 'email y platform requeridos' })

  try {
    const user = await (prisma as any).adminUser.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { permissions: true },
    })
    if (!user) return res.status(200).json({ ok: true, granted: false, reason: 'no-user' })
    if (!user.active || user.suspendedAt) return res.status(200).json({ ok: true, granted: false, reason: 'inactive' })

    const map = mergePermissionMapWithRows(user.role, user.permissions || [])
    const granted = map[module] === true || user.role === 'SUPERADMIN'
    return res.status(200).json({
      ok: true,
      granted,
      platform: platformRaw,
      user: { email: user.email, displayName: user.displayName, role: user.role },
    })
  } catch (error: any) {
    console.error('api/access/check error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
