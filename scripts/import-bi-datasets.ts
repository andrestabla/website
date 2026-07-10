/**
 * Importa los datasets analíticos del módulo BI a Postgres (tabla BiDataset).
 *
 * Fuente: los payloads generados por los pipelines Python (window.X = {...};).
 * Por defecto lee desde la carpeta del proyecto de análisis; se puede sobreescribir
 * con la variable de entorno BI_DATA_DIR.
 *
 * Requisitos previos:
 *   1) Aplicar el modelo BiDataset a la DB:   npx prisma db push
 *   2) Ejecutar:  node --env-file=.env --import tsx scripts/import-bi-datasets.ts
 *      (o)        npx tsx scripts/import-bi-datasets.ts   (con DATABASE_URL en el entorno)
 */
import fs from 'node:fs'
import path from 'node:path'
import * as PrismaModule from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const DATA_DIR =
  process.env.BI_DATA_DIR ||
  '/Users/andrestabla/Documents/Estudio mercado/modulo_insights/data'

type Entry = { key: string; file: string; title: string; category: string }
const ENTRIES: Entry[] = [
  { key: 'insights', file: 'dataset_web.js', title: 'Oferta educativa (SNIES)', category: 'oferta' },
  { key: 'prospectiva', file: 'prospectiva_web.js', title: 'Competencias demandadas (LATAM/Colombia)', category: 'laboral' },
  { key: 'ole', file: 'ole_web.js', title: 'Empleabilidad de graduados (OLE)', category: 'laboral' },
  { key: 'oit', file: 'oit_web.js', title: 'Reskilling y mercado laboral (OIT/DANE)', category: 'laboral' },
  { key: 'pertinencia', file: 'pertinencia_web.js', title: 'Pertinencia territorial (oferta↔demanda)', category: 'regional' },
  { key: 'puente', file: 'puente_web.js', title: 'Pertinencia por disciplina', category: 'regional' },
  { key: 'recomendaciones', file: 'recomendaciones_web.js', title: 'Recomendación de programas', category: 'regional' },
  { key: 'cohortes', file: 'cohortes_web.js', title: 'Demanda potencial por cohortes (DANE)', category: 'regional' },
]

function parsePayload(file: string): any {
  const raw = fs.readFileSync(file, 'utf8')
  const eq = raw.indexOf('=')
  if (eq < 0) throw new Error(`No se encontró asignación en ${file}`)
  const jsonStr = raw.slice(eq + 1).trim().replace(/;\s*$/, '')
  return JSON.parse(jsonStr)
}

async function main() {
  const databaseUrl = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim()
  if (!databaseUrl) throw new Error('DATABASE_URL no está configurada')
  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const PrismaClient = (PrismaModule as any).PrismaClient
  const prisma = new PrismaClient({ adapter } as any)

  let ok = 0
  for (const e of ENTRIES) {
    const full = path.join(DATA_DIR, e.file)
    if (!fs.existsSync(full)) {
      console.warn(`  ⚠ omitido (no existe): ${e.file}`)
      continue
    }
    const data = parsePayload(full)
    const meta = data?.meta ?? null
    await prisma.biDataset.upsert({
      where: { key: e.key },
      create: { key: e.key, title: e.title, category: e.category, meta, data, active: true },
      update: { title: e.title, category: e.category, meta, data, active: true },
    })
    const size = (JSON.stringify(data).length / 1000).toFixed(0)
    console.log(`  ✓ ${e.key.padEnd(16)} (${e.category}) · ${size} KB`)
    ok++
  }
  await prisma.$disconnect()
  await pool.end()
  console.log(`\nImportados ${ok}/${ENTRIES.length} datasets BI a Postgres.`)
}

main().catch((err) => {
  console.error('Error importando datasets BI:', err)
  process.exit(1)
})
