/**
 * Learning Builder · comentarios de revisión.
 *
 * El auditor recorre el recurso —publicado o en borrador— y comenta sobre la
 * pieza concreta que revisa: una lección, un bloque, un texto, una imagen, un
 * interactivo. No puede editar nada; ninguna operación de este endpoint toca
 * el contenido.
 *
 * Quien edita lee los hilos, responde y los da por atendidos. Cada quien puede
 * borrar lo suyo; borrar lo ajeno es cosa del gestor.
 */
import { denied, guard } from '../_lib/lb-auth.js'
import { lbComments, loadResource, usersByIds } from '../_lib/lb-store.js'
import { labelForAnchor, parseAnchor } from '../../src/learning/lib/comments.js'
import { can } from '../../src/learning/lib/roles.js'

type VercelRequest = any
type VercelResponse = any

const MAX_BODY = 4000

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
  const resourceId = text(body.resourceId, 40)
  if (!resourceId) return res.status(400).json({ ok: false, error: 'Falta el recurso' })

  try {
    const loaded = await loadResource(resourceId)
    if (!loaded) return res.status(404).json({ ok: false, error: 'Recurso no encontrado' })
    const { resource, directives, content } = loaded

    const check = await guard(req, resource.workspaceId, 'comment.view')
    if (!check.ok) return denied(res, check)
    const role = check.role
    const me = check.session.userId

    if (op === 'list') {
      const rows = await lbComments().findMany({
        where: { resourceId },
        orderBy: { createdAt: 'asc' },
      })
      const authors = await usersByIds([
        ...rows.map((row: any) => row.authorId),
        ...rows.map((row: any) => row.resolvedById).filter(Boolean),
      ])
      const named = (id: string | null) => (id ? authors.get(id)?.displayName || '(usuario eliminado)' : null)

      return res.status(200).json({
        ok: true,
        role,
        me,
        comments: rows.map((row: any) => ({
          id: row.id,
          anchor: row.anchor,
          anchorLabel: row.anchorLabel,
          parentId: row.parentId,
          authorId: row.authorId,
          authorName: named(row.authorId),
          body: row.body,
          status: row.status,
          resolvedAt: row.resolvedAt,
          resolvedByName: named(row.resolvedById),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          /** Lo que este usuario puede hacer con este comentario concreto. */
          canDelete: row.authorId === me || can(role, 'comment.moderate'),
          canEdit: row.authorId === me,
        })),
      })
    }

    if (op === 'create') {
      if (!can(role, 'comment.create')) {
        return res.status(403).json({ ok: false, error: 'Tu rol en este workspace no permite comentar' })
      }
      const content_ = text(body.body, MAX_BODY)
      if (!content_) return res.status(400).json({ ok: false, error: 'El comentario está vacío' })

      const parentId = text(body.parentId, 40)
      let anchor = parseAnchor(body.anchor).key

      if (parentId) {
        // Una respuesta hereda el ancla del hilo: no se comenta en dos sitios.
        const parent = await lbComments().findUnique({ where: { id: parentId } })
        if (!parent || parent.resourceId !== resourceId) {
          return res.status(404).json({ ok: false, error: 'El hilo ya no existe' })
        }
        if (parent.parentId) {
          return res.status(400).json({ ok: false, error: 'Responde al comentario que abre el hilo' })
        }
        anchor = parent.anchor
      }

      const created = await lbComments().create({
        data: {
          resourceId,
          anchor,
          anchorLabel: labelForAnchor(anchor, content, directives.instructional.lessonLabel),
          parentId: parentId || null,
          authorId: me,
          body: content_,
        },
      })
      return res.status(200).json({ ok: true, comment: created })
    }

    const commentId = text(body.commentId, 40)
    if (!commentId) return res.status(400).json({ ok: false, error: 'Falta el comentario' })
    const comment = await lbComments().findUnique({ where: { id: commentId } })
    if (!comment || comment.resourceId !== resourceId) {
      return res.status(404).json({ ok: false, error: 'Comentario no encontrado' })
    }

    if (op === 'edit') {
      if (comment.authorId !== me) {
        return res.status(403).json({ ok: false, error: 'Solo se puede editar el comentario propio' })
      }
      const next = text(body.body, MAX_BODY)
      if (!next) return res.status(400).json({ ok: false, error: 'El comentario está vacío' })
      const updated = await lbComments().update({ where: { id: commentId }, data: { body: next } })
      return res.status(200).json({ ok: true, comment: updated })
    }

    if (op === 'resolve') {
      // Cierra quien puede atender hilos, y también quien lo abrió.
      if (!can(role, 'comment.resolve') && comment.authorId !== me) {
        return res.status(403).json({ ok: false, error: 'Solo quien abrió el hilo o quien edita puede cerrarlo' })
      }
      if (comment.parentId) {
        return res.status(400).json({ ok: false, error: 'El estado se cambia en el comentario que abre el hilo' })
      }
      const resolved = body.resolved !== false
      const updated = await lbComments().update({
        where: { id: commentId },
        data: {
          status: resolved ? 'RESOLVED' : 'OPEN',
          resolvedAt: resolved ? new Date() : null,
          resolvedById: resolved ? me : null,
        },
      })
      return res.status(200).json({ ok: true, comment: updated })
    }

    if (op === 'delete') {
      if (comment.authorId !== me && !can(role, 'comment.moderate')) {
        return res.status(403).json({ ok: false, error: 'Solo su autor o un gestor pueden borrarlo' })
      }
      // Las respuestas caen con el hilo por la relación en cascada.
      await lbComments().delete({ where: { id: commentId } })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ ok: false, error: `Operación desconocida: ${op}` })
  } catch (error: any) {
    console.error('api/learning/comments error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
