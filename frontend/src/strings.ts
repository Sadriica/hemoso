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

// The word after the count in the sync chip ("3 waiting"). One place, because
// the chip splits the count from the word on a narrow screen.
const WAITING_WORD = 'waiting'

// A person id read as a name: "demo_astronaut_1" is "Demo astronaut 1". Nothing
// is invented; the id is the only name the data has (T-70).
export function personName(personId: string): string {
  const words = personId.split('_').filter((word) => word !== '')
  if (words.length === 0) return personId
  const name = words.join(' ')
  return name.charAt(0).toUpperCase() + name.slice(1)
}

// The initials of the circle before the name: "DA" for "demo_astronaut_1". A
// trailing number is dropped, so the circle never holds a digit.
export function personInitials(personId: string): string {
  const letters = personId
    .split('_')
    .filter((word) => /^[a-z]/i.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
  return letters === '' ? personId.slice(0, 2).toUpperCase() : letters
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
  personHeading: (personId: string): string =>
    `Status for ${personName(personId)}`,
  // The guided check: three phases in a fixed order, never a free menu. Each
  // phase has a numbered eyebrow, a short headline set as stacked lines, one
  // sentence of help and one way forward.
  phases: {
    railLabel: 'Health check progress',
    // The rail draws the three steps; this sentence is what a screen reader
    // hears in place of the track.
    step: (number: number, total: number): string => `Phase ${number} of ${total}`,
    identify: {
      number: '01',
      name: 'Identify',
      eyebrow: '01 / IDENTIFY',
      headline: ['WHO IS', 'ON DUTY', 'TODAY?'],
      intro:
        'Sign in with your face, your username and PIN, or open the demo. Your readings stay with you.',
      crewLabel: 'Crew member',
      missing: 'Pick your name, or sign in with your face, to begin.',
      next: 'Begin the report',
    },
    report: {
      number: '02',
      name: 'Report',
      eyebrow: '02 / REPORT',
      headline: ['LOG', "TODAY'S", 'READINGS.'],
      intro: 'Fill in what you measured. Leave the rest empty.',
      logged: (count: number): string =>
        count === 0
          ? 'No reading logged in this check yet.'
          : `${count} ${count === 1 ? 'reading' : 'readings'} logged in this check.`,
      back: 'Back',
      next: 'See my status',
      // The reaction check is optional and sits behind one closed line.
      reactionOptional: 'Reaction check, optional',
      reactionDone: (result: string): string => `Reaction check, done: ${result}`,
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
    // The caption of the body: the system first, then the indicator.
    bodyLabel: (system: string, name: string): string => `${system} · ${name}`,
    // Plain names of the systems `systemOf` returns.
    systemNames: {
      cardiovascular: 'Cardiovascular system',
      thermoregulation: 'Temperature control',
      sleep: 'Sleep',
      neuro: 'Brain and behaviour',
      metabolic: 'Metabolism',
    },
    // The limit a needs-review card was triggered by, then where it comes from.
    limitCrossed: (side: 'above' | 'below', threshold: number, unit: string): string =>
      `Limit crossed: ${side} ${threshold} ${unit}.`,
    limitSource: 'Source:',
    bodyNone: 'No body zone for this indicator',
    // A new account with no reading at all.
    noReadings:
      'No readings yet. Log your first readings in the report, then come back here.',
    loading: 'Loading the overview.',
    // The overview figure failed to draw; the cards and the history still work.
    overviewFailed: 'The overview could not be drawn. Reload the page to try again.',
  },
  // The first-load intro (skippable with any key or tap).
  intro: { skip: 'Skip intro' },
  // The trend row of a card: the latest value against the person's own earlier
  // readings. Comparison words only, no health wording.
  trend: {
    title: (count: number): string =>
      `Compared with your last ${count} ${count === 1 ? 'reading' : 'readings'}`,
    above: 'Higher than usual',
    below: 'Lower than usual',
    within: 'Close to usual',
    // The number and its unit follow in a span of their own, so the unit keeps
    // its case (STANDARDS.md section 3).
    usualLabel: 'Usual:',
    // How each context reads inside a sentence.
    contextPhrase: {
      rest: 'at rest',
      after_exercise: 'after exercise',
      on_waking: 'on waking',
      before_sleep: 'before sleep',
    },
    notEnough: (count: number, needed: number, context?: string): string =>
      `Not enough earlier readings${context ? ` ${context}` : ''} to compare yet (${count} of ${needed}).`,
  },
  // The bar along the top of every phase: the mark, the mission line, the sync
  // chip and the motion switch, all on one row.
  // The mission start of an astronaut: asked once with the account, editable
  // from the signed-in line.
  mission: {
    startLabel: 'Mission start date',
    started: (date: string): string => `Mission started ${date}`,
    notSet: 'Mission start not set',
    change: 'change',
    set: 'set it',
    save: 'Save',
    cancel: 'Cancel',
  },
  topbar: {
    tagline: 'CREW HEALTH',
    onDuty: (personId: string): string => `On duty: ${personName(personId)}`,
    reduceMotion: 'Reduce motion',
    // What the motion switch turns off, in words for its tooltip.
    motionOn: 'Motion is on',
    motionOff: 'Motion is off',
  },
  // The routine report: one row per indicator of config/data/indicators.csv,
  // one shared day, time and context, one save.
  entry: {
    heading: "Today's readings",
    // The two blood pressure ids are one row, side by side.
    bloodPressure: 'Blood pressure',
    systolic: 'Systolic',
    diastolic: 'Diastolic',
    // The crew's own words (STANDARDS.md section 5): the day of the mission is
    // the Flight Day, and the station clock runs on GMT. The plain words are
    // the helper under the two fields.
    missionDay: 'Flight Day',
    time: 'GMT',
    timeHelp: 'Flight Day is the day of your mission. GMT is station time.',
    // What the astronaut was doing when they took the readings (FORMATS.md
    // section 3, `context`). The choice that fits the local clock is picked
    // first, and the person can change it.
    context: 'Context',
    // The header says the context once; a row names its own only when it
    // differs, and that tag opens the four choices for the row.
    change: 'change',
    keepOwn: (count: number): string =>
      count === 1 ? '1 row keeps its own context' : `${count} rows keep their own context`,
    rowContext: (name: string): string => `Context for ${name}`,
    contextLabels: {
      rest: 'At rest',
      after_exercise: 'After exercise',
      on_waking: 'Post-sleep · on waking',
      before_sleep: 'Pre-sleep · before bed',
    },
    // The mood scale of FORMATS.md section 2 (1 = very low to 5 = very good).
    // The app writes no health word of its own beyond these.
    scaleWords: ['Very low', 'Low', 'Neutral', 'Good', 'Very good'],
    // The last reading of that indicator, under its field.
    lastValue: (reading: string): string => `last ${reading}`,
    // The state of that last reading, read before its badge by a screen reader.
    lastState: 'Last reading:',
    // The small history of a panel in words: how many earlier readings it
    // draws and the lowest and highest of them.
    history: (
      label: string | null,
      count: number,
      low: number,
      high: number,
      unit: string,
    ): string =>
      `${label === null ? '' : `${label}: `}${count} earlier ${count === 1 ? 'reading' : 'readings'} · ${low} to ${high} ${unit}`,
    // The console the report is: its name and the tag every screen keeps.
    console: 'Physiology telemetry',
    save: 'Save readings',
    // Progress through the rows of the report, and why Save waits.
    progress: (filled: number, total: number): string => `${filled} of ${total} filled`,
    saveNeeds: 'Fill in at least one reading to save.',
    saveWhat: 'Saves every filled row for this day and time.',
    // The way on, offered next to the saved message.
    next: 'See my status',
    nextLabel: 'See my status, your readings are saved',
    // What was saved, one item per reading: "Heart rate 72 bpm, Mood 3 / 5".
    savedList: (items: string): string => `Saved: ${items}.`,
    reading: (name: string, value: string): string => `${name} ${value}`,
    // Whether the readings leave the device is the sentence after this one, so
    // this one never promises a send the demo cannot make.
    saved: 'Waiting to be sent.',
    savedOnDevice: 'Kept on this device.',
    noIndicators: 'No indicators are set up yet.',
    // A save with every row empty has nothing to store, and says so.
    noReading: 'Fill in at least one reading.',
    errors: {
      valueRequired: 'Enter a value.',
      valueNumber: 'Enter a number.',
      valueScale: 'Choose a value from 1 to 5.',
      missionDay: 'Enter a whole Flight Day, 1 or more.',
      time: 'Enter the GMT time as HH:MM.',
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
      day: 'Flight Day',
      time: 'GMT',
      context: 'Context',
      value: 'Value',
      status: 'Status',
    },
    // The table shows the newest readings first; the button shows the rest.
    tableRegion: (name: string): string => `Readings table for ${name}`,
    showAll: (count: number): string => `Show all ${count} readings`,
    showFewer: 'Show fewer',
    noEntries: 'No entries for this indicator yet.',
    notEnough: 'Not enough earlier entries to compare yet.',
    // The latest value is still said when there is nothing to compare it with.
    latestOnly: (parts: {
      value: string
      unit: string
      day: number
      time: string
    }): string =>
      `Latest: ${parts.value} ${parts.unit} on FD ${parts.day}, GMT ${parts.time}. ` +
      'Not enough earlier entries to compare yet.',
    summary: (parts: {
      value: string
      unit: string
      day: number
      time: string
      // How the context reads in a sentence: "at rest".
      context: string
      median: string
      count: number
      difference: string
    }): string =>
      `Latest: ${parts.value} ${parts.unit} on FD ${parts.day}, GMT ${parts.time}. ` +
      `Your usual ${parts.context}: ${parts.median} ${parts.unit} (${readingCount(
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
    // The same with the level Bio 2 wrote for the row: "Needs review · consult".
    needsReviewLevel: (level: string): string => `Needs review · ${level}`,
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
    opensNewTab: '(opens in a new tab)',
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
      attention: 'When it needs attention',
      steps: 'Measurement steps',
      prevent: 'How to prevent problems',
    },
    // One line of the attention section, built from one row of attention.csv.
    ruleSide: { below: 'Below', above: 'Above' },
    rule: (side: string, value: string, level: string): string =>
      `${side} ${value}: ${level}.`,
  },
  // The possible conditions of config/rules/conditions.csv (REQ-06): an
  // evidence score from 0 to 1 with a three-step label and the signals behind
  // it. Never a percentage, never a statement about the person; the names come
  // from the file.
  conditions: {
    heading: 'Possible conditions',
    intro: 'What your readings point to, scored as evidence from 0 to 1.',
    confirms: 'Your CMO or flight surgeon confirms.',
    // The three steps, as one word and as one sentence.
    label: {
      review: 'Review',
      possible: 'Possible',
      low: 'Low',
      no_data: 'Not enough data yet',
    },
    sentence: {
      review: 'Ask your CMO or flight surgeon to check this.',
      possible: 'Some of your readings point to it.',
      low: 'Your readings do not point to it.',
      no_data: 'It needs at least two readings that can be compared.',
    },
    // The bar: its name, the value as text, and what a screen reader hears.
    meterName: (name: string): string => `Evidence for ${name}`,
    evidence: (score: string): string => `Evidence ${score} of 1`,
    evidenceSpoken: (score: string, label: string): string =>
      `${score} of 1, ${label.toLowerCase()}`,
    // One signal: the indicator, then what its newest reading says.
    signalsLabel: (name: string): string => `Readings behind ${name}`,
    side: { above: 'above', below: 'below' },
    signal: {
      limit: (name: string, side: string): string => `${name}: ${side} a set limit`,
      outside: (name: string, side: string): string => `${name}: ${side} your usual`,
      inside: (name: string, side: string): string => `${name}: not ${side} your usual`,
      notComparable: (name: string): string =>
        `${name}: not enough readings to compare`,
      noReading: (name: string): string => `${name}: no reading yet`,
    },
    // What a tap on a signal does, for its accessible name.
    openCard: (text: string): string => `Show the reading. ${text}`,
    source: 'Source:',
    notEnough: (count: number): string => `Not enough data yet (${count})`,
  },
  problems: {
    label: 'Content problems (for the team)',
  },
  // A phase that failed to draw (the last line of defence, src/App.tsx). The
  // readings are in the browser store, so nothing the person saved is lost.
  screenFailed: {
    message: 'This screen could not be shown. Your saved readings are still on this device.',
    reload: 'Reload',
  },
  // The chip about sending the outbox (REQ-28). One state at a time: the
  // connection, then what it means for the readings, joined by a middle dot.
  // Every fact stays (waiting count, online or offline, a failure), but the bar
  // shows only one of them.
  sync: {
    online: 'Online',
    offline: 'Offline',
    offlineNotice: 'You are offline. Entries wait on this device.',
    noServer: 'No server',
    waiting: (count: number): string => `${count} ${WAITING_WORD}`,
    // The word alone, so a narrow screen can keep the count and the chip keeps
    // one sentence for its title.
    waitingWord: WAITING_WORD,
    allSent: 'all sent',
    savedHere: 'saved here',
    // The whole chip as one sentence, for its tooltip and the tests.
    chip: (state: string, detail: string): string => `${state} · ${detail}`,
    sendNow: 'Send now',
    // What the server said about a reading it did not take (REQ-28): the count
    // and the reason, in the one place the bar has room for it.
    notAccepted: (count: number): string =>
      count === 1 ? '1 not accepted' : `${count} not accepted`,
    // The browser blocked storage, or replaced data it could not read.
    notSaved: 'Entries are not saved on this device.',
    reset: 'Saved entries could not be read and were replaced by the demo data.',
  },
  // Signing in (REQ-37, T-70): a face kept on this device, a username and a
  // PIN, a new account, or the open demo of REQ-32. Short sentences, no health
  // wording. The PIN is never written down here or anywhere in the browser.
  signIn: {
    faceHeading: 'Sign in with your face',
    // The closed row that holds the username and PIN form and the new account.
    moreToggle: 'Username and PIN',
    faceNote: 'A face saved on this device opens your session.',
    // No face on this device yet: how to add one, in one line.
    faceNone: 'Sign in with your PIN once, then add your face on this device',
    // Offered after a PIN sign-in when no face of that person is saved here.
    faceOfferHeading: 'Add face sign-in on this device',
    faceOfferNote:
      'Your face is turned into numbers kept only on this device. You read the details before the camera opens.',
    faceOfferAction: 'Add face sign-in on this device',
    faceOfferSkip: 'Not now',
    pinHeading: 'Username and PIN',
    username: 'Username',
    pin: 'PIN',
    pinHint: '4 to 8 digits.',
    action: 'Sign in',
    createToggle: 'Create an account',
    createHeading: 'Create an account',
    createAction: 'Create my account',
    createBack: 'Back to signing in',
    confirmPin: 'PIN again',
    demoHeading: 'Demo',
    demoNote: 'The demo astronaut has no account. Every value in it is synthetic.',
    demoAction: 'Open the demo',
    // The role line of a crew card. The demo crew is synthetic data (REQ-14),
    // so that is the role it carries.
    crewRole: 'Synthetic crew member',
    // The id a typed name becomes, shown under the field while it is typed.
    willSignInAs: (personId: string): string => `You will sign in as ${personId}`,
    signedInAs: (personId: string): string => `Signed in as ${personId}`,
    signOut: 'Sign out',
    expired: 'Your session ended. Enter your PIN again.',
    askPin: (personId: string): string => `Enter the PIN for ${personId}.`,
    errors: {
      username:
        'Start with a letter. Use letters, digits, spaces or underscores, 64 at most.',
      pin: 'Enter a PIN of 4 to 8 digits.',
      pinMismatch: 'The two PINs are different.',
      wrong: 'Wrong username or PIN.',
      blocked: 'Too many tries. Wait 10 minutes, then try again.',
      exists: 'That username is taken. Sign in with it instead.',
      invalid:
        'The server did not accept these details. Check the username and the PIN.',
      retry: 'No answer from the server. Try again.',
    },
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
    registeredFor: (personId: string): string =>
      `Your face is saved for ${personId} on this device.`,
    chooseFirst:
      'Sign in first. Your face is saved for the person who is signed in.',
    register: 'Register face',
    signIn: 'Use my face',
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
  timeLabel: (day: number, time: string, context?: string): string =>
    context
      ? `FD ${day} · GMT ${time} · ${context}`
      : `FD ${day} · GMT ${time}`,
  // The metadata line of the top bar: the mission day of the latest reading and
  // the device clock, on one row with who is on duty. The synthetic data
  // sentence of REQ-14 sits in the strip under the bar.
  header: {
    metadata: (day: number, time: string): string => missionStamp(day, time),
  },
  // The unit that follows a value on a card: "58 bpm". The 1 to 5 scales hold
  // their range in the unit, so they read "4 / 5" and not "4 1 to 5".
  cardUnit: (unit: string): string => (unit === SCALE_UNIT ? '/ 5' : unit),
}

// "last 1 reading" and "last 9 readings": the count inside the history sentence.
function readingCount(count: number): string {
  return `last ${count} ${count === 1 ? 'reading' : 'readings'}`
}

// The mission time of the header band, in the technical label style of
// STANDARDS.md section 4: the day, then the clock, on one line.
function missionStamp(day: number, time: string): string {
  return `Flight Day ${day} · GMT ${time}`
}
