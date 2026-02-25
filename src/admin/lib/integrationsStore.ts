/**
 * integrationsStore — persists API keys and integration config to localStorage.
 * SECURITY NOTE: This is a dev/demo implementation. In production, credentials
 * should never be stored in the browser — use server-side environment variables.
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

const defaults: IntegrationsState = {
    gemini: {
        enabled: false,
        status: 'unconfigured',
        config: { apiKey: '', model: 'gemini-2.0-flash', maxTokens: 8192, temperature: 0.7 },
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

export async function loadIntegrations(): Promise<IntegrationsState> {
    try {
        const res = await fetch('/api/integrations')
        if (!res.ok) return JSON.parse(JSON.stringify(defaults))
        const data = await res.json()
        return { ...JSON.parse(JSON.stringify(defaults)), ...data }
    } catch {
        return JSON.parse(JSON.stringify(defaults))
    }
}

export async function saveIntegrations(key: keyof IntegrationsState, data: any) {
    try {
        await fetch('/api/integrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, ...data }),
        })
    } catch { }
}

export function isConfigured(state: IntegrationsState, key: keyof IntegrationsState): boolean {
    const cfg = state[key].config as Record<string, string>
    // Check that required fields are non-empty
    const required: Record<keyof IntegrationsState, string[]> = {
        gemini: ['apiKey'],
        openai: ['apiKey'],
        smtp: ['host', 'user', 'password', 'fromEmail'],
        r2: ['accountId', 'accessKeyId', 'secretAccessKey', 'bucketName'],
    }
    return required[key].every(f => cfg[f] && cfg[f].trim() !== '')
}
