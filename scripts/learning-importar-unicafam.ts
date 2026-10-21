/**
 * Learning Builder · montar en UNICAFAMCONA los recursos producidos de CONACED–SENA.
 *
 * Toma lo que hay en `4. Producción/<AF>/01_Entrega/` —los SCORM de la ruta y de
 * los OVA, los videos con su pista y su póster, los pódcast— y lo deja en el
 * workspace del proyecto con la codificación que usa el equipo (AF1-UT1-OVA) en
 * `clientCode`.
 *
 * La biblioteca lo ordena en carpetas: el curso es la AF y la unidad dice la
 * subcarpeta, con «›» entre niveles: «Inicio del curso» o «UT1 › 2. Comprensión».
 *
 *   npx tsx scripts/learning-importar-unicafam.ts             # ensayo: no escribe
 *   npx tsx scripts/learning-importar-unicafam.ts --aplicar   # sube y registra
 *   npx tsx scripts/learning-importar-unicafam.ts --aplicar AF1-UT1-OVA   # solo ese
 *
 * Se puede repetir: un recurso que ya está con el mismo clientCode se actualiza
 * —paquete nuevo, mismo enlace—, en lugar de duplicarse. Lo que no está producido
 * todavía se salta y se dice.
 *
 * Nacen publicados y sin enlace público, como los de los otros workspaces:
 * compartir se decide recurso a recurso.
 */
import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const AQUI = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.join(AQUI, '..')
// El entorno se carga antes que Prisma: el cliente lee DATABASE_URL al nacer.
config({ path: path.join(RAIZ, '.env') })
config({ path: path.join(RAIZ, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')
const { ingestPackage } = await import('../api/_lib/lb-import.js')
const { workspaceBucket } = await import('../api/_lib/lb-storage.js')
const { resourceCodeFor, takenResourceCodes } = await import('../api/_lib/lb-codes.js')
const { newPublicId } = await import('../api/_lib/lb-store.js')

const PROYECTO = path.join(
  process.env.HOME || '',
  'Library/CloudStorage/OneDrive-ALGORITMOT/Automatizaciones/Unicafam - SENA'
)
const PRODUCCION = path.join(PROYECTO, '4. Producción')
const GUIONES = path.join(PROYECTO, '3. Guiones/02_Guiones')
const WORKSPACE = 'UNICAFAMCONA'
/** Un MP4 de producción pesa lo que pesa: el tope de la función no aplica aquí. */
const MAX_FILE_BYTES = 64 * 1024 * 1024

const AF_NOMBRE: Record<string, string> = {
  AF1: 'Educación socioemocional y calidad de vida como bases de la formación integral',
  AF2: 'Aula Viva: metodologías activas y aprendizaje experiencial para la innovación en el aula',
  AF3: 'IA generativa 2026: sistemas multiagente, modelos de dominio específico y evaluación adaptativa para la personalización del aprendizaje',
}
/** Momento de la unidad al que pertenece cada pieza (lineamiento del 20/10/2026). */
const MOMENTO: Record<string, string> = {
  PRE: '1. Contextualización',
  OVA: '2. Comprensión',
  'OVA-VID': '2. Comprensión',
  'OVA-POD': '2. Comprensión',
}

type Pieza = {
  codigo: string
  af: string
  kind: 'IMPORT' | 'VIDEO' | 'PODCAST'
  titulo: string
  unidad: string
  archivo: string
}

const lb = prisma as any
const argumentos = process.argv.slice(2)
const APLICAR = argumentos.includes('--aplicar')
const SOLO = argumentos.filter((a) => !a.startsWith('--'))

function leerJson(ruta: string): any {
  return fs.existsSync(ruta) ? JSON.parse(fs.readFileSync(ruta, 'utf8')) : null
}

/** El título con el que el guion nombra la pieza; si no lo trae, uno descriptivo. */
function tituloDe(af: string, id: string, tipo: string): string {
  const trabajo = path.join(GUIONES, af, '03_Trabajo')
  if (tipo === 'OVA-POD') {
    const ova = leerJson(path.join(trabajo, `${id.replace(/-POD$/, '')}.json`))
    const pantalla = (ova?.pantallas || []).find((p: any) => p.tipo === 'podcast' || p.podcast)
    return pantalla?.podcast?.titulo || pantalla?.titulo || 'Pódcast de la unidad'
  }
  const guion = leerJson(path.join(trabajo, `${id}.json`))
  return guion?.recurso?.titulo || guion?.titulo || id
}

/** Lo que hay producido en la carpeta de entrega de cada AF. */
function inventario(): Pieza[] {
  const piezas: Pieza[] = []
  for (const af of Object.keys(AF_NOMBRE)) {
    const entrega = path.join(PRODUCCION, af, '01_Entrega')
    if (!fs.existsSync(entrega)) continue
    for (const nombre of fs.readdirSync(entrega).sort()) {
      const m = nombre.match(/^(AF\d)-(CUR|UT\d)-(RUTA|PRE|OVA|OVA-VID|OVA-POD)\.(zip|mp4|mp3)$/)
      if (!m) continue
      const [, , ambito, tipo, ext] = m
      const codigo = nombre.replace(/\.[^.]+$/, '')
      const kind = ext === 'zip' ? 'IMPORT' : ext === 'mp4' ? 'VIDEO' : 'PODCAST'
      const unidad = ambito === 'CUR' ? 'Inicio del curso' : `${ambito} › ${MOMENTO[tipo] || 'Recursos'}`
      piezas.push({ codigo, af, kind, titulo: tituloDe(af, codigo, tipo), unidad, archivo: path.join(entrega, nombre) })
    }
  }
  return piezas
}

/** El curso, tal como se ve en la carpeta: la AF con su nombre oficial. */
const cursoDe = (af: string) => `${af} · ${AF_NOMBRE[af]}`

/** El MP4 o el MP3 se sirven como archivo, con su pista y su póster al lado. */
async function subirMedio(bucket: any, carpeta: string, pieza: Pieza) {
  const base = pieza.archivo.replace(/\.[^.]+$/, '')
  const tipo = pieza.kind === 'VIDEO' ? 'video/mp4' : 'audio/mpeg'
  const archivo = path.basename(pieza.archivo)
  const medio = await bucket.put(`${carpeta}/${archivo}`, fs.readFileSync(pieza.archivo), tipo, MAX_FILE_BYTES)
  const vtt = `${base}.vtt`
  const pista = fs.existsSync(vtt)
    ? await bucket.put(`${carpeta}/${path.basename(vtt)}`, fs.readFileSync(vtt), 'text/vtt', MAX_FILE_BYTES)
    : null
  const jpg = `${base}-poster.jpg`
  const poster = fs.existsSync(jpg)
    ? await bucket.put(`${carpeta}/${path.basename(jpg)}`, fs.readFileSync(jpg), 'image/jpeg', MAX_FILE_BYTES)
    : null
  const media: Record<string, unknown> = { url: medio.url, contentType: tipo }
  if (pista) media.captionsUrl = pista.url
  if (poster) media.posterUrl = poster.url
  return {
    kind: 'MEDIA',
    deliver: true,
    entry: archivo,
    pages: [],
    patches: [],
    origin: { fileName: archivo, importedAt: new Date().toISOString(), bytes: medio.bytes, files: 1 + (pista ? 1 : 0) + (poster ? 1 : 0) },
    media,
  }
}

async function main() {
  const workspace = await lb.lbWorkspace.findUnique({ where: { code: WORKSPACE } })
  if (!workspace) throw new Error(`No existe el workspace ${WORKSPACE}.`)
  const existentes = await lb.lbResource.findMany({ where: { workspaceId: workspace.id } })
  const porCodigo = new Map<string, any>(existentes.filter((r: any) => r.clientCode).map((r: any) => [r.clientCode, r]))

  const piezas = inventario().filter((p) => !SOLO.length || SOLO.includes(p.codigo))
  console.log(`\n${WORKSPACE} · ${piezas.length} recursos producidos`)
  console.log(APLICAR ? '  modo: APLICAR — se escribe en la plataforma\n' : '  modo: ensayo — no se escribe nada\n')
  for (const p of piezas) {
    const ya = porCodigo.get(p.codigo)
    const mb = (fs.statSync(p.archivo).size / 1048576).toFixed(1)
    console.log(`  ${p.codigo.padEnd(16)} ${p.kind.padEnd(8)} ${(ya ? `actualiza ${ya.code}` : 'NUEVO').padEnd(26)} ${p.af} / ${p.unidad.padEnd(22)} ${p.titulo.slice(0, 48).padEnd(48)} ${mb} MB`)
  }
  if (!APLICAR) {
    console.log('\n  Ensayo terminado. Con --aplicar se escribe.\n')
    return
  }

  const bucket = await workspaceBucket(workspace)
  const referencia = await lb.lbResource.findFirst({ where: { workspaceId: workspace.id }, select: { ownerId: true } })
  const dueno = referencia?.ownerId
  if (!dueno) throw new Error('El workspace no tiene ningún recurso del que heredar el propietario.')

  for (const pieza of piezas) {
    let registro = porCodigo.get(pieza.codigo)
    if (!registro) {
      const tomados = await takenResourceCodes(lb.lbResource, workspace.id)
      registro = await lb.lbResource.create({
        data: {
          publicId: newPublicId(),
          code: resourceCodeFor(workspace.code, pieza.kind, tomados),
          workspaceId: workspace.id,
          ownerId: dueno,
          kind: pieza.kind,
          title: pieza.titulo,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          content: {},
        },
      })
    }
    const datos: Record<string, unknown> = {
      clientCode: pieza.codigo,
      title: pieza.titulo,
      course: cursoDe(pieza.af),
      unit: pieza.unidad,
      kind: pieza.kind,
      status: 'PUBLISHED',
      tags: Array.from(new Set([...(registro.tags || []), 'entregado', pieza.af])),
    }
    if (pieza.kind === 'IMPORT') {
      const resultado = await ingestPackage({
        archive: fs.readFileSync(pieza.archivo),
        fileName: path.basename(pieza.archivo),
        resource: { id: registro.id, title: pieza.titulo, code: registro.code, kind: 'IMPORT', content: registro.content },
        workspace: { code: workspace.code },
        bucket,
        maxFileBytes: MAX_FILE_BYTES,
      })
      datos.importMode = 'MIRROR'
      datos.content = resultado.content
      console.log(`  ✓ ${pieza.codigo.padEnd(16)} ${registro.code} · ${resultado.files} archivos`)
    } else {
      datos.assets = await subirMedio(bucket, `${workspace.code}/${registro.code}`, pieza)
      console.log(`  ✓ ${pieza.codigo.padEnd(16)} ${registro.code} · ${pieza.kind === 'VIDEO' ? 'video' : 'audio'}`)
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
