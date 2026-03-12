import { translateAndCache, type TranslateMode } from './_lib/translation.js'

type VercelRequest = any
type VercelResponse = any

type TranslateBody = {
  targetLang: string
  payload: unknown
  mode?: TranslateMode
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as TranslateBody
    if (!body?.targetLang || body.payload === undefined) {
      return res.status(400).json({ ok: false, error: 'Missing targetLang or payload' })
    }
    const mode = body.mode || (typeof body.payload === 'string' ? 'text' : 'object')
    const result = await translateAndCache({ targetLang: body.targetLang, payload: body.payload, mode })
    return res.status(200).json({ ok: true, data: result.data, cached: result.cached })
  } catch (error) {
    console.error('api/translate error', error)
    return res.status(500).json({ ok: false, error: 'Translation failed' })
  }
}
