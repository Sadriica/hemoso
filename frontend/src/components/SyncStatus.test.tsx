import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SyncStatus from './SyncStatus'
import { LocalEntryStore } from '../data/entryStore'
import { HttpSync, NoopSync, type FetchLike, type SyncClient } from '../data/sync'
import type { Entry } from '../domain/types'
import { strings } from '../strings'

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
    context: 'rest',
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

// The chip is found by its title, which is the whole sentence: the visible text
// splits the count from its word on a narrow screen.
function chipOf(state: string, detail: string): HTMLElement {
  return screen.getByTitle(strings.sync.chip(state, detail))
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
  it('says there is no server and that the readings stay here', () => {
    renderStatus()
    const chip = chipOf(strings.sync.noServer, strings.sync.savedHere)
    expect(chip).toHaveTextContent(
      strings.sync.chip(strings.sync.noServer, strings.sync.savedHere),
    )
    expect(screen.queryByRole('button', { name: strings.sync.sendNow })).toBeNull()
  })

  it('counts the entries that wait for a server', () => {
    renderStatus(new NoopSync(), [newEntry(), newEntry(57)])
    const chip = chipOf(
      strings.sync.noServer,
      strings.sync.waiting(2),
    )
    expect(chip).toHaveTextContent(strings.sync.waiting(2))
  })

  it('turns to all sent once the outbox is empty', async () => {
    const fake = fakeFetch()
    const store = renderStatus(new HttpSync('https://api.test', fake.fetchFn), [
      newEntry(),
    ])
    await waitFor(() => expect(store.pending()).toHaveLength(0))
    expect(
      await screen.findByTitle(
        strings.sync.chip(strings.sync.online, strings.sync.allSent),
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.sync.sendNow })).toBeNull()
  })

  it('says how many readings the server did not accept', async () => {
    const fake = fakeFetch([409, 422])
    renderStatus(new HttpSync('https://api.test', fake.fetchFn), [
      newEntry(58),
      newEntry(57),
    ])
    const chip = await screen.findByTitle(
      strings.sync.chip(strings.sync.online, strings.sync.notAccepted(2)),
    )
    expect(chip).toHaveTextContent(strings.sync.notAccepted(2))
  })

  it('offers Send now only while something waits', async () => {
    const fake = fakeFetch([201])
    const store = renderStatus(new HttpSync('https://api.test', fake.fetchFn), [
      newEntry(),
    ])
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: strings.sync.sendNow }),
      ).toBeNull(),
    )

    act(() => {
      store.add(newEntry(57))
    })
    const send = screen.getByRole('button', { name: strings.sync.sendNow })
    send.focus()
    await userEvent.setup().keyboard('{Enter}')
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: strings.sync.sendNow }),
      ).toBeNull(),
    )
    expect(store.pending()).toHaveLength(0)
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
    const send = screen.getByRole('button', { name: strings.sync.sendNow })
    send.focus()
    expect(send).toHaveFocus()
    await user.keyboard('{Enter}')

    await waitFor(() => expect(fake.calls()).toBe(2))
    expect(
      await screen.findByTitle(
        strings.sync.chip(strings.sync.online, strings.sync.allSent),
      ),
    ).toBeInTheDocument()
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
    expect(
      screen.getByTitle(
        strings.sync.chip(strings.sync.online, strings.sync.allSent),
      ),
    ).toBeInTheDocument()
  })

  it('says Offline in words on the offline event', async () => {
    renderStatus()
    expect(
      screen.getByTitle(
        strings.sync.chip(strings.sync.noServer, strings.sync.savedHere),
      ),
    ).toBeInTheDocument()

    setOnline(false)
    await act(async () => {
      window.dispatchEvent(new Event('offline'))
    })

    const offline = screen.getByTitle(
      strings.sync.chip(strings.sync.noServer, strings.sync.savedHere),
    )
    // No server: the state stays "No server", which is the one that matters.
    expect(offline).toHaveTextContent(strings.sync.noServer)
    expect(screen.queryByText(strings.sync.online)).toBeNull()

    // With a server, the same event turns the same chip to Offline.
    renderStatus(new HttpSync('https://api.test', fakeFetch().fetchFn))
    const offlineChip = screen.getAllByTitle(
      strings.sync.chip(strings.sync.offline, strings.sync.allSent),
    )
    expect(offlineChip.length).toBeGreaterThan(0)
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

    const send = screen.getByRole('button', { name: strings.sync.sendNow })
    send.focus()
    await userEvent.setup().keyboard('{Enter}')
    expect(calls).toBe(1)
    expect(store.pending()).toHaveLength(1)
  })
})
