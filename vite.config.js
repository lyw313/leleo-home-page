import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // 生产挂在 http://IP/leleo/（80 端口已开放；8088 可能被云安全组拦截）
  base: process.env.VITE_BASE || '/',
  plugins: [vue()],
  server: {
    proxy: {
      // 本地开发：/api 转发到 leleo-server（node server/index.js，端口 8787）
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
