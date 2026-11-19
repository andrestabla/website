/**
 * Learning Builder · ponerle a cada ficha la codificación del proyecto.
 *
 *   npx tsx scripts/lb-poner-codigos.ts misterio-de-dios
 *   npx tsx scripts/lb-poner-codigos.ts misterio-de-dios --aplicar
 *
 * El importador de la entrega escribe el código del cliente —`MD_RED2_PDF`— y
 * la etiqueta `entregado` en cada ficha. Un curso que se subió a mano no los
 * tiene, y entonces no sale al listar la entrega por código ni lo encuentran
 * las herramientas que trabajan con la ficha del curso.
 *
 * Esto le pone **solo el rótulo**: empareja por curso y título normalizado
 * contra la ficha de entrega y escribe el código y la etiqueta. No toca el
 * paquete, ni el estado, ni las versiones, ni el enlace público.
 */
import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(RAIZ, '.env') })
config({ path: path.join(RAIZ, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')
const db = prisma as any

const CANDIDATAS = [
  process.env.UNISALLE_RAIZ,
  '/Volumes/EAlgoritmoT/Unisalle',
  path.join(process.env.HOME || '', 'Library/CloudStorage/OneDrive-ALGORITMOT/Automatizaciones/Unisalle'),
].filter(Boolean) as string[]
const RAIZ_UNISALLE = CANDIDATAS.find((p) => fs.existsSync(path.join(p, '5. Entrega')))
if (!RAIZ_UNISALLE) { console.error('\n‼ no encuentro «5. Entrega».\n'); process.exit(1) }
const FICHAS = path.join(RAIZ_UNISALLE, '5. Entrega', '_generador', 'cursos')

const argumentos = process.argv.slice(2)
const APLICAR = argumentos.includes('--aplicar')
const nombreFicha = argumentos.find((a) => !a.startsWith('--'))
const WORKSPACE = process.env.LB_WORKSPACE || 'UNISALLE'

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

async function main() {
  if (!nombreFicha) { console.error('\nFalta la ficha. Ej.: misterio-de-dios\n'); process.exit(1) }
  const ficha = JSON.parse(fs.readFileSync(path.join(FICHAS, `${nombreFicha}.json`), 'utf8'))
  const workspace = await db.lbWorkspace.findUnique({ where: { code: WORKSPACE } })
  if (!workspace) throw new Error(`No existe el workspace ${WORKSPACE}.`)
  const filas = await db.lbResource.findMany({
    where: { workspaceId: workspace.id, course: ficha.curso }, orderBy: { code: 'asc' },
  })
  console.log(`\n${ficha.curso} · ${filas.length} fichas en el workspace`)
  console.log(APLICAR ? '  modo: APLICAR — se escribe\n' : '  modo: ensayo — no se escribe nada\n')

  const usadas = new Set<string>()
  let puestos = 0
  for (const rec of ficha.recursos) {
    const objetivo = normalizar(rec.titulo)
    let fila = filas.find((f: any) => !usadas.has(f.id) && normalizar(f.title) === objetivo)
    // El video de presentación se tituló en la propuesta con el nombre del curso.
    if (!fila && rec.tipo === 'video') fila = filas.find((f: any) => !usadas.has(f.id) && f.kind === 'VIDEO')
    if (!fila) { console.log(`  ✗ ${rec.codigo.padEnd(16)} sin ficha que le corresponda`); continue }
    usadas.add(fila.id)
    const falta = fila.clientCode !== rec.codigo || !(fila.tags || []).includes('entregado')
    console.log(`  ${falta ? '→' : '='} ${rec.codigo.padEnd(16)} ${String(fila.code).padEnd(18)}`
      + ` ${falta ? 'le falta el rótulo' : 'ya lo tiene'} · «${String(fila.title).slice(0, 44)}»`)
    if (!falta || !APLICAR) continue
    await db.lbResource.update({
      where: { id: fila.id },
      data: {
        clientCode: rec.codigo,
        tags: Array.from(new Set([...(fila.tags || []), 'entregado'])),
      },
    })
    puestos += 1
  }
  const huerfanas = filas.filter((f: any) => !usadas.has(f.id))
  if (huerfanas.length) {
    console.log(`\n  ${huerfanas.length} sin pareja en la ficha, se quedan como están:`)
    for (const f of huerfanas) console.log(`     ${f.code} · ${f.title}`)
  }
  console.log(APLICAR ? `\n  ${puestos} rótulos puestos\n` : '\n  Ensayo terminado. Con --aplicar se escribe.\n')
}

main()
  .catch((e) => { console.error('\n‼', e instanceof Error ? e.message : e, '\n'); process.exit(1) })
  .finally(() => db.$disconnect())
