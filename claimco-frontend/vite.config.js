import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backendTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001'
const bypassSpaDocument = (req) => req.headers.accept?.includes('text/html') ? '/index.html' : undefined

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    proxy: {
      '/auth': { target: backendTarget, changeOrigin: true, bypass: bypassSpaDocument },
      '/tasks': { target: backendTarget, changeOrigin: true, bypass: bypassSpaDocument },
      '/payments': { target: backendTarget, changeOrigin: true, bypass: bypassSpaDocument },
      '/dashboard': { target: backendTarget, changeOrigin: true, bypass: bypassSpaDocument },
      '/services': { target: backendTarget, changeOrigin: true, bypass: bypassSpaDocument },
      '/users': { target: backendTarget, changeOrigin: true, bypass: bypassSpaDocument },
      '/notifications': { target: backendTarget, changeOrigin: true, bypass: bypassSpaDocument },
      '/reviews': { target: backendTarget, changeOrigin: true, bypass: bypassSpaDocument },
      '/conversations': { target: backendTarget, changeOrigin: true, bypass: bypassSpaDocument },
      '/api': { target: backendTarget, changeOrigin: true, bypass: bypassSpaDocument },
      '/socket.io': { target: backendTarget, ws: true, changeOrigin: true, bypass: bypassSpaDocument },
    },
  },
})
