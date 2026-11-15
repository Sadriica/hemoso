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
    'A round light turns on after a random wait. Answer every light as fast as you can. Its size changes.',
  // Colour targets on: only the green circle is a target.
  introLightColour:
    'A light shows after a random wait. The first one is white: answer it. After that, answer only the green light. It has a bright ring. Do not answer orange, yellow or blue lights.',
  introSound: 'A tone plays after a random wait. Answer each tone as fast as you can.',
  lengthNote: 'It takes about 50 seconds.',
  modalityLegend: 'How the stimulus comes',
  light: 'Light',
  sound: 'Sound',
  start: 'Start the check',
  skip: 'Skip the reaction check',
  // The rule stays on screen during a light run.
  ruleLight: 'Answer every light.',
  ruleLightColour: 'Answer the white light, then only the green light.',
  // What each light is, in words: the colour is always named, so it is never
  // the only cue. The same words are the name a screen reader announces.
  kind: {
    white: 'White light',
    green: 'Green light',
    orange: 'Orange light',
    yellow: 'Yellow light',
    blue: 'Blue light',
  } as Record<string, string>,
  // The one lamp of the run without colour targets.
  lamp: 'Light',
  wait: 'Wait',
  // Sound mode: the stage never changes, so this line stays the whole run.
  listen: 'Listen, then answer.',
  now: 'Now',
  notThis: 'Not this one',
  wrong: 'That was not the green light',
  tooEarly: 'Too early',
  trial: (number: number): string => `Trial ${number}`,
  timeLeft: 'Time left',
  hasLeft: (seconds: number): string => `${seconds} s left`,
  stop: 'Stop the check',
  areaLabel:
    'Reaction test. Tap here or press the space bar when you see the light or hear the tone. Escape stops the check.',
  noTone: 'This browser cannot play the tone. Use the light check instead.',
  demoLength: 'Demo run: 30 seconds instead of 50.',
  // The three figures of the result.
  medianLabel: 'Median',
  lapsesLabel: 'Lapses',
  errorsLabel: 'Errors',
  // Nobody answered in time (every trial timed out): a sentence, not "none".
  noAnswers: 'No answer was recorded.',
  medianValue: (medianMs: number | null): string =>
    medianMs === null ? 'No answers' : `${medianMs} ms`,
  // The same two figures on one line, for the closed line of the report.
  result: (medianMs: number | null, lapses: number): string =>
    `Median ${medianMs === null ? 'no answers' : `${medianMs} ms`} · Lapses ${lapses}`,
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
