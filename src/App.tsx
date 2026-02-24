import { motion, AnimatePresence } from 'framer-motion'
import { Hero } from './sections/Hero/Hero'
import { Services } from './sections/Services/Services'
import { Products } from './sections/Products/Products'
import { Frameworks } from './sections/Frameworks/Frameworks'
import { Contact } from './sections/Contact/Contact'

function App() {
  return (
    <div className="selection:bg-brand-500/30 selection:text-brand-100 min-h-screen bg-slate-950">
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

          <footer className="py-12 border-t border-slate-900 text-center text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} AlgoritmoT. Todos los derechos reservados. <br />
            Construyendo el futuro de la Industria 5.0.
          </footer>
        </motion.main>
      </AnimatePresence>

      {/* Global Background Elements */}
      <div className="fixed inset-0 -z-20 bg-slate-950" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-500/5 via-transparent to-transparent pointer-events-none" />
    </div>
  )
}

export default App
