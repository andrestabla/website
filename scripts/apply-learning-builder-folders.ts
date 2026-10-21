/**
 * Aplica prisma/sql/2026-10-21-learning-builder-folders.sql y siembra las
 * carpetas iniciales a partir del campo «curso».
 *
 *   npx tsx scripts/apply-learning-builder-folders.ts
 *
 * Hasta ahora la biblioteca agrupaba los recursos por curso sin carpetas de
 * verdad. Para que al estrenar las carpetas nada cambie de sitio, en cada
 * workspace que todavía no tenga ninguna se crea una carpeta por curso y sus
 * recursos pasan a ella. Lo que no declara curso queda en la raíz.
 *
 * Es idempotente: un workspace que ya tiene carpetas no se toca. No cambia el
 * campo «curso» de ningún recurso. Imprime el estado antes y después.
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')
const db = prisma as any

/** Parte el SQL en sentencias sin romper los bloques DO $$ … $$. */
function statements(sql: string): string[] {
  const out: string[] = []
  let current = ''
  let inDollar = false
  for (const line of sql.split('\n')) {
    if (line.trim().startsWith('--') && !inDollar) continue
    current += `${line}\n`
    if ((line.match(/\$\$/g) || []).length % 2 === 1) inDollar = !inDollar
    if (!inDollar && line.trim().endsWith(';')) {
      out.push(current.trim().replace(/;$/, ''))
      current = ''
    }
  }
  if (current.trim()) out.push(current.trim())
  return out.filter(Boolean)
}

const tableExists = async () => {
  const rows: Array<{ exists: boolean }> = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LbFolder') AS "exists"`
  )
  return !!rows[0]?.exists
}

const resourcesBefore = await db.lbResource.count()
console.log('ANTES   : tabla LbFolder =', await tableExists(), '· recursos =', resourcesBefore)

const sql = readFileSync(path.join(ROOT, 'prisma/sql/2026-10-21-learning-builder-folders.sql'), 'utf8')
for (const statement of statements(sql)) {
  console.log('→', statement.replace(/\s+/g, ' ').slice(0, 110))
  await prisma.$executeRawUnsafe(statement)
}

// ── Siembra: una carpeta por curso, solo donde aún no hay carpetas ──
const workspaces = await db.lbWorkspace.findMany({ select: { id: true, code: true, name: true } })
for (const workspace of workspaces) {
  const existing = await db.lbFolder.count({ where: { workspaceId: workspace.id } })
  if (existing > 0) {
    console.log(`  ${workspace.code}: ya tiene ${existing} carpeta(s), no se toca`)
    continue
  }
  const rows: Array<{ id: string; course: string | null }> = await db.lbResource.findMany({
    where: { workspaceId: workspace.id, folderId: null },
    select: { id: true, course: true },
  })
  const byCourse = new Map<string, string[]>()
  for (const row of rows) {
    const name = (row.course || '').replace(/\s+/g, ' ').trim()
    if (!name) continue
    byCourse.set(name, [...(byCourse.get(name) || []), row.id])
  }
  for (const [name, ids] of [...byCourse.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
    const folder = await db.lbFolder.create({ data: { workspaceId: workspace.id, name: name.slice(0, 120) } })
    await db.lbResource.updateMany({ where: { id: { in: ids } }, data: { folderId: folder.id } })
  }
  console.log(`  ${workspace.code}: ${byCourse.size} carpeta(s) creadas desde los cursos · ${rows.length} recurso(s) revisados`)
}

const resourcesAfter = await db.lbResource.count()
const folders = await db.lbFolder.count()
const filed = await db.lbResource.count({ where: { folderId: { not: null } } })
console.log('\nDESPUÉS : carpetas =', folders, '· recursos en carpeta =', filed, 'de', resourcesAfter)
console.log('          recursos intactos =', resourcesAfter === resourcesBefore)

await prisma.$disconnect()
