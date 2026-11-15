// The words of the reaction check and of the current-state block. Interface
// labels only: the state texts of the two indicators and of the condition come
// from config/ (Bio 1, Bio 2), and the app adds no health wording of its own.
// Kept next to the code that uses them, so the phase files stay untouched.

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
  wait: { light: 'Wait for the light.', sound: 'Wait for the tone.' },
  now: 'Answer now.',
  tooEarly: 'Too early. Wait for the next one.',
  trial: (number: number, total: number): string => `Trial ${number} of ${total}`,
  stop: 'Stop the check',
  areaLabel:
    'Reaction test. Tap here or press the space bar as soon as the stimulus appears. Escape stops the check.',
  noTone: 'This browser cannot play the tone. Watch the ring instead.',
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
  again: 'Take it again',
  done: 'Done',
  stopped: 'Stopped. What you answered is kept.',
  stoppedNothing: 'Stopped. Nothing was saved.',
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
