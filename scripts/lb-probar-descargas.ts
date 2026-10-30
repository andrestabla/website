/**
 * Learning Builder · ¿se puede bajar cada versión de cada recurso?
 *
 *   npx tsx scripts/lb-probar-descargas.ts            # las que tienen historia
 *   npx tsx scripts/lb-probar-descargas.ts --todas    # todas, una por una
 *   npx tsx scripts/lb-probar-descargas.ts --solo UNISALLE-IMP-037
 *
 * Ejercita lo que de verdad corre al pulsar «descargar»: resuelve la versión
 * con `packageAt` o `mediaAt` —la viva sale del recurso, las anteriores de su
 * ficha— y arma el paquete con `buildMirrorPackage` leyendo los archivos de esa
 * versión del almacenamiento. Con un medio no arma nada: comprueba que su
 * archivo y su pista respondan y pesen lo que dice la ficha.
 *
 * No pasa por el endpoint a propósito: así se prueba sin inventar una sesión, y
 * lo que se prueba es la misma función que el endpoint llama. Lo que el endpoint
 * añade encima es permiso y nombre de archivo.
 *
 * Sin `--todas` solo mira los recursos con más de una versión, que son los
 * únicos donde esto podía estar roto, y tres de una sola como testigo.
 */
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(RAIZ, '.env') })
config({ path: path.join(RAIZ, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')
const { loadResource } = await import('../api/_lib/lb-store.js')
const { mediaAt, packageAt } = await import('../api/_lib/lb-delivery.js')
const { buildMirrorPackage } = await import('../api/_lib/lb-mirror-package.js')
const { resourceFolder, workspaceBucket } = await import('../api/_lib/lb-storage.js')
const { unzip } = await import('../api/_lib/lb-unzip.js')
const db = prisma as any

const argumentos = process.argv.slice(2)
const TODAS = argumentos.includes('--todas')
const solo = (() => {
  const i = argumentos.indexOf('--solo')
  if (i < 0) return null
  return new Set((argumentos[i + 1] || '').split(',').map((c) => c.trim()).filter(Boolean))
})()
const WORKSPACE = process.env.LB_WORKSPACE || 'UNISALLE'
const TESTIGOS = 3

async function pesa(url: string): Promise<number> {
  const r = await fetch(url, { method: 'HEAD' })
  if (!r.ok) throw new Error(`${r.status}`)
  return Number(r.headers.get('content-length') || 0)
}

async function main() {
  const workspace = await db.lbWorkspace.findUnique({ where: { code: WORKSPACE } })
  if (!workspace) throw new Error(`No existe el workspace ${WORKSPACE}.`)
  const bucket = await workspaceBucket(workspace)

  const filas = await db.lbResource.findMany({
    where: { workspaceId: workspace.id }, orderBy: { code: 'asc' }, select: { id: true, code: true },
  })

  let testigos = 0
  let mal = 0
  let probadas = 0
  for (const fila of filas) {
    if (solo && !solo.has(fila.code)) continue
    const entregas = await db.lbDelivery.findMany({
      where: { resourceId: fila.id }, orderBy: { version: 'asc' }, select: { version: true, files: true },
    })
    if (!entregas.length) continue
    if (!solo && !TODAS && entregas.length < 2) {
      if (testigos >= TESTIGOS) continue
      testigos += 1
    }

    const loaded = await loadResource(fila.id)
    if (!loaded) { console.log(`  ✗ ${fila.code} · no se pudo cargar`); mal += 1; continue }

    const partes: string[] = []
    for (const entrega of entregas) {
      probadas += 1
      try {
        const medio = await mediaAt(loaded, entrega.version)
        if (medio) {
          const bytes = await pesa(medio.media.url)
          const pista = medio.media.captionsUrl ? await pesa(medio.media.captionsUrl) : 0
          partes.push(`V${entrega.version} ${(bytes / 1048576).toFixed(1)} MB`
            + (pista ? ` + pista ${pista} B` : ''))
          continue
        }
        const resuelta = await packageAt(loaded, entrega.version)
        if (!resuelta) throw new Error('no resuelve el paquete')
        const archivos = await db.lbResourceFile.findMany({
          where: { resourceId: fila.id, version: entrega.version },
          orderBy: { path: 'asc' }, select: { path: true },
        })
        const { buffer } = await buildMirrorPackage({
          pkg: resuelta.pkg,
          directives: loaded.directives,
          bucket,
          folder: resourceFolder(workspace.code, loaded.resource.code),
          version: entrega.version,
          files: archivos,
          title: `${loaded.resource.title}-v${entrega.version}`,
          publicId: loaded.resource.publicId,
          format: 'scorm',
        })
        const dentro = unzip(buffer).length
        // El manifiesto lo añade el empaquetador si el original no lo traía,
        // así que dentro puede haber uno más que archivos guardados.
        const cuadra = dentro >= archivos.length && dentro <= archivos.length + 1
        if (!cuadra) throw new Error(`${dentro} archivos en el ZIP y ${archivos.length} guardados`)
        partes.push(`V${entrega.version} ${(buffer.length / 1048576).toFixed(1)} MB · ${dentro} arch.`)
      } catch (error: any) {
        mal += 1
        partes.push(`V${entrega.version} ✗ ${error?.message || error}`)
      }
    }
    const roto = partes.some((p) => p.includes('✗'))
    console.log(`  ${roto ? '✗' : '✓'} ${fila.code.replace('UNISALLE-', '').padEnd(10)} ${partes.join(' · ')}`)
  }

  console.log(mal
    ? `\n  ✗ ${mal} de ${probadas} versiones no se pueden bajar\n`
    : `\n  ✓ las ${probadas} versiones probadas se bajan\n`)
  if (mal) process.exit(1)
}

main()
  .catch((error) => {
    console.error('\n‼', error instanceof Error ? error.message : error, '\n')
    process.exit(1)
  })
  .finally(() => db.$disconnect())
