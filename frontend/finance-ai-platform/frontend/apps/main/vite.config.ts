import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@finance-ai/core': path.resolve(__dirname, '../../packages/core/src'),
      '@finance-ai/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@finance-ai/auth': path.resolve(__dirname, '../../packages/auth/src'),
      '@finance-ai/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
      '@finance-ai/ap-hub': path.resolve(__dirname, '../../packages/ap-hub/src'),
      '@finance-ai/budget': path.resolve(__dirname, '../../packages/budget/src'),
      '@finance-ai/dashboard': path.resolve(__dirname, '../../packages/dashboard/src'),
      '@finance-ai/vendor': path.resolve(__dirname, '../../packages/vendor/src'),
      '@finance-ai/audit': path.resolve(__dirname, '../../packages/audit/src'),
      '@finance-ai/settings': path.resolve(__dirname, '../../packages/settings/src')
    }
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})