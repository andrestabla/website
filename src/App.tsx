import { Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { ServicePage } from './pages/ServicePage'
import { ProductPage } from './pages/ProductPage'
import { AnimatePresence } from 'framer-motion'

function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/servicios/:slug" element={<ServicePage />} />
        <Route path="/productos/:slug" element={<ProductPage />} />
      </Routes>
    </AnimatePresence>
  )
}

export default App
