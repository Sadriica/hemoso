// The words of the reaction check. Interface labels only: what the two
// indicators mean comes from config/ (Phys, Bio 1), and the app adds no health
// wording of its own. Kept next to the code that uses them, so the phase files
// stay untouched.
//
// The short labels are also the words a screen reader announces for each step.

export const reactionStrings = {
  heading: 'Reaction check',
  intro:
    'A light or a tone appears at random. Answer as fast as you can. This step is optional.',
  modalityLegend: 'How the stimulus comes',
  light: 'Light',
  sound: 'Sound',
  start: 'Start the check',
  skip: 'Skip the reaction check',
  // The visible cue of the sound mode, for a person who cannot hear the tone.
  cue: { light: 'Light', sound: 'Tone' },
  wait: 'Wait',
  now: 'Now',
  tooEarly: 'Too early',
  trial: (number: number): string => `Trial ${number}`,
  timeLeft: 'Time left',
  hasLeft: (seconds: number): string => `${seconds} s left`,
  stop: 'Stop the check',
  areaLabel:
    'Reaction test. Tap here or press the space bar as soon as the stimulus appears. Escape stops the check.',
  noTone: 'This browser cannot play the tone. Watch the ring instead.',
  demoLength: 'Demo run: 30 seconds instead of 3 minutes.',
  result: (medianMs: number | null, lapses: number): string =>
    `Median reaction: ${medianMs === null ? 'no answer in time' : `${medianMs} ms`} · Lapses: ${lapses}`,
  falseStarts: (count: number): string =>
    count === 0 ? 'No early answers.' : `Too early: ${count}.`,
  saved: (count: number, serverConfigured: boolean): string => {
    if (count === 0) return 'Nothing was saved.'
    return serverConfigured
      ? 'Saved. Waiting to be sent.'
      : 'Saved on this device.'
  },
  // A run of the demo length shows the screen, it does not measure: the result
  // says so instead of claiming a save that never happened (T-76).
  demoNotSaved: 'Demo run: not saved.',
  again: 'Take it again',
  done: 'Done',
  stopped: 'Stopped. Nothing was saved.',
  empty: 'No trial was completed. Nothing was saved.',
}

export const stateStrings = {
  heading: 'How you are today',
  confirms: 'Your CMO or flight surgeon confirms.',
  // The three steps of docs/API.md, GET /people/{id}/conditions, and the null
  // case. No percentage, no label, no diagnosis.
  label: {
    low: 'Not likely with what you have recorded.',
    possible: 'Possible. These signals point to it:',
    review: 'Ask your CMO or flight surgeon to check this.',
    no_data: 'Not enough data yet.',
  } as Record<string, string>,
  evidence: (score: number): string => `Evidence ${score.toFixed(3)} of 1`,
  pointing: (names: string[]): string =>
    names.length === 0
      ? 'No signal points at it today.'
      : `Pointing at it: ${names.join(', ')}.`,
  missing: (names: string[]): string =>
    names.length === 0 ? '' : `No reading yet: ${names.join(', ')}.`,
  source: 'Source',
  assumption: 'Assumption',
}
