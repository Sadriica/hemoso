// Response and request types shared by the API client, the mock data and the
// screens. Written by hand to match docs/CONTRACTS.md and docs/API.md until the
// backend exposes OpenAPI and these are generated instead.

export type Level = 'green' | 'yellow' | 'orange'

export type SystemId =
  | 'heart'
  | 'immune'
  | 'mood_sleep'
  | 'metabolism'
  | 'bone_muscle'

export type Fitness = 'fit' | 'fit_with_restrictions' | 'not_fit'

export type Environment = 'ship' | 'station' | 'rover' | 'base'

export type Source = { title: string; url: string } | 'Assumption'

// Signal and indicator ids from team/eng2/notes/formats-proposal.md.
export type SignalId =
  | 'resting_hr'
  | 'hrv'
  | 'skin_temp'
  | 'sleep_hours'
  | 'spo2'
  | 'activity'
  | 'mood'
  | 'symptoms'
  | 'body_temp'
  | 'bp_systolic'
  | 'bp_diastolic'
  | 'glucose'
  | 'reaction_time'
  | 'calf_circumference'
  | 'near_acuity'
  | 'grip_strength'
  | 'urine_color'

// Always these four parts, in this order.
export interface Alert {
  whatChanged: string
  usuallyRelated: { situation: string; sources: Source[] }[]
  whatToCheck: string
  whatToDo: string
  escalation: string
}

export interface SystemStatus {
  system: SystemId
  level: Level
  changedSignals: SignalId[]
  // Present when the level is yellow or orange.
  alert?: Alert
  // Present when the level is green.
  prevention?: { text: string; sources: Source[] }
}

export interface CrewStatus {
  crewId: string
  day: number
  phase: string
  environment: Environment
  worstLevel: Level
  systems: SystemStatus[]
  streakDays: number
}

export interface SeriesPoint {
  day: number
  value: number | null
  median: number
  low: number
  high: number
}

export interface Crew {
  id: string
  label: string
}

export interface Mission {
  environment: Environment
  currentDay: number
  phase: string
}

// Mission control sees fitness per person only, no medical detail.
export interface MissionControlStatus {
  crewId: string
  label: string
  fitness: Fitness
}
