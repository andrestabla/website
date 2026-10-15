/**
 * Learning Builder · visor público del recurso.
 *
 * Tres usos, un solo renderizador:
 *  - `/ova/:publicId` (reescritura de vercel.json) → el recurso publicado.
 *  - el mismo enlace con código, cuando el workspace lo comparte protegido.
 *  - `?preview=<resourceId>` → la vista previa del editor, que exige sesión y
 *    pertenencia al workspace y funciona aunque sea un borrador.
 *
 * Servirlo desde aquí garantiza que la vista previa, el enlace público, la
 * descarga HTML y el paquete SCORM salgan del mismo motor: lo que el diseñador
 * revisa es exactamente lo que recibe el estudiante.
 */
import { guard, lbSessionState } from '../_lib/lb-auth.js'
import { accessCookie, hasAccess } from '../_lib/lb-access.js'
import { renderResourceHtml } from '../_lib/lb-render-any.js'
import { codeForm, servePackage, shell } from '../_lib/lb-serve-package.js'
import { lbResources, loadResource, loadResourceByPublicId } from '../_lib/lb-store.js'
import { deliverablePackage } from '../../src/learning/lib/content.js'

type VercelRequest = any
type VercelResponse = any

/** El código puede llegar por formulario (POST) o en el cuerpo JSON. */
function readSubmittedCode(req: VercelRequest): string {
  const body = req.body
  if (typeof body === 'string') {
    const params = new URLSearchParams(body)
    return String(params.get('code') || '').trim()
  }
  if (body && typeof body === 'object') return String((body as any).code || '').trim()
  return ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    // ── Vista previa del editor ──
    const previewId = String(req.query?.preview || '')
    if (previewId) {
      const { session, allowed } = await lbSessionState(req)
      if (!session || !allowed) {
        return shell('Vista previa restringida', 'Inicia sesión en el Ecosistema con acceso a Learning Builder.', 403, res)
      }
      const loaded = await loadResource(previewId)
      if (!loaded) return shell('No encontrado', 'Este recurso ya no existe.', 404, res)

      const check = await guard(req, loaded.resource.workspaceId, 'resource.view', session)
      if (!check.ok) return shell('Vista previa restringida', check.error, check.status, res)
      if (check.role === 'GUEST' && loaded.resource.status !== 'PUBLISHED') {
        return shell('Todavía en construcción', 'Este recurso aún no está publicado.', 403, res)
      }

      res.setHeader('X-Frame-Options', 'SAMEORIGIN')

      // Lo producido no se rehace: se sirve su propio HTML. Dentro del
      // builder, además, con la capa que lo hace editable.
      const previewPkg = deliverablePackage(loaded.resource.kind, loaded.content, loaded.final)
      if (previewPkg) {
        const base = `/api/learning/view?preview=${encodeURIComponent(previewId)}${req.query?.edit ? '&edit=1' : ''}&path=`
        return servePackage({
          res,
          resourceId: loaded.resource.id,
          publicId: loaded.resource.publicId,
          pkg: previewPkg,
          requested: String(req.query?.path || ''),
          viewBase: base,
          editable: !!req.query?.edit && check.role !== 'GUEST' && check.role !== 'AUDITOR',
        })
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).send(
        renderResourceHtml({
          kind: loaded.resource.kind,
          meta: {
            title: loaded.resource.title,
            subtitle: loaded.resource.subtitle,
            course: loaded.resource.course,
            unit: loaded.resource.unit,
            workspaceName: loaded.workspace?.name || '',
          },
          content: loaded.content,
          directives: loaded.directives,
          mode: 'preview',
        })
      )
    }

    // ── Enlace público ──
    const publicId = String(req.query?.id || '')
    if (!publicId) return shell('Enlace incompleto', 'Falta el identificador del recurso.', 400, res)

    const loaded = await loadResourceByPublicId(publicId)
    if (!loaded) return shell('No encontrado', 'Este enlace no corresponde a ningún recurso.', 404, res)
    const { resource, workspace, directives, content } = loaded

    if (resource.status !== 'PUBLISHED' || resource.shareMode === 'OFF') {
      return shell('Aún no compartido', 'Quien lo construye todavía no ha habilitado este enlace.', 404, res)
    }

    if (resource.shareMode === 'CODE') {
      if (!hasAccess(req, publicId, resource.shareCode)) {
        const submitted = req.method === 'POST' ? readSubmittedCode(req) : ''
        if (!submitted) return codeForm(publicId, '', res)
        if (!resource.shareCode || submitted.toUpperCase() !== String(resource.shareCode).toUpperCase()) {
          return codeForm(publicId, 'Ese código no es válido.', res)
        }
        // Acertó: se recuerda en una cookie firmada para no pedirlo en cada
        // pantalla, y con ella se sirven también los archivos del paquete.
        res.setHeader('Set-Cookie', accessCookie(publicId, resource.shareCode))
      }
    }

    // Contador de lecturas: no bloquea la respuesta si falla.
    lbResources().update({ where: { id: resource.id }, data: { views: { increment: 1 } } }).catch(() => undefined)

    if (!resource.embedEnabled) res.setHeader('X-Frame-Options', 'SAMEORIGIN')

    const publicPkg = deliverablePackage(resource.kind, content, loaded.final)
    if (publicPkg) {
      return servePackage({
        res,
        resourceId: resource.id,
        publicId,
        pkg: publicPkg,
        requested: String(req.query?.path || ''),
        viewBase: `/ova/${encodeURIComponent(publicId)}?path=`,
        editable: false,
      })
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // Un recurso protegido por código nunca se cachea en intermediarios.
    res.setHeader('Cache-Control', resource.shareMode === 'CODE' ? 'private, no-store' : 'public, max-age=60, s-maxage=300')

    return res.status(200).send(
      renderResourceHtml({
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
        mode: 'public',
      })
    )
  } catch (error: any) {
    console.error('api/learning/view error', error)
    return shell('Error', 'No se pudo abrir el recurso.', 500, res)
  }
}
