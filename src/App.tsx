import { useEffect, useState, type ReactNode } from 'react'
import { Home } from './pages/Home'
import { ServicePage } from './pages/ServicePage'
import { ProductPage } from './pages/ProductPage'
import { IngenieriaHumana } from './pages/IngenieriaHumana'
import { DespliegueIA } from './pages/DespliegueIA'
import { MadurezOrganica } from './pages/MadurezOrganica'
import { LoginPage } from './admin/pages/LoginPage'
import { Dashboard } from './admin/pages/Dashboard'
import { ManageHome } from './admin/pages/ManageHome'
import { ManageDesign } from './admin/pages/ManageDesign'
import { ManageIntegrations } from './admin/pages/ManageIntegrations'
import { ManageServices } from './admin/pages/ManageServices'
import { ManageProducts } from './admin/pages/ManageProducts'
import { ManageSite } from './admin/pages/ManageSite'
import { ManageSEO } from './admin/pages/ManageSEO'
import { ManageMarketing } from './admin/pages/ManageMarketing'
import { Analytics } from './admin/pages/Analytics'
import { AdminLayout } from './admin/components/AdminLayout'
import { CMSProvider, useCMS } from './admin/context/CMSContext'
import { LanguageProvider } from './context/LanguageContext'
import { AnimatePresence } from 'framer-motion'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

function ScrollToTopOnRouteChange() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    // Keep hash-based navigation behavior (e.g. /#contacto) handled by the target page.
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, hash])

  return null
}

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking')
  const [sessionUser, setSessionUser] = useState<{ id: string; username: string; displayName: string; role: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const response = await fetch('/api/admin/session')
        const payload = await response.json().catch(() => null)
        if (cancelled) return
        if (response.ok && payload?.authenticated) {
          localStorage.setItem('admin_token', 'server_session')
          setSessionUser(payload?.user ?? null)
          setStatus('authenticated')
          return
        }
      } catch {
        // Fall through to unauthenticated.
      }
      if (cancelled) return
      localStorage.removeItem('admin_token')
      setSessionUser(null)
      setStatus('unauthenticated')
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Validando sesión...</div>
      </div>
    )
  }
  if (status === 'unauthenticated') return <Navigate to="/admin/login" replace />
  return <AdminLayout sessionUser={sessionUser}>{children}</AdminLayout>
}

function GlobalBrandLoader() {
  const { pathname } = useLocation()
  const { state } = useCMS()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (pathname.startsWith('/admin') || state.design.loaderEnabled !== 'true') {
      setVisible(false)
      return
    }
    const seenKey = 'algoritmot_loader_seen_v1'
    if (sessionStorage.getItem(seenKey)) {
      setVisible(false)
      return
    }
    setVisible(true)
    const duration = Math.max(300, Number(state.design.loaderDurationMs || '900'))
    const t = window.setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem(seenKey, '1')
    }, duration)
    return () => window.clearTimeout(t)
  }, [pathname, state.design.loaderDurationMs, state.design.loaderEnabled])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ backgroundColor: 'var(--cms-loader-bg)' }}>
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        {state.design.loaderLogoUrl ? (
          <img src={state.design.loaderLogoUrl} alt={state.design.logoAlt || state.site.name} className="h-16 w-auto object-contain" />
        ) : (
          <div className="text-3xl font-black tracking-tighter" style={{ color: 'var(--cms-loader-text)' }}>
            ALGORITMO<span style={{ color: 'var(--cms-loader-accent)' }}>T</span>
          </div>
        )}
        <div className="w-64 h-1.5 bg-white/10 overflow-hidden">
          <div className="h-full w-1/2 animate-[loaderPulse_900ms_ease-in-out_infinite]" style={{ backgroundColor: 'var(--cms-loader-accent)' }} />
        </div>
        <div className="text-xs font-black uppercase tracking-[0.35em]" style={{ color: 'var(--cms-loader-text)' }}>
          {state.design.loaderLabel || 'Cargando experiencia'}
        </div>
      </div>
      <style>{`@keyframes loaderPulse{0%{transform:translateX(-100%)}100%{transform:translateX(220%)}}`}</style>
    </div>
  )
}

function App() {
  return (
    <CMSProvider>
      <LanguageProvider>
        <AnimatePresence mode="wait">
          <ScrollToTopOnRouteChange />
          <GlobalBrandLoader />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/servicios/:slug" element={<ServicePage />} />
            <Route path="/productos/:slug" element={<ProductPage />} />
            <Route path="/protocolos/ingenieria-humana" element={<IngenieriaHumana />} />
            <Route path="/protocolos/despliegue-ia" element={<DespliegueIA />} />
            <Route path="/protocolos/madurez-organica" element={<MadurezOrganica />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/home" element={<ProtectedRoute><ManageHome /></ProtectedRoute>} />
            <Route path="/admin/services" element={<ProtectedRoute><ManageServices /></ProtectedRoute>} />
            <Route path="/admin/products" element={<ProtectedRoute><ManageProducts /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><ManageSite /></ProtectedRoute>} />
            <Route path="/admin/design" element={<ProtectedRoute><ManageDesign /></ProtectedRoute>} />
            <Route path="/admin/integrations" element={<ProtectedRoute><ManageIntegrations /></ProtectedRoute>} />
            <Route path="/admin/seo" element={<ProtectedRoute><ManageSEO /></ProtectedRoute>} />
            <Route path="/admin/marketing" element={<ProtectedRoute><ManageMarketing /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          </Routes>
        </AnimatePresence>
      </LanguageProvider>
    </CMSProvider>
  )
}

export default App
