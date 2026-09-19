/**
 * Learning Builder · acceso al módulo y a cada workspace.
 *
 * Dos puertas, en este orden:
 *
 *  1. El permiso LEARNING_BUILDER de /admin/users abre el módulo. Se relee de
 *     la base en cada petición, así que quitarlo surte efecto de inmediato.
 *  2. Dentro del módulo manda el rol en el workspace (LbWorkspaceMember). Un
 *     mismo usuario puede ser gestor en un cliente e invitado en otro, y la
 *     capacidad concreta la decide la tabla compartida con la UI (roles.ts):
 *     lo que no se ve tampoco se puede llamar.
 *
 * SUPERADMIN y ADMIN entran a cualquier workspace como gestores.
 */
import { getLiveAdminSession } from './admin-auth.js'
import { prisma } from './prisma.js'
import { can, effectiveRole, isLbRole, type LbCapability, type LbRole } from '../../src/learning/lib/roles.js'

type VercelRequest = any
type VercelResponse = any

export type LbSession = {
  userId: string
  username: string
  displayName: string
  role: string
}

/** ¿Tiene el módulo abierto? No dice nada sobre workspaces concretos. */
export async function lbSessionState(req: VercelRequest): Promise<{ session: LbSession | null; allowed: boolean }> {
  const session = await getLiveAdminSession(req)
  const allowed =
    !!session &&
    (session.role === 'SUPERADMIN' ||
      session.role === 'ADMIN' ||
      (session.permissions && (session.permissions as Record<string, boolean>).LEARNING_BUILDER === true))
  return { session: (session as LbSession) || null, allowed: !!allowed }
}

/** Rol efectivo de este usuario en un workspace, o null si no pertenece. */
export async function roleInWorkspace(session: LbSession, workspaceId: string): Promise<LbRole | null> {
  const membership = await (prisma as any).lbWorkspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.userId } },
    select: { role: true },
  })
  const memberRole = isLbRole(membership?.role) ? membership.role : null
  return effectiveRole(session.role, memberRole)
}

/** Los workspaces que este usuario puede ver, con su rol en cada uno. */
export async function visibleWorkspaces(session: LbSession): Promise<Array<{ workspace: any; role: LbRole }>> {
  const isAdmin = session.role === 'SUPERADMIN' || session.role === 'ADMIN'
  if (isAdmin) {
    const all = await (prisma as any).lbWorkspace.findMany({ orderBy: { name: 'asc' } })
    return all.map((workspace: any) => ({ workspace, role: 'MANAGER' as LbRole }))
  }
  const memberships = await (prisma as any).lbWorkspaceMember.findMany({
    where: { userId: session.userId },
    include: { workspace: true },
    orderBy: { workspace: { name: 'asc' } },
  })
  return memberships
    .filter((membership: any) => membership.workspace && isLbRole(membership.role))
    .map((membership: any) => ({ workspace: membership.workspace, role: membership.role as LbRole }))
}

export type Guard =
  | { ok: true; session: LbSession; role: LbRole }
  | { ok: false; status: number; error: string }

/**
 * Puerta única de los endpoints: módulo abierto, pertenencia al workspace y
 * capacidad concreta. Devuelve el rol para que el handler no vuelva a mirarlo.
 */
export async function guard(
  req: VercelRequest,
  workspaceId: string,
  capability: LbCapability
): Promise<Guard> {
  const { session, allowed } = await lbSessionState(req)
  if (!session) return { ok: false, status: 401, error: 'Unauthenticated' }
  if (!allowed) return { ok: false, status: 403, error: 'Sin acceso a Learning Builder' }
  if (!workspaceId) return { ok: false, status: 400, error: 'Falta el workspace' }

  const role = await roleInWorkspace(session, workspaceId)
  if (!role) return { ok: false, status: 403, error: 'No perteneces a este workspace' }
  if (!can(role, capability)) {
    return { ok: false, status: 403, error: 'Tu rol en este workspace no permite esta acción' }
  }
  return { ok: true, session, role }
}

/** Atajo para responder un guard fallido. */
export function denied(res: VercelResponse, result: Extract<Guard, { ok: false }>) {
  return res.status(result.status).json({ ok: false, error: result.error })
}

/** Crear un workspace no depende de ningún workspace: lo hacen los administradores. */
export function canCreateWorkspace(session: LbSession | null): boolean {
  return session?.role === 'SUPERADMIN' || session?.role === 'ADMIN'
}
