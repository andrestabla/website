import { motion } from 'framer-motion'
import {
  Download, ShieldCheck, Server, Database, Boxes, KeyRound, Sparkles,
  MessageCircle, FileArchive, Terminal, MousePointerClick, ArrowLeft, Info, ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'

/**
 * Página de descarga del plugin Learning Analytics.
 *
 * Aquí aterriza quien ya decidió probarlo: el archivo, los requisitos, cómo
 * se instala, qué se ve y qué incluye cada plan. La descarga se sirve desde
 * nuestro propio sitio, no desde un tercero.
 */

const WHATSAPP = '573044544525'

/**
 * Interruptor del contenido sobre analítica conversacional. Solo debe estar
 * en true mientras el ZIP que se sirve arriba incluya la función: anunciar
 * lo que el cliente no encontraría al instalar sería vender humo.
 */
const AI_DISPONIBLE = true

/** Ficha del paquete. Cambiar al publicar una versión nueva. */
const RELEASE = {
  version: '3.20.1',
  file: 'local_learninganalytics-3.20.1.zip',
  size: '288 KB',
  date: '3 de septiembre de 2026',
  // Permite a quien instala comprobar que el archivo no se alteró en el camino.
  sha256: 'f5dcf17cb0a5cfc70126f836ca2c033f79472113f371d9c2a803811195fbac54',
}

const DOWNLOAD_URL = `/downloads/${RELEASE.file}`

const REQUIREMENTS = [
  { icon: Boxes, label: 'Moodle', value: '4.5 LTS a 5.2', note: 'Probado en 4.5 y 5.2, incluida la nueva estructura de carpetas de Moodle 5.1+.' },
  { icon: Terminal, label: 'PHP', value: '8.1 o superior', note: 'El mismo que ya exige tu versión de Moodle. Verificado en 8.3.' },
  { icon: Database, label: 'Base de datos', value: 'MariaDB, MySQL o PostgreSQL', note: 'Sin SQL propietario: las consultas usan la capa de abstracción de Moodle.' },
  { icon: Server, label: 'Extras del servidor', value: 'Ninguno', note: 'No hace falta instalar librerías, servicios ni extensiones adicionales.' },
]

const INSTALL_UI = [
  'Entra como administrador a Administración del sitio → Extensiones → Instalar módulos externos.',
  'Arrastra el archivo ZIP tal como lo descargaste, sin descomprimirlo.',
  'Pulsa «Instalar plugin desde el archivo ZIP» y confirma la actualización de la base de datos.',
  'Listo: aparece en Administración del sitio → Informes → Learning Analytics.',
]

const INSTALL_MANUAL = [
  'Descomprime el ZIP: obtienes una carpeta llamada learninganalytics.',
  'Cópiala dentro de local/ en la raíz de tu Moodle (en Moodle 5.1+, dentro de public/local/).',
  'Ajusta el propietario de la carpeta al usuario del servidor web.',
  'Visita la página de notificaciones del administrador para completar la instalación.',
]

const CAPABILITIES = [
  { cap: 'local/learninganalytics:view', text: 'Ver los tableros. Se otorga por rol y por contexto, así que un profesor solo alcanza sus propios cursos.' },
  { cap: 'local/learninganalytics:sendmessage', text: 'Escribir a un estudiante desde el tablero, con su progreso ya redactado.' },
  { cap: 'local/learninganalytics:sendbulkmessage', text: 'Escribir a todos los estudiantes que devuelve un filtro, con confirmación previa.' },
  { cap: 'local/learninganalytics:viewteaching', text: 'Ver las cifras de acompañamiento docente. Se separa de las demás porque mide el trabajo de una persona identificable.' },
  { cap: 'local/learninganalytics:resendcredentials', text: 'Reenviar credenciales de acceso a quien no ha entrado nunca.' },
]

export function LearningAnalyticsDownload() {

  const whatsapp = (text: string) =>
    `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`

  return (
    <Layout>
      {/* ---------------------------------------------------------------- */}
      <section className="bg-slate-900 px-6 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-5xl">
          <Link to="/learning_analytics"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
            <ArrowLeft size={15} /> Learning Analytics
          </Link>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              Descarga el plugin
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">
              La versión gratuita es este mismo archivo: se instala, funciona y muestra las cifras
              generales de tu plataforma sin pedirte registro ni tarjeta. El código de licencia solo
              añade funciones; no hay una descarga distinta.
            </p>

            <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-6">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <FileArchive size={30} className="text-indigo-300" />
                <div className="min-w-[200px] flex-1">
                  <div className="font-black">{RELEASE.file}</div>
                  <div className="mt-1 text-sm text-slate-400">
                    Versión {RELEASE.version} · {RELEASE.size} · {RELEASE.date}
                  </div>
                </div>
                <a href={DOWNLOAD_URL} download
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100">
                  <Download size={16} /> Descargar ZIP
                </a>
              </div>
              <div className="mt-5 border-t border-white/10 pt-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  SHA-256
                </div>
                <code className="mt-1 block break-all font-mono text-[11px] leading-relaxed text-slate-300">
                  {RELEASE.sha256}
                </code>
                <p className="mt-2 text-xs text-slate-500">
                  Compara este valor con el del archivo que descargaste para confirmar que llegó íntegro.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black tracking-tight">Qué necesitas</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Si tu Moodle está actualizado, ya cumples todo. El plugin no añade requisitos propios.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {REQUIREMENTS.map(({ icon: Icon, label, value, note }) => (
              <div key={label} className="rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-2.5">
                  <Icon size={18} className="text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                </div>
                <div className="mt-2 text-lg font-black">{value}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black tracking-tight">Cómo se instala</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Dos caminos, según prefieras hacerlo desde el navegador o desde el servidor.
            Cualquiera de los dos toma un par de minutos.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              { icon: MousePointerClick, title: 'Desde el navegador', subtitle: 'Recomendado', steps: INSTALL_UI },
              { icon: Terminal, title: 'Desde el servidor', subtitle: 'Si prefieres la línea de comandos', steps: INSTALL_MANUAL },
            ].map(({ icon: Icon, title, subtitle, steps }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2.5">
                  <Icon size={18} className="text-indigo-600" />
                  <h3 className="font-black">{title}</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
                <ol className="mt-4 space-y-3">
                  {steps.map((s, i) => (
                    <li key={s} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-900 text-[11px] font-black text-white">
                        {i + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <Info size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-sm leading-relaxed text-amber-900">
              Como con cualquier plugin, haz una copia de seguridad de la base de datos antes de
              instalarlo en una plataforma en producción. Learning Analytics no modifica datos de
              Moodle: solo crea sus propias tablas (historial del asistente y permanencia diaria
              agregada), pero la costumbre es sana.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black tracking-tight">¿Buscabas los planes o las vistas?</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Están en la página del plugin: cómo se ve cada bloque del tablero, qué incluye cada
            plan y en qué consiste el plan a la medida, con su consultoría de KPIs estratégicos.
            Esta página es solo para instalarlo.
          </p>
          <Link to="/learning_analytics"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
            Ver planes y vistas <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black tracking-tight">Cómo se activa la licencia</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { n: '1', title: 'Copia tu identificador', text: 'Tras instalar, entra en los ajustes del plugin. Ahí aparece un identificador único de tu plataforma.' },
              { n: '2', title: 'Escríbenos', text: 'Mándanoslo por WhatsApp junto con el plan que quieres. Emitimos el código a nombre de tu plataforma.' },
              { n: '3', title: 'Pega el código', text: 'Todo se habilita al instante. La verificación es local: el plugin sigue funcionando aunque tu servidor no tenga salida a internet.' },
            ].map(({ n, title, text }) => (
              <div key={n} className="rounded-2xl border border-slate-200 p-6">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-sm font-black text-white">{n}</div>
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center gap-2.5">
              <KeyRound size={18} className="text-indigo-600" />
              <h3 className="font-black">Quién puede ver qué</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              El acceso se define con capacidades propias de Moodle, asignables a cualquier rol desde
              la interfaz de siempre. La comprobación ocurre en el servidor, no solo en pantalla.
            </p>
            <dl className="mt-5 space-y-3">
              {CAPABILITIES.map(({ cap, text }) => (
                <div key={cap} className="sm:flex sm:gap-4">
                  <dt className="shrink-0 sm:w-72">
                    <code className="break-all font-mono text-xs text-indigo-700">{cap}</code>
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-600 sm:mt-0">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black tracking-tight">Qué sale de tu servidor</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            La lista completa, sin letra pequeña.
          </p>
          <div className={`mt-8 grid gap-6 ${AI_DISPONIBLE ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <ShieldCheck size={20} className="text-emerald-600" />
              <h3 className="mt-3 font-black">De tus estudiantes, nada</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Ni nombres, ni correos, ni identificadores, ni notas. El plugin lee tu base de datos
                y dibuja los tableros dentro de tu propia plataforma. No hay analítica de terceros ni
                librerías cargadas desde servidores ajenos.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <Server size={20} className="text-indigo-600" />
              <h3 className="mt-3 font-black">La licencia: tres campos, una vez al día</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Solo si activaste una licencia. Se transmiten el identificador de la licencia, una
                huella de tu sitio y la versión instalada, para comprobar que sigue vigente. Si la
                consulta falla, el plugin continúa funcionando con normalidad.
              </p>
            </div>
            {AI_DISPONIBLE && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <Sparkles size={20} className="text-amber-600" />
                <h3 className="mt-3 font-black">La IA: solo si tú la enciendes</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Viene apagada. Si la activas, cada pregunta viaja con las cifras que ya ves en
                  pantalla — «Módulo 3: 24 %», «Más de 90 días: 18»— hasta nuestro servidor y de ahí
                  a OpenAI. Nunca personas: si una etiqueta parece un correo, el envío se rechaza.
                  En nuestro servidor no se guarda la pregunta ni las cifras; solo se cuenta el
                  consumo. Tu plataforma sí conserva el historial de cada usuario, declarado en el
                  registro de privacidad de Moodle y exportable y borrable por persona, como exige
                  el RGPD y la Ley 1581.
                </p>
              </div>
            )}
          </div>

          {AI_DISPONIBLE && (
            <div className="mt-6 flex gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <Info size={18} className="mt-0.5 shrink-0 text-slate-400" />
              <p className="text-sm leading-relaxed text-slate-600">
                <strong className="font-semibold text-slate-900">Sobre el cifrado, sin adornos.</strong>{' '}
                Todo el tránsito va cifrado, y en nuestro servidor no queda contenido que cifrar
                porque no lo almacenamos. Pero un modelo de lenguaje necesita leer los datos para
                responder: quien procesa la consulta la ve en claro. Por eso la protección real no
                es el cifrado, sino que lo único que sale son cifras agregadas, sin ninguna persona
                detrás. Si tu institución no quiere ni eso, deja la función apagada y el plugin
                sigue completo en todo lo demás.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="bg-slate-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black tracking-tight">¿Dudas antes de instalar?</h2>
          <p className="mt-3 text-slate-300">
            Escríbenos por WhatsApp y te respondemos nosotros, sin formularios ni tickets.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={whatsapp('Hola, tengo una consulta sobre el plugin Learning Analytics para Moodle.')}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-600">
              <MessageCircle size={17} /> Hablar con nosotros
            </a>
            <a href={DOWNLOAD_URL} download
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3 text-sm font-bold transition hover:bg-white/10">
              <Download size={16} /> Descargar ZIP
            </a>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export default LearningAnalyticsDownload
