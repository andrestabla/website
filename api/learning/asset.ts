/**
 * Learning Builder · los archivos de un paquete, servidos desde el sitio.
 *
 *   /ova/:publicId/a/<ruta dentro del paquete>
 *
 * Podrían servirse directamente desde el almacenamiento, que es público y
 * está en un CDN, y de hecho así se hacía. No funciona: las **tipografías
 * web** las pide el navegador con CORS, y un bucket sin cabecera
 * `Access-Control-Allow-Origin` las bloquea. La pieza entonces se pinta con
 * la letra de repuesto — se parece, pero no es igual, que es justo lo que
 * aquí no vale.
 *
 * Sirviéndolos desde el mismo origen que la página, el problema desaparece de
 * raíz: no hay petición cruzada que autorizar. Los archivos grandes —el video
 * incrustado de un Rise, por ejemplo— no se copian a través de la función:
 * para esos se redirige al almacenamiento, porque un <video> no pide CORS.
 *
 * Quién puede pedirlos es exactamente quien puede ver el recurso: si está
 * publicado y compartido, cualquiera; si no, hace falta sesión y pertenecer
 * al workspace. Un archivo suelto no puede ser una rendija para leer lo que
 * la página de al lado protege.
 */
import { hasAccess } from '../_lib/lb-access.js'
import { guard, lbSessionState } from '../_lib/lb-auth.js'
import { lbFiles, loadResourceByPublicId } from '../_lib/lb-store.js'
import { deliverablePackage } from '../../src/learning/lib/content.js'
import { safePath } from '../../src/learning/lib/final.js'

type VercelRequest = any
type VercelResponse = any

/**
 * Por encima de esto se redirige en vez de copiar: mantiene la memoria y el
 * tiempo de la función lejos de sus límites. Las tipografías, las hojas de
 * estilo y los scripts —lo único que necesita el mismo origen— pesan mucho
 * menos que esto.
 */
const PROXY_LIMIT_BYTES = 4 * 1024 * 1024

/**
 * Sin caché de borde, cada archivo del paquete despertaría la función y su
 * conexión a la base: se han medido arranques en frío de veintiséis segundos,
 * y una página de un Rise pide veinte archivos. Cacheado, la función se
 * ejecuta una vez por archivo y el resto lo sirve el borde.
 *
 * Solo para lo abierto. Lo que va con código o con sesión no se cachea
 * compartido: se serviría a quien no ha pasado por la puerta.
 */
const EDGE = 's-maxage=86400, stale-while-revalidate=604800'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const publicId = String(req.query?.id || '')
    // Vercel entrega el comodín como arreglo o como cadena, según la ruta.
    const raw = req.query?.path
    const wanted = safePath(Array.isArray(raw) ? raw.join('/') : String(raw || ''))
    if (!publicId || !wanted) return res.status(400).send('Petición incompleta')

    const loaded = await loadResourceByPublicId(publicId)
    if (!loaded) return res.status(404).send('No encontrado')
    const { resource, content, final } = loaded

    // El archivo tiene que pertenecer al paquete que este recurso publica.
    const pkg = deliverablePackage(resource.kind, content, final)
    if (!pkg) return res.status(404).send('Este recurso no tiene paquete')

    // Exactamente la misma puerta que la página: abierto de par en par, con
    // código, o con sesión. Si los archivos fueran más permisivos que la
    // página, pedir «…/a/index.html» saltaría el código y no habría
    // protección ninguna.
    const published = resource.status === 'PUBLISHED'
    const open =
      published &&
      (resource.shareMode === 'OPEN' ||
        (resource.shareMode === 'CODE' && hasAccess(req, publicId, resource.shareCode)))

    if (!open) {
      const { session, allowed } = await lbSessionState(req)
      if (!session || !allowed) return res.status(403).send('Sin acceso')
      const check = await guard(req, resource.workspaceId, 'resource.view', session)
      if (!check.ok) return res.status(check.status).send(check.error)
      if (check.role === 'GUEST' && !published) return res.status(403).send('Todavía no está publicado')
    }

    const file = await lbFiles().findUnique({
      where: { resourceId_path: { resourceId: resource.id, path: wanted } },
    })
    if (!file?.url) return res.status(404).send('Ese archivo no está en el paquete')

    // Los pesados no pasan por aquí: el navegador los pide al almacenamiento.
    if (file.bytes > PROXY_LIMIT_BYTES) {
      res.setHeader('Cache-Control', open ? `public, max-age=3600, ${EDGE}` : 'private, max-age=600')
      return res.redirect(302, file.url)
    }

    const upstream = await fetch(file.url)
    if (!upstream.ok) return res.status(502).send(`El almacenamiento respondió ${upstream.status}`)
    const body = Buffer.from(await upstream.arrayBuffer())

    res.setHeader('Content-Type', file.contentType || 'application/octet-stream')
    res.setHeader('Content-Length', String(body.length))
    // Las rutas incluyen el recurso y su paquete no cambia sin reimportarse.
    res.setHeader('Cache-Control', open ? `public, max-age=86400, ${EDGE}` : 'private, max-age=600')
    if (req.method === 'HEAD') return res.status(200).end()
    return res.status(200).send(body)
  } catch (error: any) {
    console.error('api/learning/asset error', error)
    return res.status(500).send('Error interno')
  }
}
