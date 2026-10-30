/**
 * Learning Builder · poner los recursos de un curso en su carpeta.
 *
 * El importador de la entrega sube el paquete y pone la codificación, pero no
 * decide dónde vive el recurso: los nuevos nacen en la raíz del workspace. En
 * una biblioteca con ocho cursos eso se nota enseguida, así que al cerrar un
 * curso hay que recogerlos.
 *
 *   npx tsx scripts/lb-mover-a-carpeta.ts "Niveles de análisis de la lengua"
 *   npx tsx scripts/lb-mover-a-carpeta.ts "Niveles de análisis de la lengua" --aplicar
 *
 * Sin `--aplicar` no escribe: enseña en qué carpeta está cada recurso y a
 * cuál iría. La carpeta se busca por nombre dentro del workspace y, si no
 * existe, se crea con el nombre del curso —el mismo criterio con el que se
 * sembraron las demás—.
 *
 * Es idempotente y no mueve lo que ya está colocado: un recurso que alguien
 * puso a mano en otra carpeta se señala y se deja quieto, salvo que se pida
 * `--forzar`. Mover no toca el paquete, ni el estado, ni el enlace público.
 */
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(RAIZ, '.env') })
config({ path: path.join(RAIZ, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')
const db = prisma as any

const argumentos = process.argv.slice(2)
const curso = argumentos.find((a) => !a.startsWith('--'))
const APLICAR = argumentos.includes('--aplicar')
const FORZAR = argumentos.includes('--forzar')
const WORKSPACE = process.env.LB_WORKSPACE || 'UNISALLE'

async function main() {
  if (!curso) {
    console.error('\nFalta el curso. Ej.: "Niveles de análisis de la lengua"\n')
    process.exit(1)
  }
  const workspace = await db.lbWorkspace.findUnique({ where: { code: WORKSPACE } })
  if (!workspace) throw new Error(`No existe el workspace ${WORKSPACE}.`)

  const recursos = await db.lbResource.findMany({
    where: { workspaceId: workspace.id, course: curso },
    orderBy: { code: 'asc' },
  })
  if (!recursos.length) {
    console.error(`\nNingún recurso declara el curso «${curso}».`)
    console.error('El nombre tiene que ser el mismo que trae la ficha de entrega.\n')
    process.exit(1)
  }

  const carpetas = await db.lbFolder.findMany({ where: { workspaceId: workspace.id } })
  const porId = new Map(carpetas.map((c: any) => [c.id, c]))
  let destino = carpetas.find((c: any) => c.name === curso)

  console.log(`\n${curso} · ${recursos.length} recursos en ${workspace.code}`)
  console.log(APLICAR ? '  modo: APLICAR — se escribe\n' : '  modo: ensayo — no se escribe nada\n')

  const mover: any[] = []
  const ajenos: any[] = []
  for (const r of recursos) {
    const actual = r.folderId ? porId.get(r.folderId) : null
    const donde = actual ? (actual as any).name : '— raíz —'
    if (actual && (actual as any).name === curso) {
      console.log(`  = ${String(r.code).padEnd(18)} ya está en su carpeta`)
      continue
    }
    if (actual && !FORZAR) {
      ajenos.push(r)
      console.log(`  ! ${String(r.code).padEnd(18)} está en «${donde}» · se deja (con --forzar se mueve)`)
      continue
    }
    mover.push(r)
    console.log(`  → ${String(r.code).padEnd(18)} ${donde}  →  «${curso}»`)
  }

  if (!mover.length) {
    console.log(`\n  Nada que mover.${ajenos.length ? ` ${ajenos.length} en otra carpeta.` : ''}\n`)
    return
  }
  if (!APLICAR) {
    console.log(`\n  ${mover.length} por mover${destino ? '' : ' · habría que crear la carpeta'}.`)
    console.log('  Ensayo terminado. Con --aplicar se escribe.\n')
    return
  }

  if (!destino) {
    destino = await db.lbFolder.create({
      data: { workspaceId: workspace.id, parentId: null, name: curso },
    })
    console.log(`\n  + carpeta «${curso}»`)
  }
  await db.lbResource.updateMany({
    where: { id: { in: mover.map((r) => r.id) } },
    data: { folderId: (destino as any).id },
  })
  const dentro = await db.lbResource.count({ where: { folderId: (destino as any).id } })
  console.log(`\n  ${mover.length} movidos · la carpeta «${curso}» tiene ${dentro} recursos\n`)
}

main()
  .catch((error) => {
    console.error('\n‼', error instanceof Error ? error.message : error, '\n')
    process.exit(1)
  })
  .finally(() => db.$disconnect())
