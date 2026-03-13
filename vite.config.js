import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
const gitDate = execSync('git log -1 --format=%cd --date=format:"%b %d"')
  .toString().trim();

export default defineConfig({
  plugins: [react()],
  base: '/gymtrack/',
  define: {
    __APP_VERSION__: JSON.stringify(`${gitDate} · ${gitHash}`),
  },
  build: {
    outDir: 'dist', sourcemap: false, minify: 'esbuild',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    }
  }
})
