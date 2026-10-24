/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // 生产构建部署到 GitHub Pages 的 /pomodoro-clock/ 子路径；dev 服务器保持根路径
  base: command === 'build' ? '/pomodoro-clock/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
  },
}))
