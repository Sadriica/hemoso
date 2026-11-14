// Every text shown on screen lives here, in plain English (REQ-30).
export const strings = {
  appName: 'HeMoSo',
  skipToMain: 'Skip to main content',
  syntheticNotice: 'Demo with synthetic data only.',
  placeholderNotice: 'Showing example content until the team adds config files.',
  personPickerLabel: 'Person',
  personHeading: (personId: string): string => `Status for ${personId}`,
  tabs: {
    label: 'Screens',
    home: 'Home',
    entry: 'Entry',
  },
  entry: {
    heading: 'Entry',
    indicator: 'Indicator',
    // The unit belongs in the label and next to the field (REQ-02).
    value: (unit: string): string => `Value (${unit})`,
    missionDay: 'Mission day',
    time: 'Time',
    save: 'Save entry',
    saved: 'Saved. Waiting to be sent.',
    noIndicators: 'No indicators are set up yet.',
    errors: {
      valueRequired: 'Enter a value.',
      valueNumber: 'Enter a number.',
      missionDay: 'Enter a whole mission day, 1 or more.',
      time: 'Enter a time as HH:MM.',
    },
  },
  badge: {
    inRange: 'In range',
    noData: 'No data',
  },
  nextStep: {
    inRange: 'No action needed.',
    noData: 'No data yet.',
    missing: 'No guidance for this state yet.',
  },
  sources: {
    label: 'Sources',
    assumption: 'Assumption',
    empty: 'No sources listed.',
  },
  problems: {
    label: 'Content problems (for the team)',
  },
  timeLabel: (day: number, time: string): string => `Day ${day} ${time}`,
}
