import type { Environment, Fitness, Level, SystemId } from './api/types'

const phaseText: Record<string, string> = {
  long_duration: 'Long duration',
  early_flight: 'First weeks',
}

// Every text shown on screen lives here, in plain English.
export const strings = {
  appName: 'HeMoSo',
  skipToMain: 'Skip to main content',
  syntheticNotice: 'Demo with synthetic data only.',
  loading: 'Loading…',
  error: 'Something went wrong.',
  retry: 'Retry',
  overall: 'Overall',
  role: {
    label: 'Role',
    astronaut: 'Astronaut',
    missionControl: 'Mission control',
  },
  crewPickerLabel: 'Crew member',
  missionDayLabel: 'Mission day',
  dayLabel: (day: number): string => `Day ${day}`,
  environment: {
    ship: 'Ship',
    station: 'Station',
    rover: 'Rover',
    base: 'Base',
  } satisfies Record<Environment, string>,
  level: {
    green: 'Green · OK',
    yellow: 'Yellow · Watch',
    orange: 'Orange · Needs attention',
  } satisfies Record<Level, string>,
  system: {
    heart: 'Heart and circulation',
    immune: 'Immune system',
    mood_sleep: 'Mood and sleep',
    metabolism: 'Metabolism and nutrition',
    bone_muscle: 'Bone and muscle',
  } satisfies Record<SystemId, string>,
  fitness: {
    fit: 'Fit',
    fit_with_restrictions: 'Fit with restrictions',
    not_fit: 'Not fit',
  } satisfies Record<Fitness, string>,
}

export function phaseLabel(phase: string): string {
  return phaseText[phase] ?? phase
}
