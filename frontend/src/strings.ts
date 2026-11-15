// Every text shown on screen lives here, in plain English (REQ-30).

// The unit Phys writes in indicators.csv for the two 1 to 5 scales (sleep
// quality and mood). The screens read it, never a bound of their own.
export const SCALE_UNIT = '1 to 5'

// The hazard ids of FORMATS.md section 3, each with the plain name of the NASA
// Human Research Program hazard it stands for. A card never shows the id.
const HAZARD_NAMES: Record<string, string> = {
  radiation: 'Radiation',
  isolation_and_confinement: 'Isolation and confinement',
  distance_from_earth: 'Distance from Earth',
  gravity_fields: 'Gravity fields',
  hostile_closed_environments: 'Hostile closed environments',
}

// The plain name of a hazard id, or null when the id is not one of the five.
// An id with no name is a content problem for the team (src/content/indicators
// reports it), never a line on the astronaut's screen.
export function hazardName(id: string): string | null {
  return HAZARD_NAMES[id] ?? null
}

export const strings = {
  appName: 'HeMoSo',
  skipToMain: 'Skip to main content',
  syntheticNotice: 'Demo with synthetic data only.',
  placeholderNotice: 'Showing example content until the team adds config files.',
  // The generic sentence above only fits a first run. Otherwise the notice
  // names what the screens still lack.
  waitingFor: (items: string[]): string => `Waiting for: ${items.join(', ')}.`,
  waitingForItem: {
    attentionRules: 'attention rules',
    indicatorTexts: 'indicator texts',
  },
  personPickerLabel: 'Person',
  personHeading: (personId: string): string => `Status for ${personId}`,
  // The guided check: three phases in a fixed order, never a free menu. Each
  // phase has a numbered eyebrow, a short headline set as stacked lines, one
  // sentence of help and one way forward.
  phases: {
    railLabel: 'Health check progress',
    // What the rail says comes after the current step, and on the last one.
    next: (name: string): string => `Next: ${name}`,
    last: 'Last step',
    step: (number: number, total: number): string => `Phase ${number} of ${total}`,
    identify: {
      number: '01',
      name: 'Identify',
      eyebrow: '01 / IDENTIFY',
      headline: ['WHO IS', 'ON DUTY', 'TODAY?'],
      intro: 'Sign in with your face, or pick your name. Your readings stay with you.',
      crewLabel: 'Crew member',
      or: 'or',
      missing: 'Pick your name, or sign in with your face, to begin.',
      next: 'Begin the report',
    },
    report: {
      number: '02',
      name: 'Report',
      eyebrow: '02 / REPORT',
      headline: ['LOG', "TODAY'S", 'READINGS.'],
      intro: 'One reading at a time. Skip what you did not measure.',
      logged: (count: number): string =>
        count === 0
          ? 'No reading logged in this check yet.'
          : `${count} ${count === 1 ? 'reading' : 'readings'} logged in this check.`,
      back: 'Back',
      next: 'See my status',
    },
    status: {
      number: '03',
      name: 'Status',
      eyebrow: '03 / STATUS',
      headline: ['YOUR', 'STATUS', 'TODAY.'],
      intro: 'Each reading against your own usual values. Decisions stay with your CMO and flight surgeon.',
      historyHeading: 'History',
      historyToggle: 'History and readings table',
      back: 'Back to the report',
      restart: 'Start a new check',
    },
  },
  // The status board: the planetarium (or its list) and the body zone of the
  // indicator that is selected. Only labels; no health wording.
  board: {
    planetarium: {
      center: 'You',
      viewOrbits: 'Orbit view',
      viewList: 'List view',
      orbitsHeading: 'Overview of every reading',
    },
    // A reading that crossed an attention rule: the notice names how many and
    // offers to select the first one. No health wording.
    needsReview: (count: number): string =>
      `${count} ${count === 1 ? 'reading needs' : 'readings need'} review.`,
    showFirst: 'Show the first one',
    bodyLabel: (name: string): string => `Body zone: ${name}`,
    bodyNone: 'No body zone for this indicator',
    loading: 'Loading the overview.',
  },
  // The first-load intro (skippable with any key or tap).
  intro: { skip: 'Skip intro' },
  // The bar along the top of every phase (style guide 5, 7.1).
  topbar: {
    tagline: 'CREW HEALTH',
    onDuty: (personId: string): string => `ON DUTY / ${personId}`,
    reduceMotion: 'Reduce motion',
  },
  entry: {
    heading: 'Entry',
    indicator: 'Indicator',
    // The unit is the visible suffix inside the field (style guide 7.6). For a
    // 1 to 5 scale it is part of the group name instead, because the choices
    // are numbers already.
    value: 'Value',
    valueWithUnit: (unit: string): string => `Value (${unit})`,
    missionDay: 'Mission day',
    time: 'Time',
    // What the astronaut was doing when they took the reading (FORMATS.md
    // section 3, `context`). The choice that fits the local clock is picked
    // first, and the person can change it.
    context: 'Context',
    contextLabels: {
      rest: 'At rest',
      after_exercise: 'After exercise',
      on_waking: 'On waking',
      before_sleep: 'Before sleep',
    },
    save: 'Save entry',
    saved: 'Saved. Waiting to be sent.',
    // Without a server nothing is sent, so the message promises nothing.
    savedOnDevice: 'Saved on this device.',
    noIndicators: 'No indicators are set up yet.',
    errors: {
      valueRequired: 'Enter a value.',
      valueNumber: 'Enter a number.',
      valueScale: 'Choose a value from 1 to 5.',
      missionDay: 'Enter a whole mission day, 1 or more.',
      time: 'Enter a time as HH:MM.',
    },
  },
  // The history of one indicator against the person's own earlier readings
  // (REQ-12). The table is the full text of the numbers; the sentence above it
  // is the short version.
  history: {
    heading: 'History',
    indicator: 'Indicator',
    tableCaption: (name: string): string => `Readings for ${name}`,
    columns: {
      day: 'Day',
      time: 'Time',
      value: 'Value',
      status: 'Status',
    },
    noEntries: 'No entries for this indicator yet.',
    notEnough: 'Not enough earlier entries to compare yet.',
    summary: (parts: {
      value: string
      unit: string
      day: number
      time: string
      median: string
      count: number
      difference: string
    }): string =>
      `Latest: ${parts.value} ${parts.unit} on Day ${parts.day} ${parts.time}. ` +
      `Your earlier median: ${parts.median} ${parts.unit} (${entryCount(
        parts.count,
      )}). ` +
      `Difference: ${parts.difference} ${parts.unit}.`,
    // A difference always carries its sign: "+5" and "-5" read as a change,
    // "0" as none.
    signed: (value: number): string => (value > 0 ? `+${value}` : String(value)),
  },
  // The four states of docs/API.md, GET .../state, in plain words (REQ-30).
  badge: {
    inRange: 'In your usual range',
    outsideRange: 'Outside your usual range',
    // No attention rule for this indicator, so no "in range" claim.
    noRules: 'No threshold yet',
    noData: 'No data yet',
    // A review is needed and the server named no level: the app does not invent
    // one.
    needsReview: 'Needs review',
  },
  nextStep: {
    inRange: 'No action needed.',
    outsideRange:
      'Outside your usual range. Your CMO or flight surgeon confirms.',
    noData: 'No data yet.',
    missing: 'No guidance for this state yet.',
  },
  // Who acts on a crossed attention rule, in the words of the glossary
  // (STANDARDS.md section 5). Least to most severe (FORMATS.md section 3).
  whoActs: {
    crew: 'Tell the crew.',
    cmo: 'Tell the CMO.',
    flight_surgeon: 'Tell the flight surgeon.',
  },
  sources: {
    label: 'Sources',
    assumption: 'Assumption',
    empty: 'No sources listed.',
  },
  // The panel behind "Details" on a Home card (REQ-01): the facts of
  // data/indicators.csv, then the sections of config/content/<id>.md.
  details: {
    label: 'Details',
    measuredOnBoard: 'Measured on board:',
    hazards: 'Hazards:',
    // The text file of Bio 1 is not there yet, so the panel names what is
    // still missing instead of an empty box.
    missing:
      'Details will appear when the team adds the text for this indicator.',
    sections: {
      why: 'Why it matters',
      spaceflight: 'How spaceflight affects it',
      steps: 'Measurement steps',
      prevent: 'How to prevent problems',
    },
  },
  problems: {
    label: 'Content problems (for the team)',
  },
  // The header line about sending the outbox (REQ-28). Every state is a
  // sentence, never a colour or an icon on its own.
  sync: {
    waiting: (count: number): string => `${count} waiting to be sent`,
    nothingWaiting: 'Nothing waiting to be sent',
    lastSent: (day: number, time: string): string =>
      `Last sent: Day ${day} ${time}`,
    notSentYet: 'Not sent yet',
    online: 'Online',
    offline: 'Offline',
    sendNow: 'Send now',
    // The browser is offline and a server is set up: entries stay here.
    offlineNotice: 'You are offline. Entries wait on this device.',
    tryAgain: 'Try to send',
    noServer: 'No server set up for this demo',
    notAccepted: (count: number): string =>
      `${count} not accepted by the server`,
    // The browser blocked storage, or replaced data it could not read.
    notSaved: 'Entries are not saved on this device.',
    reset: 'Saved entries could not be read and were replaced by the demo data.',
  },
  // The panel behind the header button (REQ-36, T-58, T-59). It only exists on
  // a page opened with ?face=1. The consent text is read before the camera
  // opens; a camera that will not start is a sentence, never a colour or an
  // icon on its own.
  face: {
    buttonLabel: 'Sign in with face',
    heading: 'Sign in with face',
    consent:
      'Your face is turned into numbers stored only in this browser. No picture is kept and nothing is sent. This is a quick way to pick your name, not a security lock.',
    continueLabel: 'Continue',
    cancelLabel: 'Cancel',
    closeLabel: 'Close',
    person: 'Person to register',
    register: 'Register face',
    signIn: 'Sign in',
    // The label of the camera picture. The panel is the only place in the app
    // that shows a camera at all.
    videoLabel: 'Camera preview. No picture is kept.',
    opening: 'Opening face sign-in.',
    deleteAction: 'Delete my face data',
    deleteConfirmAction: 'Delete face data',
    deleteConfirm: (personId: string): string =>
      `Delete the face data saved for ${personId}? The person picker keeps working either way.`,
    noSavedFace: (personId: string): string =>
      `No face is saved for ${personId} on this device.`,
    status: {
      registered: (personId: string): string =>
        `Face saved for ${personId} on this device.`,
      deleted: (personId: string): string =>
        `Face data deleted for ${personId}.`,
      noFace: 'No face found. Look at the camera and try again.',
      // The model did not load, or the browser gave up on it: not the person's
      // fault, and the picker still works.
      failed: 'The face check could not run on this device. Pick your name below.',
      notRecognised: 'Face not recognised. Pick your name instead.',
    },
    camera: {
      denied:
        'The browser blocked the camera. Allow it for this site, or pick your name below.',
      missing: 'No camera was found. Pick your name below.',
      busy: 'The camera is in use by another app. Close it and try again, or pick your name below.',
    },
  },
  // The mission time of a reading on a card: the technical label style, with
  // the middle dot between the day and the clock time (guide 7.3).
  timeLabel: (day: number, time: string): string => `DAY ${day} · ${time}`,
  // The metadata line of the top bar (style guide 5): the mission day of the
  // latest reading and the device clock, labelled NOW so it is not read as the
  // time of a reading. The synthetic data sentence of REQ-14 sits beside it.
  header: {
    metadata: (day: number, time: string): string =>
      missionStamp(day, time),
  },
  // The unit that follows a value on a card: "58 bpm". The 1 to 5 scales hold
  // their range in the unit, so they read "4 / 5" and not "4 1 to 5".
  cardUnit: (unit: string): string => (unit === SCALE_UNIT ? '/ 5' : unit),
}

// "(1 entry)" and "(9 entries)": the count inside the history sentence.
function entryCount(count: number): string {
  return `${count} ${count === 1 ? 'entry' : 'entries'}`
}

// The mission time of the header band, in the technical label style.
function missionStamp(day: number, time: string): string {
  return `DAY ${day} · NOW ${time}`
}
