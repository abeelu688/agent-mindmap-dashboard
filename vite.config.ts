import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/v1': process.env.VITE_TEAM_SERVICE_PROXY_TARGET || 'http://localhost:8080',
      '/healthz': process.env.VITE_TEAM_SERVICE_PROXY_TARGET || 'http://localhost:8080',
    },
  },
})
