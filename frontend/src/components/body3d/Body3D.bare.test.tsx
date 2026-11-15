import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Body3D from './Body3D'

// The bare body is the figure alone, for the centre of the status orbits. It
// is decoration there: the orbits name the centre in words. jsdom has no
// WebGL, so these tests see the flat body, which is also what a browser
// without WebGL shows.
describe('Body3D bare', () => {
  it('is hidden from assistive technology and has no control of its own', () => {
    const { container } = render(
      <Body3D bare mode="status" system="cardiovascular" state="review" />,
    )
    const figure = container.querySelector('.body3d')
    expect(figure).toHaveClass('body3d--bare')
    expect(figure).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText(/^Lit:/)).toBeNull()
  })

  it('still lights the zone of the selected system on the flat body', () => {
    const { container } = render(<Body3D bare mode="status" system="metabolic" />)
    const lit = [...container.querySelectorAll('[data-zone][data-lit="true"]')].map(
      (zone) => zone.getAttribute('data-zone'),
    )
    expect(lit).toEqual(['metabolic'])
  })

  it('is never an empty box: the flat body is there without WebGL', () => {
    const { container } = render(<Body3D bare mode="status" system={null} />)
    expect(container.querySelector('.body3d--flat .body-silhouette')).not.toBeNull()
  })

  it('takes the pointer only when it is interactive', () => {
    const plain = render(<Body3D bare mode="status" system={null} />)
    expect(plain.container.querySelector('.body3d')).not.toHaveClass('body3d--interactive')
    plain.unmount()
    const live = render(<Body3D bare interactive mode="status" system={null} onSelect={() => {}} />)
    const figure = live.container.querySelector('.body3d')
    expect(figure).toHaveClass('body3d--interactive')
    expect(figure).toHaveAttribute('aria-hidden', 'true')
  })
})
