/**
 * Cotizador — base de documentos de contexto.
 *
 * Es la memoria de la que bebe la IA al construir cada cotización: metodología,
 * condiciones comerciales, casos anteriores, tono de marca. Guardamos el texto
 * plano extraído (no el binario): es lo único que el modelo necesita leer y
 * mantiene la tabla liviana.
 *
 * op: list | get | create | update | delete
 */
import { prisma } from '../_lib/prisma.js'
import { quoteSessionState } from '../_lib/quotes.js'

type VercelRequest = any
type VercelResponse = any

export const maxDuration = 60

const db = () => (prisma as any).quoteKnowledgeDoc

const KINDS = ['METHODOLOGY', 'PRICING', 'CASE', 'TERMS', 'BRAND', 'REFERENCE'] as const
type Kind = (typeof KINDS)[number]

const str = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const kindOf = (v: unknown): Kind => (KINDS.includes(v as Kind) ? (v as Kind) : 'REFERENCE')

/** Tope por documento: suficiente para una propuesta completa, acotado para no reventar el contexto del modelo. */
const MAX_CHARS = 120_000
/** Tope del archivo subido (Vercel corta el cuerpo JSON alrededor de 4.5 MB). */
const MAX_FILE_BYTES = 3.5 * 1024 * 1024

/** Normaliza saltos y espacios: el ruido de formato sólo gasta tokens. */
function tidy(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CHARS)
}

/** Extrae texto de docx, pdf o texto plano. Devuelve '' si el formato no se soporta. */
async function extractText(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const name = fileName.toLowerCase()
  const isDocx = name.endsWith('.docx') || mimeType.includes('wordprocessingml')
  const isPdf = name.endsWith('.pdf') || mimeType.includes('pdf')

  if (isDocx) {
    const mammoth: any = await import('mammoth')
    const result = await (mammoth.default ?? mammoth).extractRawText({ buffer })
    return String(result?.value || '')
  }
  if (isPdf) {
    // pdf-parse v2: API de clase (PDFParse → getText)
    const mod: any = await import('pdf-parse')
    const parser = new mod.PDFParse({ data: new Uint8Array(buffer) })
    try {
      const result = await parser.getText()
      return String(result?.text || '')
    } finally {
      await parser.destroy().catch(() => undefined)
    }
  }
  // .txt, .md, .html y cualquier otro texto plano
  return buffer.toString('utf8')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = quoteSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Sesión requerida' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'Sin acceso al Cotizador' })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const op = str(body.op, 40)
    const id = str(body.id, 40)

    if (op === 'list') {
      // Sin `content`: la lista se abre a menudo y el texto completo pesa.
      const docs = await db().findMany({
        orderBy: { updatedAt: 'desc' },
        take: 200,
        select: {
          id: true, title: true, kind: true, sourceName: true, mimeType: true,
          summary: true, charCount: true, active: true, uploadedBy: true,
          createdAt: true, updatedAt: true,
        },
      })
      return res.status(200).json({ ok: true, docs })
    }

    if (op === 'get') {
      if (!id) return res.status(400).json({ ok: false, error: 'id requerido' })
      const doc = await db().findUnique({ where: { id } })
      if (!doc) return res.status(404).json({ ok: false, error: 'Documento no encontrado' })
      return res.status(200).json({ ok: true, doc })
    }

    if (op === 'create') {
      const title = str(body.title, 200)
      if (!title) return res.status(400).json({ ok: false, error: 'Falta el título' })

      let content = ''
      let sourceName: string | null = null
      let mimeType: string | null = null

      if (typeof body.fileBase64 === 'string' && body.fileBase64) {
        const base64 = body.fileBase64.includes(',') ? body.fileBase64.split(',').pop()! : body.fileBase64
        const buffer = Buffer.from(base64, 'base64')
        if (buffer.byteLength > MAX_FILE_BYTES) {
          return res.status(413).json({ ok: false, error: 'El archivo supera 3,5 MB. Súbelo dividido o pega el texto.' })
        }
        sourceName = str(body.fileName, 240) || 'documento'
        mimeType = str(body.mimeType, 160) || null
        try {
          content = tidy(await extractText(buffer, sourceName, mimeType || ''))
        } catch (error: any) {
          return res.status(422).json({
            ok: false,
            error: `No se pudo leer el archivo (${error?.message || 'formato no soportado'}). Prueba con .docx, .pdf o pega el texto.`,
          })
        }
      } else {
        content = tidy(str(body.content, MAX_CHARS))
      }

      if (content.length < 40) {
        return res.status(400).json({
          ok: false,
          error: 'El documento quedó sin texto aprovechable. Si es un PDF escaneado, no trae capa de texto: pégalo a mano.',
        })
      }

      const doc = await db().create({
        data: {
          title,
          kind: kindOf(body.kind),
          sourceName,
          mimeType,
          content,
          summary: str(body.summary, 600) || null,
          charCount: content.length,
          active: body.active !== false,
          uploadedBy: session.userId,
        },
      })
      return res.status(200).json({
        ok: true,
        doc: { ...doc, content: undefined },
        extractedChars: content.length,
      })
    }

    if (op === 'update') {
      if (!id) return res.status(400).json({ ok: false, error: 'id requerido' })
      const data: Record<string, unknown> = {}
      if (body.title !== undefined) data.title = str(body.title, 200)
      if (body.kind !== undefined) data.kind = kindOf(body.kind)
      if (body.summary !== undefined) data.summary = str(body.summary, 600) || null
      if (body.active !== undefined) data.active = body.active === true
      if (body.content !== undefined) {
        const content = tidy(str(body.content, MAX_CHARS))
        if (content.length < 40) return res.status(400).json({ ok: false, error: 'El contenido quedó demasiado corto' })
        data.content = content
        data.charCount = content.length
      }
      const doc = await db().update({ where: { id }, data })
      return res.status(200).json({ ok: true, doc: { ...doc, content: undefined } })
    }

    if (op === 'delete') {
      if (!id) return res.status(400).json({ ok: false, error: 'id requerido' })
      await db().delete({ where: { id } })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ ok: false, error: `Operación desconocida: ${op || '(vacía)'}` })
  } catch (error: any) {
    console.error('quotes/knowledge error:', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
