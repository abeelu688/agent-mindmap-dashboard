import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_TEAM_SERVICE_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [vue()],
    server: {
      host: '0.0.0.0',
      proxy: {
        '/v1': proxyTarget,
        '/healthz': proxyTarget,
      },
    },
  }
})
