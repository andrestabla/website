/**
 * integrationsStore — server-backed integration configuration store.
 * Persists to `/api/integrations` (Vercel Functions + Neon), never localStorage.
 */

export type IntegrationStatus = 'configured' | 'unconfigured' | 'error' | 'testing'

export type GeminiConfig = {
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}

export type OpenAIConfig = {
  apiKey: string
  orgId: string
  model: string
  maxTokens: number
}

export type SMTPConfig = {
  host: string
  port: string
  user: string
  password: string
  fromName: string
  fromEmail: string
  encryption: 'tls' | 'ssl' | 'none'
}

export type R2Config = {
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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
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

export async function fetchIntegrations(): Promise<IntegrationsState> {
  try {
    const res = await fetch('/api/integrations', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return (json?.data || clone(defaultIntegrations)) as IntegrationsState
  } catch {
    return clone(defaultIntegrations)
  }
}

export async function persistIntegrations(state: IntegrationsState): Promise<IntegrationsState> {
  const res = await fetch('/api/integrations', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  })
  if (!res.ok) {
    throw new Error(`Failed to persist integrations: ${res.status}`)
  }
  const json = await res.json()
  return (json?.data || state) as IntegrationsState
}
