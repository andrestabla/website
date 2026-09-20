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
import { injectMirrorLayer } from '../_lib/lb-mirror-html.js'
import { RISE_DATA_PATH, RISE_SANDBOX_DIR, isRiseLessonPath, parseRise, riseLessonId, riseLessons } from '../_lib/lb-rise.js'
import { renderResourceHtml } from '../_lib/lb-render-any.js'
import { lbFiles, lbResources, loadResource, loadResourceByPublicId } from '../_lib/lb-store.js'
import { deliverablePackage } from '../../src/learning/lib/content.js'
import { safePath, type LbPackage } from '../../src/learning/lib/final.js'

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

function shell(title: string, message: string, status: number, res: VercelResponse, inner = '') {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).send(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<meta name="robots" content="noindex">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f1f5f9;color:#0f172a;
font-family:system-ui,-apple-system,Segoe UI,sans-serif;text-align:center;padding:24px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:36px 32px;max-width:420px;width:100%}
h1{font-size:21px;margin:0 0 8px}p{color:#64748b;margin:0;font-size:15px;line-height:1.6}
input{margin-top:18px;width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;
padding:12px 14px;font-size:20px;letter-spacing:.24em;text-align:center;text-transform:uppercase;font-family:inherit}
button{margin-top:12px;width:100%;border:0;border-radius:10px;background:#4f46e5;color:#fff;
padding:12px 16px;font-size:15px;font-weight:700;cursor:pointer}
button:hover{background:#4338ca}
.err{margin-top:14px;color:#b91c1c;font-size:14px;font-weight:600}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p>${inner}</div></body></html>`)
}

function codeForm(publicId: string, error: string, res: VercelResponse) {
  return shell(
    'Contenido protegido',
    'Escribe el código de acceso que te compartieron.',
    error ? 401 : 200,
    res,
    `<form method="post" action="/ova/${encodeURIComponent(publicId)}">
      <input name="code" autocomplete="one-time-code" autocapitalize="characters" autofocus
             maxlength="12" aria-label="Código de acceso" placeholder="Código">
      <button type="submit">Entrar</button>
      ${error ? `<div class="err">${error}</div>` : ''}
    </form>`
  )
}


/**
 * Sirve una página del paquete de un recurso: el HTML tal cual salió de
 * producción, con la capa de ediciones añadida en la cabecera. Da igual si el
 * paquete es el guion de una pieza importada o la pieza final adjunta a un
 * OVA, una lectura o una presentación: lo que se entrega es el original.
 *
 * Solo se sirven rutas que estén registradas como archivos de ESTE recurso.
 * Es lo que impide que el parámetro `path` se convierta en una forma de pedirle
 * al servidor que descargue cualquier cosa.
 */
async function servePackage(options: {
  res: VercelResponse
  resourceId: string
  /** Los archivos del paquete se sirven bajo /ova/:publicId/a/… */
  publicId: string
  pkg: LbPackage
  requested: string
  viewBase: string
  editable: boolean
}): Promise<unknown> {
  const { res, resourceId, publicId, pkg, requested, viewBase, editable } = options
  // Los archivos del paquete se piden al propio sitio, no al almacenamiento.
  // Si se pidieran allí, el navegador bloquearía las tipografías por CORS y la
  // pieza se pintaría con otra letra: parecida, pero no igual.
  const packageRoot = `/ova/${encodeURIComponent(publicId)}/a/`

  const fetchFile = async (path: string): Promise<string | null> => {
    const file = await lbFiles().findUnique({ where: { resourceId_path: { resourceId, path } } })
    if (!file?.url) return null
    const response = await fetch(file.url)
    return response.ok ? await response.text() : null
  }

  // Sin ruta pedida se abre la pieza por donde abre de verdad: su entrada.
  // Con ruta, tiene que ser una de sus páginas editables o uno de sus
  // archivos; en ambos casos se comprueba contra este recurso y no contra
  // una ruta cualquiera.
  const asked = safePath(requested)
  const page = asked ? pkg.pages.find((row) => row.path === asked) : null
  const wanted = page?.path || asked || pkg.entry
  if (asked && !page && isRiseLessonPath(asked)) {
    return shell('Lección no encontrada', 'Esa lección no está en el paquete.', 404, res)
  }

  let original: string | null
  let baseHref: string

  if (isRiseLessonPath(wanted)) {
    // Una lección de Rise no es un archivo: su HTML vive dentro de los datos
    // del curso. Se sirve con la base del marco en que el propio reproductor
    // la pinta, o se quedaría sin tipografías.
    const raw = await fetchFile(RISE_DATA_PATH)
    const data = raw ? parseRise(raw) : null
    const lesson = data ? riseLessons(data).find((row) => row.id === riseLessonId(wanted)) : null
    if (!lesson?.html) {
      return shell('Lección no encontrada', 'Esa lección ya no está en el paquete.', 404, res)
    }
    original = lesson.html
    baseHref = `${packageRoot}${RISE_SANDBOX_DIR}`
  } else {
    original = await fetchFile(wanted)
    if (original === null) {
      return shell('Paquete incompleto', 'Ese archivo ya no está en el almacenamiento.', 404, res)
    }
    // El <base> es la carpeta de ESTA página, para que sus rutas relativas
    // resuelvan igual que resolvían dentro del paquete original.
    const dir = wanted.includes('/') ? `${wanted.slice(0, wanted.lastIndexOf('/'))}/` : ''
    baseHref = `${packageRoot}${dir}`
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).send(
    injectMirrorLayer(original, {
      baseHref,
      packageRoot,
      patches: pkg.patches[wanted] || [],
      viewBase,
      editable,
    })
  )
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
