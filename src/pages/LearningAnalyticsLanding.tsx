import { motion } from 'framer-motion'
import {
  BarChart3, Users, Award, TrendingUp, Filter, Globe2, GraduationCap,
  Mail, Download, Check, ArrowRight, ShieldCheck, Server, Sparkles, MessageCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'

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

const PRO_FEATURES = [
  { icon: Filter, title: 'Filtros combinables', text: 'Categorías en cascada que replican la estructura de tu Moodle, rol, país, dominio de correo, rango de fechas y búsqueda por persona.' },
  { icon: Globe2, title: 'Mapa geográfico', text: 'Distribución de tus usuarios por país sobre fronteras reales, dibujado en la propia plataforma: no se pide ningún mosaico a servidores externos.' },
  { icon: GraduationCap, title: 'Analítica por curso', text: 'Progreso total, por sección y por actividad; calificación promedio y por actividad; permanencia estimada de cada estudiante.' },
  { icon: Users, title: 'Tablas de personas', text: 'Padrón con progreso, calificación, último acceso y permanencia. Filtrable por rango de progreso y de nota.' },
  { icon: Mail, title: 'Contacto directo', text: 'Escribe a un estudiante con su progreso ya redactado en el correo, o a todos los que devuelve un filtro, con confirmación previa.' },
  { icon: Sparkles, title: 'Pregunta en lenguaje natural', text: 'Escribe una pregunta sobre lo que hay en pantalla y recibe una lectura de las cifras. Solo viajan las series agregadas: ni nombres, ni correos, ni notas.' },
  { icon: Download, title: 'Descargas completas', text: 'Cualquier gráfica, bloque o el informe entero en PDF con las gráficas incrustadas, Excel, CSV o JPG.' },
]

const PLANS = [
  {
    name: 'Gratuito', price: '0', period: 'siempre',
    tagline: 'Instala y empieza a ver cifras.',
    features: FREE_FEATURES,
    cta: 'Descargar del marketplace', highlight: false, plan: 'free',
  },
  {
    name: 'Trimestral', price: '100', period: '3 meses',
    tagline: 'Para evaluarlo con datos reales.',
    features: ['Todo lo del plan gratuito', 'Todas las funciones avanzadas', '20 consultas de IA para toda la vigencia', 'Actualizaciones durante la vigencia', 'Soporte por correo'],
    cta: 'Solicitar licencia', highlight: false, plan: 'trimestral',
  },
  {
    name: 'Semestral', price: '180', period: '6 meses',
    tagline: 'Ahorra un 10 % frente al trimestral.',
    features: ['Todo lo del plan gratuito', 'Todas las funciones avanzadas', '50 consultas de IA para toda la vigencia', 'Actualizaciones durante la vigencia', 'Soporte por correo'],
    cta: 'Solicitar licencia', highlight: true, plan: 'semestral',
  },
  {
    name: 'Anual', price: '320', period: '12 meses',
    tagline: 'Ahorra un 20 % frente al trimestral.',
    features: ['Todo lo del plan gratuito', 'Todas las funciones avanzadas', '100 consultas de IA para toda la vigencia', 'Actualizaciones durante la vigencia', 'Soporte prioritario'],
    cta: 'Solicitar licencia', highlight: false, plan: 'anual',
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

  /**
   * Contacto por WhatsApp con el mensaje ya redactado. Pedimos de entrada el
   * identificador del sitio porque es lo único que necesitamos para emitir
   * la licencia, y así se evita un ida y vuelta.
   */
  const whatsapp = (plan: string) =>
    `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
      'Hola, quiero una licencia del plugin Learning Analytics para Moodle.\n\n' +
      `Plan: ${plan}\n` +
      'Institución: \n' +
      'URL de nuestro Moodle: \n' +
      'Identificador del sitio (aparece en los ajustes del plugin): '
    )}`

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
              Learning Analytics reúne en un solo tablero el progreso, las calificaciones y la
              permanencia de tus estudiantes — y te deja escribirles sin salir de allí.
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
          <h2 className="text-3xl font-black tracking-tight">Lo que desbloquea la licencia</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Todo lo que convierte las cifras en decisiones: filtrar, entender curso por curso y actuar.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PRO_FEATURES.map(({ icon: Icon, title, text }) => (
              <motion.div key={title}
                initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.35 }}
                className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon size={19} />
                </div>
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </motion.div>
            ))}
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
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-4xl font-black">{plan.price === '0' ? '0' : `$${plan.price}`}</span>
                  <span className="mb-1 text-xs text-slate-500">USD / {plan.period}</span>
                </div>
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
