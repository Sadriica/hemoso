import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Body3D from './Body3D'
import { bodyWords } from './words'

// jsdom has no WebGL, so every test here takes the documented fallback: the 2D
// silhouette and the same list of body parts. The canvas path is proved by the
// e2e spec in e2e/body3d.spec.ts, on a real browser.
describe('Body3D without WebGL', () => {
  it('draws the 2D silhouette with the label and no inert list of regions', () => {
    const { container } = render(
      <Body3D mode="status" system="neuro" label="Body zone: Mood" />,
    )
    expect(screen.getByRole('img', { name: 'Body zone: Mood' })).toBeInTheDocument()
    expect(container.querySelector('.body-silhouette')).not.toBeNull()
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByRole('group', { name: bodyWords.regionsLabel })).toBeNull()
  })

  it('names the lit places in text a screen reader reads', () => {
    render(<Body3D mode="status" system="cardiovascular" state="review" />)
    expect(screen.getByText(/^Lit: .*Chest/)).toBeInTheDocument()
  })

  it('lights the zone of the system it is given', () => {
    const { container } = render(
      <Body3D mode="status" system="metabolic" label="Body zone: Blood glucose" />,
    )
    const lit = [...container.querySelectorAll('[data-zone][data-lit="true"]')].map(
      (node) => node.getAttribute('data-zone'),
    )
    expect(lit).toEqual(['metabolic'])
    // The systems without an indicator keep the names, never a made-up zone.
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('makes every region a button in pain mode and marks the chosen ones', async () => {
    const onSelect = vi.fn()
    render(
      <Body3D
        mode="pain"
        label="Where does it hurt?"
        selected={['left_knee']}
        onSelect={onSelect}
      />,
    )
    const list = screen.getByRole('group', { name: bodyWords.regionsLabel })
    expect(within(list).getAllByRole('listitem')).toHaveLength(25)
    expect(
      within(list).getByRole('list', { name: bodyWords.groups.left_leg }),
    ).toBeInTheDocument()
    expect(within(list).getByRole('button', { name: 'Left knee' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(list).getByRole('button', { name: 'Head' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await userEvent.click(within(list).getByRole('button', { name: 'Right foot' }))
    expect(onSelect).toHaveBeenCalledWith('right_foot')
  })

  it('announces the chosen regions in the live region', () => {
    render(<Body3D mode="pain" selected={['left_knee', 'head']} />)
    expect(screen.getByRole('status')).toHaveTextContent('Selected: Left knee, Head')
  })
})
