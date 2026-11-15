import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// jsdom has no WebGL, so the only three.js class faked here is the renderer:
// every geometry, material and camera is the real one, which keeps this test
// honest about what the frame loop draws.
const gl = vi.hoisted(() => ({ renders: 0 }))

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>()
  class FakeRenderer {
    setPixelRatio(): void {}
    setSize(): void {}
    render(): void {
      gl.renders += 1
    }
    dispose(): void {}
    forceContextLoss(): void {}
  }
  return { ...actual, WebGLRenderer: FakeRenderer as unknown as typeof actual.WebGLRenderer }
})

import { createBodyScene, type SceneCallbacks, type SceneColors, type SceneState } from './scene'

const colors: SceneColors = {
  base: '#2b3242',
  accent: '#7cc7ff',
  muted: '#8b95a7',
  mark: {
    pain: '#ff8a7a',
    swelling: '#ffd166',
    bruise: '#a78bfa',
    cut_or_scrape: '#7cc7ff',
    burn: '#ff9f68',
    sprain_or_strain: '#69dba0',
  },
}

const callbacks: SceneCallbacks = {
  onSelect() {},
  onHover() {},
  onPulse() {},
}

const sceneState = (overrides: Partial<SceneState> = {}): SceneState => ({
  mode: 'status',
  lit: ['head'],
  litColor: '#7cc7ff',
  marks: [],
  reducedMotion: false,
  ...overrides,
})

/** The frames the browser still owes the scene. */
let waiting = new Map<number, (now: number) => void>()
let clock = 0
let handle = 0

function flush(times = 1): void {
  for (let round = 0; round < times; round += 1) {
    const due = [...waiting.values()]
    waiting.clear()
    clock += 16
    for (const callback of due) callback(clock)
  }
}

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  gl.renders = 0
  waiting = new Map()
  clock = 0
  handle = 0
  vi.stubGlobal('requestAnimationFrame', (callback: (now: number) => void) => {
    handle += 1
    waiting.set(handle, callback)
    return handle
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    waiting.delete(id)
  })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, 'hidden')
})

function canvas(): HTMLCanvasElement {
  return document.createElement('canvas')
}

describe('the body frame loop', () => {
  it('settles under reduced motion: one render, then no frame owed', () => {
    const scene = createBodyScene(canvas(), colors, callbacks)
    scene.apply(sceneState({ reducedMotion: true }))
    expect(waiting.size).toBe(1)
    flush()
    expect(gl.renders).toBe(1)
    expect(waiting.size).toBe(0)
    flush()
    expect(gl.renders).toBe(1)
    scene.dispose()
  })

  it('draws exactly one frame for a state change once it is still', () => {
    const scene = createBodyScene(canvas(), colors, callbacks)
    scene.apply(sceneState({ reducedMotion: true }))
    flush()
    expect(gl.renders).toBe(1)

    scene.apply(
      sceneState({
        reducedMotion: true,
        mode: 'pain',
        lit: [],
        marks: [{ regionId: 'head', kind: 'pain', intensity: 6 }],
      }),
    )
    expect(waiting.size).toBe(1)
    flush()
    expect(gl.renders).toBe(2)
    expect(waiting.size).toBe(0)
    scene.dispose()
  })

  it('owes no frame at all while the page is hidden, and one when it returns', () => {
    setHidden(true)
    const scene = createBodyScene(canvas(), colors, callbacks)
    scene.apply(sceneState({ reducedMotion: true }))
    expect(waiting.size).toBe(0)
    flush()
    expect(gl.renders).toBe(0)

    setHidden(false)
    expect(waiting.size).toBe(1)
    flush()
    expect(gl.renders).toBe(1)
    expect(waiting.size).toBe(0)
    scene.dispose()
  })

  it('keeps drawing while the idle turn runs, and stops when it is disposed', () => {
    const scene = createBodyScene(canvas(), colors, callbacks)
    scene.apply(sceneState())
    flush(3)
    expect(gl.renders).toBe(3)
    expect(waiting.size).toBe(1)
    scene.dispose()
    expect(waiting.size).toBe(0)
  })

  it('settles after an interaction under reduced motion instead of turning forever', () => {
    const scene = createBodyScene(canvas(), colors, callbacks)
    scene.apply(sceneState({ reducedMotion: true }))
    flush()
    scene.orbit(1)
    expect(waiting.size).toBe(1)
    flush()
    expect(gl.renders).toBe(2)
    flush(5)
    expect(gl.renders).toBe(2)
    expect(waiting.size).toBe(0)
    scene.dispose()
  })
})
