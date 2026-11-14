// Every text shown on screen lives here, in plain English (REQ-30).

// The unit Phys writes in indicators.csv for the two 1 to 5 scales (sleep
// quality and mood). The screens read it, never a bound of their own.
export const SCALE_UNIT = '1 to 5'

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
  tabs: {
    label: 'Screens',
    home: 'Home',
    entry: 'Entry',
    history: 'History',
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
  badge: {
    inRange: 'In range',
    // No attention rule for this indicator, so no "in range" claim.
    noRules: 'No threshold yet',
    noData: 'No data',
  },
  nextStep: {
    inRange: 'No action needed.',
    noRules:
      'No attention rule for this indicator yet. Check with your CMO if you are unsure.',
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
    noServer: 'No server set up for this demo',
    notAccepted: (count: number): string =>
      `${count} not accepted by the server`,
    // The browser blocked storage, or replaced data it could not read.
    notSaved: 'Entries are not saved on this device.',
    reset: 'Saved entries could not be read and were replaced by the demo data.',
  },
  timeLabel: (day: number, time: string): string => `Day ${day} ${time}`,
  // The unit that follows a value on a card: "58 bpm". The 1 to 5 scales hold
  // their range in the unit, so they read "4 / 5" and not "4 1 to 5".
  cardUnit: (unit: string): string => (unit === SCALE_UNIT ? '/ 5' : unit),
}

// "(1 entry)" and "(9 entries)": the count inside the history sentence.
function entryCount(count: number): string {
  return `${count} ${count === 1 ? 'entry' : 'entries'}`
}
