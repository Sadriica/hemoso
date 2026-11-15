// The words of the 3D body and the pain picker, in plain English (REQ-30).
// No condition names and no "you have": the picker records a place, a kind and
// a strength, and the CMO or flight surgeon reads it.

import type { InjuryKind } from '../../data/painStore'

export const bodyWords = {
  /** The name of the figure when the screen gives no label of its own. */
  figure: 'Body',
  regionsLabel: 'Body parts',
  listHint: 'Tab to the list of body parts; Enter or Space chooses one.',
  turnLeft: 'Turn left',
  turnRight: 'Turn right',
  resetView: 'Reset view',
  selected: (names: string): string => `Selected: ${names}`,
  loading: 'Loading the body.',
  noWebgl: 'The 3D body is not open here, so the body parts are listed.',
}

export const injuryWords = {
  heading: 'Where does it hurt?',
  intro: 'Choose each place, then how strong it is.',
  kinds: {
    pain: 'Pain',
    swelling: 'Swelling',
    bruise: 'Bruise',
    cut_or_scrape: 'Cut or scrape',
    burn: 'Burn',
    sprain_or_strain: 'Sprain or strain',
  } as const satisfies Record<InjuryKind, string>,
  kindLabel: 'What is it?',
  kindFor: (region: string): string => `What is it? ${region}`,
  intensityLegend: 'How strong is it? 0 is none, 10 is the worst',
  intensityFor: (region: string): string => `How strong is it? ${region}`,
  remove: (region: string): string => `Remove ${region}`,
  noteLabel: 'Note (optional)',
  noteHint: 'A few words of your own.',
  save: 'Save',
  savedOnDevice: 'Saved on this device',
  notSaved: 'This device did not keep it. It stays on screen only.',
  empty: 'Choose at least one place on the body.',
  surgeon: 'Your CMO or flight surgeon looks at this with you.',
  reportsHeading: 'Your reports on this device',
  noReports: 'No report saved on this device yet.',
  reportWhen: (missionDay: number, time: string): string => `Day ${missionDay}, ${time}`,
  markLine: (region: string, kind: string, intensity: number): string =>
    `${region}: ${kind.toLowerCase()}, ${intensity} of 10`,
  open: 'Where does it hurt?',
  close: 'Close',
}
