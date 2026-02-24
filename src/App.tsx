import { motion, AnimatePresence } from 'framer-motion'
import { Hero } from './sections/Hero/Hero'
import { Services } from './sections/Services/Services'
import { Products } from './sections/Products/Products'
import { Frameworks } from './sections/Frameworks/Frameworks'
import { Contact } from './sections/Contact/Contact'

function App() {
  return (
    <div className="selection:bg-brand-primary selection:text-white min-h-screen bg-white">
      <AnimatePresence mode="wait">
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10"
        >
          <Hero />
          <Services />
          <Products />
          <Frameworks />
          <Contact />

          <footer className="py-32 bg-slate-900 px-6 border-t border-white/5">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-24">
                <div className="text-4xl font-black tracking-tighter text-white">
                  ALGORITMO<span className="text-white/30">T</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
                  <div>
                    <div className="text-xs font-black text-white/30 uppercase tracking-[0.4em] mb-8">Protocolos</div>
                    <ul className="space-y-4 text-white/60 font-medium">
                      <li>Ingeniería Humana</li>
                      <li>Despliegue IA</li>
                      <li>Madurez Organica</li>
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-black text-white/30 uppercase tracking-[0.4em] mb-8">Conexión</div>
                    <ul className="space-y-4 text-white/60 font-medium">
                      <li>LinkedIn</li>
                      <li>Terminal</li>
                      <li>Relaciones</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-white/20 text-xs font-black uppercase tracking-[0.5em]">
                  &copy; {new Date().getFullYear()} AlgoritmoT System. All Rights Reserved.
                </div>
                <div className="text-white/20 text-xs font-black uppercase tracking-[0.5em]">
                  Digital Mastery & Infrastructure
                </div>
              </div>
            </div>
          </footer>
        </motion.main>
      </AnimatePresence>
    </div>
  )
}

export default App
