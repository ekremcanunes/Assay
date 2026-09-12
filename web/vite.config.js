import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vite varsayılanı 'assets' — uygulama route'u /assets ile çakışıp nginx'te 403 veriyordu
  build: {
    assetsDir: 'static',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/.ory': {
        target: 'http://localhost:4433',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/.ory/, ''),
      },
    },
  },
  resolve: {
    alias: { '@': '/src' },
  },
})
