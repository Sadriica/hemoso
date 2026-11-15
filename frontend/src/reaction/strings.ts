// The words of the reaction check. Interface labels only: what the two
// indicators mean comes from config/ (Phys, Bio 1), and the app adds no health
// wording of its own. Kept next to the code that uses them, so the phase files
// stay untouched.
//
// The short labels are also the words a screen reader announces for each step.

import { REACTION_MIN_SAVE_TRIALS } from './constants'

export const reactionStrings = {
  eyebrow: 'Optional',
  heading: 'Reaction check',
  // Colour targets off (the default): every light is a target.
  introLight:
    'A light shows after a random wait. Answer every light as fast as you can. Its shape and size change.',
  // Colour targets on: only the green circle is a target.
  introLightColour:
    'A light shows after a random wait. The first one is white: answer it. After that, answer only the green circle. Do not answer the other shapes.',
  introSound: 'A tone plays after a random wait. Answer each tone as fast as you can.',
  lengthNote: 'It takes about 90 seconds.',
  modalityLegend: 'How the stimulus comes',
  light: 'Light',
  sound: 'Sound',
  start: 'Start the check',
  skip: 'Skip the reaction check',
  // The rule stays on screen during a light run.
  ruleLight: 'Answer every light.',
  ruleLightColour: 'Answer the white light, then only the green circle.',
  // What each light is, in words: colour and shape, so colour is never the only
  // cue. The first is also the name a screen reader announces.
  kind: {
    white: 'White circle',
    green: 'Green circle',
    square: 'Yellow square',
    triangle: 'Red triangle',
    diamond: 'Blue diamond',
    tone: 'Tone',
  } as Record<string, string>,
  // The lights without colour targets: a shape each, so colour is not the cue.
  kindPlain: {
    white: 'Circle',
    square: 'Square',
    triangle: 'Triangle',
    diamond: 'Diamond',
  } as Record<string, string>,
  wait: 'Wait',
  now: 'Now',
  notThis: 'Not this one',
  wrong: 'That was not the green circle',
  tooEarly: 'Too early',
  trial: (number: number): string => `Trial ${number}`,
  timeLeft: 'Time left',
  hasLeft: (seconds: number): string => `${seconds} s left`,
  stop: 'Stop the check',
  areaLabel:
    'Reaction test. Tap here or press the space bar when you see the target. Escape stops the check.',
  noTone: 'This browser cannot play the tone. Watch the ring instead.',
  demoLength: 'Demo run: 30 seconds instead of 90.',
  // The three figures of the result.
  medianLabel: 'Median',
  lapsesLabel: 'Lapses',
  errorsLabel: 'Errors',
  medianValue: (medianMs: number | null): string =>
    medianMs === null ? 'none' : `${medianMs} ms`,
  // The same two figures on one line, for the closed line of the report.
  result: (medianMs: number | null, lapses: number): string =>
    `Median ${medianMs === null ? 'none' : `${medianMs} ms`} · Lapses ${lapses}`,
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
  // Fewer valid trials than REACTION_MIN_SAVE_TRIALS: nothing is saved.
  tooFew: `Fewer than ${REACTION_MIN_SAVE_TRIALS} answers. Nothing was saved.`,
}
