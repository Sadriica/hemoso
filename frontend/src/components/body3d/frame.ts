// When the body draws. A frame for every change, frames only while something
// moves, and nothing at all while the page is hidden.
//
// scene.ts says, for the frame it just drew, whether the picture is still
// moving. This file owns the rest: the requestAnimationFrame handle, the time
// step, and the visibility listener. Keeping the rule here lets it be tested
// without WebGL, and keeps a still scene from asking for frames it does not
// need: a laptop or tablet in flight runs on battery.

export interface FrameSource {
  request(callback: (now: number) => void): number
  cancel(handle: number): void
  /** True while the page is not visible: no frame is worth drawing then. */
  hidden(): boolean
  /** Adds the visibilitychange listener; returns the function that removes it. */
  listenVisibility(listener: () => void): () => void
}

export interface FrameLoop {
  /**
   * Draws one frame, then keeps drawing only while the step reports motion.
   * Cheap to call twice: a frame already asked for is not asked for again.
   */
  request(): void
  /** Drops the pending frame and the time step. */
  stop(): void
  /** Stops and removes the listener. The loop draws nothing after this. */
  dispose(): void
}

/** Step of the first frame, and of any frame after the loop was at rest. */
const FIRST_STEP = 0.016
/** A frame that took longer than this (a hidden tab, a slow frame) is capped. */
const MAX_STEP = 0.05

export function createFrameLoop(step: (dt: number) => boolean, source: FrameSource): FrameLoop {
  let handle: number | null = null
  let last = 0
  let disposed = false

  function request(): void {
    if (disposed || handle !== null || source.hidden()) return
    handle = source.request(frame)
  }

  function frame(now: number): void {
    handle = null
    const dt = last === 0 ? FIRST_STEP : Math.min(MAX_STEP, Math.max(0, (now - last) / 1000))
    last = now
    // A loop that settled forgets its clock, so the next change starts from
    // FIRST_STEP instead of the whole pause.
    if (step(dt)) request()
    else last = 0
  }

  function stop(): void {
    if (handle !== null) {
      source.cancel(handle)
      handle = null
    }
    last = 0
  }

  const unlisten = source.listenVisibility(() => {
    if (source.hidden()) stop()
    else request()
  })

  return {
    request,
    stop,
    dispose() {
      disposed = true
      stop()
      unlisten()
    },
  }
}
