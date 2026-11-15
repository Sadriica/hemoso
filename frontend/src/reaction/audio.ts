import { REACTION_TONE_HZ, REACTION_TONE_MS } from './constants'

// The sound of the check: one short tone from an oscillator. No audio file, so
// nothing is downloaded and nothing needs the network (REQ-28).
//
// A browser only starts audio inside a person's gesture, so the context is
// created on the Start button's click and never before (see ReactionCheck).

export interface TonePlayer {
  play(): void
  close(): void
}

type AudioContextCtor = new () => AudioContext

/**
 * A tone player, or null when this browser has no Web Audio: the check then
 * runs on the visible cue alone, which the screen says in words.
 */
export function createTonePlayer(hz = REACTION_TONE_HZ, ms = REACTION_TONE_MS): TonePlayer | null {
  const browser = globalThis as unknown as {
    AudioContext?: AudioContextCtor
    webkitAudioContext?: AudioContextCtor
  }
  const Ctor = browser.AudioContext ?? browser.webkitAudioContext
  if (Ctor === undefined) return null

  let context: AudioContext
  try {
    context = new Ctor()
  } catch {
    return null
  }

  let closed = false
  return {
    play() {
      if (closed) return
      // A context created before the gesture, or resumed after the tab slept,
      // starts suspended: asking again inside the click is what makes it sound.
      if (context.state === 'suspended') void context.resume()
      const start = context.currentTime
      const end = start + ms / 1000
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = hz
      // A short ramp at each end: a square click at the start would be a
      // second, sharper sound the person did not ask for.
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.25, start + 0.01)
      gain.gain.linearRampToValueAtTime(0, end)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(end)
    },
    close() {
      if (closed) return
      closed = true
      void context.close()
    },
  }
}
