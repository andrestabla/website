import { prisma } from './prisma.js'

/**
 * Permisos de un espacio/carpeta del Gestor Documental.
 *
 * Se persisten en `DocCategory.permissions` (Json). Forma canónica:
 *   { roles: string[]; userEmails: string[] }
 *
 * Compatibilidad: datos antiguos guardaban `[]` (array) → se interpreta como
 * "sin restricción" (abierto a todos los usuarios con acceso al módulo DOCUMENTS).
 *
 * Reglas:
 * - SUPERADMIN y ADMIN ven y gestionan TODOS los espacios (isDocAdmin ⇒ true).
 * - Un espacio SIN roles y SIN correos = abierto (visible para todos).
 * - Al añadir algún rol o correo, queda restringido a esos roles/correos.
 * - Las subcarpetas heredan del ancestro más cercano que tenga permisos propios.
 */
export type DocPermissions = { roles: string[]; userEmails: string[] }

type SessionLike = { role?: string | null }

export function isDocAdmin(session: SessionLike | null | undefined): boolean {
  const role = String(session?.role || '').toUpperCase()
  return role === 'SUPERADMIN' || role === 'ADMIN'
}

export function parseDocPermissions(json: unknown): DocPermissions {
  if (!json || Array.isArray(json)) return { roles: [], userEmails: [] }
  const obj = json as Record<string, unknown>
  const roles = Array.isArray(obj.roles)
    ? obj.roles.map((r) => String(r).toUpperCase().trim()).filter(Boolean)
    : []
  const userEmails = Array.isArray(obj.userEmails)
    ? obj.userEmails.map((e) => String(e).toLowerCase().trim()).filter(Boolean)
    : []
  return { roles, userEmails }
}

/** Normaliza una entrada de permisos recibida del cliente para persistir. */
export function sanitizeDocPermissionsInput(input: unknown): DocPermissions {
  return parseDocPermissions(input)
}

function isEmpty(p: DocPermissions): boolean {
  return p.roles.length === 0 && p.userEmails.length === 0
}

type CatLike = { id: string; parentId: string | null; permissions: unknown }

/**
 * Devuelve los permisos EFECTIVOS de una categoría: los propios si tiene, o los
 * del ancestro más cercano que tenga permisos. Si ninguno tiene → abierto (vacío).
 */
export function effectiveDocPermissions(
  category: CatLike,
  byId: Map<string, CatLike>,
): DocPermissions {
  let node: CatLike | undefined = category
  const guard = new Set<string>()
  while (node && !guard.has(node.id)) {
    guard.add(node.id)
    const perms = parseDocPermissions(node.permissions)
    if (!isEmpty(perms)) return perms
    node = node.parentId ? byId.get(node.parentId) : undefined
  }
  return { roles: [], userEmails: [] }
}

/** ¿Puede la sesión (rol + correo) acceder a esta categoría? */
export function canAccessDocCategory(
  session: SessionLike,
  userEmail: string | null,
  category: CatLike,
  byId: Map<string, CatLike>,
): boolean {
  if (isDocAdmin(session)) return true
  const perms = effectiveDocPermissions(category, byId)
  if (isEmpty(perms)) return true // abierto
  const role = String(session?.role || '').toUpperCase()
  if (role && perms.roles.includes(role)) return true
  const email = String(userEmail || '').toLowerCase().trim()
  if (email && perms.userEmails.includes(email)) return true
  return false
}

/** Poda una lista plana de categorías a las visibles para la sesión. */
export function filterVisibleCategories<T extends CatLike>(
  session: SessionLike,
  userEmail: string | null,
  categories: T[],
): T[] {
  if (isDocAdmin(session)) return categories
  const byId = new Map<string, CatLike>(categories.map((c) => [c.id, c]))
  return categories.filter((c) => canAccessDocCategory(session, userEmail, c, byId))
}

/** Resuelve el correo del usuario de la sesión (para matching por correo). */
export async function getSessionEmail(session: { userId?: string } | null): Promise<string | null> {
  const userId = session?.userId
  if (!userId) return null
  try {
    const user = await prisma.adminUser.findUnique({
      where: { id: String(userId) },
      select: { email: true },
    } as any)
    return user?.email ? String(user.email).toLowerCase().trim() : null
  } catch {
    return null
  }
}

/**
 * Verifica acceso a la categoría de un documento (para endpoints que operan sobre
 * un documento puntual). Carga el árbol necesario y aplica herencia. Admin ⇒ true.
 */
export async function canAccessDocumentCategory(
  session: { userId?: string; role?: string | null } | null,
  categoryId: string,
): Promise<boolean> {
  if (!session) return false
  if (isDocAdmin(session)) return true
  const [email, cats] = await Promise.all([
    getSessionEmail(session),
    prisma.docCategory.findMany({ select: { id: true, parentId: true, permissions: true } }),
  ])
  const byId = new Map<string, CatLike>(cats.map((c: any) => [c.id, c]))
  const target = byId.get(String(categoryId))
  if (!target) return false
  return canAccessDocCategory(session, email, target, byId)
}
