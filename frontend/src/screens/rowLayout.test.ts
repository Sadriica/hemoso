import { describe, expect, it } from 'vitest'
import { wideRowKeys } from './rowLayout'

const row = (key: string, scale = false) => ({ key, scale })

describe('wideRowKeys', () => {
  it('widens only a plain row that is alone on its line', () => {
    const rows = [
      row('a'),
      row('b'),
      row('c'),
      row('d'),
      row('mood', true),
      row('e'),
      row('appetite', true),
      row('f'),
      row('g'),
    ]
    expect([...wideRowKeys(rows)]).toEqual(['e'])
  })

  it('widens a lone row before a scale row and one at the end', () => {
    const rows = [row('a'), row('b'), row('c'), row('s', true), row('d')]
    expect([...wideRowKeys(rows)]).toEqual(['c', 'd'])
  })

  it('leaves a full grid alone', () => {
    expect(wideRowKeys([row('a'), row('b'), row('s', true)]).size).toBe(0)
    expect(wideRowKeys([]).size).toBe(0)
  })
})
