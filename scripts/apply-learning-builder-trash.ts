/**
 * Aplica prisma/sql/2026-11-03-learning-builder-trash.sql: la papelera.
 *
 *   npx tsx scripts/apply-learning-builder-trash.ts
 *
 * Aditivo e idempotente: dos columnas y un índice en LbResource. No toca filas;
 * ningún recurso queda en la papelera por correr esto. Imprime antes y después.
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')

const columns = async () => {
  const rows: Array<{ column_name: string }> = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'LbResource' AND column_name IN ('deletedAt', 'deletedById')`
  )
  return rows.map((row) => row.column_name).sort()
}

const before = { columns: await columns(), resources: await (prisma as any).lbResource.count() }
console.log('ANTES   : columnas =', before.columns.join(', ') || 'ninguna', '· recursos =', before.resources)

const sql = readFileSync(path.join(ROOT, 'prisma/sql/2026-11-03-learning-builder-trash.sql'), 'utf8')
for (const statement of sql.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n').split(';').map((s) => s.trim()).filter(Boolean)) {
  console.log('→', statement.replace(/\s+/g, ' '))
  await prisma.$executeRawUnsafe(statement)
}

const after = { columns: await columns(), resources: await (prisma as any).lbResource.count() }
const trashed = await (prisma as any).lbResource.count({ where: { deletedAt: { not: null } } })
console.log('\nDESPUÉS : columnas =', after.columns.join(', '), '· recursos =', after.resources, '· en papelera =', trashed)
console.log('          recursos intactos =', after.resources === before.resources)

await prisma.$disconnect()
