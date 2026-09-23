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
      '/items': { target: backendTarget, changeOrigin: true, bypass: bypassSpaDocument },
      '/users': { target: backendTarget, changeOrigin: true, bypass: bypassSpaDocument },
      '/conversations': { target: backendTarget, changeOrigin: true, bypass: bypassSpaDocument },
      '/socket.io': { target: backendTarget, ws: true, changeOrigin: true, bypass: bypassSpaDocument },
    },
  },
})
