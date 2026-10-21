/**
 * Learning Builder · almacenamiento del workspace.
 *
 * Todo lo que el módulo produce o importa —locuciones, fotogramas, paquetes
 * SCORM enteros— va a R2, y va al R2 que corresponda: el propio del cliente
 * si lo declaró, y si no el de la plataforma. Esto no es un detalle de
 * infraestructura: un cliente que exige que sus materiales vivan en su cuenta
 * lo exige para todo, no solo para la mitad.
 *
 * Las rutas se derivan del código del workspace y del recurso, que son
 * estables y legibles, de modo que mirando el bucket se sabe de quién es cada
 * archivo sin consultar la base.
 */
import { AwsClient } from 'aws4fetch'
import { missingCredential, resolveCredential } from './lb-integrations.js'

export type LbBucket = {
  source: 'own' | 'inherited'
  /**
   * `maxBytes` solo lo levanta quien sube desde un script: dentro de una
   * función serverless el tope existe para no agotar su memoria, pero un MP4
   * de producción pesa lo que pesa y hay que poder subirlo.
   */
  put: (key: string, body: Buffer, contentType: string, maxBytes?: number) => Promise<{ url: string; key: string; bytes: number }>
  get: (key: string) => Promise<Buffer>
  /** Lectura por la API S3 firmada; devuelve la respuesta tal cual, sin lanzar. */
  read: (key: string) => Promise<Response>
  /** La clave dentro del bucket de una URL pública suya, o null si es de otro sitio. */
  keyFor: (url: string) => string | null
  remove: (keys: string[]) => Promise<number>
}

/** 25 MB por archivo: un SCORM de un curso cabe de sobra. */
export const LB_MAX_FILE_BYTES = 25 * 1024 * 1024

export async function workspaceBucket(workspace: { integrations?: unknown }): Promise<LbBucket> {
  const credential = await resolveCredential(workspace, 'r2')
  if (!credential) throw new Error(missingCredential('r2'))
  const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl, region } = credential.values
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('Las credenciales de R2 de este workspace están incompletas.')
  }

  const aws = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: region || 'auto' })
  const bucketUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}`
  const publicBase = publicUrl ? publicUrl.trim().replace(/\/+$/, '') : `https://${bucketName}.${accountId}.r2.dev`

  return {
    source: credential.source,
    async put(key, body, contentType, maxBytes = LB_MAX_FILE_BYTES) {
      const clean = key.replace(/^\/+/, '')
      if (!clean || clean.includes('..')) throw new Error(`Ruta no válida: ${key}`)
      if (body.length > maxBytes) {
        throw new Error(`«${clean}» pesa más de ${Math.round(maxBytes / 1024 / 1024)} MB.`)
      }
      const response = await aws.fetch(new URL(`${bucketUrl}/${clean}`), {
        method: 'PUT',
        body: body as any,
        headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' },
      })
      if (!response.ok) throw new Error(`R2 respondió ${response.status} al subir «${clean}».`)
      return { url: `${publicBase}/${clean}`, key: clean, bytes: body.length }
    },
    read(key) {
      return aws.fetch(new URL(`${bucketUrl}/${key.replace(/^\/+/, '')}`))
    },
    keyFor(url) {
      const prefix = `${publicBase}/`
      return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null
    },
    async get(key) {
      const response = await aws.fetch(new URL(`${bucketUrl}/${key.replace(/^\/+/, '')}`))
      if (!response.ok) throw new Error(`R2 respondió ${response.status} al leer «${key}».`)
      return Buffer.from(await response.arrayBuffer())
    },
    async remove(keys) {
      let deleted = 0
      for (const key of keys) {
        const response = await aws
          .fetch(new URL(`${bucketUrl}/${key.replace(/^\/+/, '')}`), { method: 'DELETE' })
          .catch(() => null)
        if (response?.ok) deleted += 1
      }
      return deleted
    },
  }
}

/**
 * Carpeta de un recurso dentro del bucket. Los códigos son estables y no se
 * reutilizan, así que dos recursos nunca se pisan los archivos.
 */
export function resourceFolder(workspaceCode: string, resourceCode: string): string {
  const safe = (value: string) => String(value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'SIN-CODIGO'
  return `learning/${safe(workspaceCode)}/${safe(resourceCode)}`
}

/** Respuestas del almacenamiento que conviene volver a pedir: saturación o falla pasajera. */
const RETRYABLE = new Set([429, 500, 502, 503, 504])

/**
 * Lee un archivo del paquete por su URL pública, reintentando lo pasajero.
 *
 * La URL pública de R2 (`*.r2.dev`) limita el tráfico: al abrir un OVA el
 * navegador pide sus cuarenta o cincuenta archivos casi a la vez y, con una
 * versión recién subida —sin nada aún en la caché del borde—, el bucket
 * responde 429 a algunos. Sin reintento, ese archivo llega roto a la pantalla
 * aunque esté bien guardado. Se espera lo que pida `Retry-After` (con tope) o
 * un poco más en cada intento; si al final sigue fallando, se devuelve la
 * última respuesta para que quien llama decida.
 */
export async function fetchStored(url: string, attempts = 4): Promise<Response> {
  let last: Response | null = null
  let failure: unknown = null
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      const asked = Number(last?.headers.get('retry-after'))
      const wait = Number.isFinite(asked) && asked > 0 ? Math.min(asked * 1000, 3000) : 250 * 2 ** attempt
      await new Promise((resolve) => setTimeout(resolve, wait + Math.random() * 150))
    }
    try {
      last = await fetch(url)
      failure = null
      if (!RETRYABLE.has(last.status)) return last
      if (attempt < attempts - 1) await last.arrayBuffer().catch(() => null) // libera la conexión
    } catch (error) {
      failure = error
    }
  }
  if (last) return last
  throw failure
}

/** Bucket de cada workspace, para no resolver la credencial en cada archivo de una ráfaga. */
const bucketCache = new Map<string, { bucket: LbBucket; until: number }>()

/**
 * Lee un archivo guardado por la API S3 firmada del bucket en vez de por su URL
 * pública. La API no tiene el límite de tráfico de `*.r2.dev`, que es el que
 * dejaba imágenes rotas al abrir una versión recién subida. Si el archivo no
 * es de este bucket, o la API falla, se cae a la URL pública con reintento.
 */
export async function readStored(workspace: { id?: string; integrations?: unknown } | null | undefined, url: string): Promise<Response> {
  if (workspace) {
    try {
      const id = String(workspace.id || '')
      let hit = id ? bucketCache.get(id) : undefined
      if (!hit || hit.until < Date.now()) {
        hit = { bucket: await workspaceBucket(workspace), until: Date.now() + 5 * 60 * 1000 }
        if (id) bucketCache.set(id, hit)
      }
      const key = hit.bucket.keyFor(url)
      if (key) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt))
          const response = await hit.bucket.read(key)
          if (response.ok || !RETRYABLE.has(response.status)) return response
          await response.arrayBuffer().catch(() => null)
        }
      }
    } catch (error) {
      console.error('readStored: la API S3 falló, se usa la URL pública', error)
    }
  }
  return fetchStored(url)
}
