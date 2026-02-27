import { requireAdminSession } from '../_lib/admin-auth.js'
import { generateJsonWithAI, type AIProvider } from '../_lib/ai.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const session = requireAdminSession(req, res)
  if (!session) return

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const campaignName = String(body?.campaignName || '').trim()
    const objective = String(body?.objective || '').trim()
    const audience = String(body?.audience || '').trim() || 'Directivos y líderes de área'
    const tone = String(body?.tone || '').trim() || 'Directo y profesional'
    const locale = String(body?.locale || 'es').trim()
    const provider = (body?.provider === 'openai' || body?.provider === 'gemini' ? body.provider : 'auto') as AIProvider

    if (!campaignName || !objective) {
      return res.status(400).json({ ok: false, error: 'campaignName and objective are required' })
    }

    const prompt = `Genera copy de email marketing para campaña B2B.
Idioma: ${locale === 'en' ? 'English' : 'Spanish'}.
Nombre campaña: ${campaignName}
Objetivo: ${objective}
Audiencia: ${audience}
Tono: ${tone}

Devuelve JSON válido con esta estructura:
{
  "subject": "máximo 70 caracteres",
  "preheader": "máximo 90 caracteres",
  "bodyText": "mensaje en párrafos cortos con llamado a la acción",
  "ctaLabel": "máximo 4 palabras",
  "ctaHref": "/#contacto"
}

No devuelvas markdown ni texto fuera del JSON.`

    const generated = await generateJsonWithAI({
      prompt,
      provider,
      temperature: 0.4,
      maxTokens: 1000,
    })

    return res.status(200).json({
      ok: true,
      providerUsed: generated.providerUsed,
      data: {
        subject: String(generated.data?.subject || '').trim(),
        preheader: String(generated.data?.preheader || '').trim(),
        bodyText: String(generated.data?.bodyText || '').trim(),
        ctaLabel: String(generated.data?.ctaLabel || '').trim(),
        ctaHref: String(generated.data?.ctaHref || '/#contacto').trim(),
      },
    })
  } catch (error) {
    console.error('api/admin/ai-email error', error)
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Email AI generation failed' })
  }
}
