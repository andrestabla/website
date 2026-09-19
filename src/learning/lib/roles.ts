/**
 * Learning Builder · roles dentro de un workspace.
 *
 * El permiso LEARNING_BUILDER de /admin/users abre el módulo; lo que se puede
 * hacer dentro lo decide la membresía en cada workspace. Un mismo usuario puede
 * ser gestor en un cliente y invitado en otro.
 *
 * Esta tabla es la única fuente de verdad: la consulta la UI para pintar y el
 * API para autorizar, de modo que lo que no se ve tampoco se puede llamar.
 */

export const LB_ROLES = ['MANAGER', 'EDITOR', 'AUDITOR', 'GUEST'] as const
export type LbRole = (typeof LB_ROLES)[number]

export const LB_ROLE_LABEL: Record<LbRole, string> = {
  MANAGER: 'Gestor',
  EDITOR: 'Editor',
  AUDITOR: 'Auditor',
  GUEST: 'Invitado',
}

export const LB_ROLE_HINT: Record<LbRole, string> = {
  MANAGER: 'Gobierna el workspace: equipo, directivas gráficas e instruccionales, fuentes de datos y todos los recursos.',
  EDITOR: 'Crea y edita recursos, usa la IA, publica y exporta. No toca el equipo ni las directivas.',
  AUDITOR: 'Revisa el recurso entero, publicado o en borrador, y comenta cualquier pieza: una lección, un bloque, un texto, una imagen, un interactivo. No edita nada.',
  GUEST: 'Solo consulta la metabiblioteca y abre los recursos publicados. No edita, no comenta, no exporta.',
}

export const LB_ROLE_STYLE: Record<LbRole, string> = {
  MANAGER: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  EDITOR: 'border-sky-200 bg-sky-50 text-sky-700',
  AUDITOR: 'border-amber-200 bg-amber-50 text-amber-700',
  GUEST: 'border-slate-200 bg-slate-100 text-slate-600',
}

export const LB_CAPABILITIES = [
  /** Ver la metabiblioteca del workspace. */
  'library.view',
  /** Abrir un recurso publicado en modo lectura. */
  'resource.view',
  /** Crear recursos nuevos. */
  'resource.create',
  /** Editar el contenido de un recurso. */
  'resource.edit',
  /** Publicar, despublicar y archivar. */
  'resource.publish',
  /** Eliminar recursos. */
  'resource.delete',
  /** Descargar SCORM, HTML o el guion. */
  'resource.export',
  /** Activar enlace público, código de acceso o incrustado. */
  'resource.share',
  /** Pedir borradores y cambios a la IA. */
  'ai.use',
  /** Subir insumos del experto disciplinar. */
  'sources.manage',
  /** Leer los hilos de comentarios del recurso. */
  'comment.view',
  /** Comentar y responder sobre cualquier pieza del recurso. */
  'comment.create',
  /** Dar por atendido un hilo ajeno. */
  'comment.resolve',
  /** Borrar comentarios de otras personas. */
  'comment.moderate',
  /** Registrar y editar fuentes de datos abiertas. */
  'data.manage',
  /** Cambiar las directivas gráficas e instruccionales. */
  'workspace.directives',
  /** Ver y cambiar las claves de API propias del workspace. */
  'workspace.integrations',
  /** Invitar, cambiar de rol y quitar miembros. */
  'workspace.team',
  /** Renombrar, desactivar o eliminar el workspace. */
  'workspace.manage',
] as const

export type LbCapability = (typeof LB_CAPABILITIES)[number]

const GUEST_CAPS: LbCapability[] = ['library.view', 'resource.view']

/**
 * El auditor ve el recurso completo —también en borrador, que es cuando la
 * revisión sirve— y puede comentar cualquier pieza. No tiene ninguna capacidad
 * que modifique el contenido.
 */
const AUDITOR_CAPS: LbCapability[] = [...GUEST_CAPS, 'comment.view', 'comment.create']

const EDITOR_CAPS: LbCapability[] = [
  ...AUDITOR_CAPS,
  'comment.resolve',
  'resource.create',
  'resource.edit',
  'resource.publish',
  'resource.export',
  'resource.share',
  'ai.use',
  'sources.manage',
]

const MANAGER_CAPS: LbCapability[] = [
  ...EDITOR_CAPS,
  'comment.moderate',
  'resource.delete',
  'data.manage',
  'workspace.directives',
  'workspace.integrations',
  'workspace.team',
  'workspace.manage',
]

const BY_ROLE: Record<LbRole, LbCapability[]> = {
  GUEST: GUEST_CAPS,
  AUDITOR: AUDITOR_CAPS,
  EDITOR: EDITOR_CAPS,
  MANAGER: MANAGER_CAPS,
}

export function isLbRole(value: unknown): value is LbRole {
  return typeof value === 'string' && (LB_ROLES as readonly string[]).includes(value)
}

/** Qué puede hacer un rol. Sin membresía (null) no puede nada. */
export function can(role: LbRole | null | undefined, capability: LbCapability): boolean {
  if (!role) return false
  return BY_ROLE[role].includes(capability)
}

export function capabilitiesOf(role: LbRole | null | undefined): LbCapability[] {
  return role ? [...BY_ROLE[role]] : []
}

/**
 * Los roles del panel SUPERADMIN y ADMIN entran a cualquier workspace como
 * gestores: son quienes responden por la plataforma y necesitan poder
 * desatascar un workspace sin pedir que alguien los invite.
 */
export function effectiveRole(
  adminRole: string | null | undefined,
  membershipRole: LbRole | null | undefined
): LbRole | null {
  if (adminRole === 'SUPERADMIN' || adminRole === 'ADMIN') return 'MANAGER'
  return membershipRole ?? null
}
