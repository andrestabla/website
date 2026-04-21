import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  type LucideIcon,
  ScanSearch,
  Sparkles,
  TrendingUp,
  Users2,
  Workflow,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { useCMS } from '../admin/context/CMSContext'
import { useLanguage } from '../context/LanguageContext'
import { applySeoPayload, limitText, normalizeBaseUrl, toAbsoluteUrl } from '../lib/seo'

const BOOKING_URL =
  'https://outlook.office.com/bookwithme/user/9cf8e211b713432295f17969db08b402@algoritmot.com/meetingtype/wZWn6TXuxkyDuN51IAvifQ2?anonymous&ismsaljsauthenabled&ep=mLinkFromTile'

const CASE_GENERATOR_URL = 'https://www.algoritmot.com/generador-casos'

const SEARCH_TERMS = [
  'marketing de revisión de productos',
  'services for business',
  'quiero emprender un negocio',
  'quiero iniciar mi propio negocio',
  'ayuda del gobierno para pequeños negocios',
  'marketing de productos',
  'employee development programs',
  'artificial intelligence in business',
  'control de calidad',
  'digital transformation online',
]

type MethodologyStep = {
  id: string
  icon: LucideIcon
  eyebrow: string
  title: string
  body: string
  outcomes: string[]
}

const METHODOLOGY: MethodologyStep[] = [
  {
    id: 'leer-negocio',
    icon: ScanSearch,
    eyebrow: '01. Leemos el negocio',
    title: 'Convertimos la intención de búsqueda en una oportunidad concreta',
    body: 'Partimos del contexto real: ventas, operación, talento, financiamiento, calidad o transformación digital. Primero entendemos dónde está la fricción y qué resultado movería el negocio.',
    outcomes: ['Diagnóstico breve', 'Objetivo priorizado', 'Señales de impacto tempranas'],
  },
  {
    id: 'priorizar',
    icon: Workflow,
    eyebrow: '02. Diseñamos la ruta',
    title: 'Priorizamos un caso con el equipo y una hoja de ruta ejecutable',
    body: 'No proponemos una lista infinita de ideas. Seleccionamos un frente rentable, definimos responsables, dependencias y el entregable mínimo para empezar a escalar sin improvisación.',
    outcomes: ['Ruta por fases', 'Roles claros', 'Menos riesgo de ejecución'],
  },
  {
    id: 'activar',
    icon: BrainCircuit,
    eyebrow: '03. Activamos capacidades',
    title: 'Integramos proceso, equipo y tecnología en una sola conversación',
    body: 'Desde AlgoritmoT co-creamos con tu equipo automatizaciones, rediseño de procesos, criterios de calidad y herramientas prácticas para que el cambio sí ocurra en la operación.',
    outcomes: ['Implementación acompañada', 'IA con criterio de negocio', 'Cambio adoptable'],
  },
  {
    id: 'escalar',
    icon: TrendingUp,
    eyebrow: '04. Escalamos con datos',
    title: 'Medimos, corregimos y abrimos el siguiente frente de crecimiento',
    body: 'Lo importante no es lanzar un proyecto, sino repetir una forma de crecer. Medimos qué mejoró y dejamos una base clara para el siguiente caso de escalabilidad.',
    outcomes: ['Métricas visibles', 'Aprendizajes reutilizables', 'Escala sostenida'],
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

const STARTER_CASES = [
  'Quiero escalar sin depender de tareas manuales.',
  'Necesito ordenar procesos antes de meter más tecnología.',
  'Quiero descubrir dónde sí tiene sentido usar IA en mi negocio.',
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
      'Landing de AlgoritmoT para empresas que quieren escalar con una metodología práctica: diagnóstico, priorización, agenda embebida y generador de casos.',
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
      themeColor: '#0f172a',
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
      <div className="scale-landing-theme">
        <section className="relative overflow-hidden px-6 pb-18 pt-24 md:pb-24 md:pt-32">
          <div className="scale-grid absolute inset-0 opacity-40" />
          <div className="scale-orb scale-orb-one" />
          <div className="scale-orb scale-orb-two" />

          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1.15fr)_440px] lg:items-end">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-white/72"
              >
                <Sparkles className="h-4 w-4 text-[#f7b267]" />
                AlgoritmoT / Empresas
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.06 }}
                className="mt-7 max-w-5xl text-5xl font-black leading-[0.92] tracking-[-0.05em] text-white md:text-7xl"
              >
                Si llegaste hasta aquí es porque tu negocio ya te está pidiendo otra velocidad.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.12 }}
                className="mt-6 max-w-3xl text-lg leading-relaxed text-white/72 md:text-xl"
              >
                Si buscaste cómo emprender, transformar, financiar, mejorar calidad o integrar inteligencia artificial en tu empresa,
                esta landing existe para eso: desde AlgoritmoT te acompañamos y construimos con tu equipo lo necesario para escalar
                en estos nuevos tiempos.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18 }}
                className="mt-10 flex flex-wrap gap-4"
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
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/16 bg-white/6 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/10"
                >
                  Ver metodología
                  <ArrowRight className="h-4 w-4" />
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.24 }}
                className="mt-12 grid gap-4 md:grid-cols-3"
              >
                {[
                  'Escalabilidad pensada desde negocio, no desde moda.',
                  'Ruta co-creada con tu equipo y prioridades reales.',
                  'IA, procesos y adopción operativa en una misma mesa.',
                ].map((item) => (
                  <div key={item} className="scale-glass-card rounded-[1.6rem] border border-white/10 px-5 py-5 text-sm font-semibold leading-relaxed text-white/78">
                    {item}
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.aside
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, delay: 0.18 }}
              className="scale-panel rounded-[2rem] border border-white/10 p-6 md:p-8"
            >
              <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.28em] text-[#f7b267]">
                <Users2 className="h-4 w-4" />
                Señales de intención
              </div>
              <p className="mt-4 text-lg font-semibold leading-relaxed text-white">
                Estas búsquedas nos dicen que no estás buscando solo una herramienta: estás buscando una forma viable de crecer.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {SEARCH_TERMS.map((term) => (
                  <span key={term} className="scale-word-pill">
                    {term}
                  </span>
                ))}
              </div>
            </motion.aside>
          </div>
        </section>

        <section id="metodologia" className="px-6 py-18 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#9fb3c8]">Metodología de escalabilidad</div>
                <h2 className="mt-4 max-w-2xl text-4xl font-black leading-[1] tracking-[-0.04em] text-white md:text-6xl">
                  Escalar no es correr más. Es resolver mejor lo que hoy frena al negocio.
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#cad5e2]">
                  Por eso trabajamos contigo en una secuencia clara: entender, priorizar, activar y escalar. Sin humo, sin
                  proyectos gigantes que nadie adopta y sin separar estrategia de ejecución.
                </p>

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  {[
                    'Diagnóstico enfocado en operación, ventas, calidad o financiamiento.',
                    'Ruta mínima viable para empezar con foco y evidencia.',
                    'Trabajo con tu equipo para que el cambio no quede solo en consultoría.',
                    'Siguiente paso definido para repetir el crecimiento con menos fricción.',
                  ].map((item) => (
                    <div key={item} className="scale-soft-card rounded-[1.4rem] border border-white/8 p-5 text-sm font-medium leading-relaxed text-[#e2e8f0]">
                      <CheckCircle2 className="mb-3 h-5 w-5 text-[#f7b267]" />
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
                      key={step.id}
                      initial={{ opacity: 0, y: 26 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{ duration: 0.45, delay: index * 0.06 }}
                      className="scale-cut-card rounded-[1.8rem] border border-white/10 p-6 md:p-7"
                    >
                      <div className="flex flex-col gap-5 md:flex-row md:items-start">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f7b267]/14 text-[#f7b267]">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-[0.3em] text-[#f7b267]">{step.eyebrow}</div>
                          <h3 className="mt-3 text-2xl font-black tracking-tight text-white">{step.title}</h3>
                          <p className="mt-4 text-base leading-relaxed text-[#d6dfeb]">{step.body}</p>
                          <div className="mt-5 flex flex-wrap gap-2.5">
                            {step.outcomes.map((outcome) => (
                              <span key={outcome} className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/70">
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
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#9fb3c8]">Clientes en AlgoritmoT</div>
                  <h3 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                    Organizaciones que ya han confiado en nosotros
                  </h3>
                </div>
                <p className="max-w-2xl text-sm leading-relaxed text-[#cad5e2] md:text-base">
                  Reunimos los logos activos que hoy aparecen cargados en el ecosistema del sitio para mostrar una base diversa de
                  instituciones y empresas acompañadas por AlgoritmoT.
                </p>
              </div>

              <div className="scale-clients-marquee mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/4 px-4 py-5 md:px-6">
                <div className="scale-clients-marquee-track flex w-max items-stretch gap-4 md:gap-5">
                  {clientRail.map((client, index) => (
                    <article
                      key={`${client.name}-${index}`}
                      className="flex min-h-[102px] min-w-[220px] items-center gap-4 rounded-[1.4rem] border border-white/10 bg-[#091321] px-5 py-4"
                      aria-label={client.name}
                    >
                      <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/96 p-2">
                        <img src={client.logoUrl} alt={`Logo de ${client.name}`} className="h-full w-full object-contain" loading="lazy" />
                      </div>
                      <p className="text-sm font-bold leading-tight text-white/84">{client.name}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="agenda" className="border-y border-white/8 bg-[#f5ede0] px-6 py-18 text-slate-950 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">Agendar cita</div>
              <h2 className="mt-4 text-4xl font-black leading-[0.96] tracking-[-0.04em] md:text-6xl">
                Reservemos una conversación para aterrizar tu primer frente de escalabilidad.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-700">
                En la llamada revisamos dónde está hoy el cuello de botella, qué caso vale la pena priorizar primero y cómo se vería
                una ruta realista con tu equipo.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  'Espacio pensado para equipos que quieren claridad, no otra reunión genérica.',
                  'Perfecto para validar si el siguiente paso es proceso, tecnología, formación o IA.',
                  'Saldrás con una hipótesis de arranque y criterio para decidir.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#c26c2f]" />
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

            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.35)]">
              <iframe
                src={BOOKING_URL}
                title="Agenda una cita con AlgoritmoT"
                loading="lazy"
                className="min-h-[720px] w-full rounded-[1.35rem] border border-slate-100 bg-white"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </section>

        <section id="casos" className="px-6 py-18 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#9fb3c8]">Después de agendar</div>
              <h2 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.04em] text-white md:text-6xl">
                Revisa cómo podríamos empezar antes de sentarnos a hablar.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#cad5e2]">
                Te invitamos a usar el generador de casos para visualizar un escenario de arranque. Así llegas a la cita con un
                problema mejor formulado, un proceso candidateado y una conversación mucho más útil.
              </p>

              <div className="mt-8 rounded-[1.8rem] border border-white/10 bg-white/5 p-6">
                <div className="text-sm font-black uppercase tracking-[0.22em] text-[#f7b267]">Ideas para empezar</div>
                <div className="mt-5 space-y-3">
                  {STARTER_CASES.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-[1rem] border border-white/8 bg-[#0d1727] px-4 py-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#f7b267]" />
                      <p className="text-sm font-medium leading-relaxed text-white/80">{item}</p>
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

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#091321] p-3 shadow-[0_36px_100px_-44px_rgba(2,6,23,0.78)]">
              <iframe
                src={CASE_GENERATOR_URL}
                title="Generador de casos de AlgoritmoT"
                loading="lazy"
                className="min-h-[760px] w-full rounded-[1.35rem] border border-white/10 bg-white"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </section>

        <section className="px-6 pb-18 pt-2 md:pb-24">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[2.2rem] border border-white/10 bg-[linear-gradient(135deg,#f7b267_0%,#f1d5a5_46%,#efe9dd_100%)] px-6 py-8 text-slate-950 shadow-[0_36px_120px_-50px_rgba(247,178,103,0.6)] md:px-10 md:py-10">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-700">CTA final</div>
                  <h2 className="mt-3 text-3xl font-black leading-[0.96] tracking-[-0.04em] md:text-5xl">
                    Agenda la conversación y llega con un caso listo para mover.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700 md:text-lg">
                    Entre la cita y el generador de casos, esta landing ya te deja el punto de partida para empezar a escalar con más
                    foco y menos ruido.
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
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-950/12 bg-white/70 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950"
                  >
                    Ver generador
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  )
}
