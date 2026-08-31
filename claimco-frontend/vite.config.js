import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    proxy: {
      '/auth': { target: 'http://localhost:3001', changeOrigin: true },
      '/tasks': { target: 'http://localhost:3001', changeOrigin: true },
      '/payments': { target: 'http://localhost:3001', changeOrigin: true },
      '/dashboard': { target: 'http://localhost:3001', changeOrigin: true },
      '/services': { target: 'http://localhost:3001', changeOrigin: true },
      '/users': { target: 'http://localhost:3001', changeOrigin: true },
      '/notifications': { target: 'http://localhost:3001', changeOrigin: true },
      '/reviews': { target: 'http://localhost:3001', changeOrigin: true },
      '/conversations': { target: 'http://localhost:3001', changeOrigin: true },
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', ws: true, changeOrigin: true },
    },
  },
})
