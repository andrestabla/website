import { Home } from './pages/Home'
import { ServicePage } from './pages/ServicePage'
import { ProductPage } from './pages/ProductPage'
import { LoginPage } from './admin/pages/LoginPage'
import { Dashboard } from './admin/pages/Dashboard'
import { ManageServices } from './admin/pages/ManageServices'
import { ManageProducts } from './admin/pages/ManageProducts'
import { ManageSite } from './admin/pages/ManageSite'
import { AdminLayout } from './admin/components/AdminLayout'
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
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/servicios/:slug" element={<ServicePage />} />
        <Route path="/productos/:slug" element={<ProductPage />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <ProtectedRoute>
              <ManageServices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute>
              <ManageProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <ManageSite />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

export default App
