import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SourceList from './SourceList'
import { sourceLabel } from './sourceLabel'

describe('sourceLabel', () => {
  it('uses the title, or the host and last segment when there is none', () => {
    expect(sourceLabel({ title: 'NASA', url: 'https://nasa.gov/x' })).toBe('NASA')
    const url = 'https://www.who.int/fact-sheets/hypertension'
    expect(sourceLabel({ title: url, url })).toBe('who.int \u00b7 hypertension')
  })
})

describe('SourceList', () => {
  it('shortens a source with no title and keeps the full address', () => {
    const url =
      'https://www.heart.org/en/health-topics/high-blood-pressure/the-facts/all-about-heart-rate-pulse'
    render(<SourceList sources={[{ title: url, url }]} />)
    const link = screen.getByRole('link')
    expect(link).toHaveTextContent('heart.org · all-about-heart-rate-pulse')
    expect(link).toHaveAttribute('href', url)
    expect(link).toHaveAttribute('title', url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer noopener')
    expect(link).toHaveAccessibleDescription('(opens in a new tab)')
  })

  it('keeps a real title as it is', () => {
    render(
      <SourceList
        sources={[{ title: 'NASA hazards', url: 'https://nasa.gov/x' }]}
      />,
    )
    expect(
      screen.getByRole('link', { name: 'NASA hazards' }),
    ).toBeInTheDocument()
  })

  it('cuts a long label', () => {
    const url = `https://nasa.gov/${'a'.repeat(80)}`
    render(<SourceList sources={[{ title: url, url }]} />)
    expect(screen.getByRole('link').textContent?.length).toBeLessThanOrEqual(48)
  })

  it('shows Assumption as a plain word', () => {
    render(<SourceList sources={['Assumption']} />)
    expect(screen.getByText('Assumption')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
