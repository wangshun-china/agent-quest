import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev proxy: browser cannot CORS-call DashScope/OpenAI directly.
 * liveAgent rewrites those base URLs to /llm-proxy/* in DEV.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // DashScope OpenAI-compatible
      '/llm-proxy/dashscope': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/llm-proxy\/dashscope/, '/compatible-mode/v1'),
      },
      // OpenAI
      '/llm-proxy/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/llm-proxy\/openai/, '/v1'),
      },
      // DeepSeek
      '/llm-proxy/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/llm-proxy\/deepseek/, '/v1'),
      },
    },
  },
})
