import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { lazyWithRetry } from './lib/lazyWithRetry'
import { ErrorBoundary } from './components/system/ErrorBoundary'
import { CMSProvider, useCMS } from './admin/context/CMSContext'
import { LanguageProvider } from './context/LanguageContext'
import { DataConsentModal } from './components/privacy/DataConsentModal'
import { SiteTelemetry } from './components/analytics/SiteTelemetry'
import { AdminTelemetry } from './components/analytics/AdminTelemetry'
import { SmartPopup } from './components/marketing/SmartPopup'
import { SiteSEO } from './components/seo/SiteSEO'
import { AnimatePresence } from 'framer-motion'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { canAccessModule, getAdminModuleForPath, hasAdminBridge, ADMIN_ONLY_MODULES, type AdminModuleKey } from './admin/lib/permissions'
import { BI_HOST_MODE } from './bi/lib/base'

const Home = lazyWithRetry(() => import('./pages/Home').then((module) => ({ default: module.Home })))
const ServicePage = lazyWithRetry(() => import('./pages/ServicePage').then((module) => ({ default: module.ServicePage })))
const ProductPage = lazyWithRetry(() => import('./pages/ProductPage').then((module) => ({ default: module.ProductPage })))
const IngenieriaHumana = lazyWithRetry(() => import('./pages/IngenieriaHumana').then((module) => ({ default: module.IngenieriaHumana })))
const DespliegueIA = lazyWithRetry(() => import('./pages/DespliegueIA').then((module) => ({ default: module.DespliegueIA })))
const MadurezOrganica = lazyWithRetry(() => import('./pages/MadurezOrganica').then((module) => ({ default: module.MadurezOrganica })))
const DataPolicy = lazyWithRetry(() => import('./pages/DataPolicy').then((module) => ({ default: module.DataPolicy })))
const CampaignLandingPage = lazyWithRetry(() => import('./pages/CampaignLandingPage').then((module) => ({ default: module.CampaignLandingPage })))
const ServiciosLandingSimple = lazyWithRetry(() => import('./pages/ServiciosLandingSimple').then((module) => ({ default: module.ServiciosLandingSimple })))
const ManagedCustomPage = lazyWithRetry(() => import('./pages/ManagedCustomPage').then((module) => ({ default: module.ManagedCustomPage })))
const NotFound = lazyWithRetry(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })))
const GeneradorCasosAI = lazyWithRetry(() => import('./pages/GeneradorCasosAI').then((module) => ({ default: module.GeneradorCasosAI })))
const PlanificoMiProyecto = lazyWithRetry(() => import('./pages/PlanificoMiProyecto'))
const HazloTuMismo = lazyWithRetry(() => import('./pages/HazloTuMismo'))
const EscalarNegocioLanding = lazyWithRetry(() => import('./pages/EscalarNegocioLanding').then((module) => ({ default: module.EscalarNegocioLanding })))
const SimuladorEmpresas = lazyWithRetry(() => import('./pages/SimuladorEmpresas').then((module) => ({ default: module.SimuladorEmpresas })))

const NavigationSelector = lazyWithRetry(() => import('./pages/NavigationSelector').then((module) => ({ default: module.NavigationSelector })))
// const HomeEducacion = lazyWithRetry(() => import('./pages/HomeEducacion').then((module) => ({ default: module.HomeEducacion })))
const BiApp = lazyWithRetry(() => import('./bi/BiApp'))
const ControlApp = lazyWithRetry(() => import('./control/ControlApp'))
const PublicBoard = lazyWithRetry(() => import('./control/PublicBoard'))
const EcosistemaApp = lazyWithRetry(() => import('./ecosistema/EcosistemaApp'))
const QuoteViewer = lazyWithRetry(() => import('./cotizacion/QuoteViewer'))

const LoginPage = lazyWithRetry(() => import('./admin/pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const Dashboard = lazyWithRetry(() => import('./admin/pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const ManageContentBuilder = lazyWithRetry(() => import('./admin/pages/ManageContentBuilder').then((module) => ({ default: module.ManageContentBuilder })))
const ManageSitePageEditor = lazyWithRetry(() => import('./admin/pages/ManageSitePageEditor').then((module) => ({ default: module.ManageSitePageEditor })))
const ManageDesign = lazyWithRetry(() => import('./admin/pages/ManageDesign').then((module) => ({ default: module.ManageDesign })))
const ManageIntegrations = lazyWithRetry(() => import('./admin/pages/ManageIntegrations').then((module) => ({ default: module.ManageIntegrations })))
const ManageServices = lazyWithRetry(() => import('./admin/pages/ManageServices').then((module) => ({ default: module.ManageServices })))
const ManageProducts = lazyWithRetry(() => import('./admin/pages/ManageProducts').then((module) => ({ default: module.ManageProducts })))
const ManageSite = lazyWithRetry(() => import('./admin/pages/ManageSite').then((module) => ({ default: module.ManageSite })))
const ManageSEO = lazyWithRetry(() => import('./admin/pages/ManageSEO').then((module) => ({ default: module.ManageSEO })))
const ManageMarketing = lazyWithRetry(() => import('./admin/pages/ManageMarketing').then((module) => ({ default: module.ManageMarketing })))
const ManageLeads = lazyWithRetry(() => import('./admin/pages/ManageLeads').then((module) => ({ default: module.ManageLeads })))
const Analytics = lazyWithRetry(() => import('./admin/pages/Analytics').then((module) => ({ default: module.Analytics })))
const ManageUsers = lazyWithRetry(() => import('./admin/pages/ManageUsers').then((module) => ({ default: module.ManageUsers })))
const ManageBookings = lazyWithRetry(() => import('./admin/pages/ManageBookings').then((module) => ({ default: module.ManageBookings })))
const ManageDocuments = lazyWithRetry(() => import('./admin/pages/ManageDocuments').then((module) => ({ default: module.ManageDocuments })))
const SetupPasswordPage = lazyWithRetry(() => import('./admin/pages/SetupPasswordPage').then((module) => ({ default: module.SetupPasswordPage })))
const AdminLayout = lazyWithRetry(() => import('./admin/components/AdminLayout').then((module) => ({ default: module.AdminLayout })))

function ScrollToTopOnRouteChange() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    // Keep hash-based navigation behavior (e.g. /#contacto) handled by the target page.
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, hash])

  return null
}

type AdminSessionStatus = 'checking' | 'authenticated' | 'unauthenticated'
type AdminSessionUser = {
  id: string
  username: string
  displayName: string
  role: string
  permissions?: Record<string, boolean> | null
} | null

function useAdminSessionGuard() {
  const [status, setStatus] = useState<AdminSessionStatus>('checking')
  const [sessionUser, setSessionUser] = useState<AdminSessionUser>(null)

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

  return { status, sessionUser }
}

function ProtectedRouteFrame({ status }: { status: AdminSessionStatus }) {
  if (status !== 'checking') return null
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Validando sesión...</div>
    </div>
  )
}

function RouteLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Cargando página...</div>
    </div>
  )
}

function NoAccessState({ module }: { module: AdminModuleKey }) {
  return (
    <div className="min-h-[60vh] bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 p-8 max-w-lg text-center">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Acceso restringido</h2>
        <p className="text-slate-600">
          Tu usuario no tiene permisos para el módulo <span className="font-bold">{module}</span>.
        </p>
      </div>
    </div>
  )
}

const ProtectedRoute = ({
  children,
  requiredModule,
}: {
  children: ReactNode
  requiredModule?: AdminModuleKey
}) => {
  const { status, sessionUser } = useAdminSessionGuard()
  const { pathname } = useLocation()

  if (status === 'checking') return <ProtectedRouteFrame status={status} />
  if (status === 'unauthenticated') return <Navigate to="/admin/login" replace />
  const module = requiredModule || getAdminModuleForPath(pathname)
  // Regla de negocio: el panel de administración es solo para SUPERADMIN/ADMIN.
  // Los usuarios no-admin que intenten un módulo de gestión van al Ecosistema.
  if (!hasAdminBridge(sessionUser) && (pathname === '/admin/dashboard' || (module && ADMIN_ONLY_MODULES.includes(module)))) {
    return <Navigate to="/ecosistema" replace />
  }
  if (module && !canAccessModule(sessionUser, module)) {
    return <AdminLayout sessionUser={sessionUser}><NoAccessState module={module} /></AdminLayout>
  }
  return <AdminLayout sessionUser={sessionUser}>{children}</AdminLayout>
}

const ProtectedRouteNoLayout = ({
  children,
  requiredModule,
}: {
  children: ReactNode
  requiredModule?: AdminModuleKey
}) => {
  const { status, sessionUser } = useAdminSessionGuard()
  const { pathname } = useLocation()

  if (status === 'checking') return <ProtectedRouteFrame status={status} />
  if (status === 'unauthenticated') return <Navigate to="/admin/login" replace />
  const module = requiredModule || getAdminModuleForPath(pathname)
  if (module && !canAccessModule(sessionUser, module)) return <Navigate to="/admin/dashboard" replace />
  return <>{children}</>
}

function GlobalBrandLoader() {
  const { pathname } = useLocation()
  const { state } = useCMS()
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    return sessionStorage.getItem('algoritmot_loader_seen_v1') === '1'
  })
  const visible = !pathname.startsWith('/admin') && state.design.loaderEnabled === 'true' && !dismissed

  useEffect(() => {
    if (!visible) return
    const seenKey = 'algoritmot_loader_seen_v1'
    const duration = Math.max(300, Number(state.design.loaderDurationMs || '900'))
    const t = window.setTimeout(() => {
      setDismissed(true)
      sessionStorage.setItem(seenKey, '1')
    }, duration)
    return () => window.clearTimeout(t)
  }, [visible, state.design.loaderDurationMs])

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

function GlobalExperienceMode() {
  const { state } = useCMS()

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-cms-performance-mode', state.site.performanceMode || 'standard')
    root.setAttribute('data-cms-motion', state.site.motionPreference || 'system')
    return () => {
      root.removeAttribute('data-cms-performance-mode')
      root.removeAttribute('data-cms-motion')
    }
  }, [state.site.motionPreference, state.site.performanceMode])

  return null
}

function SiteArchitectureFallbackRoute() {
  const { pathname } = useLocation()
  const { state } = useCMS()
  const normalizedPath = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  const matchedPage = state.siteArchitecture.pages.find((page) => page.path === normalizedPath && !page.locked)
  if (!matchedPage) return <NotFound />
  return <ManagedCustomPage page={matchedPage} />
}

function normalizeManagedPath(path: string) {
  const trimmed = path.trim()
  if (!trimmed) return '/'
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  if (withSlash === '/') return '/'
  return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash
}

function ManagedPublishedRoute({
  routePath,
  fallback,
}: {
  routePath: string
  fallback: ReactNode
}) {
  const { state } = useCMS()
  const normalizedRoutePath = normalizeManagedPath(routePath)
  const managedPublishedPage = state.siteArchitecture.pages.find(
    (page) => normalizeManagedPath(page.path) === normalizedRoutePath && page.status === 'published'
  )
  if (!managedPublishedPage) return <>{fallback}</>
  return <ManagedCustomPage page={managedPublishedPage} />
}

function App() {
  // Subdominio del módulo BI (bi.algoritmot.com): montar el BI en la raíz, sin el chrome de marketing.
  if (BI_HOST_MODE) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/board/:token" element={<PublicBoard />} />
            <Route path="/c/:publicId" element={<QuoteViewer />} />
            <Route path="/control/*" element={<ControlApp />} />
            <Route path="/ecosistema/*" element={<EcosistemaApp />} />
            <Route path="/*" element={<BiApp />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    )
  }

  return (
    <CMSProvider>
      <LanguageProvider>
        <AnimatePresence mode="wait">
          <ScrollToTopOnRouteChange />
          <GlobalExperienceMode />
          <GlobalBrandLoader />
          <SiteSEO />
          <SiteTelemetry />
          <AdminTelemetry />
          <SmartPopup />
          <DataConsentModal />
          <ErrorBoundary>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<ManagedPublishedRoute routePath="/" fallback={<NavigationSelector />} />} />
              <Route path="/empresas" element={<ManagedPublishedRoute routePath="/empresas" fallback={<Home />} />} />
              <Route path="/educacion" element={<ManagedPublishedRoute routePath="/educacion" fallback={<div className="min-h-screen flex items-center justify-center">Cargando Educación...</div>} />} />
              <Route path="/plataformas-de-aprendizaje" element={<ManagedPublishedRoute routePath="/plataformas-de-aprendizaje" fallback={<div className="min-h-screen flex items-center justify-center">Cargando Plataformas...</div>} />} />
              <Route path="/virtualizacion-programas" element={<ManagedPublishedRoute routePath="/virtualizacion-programas" fallback={<div className="min-h-screen flex items-center justify-center">Cargando Virtualización...</div>} />} />
              <Route path="/auditoria-programas-virtuales" element={<ManagedPublishedRoute routePath="/auditoria-programas-virtuales" fallback={<div className="min-h-screen flex items-center justify-center">Cargando Auditoría...</div>} />} />
              <Route path="/inicio" element={<Navigate to="/empresas" replace />} />
              <Route path="/servicios/:slug" element={<ServicePage />} />
              <Route path="/productos/:slug" element={<ProductPage />} />
              <Route path="/protocolos/ingenieria-humana" element={<IngenieriaHumana />} />
              <Route path="/protocolos/despliegue-ia" element={<DespliegueIA />} />
              <Route path="/protocolos/madurez-organica" element={<MadurezOrganica />} />
              <Route path="/politica-tratamiento-datos" element={<DataPolicy />} />
              <Route path="/campanias/:slug" element={<CampaignLandingPage />} />
              <Route path="/landing-servicios" element={<ManagedPublishedRoute routePath="/landing-servicios" fallback={<ServiciosLandingSimple />} />} />
              <Route path="/generador-casos" element={<GeneradorCasosAI />} />
              <Route path="/escalar-negocio" element={<EscalarNegocioLanding />} />
              <Route path="/planifico-mi-proyecto" element={<PlanificoMiProyecto />} />
              <Route path="/hazlo-tu-mismo" element={<HazloTuMismo />} />
              <Route path="/empresas/simulador" element={<SimuladorEmpresas />} />


              {/* Algoritmo BI (módulo público con login) */}
              <Route path="/bi/*" element={<BiApp />} />

              {/* Project Control (tableros customizables) */}
              <Route path="/control/*" element={<ControlApp />} />
              <Route path="/board/:token" element={<PublicBoard />} />
              <Route path="/c/:publicId" element={<QuoteViewer />} />

              {/* Ecosistema digital Algoritmo T (portal de módulos por permiso) */}
              <Route path="/ecosistema/*" element={<EcosistemaApp />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin/setup" element={<SetupPasswordPage />} />
              <Route path="/admin/dashboard" element={<ProtectedRoute requiredModule="DASHBOARD"><Dashboard /></ProtectedRoute>} />
              <Route path="/admin/home" element={<Navigate to="/admin/site-builder" replace />} />
              <Route path="/admin/site-builder" element={<ProtectedRoute requiredModule="SITE_BUILDER"><ManageContentBuilder /></ProtectedRoute>} />
              <Route path="/admin/home/editor/:pageId" element={<ProtectedRouteNoLayout requiredModule="SITE_BUILDER"><ManageSitePageEditor /></ProtectedRouteNoLayout>} />
              <Route path="/admin/site-builder/editor/:pageId" element={<ProtectedRouteNoLayout requiredModule="SITE_BUILDER"><ManageSitePageEditor /></ProtectedRouteNoLayout>} />
              <Route path="/admin/services" element={<ProtectedRoute requiredModule="SERVICES"><ManageServices /></ProtectedRoute>} />
              <Route path="/admin/products" element={<ProtectedRoute requiredModule="PRODUCTS"><ManageProducts /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requiredModule="SETTINGS"><ManageSite /></ProtectedRoute>} />
              <Route path="/admin/design" element={<ProtectedRoute requiredModule="DESIGN"><ManageDesign /></ProtectedRoute>} />
              <Route path="/admin/integrations" element={<ProtectedRoute requiredModule="INTEGRATIONS"><ManageIntegrations /></ProtectedRoute>} />
              <Route path="/admin/seo" element={<ProtectedRoute requiredModule="SEO"><ManageSEO /></ProtectedRoute>} />
              <Route path="/admin/marketing" element={<ProtectedRoute requiredModule="MARKETING"><ManageMarketing /></ProtectedRoute>} />
              <Route path="/admin/leads" element={<ProtectedRoute requiredModule="LEADS"><ManageLeads /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute requiredModule="ANALYTICS"><Analytics /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requiredModule="USERS"><ManageUsers /></ProtectedRoute>} />
              <Route path="/admin/bookings" element={<ProtectedRoute requiredModule="BOOKINGS"><ManageBookings /></ProtectedRoute>} />
              <Route path="/admin/documentos" element={<ProtectedRouteNoLayout requiredModule="DOCUMENTS"><ManageDocuments /></ProtectedRouteNoLayout>} />
              <Route path="*" element={<SiteArchitectureFallbackRoute />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </AnimatePresence>
      </LanguageProvider>
    </CMSProvider>
  )
}

export default App
