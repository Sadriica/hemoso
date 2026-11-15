import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BODY_ZONES, BodySilhouette } from './index'

const lit = (c: HTMLElement) =>
  [...c.querySelectorAll('[data-zone][data-lit="true"]')].map((n) =>
    n.getAttribute('data-zone'),
  )

describe('BodySilhouette', () => {
  it.each(BODY_ZONES)('lights only the %s zone', (system) => {
    const { container } = render(<BodySilhouette system={system} label="Name" />)
    expect(lit(container)).toEqual([system])
    expect(container.querySelectorAll('[data-zone]')).toHaveLength(BODY_ZONES.length)
  })

  it('lights nothing for null', () => {
    const { container } = render(<BodySilhouette system={null} label="None" />)
    expect(lit(container)).toEqual([])
  })

  it('shows the label as text and names the image', () => {
    render(<BodySilhouette system="metabolic" label="Metabolic" zoneLabel="abdomen" />)
    expect(screen.getByText('Metabolic')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Metabolic: abdomen' })).toBeInTheDocument()
  })

  it('names the image with the label alone', () => {
    render(<BodySilhouette system="sleep" label="Sleep" />)
    expect(screen.getByRole('img', { name: 'Sleep' })).toBeInTheDocument()
  })

  it('drops the transition for reduced motion and app--still', () => {
    const css = readFileSync('src/components/body/body.css', 'utf8')
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*{\s*\.body-silhouette__zone\s*{\s*transition: none/)
    expect(css).toMatch(/\.app--still \.body-silhouette__zone\s*{\s*transition: none/)
    expect(css).toContain('var(--motion-base)')
  })
})
