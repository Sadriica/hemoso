// The words of the eye check. Interface labels only. The check says how much the
// eyes were closed and how often they blinked, and nothing about a feeling, a
// state of mind or a condition; what the numbers mean is for the CMO or the
// flight surgeon.

export const eyeStrings = {
  optional: 'Eye check, optional',
  done: (result: string): string => `Eye check, done: ${result}`,
  heading: 'Eye check',
  intro:
    'The camera watches your eyes for one minute. It counts how long they are closed and how often you blink. Nothing leaves this device, and no picture is kept.',
  lengthNote: 'It takes about one minute.',
  start: 'Start the check',
  skip: 'Skip the eye check',
  stop: 'Stop the check',
  stopHint: 'Escape stops the check and keeps nothing.',
  starting: 'Starting the camera.',
  loading: 'Getting ready.',
  guide: 'Keep your face inside the oval, in good light, and look at the screen.',
  running: 'Checking. Keep looking at the screen.',
  timeLeft: 'Time left',
  hasLeft: (seconds: number): string => `${seconds} s left`,
  // Calm sentences: none of them is an error, and each one has the skip button.
  problem: {
    denied: 'The camera is blocked, so the eye check is skipped. You can go on with the report.',
    missing: 'No camera was found, so the eye check is skipped. You can go on with the report.',
    busy: 'The camera is in use by something else, so the eye check is skipped. You can go on with the report.',
    models: 'The check could not get ready on this device, so it is skipped. You can go on with the report.',
    noFace:
      'Your face was not clear enough in the picture. Try again with more light and your face inside the oval, or skip it.',
  },
  stopped: 'Stopped. Nothing was saved.',
  closedLine: (pct: number): string => `Eyes closed ${pct} % of the time.`,
  blinkLine: (perMinute: number): string =>
    `${perMinute} blink${perMinute === 1 ? '' : 's'} a minute.`,
  result: (pct: number, perMinute: number): string =>
    `Eyes closed ${pct} % of the time. ${perMinute} blink${perMinute === 1 ? '' : 's'} a minute.`,
  confirms: 'Your CMO or flight surgeon confirms.',
  saved: (serverConfigured: boolean): string =>
    serverConfigured ? 'Saved. Waiting to be sent.' : 'Saved on this device.',
  again: 'Take it again',
  close: 'Done',
}
