import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, Handshake, Route, ScanSearch, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { BookingSystem } from '../components/booking/BookingSystem'
import { useCMS } from '../admin/context/CMSContext'
import { useLanguage } from '../context/LanguageContext'
import { applySeoPayload, limitText, normalizeBaseUrl, toAbsoluteUrl } from '../lib/seo'

const HERO_VIDEO_URL = 'https://imageneseiconos.s3.us-east-1.amazonaws.com/videos/5070667_International_Team_1920x1080.mp4'

const BOOKING_URL =
  'https://outlook.office.com/bookwithme/user/9cf8e211b713432295f17969db08b402@algoritmot.com/meetingtype/wZWn6TXuxkyDuN51IAvifQ2?anonymous&ismsaljsauthenabled&ep=mLinkFromTile'

const CASE_GENERATOR_URL = 'https://www.algoritmot.com/generador-casos'

const DISCOVERY_PATHS = [
  'Iniciar un negocio con más estructura',
  'Fortalecer calidad y operación',
  'Ordenar procesos comerciales',
  'Digitalizar sin perder foco',
  'Preparar al equipo para crecer',
  'Tomar mejores decisiones de expansión',
]

const HERO_PILLARS = [
  'Más claridad para decidir',
  'Más orden para ejecutar',
  'Más capacidad para crecer',
]

const ENTRY_POINTS = [
  {
    title: 'Operación que ya no escala',
    body: 'Hay demasiado esfuerzo manual, cuellos de botella y variación en la forma de trabajar.',
  },
  {
    title: 'Crecimiento comercial sin sistema',
    body: 'La oportunidad existe, pero faltan prioridad, proceso y seguimiento para convertirla mejor.',
  },
  {
    title: 'Equipos creciendo sin una ruta común',
    body: 'Hace falta alinear decisiones, responsables y próximos pasos para no avanzar por intuición.',
  },
]

const METHODOLOGY = [
  {
    number: '01',
    icon: ScanSearch,
    title: 'Entendemos el punto de partida',
    body: 'Leemos el negocio, el objetivo y la tensión más urgente para concentrar el esfuerzo donde de verdad mueve resultados.',
    outcomes: ['Contexto', 'Prioridad', 'Objetivo concreto'],
  },
  {
    number: '02',
    icon: Route,
    title: 'Definimos una ruta posible',
    body: 'Traducimos esa prioridad en un primer frente claro, con responsables, foco y una secuencia aterrizada para empezar.',
    outcomes: ['Ruta inicial', 'Fases claras', 'Menos dispersión'],
  },
  {
    number: '03',
    icon: Handshake,
    title: 'Implementamos con tu equipo',
    body: 'No dejamos un documento y nos vamos. Acompañamos la puesta en marcha para que el cambio sí ocurra en la operación.',
    outcomes: ['Acompañamiento', 'Adopción', 'Ejecución real'],
  },
  {
    number: '04',
    icon: TrendingUp,
    title: 'Medimos y abrimos la siguiente etapa',
    body: 'Con resultados y aprendizajes en mano, dejamos una base más fuerte para repetir el crecimiento con menos fricción.',
    outcomes: ['Indicadores', 'Aprendizajes', 'Siguiente paso'],
  },
]

const TRUSTED_CLIENTS = [
  { name: 'CESA', logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/CESA.svg' },
  { name: 'Ibero', logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/ibero.png' },
  { name: 'La Salle', logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/La-Salle-color-RGB.png' },
  { name: 'Mobile Citi Academy', logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/LOGO+MOBILE+CITI+ACADEMY+VF.png' },
  { name: 'Inetum', logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/LOGO_INETUM.jpg' },
  { name: 'UDI', logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/logos-udi-1-02.png' },
  { name: 'San Martín', logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/SanMarti%CC%81n.png' },
  { name: 'Santo Tomás', logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/SANTO_TOMA%CC%81S_Principal.webp' },
  { name: 'UTB', logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/UTB.png' },
  { name: 'Carmenza Alarcón', logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/Logo+CA3.svg' },
  { name: 'Marca Ejecutiva', logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/Marca+Ejecutiva.svg' },
  { name: 'Icaza-Jammoul', logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/Icaza.svg' },
  { name: 'Estudiemos Web', logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/logo+EW.png' },
]

const AGENDA_POINTS = [
  'Diagnóstico del frente que hoy más limita el crecimiento.',
  'Priorización del primer caso que vale la pena mover.',
  'Siguiente paso recomendado para arrancar con claridad.',
]

const STARTER_CASES = [
  'Quiero escalar sin depender de tareas manuales.',
  'Necesito ordenar procesos antes de ampliar capacidad.',
  'Quiero convertir una oportunidad difusa en un caso claro de negocio.',
]

const GENERATOR_SECTORS = [
  'Finanzas y Banca',
  'Salud y Medicina',
  'Retail y Comercio Electrónico',
  'Manufactura y Logística',
  'Tecnología y Software',
  'Educación',
  'Servicios Profesionales',
  'Bienes Raíces y Construcción',
  'Energía y Servicios Públicos',
  'Transporte y Movilidad',
]

export function EscalarNegocioLanding() {
  const { state } = useCMS()
  const { language } = useLanguage()
  const clientRail = [...TRUSTED_CLIENTS, ...TRUSTED_CLIENTS]

  useEffect(() => {
    const siteName = String(state.site.name || 'AlgoritmoT').trim() || 'AlgoritmoT'
    const baseUrl = normalizeBaseUrl(state.site.url)
    const canonicalUrl = toAbsoluteUrl(baseUrl, '/escalar-negocio')
    const title = `Escalabilidad de negocios con AlgoritmoT | ${siteName}`
    const description = limitText(
      'Landing de AlgoritmoT para empresas que quieren crecer con más orden, una metodología clara y una conversación inicial enfocada en resultados.',
      180,
    )
    const imageCandidate = state.design.logoUrl || state.design.logoFooterUrl || '/assets/og-default.svg'
    const imageUrl = toAbsoluteUrl(baseUrl, imageCandidate)
    const faviconUrl = state.design.faviconUrl ? toAbsoluteUrl(baseUrl, state.design.faviconUrl) : undefined

    applySeoPayload({
      title: limitText(title, 70),
      description,
      canonicalUrl,
      imageUrl,
      robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
      lang: language,
      siteName,
      ogType: 'website',
      twitterCard: 'summary_large_image',
      themeColor: '#09111d',
      faviconUrl,
      schemas: [
        {
          '@type': 'WebPage',
          name: title,
          description,
          url: canonicalUrl,
          inLanguage: language,
        },
        {
          '@type': 'Service',
          name: 'Escalabilidad de negocios',
          provider: {
            '@type': 'Organization',
            name: siteName,
            url: baseUrl,
          },
          areaServed: 'LATAM',
          url: canonicalUrl,
        },
      ],
    })
  }, [language, state.design.faviconUrl, state.design.logoFooterUrl, state.design.logoUrl, state.site.name, state.site.url])

  return (
    <Layout isFocusedFlow>
      <div className="bg-white text-slate-950">
        <section className="scale-hero-section relative overflow-hidden px-6 pb-20 pt-24 md:pb-24 md:pt-30">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            <source src={HERO_VIDEO_URL} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(25,21,24,0.84)_0%,rgba(13,18,28,0.80)_42%,rgba(11,28,49,0.72)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_35%,rgba(247,178,103,0.18),transparent_26%),radial-gradient(circle_at_88%_18%,rgba(59,130,246,0.18),transparent_30%)]" />
          <div className="scale-grid absolute inset-0 opacity-35" />
          <div className="scale-orb scale-orb-one" />
          <div className="scale-orb scale-orb-two" />

          <div className="relative mx-auto max-w-[1320px]">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:items-center">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-[11px] font-black uppercase tracking-[0.28em] text-white/70"
                >
                  AlgoritmoT / Empresas
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.58, delay: 0.05 }}
                  className="mt-7 max-w-5xl text-5xl font-black leading-[0.92] tracking-[-0.055em] text-white md:text-7xl"
                >
                  Si llegaste hasta aquí es porque tu negocio ya te está pidiendo otra velocidad.
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.58, delay: 0.1 }}
                  className="mt-6 max-w-3xl text-lg leading-relaxed text-white/72 md:text-[1.35rem]"
                >
                  Si vienes buscando más estructura para crecer, mejorar la operación, ordenar procesos o preparar a tu equipo para
                  una nueva etapa, aquí encontrarás una ruta práctica para avanzar con claridad.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.16 }}
                  className="mt-9 flex flex-wrap gap-4"
                >
                  <a
                    href="#agenda"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f7b267] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition-transform hover:-translate-y-0.5"
                  >
                    Agendar cita
                    <CalendarDays className="h-4 w-4" />
                  </a>
                  <a
                    href="#metodologia"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/6 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/10"
                  >
                    Ver metodología
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.54, delay: 0.2 }}
                  className="mt-8 flex flex-wrap gap-2.5"
                >
                  {DISCOVERY_PATHS.map((item) => (
                    <span key={item} className="scale-discovery-pill">
                      {item}
                    </span>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.54, delay: 0.24 }}
                  className="mt-10 grid gap-3 border-t border-white/10 pt-6 md:grid-cols-3"
                >
                  {HERO_PILLARS.map((item) => (
                    <div key={item} className="py-3 text-sm font-semibold leading-relaxed text-white/82 md:pr-6 md:not-last:border-r md:not-last:border-white/10">
                      {item}
                    </div>
                  ))}
                </motion.div>
              </div>

              <motion.aside
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.14 }}
                className="border-l border-white/12 pl-6 lg:pl-10"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#f7b267]">Dónde solemos entrar</div>
                <h2 className="mt-4 max-w-md text-2xl font-black leading-tight text-white md:text-[2rem]">
                  El crecimiento empieza por un punto de tensión que ya se volvió evidente.
                </h2>

                <div className="mt-7 space-y-5">
                  {ENTRY_POINTS.map((item, index) => (
                    <div key={item.title} className="border-b border-white/10 pb-5 last:border-b-0 last:pb-0">
                      <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/35">Frente {index + 1}</div>
                      <div className="mt-2 text-xl font-black text-white">{item.title}</div>
                      <p className="mt-2 max-w-md text-base leading-relaxed text-white/68">{item.body}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-6 max-w-md text-sm font-medium leading-relaxed text-white/78">
                  El objetivo es ayudarte a convertir esa fricción en una ruta clara para crecer con mejor estructura.
                </p>
              </motion.aside>
            </div>
          </div>
        </section>

        <section id="metodologia" className="bg-white px-6 py-18 md:py-24">
          <div className="mx-auto max-w-[1320px]">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-400">Metodología</div>
                <h2 className="mt-4 max-w-2xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-slate-950 md:text-6xl">
                  Acompañamos el crecimiento con una secuencia clara y ejecutable.
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
                  Trabajamos contigo para aterrizar decisiones, alinear al equipo y mover un primer frente de escalabilidad con foco
                  real en operación y resultados.
                </p>

                <div className="mt-10 grid gap-4">
                  {[
                    'Menos dispersión y más foco desde el inicio.',
                    'Ruta compartida entre dirección, operación y ejecución.',
                    'Trabajo cercano para que el cambio se sostenga.',
                  ].map((item) => (
                    <div key={item} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-5 text-sm font-semibold leading-relaxed text-slate-700 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.35)]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-5">
                {METHODOLOGY.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <motion.article
                      key={step.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.22 }}
                      transition={{ duration: 0.44, delay: index * 0.06 }}
                      className="rounded-[1.85rem] border border-slate-200 bg-white p-6 shadow-[0_26px_64px_-42px_rgba(15,23,42,0.35)] md:p-7"
                    >
                      <div className="flex flex-col gap-5 md:flex-row">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">{step.number}</div>
                          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{step.title}</h3>
                          <p className="mt-4 text-base leading-relaxed text-slate-600">{step.body}</p>
                          <div className="mt-5 flex flex-wrap gap-2.5">
                            {step.outcomes.map((outcome) => (
                              <span key={outcome} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                                {outcome}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.article>
                  )
                })}
              </div>
            </div>

            <div id="clientes" className="mt-16 md:mt-20">
              <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
                <div className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-400">Clientes</div>
                <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                  Empresas e instituciones que han confiado en nuestro acompañamiento.
                </h3>
                <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-600">
                  Cada proyecto tiene una realidad distinta, pero todos parten de la misma intención: crecer con más estructura,
                  mejores decisiones y una ejecución más consistente.
                </p>
              </div>

              <div className="scale-clients-marquee mt-8 overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white px-4 py-5 md:px-6">
                <div className="scale-clients-marquee-track flex w-max items-stretch gap-4 md:gap-5">
                  {clientRail.map((client, index) => (
                    <article
                      key={`${client.name}-${index}`}
                      className="flex min-h-[102px] min-w-[220px] items-center gap-4 rounded-[1.35rem] border border-slate-200 bg-white px-5 py-4"
                      aria-label={client.name}
                    >
                      <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 p-2">
                        <img src={client.logoUrl} alt={`Logo de ${client.name}`} className="h-full w-full object-contain" loading="lazy" />
                      </div>
                      <p className="text-sm font-bold leading-tight text-slate-700">{client.name}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="agenda" className="border-y border-[#eee3cf] bg-[#f6eedf] px-6 py-18 md:py-24">
          <div className="mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-[minmax(0,0.74fr)_minmax(0,1.26fr)] lg:items-stretch">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-400">Agendar cita</div>
              <h2 className="mt-4 max-w-xl text-4xl font-black leading-[0.94] tracking-[-0.045em] text-slate-950 md:text-6xl">
                Reservemos una conversación para aterrizar tu primer frente de escalabilidad.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                En la llamada revisamos dónde está hoy el cuello de botella, qué caso vale la pena priorizar primero y cómo se puede
                traducir en una ruta clara para tu equipo.
              </p>

              <div className="mt-8 space-y-4">
                {AGENDA_POINTS.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.32)]">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#d9752d]" />
                    <p className="text-sm font-semibold leading-relaxed text-slate-700">{item}</p>
                  </div>
                ))}
              </div>

              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-transform hover:-translate-y-0.5"
              >
                Abrir agenda en una pestaña
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <div className="lg:col-span-12">
              <div className="bg-white p-8 md:p-12 border border-slate-200 shadow-2xl rounded-[2rem]">
                <BookingSystem />
              </div>
            </div>
          </div>
        </section>

        <section id="casos" className="bg-[#0c1727] px-6 py-18 md:py-24">
          <div className="mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-[minmax(0,0.74fr)_minmax(0,1.26fr)] lg:items-start">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.32em] text-white/45">Después de agendar</div>
              <h2 className="mt-4 max-w-2xl text-4xl font-black leading-[0.94] tracking-[-0.045em] text-white md:text-6xl">
                Revisa cómo podríamos empezar antes de sentarnos a hablar.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
                Usa el generador de casos para convertir una inquietud general en un punto de partida mucho más claro. Así llegas a
                la conversación con mejor enfoque y con un caso mejor formulado.
              </p>

              <div className="mt-8 border-t border-white/10 pt-6">
                <div className="text-sm font-black uppercase tracking-[0.22em] text-[#f7b267]">Ideas para empezar</div>
                <div className="mt-5 space-y-3">
                  {STARTER_CASES.map((item) => (
                    <div key={item} className="flex items-start gap-3 border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#f7b267]" />
                      <p className="text-sm font-medium leading-relaxed text-white/82">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/generador-casos"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f7b267] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition-transform hover:-translate-y-0.5"
                  >
                    Ir al generador
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href={CASE_GENERATOR_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/6 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white"
                  >
                    Abrir versión publicada
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#0f1a2b] px-5 py-6 shadow-[0_36px_100px_-44px_rgba(2,6,23,0.82)] md:px-6">
              <div className="text-[11px] font-black uppercase tracking-[0.3em] text-white/45">Generador de casos</div>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-white md:text-[3rem]">¿Cuál es tu industria?</h3>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/62">
                Elige el sector que más se parezca a tu realidad y empieza a aterrizar un caso de escalabilidad para conversar con
                más claridad.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {GENERATOR_SECTORS.map((sector) => (
                  <div key={sector} className="border border-white/12 bg-[#0e1a30] px-5 py-4 text-sm font-medium text-white/84">
                    {sector}
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 md:grid-cols-3">
                {[
                  { label: '1', title: 'Industria', body: 'Escoge el contexto donde opera tu negocio.' },
                  { label: '2', title: 'Proceso', body: 'Define el frente que hoy más valor puede mover.' },
                  { label: '3', title: 'Madurez', body: 'Ubica el punto de partida para plantear una ruta realista.' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f7b267]">{item.label}</div>
                    <div className="mt-2 text-base font-black text-white">{item.title}</div>
                    <p className="mt-2 text-sm leading-relaxed text-white/62">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-18 md:py-22">
          <div className="mx-auto max-w-[1320px] border-t border-slate-200 pt-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-400">CTA</div>
                <h2 className="mt-3 text-3xl font-black leading-[0.96] tracking-[-0.04em] text-slate-950 md:text-5xl">
                  Agenda la conversación y llega con un caso mejor definido.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                  La cita y el generador están pensados para darte un punto de partida concreto, útil y accionable desde el primer
                  contacto.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="#agenda"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-transform hover:-translate-y-0.5"
                >
                  Reservar cita
                  <CalendarDays className="h-4 w-4" />
                </a>
                <a
                  href="#casos"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950"
                >
                  Ver generador
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  )
}
