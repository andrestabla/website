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
import crypto from 'node:crypto'
import { guard, lbSessionState } from '../_lib/lb-auth.js'
import { renderOvaHtml } from '../_lib/lb-render.js'
import { lbResources, loadResource, loadResourceByPublicId } from '../_lib/lb-store.js'

type VercelRequest = any
type VercelResponse = any

/** 12 horas: suficiente para una sesión de estudio sin volver a pedir el código. */
const ACCESS_TTL_SECONDS = 60 * 60 * 12

function secret(): string {
  const configured = process.env.ADMIN_SESSION_SECRET
  if (configured && configured.trim()) return configured
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
    throw new Error('Missing ADMIN_SESSION_SECRET')
  }
  return 'algoritmot-admin-session-dev-secret'
}

/** Prueba de que este visitante ya acertó el código de este recurso. */
function accessToken(publicId: string, code: string): string {
  return crypto.createHmac('sha256', secret()).update(`lb-access:${publicId}:${code}`).digest('base64url')
}

function cookieName(publicId: string): string {
  return `lb_a_${publicId.replace(/[^A-Za-z0-9]/g, '')}`
}

function readCookie(req: VercelRequest, name: string): string {
  const raw = req.headers?.cookie
  if (!raw || typeof raw !== 'string') return ''
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return ''
}

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

      const check = await guard(req, loaded.resource.workspaceId, 'resource.view')
      if (!check.ok) return shell('Vista previa restringida', check.error, check.status, res)
      if (check.role === 'GUEST' && loaded.resource.status !== 'PUBLISHED') {
        return shell('Todavía en construcción', 'Este recurso aún no está publicado.', 403, res)
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('X-Frame-Options', 'SAMEORIGIN')
      return res.status(200).send(
        renderOvaHtml({
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
      const expected = resource.shareCode ? accessToken(publicId, resource.shareCode) : ''
      const granted = !!expected && readCookie(req, cookieName(publicId)) === expected

      if (!granted) {
        const submitted = req.method === 'POST' ? readSubmittedCode(req) : ''
        if (!submitted) return codeForm(publicId, '', res)
        if (!resource.shareCode || submitted.toUpperCase() !== String(resource.shareCode).toUpperCase()) {
          return codeForm(publicId, 'Ese código no es válido.', res)
        }
        // Acertó: se recuerda en una cookie firmada para no pedirlo en cada pantalla.
        const parts = [
          `${cookieName(publicId)}=${encodeURIComponent(expected)}`,
          'Path=/',
          'HttpOnly',
          'SameSite=Lax',
          `Max-Age=${ACCESS_TTL_SECONDS}`,
        ]
        if (process.env.VERCEL_ENV || process.env.NODE_ENV === 'production') parts.push('Secure')
        res.setHeader('Set-Cookie', parts.join('; '))
      }
    }

    // Contador de lecturas: no bloquea la respuesta si falla.
    lbResources().update({ where: { id: resource.id }, data: { views: { increment: 1 } } }).catch(() => undefined)

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // Un recurso protegido por código nunca se cachea en intermediarios.
    res.setHeader('Cache-Control', resource.shareMode === 'CODE' ? 'private, no-store' : 'public, max-age=60, s-maxage=300')
    if (!resource.embedEnabled) res.setHeader('X-Frame-Options', 'SAMEORIGIN')

    return res.status(200).send(
      renderOvaHtml({
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
