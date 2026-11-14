import { afterEach, describe, expect, it, vi } from 'vitest'
import { newEntryId } from './entryId'

describe('newEntryId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses crypto.randomUUID when the browser has it', () => {
    expect(newEntryId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('falls back to random bytes when randomUUID is missing', () => {
    let counter = 0
    vi.stubGlobal('crypto', {
      getRandomValues(bytes: Uint8Array): Uint8Array {
        counter += 1
        return bytes.fill(counter)
      },
    })
    const first = newEntryId()
    const second = newEntryId()
    expect(first).toMatch(/^[0-9a-f]{32}$/)
    expect(second).toMatch(/^[0-9a-f]{32}$/)
    expect(first).not.toBe(second)
  })

  it('falls back to the clock and a counter when crypto is missing', () => {
    vi.stubGlobal('crypto', undefined)
    const first = newEntryId()
    const second = newEntryId()
    expect(first).toMatch(/^local-\d+-\d+$/)
    expect(second).toMatch(/^local-\d+-\d+$/)
    expect(first).not.toBe(second)
  })
})
