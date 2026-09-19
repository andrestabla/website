/**
 * Compone una pieza real de cada formato nuevo del Learning Builder.
 *
 *   npx tsx scripts/seed-learning-formats.ts
 *
 * Los tres salen del mismo curso —Educación y Neurociencia, de La Salle— y de
 * sus documentos reales de trabajo:
 *
 *   VIDEO   · UNISALLE-VID-004 ← guion de Etapa 3 `EN_RED1_VID.docx`, con sus
 *             cuatro escenas, sus tiempos y su locución literal.
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

// ── VIDEO · el guion de Etapa 3, escena por escena ──────────────────────────

const VIDEO = {
  cover: {
    kicker: 'Educación y Neurociencia · RED C-01',
    title: 'Video de presentación del curso',
    subtitle: 'Pieza única de apertura y cierre · voz en off y motion graphics, sin presentador',
    summary:
      'Presenta el espacio académico en menos de noventa segundos: anticipa las tres preguntas que estructuran el curso y el método del portafolio pedagógico digital, para que el estudiante llegue a la Unidad 1 sabiendo qué va a construir y cómo se evalúa.',
    outcomes: [
      'Reconocer las tres preguntas que orientan el curso, una por unidad.',
      'Identificar el portafolio pedagógico digital como método de evaluación, en cuatro entregas del veinte por ciento.',
    ],
  },
  shots: [
    {
      id: newLbId('p'),
      title: 'Carátula',
      kind: 'title' as const,
      seconds: 12,
      visual:
        'Noche neuronal #061C26. Una red de nodos tenue; un impulso azul cielo la recorre y, al tocar el nodo central, salta el destello amarillo. Sobre él, la carátula.',
      onScreen: 'ESPACIO ACADÉMICO · EDUCACIÓN Y NEUROCIENCIA',
      narration:
        '¿Qué pasa en el cerebro cuando alguien aprende? Este curso te invita a mirar el aprendizaje desde adentro: desde las conexiones que lo hacen posible.',
      notes: 'Sin presentador en cámara. Cierra dos segundos después de terminar la locución.',
    },
    {
      id: newLbId('p'),
      title: 'Las tres preguntas',
      kind: 'animation' as const,
      seconds: 20,
      visual:
        'Tres nodos se encienden en secuencia sobre la red, cada uno con el color de su unidad: azul cielo (U1), bosque (U2), lima (U3). Los enlaces entre ellos se dibujan al nombrarlos.',
      onScreen:
        'U1 · ¿Cómo ayuda conocer el cerebro? · U2 · ¿Neurociencia y aprendizaje? · U3 · ¿Neurodidáctica y enseñanza?',
      narration:
        'Tres preguntas orientan este recorrido: cómo el conocimiento del cerebro contribuye a comprender el aprendizaje, qué relación existe entre neurociencia y aprendizaje, y de qué manera la neurodidáctica puede enriquecer las prácticas de enseñanza.',
    },
    {
      id: newLbId('p'),
      title: 'El método: un portafolio que se construye',
      kind: 'animation' as const,
      seconds: 23,
      visual:
        'Cuatro nodos en línea se conectan uno a uno hasta formar una red consolidada en bosque: concepto y reflexión → análisis de caso → diseño de estrategia → versión final. Debajo, la línea de 8 semanas con 5 encuentros.',
      onScreen: 'TU PORTAFOLIO PEDAGÓGICO · 4 entregas · 20 % cada una · 8 semanas · 5 encuentros · Evaluación final',
      narration:
        'A lo largo del curso construirás un portafolio pedagógico digital en cuatro entregas: partirás del concepto, analizarás un caso, diseñarás una estrategia y cerrarás con la versión final. Cada entrega vale el veinte por ciento, y una evaluación final completa la nota.',
    },
    {
      id: newLbId('p'),
      title: 'Cierre y cortinilla',
      kind: 'outro' as const,
      seconds: 15,
      visual:
        'La red completa del curso, ya consolidada, respira sobre la noche neuronal; el destello amarillo recorre los tres nodos-unidad y se funde con la cortinilla institucional.',
      onScreen: 'Empieza por la unidad 1 · Tu portafolio te espera',
      narration:
        'Cada unidad suma una conexión a tu portafolio. Empecemos: tu primera entrega comienza en la unidad 1.',
      notes: 'Cortinilla institucional del proyecto, versión sin zoom.',
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

const video = await upsert('VIDEO', 'Video de presentación · Educación y Neurociencia', {
  course: 'Educación y Neurociencia',
  unit: 'Curso',
  subtitle: 'RED C-01 · pieza única de apertura y cierre',
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
