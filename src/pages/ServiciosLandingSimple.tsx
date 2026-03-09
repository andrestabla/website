import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Clock3, Handshake, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCMS } from '../admin/context/CMSContext'
import { ContactForm } from '../components/forms/ContactForm'
import { Layout } from '../components/layout/Layout'
import { servicesDetail } from '../data/details'

type PlainServiceCopy = {
    inSimpleWords: string
    businessBenefit: string
    idealWhen: string
    outcomes: string[]
}

const SIMPLE_SERVICE_COPY: Record<string, PlainServiceCopy> = {
    'captura-adn': {
        inSimpleWords: 'Nos sentamos contigo para entender cómo funciona hoy tu empresa y qué te está frenando.',
        businessBenefit: 'Evitas invertir a ciegas y priorizas solo lo que realmente mejora ventas, tiempos o costos.',
        idealWhen: 'Sientes que debes modernizarte, pero no tienes claridad de por dónde empezar.',
        outcomes: [
            'Mapa claro de prioridades',
            'Plan por etapas fácil de ejecutar',
            'Decisiones con menos riesgo',
        ],
    },
    'mapeo-procesos': {
        inSimpleWords: 'Ordenamos tus procesos para que todos trabajen de forma más simple y consistente.',
        businessBenefit: 'Reduces reprocesos, errores y tiempos muertos en áreas clave del negocio.',
        idealWhen: 'Tu equipo depende de “como cada uno lo hace” y eso genera cuellos de botella.',
        outcomes: [
            'Procesos claros para todo el equipo',
            'Menos retrabajo operativo',
            'Mayor velocidad de respuesta al cliente',
        ],
    },
    'humano-vs-tecnologia': {
        inSimpleWords: 'Definimos qué tareas debe hacer una persona y cuáles conviene automatizar.',
        businessBenefit: 'Tu equipo se enfoca en lo que aporta valor y la tecnología se encarga de lo repetitivo.',
        idealWhen: 'Quieres usar automatización o IA sin perder el control ni afectar la calidad.',
        outcomes: [
            'Roles más claros',
            'Automatización con criterio',
            'Menor riesgo en la operación',
        ],
    },
    'diseno-desarrollo': {
        inSimpleWords: 'Construimos la solución digital que necesitas, desde una idea hasta una versión funcional.',
        businessBenefit: 'Obtienes una herramienta hecha para tu operación, no una plantilla genérica.',
        idealWhen: 'Ya sabes qué resolver y necesitas pasar rápido de la idea a algo usable.',
        outcomes: [
            'Prototipo validado en poco tiempo',
            'Solución adaptada a tu empresa',
            'Visibilidad continua del avance',
        ],
    },
    implementacion: {
        inSimpleWords: 'Ponemos la solución en marcha con tu equipo, cuidando que el cambio funcione en la práctica.',
        businessBenefit: 'Aceleras la adopción y evitas interrupciones que afecten clientes o ingresos.',
        idealWhen: 'Tienes una herramienta lista, pero te preocupa que la implementación falle.',
        outcomes: [
            'Arranque controlado',
            'Capacitación por rol',
            'Soporte cercano en las primeras semanas',
        ],
    },
    'seguimiento-mejora': {
        inSimpleWords: 'Medimos resultados y ajustamos continuamente para que la solución siga generando valor.',
        businessBenefit: 'No te quedas con un sistema estático: mejoras mes a mes según datos reales.',
        idealWhen: 'Quieres asegurar que la inversión siga rindiendo y evolucionando con tu negocio.',
        outcomes: [
            'Indicadores de desempeño claros',
            'Plan de mejoras continuo',
            'Evolución constante sin improvisar',
        ],
    },
}

const BUSINESS_RESULTS = [
    {
        title: 'Menos costos ocultos',
        description: 'Detectamos tareas repetitivas y errores operativos que hoy consumen tiempo y presupuesto.',
    },
    {
        title: 'Equipos más enfocados',
        description: 'Tu gente trabaja en decisiones importantes, no en apagar incendios todos los días.',
    },
    {
        title: 'Mejor experiencia para clientes',
        description: 'Procesos más ordenados se traducen en respuestas más rápidas y servicio más confiable.',
    },
    {
        title: 'Crecimiento con control',
        description: 'Escalas con una base sólida, sin depender de esfuerzos manuales difíciles de sostener.',
    },
]

const WORKFLOW_STEPS = [
    {
        title: '1. Escuchamos tu contexto',
        description: 'Partimos de tus metas de negocio, no de herramientas o modas.',
    },
    {
        title: '2. Definimos prioridades',
        description: 'Te mostramos qué hacer primero para obtener resultados visibles en menor tiempo.',
    },
    {
        title: '3. Ejecutamos contigo',
        description: 'Diseñamos, implementamos y acompañamos a tu equipo durante todo el proceso.',
    },
    {
        title: '4. Medimos y mejoramos',
        description: 'Revisamos resultados y ajustamos para mantener el impacto en el tiempo.',
    },
]

const FAQ = [
    {
        question: '¿Necesito tener un área de tecnología para empezar?',
        answer: 'No. Nosotros traducimos lo técnico a decisiones de negocio para que puedas avanzar con claridad.',
    },
    {
        question: '¿Esto sirve para empresas pequeñas o solo grandes compañías?',
        answer: 'Funciona para ambos casos. Ajustamos el alcance según el tamaño, etapa y prioridades de tu empresa.',
    },
    {
        question: '¿Cuándo se empiezan a ver resultados?',
        answer: 'Desde las primeras fases se identifican mejoras rápidas en orden, tiempos y foco operativo.',
    },
    {
        question: '¿Qué pasa después de implementar?',
        answer: 'Seguimos contigo para medir desempeño, corregir desviaciones y mantener la mejora continua.',
    },
]

function getPlainServiceCopy(slug: string, fallbackDescription: string): PlainServiceCopy {
    return (
        SIMPLE_SERVICE_COPY[slug] ?? {
            inSimpleWords: fallbackDescription,
            businessBenefit: 'Te ayuda a tomar decisiones con más claridad y menos riesgo.',
            idealWhen: 'Quieres mejorar resultados sin afectar la operación del día a día.',
            outcomes: ['Más orden', 'Más foco', 'Más continuidad'],
        }
    )
}

export function ServiciosLandingSimple() {
    const { state } = useCMS()
    const email = state.site.contactEmail || 'hola@algoritmot.com'
    const linkedin = state.site.linkedin || 'https://www.linkedin.com'
    const companyName = state.site.name || 'tu compañía'
    const plainServices = servicesDetail.map((service) => ({
        ...service,
        plain: getPlainServiceCopy(service.slug, service.description),
    }))

    return (
        <Layout>
            <div className="services-landing-theme">
                <section className="relative overflow-hidden px-6 pt-20 pb-16 md:pt-28 md:pb-24">
                    <div className="pointer-events-none absolute inset-0 services-grid-pattern opacity-35" />
                    <div className="pointer-events-none absolute left-[8%] top-20 h-28 w-28 rounded-full bg-emerald-200/40 blur-2xl services-float-slow" />
                    <div className="pointer-events-none absolute right-[10%] top-32 h-36 w-36 rounded-full bg-amber-200/40 blur-2xl services-float-slow-delay" />

                    <div className="relative mx-auto max-w-6xl">
                        <motion.p
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.8 }}
                            transition={{ duration: 0.45 }}
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-700/20 bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-900"
                        >
                            <Sparkles className="h-4 w-4" />
                            Servicios explicados sin tecnicismos
                        </motion.p>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.7 }}
                            transition={{ duration: 0.55, delay: 0.08 }}
                            className="services-landing-display mt-6 max-w-4xl text-5xl leading-[0.95] text-slate-900 md:text-7xl"
                        >
                            Te ayudamos a modernizar tu empresa paso a paso, con decisiones simples y enfocadas en resultados.
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.7 }}
                            transition={{ duration: 0.55, delay: 0.14 }}
                            className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-700 md:text-xl"
                        >
                            Diseñamos e implementamos mejoras reales para {companyName}: menos fricción operativa, más orden interno
                            y un mejor servicio para tus clientes.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.7 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="mt-10 flex flex-wrap gap-4"
                        >
                            <a
                                href="#servicios-explicados"
                                className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-emerald-800 hover:border-emerald-800"
                            >
                                Ver servicios
                                <ArrowRight className="h-4 w-4" />
                            </a>
                            <a
                                href="#contacto-simple"
                                className="inline-flex items-center gap-2 border border-slate-300 bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-800 transition-colors hover:border-slate-900 hover:text-slate-900"
                            >
                                Quiero asesoría
                            </a>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.5, delay: 0.24 }}
                            className="mt-12 grid gap-4 md:grid-cols-3"
                        >
                            {[
                                'Hablamos en lenguaje de negocio',
                                'Priorizamos impacto antes que complejidad',
                                'Acompañamos desde diagnóstico hasta mejora',
                            ].map((line) => (
                                <div key={line} className="services-card-shadow border border-slate-200 bg-white/95 px-5 py-4">
                                    <p className="text-sm font-semibold text-slate-700">{line}</p>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                <section id="servicios-explicados" className="px-6 py-20">
                    <div className="mx-auto max-w-6xl">
                        <div className="max-w-3xl">
                            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-900">Servicios de punta a punta</p>
                            <h2 className="services-landing-display mt-4 text-4xl text-slate-900 md:text-6xl">
                                Qué hacemos y cómo beneficia a tu empresa
                            </h2>
                            <p className="mt-5 text-lg text-slate-700">
                                Cada servicio está explicado en tres preguntas simples: qué es, cómo te ayuda y cuándo te conviene.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-6 md:grid-cols-2">
                            {plainServices.map((service, index) => {
                                const Icon = service.icon
                                return (
                                    <motion.article
                                        key={service.slug}
                                        initial={{ opacity: 0, y: 24 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, amount: 0.2 }}
                                        transition={{ duration: 0.45, delay: index * 0.06 }}
                                        className="services-card-shadow border border-slate-200 bg-white p-7 md:p-8"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center border border-slate-200 bg-emerald-50 text-emerald-900">
                                                    {Icon ? <Icon className="h-6 w-6 stroke-[1.75]" /> : <CheckCircle2 className="h-6 w-6" />}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Servicio {index + 1}</p>
                                                    <h3 className="mt-1 text-2xl font-black leading-tight text-slate-900">{service.title}</h3>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-7 space-y-4 text-sm text-slate-700">
                                            <p>
                                                <span className="font-bold text-slate-900">En palabras simples:</span> {service.plain.inSimpleWords}
                                            </p>
                                            <p>
                                                <span className="font-bold text-slate-900">Beneficio para tu compañía:</span> {service.plain.businessBenefit}
                                            </p>
                                            <p>
                                                <span className="font-bold text-slate-900">Te conviene si hoy:</span> {service.plain.idealWhen}
                                            </p>
                                        </div>

                                        <div className="mt-6 border-t border-slate-200 pt-5">
                                            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Resultados esperados</p>
                                            <ul className="mt-3 space-y-2">
                                                {service.plain.outcomes.map((outcome) => (
                                                    <li key={outcome} className="flex items-center gap-2 text-sm text-slate-700">
                                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                                                        {outcome}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <Link
                                            to={`/servicios/${service.slug}`}
                                            className="mt-6 inline-flex items-center gap-2 border border-slate-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700 transition-colors hover:border-emerald-700 hover:text-emerald-800"
                                        >
                                            Ver detalle del servicio
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </motion.article>
                                )
                            })}
                        </div>
                    </div>
                </section>

                <section className="px-6 pb-20">
                    <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.1fr_1fr]">
                        <div className="services-card-shadow border border-slate-200 bg-white p-7 md:p-9">
                            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-900">Lo que puedes esperar</p>
                            <h2 className="services-landing-display mt-4 text-4xl text-slate-900 md:text-5xl">
                                Beneficios directos para el negocio
                            </h2>
                            <div className="mt-7 space-y-5">
                                {BUSINESS_RESULTS.map((item) => (
                                    <div key={item.title} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                                        <h3 className="text-xl font-black text-slate-900">{item.title}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="services-card-shadow border border-slate-200 bg-slate-900 p-7 text-white md:p-9">
                            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-200">Cómo trabajamos</p>
                            <div className="mt-6 space-y-5">
                                {WORKFLOW_STEPS.map((step) => (
                                    <div key={step.title}>
                                        <h3 className="text-lg font-black text-white">{step.title}</h3>
                                        <p className="mt-1 text-sm leading-relaxed text-slate-200">{step.description}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(124px,1fr))] gap-3">
                                <div className="border border-white/15 bg-white/5 p-3 text-center">
                                    <Clock3 className="mx-auto h-5 w-5 text-emerald-200" />
                                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] leading-tight break-words whitespace-normal text-slate-300">Rapidez</p>
                                </div>
                                <div className="border border-white/15 bg-white/5 p-3 text-center">
                                    <Handshake className="mx-auto h-5 w-5 text-emerald-200" />
                                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] leading-tight break-words whitespace-normal text-slate-300">Acompañamiento</p>
                                </div>
                                <div className="border border-white/15 bg-white/5 p-3 text-center">
                                    <ShieldCheck className="mx-auto h-5 w-5 text-emerald-200" />
                                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] leading-tight break-words whitespace-normal text-slate-300">Control</p>
                                </div>
                            </div>

                            <div className="mt-10">
                                <Link
                                    to="/caso-transversal"
                                    className="inline-flex items-center gap-2 border border-emerald-400/30 bg-emerald-400/10 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200 transition-all hover:bg-emerald-400/20 hover:border-emerald-400/50"
                                >
                                    Ver caso de éxito
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="px-6 pb-20">
                    <div className="mx-auto max-w-6xl services-card-shadow border border-slate-200 bg-white p-7 md:p-10">
                        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-900">Preguntas frecuentes</p>
                        <h2 className="services-landing-display mt-4 text-4xl text-slate-900 md:text-5xl">
                            Respuestas claras para tomar decisiones
                        </h2>
                        <div className="mt-8 grid gap-5 md:grid-cols-2">
                            {FAQ.map((item) => (
                                <article key={item.question} className="border border-slate-200 bg-slate-50 p-5">
                                    <h3 className="text-lg font-black text-slate-900">{item.question}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-700">{item.answer}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="contacto-simple" className="px-6 pb-24">
                    <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.95fr_1.05fr]">
                        <div className="services-card-shadow border border-slate-200 bg-white p-7 md:p-10">
                            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-900">Hablemos de tu caso</p>
                            <h2 className="services-landing-display mt-4 text-4xl text-slate-900 md:text-5xl">
                                Cuéntanos qué quieres mejorar
                            </h2>
                            <p className="mt-5 text-sm leading-relaxed text-slate-700">
                                Te ayudamos a definir el mejor punto de inicio según tus objetivos de negocio y tu contexto actual.
                            </p>

                            <div className="mt-7 space-y-4 border-t border-slate-200 pt-6">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Canales directos</p>
                                <a className="block text-sm font-semibold text-slate-800 hover:text-emerald-800" href={`mailto:${email}`}>
                                    {email}
                                </a>
                                <a className="block text-sm font-semibold text-slate-800 hover:text-emerald-800" href={linkedin} target="_blank" rel="noreferrer">
                                    LinkedIn de {companyName}
                                </a>
                            </div>
                        </div>

                        <div className="services-card-shadow border border-slate-200 bg-white p-7 md:p-10">
                            <ContactForm context="general" />
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    )
}
