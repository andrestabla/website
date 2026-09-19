/**
 * Learning Builder · claves de API por workspace.
 *
 * La plataforma ya tiene sus integraciones configuradas —OpenAI, R2— y el
 * módulo las usa tal cual: ese es el caso normal y no hay que tocar nada.
 *
 * Lo que este archivo permite es la excepción: un cliente que factura su
 * propio consumo, o que exige que sus voces se generen con su cuenta. Cuando
 * un workspace declara una clave, esa manda para todo lo que se produzca
 * dentro de él; cuando no, hereda la de la plataforma. Por eso cada proveedor
 * tiene tres estados y no dos: propia, heredada o sin configurar.
 *
 * Las claves nunca vuelven al navegador. Lo que se envía a la UI es la marca
 * `hasKey` y una cola de cuatro caracteres para reconocerla; guardar sin
 * cambiar la clave se hace mandando `keep`.
 *
 * Lo importa la UI y también el API, así que no puede depender de React.
 */
import { num, str } from './common.js'

export const LB_PROVIDERS = ['openai', 'elevenlabs', 'magnific', 'r2'] as const
export type LbProvider = (typeof LB_PROVIDERS)[number]

export type LbProviderSpec = {
  provider: LbProvider
  label: string
  /** Para qué lo usa el módulo, en una frase. */
  purpose: string
  /** Si la plataforma ya lo tiene configurado, se hereda sin declarar nada. */
  inheritable: boolean
  /** Dónde se saca la clave. */
  docsUrl: string
  fields: Array<{ key: string; label: string; hint?: string; secret?: boolean; placeholder?: string }>
}

export const LB_PROVIDER_SPECS: Record<LbProvider, LbProviderSpec> = {
  openai: {
    provider: 'openai',
    label: 'OpenAI',
    purpose: 'Redacta y revisa guiones con el asistente del builder.',
    inheritable: true,
    docsUrl: 'https://platform.openai.com/api-keys',
    fields: [
      { key: 'apiKey', label: 'Clave de API', secret: true, placeholder: 'sk-…' },
      { key: 'model', label: 'Modelo', hint: 'Por defecto, el de la plataforma.', placeholder: 'gpt-4o' },
      { key: 'orgId', label: 'Organización', hint: 'Solo si la cuenta tiene varias.' },
    ],
  },
  elevenlabs: {
    provider: 'elevenlabs',
    label: 'ElevenLabs',
    purpose: 'Genera la locución de los pódcast, intervención por intervención.',
    inheritable: false,
    docsUrl: 'https://elevenlabs.io/app/settings/api-keys',
    fields: [
      { key: 'apiKey', label: 'Clave de API', secret: true, placeholder: 'sk_…' },
      { key: 'model', label: 'Modelo', hint: 'eleven_multilingual_v2 rinde mejor en español.', placeholder: 'eleven_multilingual_v2' },
      { key: 'defaultVoiceId', label: 'Voz por defecto', hint: 'La que se asigna a un hablante nuevo.' },
    ],
  },
  magnific: {
    provider: 'magnific',
    label: 'Magnific',
    purpose: 'Amplía y mejora las imágenes de los recursos visuales.',
    inheritable: false,
    docsUrl: 'https://magnific.ai',
    fields: [
      { key: 'apiKey', label: 'Clave de API', secret: true },
      { key: 'endpoint', label: 'Endpoint', hint: 'Solo si la cuenta usa uno propio.' },
    ],
  },
  r2: {
    provider: 'r2',
    label: 'Almacenamiento R2',
    purpose: 'Guarda audios, imágenes y paquetes importados.',
    inheritable: true,
    docsUrl: 'https://dash.cloudflare.com',
    fields: [
      { key: 'accountId', label: 'Account ID' },
      { key: 'accessKeyId', label: 'Access Key ID', secret: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', secret: true },
      { key: 'bucketName', label: 'Bucket' },
      { key: 'publicUrl', label: 'URL pública', placeholder: 'https://cdn.cliente.edu.co' },
    ],
  },
}

export type LbProviderConfig = {
  /** false deja la clave guardada pero sin usar. */
  enabled: boolean
  /** Valores por campo; los secretos no salen nunca del servidor. */
  values: Record<string, string>
  /** Tope de consumo mensual, en unidades del proveedor; 0 = sin tope. */
  monthlyCap?: number
  notes?: string
}

export type LbIntegrations = Record<LbProvider, LbProviderConfig>

/** Lo que sí puede ver el navegador: si hay clave, no cuál es. */
export type LbProviderStatus = {
  provider: LbProvider
  enabled: boolean
  /** own = clave del workspace · inherited = la de la plataforma · none. */
  source: 'own' | 'inherited' | 'none'
  /** Campos no secretos, tal cual. */
  values: Record<string, string>
  /** Campos secretos, solo su cola: «…a1b2». */
  hints: Record<string, string>
  monthlyCap: number
  notes: string
}

export function emptyIntegrations(): LbIntegrations {
  return LB_PROVIDERS.reduce((all, provider) => {
    all[provider] = { enabled: false, values: {}, monthlyCap: 0, notes: '' }
    return all
  }, {} as LbIntegrations)
}

function fieldKeys(provider: LbProvider): string[] {
  return LB_PROVIDER_SPECS[provider].fields.map((field) => field.key)
}

export function isSecretField(provider: LbProvider, key: string): boolean {
  return LB_PROVIDER_SPECS[provider].fields.some((field) => field.key === key && field.secret)
}

export function sanitizeLbIntegrations(value: unknown): LbIntegrations {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const result = emptyIntegrations()
  for (const provider of LB_PROVIDERS) {
    const rawProvider = (raw[provider] && typeof raw[provider] === 'object' ? raw[provider] : {}) as Record<string, unknown>
    const rawValues = (rawProvider.values && typeof rawProvider.values === 'object' ? rawProvider.values : {}) as Record<string, unknown>
    const values: Record<string, string> = {}
    for (const key of fieldKeys(provider)) {
      const clean = str(rawValues[key], 600).trim()
      if (clean) values[key] = clean
    }
    result[provider] = {
      enabled: rawProvider.enabled === true,
      values,
      monthlyCap: num(rawProvider.monthlyCap, 0, 0, 100_000_000),
      notes: str(rawProvider.notes, 600),
    }
  }
  return result
}

/** ¿Tiene el workspace credencial propia y utilizable para este proveedor? */
export function hasOwnKey(integrations: LbIntegrations, provider: LbProvider): boolean {
  const config = integrations[provider]
  if (!config?.enabled) return false
  const required = LB_PROVIDER_SPECS[provider].fields.filter((field) => field.secret).map((field) => field.key)
  const keys = required.length ? required : fieldKeys(provider).slice(0, 1)
  return keys.every((key) => !!config.values[key])
}

/**
 * Lo que se manda al navegador. `platformReady` dice, por proveedor, si la
 * plataforma lo tiene configurado: sin ese dato la UI no podría distinguir
 * «heredada» de «sin configurar», que es justo lo que el gestor necesita
 * saber antes de pedir una clave al cliente.
 */
export function describeIntegrations(
  integrations: LbIntegrations,
  platformReady: Partial<Record<LbProvider, boolean>>
): LbProviderStatus[] {
  return LB_PROVIDERS.map((provider) => {
    const config = integrations[provider]
    const own = hasOwnKey(integrations, provider)
    const values: Record<string, string> = {}
    const hints: Record<string, string> = {}
    for (const [key, value] of Object.entries(config.values)) {
      if (isSecretField(provider, key)) hints[key] = `…${value.slice(-4)}`
      else values[key] = value
    }
    return {
      provider,
      enabled: config.enabled,
      source: own
        ? 'own'
        : LB_PROVIDER_SPECS[provider].inheritable && platformReady[provider]
        ? 'inherited'
        : 'none',
      values,
      hints,
      monthlyCap: config.monthlyCap || 0,
      notes: config.notes || '',
    }
  })
}

/**
 * Funde lo que llega del formulario con lo guardado. Un campo secreto que
 * viene como `keep` conserva el valor anterior: así el navegador puede
 * guardar el resto de la ficha sin haber recibido nunca la clave.
 */
export const KEEP = '__keep__'

export function mergeIntegrations(
  current: LbIntegrations,
  provider: LbProvider,
  patch: { enabled?: boolean; values?: Record<string, unknown>; monthlyCap?: unknown; notes?: unknown }
): LbIntegrations {
  const next: LbIntegrations = { ...current, [provider]: { ...current[provider] } }
  const config = next[provider]
  if (typeof patch.enabled === 'boolean') config.enabled = patch.enabled
  if (patch.monthlyCap !== undefined) config.monthlyCap = num(patch.monthlyCap, 0, 0, 100_000_000)
  if (patch.notes !== undefined) config.notes = str(patch.notes, 600)

  if (patch.values && typeof patch.values === 'object') {
    const values = { ...config.values }
    for (const key of fieldKeys(provider)) {
      if (!(key in patch.values)) continue
      const incoming = patch.values[key]
      if (incoming === KEEP) continue
      const clean = str(incoming, 600).trim()
      if (clean) values[key] = clean
      else delete values[key]
    }
    config.values = values
  }
  return next
}
