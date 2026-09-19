import { requireAdminSession } from '../_lib/admin-auth.js'
import { generateJsonWithAI, type AIProvider } from '../_lib/ai.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const session = await requireAdminSession(req, res)
  if (!session) return

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const objective = String(body?.objective || '').trim()
    const audience = String(body?.audience || '').trim() || 'Equipos directivos'
    const tone = String(body?.tone || '').trim() || 'Directo y profesional'
    const locale = String(body?.locale || 'es').trim()
    const provider = (body?.provider === 'openai' || body?.provider === 'gemini' ? body.provider : 'auto') as AIProvider
    if (!objective) return res.status(400).json({ ok: false, error: 'objective is required' })

    const prompt = `Genera copy de conversión para un popup de sitio web.
Responde en ${locale === 'en' ? 'English' : 'Spanish'}.
Objetivo: ${objective}
Audiencia: ${audience}
Tono: ${tone}

Devuelve JSON válido con esta estructura exacta:
{
  "title": "máximo 9 palabras",
  "body": "máximo 35 palabras",
  "ctaLabel": "máximo 4 palabras",
  "ctaHref": "/#contacto",
  "dismissLabel": "máximo 3 palabras"
}

No agregues markdown ni texto adicional.`

    const generated = await generateJsonWithAI({
      prompt,
      provider,
      temperature: 0.35,
      maxTokens: 700,
    })

    return res.status(200).json({
      ok: true,
      providerUsed: generated.providerUsed,
      data: {
        title: String(generated.data?.title || '').trim(),
        body: String(generated.data?.body || '').trim(),
        ctaLabel: String(generated.data?.ctaLabel || '').trim(),
        ctaHref: String(generated.data?.ctaHref || '/#contacto').trim(),
        dismissLabel: String(generated.data?.dismissLabel || '').trim(),
      },
    })
  } catch (error) {
    console.error('api/admin/ai-copy error', error)
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'AI copy generation failed' })
  }
}
