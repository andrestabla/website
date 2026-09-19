/**
 * Compone la forma Unicode de lo ya guardado en el Learning Builder.
 *
 *   npx tsx scripts/normalize-learning-titles.ts          # informa
 *   npx tsx scripts/normalize-learning-titles.ts --aplica # escribe
 *
 * Los recursos que se sembraron leyendo carpetas de macOS quedaron con los
 * acentos descompuestos: «ó» son dos caracteres en vez de uno. Se ven igual y
 * no son iguales, así que un título tecleado en el editor no encuentra al
 * suyo, la búsqueda falla y el orden alfabético se desordena.
 *
 * El saneador ya compone todo lo que entra de ahora en adelante; esto arregla
 * lo que entró antes. Es idempotente: una segunda pasada no encuentra nada.
 */
import 'dotenv/config'
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')
const store = await import('../api/_lib/lb-store.js')

const apply = process.argv.includes('--aplica')
const nfc = (value: string | null): string | null => (value === null ? null : value.normalize('NFC'))

let touched = 0
let checked = 0

const resources = await store.lbResources().findMany({
  select: { id: true, code: true, title: true, subtitle: true, course: true, unit: true, tags: true },
})
for (const row of resources) {
  checked += 1
  const data: Record<string, unknown> = {}
  for (const field of ['title', 'subtitle', 'course', 'unit'] as const) {
    const value = row[field] as string | null
    if (typeof value === 'string' && value !== value.normalize('NFC')) data[field] = nfc(value)
  }
  const tags: string[] = Array.isArray(row.tags) ? row.tags : []
  if (tags.some((tag) => tag !== tag.normalize('NFC'))) data.tags = tags.map((tag) => tag.normalize('NFC'))

  if (!Object.keys(data).length) continue
  touched += 1
  console.log(`${row.code.padEnd(20)} ${Object.keys(data).join(', ')}`)
  for (const [field, value] of Object.entries(data)) {
    if (field === 'tags') continue
    console.log(`${''.padEnd(20)} ${field}: ${(row as any)[field].length} → ${String(value).length} caracteres`)
  }
  if (apply) await store.lbResources().update({ where: { id: row.id }, data })
}

const workspaces = await store.lbWorkspaces().findMany({ select: { id: true, code: true, name: true, notes: true } })
for (const row of workspaces) {
  checked += 1
  const data: Record<string, unknown> = {}
  if (row.name !== row.name.normalize('NFC')) data.name = nfc(row.name)
  if (typeof row.notes === 'string' && row.notes !== row.notes.normalize('NFC')) data.notes = nfc(row.notes)
  if (!Object.keys(data).length) continue
  touched += 1
  console.log(`${row.code.padEnd(20)} workspace · ${Object.keys(data).join(', ')}`)
  if (apply) await store.lbWorkspaces().update({ where: { id: row.id }, data })
}

console.log(`\n${checked} fila(s) revisadas · ${touched} con acentos descompuestos${apply ? ' · corregidas' : ' · usa --aplica para corregirlas'}`)
await prisma.$disconnect()
