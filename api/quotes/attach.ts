/**
 * Cotizador — adjuntos del asistente de una cotización.
 *
 * El consultor sube un archivo al chat para que la IA lo tome como referencia
 * o lo vuelque tal cual en la propuesta. El archivo se guarda convertido a
 * Markdown (formato recomendado: .md; un .docx, .pdf, .html o .txt se convierte
 * aquí con el 100 % de su contenido) y desde ahí:
 *
 *  - la IA lo lee completo en cada turno del chat (api/quotes/chat.ts);
 *  - «import» lo convierte, sin resumir, en páginas editables del documento
 *    (content.pages): cada título, párrafo, lista y tabla queda como bloque
 *    que el consultor edita en la pestaña Contenido.
 *
 * op: upload | list | get | update | delete | import
 */
import { prisma } from '../_lib/prisma.js'
import { quoteSessionState } from '../_lib/quotes.js'
import {
  extractMarkdown,
  markdownToPages,
  renumberPages,
  tidyMarkdown,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_CHARS,
  type DocPage,
} from '../_lib/quote-attachments.js'

type VercelRequest = any
type VercelResponse = any

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } }
export const maxDuration = 60

const quoteDb = () => (prisma as any).quote
const attachDb = () => (prisma as any).quoteAttachment

const str = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Campos que viajan al cliente en listados: el Markdown completo solo con «get». */
const META = {
  id: true, quoteId: true, name: true, mimeType: true, sourceFormat: true,
  charCount: true, converted: true, uploadedBy: true, createdAt: true, updatedAt: true,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = await quoteSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Sesión requerida' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'Sin acceso al Cotizador' })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const isAdmin = session.role === 'SUPERADMIN' || session.role === 'ADMIN'

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const op = str(body.op, 40)
    const quoteId = str(body.quoteId, 40)
    const id = str(body.id, 40)
    if (!quoteId) return res.status(400).json({ ok: false, error: 'quoteId requerido' })

    const quote = await quoteDb().findUnique({ where: { id: quoteId } })
    if (!quote) return res.status(404).json({ ok: false, error: 'Cotización no encontrada' })
    if (quote.ownerId !== session.userId && !isAdmin) {
      return res.status(403).json({ ok: false, error: 'Esta cotización es de otro usuario' })
    }

    if (op === 'list') {
      const attachments = await attachDb().findMany({ where: { quoteId }, orderBy: { createdAt: 'asc' }, select: META })
      return res.status(200).json({ ok: true, attachments })
    }

    if (op === 'upload') {
      const raw = String(body.fileBase64 || '')
      if (!raw) return res.status(400).json({ ok: false, error: 'Falta el archivo' })
      const base64 = raw.includes(',') ? raw.split(',').pop()! : raw
      const buffer = Buffer.from(base64, 'base64')
      if (!buffer.length) return res.status(400).json({ ok: false, error: 'Archivo vacío' })
      if (buffer.byteLength > ATTACHMENT_MAX_BYTES) {
        return res.status(413).json({ ok: false, error: 'El archivo supera 3,5 MB. Divídelo o súbelo como .md' })
      }
      const name = str(body.fileName, 240) || 'documento'
      const mimeType = str(body.mimeType, 160) || null

      let extracted
      try {
        extracted = await extractMarkdown(buffer, name, mimeType || '', { uploadedBy: session.username })
      } catch (error: any) {
        return res.status(422).json({
          ok: false,
          error: `No se pudo leer «${name}» (${error?.message || 'formato no soportado'}). Súbelo en .md, .docx, .pdf, .html o .txt.`,
        })
      }
      if (extracted.markdown.length < 20) {
        return res.status(400).json({
          ok: false,
          error: 'El archivo quedó sin texto aprovechable. Si es un PDF escaneado, no trae capa de texto: pásalo a .md o .docx.',
        })
      }

      const attachment = await attachDb().create({
        data: {
          quoteId,
          name,
          mimeType,
          sourceFormat: extracted.sourceFormat,
          markdown: extracted.markdown,
          charCount: extracted.markdown.length,
          converted: extracted.converted,
          uploadedBy: session.userId,
        },
        select: META,
      })
      const { pages, docTitle } = markdownToPages(extracted.markdown, { fallbackTitle: name.replace(/\.[a-z0-9]+$/i, '') })
      return res.status(200).json({
        ok: true,
        attachment: { ...attachment, truncated: extracted.truncated, pagesCount: pages.length, docTitle },
        preview: extracted.markdown.slice(0, 800),
      })
    }

    if (!id) return res.status(400).json({ ok: false, error: 'id requerido' })
    const attachment = await attachDb().findFirst({ where: { id, quoteId } })
    if (!attachment) return res.status(404).json({ ok: false, error: 'Adjunto no encontrado' })

    if (op === 'get') {
      return res.status(200).json({ ok: true, attachment })
    }

    if (op === 'update') {
      const data: Record<string, unknown> = {}
      if (body.name !== undefined) {
        const name = str(body.name, 240)
        if (name) data.name = name
      }
      if (body.markdown !== undefined) {
        const { markdown } = tidyMarkdown(str(body.markdown, ATTACHMENT_MAX_CHARS + 10))
        if (markdown.length < 20) return res.status(400).json({ ok: false, error: 'El contenido quedó demasiado corto' })
        data.markdown = markdown
        data.charCount = markdown.length
      }
      const updated = await attachDb().update({ where: { id }, data, select: META })
      return res.status(200).json({ ok: true, attachment: updated })
    }

    if (op === 'delete') {
      await attachDb().delete({ where: { id } })
      return res.status(200).json({ ok: true })
    }

    if (op === 'import') {
      const mode = body.mode === 'append' ? 'append' : 'replace'
      const current: DocPage[] = Array.isArray(quote.content?.pages) ? quote.content.pages : []
      const { pages: imported, docTitle } = markdownToPages(attachment.markdown, {
        fallbackTitle: attachment.name.replace(/\.[a-z0-9]+$/i, ''),
      })
      if (!imported.length) return res.status(400).json({ ok: false, error: 'El adjunto no produjo páginas' })

      // ids únicos frente a las páginas que ya existen
      const used = new Set(mode === 'append' ? current.map((p) => p.id) : [])
      const fresh = imported.map((p) => {
        let pid = p.id
        while (used.has(pid)) pid = `${pid}-${Math.random().toString(36).slice(2, 5)}`
        used.add(pid)
        return { ...p, id: pid }
      })
      const pages = renumberPages(mode === 'append' ? [...current, ...fresh] : fresh)

      const data: Record<string, unknown> = { content: { ...(quote.content as object), pages } }
      if (body.setTitle === true && docTitle) data.title = docTitle.slice(0, 400)
      const updated = await quoteDb().update({ where: { id: quoteId }, data })
      return res.status(200).json({ ok: true, quote: updated, pagesCount: fresh.length, totalPages: pages.length, docTitle })
    }

    return res.status(400).json({ ok: false, error: `Operación desconocida: ${op || '(vacía)'}` })
  } catch (error: any) {
    console.error('quotes/attach error:', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
