/**
 * Learning Builder · subir la entrega de un curso a su workspace.
 *
 * La metabiblioteca de UNISALLE nació sembrada desde las propuestas: setenta y
 * siete borradores con su título, su curso y su unidad, pero sin pieza dentro.
 * Este script los cambia por lo que de verdad se entregó —el paquete SCORM que
 * salió de `5. Entrega/<Curso>/Archivos finales/`— y les pone encima la
 * codificación del proyecto, que es la que el cliente conoce.
 *
 *   npx tsx scripts/learning-importar-entrega.ts financial-english            # ensayo
 *   npx tsx scripts/learning-importar-entrega.ts financial-english --aplicar  # de verdad
 *
 * El ensayo es el modo por defecto a propósito: enseña a qué borrador va a caer
 * cada paquete antes de tocar nada, porque emparejar por título es justo donde
 * una entrega se puede equivocar en silencio.
 *
 * Por defecto no crea nada: si un paquete no encuentra su borrador, lo dice y
 * se detiene. Un recurso de más en la biblioteca del cliente es más difícil de
 * explicar que uno que falta. Con `--crear` sí los da de alta, que es lo que
 * hace falta cuando el workspace nunca llegó a sembrarse.
 *
 * Nacen como los que ya están: publicados, sin enlace público —compartir se
 * decide uno por uno— y a nombre de quien ya figura en el workspace.
 */
import 'dotenv/config'
import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const AQUI = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(AQUI, '..')
// El entorno se carga antes que Prisma: el cliente lee DATABASE_URL al nacer.
config({ path: path.join(RAIZ, '.env') })
config({ path: path.join(RAIZ, '.env.local'), override: true })

// El cliente del proyecto, no uno nuevo: Prisma 7 necesita su adaptador y ya
// está resuelto ahí.
const { prisma } = await import('../api/_lib/prisma.js')
const { ingestPackage } = await import('../api/_lib/lb-import.js')
const { workspaceBucket } = await import('../api/_lib/lb-storage.js')
const ONEDRIVE = path.join(
  process.env.HOME || '',
  'Library/CloudStorage/OneDrive-ALGORITMOT/Automatizaciones/Unisalle'
)
const ENTREGA = path.join(ONEDRIVE, '5. Entrega')
const FICHAS = path.join(ENTREGA, '_generador', 'cursos')

/** Un MP4 de producción pesa lo que pesa: el tope de la función no aplica aquí. */
const MAX_FILE_BYTES = 64 * 1024 * 1024

type Recurso = {
  codigo: string
  tipo: 'video' | 'lectura' | 'interactivo'
  titulo: string
  unidad: string
  carpeta: string
  pdf?: string
  finales?: string[]
}
type Ficha = { curso: string; sigla: string; recursos: Recurso[] }

const lb = prisma as any

const argumentos = process.argv.slice(2)
const nombreFicha = argumentos.find((a) => !a.startsWith('--'))
const APLICAR = argumentos.includes('--aplicar')
const CREAR = argumentos.includes('--crear')

/**
 * El borrador al que corresponde un paquete.
 *
 * Se empareja por curso y por el título que la propuesta le dio, normalizado:
 * la propuesta escribe «Financial Vocabulary Explorer» y la entrega lo mismo,
 * pero con acentos, mayúsculas y signos que no tienen por qué coincidir.
 */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function emparejar(recurso: Recurso, borradores: any[]): any | null {
  const objetivo = normalizar(recurso.titulo)
  const exacto = borradores.find((b) => normalizar(b.title) === objetivo)
  if (exacto) return exacto
  // El video de presentación lleva el nombre del curso en la propuesta.
  if (recurso.tipo === 'video') {
    const video = borradores.find((b) => b.kind === 'VIDEO')
    if (video) return video
  }
  // Una lectura se nombra por su unidad: «Lectura · U1».
  if (recurso.tipo === 'lectura') {
    const unidad = (recurso.unidad.match(/\d+/) || [])[0]
    if (unidad) {
      const lectura = borradores.find(
        (b) => b.kind === 'LECTURA' && String(b.unit || '').includes(unidad)
      )
      if (lectura) return lectura
    }
  }
  const contiene = borradores.filter((b) => normalizar(b.title).includes(objetivo) || objetivo.includes(normalizar(b.title)))
  return contiene.length === 1 ? contiene[0] : null
}

/** El archivo que se sube: el paquete cerrado, o el video con su codificación. */
function cajaDe(ficha: Ficha, recurso: Recurso): string {
  return path.join(ENTREGA, ficha.curso, 'Archivos finales', recurso.codigo)
}

function piezaDe(ficha: Ficha, recurso: Recurso): { ruta: string; nombre: string } | null {
  if (recurso.tipo === 'video') return null // el video no es un paquete navegable
  const zip = path.join(cajaDe(ficha, recurso), `${recurso.codigo}_SCORM12.zip`)
  if (!fs.existsSync(zip)) throw new Error(`No está el paquete de ${recurso.codigo}: ${zip}`)
  return { ruta: zip, nombre: path.basename(zip) }
}

/** El video y su pista: se suben sueltos y se sirven como pieza de medios. */
function videoDe(ficha: Ficha, recurso: Recurso): { mp4: string; vtt: string | null } {
  const caja = cajaDe(ficha, recurso)
  const mp4 = path.join(caja, `${recurso.codigo}.mp4`)
  if (!fs.existsSync(mp4)) throw new Error(`No está el video de ${recurso.codigo}: ${mp4}`)
  const vtt = path.join(caja, `${recurso.codigo}.es.vtt`)
  return { mp4, vtt: fs.existsSync(vtt) ? vtt : null }
}

async function main() {
  if (!nombreFicha) {
    console.error('Falta la ficha del curso. Ej.: financial-english')
    process.exit(1)
  }
  const ficha: Ficha = JSON.parse(
    fs.readFileSync(path.join(FICHAS, `${nombreFicha}.json`), 'utf8')
  )
  console.log(`\n${ficha.curso} · ${ficha.recursos.length} recursos`)
  console.log(APLICAR ? '  modo: APLICAR — se escribe en la plataforma\n' : '  modo: ensayo — no se escribe nada\n')

  const workspace = await lb.lbWorkspace.findUnique({ where: { code: 'UNISALLE' } })
  if (!workspace) throw new Error('No existe el workspace UNISALLE.')

  const borradores = await lb.lbResource.findMany({
    where: { workspaceId: workspace.id, course: ficha.curso },
    orderBy: { code: 'asc' },
  })
  console.log(`  ${borradores.length} recursos del curso en el workspace\n`)

  // ── 1 · emparejar antes de tocar nada ───────────────────────────────────
  const plan: Array<{ recurso: Recurso; borrador: any | null; pieza: { ruta: string; nombre: string } | null }> = []
  const usados = new Set<string>()
  for (const recurso of ficha.recursos) {
    const candidatos = borradores.filter((b: any) => !usados.has(b.id))
    const borrador = emparejar(recurso, candidatos)
    if (!borrador && !CREAR) {
      console.error(`  ✗ ${recurso.codigo} · sin borrador que le corresponda («${recurso.titulo}»)`)
      console.error('     Con --crear se da de alta; sin él no se inventa nada.')
      process.exit(1)
    }
    if (borrador) usados.add(borrador.id)
    const pieza = piezaDe(ficha, recurso)
    plan.push({ recurso, borrador, pieza })
    const peso = pieza
      ? fs.statSync(pieza.ruta).size
      : fs.statSync(videoDe(ficha, recurso).mp4).size
    console.log(
      `  ${recurso.codigo.padEnd(14)} → ${borrador ? String(borrador.code).padEnd(18) : 'NUEVO'.padEnd(18)}` +
        ` ${recurso.titulo.slice(0, 44).padEnd(44)} ${(peso / 1048576).toFixed(1)} MB`
    )
  }
  const huerfanos = borradores.filter((b: any) => !usados.has(b.id))
  if (huerfanos.length) {
    console.log(`\n  ${huerfanos.length} sin pareja, se quedan como están:`)
    for (const b of huerfanos) console.log(`     ${b.code} · ${b.title}`)
  }

  if (!APLICAR) {
    console.log('\n  Ensayo terminado. Con --aplicar se escribe.\n')
    return
  }

  // ── 2 · la copia de seguridad de lo que se va a pisar ───────────────────
  const aPisar = plan.filter((p) => p.borrador).map((p) => p.borrador)
  if (aPisar.length) {
    const respaldo = path.join(
      RAIZ, `.learning-respaldo-${nombreFicha}-${new Date().toISOString().slice(0, 10)}.json`)
    fs.writeFileSync(respaldo, JSON.stringify(aPisar, null, 2))
    console.log(`\n  respaldo de ${aPisar.length} borradores → ${path.basename(respaldo)}`)
  }

  const bucket = await workspaceBucket(workspace)
  const { resourceCodeFor, takenResourceCodes } = await import('../api/_lib/lb-codes.js')
  const { newPublicId } = await import('../api/_lib/lb-store.js')

  /* Los nuevos nacen como los que ya están en el workspace: publicados, sin
     enlace público —compartir se decide recurso a recurso— y a nombre de quien
     ya figura ahí. */
  const referencia = await lb.lbResource.findFirst({
    where: { workspaceId: workspace.id }, select: { ownerId: true },
  })
  const dueno = referencia?.ownerId
  if (!dueno) throw new Error('El workspace no tiene ningún recurso del que heredar el propietario.')

  // ── 3 · subir y apuntar ─────────────────────────────────────────────────
  for (const { recurso, pieza } of plan) {
    let registro = plan.find((p) => p.recurso.codigo === recurso.codigo)!.borrador
    const kind = recurso.tipo === 'video' ? 'VIDEO' : 'IMPORT'

    if (!registro) {
      const tomados = await takenResourceCodes(lb.lbResource, workspace.id)
      registro = await lb.lbResource.create({
        data: {
          publicId: newPublicId(),
          code: resourceCodeFor(workspace.code, kind, tomados),
          workspaceId: workspace.id,
          ownerId: dueno,
          kind,
          title: recurso.titulo,
          course: ficha.curso,
          unit: recurso.unidad,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          content: {},
        },
      })
      console.log(`  + ${recurso.codigo} · alta como ${registro.code}`)
    }

    const datos: Record<string, unknown> = {
      clientCode: recurso.codigo,
      title: recurso.titulo,
      course: ficha.curso,
      unit: recurso.unidad,
      kind,
      status: 'PUBLISHED',
      tags: Array.from(new Set([...(registro.tags || []), 'entregado'])),
    }

    if (pieza) {
      const resultado = await ingestPackage({
        archive: fs.readFileSync(pieza.ruta),
        fileName: pieza.nombre,
        resource: { id: registro.id, title: recurso.titulo, code: registro.code, kind, content: registro.content },
        workspace: { code: workspace.code },
        bucket,
        maxFileBytes: MAX_FILE_BYTES,
      })
      datos.importMode = 'MIRROR'
      datos.content = resultado.content
      console.log(`  ✓ ${recurso.codigo} · ${registro.code} · ${resultado.files} archivos`)
    } else {
      /* El video no es un sitio navegable: se sirve como un archivo, con su
         pista de subtítulos al lado, que es como lo entrega el campus. */
      const { mp4, vtt } = videoDe(ficha, recurso)
      const carpeta = `${workspace.code}/${registro.code}`
      const video = await bucket.put(
        `${carpeta}/${recurso.codigo}.mp4`, fs.readFileSync(mp4), 'video/mp4', MAX_FILE_BYTES)
      const pista = vtt
        ? await bucket.put(`${carpeta}/${path.basename(vtt)}`, fs.readFileSync(vtt), 'text/vtt', MAX_FILE_BYTES)
        : null
      datos.assets = {
        kind: 'MEDIA',
        deliver: true,
        entry: `${recurso.codigo}.mp4`,
        pages: [],
        patches: [],
        origin: {
          fileName: `${recurso.codigo}.mp4`,
          importedAt: new Date().toISOString(),
          bytes: video.bytes,
          files: pista ? 2 : 1,
        },
        media: { url: video.url, contentType: 'video/mp4', captionsUrl: pista?.url },
      }
      console.log(`  ✓ ${recurso.codigo} · ${registro.code} · video${pista ? ' y subtítulos' : ''}`)
    }

    await lb.lbResource.update({ where: { id: registro.id }, data: datos })
  }
  console.log('\n  Listo.\n')
}

main()
  .catch((error) => {
    console.error('\n‼', error instanceof Error ? error.message : error, '\n')
    process.exit(1)
  })
  .finally(() => (prisma as any).$disconnect())
