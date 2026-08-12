import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'App',
        inlineDynamicImports: true,
      }
    }
  }
})
