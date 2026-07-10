import { useState, type FormEvent } from 'react'
import { biLogin } from './lib/session'

export function BiLogin({ onSuccess }: { onSuccess: () => void }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const r = await biLogin(identifier, password)
    setLoading(false)
    if (r.ok) onSuccess()
    else setError(r.error || 'No se pudo iniciar sesión.')
  }

  return (
    <div className="grid min-h-screen bg-white md:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-700 to-indigo-500 p-14 text-white md:flex">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-2xl font-black backdrop-blur">◧</div>
        <div>
          <h1 className="max-w-[15ch] text-4xl font-black leading-tight tracking-tight">
            Algoritmo <span className="text-indigo-200">BI</span>
          </h1>
          <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-indigo-100">
            Inteligencia de mercado sobre la oferta y demanda de educación superior en Colombia: oferta educativa,
            empleabilidad, análisis regional y generación de informes.
          </p>
          <div className="mt-7 flex gap-9">
            <div>
              <div className="text-2xl font-black">27.005</div>
              <div className="text-xs text-indigo-200">Programas</div>
            </div>
            <div>
              <div className="text-2xl font-black">33</div>
              <div className="text-xs text-indigo-200">Departamentos</div>
            </div>
            <div>
              <div className="text-2xl font-black">6</div>
              <div className="text-xs text-indigo-200">Fuentes de datos</div>
            </div>
          </div>
        </div>
        <div className="text-xs text-indigo-200">MEN/SNIES · OLE · OIT/CEPAL · DANE</div>
      </section>

      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-white">◧</div>
            <div className="text-sm font-black tracking-tight">
              ALGORITMO<span className="text-indigo-600">BI</span>
            </div>
          </div>
          <h2 className="text-[22px] font-black tracking-tight text-slate-900">Iniciar sesión</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">Accede con tu cuenta autorizada.</p>
          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">Usuario o correo</label>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="tu-usuario"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? 'Ingresando…' : 'Ingresar →'}
            </button>
          </form>
          <p className="mt-5 text-xs text-slate-400">
            El acceso al módulo BI se gestiona desde el panel de administración (Usuarios).
          </p>
        </div>
      </section>
    </div>
  )
}
