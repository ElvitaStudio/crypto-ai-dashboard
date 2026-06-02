import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const BROWSER_HEADERS = [
  'origin',
  'referer',
  'sec-fetch-site',
  'sec-fetch-mode',
  'sec-fetch-dest',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const anthropicKey = env.VITE_ANTHROPIC_API_KEY?.trim()

  return {
    plugins: [react()],
    server: {
      port: 5175,
      strictPort: true,
      proxy: {
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: () => '/v1/messages',
          headers: {
            'anthropic-version': '2023-06-01',
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              BROWSER_HEADERS.forEach((h) => proxyReq.removeHeader(h))
              if (anthropicKey) {
                proxyReq.setHeader('x-api-key', anthropicKey)
              }
            })
          },
        },
      },
    },
  }
})
