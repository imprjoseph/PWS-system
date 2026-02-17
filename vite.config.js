import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  plugins: [react()],
  // 這裡必須改成您的儲存庫名稱 'PWS-system'，前後都要有斜線
  base: '/PWS-system/', 
})