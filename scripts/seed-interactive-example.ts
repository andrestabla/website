/**
 * Compone la presentación interactiva de ejemplo con contenido real.
 *
 *   npx tsx scripts/seed-interactive-example.ts
 *
 * Toma un recurso de tipo INTERACTIVE ya inventariado en el workspace de La
 * Salle —«Explorador del cerebro que aprende», de Educación y Neurociencia— y
 * le arma sus escenas a partir del guion real del proyecto. Sirve para tener
 * una pieza de cada tipo que se pueda ver, editar, exportar y publicar.
 *
 * Es idempotente: vuelve a escribir las mismas escenas si se ejecuta de nuevo.
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
const { sanitizeDirectives } = await import('../src/learning/lib/directives.js')
const { sanitizeInteractive, newInteractiveId } = await import('../src/learning/lib/interactive.js')
const { validateResourceContent } = await import('../src/learning/lib/content.js')

const spot = (x: number, y: number, label: string, body: string) => ({
  id: newInteractiveId('h'), shape: 'pin' as const, x, y, label, body,
})

/**
 * Escenas del recurso «Explorador del cerebro que aprende» (U1 · Educación y
 * Neurociencia). El contenido sigue el guion del proyecto: tres escenas que
 * recorren estructura, función y aula, cada una con sus puntos activos.
 */
const SCENES = [
  {
    id: newInteractiveId('s'),
    title: 'El cerebro que aprende',
    intro: 'Recorre las regiones implicadas en el aprendizaje y qué aporta cada una. Toca cada punto para abrirlo.',
    hotspots: [
      spot(26, 34, 'Corteza prefrontal',
        'Sostiene las funciones ejecutivas: planificar, inhibir la respuesta automática y mantener información activa mientras se trabaja con ella. Madura hasta bien entrada la adolescencia, y eso explica por qué la autorregulación se enseña, no se presupone.'),
      spot(52, 58, 'Hipocampo',
        'Consolida la memoria declarativa: convierte la experiencia reciente en recuerdo duradero. Es especialmente sensible al sueño y al estrés sostenido, dos variables que el aula sí puede intervenir.'),
      spot(74, 44, 'Amígdala',
        'Asigna valor emocional a lo que ocurre. Un clima de aula percibido como amenazante desvía recursos hacia la vigilancia y deja menos disponibles para aprender: la emoción no es un adorno del aprendizaje, es su puerta.'),
      spot(40, 74, 'Sistema de recompensa',
        'La dopamina no premia el acierto, anticipa el valor de lo que viene. De ahí que la curiosidad bien provocada sostenga el esfuerzo mejor que el refuerzo externo.'),
    ],
  },
  {
    id: newInteractiveId('s'),
    title: 'Cómo se fija lo aprendido',
    intro: 'Tres condiciones que la neurociencia documenta y que el diseño de una clase puede favorecer o estropear.',
    hotspots: [
      spot(24, 40, 'Práctica distribuida',
        'Repartir el estudio en el tiempo produce retención más duradera que concentrarlo, aunque durante la sesión se sienta menos productivo. La sensación de fluidez engaña: lo que cuesta un poco se recuerda más.'),
      spot(50, 32, 'Recuperación activa',
        'Intentar recordar sin mirar consolida más que releer. Por eso una comprobación breve a mitad de clase no es evaluación: es aprendizaje.'),
      spot(76, 52, 'Sueño y consolidación',
        'Durante el sueño se reactivan los patrones del día y se estabilizan. Una jornada que recorta sueño para estudiar más suele restar, no sumar.'),
      spot(50, 76, 'Carga cognitiva',
        'La memoria de trabajo sostiene pocos elementos a la vez. Un material que obliga a repartir la atención entre dos fuentes simultáneas gasta capacidad en coordinarlas en vez de en comprender.'),
    ],
  },
  {
    id: newInteractiveId('s'),
    title: 'Del laboratorio al aula',
    intro: 'Qué decisión concreta cambia en tu planeación a partir de cada hallazgo. Este es el tramo práctico del recurso.',
    hotspots: [
      spot(28, 38, 'Abre con una pregunta, no con la definición',
        'Provocar la búsqueda antes de dar la respuesta activa el sistema de recompensa y mejora la retención de lo que viene después. Práctica: reescribe la apertura de tu próxima clase como pregunta.'),
      spot(58, 36, 'Comprueba a mitad, no solo al final',
        'Dos minutos de recuperación activa a mitad de sesión rinden más que diez de repaso al cierre. Práctica: elige el punto exacto de tu clase donde la insertarías.'),
      spot(44, 68, 'Una sola fuente a la vez',
        'Evita que el estudiante tenga que leer y escuchar contenidos distintos al mismo tiempo. Práctica: revisa tu última diapositiva y quítale lo que compita con tu voz.'),
    ],
  },
]

const resource = await store.lbResources().findFirst({
  where: { kind: 'INTERACTIVE', title: { contains: 'cerebro que aprende' } },
  include: { workspace: true },
})
if (!resource) {
  console.error('No encuentro el recurso «Explorador del cerebro que aprende». ¿Se sembró el workspace de La Salle?')
  await prisma.$disconnect()
  process.exit(1)
}

const directives = sanitizeDirectives(resource.workspace.directives)
const content = sanitizeInteractive({
  cover: {
    kicker: 'Educación y Neurociencia · Unidad 1',
    title: 'Explorador del cerebro que aprende',
    subtitle: 'Presentación interactiva con práctica de identificación',
    summary:
      'Un recorrido por las regiones cerebrales implicadas en el aprendizaje, por las tres condiciones que consolidan lo aprendido y por las decisiones de aula que se derivan de ambas. Cada escena combina explicación y práctica, como exige la regla de función dual del proyecto RED.',
    outcomes: [
      'Identificar las regiones cerebrales implicadas en el aprendizaje y su aporte específico.',
      'Explicar cómo la práctica distribuida, la recuperación activa y el sueño consolidan lo aprendido.',
      'Derivar al menos tres decisiones concretas de planeación a partir de los hallazgos revisados.',
    ],
  },
  scenes: SCENES,
})

const before = resource.content
if (before && Object.keys(before).length > 1) {
  await store.snapshot(resource.id, before, 'import', undefined, 'Antes de componer las escenas')
}
await store.lbResources().update({
  where: { id: resource.id },
  data: { content: content as any, status: 'PUBLISHED', publishedAt: resource.publishedAt || new Date() },
})

const issues = validateResourceContent('INTERACTIVE', content, directives)
console.log(`${resource.code} · ${resource.title}`)
console.log(`   escenas: ${content.scenes.length} · puntos: ${content.scenes.reduce((n, s) => n + s.hotspots.length, 0)}`)
console.log(`   revisión: ${issues.filter((i) => i.level === 'error').length} error(es), ${issues.filter((i) => i.level === 'warning').length} advertencia(s)`)
for (const issue of issues.slice(0, 5)) console.log(`      ${issue.level}: ${issue.message}`)

await prisma.$disconnect()
