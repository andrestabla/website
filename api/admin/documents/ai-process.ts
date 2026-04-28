import { requireAdminSession } from '../../_lib/admin-auth.js'
import { prisma } from '../../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv } from '../../_lib/integrations.js'

type VercelRequest = any
type VercelResponse = any

const TEXT_MIME_TYPES = ['text/plain', 'text/csv', 'text/markdown', 'text/html', 'application/json', 'application/xml']

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

    const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
    const integrations = applyServerEnv(snapshot?.data ?? {})
    const openai = integrations.openai
    if (!openai.enabled || !openai.config.apiKey) {
      return res.status(400).json({ ok: false, error: 'OpenAI integration is not configured' })
    }

    const { apiKey, model, maxTokens } = openai.config

    let contentHint = ''
    if (document.publicUrl && TEXT_MIME_TYPES.includes(document.mimeType)) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        const fileRes = await fetch(document.publicUrl, { signal: controller.signal })
        clearTimeout(timeout)
        if (fileRes.ok) {
          const text = await fileRes.text()
          contentHint = text.slice(0, 6000)
        }
      } catch {
        // Non-critical; continue with filename-based metadata
      }
    }

    const systemPrompt = `You are a document metadata specialist. Given information about a document, extract or generate:
- title: A clear, concise title (max 80 chars)
- description: A brief summary of the document (2-3 sentences, max 300 chars)
- keywords: 5-10 relevant keywords/tags as an array of strings

Respond ONLY with a valid JSON object: {"title": "...", "description": "...", "keywords": ["...", ...]}`

    const userPrompt = `Document Information:
- File name: ${document.originalName}
- MIME type: ${document.mimeType}
- Category: ${document.category.name} (path: ${document.category.path})
- Upload date: ${document.createdAt.toISOString().slice(0, 10)}
${contentHint ? `\nDocument content preview:\n${contentHint}` : ''}`

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
