import { requireAdminSession } from '../_lib/admin-auth.js'
import { generateJsonWithAI, type AIProvider } from '../_lib/ai.js'
import { sanitizeCampaignLanding, slugify } from '../_lib/campaign-landings.js'

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
    const audience = String(body?.audience || '').trim() || 'Equipos directivos'
    const tone = String(body?.tone || '').trim() || 'Directo y consultivo'
    const locale = String(body?.locale || 'es').trim()
    const provider = (body?.provider === 'openai' || body?.provider === 'gemini' ? body.provider : 'auto') as AIProvider

    if (!campaignName || !objective) {
      return res.status(400).json({ ok: false, error: 'campaignName and objective are required' })
    }

    const prompt = `Genera una landing page de campaña enfocada en conversión B2B.
Idioma de salida: ${locale === 'en' ? 'English' : 'Spanish'}.
Nombre campaña: ${campaignName}
Objetivo: ${objective}
Audiencia: ${audience}
Tono: ${tone}

Devuelve JSON válido con esta estructura exacta:
{
  "seoTitle": "string",
  "seoDescription": "string",
  "heroEyebrow": "string",
  "heroTitle": "string",
  "heroSubtitle": "string",
  "primaryCtaLabel": "string",
  "primaryCtaHref": "/#contacto",
  "secondaryCtaLabel": "string",
  "secondaryCtaHref": "/#servicios",
  "sections": [
    { "id": "problema", "title": "string", "body": "string", "bullets": ["string", "string", "string"] },
    { "id": "solucion", "title": "string", "body": "string", "bullets": ["string", "string", "string"] },
    { "id": "prueba", "title": "string", "body": "string", "bullets": ["string", "string", "string"] }
  ],
  "offerTitle": "string",
  "offerBody": "string",
  "formTitle": "string",
  "thankYouMessage": "string",
  "accentColor": "#2563eb",
  "backgroundStyle": "dark-grid"
}

Restricciones:
- máximo 3 secciones en el array
- bullets concretos y accionables
- copy orientado a conversión
- no agregues markdown ni texto extra fuera del JSON.`

    const generated = await generateJsonWithAI({
      prompt,
      provider,
      temperature: 0.35,
      maxTokens: 1800,
    })

    const landing = sanitizeCampaignLanding({
      ...generated.data,
      name: campaignName,
      slug: slugify(campaignName),
      objective,
      audience,
      tone,
      provider: generated.providerUsed,
      status: 'draft',
      lastGeneratedAt: new Date().toISOString(),
    })

    return res.status(200).json({
      ok: true,
      providerUsed: generated.providerUsed,
      landing,
    })
  } catch (error) {
    console.error('api/admin/ai-landing error', error)
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Landing generation failed' })
  }
}
