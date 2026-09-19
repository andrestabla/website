/**
 * Learning Builder · descargas del OVA.
 *
 *   GET /api/learning/export?id=<resourceId>&format=scorm  → paquete SCORM 1.2 (.zip)
 *   GET /api/learning/export?id=<resourceId>&format=html   → un solo .html navegable
 *   GET /api/learning/export?id=<resourceId>&format=json   → el guion, para archivo o traspaso
 *
 * Exige la capacidad de exportar en el workspace y respeta lo que sus
 * directivas habilitan. No deja descargar algo que no pase su validación: un paquete con
 * errores estructurales llega al campus y ya no se puede corregir sin volver a
 * subirlo.
 */
import { denied, guard } from '../_lib/lb-auth.js'
import { renderOvaHtml } from '../_lib/lb-render.js'
import { buildScormPackage, safeFileName } from '../_lib/lb-scorm.js'
import { loadResource } from '../_lib/lb-store.js'
import { validateOva } from '../../src/learning/lib/blocks.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const id = String(req.query?.id || '')
  const format = String(req.query?.format || 'scorm')
  if (!id) return res.status(400).json({ ok: false, error: 'Falta el recurso' })

  try {
    const loaded = await loadResource(id)
    if (!loaded) return res.status(404).json({ ok: false, error: 'Recurso no encontrado' })
    const { resource, workspace, directives, content } = loaded

    const check = await guard(req, resource.workspaceId, 'resource.export')
    if (!check.ok) return denied(res, check)

    const errors = validateOva(content, directives).filter((issue) => issue.level === 'error')
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

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}-guion.json"`)
      return res.status(200).send(
        JSON.stringify({ meta: { ...meta, workspace: workspace?.slug }, directives, content }, null, 2)
      )
    }

    if (format === 'html') {
      if (!directives.exports.html) return res.status(403).json({ ok: false, error: 'Las directivas de este workspace no habilitan la descarga HTML' })
      const html = renderOvaHtml({ meta, content, directives, mode: 'html' })
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.html"`)
      return res.status(200).send(html)
    }

    if (format === 'scorm') {
      if (!directives.exports.scorm) return res.status(403).json({ ok: false, error: 'Las directivas de este workspace no habilitan el paquete SCORM' })
      const { buffer, fileName } = buildScormPackage({ meta, content, directives, publicId: resource.publicId })
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
