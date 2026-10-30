/**
 * Learning Builder · ¿lo que sirve la plataforma es lo que se entregó?
 *
 *   npx tsx scripts/lb-cotejar-entrega.ts niveles-de-analisis-de-la-lengua
 *   npx tsx scripts/lb-cotejar-entrega.ts niveles-de-analisis-de-la-lengua --solo NAL_RED5_ACT
 *
 * Subir un paquete y ver la ficha en verde no prueba nada: prueba que la
 * petición no falló. Esto compara, archivo por archivo, el ZIP de
 * `5. Entrega/<Curso>/Archivos finales/` con lo que la plataforma guardó para
 * la versión viva del recurso, y descarga la pieza de entrada para cotejar sus
 * bytes. Con el video, lo mismo: se baja lo que sirve y se compara con el MP4
 * y su pista.
 *
 * Solo lee. La versión viva es la mayor que tenga archivos; de las anteriores
 * no dice nada, que para eso están.
 */
import { config } from 'dotenv'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(RAIZ, '.env') })
config({ path: path.join(RAIZ, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')
const { unzip, stripCommonRoot } = await import('../api/_lib/lb-unzip.js')
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

const argumentos = process.argv.slice(2)
const nombreFicha = argumentos.find((a, i) => !a.startsWith('--') && argumentos[i - 1] !== '--solo')
const solo = (() => {
  const i = argumentos.indexOf('--solo')
  if (i < 0) return null
  return new Set((argumentos[i + 1] || '').split(',').map((c) => c.trim()).filter(Boolean))
})()
const WORKSPACE = process.env.LB_WORKSPACE || 'UNISALLE'

const md5 = (b: Buffer | Uint8Array) => crypto.createHash('md5').update(b).digest('hex')

async function bajar(url: string): Promise<Buffer> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} al bajar ${url}`)
  return Buffer.from(await r.arrayBuffer())
}

async function main() {
  if (!nombreFicha) {
    console.error('\nFalta la ficha. Ej.: niveles-de-analisis-de-la-lengua\n')
    process.exit(1)
  }
  const ficha = JSON.parse(
    fs.readFileSync(path.join(ENTREGA, '_generador', 'cursos', `${nombreFicha}.json`), 'utf8')
  )
  const recursos = ficha.recursos.filter((r: any) => !solo || solo.has(r.codigo))
  const workspace = await db.lbWorkspace.findUnique({ where: { code: WORKSPACE } })
  if (!workspace) throw new Error(`No existe el workspace ${WORKSPACE}.`)

  console.log(`\n${ficha.curso} · ${recursos.length} recursos\n`)
  let mal = 0

  for (const rec of recursos) {
    const fila = await db.lbResource.findFirst({
      where: { workspaceId: workspace.id, course: ficha.curso, clientCode: rec.codigo },
    })
    if (!fila) {
      console.log(`  ✗ ${rec.codigo.padEnd(14)} no está en el workspace`)
      mal++
      continue
    }
    const caja = path.join(ENTREGA, ficha.curso, 'Archivos finales', rec.codigo)

    if (rec.tipo === 'video') {
      const media = (fila.assets as any)?.media || {}
      const local = fs.readFileSync(path.join(caja, `${rec.codigo}.mp4`))
      const servido = await bajar(media.url)
      const igual = md5(local) === md5(servido)
      let pista = 'sin pista'
      const vtt = path.join(caja, `${rec.codigo}.es.vtt`)
      if (fs.existsSync(vtt)) {
        pista = media.captionsUrl
          ? (md5(fs.readFileSync(vtt)) === md5(await bajar(media.captionsUrl))
              ? 'pista idéntica' : 'PISTA DISTINTA')
          : 'PISTA SIN SERVIR'
      }
      if (!igual || pista.startsWith('PISTA')) mal++
      console.log(`  ${igual && !pista.startsWith('PISTA') ? '✓' : '✗'} ${rec.codigo.padEnd(14)} ${fila.code.padEnd(18)} `
        + `video ${igual ? 'idéntico' : 'DISTINTO'} · ${(local.length / 1048576).toFixed(1)} MB · ${pista}`)
      continue
    }

    const zip = path.join(caja, `${rec.codigo}_SCORM12.zip`)
    const entradas = stripCommonRoot(await unzip(fs.readFileSync(zip)))
    const delZip = new Map<string, Buffer>(entradas.map((e: any) => [e.path, e.bytes]))

    const viva = await db.lbResourceFile.aggregate({
      where: { resourceId: fila.id }, _max: { version: true },
    })
    const version = viva._max.version
    const archivos = await db.lbResourceFile.findMany({
      where: { resourceId: fila.id, version }, orderBy: { path: 'asc' },
    })

    const faltan = [...delZip.keys()].filter((p) => !archivos.some((a: any) => a.path === p))
    const sobran = archivos.filter((a: any) => !delZip.has(a.path)).map((a: any) => a.path)
    const pesos = archivos.filter((a: any) => delZip.has(a.path)
      && a.bytes !== delZip.get(a.path)!.length).map((a: any) => a.path)

    const entrada = (fila.content as any)?.entry || 'index.html'
    const servida = archivos.find((a: any) => a.path === entrada)
    let bytes = 'sin entrada'
    if (servida) {
      bytes = md5(await bajar(servida.url)) === md5(delZip.get(entrada)!)
        ? 'entrada idéntica' : 'ENTRADA DISTINTA'
    }

    const ok = !faltan.length && !sobran.length && !pesos.length && bytes === 'entrada idéntica'
    if (!ok) mal++
    console.log(`  ${ok ? '✓' : '✗'} ${rec.codigo.padEnd(14)} ${fila.code.padEnd(18)} v${version} · `
      + `${archivos.length}/${delZip.size} archivos · ${bytes}`)
    for (const [rotulo, lista] of [['falta', faltan], ['de más', sobran], ['otro peso', pesos]] as const) {
      if (lista.length) console.log(`       ${rotulo}: ${lista.slice(0, 6).join(', ')}${lista.length > 6 ? ` … y ${lista.length - 6}` : ''}`)
    }
  }

  console.log(mal
    ? `\n  ✗ ${mal} de ${recursos.length} no coinciden con lo entregado\n`
    : `\n  ✓ los ${recursos.length} recursos sirven exactamente lo entregado\n`)
  if (mal) process.exit(1)
}

main()
  .catch((error) => {
    console.error('\n‼', error instanceof Error ? error.message : error, '\n')
    process.exit(1)
  })
  .finally(() => db.$disconnect())
