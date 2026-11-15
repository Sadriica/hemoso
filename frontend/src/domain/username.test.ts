import { describe, expect, it } from 'vitest'
import { isUsername, normaliseUsername } from './username'

describe('normaliseUsername', () => {
  it('lowers capitals', () => {
    expect(normaliseUsername('Wambi')).toBe('wambi')
  })

  it('trims the ends', () => {
    expect(normaliseUsername('  wambi  ')).toBe('wambi')
  })

  it('turns spaces into one underscore', () => {
    expect(normaliseUsername('Juan   Perez')).toBe('juan_perez')
  })

  it('turns hyphens into underscores', () => {
    expect(normaliseUsername('ana-maria')).toBe('ana_maria')
  })

  it('drops accents', () => {
    expect(normaliseUsername('José Peña')).toBe('jose_pena')
  })

  it('leaves a name that is already an id alone', () => {
    expect(normaliseUsername('cadet_okoro')).toBe('cadet_okoro')
  })

  it('does not hide what still cannot work', () => {
    expect(normaliseUsername('w@mbi')).toBe('w@mbi')
    expect(isUsername(normaliseUsername('w@mbi'))).toBe(false)
    expect(isUsername(normaliseUsername('7 of 9'))).toBe(false)
    expect(isUsername(normaliseUsername('   '))).toBe(false)
    expect(isUsername(normaliseUsername('a'.repeat(65)))).toBe(false)
  })

  it('accepts what a person usually types', () => {
    for (const typed of ['Wambi', 'Juan Perez', 'ana-maria', 'José Peña', 'crew 2']) {
      expect(isUsername(normaliseUsername(typed))).toBe(true)
    }
  })
})
