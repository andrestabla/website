import { motion, AnimatePresence } from 'framer-motion'
import { Hero } from './sections/Hero/Hero'
import { Services } from './sections/Services/Services'
import { Products } from './sections/Products/Products'
import { Frameworks } from './sections/Frameworks/Frameworks'
import { Contact } from './sections/Contact/Contact'

function App() {
  return (
    <div className="selection:bg-slate-900 selection:text-white min-h-screen bg-white">
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

          <footer className="py-20 bg-white border-t border-slate-100 px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-2xl font-bold tracking-tighter text-slate-900">
                ALGORITMOT
              </div>
              <div className="text-slate-400 text-sm font-light text-center md:text-right">
                &copy; {new Date().getFullYear()} AlgoritmoT. Todos los derechos reservados. <br />
                Digital Mastery & Industria 5.0.
              </div>
            </div>
          </footer>
        </motion.main>
      </AnimatePresence>
    </div>
  )
}

export default App
