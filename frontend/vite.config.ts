import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the build works from any static host (GitHub Pages).
  base: './',
  server: {
    fs: {
      // Let the dev server read config/ at the repository root.
      allow: ['..'],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Unit tests only: e2e/ is Playwright's, and Vercel runs `pnpm test`.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
