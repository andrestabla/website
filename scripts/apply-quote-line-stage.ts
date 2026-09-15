/**
 * Aplica prisma/sql/2026-09-14-quote-line-stage.sql: columnas "line", "stage"
 * y "stageAt" de Quote, sus índices y el relleno inicial (línea según
 * plantilla; «Enviada» para las que ya tienen envíos a destinatarios).
 *
 *   npx tsx scripts/apply-quote-line-stage.ts
 *
 * Es idempotente: las columnas e índices usan IF NOT EXISTS y los UPDATE solo
 * tocan filas sin línea o sin seguimiento. Corre en una transacción e imprime
 * el estado antes y después para que se pueda comprobar.
 */
import 'dotenv/config'
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')

const SQL_FILE = path.join(ROOT, 'prisma/sql/2026-09-14-quote-line-stage.sql')

/** Sentencias del archivo, sin comentarios, separadas por «;». */
function statements(): string[] {
  return readFileSync(SQL_FILE, 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
}

async function columns(): Promise<string[]> {
  const rows: Array<{ column_name: string }> = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'Quote' AND column_name IN ('line', 'stage', 'stageAt') ORDER BY 1`
  )
  return rows.map((r) => r.column_name)
}

async function breakdown(column: 'line' | 'stage'): Promise<Array<{ k: string; n: number }>> {
  const rows: Array<{ k: string; n: bigint }> = await prisma.$queryRawUnsafe(
    `SELECT COALESCE("${column}", '(vacío)') AS k, COUNT(*) AS n FROM "Quote" GROUP BY 1 ORDER BY 1`
  )
  return rows.map((r) => ({ k: r.k, n: Number(r.n) }))
}

const quotesBefore = await prisma.quote.count()
const colsBefore = await columns()
console.log('ANTES   : cotizaciones =', quotesBefore, '· columnas presentes =', colsBefore.join(', ') || '(ninguna)')

await prisma.$transaction(async (tx) => {
  for (const sql of statements()) {
    const head = sql.replace(/\s+/g, ' ').slice(0, 72)
    const affected = await tx.$executeRawUnsafe(sql)
    console.log(`  ${/^UPDATE/i.test(sql) ? `${affected} filas` : 'ok'} · ${head}…`)
  }
})

const quotesAfter = await prisma.quote.count()
console.log('\nDESPUÉS : cotizaciones =', quotesAfter, '· columnas presentes =', (await columns()).join(', '))
for (const row of await breakdown('line')) console.log('          línea', row.k, '→', row.n)
for (const row of await breakdown('stage')) console.log('          seguimiento', row.k, '→', row.n)
console.log('          resto de datos intacto =', quotesAfter === quotesBefore)

await prisma.$disconnect()
