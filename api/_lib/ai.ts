import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from './prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from './integrations.js'

export type AIProvider = 'gemini' | 'openai' | 'auto'

type AiIntegrations = ReturnType<typeof sanitizeIntegrations>

function extractJson(text: string): string {
  const cleaned = String(text || '').replace(/```json|```/gi, '').trim()
  const startObj = cleaned.indexOf('{')
  const endObj = cleaned.lastIndexOf('}')
  if (startObj !== -1 && endObj !== -1 && endObj > startObj) return cleaned.slice(startObj, endObj + 1)
  const startArr = cleaned.indexOf('[')
  const endArr = cleaned.lastIndexOf(']')
  if (startArr !== -1 && endArr !== -1 && endArr > startArr) return cleaned.slice(startArr, endArr + 1)
  return cleaned
}

async function getServerIntegrations(): Promise<AiIntegrations> {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  return applyServerEnv(sanitizeIntegrations(snapshot?.data))
}

function getProviderOrder(provider: AIProvider, integrations: AiIntegrations): Array<'openai' | 'gemini'> {
  const openaiReady = integrations.openai.enabled && !!integrations.openai.config.apiKey
  const geminiReady = integrations.gemini.enabled && !!integrations.gemini.config.apiKey
  if (provider === 'openai') return openaiReady ? ['openai'] : []
  if (provider === 'gemini') return geminiReady ? ['gemini'] : []
  const order: Array<'openai' | 'gemini'> = []
  if (openaiReady) order.push('openai')
  if (geminiReady) order.push('gemini')
  return order
}

async function generateJsonWithOpenAI({
  prompt,
  integrations,
  temperature,
  maxTokens,
}: {
  prompt: string
  integrations: AiIntegrations
  temperature: number
  maxTokens: number
}) {
  const apiKey = integrations.openai.config.apiKey
  const model = integrations.openai.config.model || process.env.OPENAI_MODEL || 'gpt-4o'
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a strict JSON generator. Return only valid JSON with no markdown.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })
  const json = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(json?.error?.message || `OpenAI request failed (${response.status})`)
  }
  const content = String(json?.choices?.[0]?.message?.content || '')
  return JSON.parse(extractJson(content))
}

async function generateJsonWithGemini({
  prompt,
  integrations,
  temperature,
}: {
  prompt: string
  integrations: AiIntegrations
  temperature: number
}) {
  const apiKey = integrations.gemini.config.apiKey
  const modelName = integrations.gemini.config.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const ai = new GoogleGenerativeAI(apiKey)
  const model = ai.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature,
    },
  })
  const result = await model.generateContent(prompt)
  const response = await result.response
  return JSON.parse(extractJson(response.text()))
}

export async function getAiAvailability() {
  const integrations = await getServerIntegrations()
  return {
    openai: integrations.openai.enabled && !!integrations.openai.config.apiKey,
    gemini: integrations.gemini.enabled && !!integrations.gemini.config.apiKey,
  }
}

export async function generateJsonWithAI({
  prompt,
  provider = 'auto',
  temperature = 0.3,
  maxTokens = 1200,
}: {
  prompt: string
  provider?: AIProvider
  temperature?: number
  maxTokens?: number
}): Promise<{ providerUsed: 'openai' | 'gemini'; data: any }> {
  const integrations = await getServerIntegrations()
  const order = getProviderOrder(provider, integrations)
  if (order.length === 0) {
    throw new Error('No AI provider configured (OpenAI/Gemini)')
  }

  let lastError: unknown = null
  for (const selected of order) {
    try {
      if (selected === 'openai') {
        const data = await generateJsonWithOpenAI({ prompt, integrations, temperature, maxTokens })
        return { providerUsed: 'openai', data }
      }
      const data = await generateJsonWithGemini({ prompt, integrations, temperature })
      return { providerUsed: 'gemini', data }
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(lastError instanceof Error ? lastError.message : 'AI generation failed')
}
