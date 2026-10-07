import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PASIHAI prototype — dev server imewekwa tayari kwa preview ya sandbox:
// host: true      → inasikiliza 0.0.0.0 (inaonekana kwenye browser)
// allowedHosts: true → inaruhusu host ya preview proxy
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
