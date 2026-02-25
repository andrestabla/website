type IntegrationStatus = 'configured' | 'unconfigured' | 'error' | 'testing'

type GeminiConfig = {
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}

type OpenAIConfig = {
  apiKey: string
  orgId: string
  model: string
  maxTokens: number
}

type SMTPConfig = {
  host: string
  port: string
  user: string
  password: string
  fromName: string
  fromEmail: string
  encryption: 'tls' | 'ssl' | 'none'
}

type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl: string
  region: string
}

export type IntegrationsState = {
  gemini: { enabled: boolean; status: IntegrationStatus; config: GeminiConfig }
  openai: { enabled: boolean; status: IntegrationStatus; config: OpenAIConfig }
  smtp: { enabled: boolean; status: IntegrationStatus; config: SMTPConfig }
  r2: { enabled: boolean; status: IntegrationStatus; config: R2Config }
}

export const INTEGRATIONS_SNAPSHOT_ID = 'integrations'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

export const defaultIntegrations: IntegrationsState = {
  gemini: {
    enabled: false,
    status: 'unconfigured',
    config: { apiKey: '', model: 'gemini-2.0-flash', maxTokens: 8192, temperature: 0.2 },
  },
  openai: {
    enabled: false,
    status: 'unconfigured',
    config: { apiKey: '', orgId: '', model: 'gpt-4o', maxTokens: 4096 },
  },
  smtp: {
    enabled: false,
    status: 'unconfigured',
    config: { host: '', port: '587', user: '', password: '', fromName: '', fromEmail: '', encryption: 'tls' },
  },
  r2: {
    enabled: false,
    status: 'unconfigured',
    config: { accountId: '', accessKeyId: '', secretAccessKey: '', bucketName: '', publicUrl: '', region: 'auto' },
  },
}

export function isConfigured(state: IntegrationsState, key: keyof IntegrationsState): boolean {
  const cfg = state[key].config as Record<string, string>
  const required: Record<keyof IntegrationsState, string[]> = {
    gemini: ['apiKey'],
    openai: ['apiKey'],
    smtp: ['host', 'user', 'password', 'fromEmail'],
    r2: ['accountId', 'accessKeyId', 'secretAccessKey', 'bucketName'],
  }
  return required[key].every((f) => String(cfg[f] || '').trim() !== '')
}

export function sanitizeIntegrations(input: unknown): IntegrationsState {
  const base = clone(defaultIntegrations)
  if (!input || typeof input !== 'object') return base
  const raw = input as any
  const merged = {
    ...base,
    ...raw,
    gemini: { ...base.gemini, ...(raw.gemini || {}), config: { ...base.gemini.config, ...(raw.gemini?.config || {}) } },
    openai: { ...base.openai, ...(raw.openai || {}), config: { ...base.openai.config, ...(raw.openai?.config || {}) } },
    smtp: { ...base.smtp, ...(raw.smtp || {}), config: { ...base.smtp.config, ...(raw.smtp?.config || {}) } },
    r2: { ...base.r2, ...(raw.r2 || {}), config: { ...base.r2.config, ...(raw.r2?.config || {}) } },
  } as IntegrationsState

  for (const key of ['gemini', 'openai', 'smtp', 'r2'] as const) {
    merged[key].status = isConfigured(merged, key) ? 'configured' : 'unconfigured'
    if (!isConfigured(merged, key)) merged[key].enabled = false
  }
  return merged
}

export function applyServerEnv(state: IntegrationsState): IntegrationsState {
  const next = sanitizeIntegrations(state)

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''
  const geminiModel = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || ''
  if (geminiApiKey) {
    next.gemini.config.apiKey = geminiApiKey
    if (geminiModel) next.gemini.config.model = geminiModel
    next.gemini.enabled = true
    next.gemini.status = 'configured'
  }

  const openaiApiKey = process.env.OPENAI_API_KEY || ''
  const openaiModel = process.env.OPENAI_MODEL || ''
  if (openaiApiKey) {
    next.openai.config.apiKey = openaiApiKey
    if (openaiModel) next.openai.config.model = openaiModel
    next.openai.enabled = true
    next.openai.status = 'configured'
  }

  return next
}

export function maskSecrets(state: IntegrationsState): IntegrationsState {
  const next = clone(state)
  const mask = (value: string) => {
    if (!value) return ''
    if (value.length <= 6) return '••••••'
    return `${value.slice(0, 3)}••••••${value.slice(-3)}`
  }
  next.gemini.config.apiKey = mask(next.gemini.config.apiKey)
  next.openai.config.apiKey = mask(next.openai.config.apiKey)
  next.smtp.config.password = next.smtp.config.password ? '••••••••' : ''
  next.r2.config.secretAccessKey = next.r2.config.secretAccessKey ? '••••••••' : ''
  if (next.r2.config.accessKeyId) next.r2.config.accessKeyId = mask(next.r2.config.accessKeyId)
  return next
}

