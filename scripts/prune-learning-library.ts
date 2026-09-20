/**
 * Deja un solo recurso de cada tipo en cada workspace.
 *
 *   npx tsx scripts/prune-learning-library.ts            # informa
 *   npx tsx scripts/prune-learning-library.ts --aplica   # borra
 *
 * Las bibliotecas se sembraron con el inventario completo de los dos
 * proyectos —86 recursos— para probar el volumen. Para trabajar estorba: lo
 * que hace falta es un ejemplar de cada tipo, con su pieza final real, que se
 * pueda ver, editar, exportar y publicar.
 *
 * Se conserva el que tenga pieza final adjunta; si ninguno la tiene, el de
 * código más bajo, que es el primero que se inventarió. Antes de borrar se
 * vuelca lo que se va a perder a un archivo, y en todo caso el inventario se
 * puede volver a sembrar con `seed-learning-workspaces.ts`.
 */
import 'dotenv/config'
import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')
const store = await import('../api/_lib/lb-store.js')
const { workspaceBucket, resourceFolder } = await import('../api/_lib/lb-storage.js')
const { sanitizeFinal } = await import('../src/learning/lib/final.js')
const { sanitizeRoute } = await import('../src/learning/lib/route.js')

const apply = process.argv.includes('--aplica')
const dump = path.join(ROOT, `.learning-podados-${new Date().toISOString().slice(0, 10)}.json`)

const workspaces = await store.lbWorkspaces().findMany({ orderBy: { code: 'asc' } })
const doomed: any[] = []
let kept = 0

for (const workspace of workspaces) {
  const rows = await store.lbResources().findMany({
    where: { workspaceId: workspace.id },
    orderBy: { code: 'asc' },
  })
  if (!rows.length) { console.log(`${workspace.code}: sin recursos`); continue }

  const byKind = new Map<string, any[]>()
  for (const row of rows) byKind.set(row.kind, [...(byKind.get(row.kind) || []), row])

  console.log(`\n${workspace.code} · ${workspace.name} · ${rows.length} recurso(s)`)
  for (const [kind, group] of [...byKind.entries()].sort()) {
    // El que ya trae su pieza final es el que vale; si ninguno, el primero.
    const withFinal = group.find((row) => sanitizeFinal(row.assets))
    const keep = withFinal || group[0]
    kept += 1
    const rest = group.filter((row) => row.id !== keep.id)
    console.log(
      `  ${kind.padEnd(12)} conserva ${keep.code}${withFinal ? ' (con pieza final)' : ''}` +
      `${rest.length ? ` · borra ${rest.length}` : ''}`
    )
    for (const row of rest) {
      doomed.push({
        code: row.code, kind: row.kind, title: row.title, course: row.course, unit: row.unit,
        status: row.status, workspace: workspace.code,
      })
    }
  }
}

console.log(`\nquedarían ${kept} recurso(s) · se borrarían ${doomed.length}`)

if (!apply) {
  console.log('Nada borrado. Usa --aplica para hacerlo.')
  await prisma.$disconnect()
  process.exit(0)
}

fs.writeFileSync(dump, JSON.stringify(doomed, null, 2))
console.log(`volcado en ${dump}`)

let removedFiles = 0
for (const entry of doomed) {
  const row = await store.lbResources().findUnique({ where: { code: entry.code }, include: { workspace: true } })
  if (!row) continue
  const files = await store.lbFiles().findMany({ where: { resourceId: row.id }, select: { path: true } })
  if (files.length) {
    try {
      const bucket = await workspaceBucket(row.workspace)
      removedFiles += await bucket.remove(
        files.map((file: any) => `${resourceFolder(row.workspace.code, row.code)}/pkg/${file.path}`)
      )
    } catch {
      console.log(`  ${row.code}: no se pudieron borrar sus ${files.length} archivo(s) del almacenamiento`)
    }
  }
  await store.lbResources().delete({ where: { id: row.id } })
}

// Una ruta enlaza sus actividades con el código del recurso que las realiza.
// Si ese recurso ya no existe, el código miente: la actividad vuelve a
// figurar como «por producir», que es la verdad.
const alive = new Set<string>(
  (await store.lbResources().findMany({ select: { code: true } })).map((row: any) => row.code)
)
let relinked = 0
for (const route of await store.lbResources().findMany({ where: { kind: 'ROUTE' } })) {
  const content = sanitizeRoute(route.content)
  let touched = false
  const modules = content.modules.map((item) => ({
    ...item,
    activities: item.activities.map((activity) => {
      if (!activity.resourceCode || alive.has(activity.resourceCode)) return activity
      touched = true
      relinked += 1
      // Se quita el código y se deja la actividad: sigue estando en la ruta,
      // solo que vuelve a figurar como pendiente de producir.
      const rest = { ...activity }
      delete rest.resourceCode
      return rest
    }),
  }))
  if (!touched) continue
  await store.lbResources().update({ where: { id: route.id }, data: { content: { ...content, modules } as any } })
  console.log(`${route.code}: ${relinked} enlace(s) a recursos borrados, quitados`)
}

const total = await store.lbResources().count()
console.log(`borrados ${doomed.length} recurso(s) y ${removedFiles} archivo(s) · quedan ${total} en total`)
await prisma.$disconnect()
