/**
 * Aplica prisma/sql/2026-11-03-quote-totals-float.sql: totalBase y totalFinal
 * de Quote admiten cifras por encima de 2.147 millones.
 *
 *   npx tsx scripts/apply-quote-totals-float.ts
 *
 * Idempotente: solo cambia el tipo de dos columnas y conserva los valores.
 * Imprime tipos, número de cotizaciones y suma de totales antes y después.
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')

const state = async () => {
  const types: Array<{ column_name: string; data_type: string }> = await prisma.$queryRawUnsafe(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Quote' AND column_name IN ('totalBase', 'totalFinal') ORDER BY 1`
  )
  const [sums]: Array<{ quotes: string; base: string; final: string }> = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::text AS quotes, SUM("totalBase"::numeric)::text AS base, SUM("totalFinal"::numeric)::text AS final FROM "Quote"`
  )
  return { types: types.map((row) => `${row.column_name}: ${row.data_type}`).join(', '), ...sums }
}

const before = await state()
console.log('ANTES   :', before)

const sql = readFileSync(path.join(ROOT, 'prisma/sql/2026-11-03-quote-totals-float.sql'), 'utf8')
for (const statement of sql.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n').split(';').map((s) => s.trim()).filter(Boolean)) {
  console.log('→', statement.replace(/\s+/g, ' '))
  await prisma.$executeRawUnsafe(statement)
}

const after = await state()
console.log('\nDESPUÉS :', after)
console.log('          totales intactos =', Number(after.quotes) === Number(before.quotes) && Number(after.base) === Number(before.base) && Number(after.final) === Number(before.final))

await prisma.$disconnect()
