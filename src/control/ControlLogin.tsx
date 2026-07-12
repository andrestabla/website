import { useState, type FormEvent } from 'react'
import { LayoutGrid } from 'lucide-react'
import { pcStartLogin, pcVerifyLoginCode, pcRequestPasswordReset } from './lib/session'

export function ControlLogin({ onSuccess }: { onSuccess: () => void }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'credentials' | 'code' | 'forgot'>('credentials')
  const [code, setCode] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [resetDone, setResetDone] = useState(false)

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    const r = await pcStartLogin(identifier, password)
    setLoading(false)
    if (r.status === 'twoFactor') {
      setMaskedEmail(r.email); setCode(''); setStep('code')
      setInfo(`Enviamos un código de verificación a ${r.email || 'tu correo'}.`)
    } else if (r.status === 'ok') onSuccess()
    else setError(r.error)
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    const r = await pcVerifyLoginCode(code)
    setLoading(false)
    if (r.status === 'ok') onSuccess()
    else { if (r.expired) setStep('credentials'); setError(r.error) }
  }

  const requestReset = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    const r = await pcRequestPasswordReset(identifier)
    setLoading(false)
    if (r.status === 'ok') { setResetDone(true); setInfo(r.message) }
    else setError(r.error)
  }

  const goForgot = () => { setError(''); setInfo(''); setResetDone(false); setStep('forgot') }
  const backToLogin = () => { setError(''); setInfo(''); setResetDone(false); setStep('credentials') }

  return (
    <div className="grid min-h-screen bg-white md:grid-cols-[1.1fr_0.9fr]">
      <section
        className="relative hidden flex-col justify-between overflow-hidden p-14 text-white md:flex"
        style={{ backgroundImage: 'url(/back-project-control.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-900/85 via-indigo-800/70 to-sky-700/70" aria-hidden />
        <div className="relative grid h-12 w-12 place-items-center rounded-xl bg-white/15 backdrop-blur"><LayoutGrid size={24} /></div>
        <div className="relative">
          <h1 className="max-w-[16ch] text-4xl font-black leading-tight tracking-tight">
            Project <span className="text-indigo-200">Control</span>
          </h1>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-indigo-100">
            Tableros de seguimiento tipo hoja de cálculo, <span className="font-semibold text-white">100 % customizables</span>:
            define tus columnas, tipos de dato y listas, y compártelos con tu equipo o por enlace público.
          </p>
        </div>
        <div className="relative text-xs leading-relaxed text-indigo-200">Crea · Edita · Comparte</div>
      </section>

      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-sky-500 text-white"><LayoutGrid size={18} /></div>
            <div className="text-sm font-black tracking-tight">PROJECT<span className="text-indigo-600">CONTROL</span></div>
          </div>
          <h2 className="text-[22px] font-black tracking-tight text-slate-900">
            {step === 'credentials' ? 'Iniciar sesión' : step === 'forgot' ? 'Recuperar contraseña' : 'Verificación en dos pasos'}
          </h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">
            {step === 'credentials'
              ? 'Accede con tu cuenta autorizada.'
              : step === 'forgot'
                ? 'Ingresa tu correo o usuario y te enviaremos un enlace para restablecer tu contraseña.'
                : `Ingresa el código de 6 dígitos que enviamos a ${maskedEmail || 'tu correo'}.`}
          </p>
          {info && <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm text-indigo-700">{info}</div>}
          {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
          {step === 'credentials' ? (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Usuario o correo</label>
                <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" placeholder="tu-usuario" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                {loading ? 'Enviando código…' : 'Continuar →'}
              </button>
              <div className="text-center">
                <button type="button" onClick={goForgot} className="text-[12.5px] font-semibold text-slate-400 hover:text-indigo-600">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>
          ) : step === 'forgot' ? (
            resetDone ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                  Revisa tu correo y sigue el enlace para crear una nueva contraseña. Si no llega en unos minutos, revisa la carpeta de spam.
                </div>
                <button type="button" onClick={backToLogin} className="w-full rounded-lg border border-slate-300 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600">
                  ← Volver a iniciar sesión
                </button>
              </div>
            ) : (
              <form onSubmit={requestReset} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Usuario o correo</label>
                  <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" placeholder="tu-correo@dominio.com" />
                </div>
                <button type="submit" disabled={loading || !identifier.trim()} className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                  {loading ? 'Enviando…' : 'Enviar enlace de recuperación →'}
                </button>
                <div className="text-center">
                  <button type="button" onClick={backToLogin} className="text-[12.5px] font-semibold text-slate-400 hover:text-slate-700">← Volver a iniciar sesión</button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Código de verificación</label>
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus inputMode="numeric" autoComplete="one-time-code"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 text-center text-2xl font-black tracking-[0.5em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" placeholder="______" />
              </div>
              <button type="submit" disabled={loading || code.length < 6} className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                {loading ? 'Verificando…' : 'Verificar y entrar →'}
              </button>
              <div className="flex items-center justify-between text-xs font-semibold">
                <button type="button" onClick={() => { setStep('credentials'); setError(''); setInfo('') }} className="text-slate-400 hover:text-slate-700">← Volver</button>
                <button type="button" onClick={() => submit()} disabled={loading} className="text-indigo-600 hover:text-indigo-800 disabled:opacity-40">Reenviar código</button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
