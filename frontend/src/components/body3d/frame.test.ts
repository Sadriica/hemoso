import { describe, expect, it, vi } from 'vitest'
import { createFrameLoop, type FrameLoop, type FrameSource } from './frame'

// A frame source that never runs a frame by itself: the test says when, and
// with which timestamp. That is the whole reason the loop is its own module.
function fakeSource(hidden = false) {
  const pending = new Map<number, (now: number) => void>()
  const listeners: (() => void)[] = []
  let next = 1
  let now = 0
  const source: FrameSource = {
    request(callback) {
      const handle = next++
      pending.set(handle, callback)
      return handle
    },
    cancel(handle) {
      pending.delete(handle)
    },
    hidden: () => hidden,
    listenVisibility(listener) {
      listeners.push(listener)
      return () => listeners.splice(listeners.indexOf(listener), 1)
    },
  }
  return {
    source,
    /** Frames waiting for the browser; more than one means a bug. */
    waiting: () => pending.size,
    /** Runs `times` rounds of every pending frame, 16 ms apart. */
    flush(times = 1) {
      for (let round = 0; round < times; round += 1) {
        const due = [...pending.values()]
        pending.clear()
        now += 16
        for (const callback of due) callback(now)
      }
    },
    /** Two seconds pass without a frame, as after a hidden tab. */
    wait(ms: number) {
      now += ms
    },
    setHidden(next: boolean) {
      hidden = next
      for (const listener of [...listeners]) listener()
    },
    listening: () => listeners.length,
  }
}

describe('createFrameLoop', () => {
  it('asks for one frame per change and none once the step says it settled', () => {
    const frames = fakeSource()
    const step = vi.fn(() => false)
    const loop = createFrameLoop(step, frames.source)
    loop.request()
    frames.flush()
    expect(step).toHaveBeenCalledTimes(1)
    expect(frames.waiting()).toBe(0)
    frames.flush()
    expect(step).toHaveBeenCalledTimes(1)
  })

  it('keeps drawing while the step reports motion and stops on the settled frame', () => {
    const frames = fakeSource()
    let drawn = 0
    const step = vi.fn(() => {
      drawn += 1
      return drawn < 4
    })
    const loop = createFrameLoop(step, frames.source)
    loop.request()
    frames.flush(6)
    expect(step).toHaveBeenCalledTimes(4)
    expect(frames.waiting()).toBe(0)
  })

  it('does not queue a second frame for a run of changes in the same tick', () => {
    const frames = fakeSource()
    const loop = createFrameLoop(() => false, frames.source)
    loop.request()
    loop.request()
    loop.request()
    expect(frames.waiting()).toBe(1)
  })

  it('starts from a small step again after a rest, and caps a long one', () => {
    const frames = fakeSource()
    const steps: number[] = []
    const loop = createFrameLoop((dt) => {
      steps.push(dt)
      return false
    }, frames.source)
    loop.request()
    frames.flush()
    frames.wait(5000)
    loop.request()
    frames.flush()
    expect(steps).toEqual([0.016, 0.016])

    const long = fakeSource()
    const capped: number[] = []
    const other: FrameLoop = createFrameLoop((dt) => {
      capped.push(dt)
      return capped.length < 2
    }, long.source)
    other.request()
    long.flush()
    long.wait(5000)
    long.flush()
    expect(capped[1]).toBeCloseTo(0.05, 5)
  })

  it('draws nothing while the page is hidden and once when it comes back', () => {
    const frames = fakeSource()
    const step = vi.fn(() => false)
    const loop = createFrameLoop(step, frames.source)
    frames.setHidden(true)
    loop.request()
    expect(frames.waiting()).toBe(0)
    frames.flush()
    expect(step).not.toHaveBeenCalled()

    frames.setHidden(false)
    expect(frames.waiting()).toBe(1)
    frames.flush()
    expect(step).toHaveBeenCalledTimes(1)
    expect(frames.waiting()).toBe(0)
  })

  it('cancels the frame and the listener on dispose', () => {
    const frames = fakeSource()
    const step = vi.fn(() => true)
    const loop = createFrameLoop(step, frames.source)
    loop.request()
    expect(frames.waiting()).toBe(1)
    loop.dispose()
    expect(frames.waiting()).toBe(0)
    expect(frames.listening()).toBe(0)
    loop.request()
    expect(frames.waiting()).toBe(0)
    frames.setHidden(false)
    expect(frames.waiting()).toBe(0)
    expect(step).not.toHaveBeenCalled()
  })
})
