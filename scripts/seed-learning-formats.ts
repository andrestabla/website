/**
 * Compone una pieza real de cada formato nuevo del Learning Builder.
 *
 *   npx tsx scripts/seed-learning-formats.ts
 *
 * Los tres salen de cursos reales de La Salle y de sus documentos de trabajo:
 *
 *   VIDEO   · UNISALLE-VID-011 ← guion de Etapa 3 `MD_RED1_VID.docx`, con sus
 *             seis escenas, sus tiempos y su locución literal. Es el que
 *             conserva su pieza final: el MP4 que se entregó.
 *   ROUTE   · la ruta del curso ← esquema instruccional de Etapa 1, con sus
 *             tres unidades, sus entregas del portafolio y los códigos de los
 *             recursos que ya existen en la metabiblioteca.
 *   PODCAST · un episodio escrito a partir del contenido del curso. No hay
 *             pódcast en el proyecto de La Salle —sus 67 recursos son video,
 *             lectura y actividad—, así que este es contenido nuevo sobre
 *             material real, no la transcripción de algo ya grabado.
 *
 * Es idempotente: vuelve a escribir lo mismo si se ejecuta de nuevo.
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
const { resourceCodeFor, takenResourceCodes } = await import('../api/_lib/lb-codes.js')
const { sanitizeDirectives } = await import('../src/learning/lib/directives.js')
const { contentStats, sanitizeResourceContent, validateResourceContent } = await import('../src/learning/lib/content.js')
const { newLbId, clock } = await import('../src/learning/lib/common.js')
const { videoSeconds } = await import('../src/learning/lib/video.js')
const { podcastSeconds } = await import('../src/learning/lib/podcast.js')
const { routeHours, routeCoverage } = await import('../src/learning/lib/route.js')

const workspace = await store.lbWorkspaces().findUnique({ where: { code: 'UNISALLE' } })
if (!workspace) {
  console.error('No existe el workspace UNISALLE.')
  await prisma.$disconnect()
  process.exit(1)
}
const directives = sanitizeDirectives(workspace.directives)
const owner = await (prisma as any).adminUser.findFirst({ where: { role: 'SUPERADMIN' }, select: { id: true } })

// ── VIDEO · el guion de Etapa 3, escena por escena ─────────────────────────

const VIDEO = {
  cover: {
    kicker: 'Misterio de Dios · RED C-01',
    title: 'Video de presentación del curso',
    subtitle: 'Voz en off y motion graphics sobre el sistema visual del vitral',
    summary:
      'Un minuto y veintidós segundos para plantear la pregunta que abre el espacio académico, nombrar sus tres unidades y decir cómo se trabaja: ocho semanas y cinco encuentros.',
    outcomes: [
      'Reconocer la pregunta que estructura el espacio académico.',
      'Identificar las tres unidades y el ritmo de trabajo del curso.',
    ],
  },
  shots: [
    {
      id: newLbId('p'),
      title: 'La pregunta',
      kind: 'title' as const,
      seconds: 13,
      visual:
        'Cielo estrellado y horizonte abierto, en plano lento. Sobre la imagen entra el haz de luz amarillo en diagonal, que es el gesto del sistema visual, y con él el título del espacio académico.',
      onScreen: 'ESPACIO ACADÉMICO · MISTERIO DE DIOS',
      narration:
        'Hay preguntas que no se responden de inmediato, pero cambian la manera de ver la vida. ¿Quién es realmente Dios?',
      notes: 'Nada más en pantalla: sin dependencia, sin autor y sin palabra clave.',
    },
    {
      id: newLbId('p'),
      title: 'Misterio, no problema',
      kind: 'animation' as const,
      seconds: 18,
      visual:
        'Los plomos de un vitral se trazan uno a uno sobre el fondo oscuro; al nombrarse «contemplar», la luz entra por detrás y enciende los vidrios. La composición no se cierra: queda un panel abierto.',
      onScreen: 'Misterio, no problema · dar razón al creyente y al que no cree',
      narration:
        'Este espacio te pide contemplar un misterio, y dar razón de él: al creyente y al que no cree.',
      notes: '«Misterio» compuesto en amarillo institucional; la segunda línea en serifa, sin atribución.',
    },
    {
      id: newLbId('p'),
      title: 'Tres ventanas',
      kind: 'animation' as const,
      seconds: 22,
      visual:
        'Tres ventanas de arco de medio punto se abren en secuencia, cada una con su vidrio. La luz las atraviesa en el orden en que la voz las nombra.',
      onScreen: 'UNIDAD 1 · Experiencia — UNIDAD 2 · Doctrina e historia — UNIDAD 3 · Educación y contexto',
      narration:
        'Lo harás en tres momentos. La experiencia: cómo el ser humano se abre a lo divino. La historia: fe y razón, mística y diálogo. Y el aula: enseñar lo sagrado en la diversidad.',
    },
    {
      id: newLbId('p'),
      title: 'Cómo se trabaja',
      kind: 'animation' as const,
      seconds: 12,
      visual:
        'El camino con hitos del sistema recorre ocho tramos; cinco marcas de encuentro se encienden en amarillo a su paso.',
      onScreen: 'Video · Mapa · Foro · Pódcast · Diario — 8 semanas — 5 encuentros',
      narration:
        'Desarrollarás diferentes actividades durante ocho semanas y tendrás cinco encuentros con tu docente.',
    },
    {
      id: newLbId('p'),
      title: 'La mirada abierta',
      kind: 'outro' as const,
      seconds: 11,
      visual:
        'El vitral de la escena 2 vuelve completo salvo por el panel que quedó abierto, y por ahí sigue entrando la luz. La imagen se aquieta.',
      onScreen: 'La mirada abierta · Primer encuentro · Semana 1',
      narration:
        'Al final, tendrás una mirada más abierta para preguntarte por lo divino, por lo humano y por las formas en que esas preguntas atraviesan la vida. Nos vemos en el primer encuentro.',
    },
    {
      id: newLbId('p'),
      title: 'Cortinilla de cierre',
      kind: 'outro' as const,
      seconds: 6,
      visual:
        'Cortinilla estándar de la librería del proyecto con el logotipo institucional animado, empalmada con crossfade de 0,6 s.',
      notes: 'Sin locución. La música de fondo la cubre y cierra con desvanecimiento.',
    },
  ],
}

// ── RUTA · el esquema instruccional de Etapa 1 ──────────────────────────────

const ROUTE = {
  cover: {
    kicker: 'FCE · Licenciatura en Educación Religiosa y en Ciencias Naturales',
    title: 'Educación y Neurociencia',
    subtitle: '3 créditos · 3 unidades · 8 semanas · 5 encuentros virtuales',
    summary:
      'El curso construye progresivamente un portafolio pedagógico digital en cuatro entregas —concepto y reflexión, análisis de caso, diseño de estrategia y versión final—, avanzando de los fundamentos neurocientíficos hacia su aplicación didáctica concreta en el aula.',
    outcomes: [
      'Analizar los fundamentos neurocientíficos del aprendizaje y su impacto en la enseñanza.',
      'Aplicar principios neuroeducativos en el diseño de estrategias didácticas.',
      'Sostener una actitud de actualización permanente sobre neurociencia y educación.',
    ],
  },
  competencies: [
    'Explica los procesos cognitivos, emocionales y sociales del aprendizaje desde su base neurocientífica.',
    'Diseña estrategias didácticas que favorecen la atención, la memoria y la motivación.',
    'Respeta la diversidad de estilos de aprendizaje al planear su enseñanza.',
  ],
  audience:
    'Estudiantes de la Licenciatura en Educación Religiosa y de la Licenciatura en Ciencias Naturales y Educación Ambiental, Facultad de Ciencias de la Educación.',
  prerequisites: 'Ninguno. El curso parte de los fundamentos y no supone formación previa en neurociencia.',
  assessment:
    'Cinco actividades calificables del veinte por ciento cada una: las cuatro entregas del portafolio pedagógico digital (semanas 2, 4, 5 y 7) y la evaluación final acumulativa (semana 8).',
  modules: [
    {
      id: newLbId('m'),
      title: 'U1 · ¿Cómo puede el conocimiento sobre el cerebro ayudarnos a comprender el aprendizaje?',
      weeks: 2,
      summary: 'Neurociencia, estructura cerebral, neuronas, sinapsis y plasticidad.',
      outcome:
        'Analizar los fundamentos neurocientíficos del aprendizaje, identificando las funciones del cerebro en los procesos cognitivos, emocionales y sociales, y su impacto en la enseñanza.',
      activities: [
        {
          id: newLbId('a'), title: 'Video de presentación del curso', kind: 'VIDEO' as const,
          mode: 'autonomo' as const, hours: 1,
          description: 'Anticipa las tres preguntas del curso y el método del portafolio.',
          resourceCode: 'UNISALLE-VID-004',
        },
        {
          id: newLbId('a'), title: 'Lectura de la Unidad 1', kind: 'LECTURA' as const,
          mode: 'autonomo' as const, hours: 4,
          description: 'Fundamentos neurocientíficos del aprendizaje.',
          resourceCode: 'UNISALLE-LEC-007',
        },
        {
          id: newLbId('a'), title: 'Explorador del cerebro que aprende', kind: 'INTERACTIVE' as const,
          mode: 'autonomo' as const, hours: 2,
          description:
            'Infografía interactiva con práctica de identificación de estructuras cerebrales.',
          evidence: 'Ejercicio de identificación completado.',
          resourceCode: 'UNISALLE-INT-011',
        },
        {
          id: newLbId('a'), title: 'A1 · Portafolio: concepto y reflexión', kind: 'EVALUACION' as const,
          mode: 'autonomo' as const, hours: 6,
          description: 'Primera entrega del portafolio, semana 2. Vale el 20 %.',
          evidence: 'Mapa conceptual y reflexión inicial.',
        },
        {
          id: newLbId('a'), title: 'Encuentro virtual 1 · metodología del curso', kind: 'ENCUENTRO' as const,
          mode: 'sincronico' as const, hours: 2,
        },
      ],
    },
    {
      id: newLbId('m'),
      title: 'U2 · ¿Cuál es la relación entre neurociencia y aprendizaje?',
      weeks: 3,
      summary: 'Dimensión social del aprendizaje, funciones ejecutivas y dispositivos básicos.',
      outcome:
        'Aplicar principios neuroeducativos en el diseño de estrategias didácticas que favorezcan la atención, la memoria, la motivación y el aprendizaje significativo.',
      activities: [
        {
          id: newLbId('a'), title: 'Lectura de la Unidad 2', kind: 'LECTURA' as const,
          mode: 'autonomo' as const, hours: 4,
          resourceCode: 'UNISALLE-LEC-008',
        },
        {
          id: newLbId('a'), title: 'Laboratorio de la dimensión social del aprendizaje', kind: 'VIDEO' as const,
          mode: 'autonomo' as const, hours: 2,
          description: 'Video interactivo con un alto para practicar el análisis de un caso breve.',
          evidence: 'Checkpoint del caso resuelto.',
          resourceCode: 'UNISALLE-VID-005',
        },
        {
          id: newLbId('a'), title: 'A2 · Portafolio: análisis de caso', kind: 'EVALUACION' as const,
          mode: 'autonomo' as const, hours: 6,
          description: 'Segunda entrega, semana 4. Vale el 20 %.',
          evidence: 'Análisis de caso escrito.',
        },
        {
          id: newLbId('a'), title: 'Diseñador de estrategias desde las funciones ejecutivas',
          kind: 'INTERACTIVE' as const, mode: 'autonomo' as const, hours: 3,
          description: 'Simulador que modela cómo traducir las funciones ejecutivas en estrategias.',
          evidence: 'Mini-estrategia armada en el simulador.',
          resourceCode: 'UNISALLE-INT-012',
        },
        {
          id: newLbId('a'), title: 'A3 · Portafolio: diseño de estrategia pedagógica', kind: 'EVALUACION' as const,
          mode: 'autonomo' as const, hours: 6,
          description: 'Tercera entrega, semana 5. Vale el 20 %.',
          evidence: 'Estrategia didáctica diseñada.',
        },
        {
          id: newLbId('a'), title: 'Encuentros virtuales 2 y 3', kind: 'ENCUENTRO' as const,
          mode: 'sincronico' as const, hours: 4,
        },
      ],
    },
    {
      id: newLbId('m'),
      title: 'U3 · ¿Cuál es la relación entre neurodidáctica y enseñanza?',
      weeks: 3,
      summary: 'Neurodidáctica y estrategias de atención y memoria; diversidad de estilos de aprendizaje.',
      outcome:
        'Fomentar una actitud de apertura y actualización permanente sobre neurociencia y educación, con una enseñanza basada en los procesos cognitivos y el respeto por la diversidad.',
      activities: [
        {
          id: newLbId('a'), title: 'Lectura de la Unidad 3', kind: 'LECTURA' as const,
          mode: 'autonomo' as const, hours: 4,
          resourceCode: 'UNISALLE-LEC-009',
        },
        {
          id: newLbId('a'), title: 'Caja de herramientas de neurodidáctica', kind: 'INTERACTIVE' as const,
          mode: 'autonomo' as const, hours: 3,
          description: 'Recorrido guiado que cierra aplicando una técnica a un escenario de aula propio.',
          evidence: 'Técnica aplicada a un escenario propio.',
          resourceCode: 'UNISALLE-INT-013',
        },
        {
          id: newLbId('a'), title: 'A4 · Portafolio: versión final', kind: 'EVALUACION' as const,
          mode: 'autonomo' as const, hours: 8,
          description: 'Cuarta entrega, semana 7. Vale el 20 %.',
          evidence: 'Portafolio pedagógico digital completo.',
        },
        {
          id: newLbId('a'), title: 'A5 · Evaluación final', kind: 'EVALUACION' as const,
          mode: 'autonomo' as const, hours: 2,
          description: 'Cuestionario acumulativo de cierre, semana 8. Vale el 20 %.',
          evidence: 'Cuestionario resuelto.',
        },
        {
          id: newLbId('a'), title: 'Encuentros virtuales 4 y 5', kind: 'ENCUENTRO' as const,
          mode: 'sincronico' as const, hours: 4,
        },
      ],
    },
  ],
}

// ── PÓDCAST · episodio sobre el contenido del curso ─────────────────────────

const CONDUCE = newLbId('v')
const EXPERTA = newLbId('v')

const PODCAST = {
  cover: {
    kicker: 'Educación y Neurociencia · Episodio 1',
    title: 'Las funciones ejecutivas no se piden: se enseñan',
    subtitle: 'Conversación sobre la Unidad 2 del curso',
    summary:
      'Doce minutos sobre memoria de trabajo, control inhibitorio y flexibilidad cognitiva, y sobre por qué pedirle a un grupo que «se concentre» no es una estrategia didáctica. Acompaña la tercera entrega del portafolio.',
    outcomes: [
      'Distinguir las tres funciones ejecutivas y su papel en el aula.',
      'Traducir una de ellas en una decisión concreta de planeación.',
    ],
  },
  speakers: [
    { id: CONDUCE, name: 'Conducción', role: 'Presenta el tema y guía la conversación.' },
    { id: EXPERTA, name: 'Voz experta', role: 'Aporta el criterio disciplinar del curso.' },
  ],
  cues: [
    {
      id: newLbId('c'), part: 'intro' as const, speakerId: CONDUCE, title: 'Entrada',
      text: 'Bienvenidos al pódcast de **Educación y Neurociencia**. Hoy entramos en la Unidad 2, y en particular en tres palabras que aparecen en toda la bibliografía y casi nunca en la planeación de clase: memoria de trabajo, control inhibitorio y flexibilidad cognitiva.',
    },
    {
      id: newLbId('c'), part: 'question' as const, speakerId: CONDUCE,
      text: 'Empecemos por lo básico. ¿Qué son las funciones ejecutivas y por qué importan en un aula?',
    },
    {
      id: newLbId('c'), part: 'dialogue' as const, speakerId: EXPERTA,
      text: 'Son el conjunto de procesos que permiten sostener una meta y organizar la conducta hacia ella. La memoria de trabajo mantiene información disponible mientras se opera con ella; el control inhibitorio frena la respuesta automática; la flexibilidad cognitiva permite cambiar de estrategia cuando la primera no funciona.\n\nImportan porque casi todo lo que pedimos en clase las exige a la vez, y rara vez las enseñamos.',
    },
    {
      id: newLbId('c'), part: 'insight' as const, speakerId: EXPERTA, title: 'La idea clave',
      text: 'Cuando un docente dice «concéntrense», está nombrando un resultado, no dando una instrucción. Nadie se concentra por decreto. Lo que sí se puede hacer es reducir lo que compite por la atención y dar a la tarea una estructura que la memoria de trabajo pueda sostener.',
    },
    {
      id: newLbId('c'), part: 'question' as const, speakerId: CONDUCE,
      text: 'Dame un ejemplo de cómo se ve eso en una consigna real.',
    },
    {
      id: newLbId('c'), part: 'dialogue' as const, speakerId: EXPERTA,
      text: 'Una consigna de seis pasos leída en voz alta obliga a sostener seis elementos mientras se empieza el primero. Si esos pasos están escritos y visibles, la memoria de trabajo queda libre para el contenido.\n\nNo es una cuestión de comodidad: es la diferencia entre gastar capacidad en recordar la tarea o en resolverla.',
    },
    {
      id: newLbId('c'), part: 'dialogue' as const, speakerId: EXPERTA,
      text: 'Con el control inhibitorio pasa algo parecido. El error frecuente es castigar la respuesta impulsiva. Lo que la evidencia sugiere es dar un intervalo corto antes de responder —treinta segundos de escritura individual antes de abrir la discusión— y el mismo grupo responde distinto.',
    },
    {
      id: newLbId('c'), part: 'outro' as const, speakerId: CONDUCE, title: 'Cierre',
      text: 'Para la tercera entrega del portafolio, elige una función ejecutiva y una sola decisión de planeación que la favorezca. Una decisión, escrita y justificada, vale más que un catálogo de buenas intenciones. Nos escuchamos en la Unidad 3.',
    },
  ],
}

// ── Escritura ───────────────────────────────────────────────────────────────

async function upsert(kind: string, title: string, extra: Record<string, unknown>, content: unknown) {
  let resource = await store.lbResources().findFirst({ where: { workspaceId: workspace.id, kind, title } })
  if (!resource) {
    resource = await store.lbResources().create({
      data: {
        publicId: store.newPublicId(),
        code: resourceCodeFor(workspace.code, kind, await takenResourceCodes(store.lbResources(), workspace.id)),
        workspaceId: workspace.id,
        ownerId: owner?.id || '',
        kind,
        title,
        ...extra,
        content: {},
      },
    })
  }
  const clean = sanitizeResourceContent(kind, content, directives)
  const before = resource.content
  if (before && Object.keys(before).length > 1) {
    await store.snapshot(resource.id, before, 'import', owner?.id, 'Antes de componer el guion')
  }
  await store.lbResources().update({
    where: { id: resource.id },
    data: { content: clean as any, status: 'PUBLISHED', publishedAt: resource.publishedAt || new Date() },
  })
  const issues = validateResourceContent(kind, clean, directives)
  return { resource, content: clean, issues }
}

const video = await upsert('VIDEO', 'Video de presentación · Misterio de Dios', {
  course: 'Misterio de Dios',
  unit: 'Curso',
  subtitle: 'RED C-01 · voz en off y motion graphics',
  tags: ['video', 'presentación', 'C-01'],
}, VIDEO)

const route = await upsert('ROUTE', 'Ruta del curso · Educación y Neurociencia', {
  course: 'Educación y Neurociencia',
  subtitle: 'Esquema instruccional de la Etapa 1, con sus recursos',
  tags: ['ruta', 'etapa 1', 'esquema instruccional'],
}, ROUTE)

const podcast = await upsert('PODCAST', 'Las funciones ejecutivas no se piden: se enseñan', {
  course: 'Educación y Neurociencia',
  unit: 'U2',
  subtitle: 'Pódcast · acompaña la tercera entrega del portafolio',
  tags: ['pódcast', 'U2', 'funciones ejecutivas'],
}, PODCAST)

const line = (label: string, row: { resource: any; content: any; issues: any[] }, detail: string) => {
  const errors = row.issues.filter((i) => i.level === 'error').length
  const warnings = row.issues.filter((i) => i.level === 'warning').length
  console.log(`${row.resource.code.padEnd(20)} ${label.padEnd(9)} ${detail}`)
  console.log(`${''.padEnd(20)} ${''.padEnd(9)} ${JSON.stringify(contentStats(row.resource.kind, row.content))} · ${errors} error(es), ${warnings} advertencia(s)`)
  for (const issue of row.issues.slice(0, 3)) console.log(`${''.padEnd(30)} ${issue.level}: ${issue.message}`)
  console.log(`${''.padEnd(30)} enlace: /ova/${row.resource.publicId}`)
}

console.log('')
line('VIDEO', video, `${video.content.shots.length} planos · ${clock(videoSeconds(video.content as any))}`)
line('RUTA', route, `${route.content.modules.length} módulos · ${routeHours(route.content as any)} h · ${routeCoverage(route.content as any).linked}/${routeCoverage(route.content as any).total} producidos`)
line('PÓDCAST', podcast, `${podcast.content.cues.length} intervenciones · ${clock(podcastSeconds(podcast.content as any))} estimados`)

await prisma.$disconnect()
