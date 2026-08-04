import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/admin/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Points at the local backend (npm run dev in ../, with a local
      // DATABASE_URL in .env) so the new admin auth/promo/complaints/etc.
      // routes work before they're deployed. Swap to
      // 'https://www.quickdrop.ng' to browse real production data instead —
      // that server won't have the new admin routes until it's deployed.
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
