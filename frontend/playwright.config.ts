import { defineConfig, devices } from '@playwright/test'

// The demo path runs against the production build, not the dev server: the
// same files Vercel serves, so a build that breaks fails the test before any
// screen is opened (REQ-15, REQ-31).
// A port of its own: 4173 is Vite's default and a second preview server on this
// machine would collide with it.
const PORT = 4399
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  forbidOnly: true,
  retries: 0,
  // A list, not the HTML report: nothing extra to ignore in git.
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    // English interface and English axe messages on any machine.
    locale: 'en-US',
    // The intro plays on every load and covers the page for a few seconds, so
    // the specs run with reduced motion: no intro, no entrance, the same page.
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      // The same path on a phone: the layout has to work there too (REQ-32).
      name: 'phone',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    // A fixed port with --strictPort, so a busy port is an error and not a
    // silent switch to another one.
    command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
