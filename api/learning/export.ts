/**
 * Learning Builder · descargas del OVA.
 *
 *   GET /api/learning/export?id=<resourceId>&format=scorm  → paquete SCORM 1.2 (.zip)
 *   GET /api/learning/export?id=<resourceId>&format=html   → un solo .html navegable
 *   GET /api/learning/export?id=<resourceId>&format=json   → el guion, para archivo o traspaso
 *   GET …&format=media | captions                          → el archivo de un medio y su pista
 *   GET …&version=2                                        → esa versión entregada, no la viva
 *
 * **Cualquier versión se puede bajar, no solo la vigente.** Una revisión
 * compara lo entregado con lo corregido, y para eso hay que poder tener las dos
 * en la mano. Sin `version` sale la viva, que es lo que casi siempre se quiere.
 *
 * Exige la capacidad de exportar en el workspace y respeta lo que sus
 * directivas habilitan. No deja descargar algo que no pase su validación: un paquete con
 * errores estructurales llega al campus y ya no se puede corregir sin volver a
 * subirlo.
 */
import { denied, guard, requireModule } from '../_lib/lb-auth.js'
import { buildMirrorPackage } from '../_lib/lb-mirror-package.js'
import { renderResourceHtml } from '../_lib/lb-render-any.js'
import { buildScormPackage, safeFileName } from '../_lib/lb-scorm.js'
import { resourceFolder, workspaceBucket } from '../_lib/lb-storage.js'
import { lbFiles, loadResource } from '../_lib/lb-store.js'
import { deliveryIssues, familyOf } from '../../src/learning/lib/content.js'
import { liveVersion, mediaAt, packageAt } from '../_lib/lb-delivery.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const id = String(req.query?.id || '')
  const format = String(req.query?.format || 'scorm')
  const pedida = Number(req.query?.version || 0)
  if (!id) return res.status(400).json({ ok: false, error: 'Falta el recurso' })
  if (req.query?.version && (!Number.isInteger(pedida) || pedida < 1)) {
    return res.status(400).json({ ok: false, error: 'La versión no es un número de versión' })
  }

  try {
    // Identificarse antes de tocar la base: si no, un anónimo distinguiría
    // «no existe» de «no autorizado» y sabría qué ids existen.
    const gate = await requireModule(req)
    if (!gate.ok) return denied(res, gate)

    const loaded = await loadResource(id)
    if (!loaded) return res.status(404).json({ ok: false, error: 'Recurso no encontrado' })
    const { resource, workspace, directives, content, final } = loaded

    const check = await guard(req, resource.workspaceId, 'resource.export', gate.session)
    if (!check.ok) return denied(res, check)

    const version = pedida || liveVersion(resource)
    const esViva = version === liveVersion(resource)

    // Las directivas se comprueban sobre lo que se va a entregar, que es la
    // versión viva. Una anterior es historia: negar su descarga porque el guion
    // de hoy no cumple una directiva de hoy sería esconder justo lo que se
    // quiere comparar.
    const errors = esViva
      ? deliveryIssues(resource.kind, content, final, directives).filter((issue) => issue.level === 'error')
      : []
    if (errors.length) {
      return res.status(400).json({
        ok: false,
        error: 'El recurso no cumple las directivas del workspace; corrígelo antes de descargarlo.',
        issues: errors,
      })
    }

    const meta = {
      title: resource.title,
      subtitle: resource.subtitle,
      course: resource.course,
      unit: resource.unit,
      workspaceName: workspace?.name || '',
    }
    const baseName = safeFileName(content.cover?.title || resource.title)
    // El nombre dice qué versión es: dos archivos del mismo recurso en la
    // misma carpeta de descargas, si no, se distinguen por la fecha y nada más.
    const sufijo = esViva ? '' : `-v${version}`

    // Un medio se descarga, no se empaqueta. Se redirige a su archivo en vez
    // de leerlo para reenviarlo: un video de veintiséis megas no tiene por qué
    // pasar por la memoria de la función para que alguien lo guarde.
    const medio = await mediaAt({ resource, final }, pedida || null)
    if (medio && (format === 'media' || format === 'captions')) {
      const url = format === 'captions' ? medio.media.captionsUrl : medio.media.url
      if (!url) return res.status(404).json({ ok: false, error: 'Esta versión no tiene pista de subtítulos' })
      res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate')
      return res.redirect(302, url)
    }
    if (medio && (format === 'html' || format === 'scorm')) {
      return res.status(400).json({
        ok: false,
        error: 'La pieza de este recurso es un archivo de medios: se descarga con format=media (y su pista con format=captions).',
      })
    }
    if (!medio && (format === 'media' || format === 'captions')) {
      return res.status(404).json({ ok: false, error: 'Este recurso no entrega un archivo de medios' })
    }

    // Lo producido se entrega como el paquete que es, no como un solo
    // archivo: sus estilos, imágenes y scripts son parte de la pieza.
    const entregado = await packageAt({ resource, content, final, directives }, pedida || null)
    if (pedida && !entregado && !medio) {
      return res.status(404).json({ ok: false, error: `No hay una versión ${pedida} que descargar` })
    }
    const pkg = entregado?.pkg || null

    if (format === 'json') {
      // En una pieza importada el guion **es** el paquete, así que pedir una
      // versión anterior pide el guion de entonces. En los demás tipos el guion
      // no vive en las entregas —tiene su propio historial, con su restaurar—,
      // de modo que lo que sale es el de ahora.
      const guion = !esViva && familyOf(resource.kind) === 'mirror' && pkg ? pkg : content
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}${sufijo}-guion.json"`)
      return res.status(200).send(
        JSON.stringify({ meta: { ...meta, workspace: workspace?.slug, version }, directives, content: guion }, null, 2)
      )
    }
    if (pkg && (format === 'html' || format === 'scorm')) {
      const files = await lbFiles().findMany({
        where: { resourceId: resource.id, version },
        orderBy: { path: 'asc' },
        select: { path: true },
      })
      const bucket = await workspaceBucket(workspace)
      const { buffer, fileName } = await buildMirrorPackage({
        pkg,
        directives,
        bucket,
        folder: resourceFolder(workspace.code, resource.code),
        version,
        files,
        title: `${content.cover?.title || resource.title}${sufijo}`,
        publicId: resource.publicId,
        format,
      })
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
      res.setHeader('Content-Length', String(buffer.length))
      return res.status(200).send(buffer)
    }

    if (format === 'html') {
      if (!directives.exports.html) return res.status(403).json({ ok: false, error: 'Las directivas de este workspace no habilitan la descarga HTML' })
      const html = renderResourceHtml({ kind: resource.kind, meta, content, directives, mode: 'html' })
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.html"`)
      return res.status(200).send(html)
    }

    if (format === 'scorm') {
      if (!directives.exports.scorm) return res.status(403).json({ ok: false, error: 'Las directivas de este workspace no habilitan el paquete SCORM' })
      const { buffer, fileName } = buildScormPackage({ kind: resource.kind, meta, content, directives, publicId: resource.publicId })
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
      res.setHeader('Content-Length', String(buffer.length))
      return res.status(200).send(buffer)
    }

    return res.status(400).json({ ok: false, error: `Formato desconocido: ${format}` })
  } catch (error: any) {
    console.error('api/learning/export error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
