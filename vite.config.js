import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // For GitHub Pages deployment - update to your repo name
  base: process.env.NODE_ENV === 'production' ? '/brynsa-portal/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
