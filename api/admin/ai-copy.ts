import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '../_lib/prisma.js'
import { requireAdminSession } from '../_lib/admin-auth.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from '../_lib/integrations.js'

type VercelRequest = any
type VercelResponse = any

function extractJson(text: string): string {
  const cleaned = text.replace(/```json|```/gi, '').trim()
  const startObj = cleaned.indexOf('{')
  const endObj = cleaned.lastIndexOf('}')
  if (startObj !== -1 && endObj !== -1 && endObj > startObj) return cleaned.slice(startObj, endObj + 1)
  return cleaned
}

async function getGeminiModel() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data))
  if (!integrations.gemini.enabled || !integrations.gemini.config.apiKey) return null
  const ai = new GoogleGenerativeAI(integrations.gemini.config.apiKey)
  return ai.getGenerativeModel({
    model: integrations.gemini.config.model || 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.35,
    },
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const session = requireAdminSession(req, res)
  if (!session) return

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const objective = String(body?.objective || '').trim()
    const audience = String(body?.audience || '').trim() || 'Equipos directivos'
    const tone = String(body?.tone || '').trim() || 'Directo y profesional'
    const locale = String(body?.locale || 'es').trim()
    if (!objective) return res.status(400).json({ ok: false, error: 'objective is required' })

    const model = await getGeminiModel()
    if (!model) {
      return res.status(400).json({ ok: false, error: 'Gemini no está configurado en Integraciones' })
    }

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

    const result = await model.generateContent(prompt)
    const response = await result.response
    const parsed = JSON.parse(extractJson(response.text()))
    return res.status(200).json({
      ok: true,
      data: {
        title: String(parsed?.title || '').trim(),
        body: String(parsed?.body || '').trim(),
        ctaLabel: String(parsed?.ctaLabel || '').trim(),
        ctaHref: String(parsed?.ctaHref || '/#contacto').trim(),
        dismissLabel: String(parsed?.dismissLabel || '').trim(),
      },
    })
  } catch (error) {
    console.error('api/admin/ai-copy error', error)
    return res.status(500).json({ ok: false, error: 'AI copy generation failed' })
  }
}
