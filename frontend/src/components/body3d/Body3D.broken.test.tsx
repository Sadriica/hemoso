import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A browser that hands out a WebGL context and then fails to draw with it: the
// probe says yes, the renderer throws. The figure must fall back to the flat
// body and its list of parts, and the page must stay up.
vi.mock('./scene', () => ({
  createBodyScene: () => {
    throw new TypeError("Cannot read properties of null (reading 'precision')")
  },
}))

describe('Body3D with a WebGL context that cannot draw', () => {
  afterEach(() => vi.restoreAllMocks())

  it('falls back to the flat body and keeps the list of parts', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ({ getExtension: () => null }) as never,
    )
    const { default: Body3D } = await import('./Body3D')
    const { container } = render(
      <Body3D mode="pain" label="Where does it hurt?" onSelect={() => {}} />,
    )
    expect(container.querySelector('.body3d--flat')).not.toBeNull()
    expect(container.querySelector('canvas')).toBeNull()
    expect(screen.getByRole('button', { name: 'Left knee' })).toBeInTheDocument()
  })
})
