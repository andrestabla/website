/**
 * Learning Builder · revisión externa por enlace.
 *
 *   /revision/:token                    → la página del revisor (React)
 *   GET  /api/learning/review?token&frame=1[&path]
 *                                       → la pieza, con la capa de señalar
 *   POST /api/learning/review {op, token, …}
 *
 * El enlace de revisión es otro que el público y no depende de él: sirve
 * también para un borrador, que es justo cuando se quiere la opinión del
 * cliente. Nadie entra sin identificarse, y lo que se identifica es una
 * persona —nombre, correo, organización—, no una cuenta del Ecosistema.
 *
 * Lo que el revisor ve de la conversación son los hilos de la revisión
 * externa y lo que el equipo le responda en ellos. Los hilos internos del
 * equipo y de los auditores no salen de aquí.
 */
import { appendToBody, servePackage, shell } from '../_lib/lb-serve-package.js'
import { clearReviewerCookie, readReviewer, reviewLayer, reviewerCookie, type LbReviewer } from '../_lib/lb-review.js'
import { renderResourceHtml } from '../_lib/lb-render-any.js'
import { lbDeliveries, liveVersion, packageAt } from '../_lib/lb-delivery.js'
import { riseLessonPath } from '../_lib/lb-rise.js'
import { lbComments, lbResources, loadResource, usersByIds } from '../_lib/lb-store.js'
import { parseAnchor } from '../../src/learning/lib/comments.js'
import { anchorTargetsFor, familyOf } from '../../src/learning/lib/content.js'
import { describeTarget, sanitizeTarget } from '../../src/learning/lib/review.js'

type VercelRequest = any
type VercelResponse = any

const MAX_BODY = 4000
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/** El recurso detrás de un token, solo si su revisión está abierta. */
async function byToken(token: string) {
  if (!token || token.length < 16) return null
  const found = await lbResources().findUnique({ where: { reviewToken: token }, select: { id: true } })
  if (!found) return null
  const loaded = await loadResource(found.id)
  if (!loaded || !loaded.resource.reviewEnabled || loaded.resource.status === 'ARCHIVED') return null
  return loaded
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') return await frame(req, res)
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }
    return await api(req, res)
  } catch (error: any) {
    console.error('api/learning/review error', error)
    if (req.method === 'GET') return shell('Error', 'No se pudo abrir la pieza.', 500, res)
    return res.status(500).json({ ok: false, error: 'Error interno' })
  }
}

/** La pieza tal como la ve el estudiante, con la capa de revisión encima. */
async function frame(req: VercelRequest, res: VercelResponse) {
  const token = String(req.query?.token || '')
  const loaded = await byToken(token)
  if (!loaded) return shell('Revisión cerrada', 'Este enlace de revisión ya no está activo.', 404, res)
  const { resource, workspace, directives, content } = loaded

  if (!readReviewer(req, resource.publicId, resource.reviewToken)) {
    return shell('Identifícate primero', 'Abre el enlace de revisión e indica tu nombre y correo.', 401, res)
  }

  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Cache-Control', 'private, no-store')

  // ?v=N revisa una versión entregada anterior: se ve con sus comentarios, sin añadir más.
  const askedVersion = Number(req.query?.v) || null
  const at = await packageAt(loaded, askedVersion)
  if (askedVersion && !at) return shell('Versión no encontrada', 'Esa versión del paquete no existe.', 404, res)
  if (at) {
    return servePackage({
      res,
      workspace: loaded.workspace,
      resourceId: resource.id,
      publicId: resource.publicId,
      pkg: at.pkg,
      requested: String(req.query?.path || ''),
      viewBase: `/api/learning/review?token=${encodeURIComponent(token)}&frame=1${at.live ? '' : `&v=${at.version}`}&path=`,
      editable: false,
      extra: reviewLayer,
      version: at.version,
      live: at.live,
    })
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  const html = renderResourceHtml({
    kind: resource.kind,
    meta: {
      title: resource.title,
      subtitle: resource.subtitle,
      course: resource.course,
      unit: resource.unit,
      workspaceName: workspace?.name || '',
    },
    content,
    directives,
    mode: 'preview',
  })
  return res.status(200).send(appendToBody(html, reviewLayer('')))
}

async function api(req: VercelRequest, res: VercelResponse) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const op = String(body.op || '')
  const loaded = await byToken(text(body.token, 80))
  if (!loaded) return res.status(404).json({ ok: false, error: 'Este enlace de revisión ya no está activo' })
  const { resource, workspace, content, directives } = loaded
  const reviewer = readReviewer(req, resource.publicId, resource.reviewToken)

  if (op === 'open') {
    // Las versiones entregadas, para que quien revisa pueda volver a las anteriores.
    const versions = await lbDeliveries().findMany({
      where: { resourceId: resource.id },
      orderBy: { version: 'desc' },
      select: { version: true, notes: true, createdAt: true },
    })
    return res.status(200).json({
      live: liveVersion(resource),
      versions: versions.map((row: any) => ({ ...row, live: row.version === liveVersion(resource) })),
      ok: true,
      resource: {
        title: resource.title,
        subtitle: resource.subtitle,
        code: resource.code,
        kind: resource.kind,
        status: resource.status,
        workspaceName: workspace?.name || '',
      },
      reviewer,
    })
  }

  if (op === 'identify') {
    const name = text(body.name, 120)
    const email = text(body.email, 160).toLowerCase()
    const org = text(body.org, 160)
    if (name.length < 2) return res.status(400).json({ ok: false, error: 'Escribe tu nombre' })
    if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: 'Ese correo no parece válido' })
    if (body.consent !== true) {
      return res.status(400).json({ ok: false, error: 'Necesitamos tu autorización para tratar estos datos' })
    }
    const next: LbReviewer = { name, email, org }
    res.setHeader('Set-Cookie', reviewerCookie(resource.publicId, resource.reviewToken, next))
    return res.status(200).json({ ok: true, reviewer: next })
  }

  if (op === 'leave') {
    res.setHeader('Set-Cookie', clearReviewerCookie(resource.publicId))
    return res.status(200).json({ ok: true })
  }

  if (!reviewer) return res.status(401).json({ ok: false, error: 'Identifícate para continuar' })
  const resourceId = resource.id

  if (op === 'list') {
    // Solo los hilos abiertos desde la revisión externa, con sus respuestas.
    const roots = await lbComments().findMany({
      where: { resourceId, parentId: null, guestEmail: { not: null } },
      orderBy: { createdAt: 'asc' },
    })
    const replies = roots.length
      ? await lbComments().findMany({
          where: { resourceId, parentId: { in: roots.map((row: any) => row.id) } },
          orderBy: { createdAt: 'asc' },
        })
      : []
    const team = await usersByIds(replies.map((row: any) => row.authorId).filter(Boolean))
    const shape = (row: any, n?: number) => ({
      id: row.id,
      n,
      parentId: row.parentId,
      anchorLabel: row.anchorLabel,
      target: row.target ?? null,
      body: row.body,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      authorName: row.authorId ? team.get(row.authorId)?.displayName || 'Equipo' : row.guestName || 'Revisor',
      authorOrg: row.authorId ? (workspace?.name ? `Equipo · ${workspace.name}` : 'Equipo') : row.guestOrg || '',
      fromTeam: !!row.authorId,
      mine: !row.authorId && row.guestEmail === reviewer.email,
      version: row.version ?? null,
    })
    return res.status(200).json({
      ok: true,
      reviewer,
      comments: [...roots.map((row: any, index: number) => shape(row, index + 1)), ...replies.map((row: any) => shape(row))],
    })
  }

  if (op === 'create') {
    const content_ = text(body.body, MAX_BODY)
    if (!content_) return res.status(400).json({ ok: false, error: 'El comentario está vacío' })

    // Un freno sencillo contra el envío en ráfaga desde un mismo correo.
    const recent = await lbComments().count({
      where: { resourceId, guestEmail: reviewer.email, createdAt: { gt: new Date(Date.now() - 60_000) } },
    })
    if (recent >= 12) return res.status(429).json({ ok: false, error: 'Vas muy rápido: espera un momento' })

    // Se comenta sobre la versión vigente; las anteriores quedan como registro.
    const live = liveVersion(resource)
    const viewing = Number(body.version) || null
    const hasPackage = !!(await packageAt(loaded))
    if (hasPackage && viewing && viewing !== live) {
      return res.status(400).json({ ok: false, error: `Estás viendo la V${viewing}; los comentarios nuevos van sobre la V${live}, la vigente` })
    }

    const parentId = text(body.parentId, 40)
    if (parentId) {
      const parent = await lbComments().findUnique({ where: { id: parentId } })
      if (!parent || parent.resourceId !== resourceId || parent.parentId || !parent.guestEmail) {
        return res.status(404).json({ ok: false, error: 'El hilo ya no existe' })
      }
      const created = await lbComments().create({
        data: {
          resourceId,
          anchor: parent.anchor,
          anchorLabel: parent.anchorLabel,
          parentId,
          version: parent.version ?? null,
          body: content_,
          guestName: reviewer.name,
          guestEmail: reviewer.email,
          guestOrg: reviewer.org || null,
        },
      })
      return res.status(200).json({ ok: true, id: created.id })
    }

    const target = sanitizeTarget(body.target)
    const targets = anchorTargetsFor(resource.kind, content, directives.instructional.lessonLabel)

    // El ancla agrupa el hilo en el panel del equipo. Se toma la que trae el
    // propio elemento si es real; en una pieza importada, su página.
    let anchor = parseAnchor(body.anchor).key
    if (!targets.some((row) => row.anchor === anchor)) anchor = 'resource'
    if (anchor === 'resource' && target?.page && familyOf(resource.kind) === 'mirror') {
      // En un Rise todas las lecciones comparten página; la lección la dice su ruta interna.
      const riseLesson = /^#\/lessons\/([A-Za-z0-9_-]+)/.exec(target.hash || '')?.[1]
      const path = riseLesson ? riseLessonPath(riseLesson) : target.page
      const pages: any[] = Array.isArray((content as any)?.pages) ? (content as any).pages : []
      const page = pages.find((row) => row?.path === path) || pages.find((row) => row?.path === target.page)
      if (page?.id && targets.some((row) => row.anchor === `lesson:${page.id}`)) anchor = `lesson:${page.id}`
    }
    const label = targets.find((row) => row.anchor === anchor)?.label || 'El recurso completo'

    const created = await lbComments().create({
      data: {
        resourceId,
        anchor,
        anchorLabel: target ? `${label} · ${describeTarget(target)}`.slice(0, 300) : label,
        target: target ?? undefined,
        version: hasPackage ? live : null,
        body: content_,
        guestName: reviewer.name,
        guestEmail: reviewer.email,
        guestOrg: reviewer.org || null,
      },
    })
    return res.status(200).json({ ok: true, id: created.id })
  }

  const commentId = text(body.commentId, 40)
  const comment = commentId ? await lbComments().findUnique({ where: { id: commentId } }) : null
  if (!comment || comment.resourceId !== resourceId) {
    return res.status(404).json({ ok: false, error: 'Comentario no encontrado' })
  }
  // El revisor solo toca lo suyo, y lo suyo es lo que escribió con su correo.
  if (comment.authorId || comment.guestEmail !== reviewer.email) {
    return res.status(403).json({ ok: false, error: 'Solo puedes cambiar tus propios comentarios' })
  }

  if (op === 'edit') {
    const next = text(body.body, MAX_BODY)
    if (!next) return res.status(400).json({ ok: false, error: 'El comentario está vacío' })
    await lbComments().update({ where: { id: commentId }, data: { body: next } })
    return res.status(200).json({ ok: true })
  }

  if (op === 'delete') {
    await lbComments().delete({ where: { id: commentId } })
    return res.status(200).json({ ok: true })
  }

  return res.status(400).json({ ok: false, error: `Operación desconocida: ${op}` })
}
