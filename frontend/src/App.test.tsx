import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App shell', () => {
  it('shows the skip link, header, main landmark and synthetic-data note', () => {
    render(<App />)

    expect(
      screen.getByRole('link', { name: /skip to main content/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveTextContent('HeMoSo')
    expect(
      screen.getByRole('heading', { level: 1, name: 'HeMoSo' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(
      screen.getByText('Demo with synthetic data only.'),
    ).toBeInTheDocument()
  })
})
