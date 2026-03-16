import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRight, 
  X, 
  Clock3, 

  UserRound, 
  AlertTriangle, 
  Sparkles, 
  Check, 
  ChevronDown 
} from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { ContactForm } from '../components/forms/ContactForm'

// --- Types & Data ---
const FAQ_ITEMS = [
  {
    question: '¿Necesito saber programar?',
    answer: 'No. El enfoque del webinar y de la metodología es 100% no-code (sin código). Nos enfocamos en la lógica operativa, la estrategia y el uso de herramientas visuales asistidas por IA.'
  },
  {
    question: '¿Me van a vender algo durante el webinar?',
    answer: 'La sesión es 100% de valor práctico y análisis real. Al cierre, te presentaré de forma transparente cómo podemos seguir trabajando juntos si decides aplicar la metodología completa ("Hazlo tú mismo" o "Algoritmo T lo hace por ti").'
  },
  {
    question: '¿Quedará grabado?',
    answer: 'Compartiremos el material clave con las personas registradas que asistan. Te recomendamos estar en vivo para resolver tus dudas específicas sobre tu caso.'
  },
  {
    question: '¿Qué pasa después de registrarme?',
    answer: 'Recibirás un correo de confirmación y acceso. Días antes te enviaremos una guía rápida para que prepares el "caso real" que te gustaría automatizar o sistematizar.'
  }
]

const BLOQUEOS = [
  {
    title: 'Exceso de teoría',
    description: 'Consumes mucho contenido en redes y cursos, pero logras poco avance o construcción real para tu caso.'
  },
  {
    title: 'Parálisis por análisis',
    description: 'Hay demasiadas herramientas en el mercado. Cuesta elegir cuál combina mejor con tu reto sin perder tiempo.'
  },
  {
    title: 'Dependencia técnica',
    description: 'Sigues dependiendo de terceros o del área de TI para resolver flujos que ya podrías solucionar tú mismo.'
  },
  {
    title: 'Fuga de tiempo',
    description: 'Tus procesos manuales siguen consumiendo tiempo valioso (comercial, operativo o analítico) que podrías delegar.'
  }
]

// --- Subcomponents ---

function CountdownBar() {
  return (
    <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-6 text-center shadow-lg backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        <Clock3 className="w-4 h-4 animate-pulse" />
        <span className="text-xs sm:text-sm font-black uppercase tracking-[0.14em]">
          Webinar Gratuito en Vivo · 24 de marzo de 2026 · 6:00 p. m. COT
        </span>
      </div>
    </div>
  )
}

function SectionHeader({ eyebrow, title, subtitle, light = false }: { eyebrow: string; title: string; subtitle?: string; light?: boolean }) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-16">
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`text-xs font-black uppercase tracking-[0.3em] mb-4 ${light ? 'text-cyan-400' : 'text-cyan-600'}`}
      >
        {eyebrow}
      </motion.p>
      <motion.h2 
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className={`text-3xl md:text-5xl font-black tracking-tight mb-6 leading-[0.95] ${light ? 'text-white' : 'text-slate-900'}`}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className={`text-lg md:text-xl leading-relaxed ${light ? 'text-slate-300' : 'text-slate-600'}`}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  )
}

// --- Main Page ---

export default function HazloTuMismo() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Floating button state for mobile sticky CTA
  const [showStickyCta, setShowStickyCta] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCta(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <Layout>
      <div className="relative font-sans antialiased text-slate-900 overflow-hidden">
        
        {/* Sticky Registration Bar (Avent style) */}
        <div className="fixed top-0 left-0 w-full z-40">
          <CountdownBar />
        </div>

        {/* --- HERO SECTION --- */}
        <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-20 px-6 bg-[#030712] text-white">
          {/* Futuristic Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full filter blur-3xl animate-pulse animation-delay-2000" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
          </div>

          <div className="relative max-w-5xl mx-auto text-center z-10 flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 mb-8"
            >
              <Sparkles className="h-4 w-4" />
              Webinar Gratuito en Vivo
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-4xl md:text-7xl font-black leading-[0.9] tracking-tighter max-w-4xl mb-6"
            >
              Convierte tus procesos manuales en <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">sistemas útiles</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg md:text-2xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-light"
            >
              Descubre la metodología paso a paso, analiza 5 casos prácticos y detecta qué podrías construir hoy mismo usando <span className="font-semibold text-white">herramientas no-code e IA</span>.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full sm:w-auto"
            >
              <button 
                onClick={() => setIsModalOpen(true)}
                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-8 py-5 text-sm font-black uppercase tracking-[0.18em] text-white shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all hover:scale-[1.02] active:scale-95 duration-200"
              >
                Quiero registrarme gratis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* --- TENSION SECTION (Dolor) --- */}
        <section className="bg-white py-24 px-6 relative border-b border-slate-100">
          <SectionHeader 
            eyebrow="La tensión actual"
            title="Si las herramientas existen, ¿por qué todavía sigues resolviendo todo a mano?"
            subtitle="Porque la mayoría de personas y empresas no necesitan más herramientas. Necesitan una ruta clara para priorizar, combinar y aterrizar lo que ya existe a un caso real."
          />
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-lg text-slate-700 font-semibold border-l-4 border-cyan-500 pl-6 text-left py-4 bg-slate-50">
              El problema no suele ser técnico. <br />
              <span className="text-cyan-600 text-xl font-black">Suele ser metodológico.</span>
            </p>
          </div>
        </section>

        {/* --- BLOQUEOS SECTION --- */}
        <section className="bg-slate-50 py-24 px-6 relative">
          <SectionHeader 
            eyebrow="Los bloqueos"
            title="¿Te suena familiar alguno de estos obstáculos?"
            subtitle="Si te identificas con varios, el webinar te ayudará a salir de la parálisis."
          />
          
          <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2">
            {BLOQUEOS.map((item, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all hover:border-cyan-300 duration-300 flex items-start gap-5"
              >
                <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-50 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-300">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">{item.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* --- PUENTE & METODOLOGIA --- */}
        <section className="bg-slate-950 text-white py-28 px-6 relative">
          <SectionHeader 
            eyebrow="Cambio de paradigma"
            title="No vienes a consumir contenido. Vienes a construir algo útil."
            subtitle="Hazlo tú mismo(a) es una metodología guiada para convertir una necesidad en una automatización o producto digital liviano."
            light
          />

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {[
                'Verás cómo funciona la metodología en la práctica.',
                'Analizaremos 5 casos de uso reales con lógica de ejecución.',
                'Identificarás por dónde empezar sin fricción ni sobrecarga técnica.'
              ].map((text, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl flex items-start gap-4"
                >
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Check className="w-5 h-5" />
                  </div>
                  <p className="text-base text-slate-200 font-medium">{text}</p>
                </motion.div>
              ))}
            </div>

            <div className="border border-white/10 rounded-3xl bg-gradient-to-b from-white/5 to-transparent p-8 md:p-12 text-center">
              <h3 className="text-2xl md:text-3xl font-black mb-4">¿Preparado(a) para el cambio de paradigma?</h3>
              <p className="text-slate-400 mb-8 max-w-xl mx-auto">El webinar es la sesión de entrada para entender y activar el método en tu proyecto.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="group inline-flex items-center justify-center gap-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 text-sm font-black uppercase tracking-[0.18em] transition-all hover:scale-[1.02] active:scale-95 duration-200 shadow-xl"
              >
                Reservar mi lugar
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* --- AUTORIDAD & LOGISTICA --- */}
        <section className="bg-white py-24 px-6 relative border-b border-slate-100">
          <div className="max-w-5xl mx-auto grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-600 mb-4">Quién te guía</p>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-6 leading-[0.95]">
                Una sesión clara, aplicada y orientada a resultados
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Acompaño a personas y empresas a sistematizar procesos con IA y no-code, pasando de la idea a soluciones funcionales con impacto medible.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/60">
                  <div className="p-3 rounded-xl bg-cyan-50 text-cyan-600">
                    <UserRound className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">ProfeTabla</p>
                    <p className="text-sm text-slate-600">Facilitador técnico y estratega No-Code</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/60">
                  <div className="p-3 rounded-xl bg-cyan-50 text-cyan-600">
                    <Clock3 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Duración estimada</p>
                    <p className="text-sm text-slate-600">90 minutos (Teoría aplicada + 5 Casos + Q&A)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/3] rounded-3xl bg-slate-100 overflow-hidden shadow-2xl shadow-cyan-500/5 relative group border border-slate-200">
                <img 
                  src="/assets/landing/tuprofe-mockup.png" 
                  alt="ProfeTabla" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=2070&auto=format&fit=crop'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </section>

        {/* --- FAQ SECTION --- */}
        <section className="bg-slate-50 py-24 px-6 relative">
          <SectionHeader 
            eyebrow="Preguntas frecuentes"
            title="Resolvamos dudas antes de registrarte"
          />
          
          <div className="max-w-2xl mx-auto space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <details key={index} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50">
                  <h3 className="font-black text-slate-900 tracking-tight text-lg">{item.question}</h3>
                  <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                </summary>
                <div className="px-6 pb-6 pt-2 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                  <p>{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* --- FINAL CTA SECTION --- */}
        <section className="bg-[#030712] text-white py-28 px-6 text-center relative">
          <SectionHeader 
            eyebrow="Último paso"
            title="Empieza con el webinar. Sigue con una ruta real de ejecución."
            subtitle="Si ya sabes qué quieres construir, te ayudamos a definir el camino más corto para lograrlo."
            light
          />
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button 
              onClick={() => setIsModalOpen(true)}
              className="group inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-8 py-5 text-sm font-black uppercase tracking-[0.18em] text-white shadow-xl shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-95 duration-200"
            >
              Reservar mi lugar gratis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </section>

        {/* --- STICKY CTA MOBILE --- */}
        <AnimatePresence>
          {showStickyCta && (
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-0 left-0 w-full p-4 z-50 md:hidden bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent flex justify-center"
            >
              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-cyan-600 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl"
              >
                Registrarme Gratis
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MODAL FORM --- */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />

              {/* Modal Content */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 z-10"
              >
                <div className="absolute top-4 right-4 z-10">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-8">
                  <div className="text-center mb-8">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-600 mb-2">Webinar</p>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Reserva tu lugar gratis</h3>
                    <p className="text-sm text-slate-500 mt-2">Completa tus datos para recibir el acceso y material.</p>
                  </div>

                  <ContactForm 
                    serviceSlug="hazlo-tu-mismo-webinar"
                    context="webinar_hazlo_tu_mismo"
                    nameLabel="Tu Nombre"
                    emailLabel="Correo Electrónico"
                    requirementLabel="¿Qué te gustaría automatizar primero?"
                    namePlaceholder="Ej. Laura Gómez"
                    emailPlaceholder="Ej. laura@empresa.com"
                    requirementPlaceholder="Ej. Mi reporte comercial mensual"
                    submitLabel="Registrarme"
                    successTitle="¡Registro Exitoso!"
                    successMessage="Te hemos enviado un correo con los detalles del webinar. ¡Nos vemos pronto!"
                    resetLabel="Cerrar"
                    showRequirement={true}
                    requirementRequired={true}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </Layout>
  )
}
