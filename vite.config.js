import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api': {
        target: 'https://billing.hrmdpayrollsoftware.com',
        // target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
