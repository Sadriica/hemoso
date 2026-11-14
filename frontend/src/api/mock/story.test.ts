import { describe, expect, it } from 'vitest'
import { MockClient } from '../client'
import { SNAPSHOT_DAYS } from './story'

const client = new MockClient()

describe('synthetic story', () => {
  it('keeps day 22 all green with a prevention step on every system', async () => {
    const status = await client.getCrewStatus('crew_a', 22)
    expect(status.worstLevel).toBe('green')
    expect(status.systems).toHaveLength(5)
    expect(status.systems.every((s) => s.level === 'green')).toBe(true)
    expect(status.systems.every((s) => s.prevention !== undefined)).toBe(true)
  })

  it('turns heart and immune yellow on day 41, each with its own four-part alert', async () => {
    const status = await client.getCrewStatus('crew_a', 41)
    expect(status.worstLevel).toBe('yellow')

    const heart = status.systems.find((s) => s.system === 'heart')
    const immune = status.systems.find((s) => s.system === 'immune')
    expect(heart?.level).toBe('yellow')
    expect(immune?.level).toBe('yellow')

    const alert = heart?.alert
    expect(alert).toBeDefined()
    expect(alert?.whatChanged).toBe(
      'Your resting heart rate has been above your normal for 3 nights and your heart rate variability is lower than usual.',
    )
    expect(alert?.usuallyRelated.map((entry) => entry.situation)).toEqual([
      'the start of a mild infection',
      'several nights of poor rest',
      'a heavier exercise load than usual',
    ])
    expect(alert?.whatToCheck).toBe(
      'Your body temperature tomorrow when you wake up, and whether any symptom appears.',
    )
    expect(alert?.whatToDo).toBe('Prioritise rest tonight.')
    expect(alert?.escalation).toBe(
      'If you have a fever or symptoms tomorrow, HeMoSo will alert the flight surgeon at the next link.',
    )

    // The immune system carries its own alert about skin temperature.
    expect(immune?.alert?.whatChanged).toBe(
      'Your skin temperature has been above your normal for 2 nights.',
    )
  })

  it('turns heart and immune orange on day 42 without unsourced guidance', async () => {
    const status = await client.getCrewStatus('crew_a', 42)
    expect(status.worstLevel).toBe('orange')

    const heart = status.systems.find((s) => s.system === 'heart')
    const immune = status.systems.find((s) => s.system === 'immune')
    expect(heart?.level).toBe('orange')
    expect(immune?.level).toBe('orange')
    expect(heart?.alert?.whatToDo).toBe('Keep resting.')
    expect(immune?.alert?.escalation).toContain('flight surgeon')
  })

  it('marks every source as Assumption', async () => {
    for (const day of SNAPSHOT_DAYS) {
      const status = await client.getCrewStatus('crew_a', day)
      for (const system of status.systems) {
        for (const source of system.prevention?.sources ?? []) {
          expect(source).toBe('Assumption')
        }
        for (const related of system.alert?.usuallyRelated ?? []) {
          for (const source of related.sources) {
            expect(source).toBe('Assumption')
          }
        }
      }
    }
  })

  it('shows mission control fitness without any medical detail', async () => {
    for (const day of SNAPSHOT_DAYS) {
      const rows = await client.getMissionControlStatus(day)
      for (const row of rows) {
        expect(Object.keys(row).sort()).toEqual(['crewId', 'fitness', 'label'])
      }
      expect(JSON.stringify(rows)).not.toMatch(
        /resting_hr|hrv|skin_temp|whatChanged|whatToDo|escalation/,
      )
    }
  })

  it('reports crew_a fit on day 41 and fit with restrictions on day 42', async () => {
    const day41 = await client.getMissionControlStatus(41)
    expect(day41.find((r) => r.crewId === 'crew_a')?.fitness).toBe('fit')

    const day42 = await client.getMissionControlStatus(42)
    expect(day42.find((r) => r.crewId === 'crew_a')?.fitness).toBe('fit_with_restrictions')
    expect(day42.filter((r) => r.crewId !== 'crew_a').every((r) => r.fitness === 'fit')).toBe(
      true,
    )
  })

  it('returns deterministic series of 46 days for each signal', async () => {
    for (const signal of ['resting_hr', 'hrv', 'skin_temp']) {
      const first = await client.getSeries('crew_a', signal, 46)
      const second = await client.getSeries('crew_a', signal, 46)
      expect(first).toHaveLength(46)
      expect(first[0].day).toBe(1)
      expect(first[45].day).toBe(46)
      expect(first).toEqual(second)
      expect(first.every((p) => p.low <= p.median && p.median <= p.high)).toBe(true)
    }
  })

  it('returns copies so a screen cannot mutate the shared story', async () => {
    const first = await client.getCrewStatus('crew_a', 41)
    const second = await client.getCrewStatus('crew_a', 41)
    expect(first).not.toBe(second)
    expect(first).toEqual(second)

    first.systems[0].level = 'green'
    const after = await client.getCrewStatus('crew_a', 41)
    expect(after.systems[0].level).toBe('yellow')
  })
})
