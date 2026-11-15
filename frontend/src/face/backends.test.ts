import { describe, expect, it, vi } from 'vitest'
import {
  BACKEND_ORDER,
  EngineError,
  describeError,
  firstWorkingBackend,
} from './backends'

describe('firstWorkingBackend', () => {
  it('tries webgl first, then wasm, then cpu', () => {
    expect(BACKEND_ORDER).toEqual(['webgl', 'wasm', 'cpu'])
  })

  it('stops at the first backend that works', async () => {
    const attempt = vi.fn().mockResolvedValue(undefined)
    await expect(firstWorkingBackend(BACKEND_ORDER, attempt)).resolves.toBe('webgl')
    expect(attempt).toHaveBeenCalledTimes(1)
  })

  it('falls back to wasm when webgl fails, and logs why', async () => {
    const attempt = vi.fn(async (backend: string) => {
      if (backend === 'webgl') throw new Error('no float textures')
    })
    const warn = vi.fn()
    await expect(firstWorkingBackend(BACKEND_ORDER, attempt, warn)).resolves.toBe(
      'wasm',
    )
    expect(warn).toHaveBeenCalledWith(
      'face: backend webgl failed (Error: no float textures)',
    )
  })

  it('uses cpu as the last resort', async () => {
    const attempt = vi.fn(async (backend: string) => {
      if (backend !== 'cpu') throw new Error(`${backend} down`)
    })
    await expect(firstWorkingBackend(BACKEND_ORDER, attempt)).resolves.toBe('cpu')
    expect(attempt.mock.calls.map((call) => call[0])).toEqual([
      'webgl',
      'wasm',
      'cpu',
    ])
  })

  it('throws one error with every reason when nothing works', async () => {
    const attempt = vi.fn(async (backend: string) => {
      throw new Error(`${backend} down`)
    })
    const failure = await firstWorkingBackend(BACKEND_ORDER, attempt).catch(
      (error: unknown) => error,
    )
    expect(failure).toBeInstanceOf(EngineError)
    expect((failure as EngineError).message).toBe(
      'no backend worked: webgl: Error: webgl down; wasm: Error: wasm down; cpu: Error: cpu down',
    )
  })
})

describe('describeError', () => {
  it('keeps the name and the message only', () => {
    const error = Object.assign(new Error('boom'), {
      name: 'TypeError',
      image: new Uint8Array(4),
    })
    expect(describeError(error)).toBe('TypeError: boom')
  })

  it('copes with a string and with nothing useful', () => {
    expect(describeError('plain')).toBe('plain')
    expect(describeError(undefined)).toBe('Error')
  })
})
