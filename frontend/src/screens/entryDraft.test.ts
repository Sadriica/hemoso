import { describe, expect, it } from 'vitest'
import { parseDraft } from './entryDraft'

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
