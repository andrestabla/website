/**
 * Learning Builder · servir el HTML de un paquete y las pantallas de aviso.
 *
 * Lo comparten el visor público (view.ts) y la revisión externa (review.ts):
 * las dos sirven la misma pieza, y la revisión solo le suma su capa encima.
 */
import { injectMirrorLayer } from './lb-mirror-html.js'
import { RISE_DATA_PATH, RISE_SANDBOX_DIR, isRiseLessonPath, parseRise, riseLessonId, riseLessons } from './lb-rise.js'
import { lbFiles } from './lb-store.js'
import { readStored } from './lb-storage.js'
import { safePath, type LbPackage } from '../../src/learning/lib/final.js'

type VercelResponse = any

export function shell(title: string, message: string, status: number, res: VercelResponse, inner = '') {
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

export function codeForm(publicId: string, error: string, res: VercelResponse) {
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
export async function servePackage(options: {
  res: VercelResponse
  resourceId: string
  /** Los archivos del paquete se sirven bajo /ova/:publicId/a/… */
  publicId: string
  pkg: LbPackage
  requested: string
  viewBase: string
  editable: boolean
  /** Capa que se suma al final de la página —la de revisión—, sabiendo cuál es. */
  extra?: (page: string) => string
  /** Versión entregada que se sirve; por defecto la 1. */
  version?: number
  /**
   * Si es la versión viva. Sus archivos van por la ruta de siempre; los de una
   * versión anterior llevan «~v/N/» delante para no mezclarse con los vivos.
   */
  live?: boolean
  /** Workspace dueño del recurso: permite leer el bucket por su API y no por la URL pública. */
  workspace?: { id?: string; integrations?: unknown } | null
}): Promise<unknown> {
  const { res, resourceId, publicId, pkg, requested, viewBase, editable, extra } = options
  const version = options.version ?? 1
  const live = options.live ?? true
  // Los archivos del paquete se piden al propio sitio, no al almacenamiento.
  // Si se pidieran allí, el navegador bloquearía las tipografías por CORS y la
  // pieza se pintaría con otra letra: parecida, pero no igual.
  const packageRoot = `/ova/${encodeURIComponent(publicId)}/a/${live ? '' : `~v/${version}/`}`

  const fetchFile = async (path: string): Promise<string | null> => {
    const file = await lbFiles().findUnique({ where: { resourceId_version_path: { resourceId, version, path } } })
    if (!file?.url) return null
    const response = await readStored(options.workspace, file.url)
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
  const served = injectMirrorLayer(original, {
    baseHref,
    packageRoot,
    patches: pkg.patches[wanted] || [],
    viewBase,
    editable,
  })
  return res.status(200).send(extra ? appendToBody(served, extra(wanted)) : served)
}

/** Añade al final del cuerpo; si no hay cierre de <body>, al final del documento. */
export function appendToBody(html: string, addition: string): string {
  const at = html.toLowerCase().lastIndexOf('</body>')
  return at === -1 ? `${html}\n${addition}` : `${html.slice(0, at)}${addition}\n${html.slice(at)}`
}
