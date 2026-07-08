import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // @ts-ignore
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/services/secureStorage.ts'],
      exclude: [
        'node_modules/**',
        'src/pages/**',
        'src/main.tsx',
        'tailwind.config.js',
        'postcss.config.js',
        'eslint.config.js',
        'src/db/localDb.ts'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 70,
        statements: 90
      }
    }
  }
})
