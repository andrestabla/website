import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { reloadOnceForChunkError } from './lib/lazyWithRetry'

// Vite emite este evento cuando falla la precarga de un módulo dinámico (chunk
// obsoleto tras un deploy). Recargamos una vez para recuperar sin pantalla en blanco.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadOnceForChunkError()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
