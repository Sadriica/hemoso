import type { ToneParams } from './timing'

// The sound of the check: one short tone from an oscillator, with the pitch,
// loudness and length of each trial (team decision, Sun 01:50). No audio file, so
// nothing is downloaded and nothing needs the network (REQ-28).
//
// A browser only starts audio inside a person's gesture, so the context is
// created on the Start button's click and never before (see ReactionCheck).

export interface TonePlayer {
  play(tone: ToneParams): void
  close(): void
}

type AudioContextCtor = new () => AudioContext

/**
 * A tone player, or null when this browser has no Web Audio: the check then
 * runs on the visible cue alone, which the screen says in words.
 */
export function createTonePlayer(): TonePlayer | null {
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
    play({ hz, gain: peak, ms }) {
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
      gain.gain.linearRampToValueAtTime(peak, start + 0.01)
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
