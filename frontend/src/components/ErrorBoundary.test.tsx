import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

function Broken(): never {
  throw new Error('cannot draw')
}

describe('ErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows its children when nothing fails', () => {
    render(
      <ErrorBoundary fallback={<p>fallback</p>}>
        <p>figure</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('figure')).toBeInTheDocument()
    expect(screen.queryByText('fallback')).toBeNull()
  })

  it('shows the fallback and keeps the rest of the page when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <main>
        <p>status card</p>
        <ErrorBoundary fallback={<p>fallback</p>}>
          <Broken />
        </ErrorBoundary>
      </main>,
    )
    expect(screen.getByText('fallback')).toBeInTheDocument()
    expect(screen.getByText('status card')).toBeInTheDocument()
  })
})
