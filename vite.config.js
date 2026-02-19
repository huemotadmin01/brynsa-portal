import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages deployment uses /brynsa-portal/ subpath
  base: '/brynsa-portal/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Strip console.log/warn from production builds (keep console.error for debugging)
    minify: 'esbuild',
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
})
