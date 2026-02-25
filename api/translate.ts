import crypto from 'node:crypto'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from './_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from './_lib/integrations.js'

type VercelRequest = any
type VercelResponse = any

type TranslateBody = {
  targetLang: string
  payload: unknown
  mode?: 'text' | 'object'
}

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish',
  en: 'English',
  fr: 'French',
}

function hashKey(input: unknown, targetLang: string, mode: string) {
  const text = JSON.stringify({ input, targetLang, mode })
  return crypto.createHash('sha256').update(text).digest('hex')
}

async function getServerIntegrations() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  return applyServerEnv(sanitizeIntegrations(snapshot?.data))
}

async function getGeminiClient() {
  const integrations = await getServerIntegrations()
  const apiKey = integrations.gemini.enabled ? integrations.gemini.config.apiKey : ''
  if (!apiKey) return { ai: null, modelName: 'gemini-2.0-flash' }
  return { ai: new GoogleGenerativeAI(apiKey), modelName: integrations.gemini.config.model || 'gemini-2.0-flash' }
}

function extractJson(text: string): string {
  const cleaned = text.replace(/```json|```/gi, '').trim()
  const startObj = cleaned.indexOf('{')
  const endObj = cleaned.lastIndexOf('}')
  if (startObj !== -1 && endObj !== -1 && endObj > startObj) return cleaned.slice(startObj, endObj + 1)
  const startArr = cleaned.indexOf('[')
  const endArr = cleaned.lastIndexOf(']')
  if (startArr !== -1 && endArr !== -1 && endArr > startArr) return cleaned.slice(startArr, endArr + 1)
  return cleaned
}

async function translateWithGemini(body: TranslateBody) {
  const { ai, modelName } = await getGeminiClient()
  if (!ai) throw new Error('Gemini API key not configured on server')
  const model = ai.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: body.mode === 'object' ? 'application/json' : undefined,
      temperature: 0.1,
    },
  })
  const targetLanguageName = LANGUAGE_NAMES[body.targetLang] || body.targetLang

  if (body.mode === 'text') {
    const prompt = `Translate the following text from Spanish to ${targetLanguageName}. Return ONLY the translated text.\n\n${String(body.payload)}`
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text().trim()
  }

  const prompt = `Translate all user-facing string values in this JSON from Spanish to ${targetLanguageName}.
Preserve keys and structure exactly.
Keep URLs, emails, slugs, handles and identifiers unchanged.
Return valid JSON only.

JSON:
${JSON.stringify(body.payload)}`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return JSON.parse(extractJson(response.text()))
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
    if (body.targetLang === 'es') {
      return res.status(200).json({ ok: true, data: body.payload, cached: true })
    }

    const mode = body.mode || (typeof body.payload === 'string' ? 'text' : 'object')
    const key = hashKey(body.payload, body.targetLang, mode)
    const cached = await prisma.translationCache.findUnique({ where: { key } })
    if (cached) {
      return res.status(200).json({ ok: true, data: cached.payload, cached: true })
    }

    const data = await translateWithGemini({ ...body, mode })

    await prisma.translationCache.upsert({
      where: { key },
      update: { payload: data as any, provider: 'gemini', model: process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash', targetLang: body.targetLang },
      create: { key, payload: data as any, provider: 'gemini', model: process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash', targetLang: body.targetLang },
    })

    return res.status(200).json({ ok: true, data, cached: false })
  } catch (error) {
    console.error('api/translate error', error)
    return res.status(500).json({ ok: false, error: 'Translation failed' })
  }
}
