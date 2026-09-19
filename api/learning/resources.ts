/**
 * Learning Builder · recursos de la metabiblioteca.
 *
 * Un solo endpoint con operaciones (op), igual que el Cotizador: el builder
 * guarda a menudo y así comparte una conexión y un control de permiso. Cada
 * operación declara qué capacidad exige, y la capacidad la resuelve el rol del
 * usuario en el workspace del recurso.
 *
 * El invitado solo llega a la biblioteca y a los recursos publicados; nada de
 * lo que no puede hacer llega siquiera a ejecutarse.
 */
import { denied, guard, lbSessionState, requireModule, visibleWorkspaces } from '../_lib/lb-auth.js'
import {
  lbComments, lbResources, lbVersions, lbWorkspaces, loadResource, newPublicId, newShareCode, snapshot, summarize,
} from '../_lib/lb-store.js'
import { sanitizeContent, scaffoldContent, validateOva } from '../../src/learning/lib/blocks.js'
import { sanitizeDirectives } from '../../src/learning/lib/directives.js'
import { can } from '../../src/learning/lib/roles.js'
import {
  LB_RESOURCE_KIND_SPECS, LB_SHARE_MODES, LB_STATUSES, isResourceKind, type LbShareMode,
} from '../../src/learning/lib/resources.js'

type VercelRequest = any
type VercelResponse = any

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function tags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const clean = value.map((tag) => text(tag, 40)).filter(Boolean)
  return [...new Set(clean)].slice(0, 12)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const op = String(body.op || '')

  try {
    // ── Metabiblioteca ──
    if (op === 'library') {
      const { session, allowed } = await lbSessionState(req)
      if (!session) return res.status(401).json({ ok: false, error: 'Unauthenticated' })
      if (!allowed) return res.status(403).json({ ok: false, error: 'Sin acceso a Learning Builder' })

      const visible = await visibleWorkspaces(session)
      const wanted = text(body.workspaceId, 40)
      const scope = wanted ? visible.filter((entry) => entry.workspace.id === wanted) : visible
      if (wanted && !scope.length) return res.status(403).json({ ok: false, error: 'No perteneces a este workspace' })
      if (!scope.length) return res.status(200).json({ ok: true, resources: [] })

      const roleByWorkspace = new Map(scope.map((entry) => [entry.workspace.id, entry.role]))
      const rows = await lbResources().findMany({
        where: { workspaceId: { in: scope.map((entry) => entry.workspace.id) } },
        orderBy: { updatedAt: 'desc' },
        include: { workspace: true },
        take: 400,
      })

      // El invitado solo ve lo publicado: la biblioteca no es una ventana al
      // taller. El auditor sí ve los borradores, que es cuando revisar sirve.
      const visibleRows = rows.filter(
        (row: any) => roleByWorkspace.get(row.workspaceId) !== 'GUEST' || row.status === 'PUBLISHED'
      )

      // Hilos de revisión sin atender, para que salten a la vista en la lista.
      const openThreads = await lbComments()
        .groupBy({
          by: ['resourceId'],
          where: { resourceId: { in: visibleRows.map((row: any) => row.id) }, parentId: null, status: 'OPEN' },
          _count: { _all: true },
        })
        .catch(() => [])
      const openBy = new Map<string, number>((openThreads as any[]).map((row) => [row.resourceId, row._count?._all || 0]))

      const resources = visibleRows.map((row: any) => ({
        ...summarize(row),
        role: roleByWorkspace.get(row.workspaceId),
        openComments: openBy.get(row.id) || 0,
      }))

      return res.status(200).json({ ok: true, resources })
    }

    if (op === 'create') {
      const workspaceId = text(body.workspaceId, 40)
      const check = await guard(req, workspaceId, 'resource.create')
      if (!check.ok) return denied(res, check)

      const kind = isResourceKind(body.kind) ? body.kind : 'OVA'
      const spec = LB_RESOURCE_KIND_SPECS[kind]
      if (!spec.available) {
        return res.status(400).json({ ok: false, error: `${spec.label}: ${spec.pending || 'todavía no está disponible'}` })
      }

      const workspace = await lbWorkspaces().findUnique({ where: { id: workspaceId } })
      if (!workspace?.active) return res.status(400).json({ ok: false, error: 'El workspace está desactivado' })

      const directives = sanitizeDirectives(workspace.directives)
      const title = text(body.title, 200) || 'Recurso sin título'
      const created = await lbResources().create({
        data: {
          publicId: newPublicId(),
          workspaceId,
          ownerId: check.session.userId,
          kind,
          title,
          subtitle: text(body.subtitle, 300) || null,
          course: text(body.course, 200) || null,
          unit: text(body.unit, 200) || null,
          tags: tags(body.tags),
          content: scaffoldContent(directives, title) as any,
        },
        include: { workspace: true },
      })
      return res.status(200).json({ ok: true, resource: summarize(created) })
    }

    // ── A partir de aquí todo cuelga de un recurso concreto ──
    const gate = await requireModule(req)
    if (!gate.ok) return denied(res, gate)

    const resourceId = text(body.resourceId, 40)
    if (!resourceId) return res.status(400).json({ ok: false, error: 'Falta el recurso' })
    const loaded = await loadResource(resourceId)
    if (!loaded) return res.status(404).json({ ok: false, error: 'Recurso no encontrado' })
    const { resource, workspace, directives, content } = loaded

    const capability =
      op === 'get' ? 'resource.view'
      : op === 'versions' ? 'resource.view'
      : op === 'delete' ? 'resource.delete'
      : op === 'publish' || op === 'unpublish' || op === 'archive' ? 'resource.publish'
      : op === 'share' ? 'resource.share'
      : op === 'duplicate' ? 'resource.create'
      : 'resource.edit'
    const check = await guard(req, resource.workspaceId, capability as any, gate.session)
    if (!check.ok) return denied(res, check)

    // El invitado tiene 'resource.view', pero solo sobre lo ya publicado.
    if (check.role === 'GUEST' && resource.status !== 'PUBLISHED') {
      return res.status(403).json({ ok: false, error: 'Este recurso todavía no está publicado' })
    }

    if (op === 'get') {
      return res.status(200).json({
        ok: true,
        resource: { ...summarize(resource), content, createdAt: resource.createdAt },
        workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, kind: workspace.kind },
        directives,
        role: check.role,
        issues: validateOva(content, directives),
        shareCode: can(check.role, 'resource.share') ? resource.shareCode : null,
      })
    }

    if (op === 'update') {
      const data: Record<string, unknown> = {}
      if (typeof body.title === 'string') data.title = text(body.title, 200) || 'Recurso sin título'
      if (typeof body.subtitle === 'string') data.subtitle = text(body.subtitle, 300) || null
      if (typeof body.course === 'string') data.course = text(body.course, 200) || null
      if (typeof body.unit === 'string') data.unit = text(body.unit, 200) || null
      if (Array.isArray(body.tags)) data.tags = tags(body.tags)
      if (typeof body.status === 'string' && LB_STATUSES.includes(body.status as never) && body.status !== 'PUBLISHED') {
        data.status = body.status
      }

      let nextContent = content
      if (body.content !== undefined) {
        nextContent = sanitizeContent(body.content, directives)
        data.content = nextContent as any
        // Una instantánea por sesión de trabajo, no por pulsación: solo si la
        // última tiene más de diez minutos.
        const last = await lbVersions().findFirst({ where: { resourceId }, orderBy: { createdAt: 'desc' } })
        if (!last || Date.now() - new Date(last.createdAt).getTime() > 10 * 60 * 1000) {
          await snapshot(resourceId, content, 'manual', check.session.userId)
        }
      }

      const updated = await lbResources().update({ where: { id: resourceId }, data, include: { workspace: true } })
      return res.status(200).json({ ok: true, resource: summarize(updated), issues: validateOva(nextContent, directives) })
    }

    if (op === 'validate') {
      const candidate = body.content === undefined ? content : sanitizeContent(body.content, directives)
      return res.status(200).json({ ok: true, issues: validateOva(candidate, directives) })
    }

    if (op === 'publish') {
      const issues = validateOva(content, directives)
      const errors = issues.filter((issue) => issue.level === 'error')
      if (errors.length) {
        return res.status(400).json({ ok: false, error: 'El recurso no cumple las directivas del workspace', issues })
      }
      await snapshot(resourceId, content, 'publish', check.session.userId)
      const updated = await lbResources().update({
        where: { id: resourceId },
        data: { status: 'PUBLISHED', publishedAt: resource.publishedAt || new Date() },
        include: { workspace: true },
      })
      return res.status(200).json({ ok: true, resource: summarize(updated), issues })
    }

    if (op === 'unpublish') {
      const updated = await lbResources().update({
        where: { id: resourceId },
        data: { status: 'DRAFT', shareMode: 'OFF' },
        include: { workspace: true },
      })
      return res.status(200).json({ ok: true, resource: summarize(updated) })
    }

    if (op === 'archive') {
      const updated = await lbResources().update({
        where: { id: resourceId },
        data: { status: resource.status === 'ARCHIVED' ? 'DRAFT' : 'ARCHIVED', shareMode: 'OFF' },
        include: { workspace: true },
      })
      return res.status(200).json({ ok: true, resource: summarize(updated) })
    }

    if (op === 'share') {
      const mode = (LB_SHARE_MODES.includes(body.mode) ? body.mode : 'OFF') as LbShareMode
      if (mode !== 'OFF' && !directives.exports.publicLink) {
        return res.status(403).json({ ok: false, error: 'Las directivas de este workspace no habilitan el enlace público' })
      }
      if (mode !== 'OFF' && resource.status !== 'PUBLISHED') {
        return res.status(400).json({ ok: false, error: 'Publica el recurso antes de compartirlo' })
      }
      const embed = body.embedEnabled === true && directives.exports.embed && mode !== 'OFF'
      // El código se renueva al pedirlo o al pasar a modo protegido sin tener uno.
      const shareCode =
        mode === 'CODE' ? (body.rotateCode === true || !resource.shareCode ? newShareCode() : resource.shareCode) : null

      const updated = await lbResources().update({
        where: { id: resourceId },
        data: { shareMode: mode, shareCode, embedEnabled: embed },
        include: { workspace: true },
      })
      return res.status(200).json({ ok: true, resource: summarize(updated), shareCode })
    }

    if (op === 'duplicate') {
      const created = await lbResources().create({
        data: {
          publicId: newPublicId(),
          workspaceId: resource.workspaceId,
          ownerId: check.session.userId,
          kind: resource.kind,
          title: `${resource.title} (copia)`.slice(0, 200),
          subtitle: resource.subtitle,
          course: resource.course,
          unit: resource.unit,
          tags: Array.isArray(resource.tags) ? resource.tags : [],
          content: content as any,
        },
        include: { workspace: true },
      })
      return res.status(200).json({ ok: true, resource: summarize(created) })
    }

    if (op === 'delete') {
      await lbResources().delete({ where: { id: resourceId } })
      return res.status(200).json({ ok: true })
    }

    if (op === 'versions') {
      const versions = await lbVersions().findMany({
        where: { resourceId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, reason: true, label: true, createdAt: true },
      })
      return res.status(200).json({ ok: true, versions })
    }

    if (op === 'restore') {
      const versionId = text(body.versionId, 40)
      const version = await lbVersions().findUnique({ where: { id: versionId } })
      if (!version || version.resourceId !== resourceId) {
        return res.status(404).json({ ok: false, error: 'Versión no encontrada' })
      }
      await snapshot(resourceId, content, 'restore', check.session.userId, 'Antes de restaurar')
      const restored = sanitizeContent(version.content, directives)
      await lbResources().update({ where: { id: resourceId }, data: { content: restored as any } })
      return res.status(200).json({ ok: true, content: restored, issues: validateOva(restored, directives) })
    }

    return res.status(400).json({ ok: false, error: `Operación desconocida: ${op}` })
  } catch (error: any) {
    console.error('api/learning/resources error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
