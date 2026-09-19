/**
 * Siembra los dos workspaces reales del Learning Builder: Unicafam y
 * Universidad de La Salle.
 *
 *   npx tsx scripts/seed-learning-workspaces.ts [--dry]
 *
 * No inventa nada: lee los proyectos tal como están en OneDrive.
 *
 *  · Unicafam  — el guion real de cada OVA (`guion_modelo.json` del Constructor)
 *                se convierte bloque a bloque al formato del módulo, y el
 *                inventario de la unidad sale de `1-Entregables/`.
 *  · La Salle  — los recursos salen de las ocho propuestas aprobadas
 *                (`2. Propuesta/<curso>/Contenido/01_Esquema-*.docx`): una
 *                lectura por unidad, un video por curso y los recursos de
 *                actividad de la tabla del §03.
 *
 * Las directivas gráficas salen del manual de marca de cada cliente y las
 * instruccionales de su estándar de producción documentado.
 *
 * Es idempotente: identifica el workspace por slug y el recurso por su título
 * dentro del workspace, así que se puede volver a ejecutar tras editar los
 * archivos de origen. Nunca borra recursos que ya no estén en la fuente: eso lo
 * decide una persona desde la metabiblioteca.
 */
import 'dotenv/config'
import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')
const store = await import('../api/_lib/lb-store.js')
const { sanitizeContent, newId } = await import('../src/learning/lib/blocks.js')
const { sanitizeDirectives, LB_DEFAULT_DIRECTIVES } = await import('../src/learning/lib/directives.js')
type LbBlock = import('../src/learning/lib/blocks.js').LbBlock
type LbLesson = import('../src/learning/lib/blocks.js').LbLesson
type LbContent = import('../src/learning/lib/blocks.js').LbContent
type LbDirectives = import('../src/learning/lib/directives.js').LbDirectives

const DRY = process.argv.includes('--dry')
const OWNER_EMAIL = 'andrestabla@algoritmot.com'

const ONEDRIVE = '/Users/andrestabla/Library/CloudStorage/OneDrive-ALGORITMOT/Automatizaciones'
const UNICAFAM = path.join(ONEDRIVE, 'Unicafam')
const UNISALLE = path.join(ONEDRIVE, 'Unisalle')

// ── Directivas ───────────────────────────────────────────────────────────────

/**
 * Unicafam. Paleta del manual de marca del cliente (Guia-Rise360-Unicafam) y
 * estructura real de sus guiones: la primera lección es siempre «Punto de
 * partida» y la última cierra la unidad.
 */
const UNICAFAM_DIRECTIVES: LbDirectives = sanitizeDirectives({
  ...LB_DEFAULT_DIRECTIVES,
  graphic: {
    ...LB_DEFAULT_DIRECTIVES.graphic,
    accent: '#0098EA',
    accentDark: '#002D76',
    text: '#002A42',
    muted: '#3d5568',
    headingFont: 'Montserrat, system-ui, sans-serif',
    footerText: 'Unicafam · Producción académica con Algoritmo T',
    corners: 10,
    density: 'regular',
  },
  instructional: {
    ...LB_DEFAULT_DIRECTIVES.instructional,
    lessonLabel: 'Lección',
    minLessons: 4,
    maxLessons: 10,
    sections: [
      { key: 'inicio', title: 'Punto de partida', hint: 'Caso, pregunta de entrada y objetivos del recurso.', required: true },
      { key: 'desarrollo', title: 'Desarrollo conceptual', hint: 'Una lección por subtema, con su interacción y su comprobación.', required: true },
      { key: 'cierre', title: 'Cierre', hint: 'Síntesis y transferencia al caso de la unidad.', required: true },
    ],
    rules: {
      ...LB_DEFAULT_DIRECTIVES.instructional.rules,
      // Sus guiones reparten las comprobaciones a lo largo del recurso, no una
      // por lección: la regla exige el total, que es lo que de verdad cumplen.
      minChecksPerLesson: 0,
      minChecksTotal: 4,
      maxParagraphChars: 1400,
      requireImageAlt: true,
      requireCoverSummary: true,
      requireOutcomes: true,
    },
    ai: {
      ...LB_DEFAULT_DIRECTIVES.instructional.ai,
      tone: 'Académico claro y cercano, en tercera persona. Se escribe sobre un caso de empresa que atraviesa toda la unidad.',
      readingLevel: 'Pregrado y técnico profesional',
      blocksPerLesson: 12,
      instructions:
        'Nombrar «objetivos», nunca «propósito» ni «resultados de aprendizaje». Cada lección de contenido lleva su interacción y su comprobación. Los recuadros se clasifican como APLICACIÓN AL CASO, IDEA CLAVE, PARA RECORDAR, IMPORTANTE o DATO / PARA EL MONTAJE.',
      citationStyle: 'APA 7',
    },
  },
  exports: { ...LB_DEFAULT_DIRECTIVES.exports, scormPrefix: 'OVA', completion: 'visit-all' },
})

/**
 * Universidad de La Salle. Identidad institucional del manual de marca (§2.6):
 * azul #003057 estructural y amarillo #F2A900 reservado para énfasis;
 * tipografía web Helvetica. La estructura recoge la regla de «recursos con
 * función dual» del proyecto RED: explicación y práctica en cada pieza.
 */
const UNISALLE_DIRECTIVES: LbDirectives = sanitizeDirectives({
  ...LB_DEFAULT_DIRECTIVES,
  graphic: {
    ...LB_DEFAULT_DIRECTIVES.graphic,
    accent: '#003057',
    accentDark: '#00223f',
    text: '#003057',
    muted: '#3C3C3B',
    headingFont: '"Helvetica Neue", Helvetica, Arial, Inter, sans-serif',
    bodyFont: '"Helvetica Neue", Helvetica, Arial, Inter, sans-serif',
    footerText: 'Universidad de La Salle · Dirección de E-learning (VRAC)',
    corners: 6,
    density: 'regular',
  },
  instructional: {
    ...LB_DEFAULT_DIRECTIVES.instructional,
    lessonLabel: 'Sección',
    minLessons: 3,
    maxLessons: 8,
    sections: [
      { key: 'apertura', title: 'Apertura', hint: 'Situación de entrada y qué se va a poder hacer al terminar.', required: true },
      { key: 'desarrollo', title: 'Desarrollo explicativo', hint: 'Concepto, contexto y ejemplos.', required: true },
      { key: 'practica', title: 'Práctica aplicada', hint: 'Ejercicio, reto o mini-simulación: la mitad práctica que exige la regla de función dual.', required: true },
      { key: 'cierre', title: 'Cierre', hint: 'Síntesis y enlace con la actividad entregable de la unidad.', required: false },
    ],
    rules: {
      ...LB_DEFAULT_DIRECTIVES.instructional.rules,
      minChecksPerLesson: 0,
      minChecksTotal: 2,
      maxParagraphChars: 1100,
      requireImageAlt: true,
      requireCoverSummary: true,
      requireOutcomes: true,
    },
    ai: {
      ...LB_DEFAULT_DIRECTIVES.instructional.ai,
      tone: 'Académico universitario, claro y sobrio, en tercera persona.',
      readingLevel: 'Pregrado y técnica profesional',
      blocksPerLesson: 9,
      instructions:
        'Regla de función dual: cada recurso combina desarrollo explicativo del tema (concepto, contexto, ejemplos) con una parte práctica (ejercicio, reto o mini-simulación aplicada). Nunca solo teoría ni solo práctica suelta. El recurso prepara directamente la actividad entregable de su unidad.',
      citationStyle: 'APA 7',
    },
  },
  exports: { ...LB_DEFAULT_DIRECTIVES.exports, scormPrefix: 'RED', completion: 'visit-all' },
})

// ── Unicafam: el guion real → bloques del módulo ─────────────────────────────

const NOTE_VARIANT: Record<string, string> = {
  'IDEA CLAVE': 'info',
  'PARA RECORDAR': 'info',
  IMPORTANTE: 'warning',
  'APLICACIÓN AL CASO': 'example',
  'DATO / PARA EL MONTAJE': 'success',
}

const INTERACTION_BLOCK: Record<string, string> = {
  'LÍNEA DE TIEMPO': 'timeline',
  PESTAÑAS: 'tabs',
  ACORDEÓN: 'accordion',
  TARJETAS: 'flashcards',
  PROCESO: 'process',
}

function guionToContent(guion: any, title: string): LbContent {
  const lessons: LbLesson[] = []
  const rawLessons: any[] = Array.isArray(guion?.lecciones) ? guion.lecciones : []

  rawLessons.forEach((raw, index) => {
    const blocks: LbBlock[] = []
    let listBuffer: { ordered: boolean; items: string[] } | null = null

    const flushList = () => {
      if (!listBuffer || !listBuffer.items.length) { listBuffer = null; return }
      blocks.push({
        id: newId('b'),
        type: 'list',
        variant: listBuffer.ordered ? 'numbered' : 'bulleted',
        items: listBuffer.items.map((text) => ({ id: newId('i'), title: text })),
      })
      listBuffer = null
    }

    for (const raw2 of (raw.bloques || []) as any[]) {
      const tipo = String(raw2.tipo || '')
      if (tipo !== 'item_lista') flushList()

      if (tipo === 'h2' || tipo === 'h3') {
        blocks.push({ id: newId('b'), type: 'heading', variant: tipo, text: String(raw2.texto || '') })
      } else if (tipo === 'p') {
        // `marcado` trae las negritas con la misma sintaxis que usa el editor.
        blocks.push({ id: newId('b'), type: 'paragraph', text: String(raw2.marcado || raw2.texto || '') })
      } else if (tipo === 'statement') {
        blocks.push({ id: newId('b'), type: 'statement', variant: 'b', text: String(raw2.texto || '') })
      } else if (tipo === 'instruccion') {
        blocks.push({ id: newId('b'), type: 'paragraph', text: `*${String(raw2.texto || '')}*` })
      } else if (tipo === 'callout') {
        blocks.push({
          id: newId('b'),
          type: 'note',
          variant: NOTE_VARIANT[String(raw2.clase || '')] || 'info',
          caption: String(raw2.titulo || raw2.clase || ''),
          text: String(raw2.texto || ''),
        })
      } else if (tipo === 'item_lista') {
        listBuffer ||= { ordered: raw2.orden === true, items: [] }
        listBuffer.items.push(String(raw2.texto || ''))
      } else if (tipo === 'tabla') {
        const filas: string[][] = Array.isArray(raw2.filas) ? raw2.filas : []
        const [head, ...rest] = filas
        blocks.push({
          id: newId('b'),
          type: 'table',
          text: (head || []).join(' | '),
          items: rest.map((row) => ({ id: newId('i'), title: String(row[0] ?? ''), description: String(row[1] ?? '') })),
        })
      } else if (tipo === 'pieza') {
        blocks.push({
          id: newId('b'),
          type: 'note',
          variant: 'success',
          caption: `Pieza por producir · ${String(raw2.clase || '')}`,
          text: String(raw2.titulo || ''),
        })
      } else if (tipo === 'interaccion') {
        const forma = String(raw2.forma || '')
        const kind = INTERACTION_BLOCK[forma] || 'accordion'
        const filas: string[][] = Array.isArray(raw2.filas) ? raw2.filas : []
        if (raw2.titulo) blocks.push({ id: newId('b'), type: 'heading', variant: 'h3', text: String(raw2.titulo) })
        const items = filas.map((row) =>
          kind === 'flashcards'
            ? { id: newId('i'), title: String(row[0] ?? ''), back: String(row[1] ?? '') }
            : kind === 'timeline'
            ? { id: newId('i'), date: String(row[0] ?? '').split('·')[0].trim(), title: String(row[0] ?? ''), description: String(row[1] ?? '') }
            : { id: newId('i'), title: String(row[0] ?? ''), description: String(row[1] ?? '') }
        )
        blocks.push({ id: newId('b'), type: kind as LbBlock['type'], items })
      } else if (tipo === 'comprobacion') {
        const forma = String(raw2.forma || '')
        const opciones: Array<[string, boolean]> = Array.isArray(raw2.opciones) ? raw2.opciones : []
        const filas: string[][] = Array.isArray(raw2.filas) ? raw2.filas : []
        const enunciado = String(raw2.enunciado || '')
        const feedback = String(raw2.feedback || '')

        if (/empareja/i.test(forma) && filas.length) {
          blocks.push({
            id: newId('b'), type: 'check', variant: 'matching', text: enunciado,
            items: filas.map((row) => ({ id: newId('i'), title: String(row[0] ?? ''), match: String(row[1] ?? '') })),
          })
        } else if (/completar/i.test(forma)) {
          const accepted = opciones.filter(([, ok]) => ok).map(([text]) => text)
          blocks.push({
            id: newId('b'), type: 'check', variant: 'fillin', text: enunciado,
            items: (accepted.length ? accepted : opciones.map(([t]) => t)).map((text) => ({ id: newId('i'), title: text })),
          })
        } else if (opciones.length) {
          const correct = opciones.filter(([, ok]) => ok).length
          blocks.push({
            id: newId('b'), type: 'check', variant: correct > 1 ? 'multiple' : 'choice', text: enunciado,
            items: opciones.map(([text, ok], i) => ({
              id: newId('i'), title: text, ...(ok ? { correct: true } : {}),
              ...(i === 0 && feedback ? { feedback } : {}),
            })),
          })
        }
      }
    }
    flushList()

    lessons.push({
      id: newId('l'),
      title: String(raw.titulo || `Lección ${index + 1}`),
      sectionKey: index === 0 ? 'inicio' : index === rawLessons.length - 1 ? 'cierre' : 'desarrollo',
      blocks,
    })
  })

  // Los objetivos del recurso son la lista ordenada del punto de partida.
  const outcomes: string[] = []
  for (const block of lessons[0]?.blocks || []) {
    if (block.type === 'list' && block.variant === 'numbered') {
      for (const item of block.items || []) if (item.title) outcomes.push(item.title)
      break
    }
  }
  const firstParagraph = lessons[0]?.blocks.find((b) => b.type === 'paragraph')?.text || ''

  return sanitizeContent(
    {
      cover: {
        kicker: 'Gerencia y desarrollo del talento humano',
        title,
        summary: firstParagraph.replace(/\*\*/g, '').slice(0, 1200),
        outcomes: outcomes.slice(0, 8),
      },
      lessons,
    },
    UNICAFAM_DIRECTIVES
  )
}

type SeedResource = {
  kind: string
  title: string
  subtitle?: string
  course?: string
  unit?: string
  tags: string[]
  status?: string
  content?: LbContent
}

function unicafamResources(): SeedResource[] {
  const course = 'Gerencia y desarrollo del talento humano'
  const talleres = path.join(UNICAFAM, 'Entrega/2-Constructor/Cursos', course, 'Talleres')
  const out: SeedResource[] = []

  // Los dos OVA con su guion real, convertido bloque a bloque.
  const ovas: Array<{ folder: string; title: string; unit: string }> = [
    {
      folder: 'OVA-Rise-Contexto-organizacional-ambiental-talento-humano',
      title: 'OVA · Contexto organizacional y ambiental del talento humano',
      unit: 'Módulo 1',
    },
    {
      folder: 'OVA-Rise-Clima-cultura-organizacional',
      title: 'OVA · Clima y cultura organizacional',
      unit: 'Módulo 2',
    },
  ]
  for (const ova of ovas) {
    const file = path.join(talleres, ova.folder, 'Editables/01-curso/guion_modelo.json')
    if (!fs.existsSync(file)) { console.warn(`  ⚠ sin guion: ${ova.title}`); continue }
    const guion = JSON.parse(fs.readFileSync(file, 'utf8'))
    out.push({
      kind: 'OVA', title: ova.title, course, unit: ova.unit,
      tags: ['rise', 'scorm'], status: 'PUBLISHED',
      content: guionToContent(guion, ova.title.replace(/^OVA · /, '')),
    })
  }

  // El resto del inventario publicado de la unidad (1-Entregables).
  const lecturas: Array<[string, string]> = [
    ['Lectura · Habilidades directivas en el entorno digital', 'Módulo 1'],
    ['Lectura · Tendencias y entorno del talento humano', 'Módulo 1'],
    ['Lectura · Plan de desarrollo de recursos humanos', 'Módulo 1'],
    ['Lectura · Gestión de la compensación laboral', 'Módulo 2'],
    ['Lectura · Gestión por competencias', 'Módulo 2'],
    ['Lectura · Gestión del desempeño del talento humano', 'Módulo 2'],
  ]
  for (const [title, unit] of lecturas) {
    out.push({ kind: 'LECTURA', title, course, unit, tags: ['pdf', 'html'], status: 'PUBLISHED' })
  }

  const talleresPub: Array<[string, string, string]> = [
    ['Actividad 1 · Activación', 'Unidad', 'scorm'],
    ['Actividad 2 · Reconocimiento', 'Unidad', 'scorm'],
    ['Actividad 6 · Reconocimiento', 'Módulo 2', 'scorm'],
    ['Cierre de la unidad', 'Unidad', 'scorm'],
  ]
  for (const [title, unit, tag] of talleresPub) {
    out.push({ kind: 'LECTURA', title, course, unit, tags: [tag, 'actividad'], status: 'PUBLISHED' })
  }

  out.push({
    kind: 'VIDEO', title: 'Video de presentación de la unidad', course, unit: 'Unidad',
    tags: ['mp4'], status: 'PUBLISHED',
  })
  for (const [title, unit] of [
    ['Caso · NexoPack S.A.S.', 'Unidad'],
    ['Anexo A · Cultura organizacional de NexoPack', 'Unidad'],
    ['Anexo B · Cargos clave, desempeño y evidencias', 'Unidad'],
  ] as Array<[string, string]>) {
    out.push({ kind: 'LECTURA', title, course, unit, tags: ['documento', 'caso'], status: 'PUBLISHED' })
  }

  return out
}

// ── La Salle: las ocho propuestas aprobadas → recursos ───────────────────────

/** Tipo declarado en la propuesta → tipo de recurso del módulo. */
function kindFromTipo(tipo: string): string {
  const t = tipo.toLowerCase()
  if (t.includes('video')) return 'VIDEO'
  if (t.includes('pódcast') || t.includes('podcast')) return 'PODCAST'
  return 'INTERACTIVE'
}

async function unisalleResources(): Promise<SeedResource[]> {
  const mammoth: any = (await import('mammoth')).default ?? (await import('mammoth'))
  const base = path.join(UNISALLE, '2. Propuesta')
  const strip = (html: string) =>
    html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

  const out: SeedResource[] = []
  const courses = fs.readdirSync(base).filter((d) => !d.startsWith('.') && fs.statSync(path.join(base, d)).isDirectory())

  for (const course of courses.sort()) {
    const file = path.join(base, course, 'Contenido', '01_Esquema-instruccional-y-propuesta-de-recursos.docx')
    if (!fs.existsSync(file)) { console.warn(`  ⚠ sin propuesta: ${course}`); continue }

    const html: string = (await mammoth.convertToHtml({ path: file })).value
    const tables = [...html.matchAll(/<table>([\s\S]*?)<\/table>/g)].map((m) =>
      [...m[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((r) =>
        [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => strip(c[1]))
      )
    )

    // Unidades del esquema instruccional (§02).
    const unitsTable = tables.find((rows) => /unidad/i.test(rows[0]?.[0] || '') && /aprendizaje/i.test(rows[0]?.[1] || ''))
    const units = (unitsTable?.slice(1) || [])
      .map((row) => row[0])
      .filter((u) => u && /^U\d/i.test(u))

    // Una lectura interactiva por unidad + un video de presentación por curso.
    for (const unit of units) {
      out.push({
        kind: 'LECTURA',
        title: `Lectura · ${unit}`,
        subtitle: `Lectura interactiva de la unidad ${unit} de ${course}.`,
        course, unit, tags: ['red', 'lectura'], status: 'DRAFT',
      })
    }
    out.push({
      kind: 'VIDEO',
      title: `Video de presentación · ${course}`,
      subtitle: 'Video de presentación del espacio académico.',
      course, unit: 'Curso', tags: ['red', 'video'], status: 'DRAFT',
    })

    // Recursos de actividad (§03).
    const resourcesTable = tables.find(
      (rows) => /unidad/i.test(rows[0]?.[0] || '') && /recurso/i.test(rows[0]?.[1] || '') && /tipo/i.test(rows[0]?.[2] || '')
    )
    for (const row of resourcesTable?.slice(1) || []) {
      const [unit, title, tipo, aporte] = row
      if (!title || !/^U\d/i.test(unit || '')) continue
      out.push({
        kind: kindFromTipo(tipo || ''),
        title,
        subtitle: [tipo, aporte].filter(Boolean).join(' — ').slice(0, 300),
        course, unit, tags: ['red', 'actividad'], status: 'DRAFT',
      })
    }
  }
  return out
}

// ── Siembra ──────────────────────────────────────────────────────────────────

async function upsertWorkspace(name: string, slug: string, directives: LbDirectives, notes: string, ownerId: string) {
  const existing = await store.lbWorkspaces().findUnique({ where: { slug } })
  if (DRY) return existing || { id: `dry-${slug}`, name }

  const workspace = existing
    ? await store.lbWorkspaces().update({ where: { slug }, data: { name, directives: directives as any, notes } })
    : await store.lbWorkspaces().create({ data: { name, slug, kind: 'EDUCATIVA', notes, directives: directives as any } })

  const member = await store.lbMembers().findUnique({ where: { workspaceId_userId: { workspaceId: workspace.id, userId: ownerId } } })
  if (!member) await store.lbMembers().create({ data: { workspaceId: workspace.id, userId: ownerId, role: 'MANAGER' } })
  return workspace
}

async function upsertResource(workspaceId: string, ownerId: string, seed: SeedResource, directives: LbDirectives) {
  const existing = await store.lbResources().findFirst({ where: { workspaceId, title: seed.title } })
  const content = seed.content ?? (existing ? undefined : sanitizeContent({ cover: { title: seed.title } }, directives))
  if (DRY) return existing ? 'igual' : 'nuevo'

  if (existing) {
    await store.lbResources().update({
      where: { id: existing.id },
      data: {
        kind: seed.kind, subtitle: seed.subtitle || null, course: seed.course || null,
        unit: seed.unit || null, tags: seed.tags,
        ...(seed.content ? { content: seed.content as any } : {}),
      },
    })
    return 'actualizado'
  }
  await store.lbResources().create({
    data: {
      publicId: store.newPublicId(), workspaceId, ownerId, kind: seed.kind,
      title: seed.title, subtitle: seed.subtitle || null, course: seed.course || null,
      unit: seed.unit || null, tags: seed.tags, status: seed.status || 'DRAFT',
      content: (content || {}) as any,
      ...(seed.status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
    },
  })
  return 'nuevo'
}

for (const dir of [UNICAFAM, UNISALLE]) {
  if (!fs.existsSync(dir)) {
    console.error(`No encuentro el proyecto en ${dir}. ¿Se movió la carpeta de OneDrive?`)
    process.exit(1)
  }
}

const owner = await prisma.adminUser.findFirst({
  where: { OR: [{ email: OWNER_EMAIL }, { username: 'andrestabla' }] },
  select: { id: true, displayName: true, email: true, role: true },
})
if (!owner) {
  console.error(`No encuentro al usuario ${OWNER_EMAIL} en AdminUser.`)
  process.exit(1)
}
console.log(`Propietario: ${owner.displayName} (${owner.email}) · ${owner.role}${DRY ? ' · SIMULACIÓN' : ''}\n`)

const plan: Array<{ name: string; slug: string; directives: LbDirectives; notes: string; resources: SeedResource[] }> = [
  {
    name: 'Unicafam',
    slug: 'unicafam',
    directives: UNICAFAM_DIRECTIVES,
    notes: 'Fundación Universitaria Cafam. Producción de unidades con OVA tipo Rise, lecturas y actividades SCORM 1.2. Origen: OneDrive/Automatizaciones/Unicafam.',
    resources: unicafamResources(),
  },
  {
    name: 'Universidad de La Salle',
    slug: 'unisalle',
    directives: UNISALLE_DIRECTIVES,
    notes: 'Dirección de E-learning (VRAC). Proyecto RED: 8 asignaturas, 67 recursos educativos digitales. Origen: OneDrive/Automatizaciones/Unisalle.',
    resources: await unisalleResources(),
  },
]

for (const entry of plan) {
  console.log(`═══ ${entry.name} · ${entry.resources.length} recursos desde la fuente`)
  const workspace = await upsertWorkspace(entry.name, entry.slug, entry.directives, entry.notes, owner.id)

  const tally: Record<string, number> = {}
  const byKind: Record<string, number> = {}
  for (const seed of entry.resources) {
    const result = await upsertResource(workspace.id, owner.id, seed, entry.directives)
    tally[result] = (tally[result] || 0) + 1
    byKind[seed.kind] = (byKind[seed.kind] || 0) + 1
  }
  const blocks = entry.resources.reduce(
    (total, seed) => total + (seed.content?.lessons || []).reduce((n, lesson) => n + lesson.blocks.length, 0),
    0
  )
  console.log(`    por tipo: ${Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(' · ')}`)
  console.log(`    resultado: ${Object.entries(tally).map(([k, n]) => `${k} ${n}`).join(' · ')}`)
  if (blocks) console.log(`    bloques de contenido real importados: ${blocks}`)
}

if (!DRY) {
  const totals = {
    workspaces: await store.lbWorkspaces().count(),
    recursos: await store.lbResources().count(),
    miembros: await store.lbMembers().count(),
  }
  console.log(`\nEn la base: ${JSON.stringify(totals)}`)
}

await prisma.$disconnect()
