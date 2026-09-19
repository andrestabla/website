/**
 * Learning Builder · workspaces, equipo, directivas y fuentes de datos.
 *
 * Un workspace es un cliente: su equipo, su línea gráfica, su modelo
 * instruccional y sus fuentes de datos abiertas. Cambiar una directiva cambia
 * lo que el editor ofrece y lo que la revisión exige a todos sus recursos, así
 * que solo lo hace un gestor; cualquier miembro puede leerlas, porque la UI las
 * necesita para pintar.
 */
import { canCreateWorkspace, denied, guard, lbSessionState, visibleWorkspaces } from '../_lib/lb-auth.js'
import { lbDataSources, lbMembers, lbResources, lbWorkspaces, uniqueSlug, usersByIds } from '../_lib/lb-store.js'
import { prisma } from '../_lib/prisma.js'
import { LB_DEFAULT_DIRECTIVES, sanitizeDirectives } from '../../src/learning/lib/directives.js'
import { workspaceCodeFrom } from '../_lib/lb-codes.js'
import { platformReadiness, workspaceIntegrations } from '../_lib/lb-integrations.js'
import {
  describeIntegrations, mergeIntegrations, LB_PROVIDERS, LB_PROVIDER_SPECS,
  type LbProvider,
} from '../../src/learning/lib/integrations.js'
import { capabilitiesOf, isLbRole } from '../../src/learning/lib/roles.js'
import { probeProvider } from '../_lib/lb-provider-probe.js'

type VercelRequest = any
type VercelResponse = any

const KINDS = ['EDUCATIVA', 'EMPRESARIAL', 'INTERNA']
const PROVIDERS = [
  'GENERIC', 'DATOS_GOV_CO', 'DANE', 'WORLD_BANK', 'UNESCO', 'OECD', 'CEPAL',
  'CROSSREF', 'OPENALEX', 'SEMANTIC_SCHOLAR',
]

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const op = String(body.op || '')

  try {
    // ── Operaciones que no cuelgan de un workspace concreto ──
    if (op === 'list' || op === 'create') {
      const { session, allowed } = await lbSessionState(req)
      if (!session) return res.status(401).json({ ok: false, error: 'Unauthenticated' })
      if (!allowed) return res.status(403).json({ ok: false, error: 'Sin acceso a Learning Builder' })

      if (op === 'list') {
        const visible = await visibleWorkspaces(session)
        const counts = await lbResources()
          .groupBy({ by: ['workspaceId'], _count: { _all: true } })
          .catch(() => [])
        const countBy = new Map<string, number>((counts as any[]).map((row) => [row.workspaceId, row._count?._all || 0]))
        return res.status(200).json({
          ok: true,
          canCreate: canCreateWorkspace(session),
          defaults: LB_DEFAULT_DIRECTIVES,
          me: { userId: session.userId, adminRole: session.role },
          workspaces: visible.map(({ workspace, role }) => ({
            id: workspace.id,
            code: workspace.code,
            name: workspace.name,
            slug: workspace.slug,
            kind: workspace.kind,
            notes: workspace.notes,
            active: workspace.active,
            directives: sanitizeDirectives(workspace.directives),
            role,
            capabilities: capabilitiesOf(role),
            resourceCount: countBy.get(workspace.id) || 0,
            updatedAt: workspace.updatedAt,
          })),
        })
      }

      if (!canCreateWorkspace(session)) {
        return res.status(403).json({ ok: false, error: 'Solo un administrador puede crear workspaces' })
      }
      const name = text(body.name, 160)
      if (!name) return res.status(400).json({ ok: false, error: 'El workspace necesita un nombre' })
      const slug = await uniqueSlug(text(body.slug, 60) || name)
      const takenCodes = new Set<string>(
        (await lbWorkspaces().findMany({ select: { code: true } })).map((row: any) => row.code).filter(Boolean)
      )
      const created = await lbWorkspaces().create({
        data: {
          name,
          code: workspaceCodeFrom(slug, takenCodes),
          slug,
          kind: KINDS.includes(String(body.kind)) ? String(body.kind) : 'EDUCATIVA',
          notes: text(body.notes, 1000) || null,
          directives: sanitizeDirectives(body.directives ?? LB_DEFAULT_DIRECTIVES) as any,
        },
      })
      // Quien lo crea queda como gestor, para que no nazca sin dueño.
      await lbMembers().create({ data: { workspaceId: created.id, userId: session.userId, role: 'MANAGER' } })
      return res.status(200).json({ ok: true, workspace: { ...created, directives: sanitizeDirectives(created.directives) } })
    }

    const workspaceId = text(body.workspaceId, 40)

    // ── Lectura del workspace: basta pertenecer ──
    if (op === 'get' || op === 'team' || op === 'data-sources') {
      const check = await guard(req, workspaceId, 'library.view')
      if (!check.ok) return denied(res, check)
      const workspace = await lbWorkspaces().findUnique({ where: { id: workspaceId } })
      if (!workspace) return res.status(404).json({ ok: false, error: 'Workspace no encontrado' })

      if (op === 'get') {
        return res.status(200).json({
          ok: true,
          workspace: { ...workspace, directives: sanitizeDirectives(workspace.directives) },
          role: check.role,
          capabilities: capabilitiesOf(check.role),
        })
      }

      if (op === 'team') {
        const members = await lbMembers().findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } })
        const users = await usersByIds(members.map((member: any) => member.userId))
        return res.status(200).json({
          ok: true,
          role: check.role,
          members: members.map((member: any) => ({
            id: member.id,
            userId: member.userId,
            role: member.role,
            displayName: users.get(member.userId)?.displayName || '(usuario eliminado)',
            username: users.get(member.userId)?.username || '',
            email: users.get(member.userId)?.email || null,
            createdAt: member.createdAt,
          })),
        })
      }

      const sources = await lbDataSources().findMany({ where: { workspaceId }, orderBy: { name: 'asc' } })
      return res.status(200).json({ ok: true, role: check.role, dataSources: sources })
    }

    // ── Directivas ──
    if (op === 'update') {
      const check = await guard(req, workspaceId, 'workspace.directives')
      if (!check.ok) return denied(res, check)
      const data: Record<string, unknown> = {}
      if (body.directives !== undefined) data.directives = sanitizeDirectives(body.directives) as any
      if (typeof body.notes === 'string') data.notes = text(body.notes, 1000) || null

      // Renombrar o desactivar es gobierno del workspace, no solo directivas.
      if (typeof body.name === 'string' || typeof body.kind === 'string' || typeof body.active === 'boolean') {
        const manage = await guard(req, workspaceId, 'workspace.manage')
        if (!manage.ok) return denied(res, manage)
        if (typeof body.name === 'string') data.name = text(body.name, 160) || undefined
        if (typeof body.kind === 'string' && KINDS.includes(body.kind)) data.kind = body.kind
        if (typeof body.active === 'boolean') data.active = body.active
      }

      const updated = await lbWorkspaces().update({ where: { id: workspaceId }, data })
      return res.status(200).json({ ok: true, workspace: { ...updated, directives: sanitizeDirectives(updated.directives) } })
    }

    if (op === 'delete') {
      const check = await guard(req, workspaceId, 'workspace.manage')
      if (!check.ok) return denied(res, check)
      const inUse = await lbResources().count({ where: { workspaceId } })
      if (inUse > 0) {
        return res.status(400).json({
          ok: false,
          error: `Este workspace tiene ${inUse} recurso(s). Desactívalo en vez de borrarlo para no perder su historia.`,
        })
      }
      await lbWorkspaces().delete({ where: { id: workspaceId } })
      return res.status(200).json({ ok: true })
    }

    // ── Equipo ──
    if (op === 'member-add' || op === 'member-role' || op === 'member-remove') {
      const check = await guard(req, workspaceId, 'workspace.team')
      if (!check.ok) return denied(res, check)

      if (op === 'member-add') {
        const identifier = text(body.identifier, 200).toLowerCase()
        const role = isLbRole(body.role) ? body.role : 'EDITOR'
        if (!identifier) return res.status(400).json({ ok: false, error: 'Indica el usuario o su correo' })
        const user = await (prisma as any).adminUser.findFirst({
          where: { OR: [{ username: identifier }, { email: identifier }] },
          select: { id: true, displayName: true, username: true, email: true },
        })
        if (!user) {
          return res.status(404).json({
            ok: false,
            error: 'No hay ningún usuario con ese nombre o correo. Créalo antes en el panel de Usuarios.',
          })
        }
        const existing = await lbMembers().findUnique({ where: { workspaceId_userId: { workspaceId, userId: user.id } } })
        if (existing) return res.status(400).json({ ok: false, error: `${user.displayName} ya está en el equipo.` })

        const member = await lbMembers().create({
          data: { workspaceId, userId: user.id, role, invitedById: check.session.userId },
        })
        return res.status(200).json({
          ok: true,
          member: { ...member, displayName: user.displayName, username: user.username, email: user.email },
          // Sin el permiso del módulo no verá nada aunque esté en el equipo.
          warning: null,
        })
      }

      const memberId = text(body.memberId, 40)
      const member = await lbMembers().findUnique({ where: { id: memberId } })
      if (!member || member.workspaceId !== workspaceId) {
        return res.status(404).json({ ok: false, error: 'Ese miembro no está en este workspace' })
      }

      if (op === 'member-role') {
        if (!isLbRole(body.role)) return res.status(400).json({ ok: false, error: 'Rol desconocido' })
        // Un workspace sin gestor queda huérfano: no se degrada al último.
        if (member.role === 'MANAGER' && body.role !== 'MANAGER') {
          const managers = await lbMembers().count({ where: { workspaceId, role: 'MANAGER' } })
          if (managers <= 1) {
            return res.status(400).json({ ok: false, error: 'Es el único gestor: nombra otro antes de cambiarle el rol.' })
          }
        }
        const updated = await lbMembers().update({ where: { id: memberId }, data: { role: body.role } })
        return res.status(200).json({ ok: true, member: updated })
      }

      if (member.role === 'MANAGER') {
        const managers = await lbMembers().count({ where: { workspaceId, role: 'MANAGER' } })
        if (managers <= 1) {
          return res.status(400).json({ ok: false, error: 'Es el único gestor: nombra otro antes de quitarlo.' })
        }
      }
      await lbMembers().delete({ where: { id: memberId } })
      return res.status(200).json({ ok: true })
    }

    // ── Claves de API propias del workspace ──
    if (op === 'integrations' || op === 'integrations-save' || op === 'integrations-test') {
      const check = await guard(req, workspaceId, 'workspace.integrations')
      if (!check.ok) return denied(res, check)
      const workspace = await lbWorkspaces().findUnique({ where: { id: workspaceId } })
      if (!workspace) return res.status(404).json({ ok: false, error: 'Workspace no encontrado' })

      const provider = String(body.provider || '') as LbProvider
      const known = (LB_PROVIDERS as readonly string[]).includes(provider)

      if (op === 'integrations') {
        return res.status(200).json({
          ok: true,
          role: check.role,
          specs: LB_PROVIDER_SPECS,
          platformReady: await platformReadiness(),
          providers: describeIntegrations(workspaceIntegrations(workspace), await platformReadiness()),
        })
      }

      if (!known) return res.status(400).json({ ok: false, error: `Proveedor desconocido: ${provider}` })

      if (op === 'integrations-test') {
        // Se prueba con lo que hay guardado, no con lo que venga en la
        // petición: así el resultado dice si el workspace funciona de verdad.
        const outcome = await probeProvider(workspace, provider)
        return res.status(200).json({ ok: true, ...outcome })
      }

      const current = workspaceIntegrations(workspace)
      const next = mergeIntegrations(current, provider, {
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
        values: body.values && typeof body.values === 'object' ? body.values : undefined,
        monthlyCap: body.monthlyCap,
        notes: body.notes,
      })
      const updated = await lbWorkspaces().update({
        where: { id: workspaceId },
        data: { integrations: next as any },
      })
      // Las claves no vuelven: solo su cola y de dónde salen.
      return res.status(200).json({
        ok: true,
        providers: describeIntegrations(workspaceIntegrations(updated), await platformReadiness()),
      })
    }

    // ── Fuentes de datos abiertas ──
    if (op === 'data-save' || op === 'data-delete') {
      const check = await guard(req, workspaceId, 'data.manage')
      if (!check.ok) return denied(res, check)

      if (op === 'data-delete') {
        const id = text(body.id, 40)
        const source = await lbDataSources().findUnique({ where: { id } })
        if (!source || source.workspaceId !== workspaceId) {
          return res.status(404).json({ ok: false, error: 'Fuente no encontrada' })
        }
        await lbDataSources().delete({ where: { id } })
        return res.status(200).json({ ok: true })
      }

      const id = text(body.id, 40)
      const name = text(body.name, 160)
      if (!name) return res.status(400).json({ ok: false, error: 'La fuente necesita un nombre' })
      const provider = PROVIDERS.includes(String(body.provider)) ? String(body.provider) : 'GENERIC'
      const rawConfig = (body.config && typeof body.config === 'object' ? body.config : {}) as Record<string, unknown>
      const config = {
        endpoint: text(rawConfig.endpoint, 1000),
        format: ['json', 'csv', 'xml'].includes(String(rawConfig.format)) ? String(rawConfig.format) : 'json',
        apiKey: text(rawConfig.apiKey, 400),
        query: text(rawConfig.query, 1000),
      }
      const data = { workspaceId, name, provider, config: config as any, notes: text(body.notes, 1000) || null, active: body.active !== false }

      if (id) {
        const source = await lbDataSources().findUnique({ where: { id } })
        if (!source || source.workspaceId !== workspaceId) {
          return res.status(404).json({ ok: false, error: 'Fuente no encontrada' })
        }
        const updated = await lbDataSources().update({ where: { id }, data })
        return res.status(200).json({ ok: true, dataSource: updated })
      }
      const created = await lbDataSources().create({ data })
      return res.status(200).json({ ok: true, dataSource: created })
    }

    return res.status(400).json({ ok: false, error: `Operación desconocida: ${op}` })
  } catch (error: any) {
    console.error('api/learning/workspaces error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
