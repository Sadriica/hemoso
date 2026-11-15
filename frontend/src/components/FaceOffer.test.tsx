import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { faceOfferDismissed } from '../data/faceOffer'
import { saveFace } from '../face/descriptors'
import { strings } from '../strings'
import FaceOffer from './FaceOffer'

const copy = strings.signIn

function fakeCamera() {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn() },
  })
}

function noCamera() {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: undefined,
  })
}

beforeEach(() => {
  localStorage.clear()
  fakeCamera()
})

afterEach(() => {
  noCamera()
  localStorage.clear()
})

describe('FaceOffer', () => {
  it('is one quiet line with two controls, and no heading of its own', () => {
    render(<FaceOffer personId="cadet_okoro" />)
    expect(screen.getByText(copy.faceOfferLine)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.faceOfferAction })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.faceOfferSkip })).toBeInTheDocument()
    expect(screen.queryByRole('heading')).toBeNull()
  })

  it('goes away on Not now and is not shown again for that person on this device', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<FaceOffer personId="cadet_okoro" />)
    await user.click(screen.getByRole('button', { name: copy.faceOfferSkip }))
    expect(screen.queryByText(copy.faceOfferLine)).toBeNull()
    expect(faceOfferDismissed('cadet_okoro')).toBe(true)
    unmount()

    // The next sign-in of the same person: nothing.
    render(<FaceOffer personId="cadet_okoro" />)
    expect(screen.queryByText(copy.faceOfferLine)).toBeNull()
  })

  it('still offers it to another person on the same device', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<FaceOffer personId="cadet_okoro" />)
    await user.click(screen.getByRole('button', { name: copy.faceOfferSkip }))
    unmount()

    render(<FaceOffer personId="wambi" />)
    expect(screen.getByText(copy.faceOfferLine)).toBeInTheDocument()
  })

  it('is not shown without a camera', () => {
    noCamera()
    const { container } = render(<FaceOffer personId="cadet_okoro" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is not shown when a face of that person is already on this device', () => {
    saveFace({ personId: 'cadet_okoro', descriptor: [1, 1] })
    const { container } = render(<FaceOffer personId="cadet_okoro" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('opens the consent text before any camera, on the action', async () => {
    const user = userEvent.setup()
    render(<FaceOffer personId="cadet_okoro" />)
    await user.click(screen.getByRole('button', { name: copy.faceOfferAction }))
    expect(await screen.findByText(strings.face.consent)).toBeInTheDocument()
  })
})
