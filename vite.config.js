import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  base: '/gymtrack/',
  build: { outDir: 'dist', sourcemap: false, minify: 'esbuild' }
})
