// Which TensorFlow.js backend runs the face model, and what happens when one
// does not work on a device (REQ-36, T-70). No model code here, so the order
// and the fallback are tested without a browser.
//
// webgl is the fast one and the only one some phones run well; wasm needs its
// two .wasm files from public/wasm/; cpu always exists and is the slowest.

export const BACKEND_ORDER = ['webgl', 'wasm', 'cpu'] as const

export type BackendName = (typeof BACKEND_ORDER)[number]

// Every backend failed. The reasons are kept so the console shows the whole
// story from one report, not only the last step.
export class EngineError extends Error {
  readonly attempts: { backend: string; reason: string }[]

  constructor(attempts: { backend: string; reason: string }[]) {
    super(
      `no backend worked: ${attempts
        .map((attempt) => `${attempt.backend}: ${attempt.reason}`)
        .join('; ')}`,
    )
    this.name = 'EngineError'
    this.attempts = attempts
  }
}

// Name and message only: an error is never logged with its payload, so no image
// data can reach the console.
export function describeError(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const { name, message } = error as { name?: unknown; message?: unknown }
    const label = typeof name === 'string' && name !== '' ? name : 'Error'
    const text = typeof message === 'string' ? message : ''
    return text === '' ? label : `${label}: ${text}`.slice(0, 300)
  }
  return typeof error === 'string' ? error.slice(0, 300) : 'Error'
}

// Runs `attempt` for each backend in order and returns the first name that
// worked. `attempt` sets the backend, loads the models and runs one small
// check, so a backend that is "available" but fails on the first real input
// (a phone GPU without float textures) is skipped too.
export async function firstWorkingBackend(
  order: readonly string[],
  attempt: (backend: string) => Promise<void>,
  warn: (message: string) => void = () => undefined,
): Promise<string> {
  const failures: { backend: string; reason: string }[] = []
  for (const backend of order) {
    try {
      await attempt(backend)
      return backend
    } catch (error) {
      const reason = describeError(error)
      failures.push({ backend, reason })
      warn(`face: backend ${backend} failed (${reason})`)
    }
  }
  throw new EngineError(failures)
}
