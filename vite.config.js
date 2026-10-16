import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server: 0.0.0.0 for sandbox preview. Lab API is npm run lab:relay (optional).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
})
