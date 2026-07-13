import { requireAdminSession } from '../../_lib/admin-auth.js'
import { prisma } from '../../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv } from '../../_lib/integrations.js'
import { canAccessDocumentCategory } from '../../_lib/doc-permissions.js'

type VercelRequest = any
type VercelResponse = any

const TEXT_MIME_TYPES = ['text/plain', 'text/csv', 'text/markdown', 'text/html', 'application/json', 'application/xml']

/** Extrae texto de un PDF remoto usando pdf-parse (import dinámico). Best-effort. */
async function extractPdfText(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const fileRes = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!fileRes.ok) return ''
    const arrayBuffer = await fileRes.arrayBuffer()
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: Buffer.from(arrayBuffer) })
    const result = await parser.getText()
    return String(result?.text || '').slice(0, 8000)
  } catch (err) {
    console.warn('extractPdfText failed:', err)
    return ''
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    const session = requireAdminSession(req, res)
    if (!session) return

    const id = String(req.query?.id || '')
    if (!id) return res.status(400).json({ ok: false, error: 'id is required' })

    const document = await prisma.document.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!document) return res.status(404).json({ ok: false, error: 'Document not found' })
    if (!(await canAccessDocumentCategory(session, document.categoryId))) {
      return res.status(403).json({ ok: false, error: 'No tienes acceso a este documento' })
    }

    const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
    const integrations = applyServerEnv(snapshot?.data ?? {})
    const openai = integrations.openai
    if (!openai.enabled || !openai.config.apiKey) {
      return res.status(400).json({ ok: false, error: 'OpenAI integration is not configured' })
    }

    const { apiKey, model, maxTokens } = openai.config

    let contentHint = ''
    if (document.publicUrl && document.mimeType === 'application/pdf') {
      contentHint = await extractPdfText(document.publicUrl)
    } else if (document.publicUrl && TEXT_MIME_TYPES.includes(document.mimeType)) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        const fileRes = await fetch(document.publicUrl, { signal: controller.signal })
        clearTimeout(timeout)
        if (fileRes.ok) {
          const text = await fileRes.text()
          contentHint = text.slice(0, 8000)
        }
      } catch {
        // No crítico; se continúa con metadatos del nombre de archivo
      }
    }

    const systemPrompt = `Eres un especialista en metadatos documentales. A partir de la información de un documento, genera:
- title: un título claro y conciso (máx. 80 caracteres)
- description: un resumen breve y útil del documento (2-3 frases, máx. 300 caracteres) que refleje su contenido
- keywords: 5-10 palabras clave/etiquetas relevantes como arreglo de cadenas

IMPORTANTE: Responde SIEMPRE en ESPAÑOL (title, description y keywords en español), sin importar el idioma del documento.
Responde ÚNICAMENTE con un objeto JSON válido: {"title": "...", "description": "...", "keywords": ["...", ...]}`

    const userPrompt = `Información del documento:
- Nombre de archivo: ${document.originalName}
- Tipo (MIME): ${document.mimeType}
- Espacio/Categoría: ${document.category.name} (ruta: ${document.category.path})
- Fecha de carga: ${document.createdAt.toISOString().slice(0, 10)}
${contentHint ? `\nVista previa del contenido del documento:\n${contentHint}` : '\n(No fue posible extraer el contenido; genera los metadatos a partir del nombre y la categoría.)'}`

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        max_tokens: Math.min(maxTokens || 4096, 500),
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => '')
      console.error('OpenAI API error:', openaiRes.status, errText)
      return res.status(502).json({ ok: false, error: `Error en API de OpenAI (${openaiRes.status}): ${errText.slice(0, 100)}` })
    }

    const openaiData = await openaiRes.json()
    const rawContent = openaiData.choices?.[0]?.message?.content || '{}'

    let extracted: { title?: string; description?: string; keywords?: string[] } = {}
    try {
      extracted = JSON.parse(rawContent)
    } catch {
      return res.status(502).json({ ok: false, error: 'Failed to parse OpenAI response' })
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        title: extracted.title?.trim() || document.title,
        description: extracted.description?.trim() || null,
        keywords: Array.isArray(extracted.keywords) ? extracted.keywords.map(String) : [],
        aiProcessed: true,
      },
    })

    return res.status(200).json({ ok: true, data: updated, extracted })
  } catch (error: any) {
    console.error('api/admin/documents/ai-process error', error)
    return res.status(500).json({ ok: false, error: `Error del servidor: ${error?.message || 'Excepción desconocida'}` })
  }
}
