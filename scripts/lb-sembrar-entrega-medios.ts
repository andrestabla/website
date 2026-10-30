/**
 * Learning Builder · dar su V1 a los medios que se adjuntaron a mano.
 *
 *   npx tsx scripts/lb-sembrar-entrega-medios.ts
 *   npx tsx scripts/lb-sembrar-entrega-medios.ts --aplicar
 *
 * Los videos de presentación se subieron antes de que los medios tuvieran
 * versiones: su archivo está servido y su ficha lo reproduce, pero no hay
 * ninguna entrega registrada. Sin esa fila, el panel no tiene historial que
 * enseñar y la primera versión nueva pisaría justo lo que se quiere conservar.
 *
 * Esto les escribe la V1 con lo que ya hay: de qué archivo salió, cuánto pesa y
 * cómo quedó la pieza. No mueve ningún archivo del almacenamiento ni toca la
 * pieza: el medio sigue donde está y la V1 apunta a su URL, que es la que
 * guarda la ficha de la entrega.
 *
 * No escribe filas de archivo. Un medio no se sirve por rutas como un paquete
 * —se descarga de su URL—, y escribir filas que apunten a una carpeta que no es
 * la de las versiones haría que borrar el paquete buscara claves que no existen.
 *
 * Es idempotente: un recurso que ya tenga entregas no se toca.
 */
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(RAIZ, '.env') })
config({ path: path.join(RAIZ, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')
const { sanitizeFinal } = await import('../src/learning/lib/final.js')
const db = prisma as any

const argumentos = process.argv.slice(2)
const APLICAR = argumentos.includes('--aplicar')
const WORKSPACE = argumentos.find((a) => !a.startsWith('--')) || process.env.LB_WORKSPACE || 'UNISALLE'

async function main() {
  const workspace = await db.lbWorkspace.findUnique({ where: { code: WORKSPACE } })
  if (!workspace) throw new Error(`No existe el workspace ${WORKSPACE}.`)

  const recursos = await db.lbResource.findMany({
    where: { workspaceId: workspace.id }, orderBy: { code: 'asc' },
  })
  console.log(`\n${WORKSPACE} · ${recursos.length} recursos`)
  console.log(APLICAR ? '  modo: APLICAR — se escribe\n' : '  modo: ensayo — no se escribe nada\n')

  let sembradas = 0
  let vacias = 0
  for (const r of recursos) {
    const final = sanitizeFinal(r.assets)
    if (!final || final.kind !== 'MEDIA') continue
    const entregas = await db.lbDelivery.count({ where: { resourceId: r.id } })
    const nombre = final.origin?.fileName || final.entry || ''
    if (!final.media?.url) {
      vacias += 1
      console.log(`  · ${r.code.replace('UNISALLE-', '').padEnd(10)} ficha de medios sin archivo todavía`)
      continue
    }
    if (entregas) {
      console.log(`  = ${r.code.replace('UNISALLE-', '').padEnd(10)} ya tiene ${entregas} entrega(s)`)
      continue
    }
    sembradas += 1
    console.log(`  → ${r.code.replace('UNISALLE-', '').padEnd(10)} V1 · ${nombre} · `
      + `${(final.origin.bytes / 1048576).toFixed(1)} MB${final.media.captionsUrl ? ' + pista' : ''}`)
    if (!APLICAR) continue
    await db.lbDelivery.create({
      data: {
        resourceId: r.id,
        version: 1,
        fileName: nombre || 'medio',
        bytes: final.origin.bytes || 0,
        files: final.media.captionsUrl ? 2 : 1,
        // La fecha de la entrega es la de cuando se adjuntó, no la de hoy: es
        // la que el panel enseña y la que ordena la historia.
        ...(final.origin.importedAt ? { createdAt: new Date(final.origin.importedAt) } : {}),
        snapshot: { final } as any,
      },
    })
    await db.lbResource.update({ where: { id: r.id }, data: { packageVersion: 1 } })
  }

  console.log(`\n  ${sembradas} por sembrar${vacias ? ` · ${vacias} ficha(s) de medios sin archivo` : ''}`)
  if (!APLICAR && sembradas) console.log('  Ensayo terminado. Con --aplicar se escribe.\n')
  else console.log('')
}

main()
  .catch((error) => {
    console.error('\n‼', error instanceof Error ? error.message : error, '\n')
    process.exit(1)
  })
  .finally(() => db.$disconnect())
