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
  'DOCUMENTS',
  'BI',
  'PROJECT_CONTROL',
  'COTIZADOR',
  'PROFE_TABLA',
  'MIS_PROYECTOS',
  'LICENCES',
  'ADMIN_BRIDGE',
] as const

export type AdminModuleKey = (typeof ADMIN_MODULES)[number]
export type AdminRoleKey = 'SUPERADMIN' | 'ADMIN' | 'EDITOR' | 'ANALYST'
export type AdminPermissionMap = Record<AdminModuleKey, boolean>

export const ADMIN_MODULE_LABELS: Record<AdminModuleKey, string> = {
  LICENCES: 'Licencias del plugin',
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
  DOCUMENTS: 'Gestor Documental',
  BI: 'Algoritmo BI',
  PROJECT_CONTROL: 'Project Control',
  COTIZADOR: 'Cotizador',
  PROFE_TABLA: 'ProfeTabla (externo)',
  MIS_PROYECTOS: 'Mis Proyectos (externo)',
  ADMIN_BRIDGE: 'Acceso puente (panel admin)',
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
    map.DOCUMENTS = true
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
  { prefix: '/admin/documentos', module: 'DOCUMENTS' },
  { prefix: '/ecosistema/cotizador', module: 'COTIZADOR' },
  { prefix: '/ecosistema/licencias', module: 'LICENCES' },
]

export function getAdminModuleForPath(pathname: string): AdminModuleKey | null {
  for (const rule of ROUTE_MODULES) {
    if (pathname.startsWith(rule.prefix)) return rule.module
  }
  return null
}

/** Roles con acceso al panel de administración completo. */
export const ADMIN_ROLES: AdminRoleKey[] = ['SUPERADMIN', 'ADMIN']

/**
 * Módulos de gestión del panel: solo SUPERADMIN/ADMIN. Los demás módulos
 * (LEADS, BOOKINGS, DOCUMENTS, ANALYTICS, BI, PROJECT_CONTROL, COTIZADOR) se gobiernan por
 * permiso y son accesibles a usuarios no-admin desde el Ecosistema.
 */
export const ADMIN_ONLY_MODULES: AdminModuleKey[] = [
  'DASHBOARD', 'SITE_BUILDER', 'SERVICES', 'PRODUCTS', 'DESIGN', 'SEO', 'MARKETING', 'INTEGRATIONS', 'SETTINGS', 'USERS', 'LICENCES',
]

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'SUPERADMIN' || role === 'ADMIN'
}

/** Acceso puente: un usuario no-admin al que se le permitió entrar al panel. */
export function hasAdminBridge(user: { role?: string; permissions?: unknown } | null | undefined): boolean {
  if (!user) return false
  if (isAdminRole(user.role)) return true
  const perms = user.permissions
  return !!(perms && typeof perms === 'object' && (perms as Record<string, unknown>).ADMIN_BRIDGE === true)
}

export function canAccessModule(
  user: { role: string; username?: string; permissions?: unknown } | null | undefined,
  module: AdminModuleKey
) {
  if (!user) return false
  const role = String(user.role || '') as AdminRoleKey
  if (role === 'SUPERADMIN') return true
  // Módulos de gestión: rol admin, o usuario con acceso puente. Los demás no.
  if (ADMIN_ONLY_MODULES.includes(module) && role !== 'ADMIN' && !hasAdminBridge(user)) return false
  const primaryAdminUsername = (import.meta.env.VITE_ADMIN_PRIMARY_USERNAME || 'admin').trim().toLowerCase()
  const normalizedUsername = String(user.username || '').trim().toLowerCase()
  if (module === 'USERS' && normalizedUsername && normalizedUsername === primaryAdminUsername) return true
  const permissions = normalizePermissions(user.permissions, role === 'ADMIN' || role === 'EDITOR' || role === 'ANALYST' ? role : 'ANALYST')
  return permissions[module] === true
}
