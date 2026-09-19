/**
 * Learning Builder · qué credencial se usa de verdad.
 *
 * Un workspace puede traer las suyas, y si no, hereda las de la plataforma.
 * Esta es la única función que decide cuál de las dos: ni el generador de voz
 * ni el asistente ni la subida de archivos vuelven a razonarlo por su cuenta,
 * porque si lo hicieran acabarían discrepando y un cliente terminaría
 * facturando en la cuenta de otro.
 *
 * Nada de lo que sale de aquí va al navegador: son las claves en claro.
 */
import { prisma } from './prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from './integrations.js'
import {
  hasOwnKey, sanitizeLbIntegrations,
  type LbIntegrations, type LbProvider,
} from '../../src/learning/lib/integrations.js'

export type ResolvedCredential = {
  provider: LbProvider
  source: 'own' | 'inherited'
  values: Record<string, string>
}

/** Las integraciones de la plataforma, saneadas y con el entorno aplicado. */
export async function platformIntegrations() {
  const snapshot = await (prisma as any).cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  return applyServerEnv(sanitizeIntegrations(snapshot?.data ?? {}))
}

/** Qué proveedores tiene resueltos la plataforma, para que la UI lo cuente. */
export async function platformReadiness(): Promise<Partial<Record<LbProvider, boolean>>> {
  const platform = await platformIntegrations()
  return {
    openai: platform.openai.enabled && !!platform.openai.config.apiKey,
    r2: platform.r2.enabled && platform.r2.status === 'configured',
    // La plataforma no tiene cuenta propia de estos dos: son siempre del cliente.
    elevenlabs: false,
    magnific: false,
  }
}

export function workspaceIntegrations(workspace: { integrations?: unknown }): LbIntegrations {
  return sanitizeLbIntegrations(workspace?.integrations)
}

/**
 * La credencial con la que trabajar, o null si no hay ninguna. Devuelve
 * también de dónde salió, para poder decirlo en los mensajes de error: «este
 * workspace no tiene clave de ElevenLabs» es accionable, «falló la
 * generación» no.
 */
export async function resolveCredential(
  workspace: { integrations?: unknown },
  provider: LbProvider
): Promise<ResolvedCredential | null> {
  const own = workspaceIntegrations(workspace)
  if (hasOwnKey(own, provider)) {
    return { provider, source: 'own', values: own[provider].values }
  }

  const platform = await platformIntegrations()
  if (provider === 'openai') {
    const openai = platform.openai
    if (!openai.enabled || !openai.config.apiKey) return null
    return {
      provider,
      source: 'inherited',
      values: { apiKey: openai.config.apiKey, model: openai.config.model, orgId: openai.config.orgId },
    }
  }
  if (provider === 'r2') {
    const r2 = platform.r2
    if (!r2.enabled || r2.status !== 'configured') return null
    return { provider, source: 'inherited', values: { ...r2.config } }
  }
  // ElevenLabs y Magnific no se heredan: o los declara el workspace o no hay.
  return null
}

/** Mensaje único para cuando falta una credencial, con la salida a mano. */
export function missingCredential(provider: LbProvider): string {
  const where = 'Configúrala en el workspace, pestaña Integraciones.'
  const names: Record<LbProvider, string> = {
    openai: 'OpenAI',
    elevenlabs: 'ElevenLabs',
    magnific: 'Magnific',
    r2: 'el almacenamiento R2',
  }
  return `Este workspace no tiene credencial de ${names[provider]}. ${where}`
}
