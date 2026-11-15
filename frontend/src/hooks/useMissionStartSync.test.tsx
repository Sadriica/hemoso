import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useMissionStartSync } from './useMissionStartSync'
import { createProfileClient, type ProfileAnswer, type ProfileClient } from '../data/profileClient'
import { getMissionStart, setMissionStart } from '../data/missionStart'

// A profile client with one answer, and a record of what it was asked and told.
function fakeProfile(answer: ProfileAnswer): {
  asked: string[]
  saved: Array<{ personId: string; date: string }>
  client: ProfileClient
} {
  const asked: string[] = []
  const saved: Array<{ personId: string; date: string }> = []
  return {
    asked,
    saved,
    client: {
      isConfigured: () => true,
      fetchProfile: (personId) => {
        asked.push(personId)
        return Promise.resolve(answer)
      },
      saveMissionStart: (personId, date) => {
        saved.push({ personId, date })
        return Promise.resolve(true)
      },
    },
  }
}

function account(missionStart: string | null): ProfileAnswer {
  return { kind: 'found', profile: { personId: 'ana_1', missionStart } }
}

describe('useMissionStartSync', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  it('uses the account date when it has one, over the copy on this device', async () => {
    setMissionStart('ana_1', '2026-11-01')
    const { saved, client } = fakeProfile(account('2026-11-05'))
    renderHook(() => useMissionStartSync(client, 'ana_1', 'account'))

    await waitFor(() => expect(getMissionStart('ana_1')).toBe('2026-11-05'))
    // The account already held it: nothing is written back.
    expect(saved).toEqual([])
  })

  it('sends the date this device has when the account holds none', async () => {
    setMissionStart('ana_1', '2026-11-02')
    const { saved, client } = fakeProfile(account(null))
    renderHook(() => useMissionStartSync(client, 'ana_1', 'account'))

    await waitFor(() => expect(saved).toEqual([{ personId: 'ana_1', date: '2026-11-02' }]))
    expect(getMissionStart('ana_1')).toBe('2026-11-02')
  })

  it('sends nothing when neither side has a date', async () => {
    const { asked, saved, client } = fakeProfile(account(null))
    renderHook(() => useMissionStartSync(client, 'ana_1', 'account'))

    await waitFor(() => expect(asked).toContain('ana_1'))
    expect(saved).toEqual([])
    expect(getMissionStart('ana_1')).toBeNull()
  })

  it('keeps the device copy, silently, when the route is not there', async () => {
    setMissionStart('ana_1', '2026-11-01')
    const { asked, saved, client } = fakeProfile({ kind: 'missing' })
    renderHook(() => useMissionStartSync(client, 'ana_1', 'account'))

    await waitFor(() => expect(asked).toContain('ana_1'))
    expect(saved).toEqual([])
    expect(getMissionStart('ana_1')).toBe('2026-11-01')
  })

  it('keeps the device copy when the account answers nothing usable', async () => {
    setMissionStart('ana_1', '2026-11-01')
    const { asked, saved, client } = fakeProfile({ kind: 'retry' })
    renderHook(() => useMissionStartSync(client, 'ana_1', 'account'))

    await waitFor(() => expect(asked).toContain('ana_1'))
    expect(saved).toEqual([])
    expect(getMissionStart('ana_1')).toBe('2026-11-01')
  })

  it('asks nothing for the demo astronaut or before sign-in', async () => {
    const demo = fakeProfile(account('2026-11-05'))
    renderHook(() => useMissionStartSync(demo.client, 'demo_astronaut_1', 'demo'))
    const nobody = fakeProfile(account('2026-11-05'))
    renderHook(() => useMissionStartSync(nobody.client, null, null))

    expect(demo.asked).toEqual([])
    expect(nobody.asked).toEqual([])
  })

  it('asks nothing without a base URL', () => {
    setMissionStart('ana_1', '2026-11-01')
    renderHook(() => useMissionStartSync(createProfileClient(''), 'ana_1', 'account'))
    expect(getMissionStart('ana_1')).toBe('2026-11-01')
  })
})
