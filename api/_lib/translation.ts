import crypto from 'node:crypto'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from './prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from './integrations.js'

export type TranslateMode = 'text' | 'object'

type TranslateBody = {
  targetLang: string
  payload: unknown
  mode: TranslateMode
}

export const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish',
  en: 'English',
  fr: 'French',
}

export const PRESERVE_TERMS = [
  'AlgoritmoT',
  'QM',
  'Quality Matters',
  'LMS',
  'API',
  'UTB',
  'CESA',
  'IBERO',
  'USTA',
  'USANMARTÍN',
  'San Martín',
  'La Salle',
]

const inFlightByKey = new Map<string, Promise<unknown>>()

function runDeduped<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlightByKey.get(key)
  if (existing) return existing as Promise<T>
  const promise = run().finally(() => inFlightByKey.delete(key))
  inFlightByKey.set(key, promise as Promise<unknown>)
  return promise
}

export function hashTranslationCacheKey(payload: unknown, targetLang: string, mode: TranslateMode) {
  const text = JSON.stringify({ input: payload, targetLang, mode })
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

async function translateWithGemini(body: TranslateBody): Promise<{ translated: unknown; modelName: string }> {
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
    const prompt = `Translate the following text from Spanish to ${targetLanguageName}. Return ONLY the translated text.
Keep these terms unchanged when present: ${PRESERVE_TERMS.join(', ')}.

${String(body.payload)}`
    const result = await model.generateContent(prompt)
    const response = await result.response
    return { translated: response.text().trim(), modelName }
  }

  const prompt = `Translate all user-facing string values in this JSON from Spanish to ${targetLanguageName}.
Preserve keys and structure exactly.
Keep URLs, emails, slugs, handles and identifiers unchanged.
Keep these terms unchanged when present: ${PRESERVE_TERMS.join(', ')}.
Return valid JSON only.

JSON:
${JSON.stringify(body.payload)}`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return { translated: JSON.parse(extractJson(response.text())), modelName }
}

export async function translateAndCache(body: TranslateBody): Promise<{
  data: unknown
  cached: boolean
  key: string
  provider: string
  model: string
}> {
  if (body.targetLang === 'es') {
    return { data: body.payload, cached: true, key: 'es', provider: 'native', model: 'none' }
  }

  const key = hashTranslationCacheKey(body.payload, body.targetLang, body.mode)
  const cached = await prisma.translationCache.findUnique({ where: { key } })
  if (cached) {
    return {
      data: cached.payload,
      cached: true,
      key,
      provider: cached.provider,
      model: cached.model,
    }
  }

  const result = await runDeduped(key, async () => {
    const { translated, modelName } = await translateWithGemini(body)
    await prisma.translationCache.upsert({
      where: { key },
      update: {
        payload: translated as any,
        provider: 'gemini',
        model: modelName,
        targetLang: body.targetLang,
      },
      create: {
        key,
        payload: translated as any,
        provider: 'gemini',
        model: modelName,
        targetLang: body.targetLang,
      },
    })
    return { translated, modelName }
  })

  return {
    data: result.translated,
    cached: false,
    key,
    provider: 'gemini',
    model: result.modelName,
  }
}
