import { useState } from 'react'
import type { ComponentType } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, Users, Award, TrendingUp, Download, Check, ArrowRight,
  ShieldCheck, Server, Sparkles, MessageCircle, Target, Wrench, LifeBuoy, RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import {
  MockPlataforma, MockRiesgo, MockCurso, MockEvaluacion, MockAsistente,
} from '../components/learninganalytics/DashboardMocks'

/**
 * Página pública del plugin Learning Analytics para Moodle.
 *
 * Es la cara al cliente: explica qué hace, qué incluye la versión gratuita y
 * qué desbloquea la licencia. La gestión interna vive aparte, en /ecosistema.
 */

const CONTACT_EMAIL = 'proyectos@algoritmot.com'
const WHATSAPP = '573044544525'

/** La descarga vive en nuestro propio sitio, no en un tercero. */
const DOWNLOAD_PATH = '/learning_analytics/descarga'

/** Fondo del hero. Optimizado a 2400 px: 236 KB frente a los 2,5 MB del original. */
const HERO_IMAGE = '/images/learning-analytics-hero.jpg'

const FREE_FEATURES = [
  'Total de usuarios y certificados emitidos',
  'Crecimiento de usuarios mes a mes',
  'Cursos con más matriculaciones',
  'Descarga en CSV',
]

/**
 * Vistas del tablero, agrupadas por área.
 *
 * Cada pestaña muestra una maqueta del bloque, dibujada en la propia página
 * con SVG y CSS: nítida a cualquier tamaño y con las cifras marcadas como
 * ejemplo dentro del propio marco. `more` enumera el resto de vistas del
 * bloque, para que la lista describa el producto completo.
 */
const VIEW_TABS: {
  id: string; label: string; intro: string;
  mock: ComponentType;
  more: string[];
}[] = [
  {
    id: 'plataforma',
    label: 'Plataforma',
    intro: 'La vista de quien mira el conjunto: cuánta gente hay, de dónde viene, cuándo entró por última vez y cómo crece la matrícula.',
    mock: MockPlataforma,
    more: [
      'Cifras clave: usuarios, matriculaciones, certificados emitidos y tasa de certificación',
      'Mapa geográfico dibujado dentro de tu plataforma, sin servidores externos',
      'Usuarios por dominio de correo, para separar personal interno de externo',
      'Certificados emitidos en el tiempo',
      'Filtros combinables: categoría en cascada, curso, rol, país, dominio, fechas y persona',
      'Padrón de personas con estado, supervisor y último acceso',
    ],
  },
  {
    id: 'riesgo',
    label: 'Permanencia y riesgo',
    intro: 'Quién se está quedando atrás, con una regla que tú defines: por defecto, siete horas de permanencia en los últimos siete días.',
    mock: MockRiesgo,
    more: [
      'Activos, con poca actividad y sin actividad, sobre el conjunto que estés filtrando',
      'Regulares: activos en al menos 3 de las últimas 4 ventanas',
      'Días activos por persona dentro de la ventana',
      'Entrada temprana: matrículas recientes con actividad en sus primeros siete días',
      'Reactivación tras mensaje: a quién se le escribió y quién volvió',
      'Actividades vencidas sin entregar y salida temprana, dentro de cada curso',
      'Tabla de personas por debajo de la regla, ordenada de menor a mayor actividad',
      'Filtro por actividad enlazado con el envío masivo: de la alerta al mensaje en un clic',
    ],
  },
  {
    id: 'curso',
    label: 'Dentro del curso',
    intro: 'El detalle que necesita quien acompaña un grupo concreto: dónde avanza, dónde se atasca y qué actividad está frenando a todos.',
    mock: MockCurso,
    more: [
      'Estudiantes, progreso promedio, calificación promedio y permanencia estimada',
      'Progreso por sección y por actividad, y calificación promedio de cada actividad',
      'Tabla de estudiantes con progreso, nota, último acceso, permanencia y estado de actividad',
      'Filtros por rango de progreso, rango de calificación, rol y último acceso',
      'Correo a un estudiante con su progreso ya redactado',
      'Cursos con más matriculaciones, también en la versión gratuita',
    ],
  },
  {
    id: 'evaluacion',
    label: 'Evaluación y foros',
    intro: 'Qué pasa con las entregas y con la conversación. Una fila por tarea, por cuestionario y por foro.',
    mock: MockEvaluacion,
    more: [
      'Entregas a tiempo sobre las esperadas, respetando las excepciones por persona',
      'Cuestionarios completados y ganancia entre el primer y el último intento',
      'Estudiantes que alcanzan la nota de aprobado',
      'Entregas con retroalimentación y cuántas llegaron dentro del plazo que definas',
      'Reentregas y libro de calificaciones al día con lo vencido',
      'Participación en foros, respuestas entre pares e hilos sin contestar',
      'Presencia docente, con permiso aparte: intervención, tiempo de respuesta, anuncios y mediación',
    ],
  },
  {
    id: 'ia',
    label: 'Asistente de IA',
    intro: 'Preguntas en tu idioma sobre lo que tienes en pantalla y recibes una lectura con las cifras detrás. Así funciona:',
    mock: MockAsistente,
    more: [
      'Pregunta en lenguaje natural sobre el recorte que estés viendo',
      'El asistente lee todos los bloques: plataforma, riesgo, evaluación y foros',
      'Modo respuesta breve y modo informe estructurado',
      'Explicación de una gráfica concreta, sin salir de ella',
      'Historial de consultas por persona, exportable y borrable',
      'Descarga en PDF con las gráficas incrustadas, Excel, CSV y JPG',
      'Solo viajan cifras agregadas: ni nombres, ni correos, ni notas',
    ],
  },
]

const PLAN_ROWS: { feature: string; free: boolean; licensed: boolean }[] = [
  { feature: 'Total de usuarios y certificados emitidos', free: true, licensed: true },
  { feature: 'Crecimiento de usuarios mes a mes', free: true, licensed: true },
  { feature: 'Cursos con más matriculaciones', free: true, licensed: true },
  { feature: 'Descarga en CSV', free: true, licensed: true },
  { feature: 'Padrón de personas con progreso, nota y último acceso', free: false, licensed: true },
  { feature: 'Filtros combinables y categorías en cascada', free: false, licensed: true },
  { feature: 'Filtro por rol, país, dominio de correo y fechas', free: false, licensed: true },
  { feature: 'Mapa geográfico de usuarios', free: false, licensed: true },
  { feature: 'Tableros de categoría y de curso', free: false, licensed: true },
  { feature: 'Progreso por sección y por actividad', free: false, licensed: true },
  { feature: 'Calificación promedio y por actividad', free: false, licensed: true },
  { feature: 'Permanencia estimada por estudiante', free: false, licensed: true },
  { feature: 'Permanencia y riesgo: activos, regulares, entrada temprana y salida temprana', free: false, licensed: true },
  { feature: 'Filtro por actividad y reactivación tras mensaje', free: false, licensed: true },
  { feature: 'Evaluación y entregas: a tiempo, aprobado, retroalimentación y libro al día', free: false, licensed: true },
  { feature: 'Foros e interacción: participación, respuestas entre pares e hilos sin respuesta', free: false, licensed: true },
  { feature: 'Presencia docente, con permiso aparte', free: false, licensed: true },
  { feature: 'Correo a un estudiante con su progreso', free: false, licensed: true },
  { feature: 'Mensaje masivo por correo o por Moodle', free: false, licensed: true },
  { feature: 'Descarga en Excel, PDF y JPG', free: false, licensed: true },
  { feature: 'Asistente de IA con historial: preguntas, explicación por gráfica e informes', free: false, licensed: true },
  { feature: 'El asistente lee todos los bloques del recorte que estés viendo', free: false, licensed: true },
]

/**
 * Lo que solo existe en el plan a la medida. Son filas aparte porque no son
 * funciones del plugin: son trabajo de consultoría y desarrollo.
 */
const CUSTOM_ROWS = [
  'Consultoría de KPIs estratégicos con el equipo directivo',
  'Traducción de cada KPI a datos que tu Moodle sí registra',
  'Indicadores, reglas y umbrales propios de tu institución',
  'Tableros y cálculos construidos a la medida',
  'Acompañamiento en la lectura de los primeros informes',
  'Soporte prioritario durante los 12 meses',
  'Hasta 2 ventanas de actualización',
]

/** Consultas de IA incluidas en cada plan, para toda su vigencia. */
/** Consultas de IA incluidas en cada plan, para toda su vigencia. */
const PAQUETES_IA = [
  { credits: 10, usd: 10 },
  { credits: 20, usd: 18 },
  { credits: 50, usd: 40 },
  { credits: 100, usd: 80 },
]

const PLANS = [
  {
    name: 'Gratuito', price: '0', period: 'siempre',
    tagline: 'Instala y empieza a ver cifras.',
    features: FREE_FEATURES,
    cta: 'Descargar del marketplace', highlight: false, plan: 'free',
  },
  {
    name: 'Semestral', price: '180', period: '6 meses',
    tagline: 'El plugin completo, tal como viene de fábrica.',
    features: ['Todo lo del plan gratuito', 'Todas las funciones avanzadas', '50 consultas de IA para toda la vigencia', 'Actualizaciones durante la vigencia', 'Soporte por correo'],
    cta: 'Solicitar licencia', highlight: true, plan: 'semestral',
  },
  {
    name: 'Anual', price: '320', period: '12 meses',
    tagline: 'Lo mismo, un 11 % más barato que dos semestrales.',
    features: ['Todo lo del plan gratuito', 'Todas las funciones avanzadas', '100 consultas de IA para toda la vigencia', 'Actualizaciones durante la vigencia', 'Soporte prioritario'],
    cta: 'Solicitar licencia', highlight: false, plan: 'anual',
  },
  {
    // El único plan que no es el plugin de fábrica: aquí hay trabajo de
    // análisis y desarrollo, así que el precio depende del alcance.
    name: 'A la medida', price: null, period: '12 meses',
    tagline: 'Mapeamos tus KPIs y lo construimos contigo.',
    features: ['Todo lo del plan anual', 'Mapeo de indicadores con tu equipo', 'Tableros y cálculos a la medida de tu institución', 'Vigencia de 12 meses', 'Soporte prioritario los 12 meses', 'Hasta 2 ventanas de actualización'],
    cta: 'Solicitar propuesta', highlight: false, plan: 'a la medida',
  },
]

const STEPS = [
  { n: '1', title: 'Instala el plugin', text: 'Desde el directorio de Moodle o subiendo el ZIP. Funciona en Moodle 4.5 a 5.2, con MariaDB o PostgreSQL.' },
  { n: '2', title: 'Usa la versión gratuita', text: 'Sin registro ni tarjeta. Verás las cifras generales de tu plataforma desde el primer momento.' },
  { n: '3', title: 'Solicita tu licencia', text: 'Escríbenos con el identificador que el propio plugin muestra en sus ajustes. Elegimos el plan y emitimos el código.' },
  { n: '4', title: 'Pega el código', text: 'Todo se habilita al instante. La verificación es local: tu plataforma no necesita conexión con nosotros para funcionar.' },
]

const TRUST = [
  // Redactado para seguir siendo cierto el día que exista la analítica
  // conversacional: esa función enviará cifras agregadas, nunca personas.
  { icon: ShieldCheck, title: 'De tus estudiantes no sale nada', text: 'Ni nombres, ni correos, ni notas. El plugin lee tu base de datos y dibuja los tableros dentro de tu propia plataforma. La revalidación diaria de la licencia transmite solo tres campos: identificador de licencia, huella del sitio y versión instalada.' },
  { icon: Server, title: 'Sin dependencias externas', text: 'Nada de librerías cargadas desde CDN. Las gráficas usan Chart.js del propio núcleo de Moodle, y los informes se generan con las librerías que Moodle ya trae.' },
  { icon: Sparkles, title: 'Respeta los permisos de Moodle', text: 'Quién ve cada tablero se define con capacidades reales de Moodle. Un profesor solo ve los datos de sus cursos, comprobado en el servidor y no solo en pantalla.' },
]

/** Mismo aspecto para el botón del plan, sea enlace interno o de WhatsApp. */
const ctaClass = (highlight: boolean) =>
  `mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
    highlight
      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
      : 'border border-slate-300 text-slate-900 hover:bg-slate-50'
  }`

export function LearningAnalyticsLanding() {

  const [vista, setVista] = useState(VIEW_TABS[0].id)
  const activa = VIEW_TABS.find((v) => v.id === vista) ?? VIEW_TABS[0]
  const Maqueta = activa.mock

  /**
   * Contacto por WhatsApp con el mensaje ya redactado. Pedimos de entrada el
   * identificador del sitio porque es lo único que necesitamos para emitir
   * la licencia, y así se evita un ida y vuelta.
   */
  const whatsapp = (plan: string) => {
    // El plan a la medida no empieza con un código de licencia sino con una
    // conversación, así que pedir el identificador del sitio sobraría.
    const cuerpo = plan === 'A la medida'
      ? 'Hola, me interesa el plan a la medida del plugin Learning Analytics para Moodle.\n\n' +
        'Institución: \n' +
        'URL de nuestro Moodle: \n' +
        'Qué queremos medir: '
      : 'Hola, quiero una licencia del plugin Learning Analytics para Moodle.\n\n' +
        `Plan: ${plan}\n` +
        'Institución: \n' +
        'URL de nuestro Moodle: \n' +
        'Identificador del sitio (aparece en los ajustes del plugin): '

    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(cuerpo)}`
  }

  return (
    <Layout>
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-slate-900 px-6 py-24 text-white sm:py-32">
        {/* Fondo: la imagen aporta textura y el degradado garantiza que el
            texto se lea, sin depender del contraste de la foto. */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-indigo-950/60"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              <BarChart3 size={13} /> Plugin para Moodle
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Entiende qué pasa dentro de tu Moodle
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-300">
              Learning Analytics reúne en un solo tablero el progreso, las calificaciones, la
              permanencia y el riesgo de abandono de tus estudiantes — y te deja escribirles sin
              salir de allí.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#planes" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100">
                Ver planes <ArrowRight size={16} />
              </a>
              <Link to={DOWNLOAD_PATH} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3 text-sm font-bold transition hover:bg-white/10">
                <Download size={16} /> Descargar gratis
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-400">
              Compatible con Moodle 4.5 a 5.2 · MariaDB o PostgreSQL · Sin coste para empezar
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section id="gratis" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black tracking-tight">Empieza sin pagar nada</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Instala el plugin y verás de inmediato las cifras generales de tu plataforma.
            No pedimos registro ni tarjeta para esto.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, label: 'Usuarios y certificados' },
              { icon: TrendingUp, label: 'Crecimiento mensual' },
              { icon: Award, label: 'Cursos más demandados' },
              { icon: Download, label: 'Descarga en CSV' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-2xl border border-slate-200 p-5">
                <Icon size={20} className="text-indigo-600" />
                <div className="mt-3 text-sm font-bold">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black tracking-tight">Cómo se ve</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Así se ve el tablero dentro de tu Moodle. Los bloques, los filtros y las acciones son
            los que trae el plugin; las cifras de los ejemplos son ilustrativas y ninguna
            corresponde a personas reales.
          </p>

          <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Áreas del tablero">
            {VIEW_TABS.map((v) => (
              <button key={v.id} type="button" role="tab"
                id={`tab-${v.id}`}
                aria-selected={v.id === vista}
                aria-controls={`panel-${v.id}`}
                onClick={() => setVista(v.id)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  v.id === vista
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}>
                {v.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${activa.id}`} aria-labelledby={`tab-${activa.id}`}
            className="mt-6">
            <p className="max-w-2xl text-slate-600">{activa.intro}</p>

            <div className="mt-6">
              <Maqueta />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Todo lo que incluye este bloque
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {activa.more.map((m) => (
                  <li key={m} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                    <Check size={15} className="mt-1 shrink-0 text-emerald-600" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section id="planes" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black tracking-tight">Planes</h2>
          <p className="mt-3 text-slate-600">
            Precios en dólares, por plataforma. La licencia cubre tu Moodle completo, sin límite de usuarios ni de cursos.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.highlight ? 'border-indigo-600 bg-indigo-50/40 shadow-lg' : 'border-slate-200 bg-white'
                }`}>
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">
                    Más elegido
                  </span>
                )}
                <h3 className="text-lg font-black">{plan.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{plan.tagline}</p>
                {plan.price === null ? (
                  <div className="mt-5 flex items-end gap-2">
                    <span className="text-2xl font-black">A convenir</span>
                    <span className="mb-1 text-xs text-slate-500">{plan.period}</span>
                  </div>
                ) : (
                  <div className="mt-5 flex items-end gap-1">
                    <span className="text-4xl font-black">{plan.price === '0' ? '0' : `$${plan.price}`}</span>
                    <span className="mb-1 text-xs text-slate-500">USD / {plan.period}</span>
                  </div>
                )}
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-slate-700">
                      <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {plan.plan === 'free' ? (
                  <Link to={DOWNLOAD_PATH} className={ctaClass(plan.highlight)}>
                    {plan.cta}
                  </Link>
                ) : (
                  <a href={whatsapp(plan.name)} target="_blank" rel="noopener noreferrer"
                    className={ctaClass(plan.highlight)}>
                    <MessageCircle size={15} /> {plan.cta}
                  </a>
                )}
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Los tres primeros planes son el plugin tal como se descarga, sin desarrollos añadidos.
            El plan a la medida parte de él y suma el trabajo de definir contigo qué indicadores
            necesita tu institución y construirlos.
          </p>

          <p className="mt-3 text-xs text-slate-500">
            Las consultas de IA se pueden recargar en paquetes desde 10 USD y duran lo que dure la
            licencia. Agotarlas no desactiva nada más: el resto del plugin sigue completo.
          </p>

          <p className="mt-3 text-xs text-slate-500">
            ¿Varias plataformas o una institución grande?{' '}
            <a href={whatsapp('a definir')} target="_blank" rel="noopener noreferrer"
              className="font-semibold text-indigo-600">Escríbenos por WhatsApp</a>{' '}
            o a <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-indigo-600">{CONTACT_EMAIL}</a> y lo ajustamos.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black tracking-tight">Qué incluye cada plan</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Un solo archivo para todo, y el código de licencia habilita las filas de abajo.
            Gratuito, semestral y anual entregan el plugin tal como se descarga. El plan
            a la medida es otra cosa: incluye una consultoría completa para definir tus KPIs
            estratégicos y construir los indicadores que hagan falta.
          </p>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-5 py-3.5 font-black">Función</th>
                  <th className="w-28 px-5 py-3.5 text-center font-black">Gratuito</th>
                  <th className="w-32 px-5 py-3.5 text-center font-black text-indigo-700">Con licencia</th>
                  <th className="w-32 px-5 py-3.5 text-center font-black text-indigo-700">A la medida</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_ROWS.map(({ feature, free, licensed }) => (
                  <tr key={feature} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 text-slate-700">{feature}</td>
                    {[free, licensed, licensed].map((incluido, i) => (
                      <td key={i} className="px-5 py-3 text-center">
                        {incluido
                          ? <Check size={17} className="mx-auto text-emerald-600" />
                          : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
                {CUSTOM_ROWS.map((feature) => (
                  <tr key={feature} className="border-b border-slate-100 bg-indigo-50/40 last:border-0">
                    <td className="px-5 py-3 font-semibold text-slate-800">{feature}</td>
                    <td className="px-5 py-3 text-center"><span className="text-slate-300">—</span></td>
                    <td className="px-5 py-3 text-center"><span className="text-slate-300">—</span></td>
                    <td className="px-5 py-3 text-center">
                      <Check size={17} className="mx-auto text-emerald-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Precio por plataforma, sin límite de usuarios ni de cursos. El plan a la medida incluye
            soporte prioritario durante los doce meses y hasta dos ventanas de actualización.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="font-black">Si se acaban las consultas de IA</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Se recargan en paquetes, y lo que compres dura lo que dure tu licencia: no caduca a
              fin de mes. Todo lo demás del plugin sigue funcionando aunque la bolsa esté a cero.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {PAQUETES_IA.map(({ credits, usd }) => (
                <div key={credits} className="rounded-xl border border-slate-200 p-4 text-center">
                  <div className="text-2xl font-black tabular-nums">{credits}</div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">consultas</div>
                  <div className="mt-2 font-bold text-indigo-700">${usd} USD</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* El plan a la medida no es una función más del plugin: es trabajo de
          consultoría. La página tiene que decirlo sin rodeos, porque quien
          compra un plan con precio recibe algo distinto. */}
      <section className="bg-indigo-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-5xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <Target size={13} /> Plan a la medida
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
            No es una licencia más: es una consultoría completa alineada a tus KPIs estratégicos
          </h2>
          <p className="mt-5 max-w-3xl text-lg text-indigo-100">
            Los planes gratuito, semestral y anual entregan el plugin tal como se descarga, con los
            indicadores que ya trae. El plan a la medida empieza antes: nos sentamos con tu equipo
            directivo a definir qué mide el éxito en tu institución, y desde ahí construimos los
            indicadores, las reglas y los tableros que hacen falta.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              {
                icon: Target,
                title: '1. Definimos tus KPIs estratégicos',
                text: 'Un taller con dirección académica para poner por escrito qué decisiones hay que tomar y qué indicador las cambia. No partimos de lo que el plugin ya calcula, sino de lo que tu institución necesita saber.',
              },
              {
                icon: Users,
                title: '2. Los traducimos a datos reales',
                text: 'Cada KPI se contrasta con lo que tu Moodle registra de verdad. Si alguno no se puede calcular con esos datos, te lo decimos antes de empezar y proponemos el más cercano que sí sea medible.',
              },
              {
                icon: Wrench,
                title: '3. Construimos a la medida',
                text: 'Indicadores propios, reglas y umbrales con los valores de tu institución, tableros y descargas hechos para tu operación. Todo dentro de tu plataforma, con los permisos de Moodle de siempre.',
              },
              {
                icon: LifeBuoy,
                title: '4. Acompañamos la puesta en marcha',
                text: 'Te acompañamos en la lectura de los primeros informes, para que los números lleguen a las reuniones donde se decide y no se queden en una pestaña que nadie abre.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-white/15 bg-white/5 p-6">
                <Icon size={20} className="text-indigo-300" />
                <h3 className="mt-3 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-indigo-100">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: RefreshCw, label: 'Vigencia', value: '12 meses' },
              { icon: LifeBuoy, label: 'Soporte prioritario', value: 'los 12 meses' },
              { icon: Wrench, label: 'Ventanas de actualización', value: 'hasta 2' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-5">
                <Icon size={18} className="shrink-0 text-indigo-300" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">{label}</div>
                  <div className="font-black">{value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a href={whatsapp('A la medida')}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100">
              <MessageCircle size={17} /> Hablemos de tus KPIs
            </a>
            <span className="text-sm text-indigo-200">
              El alcance define el precio, así que empezamos por entender qué necesitas medir.
            </span>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black tracking-tight">Cómo se activa</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-sm font-black text-white">{s.n}</div>
                <h3 className="mt-4 font-black">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black tracking-tight">Cómo tratamos tus datos</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TRUST.map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <Icon size={22} className="text-indigo-600" />
                <h3 className="mt-3 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="bg-slate-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black tracking-tight">¿Empezamos?</h2>
          <p className="mt-3 text-slate-300">
            Instala la versión gratuita hoy. Cuando quieras el resto, escríbenos con el identificador
            que el plugin te muestra y te enviamos el código.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={DOWNLOAD_PATH}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100">
              Descargar gratis <ArrowRight size={16} />
            </Link>
            <a href={whatsapp('a definir')} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3 text-sm font-bold hover:bg-white/10">
              <MessageCircle size={17} /> Hablar con nosotros
            </a>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export default LearningAnalyticsLanding
