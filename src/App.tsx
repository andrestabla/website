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
import { CMSProvider } from './admin/context/CMSContext'
import { LanguageProvider } from './context/LanguageContext'
import { AnimatePresence } from 'framer-motion'
import { Routes, Route, Navigate } from 'react-router-dom'

// Simple Auth Guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('admin_token')
  if (!token) return <Navigate to="/admin/login" replace />
  return <AdminLayout>{children}</AdminLayout>
}

function App() {
  return (
    <CMSProvider>
      <LanguageProvider>
        <AnimatePresence mode="wait">
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
