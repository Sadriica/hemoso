import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalEntryStore } from '../data/entryStore'
import type { Indicator } from '../domain/types'
import { CameraError } from '../face/camera'
import EyeCheck from './EyeCheck'
import { CLOSED_FACE, OPEN_FACE } from './fixtures'
import { BLINK_RATE_ID, EYE_CLOSURE_ID, isEyeIndicator } from './ids'
import { eyeStrings } from './strings'

const indicator = (id: string, unit: string): Indicator => ({
  id,
  name: id,
  unit,
  direction: 'both',
  measuredOnBoard: 'eye check',
  hazards: [],
  minSpread: 1,
  sources: [],
})
const indicators = [indicator(EYE_CLOSURE_ID, '%'), indicator(BLINK_RATE_ID, 'per min')]

function memoryStore(): LocalEntryStore {
  let raw: string | null = null
  return new LocalEntryStore({
    storage: {
      getItem: () => raw,
      setItem: (_key, value) => {
        raw = value
      },
    },
  })
}

// A clock the fake sleep moves, so a one-minute run takes no real time.
function fastClock() {
  let t = 0
  return {
    now: () => t,
    sleep: (ms: number) => {
      t += ms
      return Promise.resolve()
    },
  }
}

describe('isEyeIndicator', () => {
  it('knows the two ids', () => {
    expect(isEyeIndicator(EYE_CLOSURE_ID)).toBe(true)
    expect(isEyeIndicator(BLINK_RATE_ID)).toBe(true)
    expect(isEyeIndicator('hr_bpm')).toBe(false)
  })
})

describe('EyeStep, hidden states', () => {
  const props = {
    store: memoryStore(),
    personId: 'p',
    entries: [],
    fresh: [],
    serverConfigured: false,
  }

  it('renders nothing while the flag is false', async () => {
    vi.resetModules()
    vi.doMock('./constants', async (original) => ({
      ...(await original<typeof import('./constants')>()),
      EYE_CHECK_ENABLED: false,
    }))
    const { default: Step } = await import('./EyeStep')
    const { container } = render(<Step {...props} indicators={indicators} />)
    expect(container).toBeEmptyDOMElement()
    vi.doUnmock('./constants')
    vi.resetModules()
  })

  describe('with the flag on', () => {
    beforeEach(() => {
      vi.resetModules()
    })
    afterEach(() => {
      vi.doUnmock('./constants')
      vi.resetModules()
    })

    it('renders the closed line when both ids exist', async () => {
      vi.doMock('./constants', async (original) => ({
        ...(await original<typeof import('./constants')>()),
        EYE_CHECK_ENABLED: true,
      }))
      const { default: Step } = await import('./EyeStep')
      render(<Step {...props} indicators={indicators} />)
      expect(
        screen.getByRole('button', { name: eyeStrings.optional }),
      ).toBeInTheDocument()
    })

    it('renders nothing when an id is missing', async () => {
      vi.doMock('./constants', async (original) => ({
        ...(await original<typeof import('./constants')>()),
        EYE_CHECK_ENABLED: true,
      }))
      const { default: Step } = await import('./EyeStep')
      const { container } = render(<Step {...props} indicators={indicators.slice(0, 1)} />)
      expect(container).toBeEmptyDOMElement()
    })
  })
})

describe('EyeCheck with a mocked detector and no camera', () => {
  const stop = vi.fn()
  const openCamera = vi.fn(() => Promise.resolve({ stop }))

  beforeEach(() => {
    stop.mockClear()
    openCamera.mockClear()
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 14, 14, 30)))
  })

  function setup(overrides: Partial<React.ComponentProps<typeof EyeCheck>> = {}) {
    const store = memoryStore()
    const clock = fastClock()
    const view = render(
      <EyeCheck
        store={store}
        personId="p"
        indicators={indicators}
        entries={[]}
        search="?"
        openCamera={openCamera}
        now={clock.now}
        sleep={clock.sleep}
        loadDetector={() => Promise.resolve(() => Promise.resolve(OPEN_FACE))}
        {...overrides}
      />,
    )
    return { store, view }
  }

  it('measures, shows two plain numbers and saves two entries', async () => {
    let call = 0
    // Eyes open, with a closed spell of 3 frames every 40.
    const detect = () => {
      call += 1
      return Promise.resolve(call % 40 < 3 ? CLOSED_FACE : OPEN_FACE)
    }
    const { store } = setup({ loadDetector: () => Promise.resolve(detect) })
    fireEvent.click(screen.getByRole('button', { name: eyeStrings.start }))
    await waitFor(() => expect(document.querySelector('[data-eye-result]')).not.toBeNull())
    expect(screen.getByText(/Eyes closed \d+ % of the time\./)).toBeInTheDocument()
    expect(screen.getByText(/\d+ blinks? a minute\./)).toBeInTheDocument()
    expect(screen.getByText(eyeStrings.confirms)).toBeInTheDocument()
    const saved = store.list()
    expect(saved.map((entry) => entry.indicatorId).sort()).toEqual(
      [BLINK_RATE_ID, EYE_CLOSURE_ID].sort(),
    )
    expect(new Set(saved.map((entry) => entry.missionDay)).size).toBe(1)
    expect(new Set(saved.map((entry) => entry.time)).size).toBe(1)
    expect(new Set(saved.map((entry) => entry.context)).size).toBe(1)
    expect(stop).toHaveBeenCalled()
  })

  it('says a calm sentence and saves nothing when no face is found', async () => {
    const { store } = setup({
      loadDetector: () => Promise.resolve(() => Promise.resolve(null)),
    })
    fireEvent.click(screen.getByRole('button', { name: eyeStrings.start }))
    expect(await screen.findByText(eyeStrings.problem.noFace)).toBeInTheDocument()
    expect(store.list()).toHaveLength(0)
    expect(stop).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: eyeStrings.skip })).toBeInTheDocument()
  })

  it('says a calm sentence when the camera is blocked', async () => {
    const { store } = setup({
      openCamera: () => Promise.reject(new CameraError('denied')),
    })
    fireEvent.click(screen.getByRole('button', { name: eyeStrings.start }))
    expect(await screen.findByText(eyeStrings.problem.denied)).toBeInTheDocument()
    expect(store.list()).toHaveLength(0)
  })

  it('stops and keeps nothing on Escape, and releases the camera', async () => {
    const slow = () => new Promise<null>(() => undefined)
    const { store } = setup({ loadDetector: () => Promise.resolve(slow) })
    fireEvent.click(screen.getByRole('button', { name: eyeStrings.start }))
    await screen.findByText(eyeStrings.running)
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(await screen.findByText(eyeStrings.stopped)).toBeInTheDocument()
    expect(store.list()).toHaveLength(0)
    expect(stop).toHaveBeenCalled()
  })

  it('releases the camera on unmount', async () => {
    const slow = () => new Promise<null>(() => undefined)
    const { view } = setup({ loadDetector: () => Promise.resolve(slow) })
    fireEvent.click(screen.getByRole('button', { name: eyeStrings.start }))
    await screen.findByText(eyeStrings.running)
    view.unmount()
    expect(stop).toHaveBeenCalled()
  })

  it('keeps the preview out of the accessibility tree', async () => {
    const slow = () => new Promise<null>(() => undefined)
    const { view } = setup({ loadDetector: () => Promise.resolve(slow) })
    fireEvent.click(screen.getByRole('button', { name: eyeStrings.start }))
    await screen.findByText(eyeStrings.running)
    expect(view.container.querySelector('.eye__stage')).toHaveAttribute('aria-hidden', 'true')
  })
})
