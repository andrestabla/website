/**
 * Learning Builder · comprobar una credencial de verdad.
 *
 * Guardar una clave no dice nada: la mitad de los fallos son una clave que se
 * pegó con un espacio, una cuenta sin saldo o un bucket que no existe. El
 * botón de probar hace la llamada más barata que ofrezca cada proveedor y
 * devuelve lo que contestó, para que el problema se vea aquí y no tres días
 * después, cuando alguien intente generar un pódcast.
 *
 * Se prueba lo guardado, no lo que venga en la petición, y se dice de dónde
 * salió la credencial: heredar la de la plataforma y creer que es propia es
 * justo el malentendido que hay que evitar.
 */
import { AwsClient } from 'aws4fetch'
import { missingCredential, resolveCredential } from './lb-integrations.js'
import type { LbProvider } from '../../src/learning/lib/integrations.js'

export type ProbeResult = {
  reachable: boolean
  source: 'own' | 'inherited' | 'none'
  message: string
  /** Dato suelto que ayuda a reconocer la cuenta: modelo, plan, bucket. */
  detail?: string
}

const TIMEOUT_MS = 8000

async function timed(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function probeProvider(
  workspace: { integrations?: unknown },
  provider: LbProvider
): Promise<ProbeResult> {
  const credential = await resolveCredential(workspace, provider)
  if (!credential) {
    return { reachable: false, source: 'none', message: missingCredential(provider) }
  }
  const { source, values } = credential

  try {
    if (provider === 'openai') {
      const response = await timed('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${values.apiKey}`,
          ...(values.orgId ? { 'OpenAI-Organization': values.orgId } : {}),
        },
      })
      if (!response.ok) {
        return { reachable: false, source, message: `OpenAI respondió ${response.status}.` }
      }
      const data = (await response.json()) as any
      const count = Array.isArray(data?.data) ? data.data.length : 0
      return { reachable: true, source, message: 'La clave responde.', detail: `${count} modelos disponibles` }
    }

    if (provider === 'elevenlabs') {
      const response = await timed('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': values.apiKey },
      })
      if (!response.ok) {
        return { reachable: false, source, message: `ElevenLabs respondió ${response.status}.` }
      }
      const data = (await response.json()) as any
      const used = Number(data?.character_count || 0)
      const limit = Number(data?.character_limit || 0)
      return {
        reachable: true,
        source,
        message: 'La clave responde.',
        detail: limit ? `${used.toLocaleString('es')} de ${limit.toLocaleString('es')} caracteres usados` : undefined,
      }
    }

    if (provider === 'magnific') {
      const endpoint = values.endpoint || ''
      if (!endpoint) {
        // Magnific no publica un endpoint de verificación; sin uno propio
        // declarado no hay nada barato que llamar, y decirlo es más honesto
        // que inventarse una comprobación que siempre saldría bien.
        return {
          reachable: false,
          source,
          message: 'La clave queda guardada, pero Magnific no ofrece una comprobación: se sabrá al ampliar la primera imagen.',
        }
      }
      const response = await timed(endpoint, { headers: { Authorization: `Bearer ${values.apiKey}` } })
      return {
        reachable: response.ok,
        source,
        message: response.ok ? 'El endpoint responde.' : `El endpoint respondió ${response.status}.`,
      }
    }

    // R2: se pide el listado más corto posible del bucket.
    const { accountId, accessKeyId, secretAccessKey, bucketName } = values
    const aws = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: values.region || 'auto' })
    const response = await aws.fetch(
      new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucketName}?list-type=2&max-keys=1`)
    )
    if (!response.ok) {
      return { reachable: false, source, message: `R2 respondió ${response.status} al leer «${bucketName}».` }
    }
    return { reachable: true, source, message: 'El bucket responde.', detail: bucketName }
  } catch (error: any) {
    const aborted = error?.name === 'AbortError'
    return {
      reachable: false,
      source,
      message: aborted ? 'El proveedor no contestó en ocho segundos.' : `No se pudo conectar: ${error?.message || error}`,
    }
  }
}
