import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/PWS-system/', // 請確認這裡與您的 GitHub Repository 名稱一致
})