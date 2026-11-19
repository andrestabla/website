/**
 * Learning Builder · subir una versión nueva de los videos de un curso.
 *
 *   npx tsx scripts/lb-nueva-version-medios.ts <ficha> "qué cambia"
 *   npx tsx scripts/lb-nueva-version-medios.ts <ficha> "qué cambia" --aplicar
 *   npx tsx scripts/lb-nueva-version-medios.ts --todas "qué cambia" --aplicar
 *   npx tsx scripts/lb-nueva-version-medios.ts --todas "nota" --reemplazar --aplicar
 *
 * Un video se corrige fuera y se vuelve a entregar, igual que un paquete: esto
 * le abre su **versión nueva** —la anterior se queda con su archivo, su pista y
 * sus comentarios— y le cuelga encima el MP4 y el `.vtt` que haya en
 * `5. Entrega/<Curso>/Archivos finales/`.
 *
 * La pista va después y **no abre otra versión**: acompaña a la que acaba de
 * quedar viva. Subir el video y después sus subtítulos es una sola entrega
 * partida en dos archivos.
 *
 * Con `--reemplazar` **corrige la versión viva** en lugar de abrir otra. Es
 * para un archivo subido por error, antes de que nadie lo haya mirado: una
 * versión que ya se revisó no se pisa, se sucede.
 */
import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(RAIZ, '.env') })
config({ path: path.join(RAIZ, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')
const { ingestMedia } = await import('../api/_lib/lb-import.js')
const { workspaceBucket } = await import('../api/_lib/lb-storage.js')
const db = prisma as any

const CANDIDATAS = [
  process.env.UNISALLE_RAIZ,
  '/Volumes/EAlgoritmoT/Unisalle',
  path.join(process.env.HOME || '', 'Library/CloudStorage/OneDrive-ALGORITMOT/Automatizaciones/Unisalle'),
].filter(Boolean) as string[]
const RAIZ_UNISALLE = CANDIDATAS.find((p) => fs.existsSync(path.join(p, '5. Entrega')))
if (!RAIZ_UNISALLE) {
  console.error('\n‼ no encuentro «5. Entrega».\n')
  process.exit(1)
}
const ENTREGA = path.join(RAIZ_UNISALLE, '5. Entrega')
const FICHAS = path.join(ENTREGA, '_generador', 'cursos')
/** Un MP4 de producción pesa lo que pesa. */
const MAX_FILE_BYTES = 64 * 1024 * 1024

const argumentos = process.argv.slice(2)
const APLICAR = argumentos.includes('--aplicar')
const TODAS = argumentos.includes('--todas')
const REEMPLAZAR = argumentos.includes('--reemplazar')
const sueltos = argumentos.filter((a) => !a.startsWith('--'))
const nombreFicha = TODAS ? null : sueltos[0]
const nota = (TODAS ? sueltos[0] : sueltos[1]) || ''
const WORKSPACE = process.env.LB_WORKSPACE || 'UNISALLE'

async function main() {
  if (!TODAS && !nombreFicha) {
    console.error('\nFalta la ficha del curso, o --todas.\n')
    process.exit(1)
  }
  if (!nota) {
    console.error('\nFalta la nota: qué cambia en esta versión.\n')
    process.exit(1)
  }
  const fichas = TODAS
    ? fs.readdirSync(FICHAS).filter((f) => f.endsWith('.json')).sort()
    : [`${nombreFicha}.json`]

  const workspace = await db.lbWorkspace.findUnique({ where: { code: WORKSPACE } })
  if (!workspace) throw new Error(`No existe el workspace ${WORKSPACE}.`)
  const bucket = await workspaceBucket(workspace)

  console.log(`\n${WORKSPACE} · ${fichas.length} ficha(s)`)
  console.log(APLICAR ? '  modo: APLICAR — se escribe\n' : '  modo: ensayo — no se escribe nada\n')

  let hechos = 0
  for (const f of fichas) {
    const ficha = JSON.parse(fs.readFileSync(path.join(FICHAS, f), 'utf8'))
    for (const rec of ficha.recursos.filter((r: any) => r.tipo === 'video')) {
      const caja = path.join(ENTREGA, ficha.curso, 'Archivos finales', rec.codigo)
      const mp4 = path.join(caja, `${rec.codigo}.mp4`)
      if (!fs.existsSync(mp4)) { console.log(`  ✗ ${rec.codigo.padEnd(16)} no está su MP4`); continue }
      const fila = await db.lbResource.findFirst({
        where: { workspaceId: workspace.id, course: ficha.curso, clientCode: rec.codigo },
      })
      if (!fila) { console.log(`  ✗ ${rec.codigo.padEnd(16)} no está en el workspace`); continue }
      const viva = fila.packageVersion || 1
      const destino = REEMPLAZAR ? viva : viva + 1
      const pistas = fs.readdirSync(caja).filter((n) => n.toLowerCase().endsWith('.vtt')).sort()
      console.log(`  ${rec.codigo.padEnd(16)} ${String(fila.code).padEnd(18)} V${viva} → V${destino}`
        + (REEMPLAZAR ? ' (corrige la viva)' : '')
        + ` · ${(fs.statSync(mp4).size / 1048576).toFixed(1)} MB`
        + (pistas.length ? ` · ${pistas.length} pista(s)` : ' · sin pista'))
      if (!APLICAR) continue

      const actual = await db.lbResource.findUnique({ where: { id: fila.id } })
      const r = await ingestMedia({
        data: fs.readFileSync(mp4), fileName: `${rec.codigo}.mp4`, resource: actual,
        workspace, bucket, maxFileBytes: MAX_FILE_BYTES,
        mode: REEMPLAZAR ? 'replace' : 'version', notes: nota,
      })
      // La pista va a la versión que acaba de quedar viva, sin abrir otra.
      for (const pista of pistas) {
        const tras = await db.lbResource.findUnique({ where: { id: fila.id } })
        await ingestMedia({
          data: fs.readFileSync(path.join(caja, pista)), fileName: pista, resource: tras,
          workspace, bucket, maxFileBytes: MAX_FILE_BYTES, mode: 'replace',
        })
      }
      hechos += 1
      console.log(`      ✓ V${r.version} viva${pistas.length ? ` · ${pistas[0]} colgada` : ''}`)
    }
  }
  console.log(APLICAR ? `\n  ${hechos} videos ${REEMPLAZAR ? 'corregidos en su versión viva' : 'con versión nueva'}\n` : '\n  Ensayo terminado. Con --aplicar se escribe.\n')
}

main()
  .catch((error) => {
    console.error('\n‼', error instanceof Error ? error.message : error, '\n')
    process.exit(1)
  })
  .finally(() => db.$disconnect())
