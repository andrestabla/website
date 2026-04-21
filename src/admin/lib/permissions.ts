export const ADMIN_MODULES = [
  'DASHBOARD',
  'SITE_BUILDER',
  'SERVICES',
  'PRODUCTS',
  'LEADS',
  'DESIGN',
  'SEO',
  'MARKETING',
  'ANALYTICS',
  'INTEGRATIONS',
  'SETTINGS',
  'USERS',
  'BOOKINGS',
] as const

export type AdminModuleKey = (typeof ADMIN_MODULES)[number]
export type AdminRoleKey = 'SUPERADMIN' | 'ADMIN' | 'EDITOR' | 'ANALYST'
export type AdminPermissionMap = Record<AdminModuleKey, boolean>

export const ADMIN_MODULE_LABELS: Record<AdminModuleKey, string> = {
  DASHBOARD: 'Dashboard',
  SITE_BUILDER: 'Site Builder',
  SERVICES: 'Servicios',
  PRODUCTS: 'Productos',
  LEADS: 'Contactos',
  DESIGN: 'Diseño Global',
  SEO: 'SEO Manager',
  MARKETING: 'Marketing',
  ANALYTICS: 'Analítica',
  INTEGRATIONS: 'Integraciones',
  SETTINGS: 'Configuración',
  USERS: 'Usuarios',
  BOOKINGS: 'Citas',
}

function emptyPermissionMap() {
  return ADMIN_MODULES.reduce((acc, module) => {
    acc[module] = false
    return acc
  }, {} as AdminPermissionMap)
}

export function defaultPermissionsForRole(role: AdminRoleKey): AdminPermissionMap {
  const map = emptyPermissionMap()
  if (role === 'SUPERADMIN') {
    for (const module of ADMIN_MODULES) map[module] = true
    return map
  }
  if (role === 'ADMIN') {
    for (const module of ADMIN_MODULES) map[module] = true
    return map
  }
  if (role === 'EDITOR') {
    map.DASHBOARD = true
    map.SITE_BUILDER = true
    map.SERVICES = true
    map.PRODUCTS = true
    map.LEADS = true
    map.DESIGN = true
    map.SEO = true
    map.MARKETING = true
    return map
  }
  map.DASHBOARD = true
  map.LEADS = true
  map.ANALYTICS = true
  return map
}

export function normalizePermissions(
  rawPermissions: unknown,
  role: AdminRoleKey
): AdminPermissionMap {
  const map = defaultPermissionsForRole(role)
  if (!rawPermissions || typeof rawPermissions !== 'object') return map
  const record = rawPermissions as Record<string, unknown>
  for (const module of ADMIN_MODULES) {
    if (Object.prototype.hasOwnProperty.call(record, module)) {
      map[module] = record[module] === true
    }
  }
  return map
}

const ROUTE_MODULES: Array<{ prefix: string; module: AdminModuleKey }> = [
  { prefix: '/admin/dashboard', module: 'DASHBOARD' },
  { prefix: '/admin/site-builder', module: 'SITE_BUILDER' },
  { prefix: '/admin/home/editor', module: 'SITE_BUILDER' },
  { prefix: '/admin/site-builder/editor', module: 'SITE_BUILDER' },
  { prefix: '/admin/services', module: 'SERVICES' },
  { prefix: '/admin/products', module: 'PRODUCTS' },
  { prefix: '/admin/leads', module: 'LEADS' },
  { prefix: '/admin/design', module: 'DESIGN' },
  { prefix: '/admin/seo', module: 'SEO' },
  { prefix: '/admin/marketing', module: 'MARKETING' },
  { prefix: '/admin/analytics', module: 'ANALYTICS' },
  { prefix: '/admin/integrations', module: 'INTEGRATIONS' },
  { prefix: '/admin/settings', module: 'SETTINGS' },
  { prefix: '/admin/users', module: 'USERS' },
  { prefix: '/admin/bookings', module: 'BOOKINGS' },
]

export function getAdminModuleForPath(pathname: string): AdminModuleKey | null {
  for (const rule of ROUTE_MODULES) {
    if (pathname.startsWith(rule.prefix)) return rule.module
  }
  return null
}

export function canAccessModule(
  user: { role: string; username?: string; permissions?: unknown } | null | undefined,
  module: AdminModuleKey
) {
  if (!user) return false
  const role = String(user.role || '') as AdminRoleKey
  if (role === 'SUPERADMIN') return true
  const primaryAdminUsername = (import.meta.env.VITE_ADMIN_PRIMARY_USERNAME || 'admin').trim().toLowerCase()
  const normalizedUsername = String(user.username || '').trim().toLowerCase()
  if (module === 'USERS' && normalizedUsername && normalizedUsername === primaryAdminUsername) return true
  const permissions = normalizePermissions(user.permissions, role === 'ADMIN' || role === 'EDITOR' || role === 'ANALYST' ? role : 'ANALYST')
  return permissions[module] === true
}
