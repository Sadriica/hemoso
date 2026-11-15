import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { usePainSync } from './usePainSync'
import { createPainClient, type PainClient, type PainSendOutcome } from '../data/painClient'
import { pendingPainItems } from '../data/painOutbox'
import { readPainReports, savePainReport, type ServerPainReport } from '../data/painStore'

const REPORT = {
  personId: 'ana_1',
  missionDay: 5,
  time: '10:00',
  regions: [{ regionId: 'left_knee', kind: 'pain' as const, intensity: 4 }],
  note: 'after the treadmill',
}

const ROW: ServerPainReport = {
  personId: 'ana_1',
  regionId: 'right_ankle',
  kind: 'swelling',
  intensity: 2,
  missionDay: 4,
  time: '18:00',
  note: null,
}

// A pain client with one answer for the read, an answer per send, and a record
// of what it was asked and given.
function fakePain(
  rows: ServerPainReport[] | null,
  outcomes: PainSendOutcome[] = [],
): {
  asked: string[]
  sent: string[]
  client: PainClient
} {
  const asked: string[] = []
  const sent: string[] = []
  const queue = [...outcomes]
  return {
    asked,
    sent,
    client: {
      isConfigured: () => true,
      fetchReports: (personId) => {
        asked.push(personId)
        return Promise.resolve(rows)
      },
      send: (item) => {
        sent.push(item.regionId)
        return Promise.resolve(queue.shift() ?? 'sent')
      },
    },
  }
}

describe('usePainSync', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  it('merges the reports the server holds when the person signs in', async () => {
    const { asked, client } = fakePain([ROW])
    renderHook(() => usePainSync(client, 'ana_1', 'account'))

    await waitFor(() => expect(readPainReports('ana_1')).toHaveLength(1))
    expect(asked).toContain('ana_1')
    // The row arrives already stored: nothing is queued to go back.
    expect(pendingPainItems('ana_1')).toEqual([])
    expect(readPainReports('ana_1')[0]?.regions).toEqual([
      { regionId: 'right_ankle', kind: 'swelling', intensity: 2 },
    ])
  })

  it('sends what this device saved before the sign-in', async () => {
    savePainReport(REPORT)
    const { sent, client } = fakePain([])
    renderHook(() => usePainSync(client, 'ana_1', 'account'))

    await waitFor(() => expect(pendingPainItems('ana_1')).toEqual([]))
    expect(sent).toEqual(['left_knee'])
  })

  it('starts a round when a report is saved in this session', async () => {
    const { sent, client } = fakePain([])
    renderHook(() => usePainSync(client, 'ana_1', 'account'))
    await waitFor(() => expect(sent).toEqual([]))

    act(() => {
      savePainReport({ ...REPORT, time: '12:30' })
    })

    await waitFor(() => expect(sent).toEqual(['left_knee']))
    expect(pendingPainItems('ana_1')).toEqual([])
  })

  it('keeps a report the server holds another value for, and stops asking', async () => {
    const { sent, client } = fakePain([], ['conflict'])
    renderHook(() => usePainSync(client, 'ana_1', 'account'))
    act(() => {
      savePainReport(REPORT)
    })

    await waitFor(() => expect(sent).toEqual(['left_knee']))
    await waitFor(() => expect(pendingPainItems('ana_1')).toEqual([]))
    // Still on the device, so the astronaut can read what they marked.
    expect(readPainReports('ana_1')).toHaveLength(1)
  })

  it('makes no request for the demo astronaut', async () => {
    const { asked, sent, client } = fakePain([ROW])
    renderHook(() => usePainSync(client, 'demo_astronaut_1', 'demo'))
    act(() => {
      savePainReport({ ...REPORT, personId: 'demo_astronaut_1' })
    })

    expect(asked).toEqual([])
    expect(sent).toEqual([])
    expect(readPainReports('demo_astronaut_1')).toHaveLength(1)
    expect(pendingPainItems('demo_astronaut_1')).toHaveLength(1)
  })

  it('does nothing without a base URL', () => {
    savePainReport(REPORT)
    renderHook(() => usePainSync(createPainClient(''), 'ana_1', 'account'))
    expect(readPainReports('ana_1')).toHaveLength(1)
    expect(pendingPainItems('ana_1')).toHaveLength(1)
  })

  it('keeps the device reports when the read fails', async () => {
    savePainReport(REPORT)
    const { client } = fakePain(null)
    renderHook(() => usePainSync(client, 'ana_1', 'account'))
    await waitFor(() => expect(readPainReports('ana_1')).toHaveLength(1))
  })
})
