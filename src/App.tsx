import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center"
      >
        <div className="flex items-center justify-center mb-6">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
          Andrés Tabla Rico
        </h1>

        <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
          Líder en Transformación Educativa Digital
        </p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-12 text-sm text-slate-500 uppercase tracking-widest font-medium"
        >
          Próximamente
        </motion.div>
      </motion.div>

      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>
    </div>
  )
}

export default App
