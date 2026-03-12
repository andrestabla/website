import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, KeyRound, Loader2, ShieldCheck } from 'lucide-react'

type SetupUser = {
  displayName: string
  username: string
  email: string | null
  expiresAt: string
}

export function SetupPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => params.get('token') || '', [params])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<SetupUser | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!token) {
        setError('No se encontró token de activación.')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/account-setup?token=${encodeURIComponent(token)}`)
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || 'Token inválido o vencido.')
        }
        if (!cancelled) {
          setUser(data.user)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No fue posible validar el acceso.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/account-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'No fue posible configurar tus credenciales.')
      }
      setSuccess(true)
      setTimeout(() => navigate('/admin/login'), 1600)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al configurar credenciales.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white border border-slate-200 shadow-xl p-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Activación segura</h1>
            <p className="text-sm text-slate-500">Configura tus credenciales de acceso</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Validando token...
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 text-sm font-medium">{error}</div>
            <Link to="/admin/login" className="inline-flex items-center text-sm font-bold uppercase tracking-wider text-slate-700 hover:text-brand-primary">
              Ir al login
            </Link>
          </div>
        ) : success ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 text-sm font-semibold">
            Credenciales configuradas correctamente. Redirigiendo al login...
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
              <p><strong>Usuario:</strong> {user?.username}</p>
              <p><strong>Email:</strong> {user?.email || 'No definido'}</p>
              <p><strong>Expira:</strong> {user?.expiresAt ? new Date(user.expiresAt).toLocaleString() : 'N/D'}</p>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Nueva contraseña</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  className="w-full h-12 pl-10 pr-4 border border-slate-200 bg-white outline-none focus:border-brand-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={10}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Confirmar contraseña</label>
              <input
                type="password"
                className="w-full h-12 px-4 border border-slate-200 bg-white outline-none focus:border-brand-primary"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={10}
                required
              />
            </div>

            <p className="text-xs text-slate-500">Usa al menos 10 caracteres con letras y números.</p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-brand-primary text-white text-sm font-black uppercase tracking-widest inline-flex items-center justify-center disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  Activar acceso <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
