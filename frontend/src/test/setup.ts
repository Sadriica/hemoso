import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Tests never depend on the machine's or Vercel's VITE_API_BASE_URL: with it set,
// the "no server" texts and the sync tests would fail and block the deploy.
vi.stubEnv('VITE_API_BASE_URL', '')

afterEach(() => {
  cleanup()
})
