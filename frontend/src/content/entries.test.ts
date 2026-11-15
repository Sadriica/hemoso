import { describe, expect, it } from 'vitest'
import { parseEntries } from './entries'
import type { Indicator } from '../domain/types'

const indicator: Indicator = {
  id: 'example_indicator',
  name: 'Example indicator',
  unit: 'example_unit',
  direction: 'higher',
  measuredOnBoard: 'example measurement method',
  hazards: ['isolation_and_confinement'],
  sources: ['Assumption'],
}

const header = 'person_id,indicator_id,value,unit,mission_day,time\n'

describe('parseEntries', () => {
  it('parses a valid entry and derives its id', () => {
    const problems: string[] = []
    const entries = parseEntries(
      'config/data/demo_data.csv',
      header + 'demo_astronaut_1,example_indicator,1,example_unit,1,13:30\n',
      [indicator],
      problems,
    )
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      personId: 'demo_astronaut_1',
      indicatorId: 'example_indicator',
      value: 1,
      missionDay: 1,
      time: '13:30',
    })
    expect(entries[0].id).toBe('demo_astronaut_1:example_indicator:1:13:30')
    expect(problems).toEqual([])
  })

  it('reports an unknown indicator id and skips the row', () => {
    const problems: string[] = []
    const entries = parseEntries(
      'config/data/demo_data.csv',
      header + 'demo_astronaut_1,unknown_indicator,1,example_unit,1,13:30\n',
      [indicator],
      problems,
    )
    expect(entries).toHaveLength(0)
    expect(
      problems.some((problem) =>
        problem.includes("Unknown indicator id 'unknown_indicator'"),
      ),
    ).toBe(true)
  })

  it('reports a unit mismatch', () => {
    const problems: string[] = []
    parseEntries(
      'config/data/demo_data.csv',
      header + 'demo_astronaut_1,example_indicator,1,wrong_unit,1,13:30\n',
      [indicator],
      problems,
    )
    expect(
      problems.some((problem) => problem.includes("does not match 'example_unit'")),
    ).toBe(true)
  })

  it('reports an empty value and skips the row', () => {
    const problems: string[] = []
    const entries = parseEntries(
      'config/data/demo_data.csv',
      header + 'demo_astronaut_1,example_indicator,,example_unit,1,13:30\n',
      [indicator],
      problems,
    )
    expect(entries).toHaveLength(0)
    expect(
      problems.some((problem) => problem.includes('missing or non-numeric value')),
    ).toBe(true)
  })

  it('reports an invalid time and skips the row', () => {
    const problems: string[] = []
    const entries = parseEntries(
      'config/data/demo_data.csv',
      header + 'demo_astronaut_1,example_indicator,1,example_unit,1,9:05\n',
      [indicator],
      problems,
    )
    expect(entries).toHaveLength(0)
    expect(problems.some((problem) => problem.includes("invalid time '9:05'"))).toBe(
      true,
    )
  })

  it('reports a non-positive mission day and skips the row', () => {
    const problems: string[] = []
    const entries = parseEntries(
      'config/data/demo_data.csv',
      header + 'demo_astronaut_1,example_indicator,1,example_unit,0,13:30\n',
      [indicator],
      problems,
    )
    expect(entries).toHaveLength(0)
    expect(
      problems.some((problem) => problem.includes('not a positive integer')),
    ).toBe(true)
  })

  it('reports a duplicate entry and keeps the first', () => {
    const problems: string[] = []
    const row = 'demo_astronaut_1,example_indicator,1,example_unit,1,13:30\n'
    const entries = parseEntries(
      'config/data/demo_data.csv',
      header + row + row,
      [indicator],
      problems,
    )
    expect(entries).toHaveLength(1)
    expect(
      problems.some((problem) =>
        problem.includes(
          "Duplicate demo entry 'demo_astronaut_1:example_indicator:1:13:30'",
        ),
      ),
    ).toBe(true)
  })

  it('reports a header without time once and reads no rows', () => {
    const problems: string[] = []
    const entries = parseEntries(
      'config/data/demo_data.csv',
      'person_id,indicator_id,value,unit,mission_day\n' +
        'demo_astronaut_1,example_indicator,1,example_unit,1\n',
      [indicator],
      problems,
    )
    expect(entries).toEqual([])
    expect(problems).toEqual([
      "Missing column 'time' in config/data/demo_data.csv.",
    ])
  })

  it('reads the context of a reading', () => {
    const problems: string[] = []
    const entries = parseEntries(
      'config/data/demo_data.csv',
      'person_id,indicator_id,value,unit,mission_day,time,context\n' +
        'demo_astronaut_1,example_indicator,90,example_unit,7,18:00,after_exercise\n',
      [indicator],
      problems,
    )
    expect(entries).toHaveLength(1)
    expect(entries[0].context).toBe('after_exercise')
    expect(problems).toEqual([])
  })

  it('reads a file without the context column as at rest', () => {
    const problems: string[] = []
    const entries = parseEntries(
      'config/data/demo_data.csv',
      header + 'demo_astronaut_1,example_indicator,1,example_unit,1,13:30\n',
      [indicator],
      problems,
    )
    expect(entries[0].context).toBe('rest')
    expect(problems).toEqual([])
  })

  it('reads an empty context cell as at rest', () => {
    const problems: string[] = []
    const entries = parseEntries(
      'config/data/demo_data.csv',
      'person_id,indicator_id,value,unit,mission_day,time,context\n' +
        'demo_astronaut_1,example_indicator,1,example_unit,1,13:30,\n',
      [indicator],
      problems,
    )
    expect(entries[0].context).toBe('rest')
    expect(problems).toEqual([])
  })

  it('reports an invalid context and skips the row', () => {
    const problems: string[] = []
    const entries = parseEntries(
      'config/data/demo_data.csv',
      'person_id,indicator_id,value,unit,mission_day,time,context\n' +
        'demo_astronaut_1,example_indicator,1,example_unit,1,13:30,nap\n',
      [indicator],
      problems,
    )
    expect(entries).toEqual([])
    expect(problems).toEqual([
      "Entry for 'example_indicator' has an invalid context 'nap'.",
    ])
  })

  it('drops an unknown indicator without a problem when asked to skip it', () => {
    const problems: string[] = []
    const entries = parseEntries(
      'config/data/demo_data.csv',
      header +
        'demo_astronaut_1,example_indicator,1,example_unit,1,13:30\n' +
        'demo_astronaut_1,other_indicator,2,other_unit,1,14:00\n',
      [indicator],
      problems,
      { skipUnknownIndicators: true },
    )
    expect(entries).toHaveLength(1)
    expect(problems).toEqual([])
  })
})
