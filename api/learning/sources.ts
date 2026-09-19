/**
 * Learning Builder · insumos del experto disciplinar.
 *
 * Quien edita sube el documento del experto (DOCX, PDF, Markdown o texto) y
 * aquí se convierte a Markdown, que es lo que lee la IA para proponer el guion.
 * Se reutiliza el conversor del Cotizador: mismo tratamiento de imágenes,
 * tablas y truncado.
 */
import { denied, guard } from '../_lib/lb-auth.js'
import { lbSources, loadResource } from '../_lib/lb-store.js'
import { ATTACHMENT_MAX_BYTES, extractMarkdown } from '../_lib/quote-attachments.js'

type VercelRequest = any
type VercelResponse = any

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/** data URL o base64 pelado → Buffer. */
function decodeBase64(value: string): Buffer {
  const comma = value.indexOf(',')
  const payload = value.startsWith('data:') && comma > -1 ? value.slice(comma + 1) : value
  return Buffer.from(payload, 'base64')
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

    // Los insumos son material de trabajo: los ve y los mueve quien edita.
    const check = await guard(req, loaded.resource.workspaceId, 'sources.manage')
    if (!check.ok) return denied(res, check)

    if (op === 'list') {
      const sources = await lbSources().findMany({
        where: { resourceId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, format: true, charCount: true, truncated: true, createdAt: true },
      })
      return res.status(200).json({ ok: true, sources })
    }

    if (op === 'get') {
      const id = text(body.id, 40)
      const source = await lbSources().findUnique({ where: { id } })
      if (!source || source.resourceId !== resourceId) return res.status(404).json({ ok: false, error: 'Insumo no encontrado' })
      return res.status(200).json({ ok: true, source })
    }

    if (op === 'upload') {
      const fileName = text(body.fileName, 200) || 'insumo'
      const mimeType = text(body.mimeType, 120)
      const raw = typeof body.fileBase64 === 'string' ? body.fileBase64 : ''
      if (!raw) return res.status(400).json({ ok: false, error: 'No llegó el archivo' })

      const buffer = decodeBase64(raw)
      if (!buffer.length) return res.status(400).json({ ok: false, error: 'El archivo está vacío' })
      if (buffer.length > ATTACHMENT_MAX_BYTES) {
        return res.status(400).json({ ok: false, error: 'El archivo supera 3,5 MB' })
      }

      const extracted = await extractMarkdown(buffer, fileName, mimeType, { uploadedBy: check.session.username })
      if (!extracted.markdown.trim()) {
        return res.status(400).json({ ok: false, error: 'No se pudo extraer texto de este archivo' })
      }

      const created = await lbSources().create({
        data: {
          resourceId,
          name: fileName.replace(/\.[^.]+$/, '').slice(0, 200),
          format: extracted.sourceFormat,
          text: extracted.markdown,
          charCount: extracted.markdown.length,
          truncated: !!extracted.truncated,
        },
        select: { id: true, name: true, format: true, charCount: true, truncated: true, createdAt: true },
      })
      return res.status(200).json({ ok: true, source: created })
    }

    if (op === 'paste') {
      const content = text(body.text, 400_000)
      if (!content) return res.status(400).json({ ok: false, error: 'No hay texto que guardar' })
      const created = await lbSources().create({
        data: {
          resourceId,
          name: text(body.name, 200) || 'Nota pegada',
          format: 'txt',
          text: content,
          charCount: content.length,
        },
        select: { id: true, name: true, format: true, charCount: true, truncated: true, createdAt: true },
      })
      return res.status(200).json({ ok: true, source: created })
    }

    if (op === 'delete') {
      const id = text(body.id, 40)
      const source = await lbSources().findUnique({ where: { id } })
      if (!source || source.resourceId !== resourceId) return res.status(404).json({ ok: false, error: 'Insumo no encontrado' })
      await lbSources().delete({ where: { id } })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ ok: false, error: `Operación desconocida: ${op}` })
  } catch (error: any) {
    console.error('api/learning/sources error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
