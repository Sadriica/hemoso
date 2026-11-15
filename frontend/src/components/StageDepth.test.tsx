import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StageDepth from './StageDepth'

describe('StageDepth', () => {
  it('is decoration: hidden from assistive technology, with no text', () => {
    const { container } = render(<StageDepth still={false} />)
    const layer = container.querySelector('.depth')
    expect(layer).toHaveAttribute('aria-hidden', 'true')
    expect(layer?.textContent).toBe('')
  })

  it('follows the scroll by a few pixels at most', () => {
    const { container } = render(<StageDepth still={false} />)
    const layer = container.querySelector('.depth') as HTMLElement
    const shift = Number.parseFloat(layer.style.getPropertyValue('--depth-shift'))
    expect(shift).toBeGreaterThanOrEqual(0)
    expect(shift).toBeLessThanOrEqual(12)
  })

  it('does not move at all with motion off', () => {
    const { container } = render(<StageDepth still />)
    const layer = container.querySelector('.depth') as HTMLElement
    expect(layer.style.getPropertyValue('--depth-shift')).toBe('')
  })
})
