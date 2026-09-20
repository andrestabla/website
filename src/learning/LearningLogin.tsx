/**
 * Learning Builder — puerta propia del módulo.
 *
 * Misma mecánica de acceso que el resto del Ecosistema (usuario, contraseña y
 * verificación en dos pasos contra /api/admin/login), con la identidad del
 * módulo: quien llega a construir recursos educativos entra por su puerta, no
 * por una pantalla genérica.
 */
import { useState, type FormEvent } from 'react'
import { Library } from 'lucide-react'
import { ecoStartLogin, ecoVerifyLoginCode, ecoRequestPasswordReset } from '../ecosistema/lib/session'

export function LearningLogin({ onSuccess }: { onSuccess: () => void }) {
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
    const result = await ecoStartLogin(identifier, password)
    setLoading(false)
    if (result.status === 'twoFactor') {
      setMaskedEmail(result.email); setCode(''); setStep('code')
      setInfo(`Enviamos un código de verificación a ${result.email || 'tu correo'}.`)
    } else if (result.status === 'ok') onSuccess()
    else setError(result.error)
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    const result = await ecoVerifyLoginCode(code)
    setLoading(false)
    if (result.status === 'ok') onSuccess()
    else { if (result.expired) setStep('credentials'); setError(result.error) }
  }

  const requestReset = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    const result = await ecoRequestPasswordReset(identifier)
    setLoading(false)
    if (result.status === 'ok') { setResetDone(true); setInfo(result.message) }
    else setError(result.error)
  }

  const goForgot = () => { setError(''); setInfo(''); setResetDone(false); setStep('forgot') }
  const backToLogin = () => { setError(''); setInfo(''); setResetDone(false); setStep('credentials') }

  const field = 'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'

  return (
    <div className="grid min-h-screen bg-white md:grid-cols-[1.1fr_0.9fr]">
      {/*
        La foto va de fondo y el color de marca encima, como en las puertas de
        BI, el Ecosistema y Project Control. El degradado no es decorativo: es
        lo que sostiene el contraste del texto, así que si la imagen falta o
        tarda en cargar el panel sigue legible sobre el gris de abajo.
      */}
      <section
        className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-14 text-white md:flex"
        style={{ backgroundImage: 'url(/back-learning.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-700/95 via-orange-600/80 to-amber-400/65"
          aria-hidden
        />
        {/*
          El ámbar de la esquina deja pasar las zonas claras de la foto —la
          mesa de madera, las pantallas— y ahí el texto blanco se queda sin
          contraste. Este segundo velo asienta el conjunto y el de abajo
          oscurece justo donde se apoyan el párrafo y la línea de cierre.
        */}
        <div className="pointer-events-none absolute inset-0 bg-rose-950/25" aria-hidden />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-rose-950/60 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div className="relative grid h-12 w-12 place-items-center rounded-xl bg-white/15 backdrop-blur"><Library size={24} /></div>
        <div className="relative">
          <h1 className="max-w-[16ch] text-4xl font-black leading-tight tracking-tight">
            Learning <span className="text-amber-100">Builder</span>
          </h1>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-rose-50">
            Construye y edita recursos educativos con las directivas de cada cliente:{' '}
            <span className="font-semibold text-white">su línea gráfica y su modelo instruccional</span>, aplicados a
            todo lo que se publica. OVA navegables, revisión comentada, SCORM y enlace público.
          </p>
        </div>
        <div className="relative text-xs leading-relaxed text-rose-100">Propone · Construye · Revisa · Entrega</div>
      </section>

      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white">
              <Library size={18} />
            </div>
            <div className="text-sm font-black tracking-tight">LEARNING<span className="text-rose-600">BUILDER</span></div>
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

          {info && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{info}</div>}
          {error && <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</div>}

          {step === 'credentials' ? (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Usuario o correo</label>
                <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus className={field} placeholder="tu-usuario" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-rose-600 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60">
                {loading ? 'Enviando código…' : 'Continuar →'}
              </button>
              <div className="text-center">
                <button type="button" onClick={goForgot} className="text-[12.5px] font-semibold text-slate-400 hover:text-rose-600">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>
          ) : step === 'forgot' ? (
            resetDone ? (
              <div className="space-y-4">
                <button type="button" onClick={backToLogin} className="w-full rounded-lg border border-slate-300 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Volver a iniciar sesión
                </button>
              </div>
            ) : (
              <form onSubmit={requestReset} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Usuario o correo</label>
                  <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus className={field} placeholder="tu-correo@dominio.com" />
                </div>
                <button type="submit" disabled={loading} className="w-full rounded-lg bg-rose-600 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60">
                  {loading ? 'Enviando…' : 'Enviar enlace'}
                </button>
                <div className="text-center">
                  <button type="button" onClick={backToLogin} className="text-[12.5px] font-semibold text-slate-400 hover:text-rose-600">
                    Volver
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Código de verificación</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                  inputMode="numeric"
                  className={`${field} text-center text-lg tracking-[0.4em]`}
                  placeholder="000000"
                />
              </div>
              <button type="submit" disabled={loading || code.length < 6} className="w-full rounded-lg bg-rose-600 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60">
                {loading ? 'Verificando…' : 'Entrar →'}
              </button>
              <div className="text-center">
                <button type="button" onClick={backToLogin} className="text-[12.5px] font-semibold text-slate-400 hover:text-rose-600">
                  Volver
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
