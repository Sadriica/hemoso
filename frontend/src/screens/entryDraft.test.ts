import { describe, expect, it } from 'vitest'
import { parseDraft, parseReport, readingRows } from './entryDraft'
import type { Indicator } from '../domain/types'
import {
  REACTION_INDICATOR_IDS,
  REACTION_LAPSES_ID,
  REACTION_MEDIAN_ID,
} from '../reaction/ids'
import { strings } from '../strings'

// The rules behind the Entry form, away from the DOM: the browser's own number
// input refuses a value it cannot read, so these cases are checked here.

const measured = { unit: 'bpm', missionDay: '41', time: '13:30' }
const scale = { unit: '1 to 5', missionDay: '41', time: '13:30' }

describe('parseDraft', () => {
  it('accepts a value, a whole day and a 24-hour time', () => {
    expect(parseDraft({ ...measured, value: '56.5' })).toEqual({
      ok: true,
      value: 56.5,
      missionDay: 41,
      time: '13:30',
    })
  })

  it('asks for a value when the field is empty', () => {
    expect(parseDraft({ ...measured, value: '  ' })).toEqual({
      ok: false,
      errors: { value: 'Enter a value.' },
    })
  })

  it('asks for a number when the value is not finite', () => {
    expect(parseDraft({ ...measured, value: '1e400' })).toEqual({
      ok: false,
      errors: { value: 'Enter a number.' },
    })
  })

  it('asks for a whole day above zero', () => {
    for (const missionDay of ['0', '-3', '2.5', '', 'abc']) {
      const draft = parseDraft({ ...measured, value: '1', missionDay })
      expect(draft, missionDay).toEqual({
        ok: false,
        errors: { missionDay: 'Enter a whole mission day, 1 or more.' },
      })
    }
  })

  it('asks for a time as HH:MM', () => {
    for (const time of ['', '9:05', '24:00', '13:60', 'late']) {
      const draft = parseDraft({ ...measured, value: '1', time })
      expect(draft, time).toEqual({
        ok: false,
        errors: { time: 'Enter a time as HH:MM.' },
      })
    }
  })

  it('reports every problem at once', () => {
    expect(parseDraft({ ...measured, value: '', missionDay: '0', time: '' })).toEqual(
      {
        ok: false,
        errors: {
          value: 'Enter a value.',
          missionDay: 'Enter a whole mission day, 1 or more.',
          time: 'Enter a time as HH:MM.',
        },
      },
    )
  })

  it('accepts only whole numbers from 1 to 5 on a 1 to 5 scale', () => {
    for (const value of ['1', '2', '3', '4', '5']) {
      const draft = parseDraft({ ...scale, value })
      expect(draft, value).toEqual({
        ok: true,
        value: Number(value),
        missionDay: 41,
        time: '13:30',
      })
    }

    for (const value of ['', '0', '6', '7', '-2', '2.5', 'many']) {
      const draft = parseDraft({ ...scale, value })
      expect(draft, value).toEqual({
        ok: false,
        errors: { value: 'Choose a value from 1 to 5.' },
      })
    }
  })
})

// One row of the screen: the indicator, its unit and what the person typed.
const heart = { indicatorId: 'hr_bpm', label: 'Heart rate', unit: 'bpm' }
const moodField = { indicatorId: 'mood_1_5', label: 'Mood', unit: '1 to 5' }
const systolic = {
  indicatorId: 'bp_sys_mmhg',
  label: 'Systolic',
  unit: 'mmHg',
  pair: 'bp',
}
const diastolic = {
  indicatorId: 'bp_dia_mmhg',
  label: 'Diastolic',
  unit: 'mmHg',
  pair: 'bp',
}

describe('parseReport', () => {
  it('saves every filled row with the one day and time', () => {
    expect(
      parseReport(
        [
          { ...heart, value: '57' },
          { ...heart, indicatorId: 'temp_core_c', unit: '°C', value: '36.7' },
        ],
        '41',
        '13:30',
      ),
    ).toEqual({
      ok: true,
      readings: [
        { indicatorId: 'hr_bpm', unit: 'bpm', value: 57 },
        { indicatorId: 'temp_core_c', unit: '°C', value: 36.7 },
      ],
      missionDay: 41,
      time: '13:30',
    })
  })

  it('reads an empty row as a reading that was not taken', () => {
    expect(
      parseReport([{ ...heart, value: '  ' }, { ...moodField, value: '' }], '41', '13:30'),
    ).toEqual({ ok: true, readings: [], missionDay: 41, time: '13:30' })
  })

  it('refuses the whole report when one filled row is wrong', () => {
    const draft = parseReport(
      [
        { ...heart, value: '57' },
        { ...heart, indicatorId: 'temp_core_c', value: 'warm' },
      ],
      '41',
      '13:30',
    )
    expect(draft).toEqual({
      ok: false,
      valueErrors: { temp_core_c: strings.entry.errors.valueNumber },
      missionDay: undefined,
      time: undefined,
    })
  })

  it('refuses a value that is not a number at all', () => {
    const draft = parseReport([{ ...heart, value: '1e400' }], '41', '13:30')
    expect(draft).toEqual({
      ok: false,
      valueErrors: { hr_bpm: strings.entry.errors.valueNumber },
      missionDay: undefined,
      time: undefined,
    })
  })

  it('accepts only 1 to 5 on a scale row', () => {
    const draft = parseReport([{ ...moodField, value: '7' }], '41', '13:30')
    expect(draft).toEqual({
      ok: false,
      valueErrors: { mood_1_5: strings.entry.errors.valueScale },
      missionDay: undefined,
      time: undefined,
    })
  })

  it('asks for both blood pressures when one of them is written', () => {
    expect(
      parseReport(
        [
          { ...systolic, value: '120' },
          { ...diastolic, value: '' },
        ],
        '41',
        '13:30',
      ),
    ).toEqual({
      ok: false,
      valueErrors: { bp_dia_mmhg: strings.entry.errors.valueRequired },
      missionDay: undefined,
      time: undefined,
    })
  })

  it('keeps both blood pressures as one row of two readings', () => {
    expect(
      parseReport(
        [
          { ...systolic, value: '120' },
          { ...diastolic, value: '80' },
        ],
        '41',
        '13:30',
      ),
    ).toEqual({
      ok: true,
      readings: [
        { indicatorId: 'bp_sys_mmhg', unit: 'mmHg', value: 120 },
        { indicatorId: 'bp_dia_mmhg', unit: 'mmHg', value: 80 },
      ],
      missionDay: 41,
      time: '13:30',
    })
  })

  it('keeps the day and time rules of the single entry form', () => {
    expect(parseReport([{ ...heart, value: '57' }], '0', 'late')).toEqual({
      ok: false,
      valueErrors: {},
      missionDay: strings.entry.errors.missionDay,
      time: strings.entry.errors.time,
    })
  })
})

// The rows the screen draws, from the indicators file.
function indicator(
  id: string,
  name: string,
  unit: string,
): Indicator {
  return {
    id,
    name,
    unit,
    direction: 'both',
    measuredOnBoard: 'On board',
    hazards: [],
    minSpread: 1,
    sources: ['Assumption'],
  }
}

describe('readingRows', () => {
  it('follows the order of the file and gives every unit its own row', () => {
    const rows = readingRows([
      indicator('hr_bpm', 'Heart rate', 'bpm'),
      indicator('temp_core_c', 'Core temperature', '°C'),
    ])
    expect(rows.map((row) => row.name)).toEqual(['Heart rate', 'Core temperature'])
    expect(rows.map((row) => row.fields.length)).toEqual([1, 1])
    expect(rows[0].system).toBe('cardiovascular')
    expect(rows[1].system).toBe('thermoregulation')
  })

  it('puts the two blood pressures in one row with one icon and one unit', () => {
    const rows = readingRows([
      indicator('bp_sys_mmhg', 'Systolic blood pressure', 'mmHg'),
      indicator('bp_dia_mmhg', 'Diastolic blood pressure', 'mmHg'),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe(strings.entry.bloodPressure)
    expect(rows[0].unit).toBe('mmHg')
    expect(rows[0].fields.map((field) => field.indicatorId)).toEqual([
      'bp_sys_mmhg',
      'bp_dia_mmhg',
    ])
    expect(rows[0].fields.map((field) => field.label)).toEqual([
      strings.entry.systolic,
      strings.entry.diastolic,
    ])
  })

  it('draws a 1 to 5 unit as a scale row', () => {
    const rows = readingRows([indicator('mood_1_5', 'Mood', '1 to 5')])
    expect(rows[0].scale).toBe(true)
    expect(rows[0].system).toBe('neuro')
  })

  it('leaves out the two ids the reaction check measures itself', () => {
    const rows = readingRows([
      indicator('hr_bpm', 'Heart rate', 'bpm'),
      indicator(REACTION_MEDIAN_ID, 'Reaction time median', 'ms'),
      indicator('temp_core_c', 'Core temperature', '°C'),
      indicator(REACTION_LAPSES_ID, 'Reaction lapses', 'count'),
    ])
    expect(rows.map((row) => row.key)).toEqual(['hr_bpm', 'temp_core_c'])
    // The one list the check writes and this screen skips stay the same list.
    expect([REACTION_MEDIAN_ID, REACTION_LAPSES_ID]).toEqual(REACTION_INDICATOR_IDS)
  })
})

