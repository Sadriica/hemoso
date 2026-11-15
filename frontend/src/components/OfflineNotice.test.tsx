import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpSync, NoopSync } from '../data/sync'
import { strings } from '../strings'
import OfflineNotice from './OfflineNotice'

function setOnline(value: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)
}

afterEach(() => vi.restoreAllMocks())

describe('OfflineNotice', () => {
  it('shows the sentence as a status when offline with a server', () => {
    setOnline(false)
    render(<OfflineNotice client={new HttpSync('http://x')} />)
    const note = screen.getByRole('status')
    expect(note).toHaveTextContent(strings.sync.offlineNotice)
    expect(note.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders nothing while online or without a server', () => {
    setOnline(true)
    const { container, unmount } = render(<OfflineNotice client={new HttpSync('http://x')} />)
    expect(container).toBeEmptyDOMElement()
    unmount()
    setOnline(false)
    const again = render(<OfflineNotice client={new NoopSync()} />)
    expect(again.container).toBeEmptyDOMElement()
  })

  it('follows the browser going offline and back', () => {
    setOnline(true)
    render(<OfflineNotice client={new HttpSync('http://x')} />)
    expect(screen.queryByRole('status')).toBeNull()
    act(() => window.dispatchEvent(new Event('offline')))
    expect(screen.getByRole('status')).toBeInTheDocument()
    act(() => window.dispatchEvent(new Event('online')))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
