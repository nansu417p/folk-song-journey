import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 這是讓內網可以連線
    // ★★★ 新增底下這一行 ★★★
    allowedHosts: true, 
  }
})