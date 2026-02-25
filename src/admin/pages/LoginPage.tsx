import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Lock, Terminal, ArrowRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export function LoginPage() {
    const [identifier, setIdentifier] = useState('admin')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsSubmitting(true)
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
            })
            if (response.ok) {
                localStorage.setItem('admin_token', 'server_session')
                navigate('/admin/dashboard')
                return
            }
            const payload = await response.json().catch(() => null)
            setError(payload?.error === 'Invalid credentials'
                ? 'Protocolo de acceso denegado. Credencial inválida.'
                : 'No se pudo iniciar sesión en el servidor.')
        } catch {
            setError('No se pudo conectar con el servidor de autenticación.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary"></div>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="whitespace-nowrap text-[10vw] font-black tracking-tighter leading-none uppercase">
                        Admin Protocol Access Security AlgoritmoT
                    </div>
                ))}
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-slate-900 p-12 shadow-2xl border-t-8 border-brand-primary">
                    <div className="flex items-center gap-4 mb-12">
                        <div className="w-12 h-12 bg-brand-primary flex items-center justify-center text-white">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-white text-2xl font-black tracking-tighter leading-none mb-1">ACCESO ADMIN</h1>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Protocolo v6.0.4</p>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
                                User (Username or Email)
                            </label>
                            <input
                                type="text"
                                required
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 py-4 px-6 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium"
                                placeholder="admin"
                                autoComplete="username"
                            />
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 pt-2 block">
                                Security Key (Password)
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-white/20 group-focus-within:text-brand-primary transition-colors">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 py-6 pl-16 pr-6 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium"
                                    placeholder="••••••••••••"
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-900/30 text-red-400 text-xs font-bold border-l-4 border-red-500">
                                <Terminal className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full py-8" disabled={isSubmitting}>
                            Iniciar Protocolo
                            <ArrowRight className="ml-3 w-5 h-5" />
                        </Button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">
                            Authorized Personnel Only
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
