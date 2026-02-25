/**
 * ManageIntegrations — Admin integration configuration hub.
 * Each provider has a step-by-step wizard in a slide-over panel.
 */
import { useState, useEffect } from 'react'
import { Zap, ChevronRight, CheckCircle2, XCircle, AlertCircle, Eye, EyeOff, X, ArrowRight, ArrowLeft, Save, RefreshCw, Cloud, Mail, Bot, Cpu } from 'lucide-react'
import {
    defaultIntegrations, fetchIntegrations, persistIntegrations, isConfigured,
    type IntegrationsState, type GeminiConfig, type OpenAIConfig, type SMTPConfig, type R2Config,
} from '../lib/integrationsStore'

// ─── Types ─────────────────────────────────────────────────────────────────

type IntegrationKey = keyof IntegrationsState
type WizardState = { open: boolean; key: IntegrationKey | null; step: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status, enabled }: { status: string; enabled: boolean }) {
    if (!enabled || status === 'unconfigured') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <AlertCircle className="w-3.5 h-3.5" />
                No configurado
            </span>
        )
    }
    if (status === 'configured') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Activo
            </span>
        )
    }
    if (status === 'error') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-500">
                <XCircle className="w-3.5 h-3.5" />
                Error
            </span>
        )
    }
    return null
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    const [show, setShow] = useState(false)
    return (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-4 pr-12 text-sm font-mono text-slate-900 focus:border-brand-primary outline-none placeholder:text-slate-300"
            />
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
            >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    )
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">{label}</label>
            {children}
            {hint && <p className="text-xs text-slate-400 font-light">{hint}</p>}
        </div>
    )
}

function TextInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-50 border border-slate-200 px-4 py-4 text-sm text-slate-900 focus:border-brand-primary outline-none placeholder:text-slate-300"
        />
    )
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 px-4 py-4 text-sm text-slate-900 focus:border-brand-primary outline-none"
        >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    )
}

// ─── Integration card definitions ────────────────────────────────────────────

const integrationDefs = [
    {
        key: 'gemini' as IntegrationKey,
        label: 'Google Gemini',
        icon: Bot,
        color: 'bg-blue-600',
        tagline: 'IA generativa — texto, código y análisis multimodal',
        docs: 'https://ai.google.dev/gemini-api/docs',
        steps: ['Credenciales', 'Modelo', 'Confirmar'],
    },
    {
        key: 'openai' as IntegrationKey,
        label: 'OpenAI',
        icon: Cpu,
        color: 'bg-emerald-600',
        tagline: 'GPT-4o, embeddings y Whisper para tu stack de IA',
        docs: 'https://platform.openai.com/docs',
        steps: ['Credenciales', 'Modelo', 'Confirmar'],
    },
    {
        key: 'smtp' as IntegrationKey,
        label: 'Correo Saliente (SMTP)',
        icon: Mail,
        color: 'bg-amber-600',
        tagline: 'Envío transaccional — formularios, notificaciones y alertas',
        docs: 'https://nodemailer.com/smtp/',
        steps: ['Servidor', 'Autenticación', 'Remitente', 'Confirmar'],
    },
    {
        key: 'r2' as IntegrationKey,
        label: 'Cloudflare R2 Storage',
        icon: Cloud,
        color: 'bg-orange-500',
        tagline: 'Object storage sin egress cost — imágenes, archivos y assets',
        docs: 'https://developers.cloudflare.com/r2/',
        steps: ['Cuenta', 'Credenciales', 'Bucket', 'Confirmar'],
    },
]

// ─── Wizard content per integration ──────────────────────────────────────────

function GeminiWizard({ step, config, onChange }: { step: number; config: GeminiConfig; onChange: (c: Partial<GeminiConfig>) => void }) {
    if (step === 0) return (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                <strong>¿Cómo obtener tu API Key?</strong><br />
                Ve a <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline font-bold">Google AI Studio → API Keys</a>, crea una clave y pégala aquí.
            </div>
            <FormField label="API Key de Gemini" hint="Empieza con 'AIza...' — se almacena de forma local.">
                <SecretInput value={config.apiKey} onChange={v => onChange({ apiKey: v })} placeholder="AIzaSy..." />
            </FormField>
        </div>
    )
    if (step === 1) return (
        <div className="space-y-6">
            <FormField label="Modelo" hint="gemini-2.0-flash es el más rápido y económico. gemini-1.5-pro es el de mayor contexto.">
                <SelectInput value={config.model} onChange={v => onChange({ model: v })} options={[
                    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (recomendado)' },
                    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
                    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (contexto 1M tokens)' },
                    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
                ]} />
            </FormField>
            <FormField label={`Temperatura: ${config.temperature}`} hint="0 = determinista. 1 = creativo. Para análisis, usa 0.2–0.4.">
                <input type="range" min={0} max={1} step={0.05} value={config.temperature}
                    onChange={e => onChange({ temperature: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>Preciso</span><span>Creativo</span></div>
            </FormField>
            <FormField label="Tokens Máximos" hint="Longitud máxima de respuesta generada.">
                <SelectInput value={String(config.maxTokens)} onChange={v => onChange({ maxTokens: parseInt(v) })} options={[
                    { value: '1024', label: '1 024 tokens (~750 palabras)' },
                    { value: '4096', label: '4 096 tokens (~3 000 palabras)' },
                    { value: '8192', label: '8 192 tokens (~6 000 palabras)' },
                    { value: '32768', label: '32 768 tokens (documento largo)' },
                ]} />
            </FormField>
        </div>
    )
    return (
        <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-6 space-y-3 font-mono text-sm">
                <ConfirmRow label="Modelo" value={config.model} />
                <ConfirmRow label="API Key" value={config.apiKey ? `${'•'.repeat(12)}${config.apiKey.slice(-4)}` : '—'} />
                <ConfirmRow label="Temperatura" value={String(config.temperature)} />
                <ConfirmRow label="Max Tokens" value={String(config.maxTokens)} />
            </div>
        </div>
    )
}

function OpenAIWizard({ step, config, onChange }: { step: number; config: OpenAIConfig; onChange: (c: Partial<OpenAIConfig>) => void }) {
    if (step === 0) return (
        <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                <strong>¿Cómo obtener tu API Key?</strong><br />
                Ve a <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="underline font-bold">platform.openai.com → API Keys</a> y crea una nueva clave.
            </div>
            <FormField label="API Key" hint="Empieza con 'sk-...'">
                <SecretInput value={config.apiKey} onChange={v => onChange({ apiKey: v })} placeholder="sk-..." />
            </FormField>
            <FormField label="Organization ID (opcional)" hint="Solo si perteneces a más de una organización en OpenAI.">
                <TextInput value={config.orgId} onChange={v => onChange({ orgId: v })} placeholder="org-..." />
            </FormField>
        </div>
    )
    if (step === 1) return (
        <div className="space-y-6">
            <FormField label="Modelo" hint="gpt-4o es el más capaz. gpt-4o-mini es 10x más económico para tareas simples.">
                <SelectInput value={config.model} onChange={v => onChange({ model: v })} options={[
                    { value: 'gpt-4o', label: 'GPT-4o (recomendado)' },
                    { value: 'gpt-4o-mini', label: 'GPT-4o mini (económico)' },
                    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (legacy)' },
                    { value: 'o3-mini', label: 'o3-mini (razonamiento)' },
                ]} />
            </FormField>
            <FormField label="Tokens Máximos">
                <SelectInput value={String(config.maxTokens)} onChange={v => onChange({ maxTokens: parseInt(v) })} options={[
                    { value: '1024', label: '1 024 tokens' },
                    { value: '4096', label: '4 096 tokens' },
                    { value: '8192', label: '8 192 tokens' },
                    { value: '16384', label: '16 384 tokens' },
                ]} />
            </FormField>
        </div>
    )
    return (
        <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-6 space-y-3 font-mono text-sm">
                <ConfirmRow label="Modelo" value={config.model} />
                <ConfirmRow label="API Key" value={config.apiKey ? `${'•'.repeat(12)}${config.apiKey.slice(-4)}` : '—'} />
                <ConfirmRow label="Org ID" value={config.orgId || 'N/A'} />
                <ConfirmRow label="Max Tokens" value={String(config.maxTokens)} />
            </div>
        </div>
    )
}

function SMTPWizard({ step, config, onChange }: { step: number; config: SMTPConfig; onChange: (c: Partial<SMTPConfig>) => void }) {
    if (step === 0) return (
        <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                Compatible con Gmail, Resend, Mailgun, SendGrid, Postmark, o tu propio servidor SMTP.
            </div>
            <FormField label="Host SMTP" hint="Ej: smtp.gmail.com | smtp.resend.com | mail.dominio.com">
                <TextInput value={config.host} onChange={v => onChange({ host: v })} placeholder="smtp.ejemplo.com" />
            </FormField>
            <FormField label="Puerto" hint="587 para TLS (recomendado) • 465 para SSL • 25 sin cifrado">
                <SelectInput value={config.port} onChange={v => onChange({ port: v })} options={[
                    { value: '587', label: '587 — TLS/STARTTLS (recomendado)' },
                    { value: '465', label: '465 — SSL/SMTPS' },
                    { value: '25', label: '25 — Sin cifrado' },
                    { value: '2525', label: '2525 — Alternativo' },
                ]} />
            </FormField>
            <FormField label="Cifrado">
                <SelectInput value={config.encryption} onChange={v => onChange({ encryption: v as SMTPConfig['encryption'] })} options={[
                    { value: 'tls', label: 'STARTTLS (recomendado)' },
                    { value: 'ssl', label: 'SSL' },
                    { value: 'none', label: 'Sin cifrado' },
                ]} />
            </FormField>
        </div>
    )
    if (step === 1) return (
        <div className="space-y-6">
            <FormField label="Usuario SMTP" hint="Generalmente tu dirección de correo">
                <TextInput value={config.user} onChange={v => onChange({ user: v })} placeholder="usuario@dominio.com" type="email" />
            </FormField>
            <FormField label="Contraseña / App Password" hint="Para Gmail, usa una contraseña de aplicación, no la contraseña normal.">
                <SecretInput value={config.password} onChange={v => onChange({ password: v })} placeholder="••••••••••••••••" />
            </FormField>
        </div>
    )
    if (step === 2) return (
        <div className="space-y-6">
            <FormField label="Nombre del Remitente" hint="Ej: AlgoritmoT — aparecerá en el campo 'De:'">
                <TextInput value={config.fromName} onChange={v => onChange({ fromName: v })} placeholder="AlgoritmoT" />
            </FormField>
            <FormField label="Email del Remitente" hint="Debe ser un email autorizado por tu proveedor SMTP">
                <TextInput value={config.fromEmail} onChange={v => onChange({ fromEmail: v })} placeholder="hola@algoritmot.com" type="email" />
            </FormField>
        </div>
    )
    return (
        <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-6 space-y-3 font-mono text-sm">
                <ConfirmRow label="Servidor" value={`${config.host}:${config.port}`} />
                <ConfirmRow label="Cifrado" value={config.encryption.toUpperCase()} />
                <ConfirmRow label="Usuario" value={config.user || '—'} />
                <ConfirmRow label="Contraseña" value={config.password ? '••••••••' : '—'} />
                <ConfirmRow label="Remitente" value={`${config.fromName} <${config.fromEmail}>`} />
            </div>
        </div>
    )
}

function R2Wizard({ step, config, onChange }: { step: number; config: R2Config; onChange: (c: Partial<R2Config>) => void }) {
    if (step === 0) return (
        <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 p-4 text-sm text-orange-800">
                <strong>¿Cómo obtener el Account ID?</strong><br />
                En el <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="underline font-bold">dashboard de Cloudflare</a> → encima del sidebar derecho. También en R2 → Overview.
            </div>
            <FormField label="Account ID" hint="Identificador de tu cuenta Cloudflare (32 caracteres hex)">
                <TextInput value={config.accountId} onChange={v => onChange({ accountId: v })} placeholder="a1b2c3d4..." />
            </FormField>
            <FormField label="Región" hint="'auto' deja que Cloudflare elija la región óptima.">
                <SelectInput value={config.region} onChange={v => onChange({ region: v })} options={[
                    { value: 'auto', label: 'auto (recomendado)' },
                    { value: 'WEUR', label: 'Western Europe' },
                    { value: 'EEUR', label: 'Eastern Europe' },
                    { value: 'WNAM', label: 'Western North America' },
                    { value: 'ENAM', label: 'Eastern North America' },
                    { value: 'APAC', label: 'Asia Pacific' },
                ]} />
            </FormField>
        </div>
    )
    if (step === 1) return (
        <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 p-4 text-sm text-orange-800">
                En Cloudflare → R2 → Manage R2 API Tokens → Create API Token con permisos de Object Read &amp; Write.
            </div>
            <FormField label="Access Key ID">
                <TextInput value={config.accessKeyId} onChange={v => onChange({ accessKeyId: v })} placeholder="Access Key ID" />
            </FormField>
            <FormField label="Secret Access Key">
                <SecretInput value={config.secretAccessKey} onChange={v => onChange({ secretAccessKey: v })} placeholder="Secret..." />
            </FormField>
        </div>
    )
    if (step === 2) return (
        <div className="space-y-6">
            <FormField label="Nombre del Bucket" hint="Debe existir en tu cuenta de Cloudflare R2">
                <TextInput value={config.bucketName} onChange={v => onChange({ bucketName: v })} placeholder="mi-bucket" />
            </FormField>
            <FormField label="URL Pública (opcional)" hint="Si tienes un dominio personalizado o subdomain de R2 activado. Ej: https://assets.algoritmot.com">
                <TextInput value={config.publicUrl} onChange={v => onChange({ publicUrl: v })} placeholder="https://assets.dominio.com" />
            </FormField>
        </div>
    )
    return (
        <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-6 space-y-3 font-mono text-sm">
                <ConfirmRow label="Account ID" value={config.accountId ? `${config.accountId.slice(0, 8)}...` : '—'} />
                <ConfirmRow label="Access Key" value={config.accessKeyId ? `${config.accessKeyId.slice(0, 8)}...` : '—'} />
                <ConfirmRow label="Secret" value={config.secretAccessKey ? '••••••••' : '—'} />
                <ConfirmRow label="Bucket" value={config.bucketName || '—'} />
                <ConfirmRow label="Región" value={config.region} />
                <ConfirmRow label="URL pública" value={config.publicUrl || 'No configurada'} />
            </div>
        </div>
    )
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-b-0">
            <span className="text-slate-400 text-[10px] uppercase tracking-widest">{label}</span>
            <span className="text-slate-900 text-right truncate max-w-xs">{value}</span>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ManageIntegrations() {
    const [integrations, setIntegrations] = useState<IntegrationsState>(defaultIntegrations)
    const [wizard, setWizard] = useState<WizardState>({ open: false, key: null, step: 0 })
    const [saved, setSaved] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [draftConfig, setDraftConfig] = useState<Record<string, unknown>>({})

    useEffect(() => {
        if (wizard.open && wizard.key) {
            setDraftConfig({ ...integrations[wizard.key].config } as Record<string, unknown>)
        }
    }, [wizard.open, wizard.key, integrations])

    useEffect(() => {
        let cancelled = false
        setIsLoading(true)
        fetchIntegrations()
            .then((data) => {
                if (cancelled) return
                setIntegrations(data)
                setLoadError(null)
            })
            .catch((error) => {
                if (cancelled) return
                setLoadError(error instanceof Error ? error.message : 'No se pudo cargar')
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false)
            })

        return () => { cancelled = true }
    }, [])

    const openWizard = (key: IntegrationKey) => {
        setWizard({ open: true, key, step: 0 })
    }

    const closeWizard = () => {
        setWizard({ open: false, key: null, step: 0 })
        setDraftConfig({})
    }

    const currentDef = integrationDefs.find(d => d.key === wizard.key)
    const totalSteps = currentDef?.steps.length ?? 0

    const handleSave = async () => {
        if (!wizard.key) return
        const next: IntegrationsState = {
            ...integrations,
            [wizard.key]: {
                ...integrations[wizard.key],
                config: { ...integrations[wizard.key].config, ...draftConfig },
                enabled: true,
                status: 'configured',
            },
        }
        try {
            setIsSaving(true)
            const persisted = await persistIntegrations(next)
            setIntegrations(persisted)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
            closeWizard()
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : 'No se pudo guardar')
        } finally {
            setIsSaving(false)
        }
    }

    const toggleEnabled = async (key: IntegrationKey) => {
        const previous = integrations
        const next = {
            ...previous,
            [key]: { ...previous[key], enabled: !previous[key].enabled },
        }
        setIntegrations(next)
        try {
            const persisted = await persistIntegrations(next)
            setIntegrations(persisted)
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : 'No se pudo actualizar')
            setIntegrations(previous)
        }
    }

    const renderWizardContent = () => {
        if (!wizard.key) return null
        const step = wizard.step

        const handleChange = (partial: Record<string, unknown>) => {
            setDraftConfig(prev => ({ ...prev, ...partial }))
        }

        switch (wizard.key) {
            case 'gemini':
                return <GeminiWizard step={step} config={draftConfig as unknown as GeminiConfig} onChange={handleChange as (c: Partial<GeminiConfig>) => void} />
            case 'openai':
                return <OpenAIWizard step={step} config={draftConfig as unknown as OpenAIConfig} onChange={handleChange as (c: Partial<OpenAIConfig>) => void} />
            case 'smtp':
                return <SMTPWizard step={step} config={draftConfig as unknown as SMTPConfig} onChange={handleChange as (c: Partial<SMTPConfig>) => void} />
            case 'r2':
                return <R2Wizard step={step} config={draftConfig as unknown as R2Config} onChange={handleChange as (c: Partial<R2Config>) => void} />
        }
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Integraciones</h1>
                <p className="text-slate-500 font-light">Conecta servicios externos para potenciar tu sitio. La configuración se persiste en servidor y base de datos.</p>
            </div>

            {isLoading && (
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-6 py-4 text-slate-700 font-semibold text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Cargando integraciones desde el servidor...
                </div>
            )}

            {loadError && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 px-6 py-4 text-red-700 font-semibold text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {loadError}
                </div>
            )}

            {saved && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 px-6 py-4 text-green-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Integración guardada correctamente
                </div>
            )}

            {/* Security notice */}
            <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 px-6 py-5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <p className="text-amber-900 font-bold text-sm mb-1">Persistencia en servidor (producción)</p>
                    <p className="text-amber-700 font-light text-sm">La configuración se guarda en <code className="bg-amber-100 px-1">Neon/Postgres</code> vía <code className="bg-amber-100 px-1">/api/integrations</code>. Las variables de entorno del servidor tienen prioridad para Gemini/OpenAI.</p>
                </div>
            </div>

            {/* Integration cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {integrationDefs.map(def => {
                    const Icon = def.icon
                    const state = integrations[def.key]
                    const configured = isConfigured(integrations, def.key)

                    return (
                        <div key={def.key} className="bg-white border border-slate-200 p-8 flex flex-col gap-8 hover:border-slate-300 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 ${def.color} flex items-center justify-center`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-black text-slate-900 text-lg tracking-tight">{def.label}</div>
                                        <div className="text-xs text-slate-400 font-light mt-0.5">{def.tagline}</div>
                                    </div>
                                </div>
                                {/* Toggle */}
                                {configured && (
                                    <button
                                        onClick={() => toggleEnabled(def.key)}
                                        className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${state.enabled ? 'bg-brand-primary' : 'bg-slate-200'}`}
                                        title={state.enabled ? 'Desactivar' : 'Activar'}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${state.enabled ? 'left-7' : 'left-1'}`} />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <StatusBadge status={state.status} enabled={state.enabled} />
                                <div className="flex items-center gap-3">
                                    {configured && (
                                        <a href={def.docs} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors">
                                            Docs
                                        </a>
                                    )}
                                    <button
                                        onClick={() => openWizard(def.key)}
                                        className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-brand-primary transition-colors"
                                    >
                                        {configured ? (
                                            <><RefreshCw className="w-3.5 h-3.5" />Reconfigurar</>
                                        ) : (
                                            <><Zap className="w-3.5 h-3.5" />Configurar</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Progress indicator if configured */}
                            {configured && (
                                <div className="h-1 bg-slate-100">
                                    <div className="h-full bg-brand-primary" style={{ width: state.enabled ? '100%' : '60%' }} />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* ─── Wizard Slide-over ─── */}
            {wizard.open && wizard.key && currentDef && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeWizard} />

                    {/* Panel */}
                    <div className="relative ml-auto w-full max-w-lg bg-white h-full flex flex-col shadow-2xl border-l-8 border-brand-primary overflow-hidden">
                        {/* Header */}
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${integrationDefs.find(d => d.key === wizard.key)?.color} text-white text-[9px] font-black uppercase tracking-widest mb-3`}>
                                    {currentDef.label}
                                </div>
                                <div className="font-black text-slate-900 text-2xl tracking-tighter">
                                    Asistente de configuración
                                </div>
                            </div>
                            <button onClick={closeWizard} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Step indicator */}
                        <div className="px-10 py-4 border-b border-slate-50 flex items-center gap-2 shrink-0">
                            {currentDef.steps.map((stepLabel, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${i === wizard.step ? 'text-brand-primary' : i < wizard.step ? 'text-emerald-600' : 'text-slate-300'}`}>
                                        <div className={`w-5 h-5 flex items-center justify-center text-[9px] font-black rounded-full border-2 ${i === wizard.step ? 'border-brand-primary text-brand-primary' : i < wizard.step ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 text-slate-300'}`}>
                                            {i < wizard.step ? '✓' : i + 1}
                                        </div>
                                        <span className="hidden sm:inline">{stepLabel}</span>
                                    </div>
                                    {i < totalSteps - 1 && <ChevronRight className="w-3 h-3 text-slate-200 shrink-0" />}
                                </div>
                            ))}
                        </div>

                        {/* Wizard body */}
                        <div className="flex-1 overflow-y-auto px-10 py-8">
                            <div className="text-xl font-black text-slate-900 tracking-tight mb-8">
                                {currentDef.steps[wizard.step]}
                            </div>
                            {renderWizardContent()}
                        </div>

                        {/* Footer nav */}
                        <div className="px-10 py-6 border-t border-slate-100 flex items-center justify-between shrink-0">
                            <button
                                onClick={() => wizard.step > 0 ? setWizard(w => ({ ...w, step: w.step - 1 })) : closeWizard()}
                                className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {wizard.step === 0 ? 'Cancelar' : 'Anterior'}
                            </button>

                            {wizard.step < totalSteps - 1 ? (
                                <button
                                    onClick={() => setWizard(w => ({ ...w, step: w.step + 1 }))}
                                    className="flex items-center gap-2 px-8 py-4 bg-brand-primary text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-colors"
                                >
                                    Siguiente
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-colors"
                                >
                                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {isSaving ? 'Guardando...' : 'Guardar integración'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
