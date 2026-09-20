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
