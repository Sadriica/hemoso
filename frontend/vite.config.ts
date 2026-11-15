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
  build: {
    // In Vite 8 this object is `rolldownOptions`; `rollupOptions` is the name it
    // had before and still works as an alias. MUI and Emotion only change when
    // we upgrade them, while our own code changes every commit: two files mean
    // a browser keeps the vendor one when only the app file changed, and each
    // file stays under the size where the build warns.
    rolldownOptions: {
      output: {
        manualChunks: (id: string): string | null =>
          /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/.test(id)
            ? 'vendor-mui'
            : null,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Unit tests only: e2e/ is Playwright's, and Vercel runs `pnpm test`.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
