import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Entry from './Entry'
import { LocalEntryStore } from '../data/entryStore'
import { getMissionStart } from '../data/missionStart'
import { useMissionStartSync } from '../hooks/useMissionStartSync'
import type { ProfileAnswer, ProfileClient } from '../data/profileClient'
import type { Indicator } from '../domain/types'
import { strings } from '../strings'

const heartRate: Indicator = {
  id: 'hr_bpm',
  name: 'Heart rate',
  unit: 'bpm',
  direction: 'both',
  measuredOnBoard: 'ECG',
  hazards: ['gravity_fields'],
  minSpread: 4,
  sources: ['Assumption'],
}

// The report form with the sync hook of the app next to it, as App wires them.
function Wired({
  client,
  store,
  serverConfigured = false,
}: {
  client: ProfileClient
  store: LocalEntryStore
  serverConfigured?: boolean
}) {
  useMissionStartSync(client, 'ana_1', 'account')
  return (
    <Entry
      store={store}
      personId="ana_1"
      indicators={[heartRate]}
      entries={[]}
      serverConfigured={serverConfigured}
    />
  )
}

// A profile client whose answer arrives when the test says so.
function slowProfile(): { client: ProfileClient; answer: (value: ProfileAnswer) => void } {
  let resolve: (value: ProfileAnswer) => void = () => {}
  const pending = new Promise<ProfileAnswer>((done) => {
    resolve = done
  })
  return {
    answer: resolve,
    client: {
      isConfigured: () => true,
      fetchProfile: () => pending,
      saveMissionStart: () => Promise.resolve(true),
    },
  }
}

const found = (date: string): ProfileAnswer => ({
  kind: 'found',
  profile: { personId: 'ana_1', missionStart: date },
})

describe('Entry mission day and the synced mission start', () => {
  beforeEach(() => {
    localStorage.clear()
    // Local noon on 2026-11-12 is Flight Day 12 for a start on 2026-11-01.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 12, 12, 0, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('shows the day of the account start once the request resolves', async () => {
    const { client, answer } = slowProfile()
    render(<Wired client={client} store={new LocalEntryStore()} />)
    const field = screen.getByLabelText(strings.entry.missionDay) as HTMLInputElement
    expect(field.value).toBe('1')

    await act(async () => {
      answer(found('2026-11-01'))
    })
    expect(getMissionStart('ana_1')).toBe('2026-11-01')
    expect(field.value).toBe('12')
  })

  it('never replaces a day the person typed', async () => {
    const { client, answer } = slowProfile()
    render(<Wired client={client} store={new LocalEntryStore()} />)
    const field = screen.getByLabelText(strings.entry.missionDay) as HTMLInputElement
    fireEvent.change(field, { target: { value: '7' } })

    await act(async () => {
      answer(found('2026-11-01'))
    })
    expect(getMissionStart('ana_1')).toBe('2026-11-01')
    expect(field.value).toBe('7')
  })
})

describe('Entry send progress', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('counts the readings the outbox confirms and then says sent by itself', () => {
    const store = new LocalEntryStore()
    const temperature: Indicator = { ...heartRate, id: 'temp_core_c', name: 'Core temperature', unit: '°C' }
    render(
      <Entry
        store={store}
        personId="ana_1"
        indicators={[heartRate, temperature]}
        entries={[]}
        serverConfigured
      />,
    )
    fireEvent.change(screen.getByLabelText('Heart rate'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Core temperature'), { target: { value: '36.8' } })
    fireEvent.click(screen.getByRole('button', { name: strings.entry.save }))
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(strings.entry.saved)
    expect(status).not.toHaveTextContent(strings.entry.sendProgress(1, 2))

    const ids = store.pending().map((entry) => entry.id)
    expect(ids).toHaveLength(2)
    const at = { missionDay: 1, time: '13:30' }
    act(() => store.markSent([ids[0]], at))
    expect(status).toHaveTextContent(strings.entry.saved)
    expect(status).toHaveTextContent(strings.entry.sendProgress(1, 2))

    act(() => store.markSent([ids[1]], at))
    expect(status).toHaveTextContent(strings.entry.sent)
    expect(status).not.toHaveTextContent(strings.entry.saved)
    expect(status).not.toHaveTextContent('of 2 sent')
  })
})
