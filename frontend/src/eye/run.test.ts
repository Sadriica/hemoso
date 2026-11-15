import { describe, expect, it } from 'vitest'
import { OPEN_FACE } from './fixtures'
import { runCheck } from './run'

describe('runCheck', () => {
  it('asks for frames until the time is up and reports progress', async () => {
    let clock = 0
    const shares: number[] = []
    const run = await runCheck({
      video: document.createElement('video'),
      detect: () => Promise.resolve(OPEN_FACE),
      durationMs: 500,
      signal: new AbortController().signal,
      onProgress: (share) => shares.push(share),
      now: () => clock,
      sleep: (ms) => {
        clock += ms
        return Promise.resolve()
      },
    })
    expect(run.aborted).toBe(false)
    expect(run.frames.length).toBeGreaterThan(5)
    expect(run.frames.every((frame) => frame !== null)).toBe(true)
    expect(shares.at(-1)).toBeGreaterThan(0.8)
  })

  it('records a missing face and a detector that throws as no face', async () => {
    let clock = 0
    let calls = 0
    const run = await runCheck({
      video: document.createElement('video'),
      detect: () => {
        calls += 1
        return calls % 2 === 0 ? Promise.resolve(null) : Promise.reject(new Error('x'))
      },
      durationMs: 300,
      signal: new AbortController().signal,
      now: () => clock,
      sleep: (ms) => {
        clock += ms
        return Promise.resolve()
      },
    })
    expect(run.frames.every((frame) => frame === null)).toBe(true)
  })

  it('stops at once when aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const run = await runCheck({
      video: document.createElement('video'),
      detect: () => Promise.resolve(OPEN_FACE),
      durationMs: 1000,
      signal: controller.signal,
    })
    expect(run.aborted).toBe(true)
    expect(run.frames).toHaveLength(0)
  })
})
