import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TrendRow from './TrendRow'
import { strings } from '../strings'

const baseline = { median: 70, spread: 2, n: 14 }

describe('TrendRow', () => {
  it('names the window and the usual value in words', () => {
    render(<TrendRow value={71} unit="bpm" baseline={baseline} />)
    expect(screen.getByText(strings.trend.title(14))).toBeInTheDocument()
    expect(screen.getByText(/Close to usual/)).toHaveTextContent('Usual: 70 bpm')
  })

  it('says higher or lower when the value is past the usual band', () => {
    const { rerender } = render(<TrendRow value={90} unit="bpm" baseline={baseline} />)
    expect(screen.getByText(/Higher than usual/)).toBeInTheDocument()
    rerender(<TrendRow value={50} unit="bpm" baseline={baseline} />)
    expect(screen.getByText(/Lower than usual/)).toBeInTheDocument()
  })

  it('moves the dot with the value and keeps the shape hidden from readers', () => {
    const { container, rerender } = render(
      <TrendRow value={70} unit="bpm" baseline={baseline} />,
    )
    const left = () => (container.querySelector('.trend__dot') as HTMLElement).style.left
    expect(left()).toBe('50%')
    rerender(<TrendRow value={76} unit="bpm" baseline={baseline} />)
    expect(parseFloat(left())).toBeGreaterThan(50)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('says there is not enough to compare without a baseline', () => {
    render(<TrendRow value={70} unit="bpm" baseline={{ median: null, spread: null, n: 2 }} />)
    expect(screen.getByText(strings.trend.notEnough(2, 3))).toBeInTheDocument()
  })

  it('names the context of the missing readings', () => {
    render(
      <TrendRow
        value={70}
        unit="bpm"
        baseline={{ median: null, spread: null, n: 0 }}
        context="before_sleep"
      />,
    )
    expect(
      screen.getByText(
        'Not enough earlier readings before sleep to compare yet (0 of 3).',
      ),
    ).toBeInTheDocument()
  })

  it('keeps the unit in a span that CSS leaves in its case', () => {
    const { container } = render(
      <TrendRow value={71} unit="mmHg" baseline={baseline} />,
    )
    expect(container.querySelector('.trend__unit')).toHaveTextContent('70 mmHg')
  })
})
