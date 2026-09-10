import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { preloadCriticalChunks } from './vite/preload-critical-chunks'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // La raiz "/" sirve una pagina gestionada (ManagedCustomPage ->
    // DynamicPageRenderer) y cae en NavigationSelector si no hay ninguna
    // publicada. Los tres se descubrian tarde; ahora bajan en paralelo.
    preloadCriticalChunks(['ManagedCustomPage', 'DynamicPageRenderer', 'NavigationSelector']),
  ],
  build: {
    rollupOptions: {
      // 'talkinghead' (avatar 3D de Claudia) lo resuelve el navegador con el
      // importmap de index.html, desde CDN. No debe entrar al bundle.
      external: ['talkinghead'],
      output: {
        // Agrupar librerias pesadas por nombre resulto contraproducente: al
        // fusionar todo mermaid/recharts en un chunk, Rollup los promovio a
        // dependencia estatica del entry y acababan precargados en la home.
        // Se agrupa solo lo que cualquier ruta necesita de todos modos, que
        // ademas se cachea entre despliegues porque cambia poco.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react'
          if (id.includes('node_modules/react-router')) return 'vendor-router'
        },
      },
    },
  },
})
