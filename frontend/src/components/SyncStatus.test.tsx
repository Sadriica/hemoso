import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SyncStatus from './SyncStatus'
import { LocalEntryStore } from '../data/entryStore'
import { HttpSync, NoopSync, type FetchLike, type SyncClient } from '../data/sync'
import type { Entry } from '../domain/types'

// The client only reads `status`; a plain object keeps the test independent of
// the Response implementation of the test runner.
function response(status: number): Response {
  return { status } as unknown as Response
}

// Answers the given statuses in order and counts the calls.
function fakeFetch(statuses: number[] = []): {
  calls: () => number
  fetchFn: FetchLike
} {
  const queue = [...statuses]
  let calls = 0
  return {
    calls: () => calls,
    fetchFn: () => {
      calls += 1
      return Promise.resolve(response(queue.shift() ?? 201))
    },
  }
}

function newEntry(value = 58): Omit<Entry, 'id'> {
  return {
    personId: 'demo_astronaut_1',
    indicatorId: 'hr_bpm',
    value,
    unit: 'bpm',
    missionDay: 2,
    time: '09:15',
  }
}

function renderStatus(
  client: SyncClient = new NoopSync(),
  rows: Array<Omit<Entry, 'id'>> = [],
) {
  const store = new LocalEntryStore({ storage: null })
  for (const row of rows) store.add(row)
  render(<SyncStatus store={store} client={client} />)
  return store
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value,
  })
}

afterEach(() => {
  setOnline(true)
  vi.unstubAllGlobals()
})

describe('SyncStatus', () => {
  it('says nothing is waiting, nothing was sent and the browser is online', () => {
    renderStatus()
    expect(screen.getByText('Nothing waiting to be sent')).toBeInTheDocument()
    expect(screen.getByText('Not sent yet')).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('counts the entries that wait for a server', () => {
    renderStatus(new NoopSync(), [newEntry(), newEntry(57)])
    expect(screen.getByText('2 waiting to be sent')).toBeInTheDocument()
    expect(screen.getByText('Not sent yet')).toBeInTheDocument()
  })

  it('empty outbox, then the last sent time after a round', async () => {
    const fake = fakeFetch()
    const store = renderStatus(new HttpSync('https://api.test', fake.fetchFn), [
      newEntry(),
    ])
    await waitFor(() => expect(store.pending()).toHaveLength(0))
    expect(await screen.findByText('Nothing waiting to be sent')).toBeInTheDocument()
    expect(screen.getByText(/^Last sent: Day \d+ \d\d:\d\d$/)).toBeInTheDocument()
    expect(screen.queryByText('Not sent yet')).toBeNull()
  })

  it('says how many entries the server did not accept', async () => {
    const fake = fakeFetch([409, 422])
    renderStatus(new HttpSync('https://api.test', fake.fetchFn), [
      newEntry(58),
      newEntry(57),
    ])
    expect(
      await screen.findByText('2 not accepted by the server'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Nothing waiting to be sent')).toBeInTheDocument()
  })

  it('disables Send now and gives the reason when no server is set up', () => {
    renderStatus()
    const send = screen.getByRole('button', { name: 'Send now' })
    expect(send).toBeDisabled()
    expect(send).toHaveAccessibleDescription('No server set up for this demo')
    expect(screen.getByText('No server set up for this demo')).toBeInTheDocument()
  })

  it('sends what was waiting when the status appears', async () => {
    const fake = fakeFetch([201])
    const store = renderStatus(new HttpSync('https://api.test', fake.fetchFn), [
      newEntry(),
    ])
    await waitFor(() => expect(fake.calls()).toBe(1))
    expect(store.pending()).toHaveLength(0)
  })

  it('sends with the keyboard only and follows the outbox', async () => {
    const user = userEvent.setup()
    const fake = fakeFetch([201, 201])
    const store = renderStatus(new HttpSync('https://api.test', fake.fetchFn), [
      newEntry(),
    ])
    await waitFor(() => expect(store.pending()).toHaveLength(0))

    act(() => {
      store.add(newEntry(57))
    })
    const send = screen.getByRole('button', { name: 'Send now' })
    send.focus()
    expect(send).toHaveFocus()
    await user.keyboard('{Enter}')

    await waitFor(() => expect(fake.calls()).toBe(2))
    expect(await screen.findByText('Nothing waiting to be sent')).toBeInTheDocument()
  })

  it('sends again on the online event', async () => {
    const fake = fakeFetch([201, 201])
    const store = renderStatus(new HttpSync('https://api.test', fake.fetchFn), [
      newEntry(),
    ])
    await waitFor(() => expect(store.pending()).toHaveLength(0))

    setOnline(false)
    act(() => {
      store.add(newEntry(57))
    })
    expect(fake.calls()).toBe(1)

    setOnline(true)
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })
    await waitFor(() => expect(fake.calls()).toBe(2))
    expect(store.pending()).toHaveLength(0)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('says Offline in words on the offline event', async () => {
    renderStatus()
    expect(screen.getByText('Online')).toBeInTheDocument()

    setOnline(false)
    await act(async () => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.queryByText('Online')).toBeNull()
  })

  it('runs one round at a time', async () => {
    let calls = 0
    // Never answers, so the first round is still running on the second click.
    const fetchFn: FetchLike = () => {
      calls += 1
      return new Promise<Response>(() => {})
    }
    const store = renderStatus(new HttpSync('https://api.test', fetchFn), [
      newEntry(),
    ])
    await waitFor(() => expect(calls).toBe(1))

    const send = screen.getByRole('button', { name: 'Send now' })
    send.focus()
    await userEvent.setup().keyboard('{Enter}')
    expect(calls).toBe(1)
    expect(store.pending()).toHaveLength(1)
  })
})
