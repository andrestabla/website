import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      // 'talkinghead' (avatar 3D de Claudia) lo resuelve el navegador con el
      // importmap de index.html, desde CDN. No debe entrar al bundle.
      external: ['talkinghead'],
    },
  },
})
