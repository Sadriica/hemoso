// Synthetic demo data for the HeMoSo frontend. Nothing here is real data: no
// astronaut was measured. Every value and every source is 'Assumption'. The
// module is deterministic on purpose (a seeded generator, no Math.random at
// import time) so the demo and the tests always see the same numbers.

import type {
  Alert,
  Crew,
  CrewStatus,
  Fitness,
  Level,
  Mission,
  MissionControlStatus,
  SeriesPoint,
  Source,
  SystemId,
  SystemStatus,
} from '../types'

export const MOCK_CREW: Crew[] = [
  { id: 'crew_a', label: 'Astronaut A' },
  { id: 'crew_b', label: 'Astronaut B' },
  { id: 'crew_c', label: 'Astronaut C' },
]

export const MOCK_MISSION: Mission = {
  environment: 'ship',
  currentDay: 42,
  phase: 'long_duration',
}

export const SNAPSHOT_DAYS = [14, 22, 41, 42]

const ALL_SYSTEMS: SystemId[] = [
  'heart',
  'immune',
  'mood_sleep',
  'metabolism',
  'bone_muscle',
]

const ASSUMPTION: Source = 'Assumption'

const PREVENTION_PLACEHOLDER = {
  text: 'Prevention guidance for this system is being prepared.',
  sources: [ASSUMPTION],
}

function greenSystem(system: SystemId): SystemStatus {
  return {
    system,
    level: 'green',
    changedSignals: [],
    prevention: PREVENTION_PLACEHOLDER,
  }
}

const USUALLY_RELATED = [
  { situation: 'the start of a mild infection', sources: [ASSUMPTION] },
  { situation: 'several nights of poor rest', sources: [ASSUMPTION] },
  { situation: 'a heavier exercise load than usual', sources: [ASSUMPTION] },
]

const ALERT_41_HEART: Alert = {
  whatChanged:
    'Your resting heart rate has been above your normal for 3 nights and your heart rate variability is lower than usual.',
  usuallyRelated: USUALLY_RELATED,
  whatToCheck:
    'Your body temperature tomorrow when you wake up, and whether any symptom appears.',
  whatToDo: 'Prioritise rest tonight.',
  escalation:
    'If you have a fever or symptoms tomorrow, HeMoSo will alert the flight surgeon at the next link.',
}

const ALERT_41_IMMUNE: Alert = {
  whatChanged: 'Your skin temperature has been above your normal for 2 nights.',
  usuallyRelated: USUALLY_RELATED,
  whatToCheck:
    'Your body temperature tomorrow when you wake up, and whether any symptom appears.',
  whatToDo: 'Prioritise rest tonight.',
  escalation:
    'If you have a fever or symptoms tomorrow, HeMoSo will alert the flight surgeon at the next link.',
}

const ALERT_42_HEART: Alert = {
  whatChanged:
    'Your resting heart rate has been above your normal for 4 nights and your heart rate variability is still lower than usual.',
  usuallyRelated: USUALLY_RELATED,
  whatToCheck:
    'Your body temperature again tomorrow morning, and whether your sore throat continues.',
  whatToDo: 'Keep resting.',
  escalation:
    'HeMoSo has prepared the alert for the flight surgeon and will send it at the next link.',
}

const ALERT_42_IMMUNE: Alert = {
  whatChanged: 'Your body temperature is high and you reported a sore throat today.',
  usuallyRelated: [
    { situation: 'the start of a mild infection', sources: [ASSUMPTION] },
  ],
  whatToCheck:
    'Your body temperature again tomorrow morning, and whether any new symptom appears.',
  whatToDo: 'Tell the crew medical officer today and rest.',
  escalation:
    'HeMoSo has prepared the alert for the flight surgeon and will send it at the next link.',
}

const STREAKS: Record<number, number> = { 14: 14, 22: 22, 41: 0, 42: 0 }

function snapshot(
  day: number,
  worstLevel: Level,
  overrides: SystemStatus[],
): CrewStatus {
  const systems = ALL_SYSTEMS.map((system) => {
    const override = overrides.find((entry) => entry.system === system)
    return override ?? greenSystem(system)
  })
  return {
    crewId: 'crew_a',
    day,
    phase: 'long_duration',
    environment: 'ship',
    worstLevel,
    systems,
    streakDays: STREAKS[day] ?? 0,
  }
}

const SNAPSHOTS: Record<number, CrewStatus> = {
  14: snapshot(14, 'green', []),
  22: snapshot(22, 'green', []),
  41: snapshot(41, 'yellow', [
    {
      system: 'heart',
      level: 'yellow',
      changedSignals: ['resting_hr', 'hrv'],
      alert: ALERT_41_HEART,
    },
    {
      system: 'immune',
      level: 'yellow',
      changedSignals: ['skin_temp'],
      alert: ALERT_41_IMMUNE,
    },
  ]),
  42: snapshot(42, 'orange', [
    {
      system: 'heart',
      level: 'orange',
      changedSignals: ['resting_hr', 'hrv'],
      alert: ALERT_42_HEART,
    },
    {
      system: 'immune',
      level: 'orange',
      changedSignals: ['skin_temp', 'body_temp', 'symptoms'],
      alert: ALERT_42_IMMUNE,
    },
  ]),
}

function fitnessList(crewAFitness: Fitness): MissionControlStatus[] {
  return MOCK_CREW.map((crew) => ({
    crewId: crew.id,
    label: crew.label,
    fitness: crew.id === 'crew_a' ? crewAFitness : 'fit',
  }))
}

const MISSION_CONTROL: Record<number, MissionControlStatus[]> = {
  14: fitnessList('fit'),
  22: fitnessList('fit'),
  41: fitnessList('fit'),
  42: fitnessList('fit_with_restrictions'),
}

export function crewStatus(crewId: string, day: number): CrewStatus {
  if (crewId === 'crew_a') {
    const found = SNAPSHOTS[day]
    if (found) return found
  }
  const crew = MOCK_CREW.find((entry) => entry.id === crewId)
  return greenStatus(crew ?? { id: crewId, label: crewId }, day)
}

export function missionControlStatus(day: number): MissionControlStatus[] {
  return MISSION_CONTROL[day] ?? fitnessList('fit')
}

function greenStatus(crew: Crew, day: number): CrewStatus {
  return {
    crewId: crew.id,
    day,
    phase: 'long_duration',
    environment: 'ship',
    worstLevel: 'green',
    systems: ALL_SYSTEMS.map(greenSystem),
    streakDays: day,
  }
}

// A small deterministic generator (mulberry32) so the series is stable across
// reloads and test runs without touching Math.random.
function mulberry32(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SERIES_DAYS = 46

interface SignalSpec {
  median: number
  low: number
  high: number
  noise: number
  decimals: number
  seed: number
  events: Record<number, number>
}

const SERIES_SIGNALS = ['resting_hr', 'hrv', 'skin_temp'] as const
type SeriesSignal = (typeof SERIES_SIGNALS)[number]

const SIGNAL_SPECS: Record<SeriesSignal, SignalSpec> = {
  resting_hr: {
    median: 58,
    low: 55,
    high: 61,
    noise: 1.5,
    decimals: 0,
    seed: 11,
    events: { 22: 20, 40: 7, 41: 10, 42: 12, 43: 13, 44: 11, 45: 6, 46: 3 },
  },
  hrv: {
    median: 45,
    low: 40,
    high: 50,
    noise: 2,
    decimals: 0,
    seed: 22,
    events: { 40: -5, 41: -8, 42: -10, 43: -11, 44: -9, 45: -5, 46: -2 },
  },
  skin_temp: {
    median: 35.4,
    low: 35.0,
    high: 35.8,
    noise: 0.1,
    decimals: 1,
    seed: 33,
    events: { 40: 0.3, 41: 0.5, 42: 0.8, 43: 0.9, 44: 0.7, 45: 0.4, 46: 0.2 },
  },
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function buildSeries(signal: SeriesSignal): SeriesPoint[] {
  const spec = SIGNAL_SPECS[signal]
  const random = mulberry32(spec.seed)
  const points: SeriesPoint[] = []
  for (let day = 1; day <= SERIES_DAYS; day++) {
    const noise = (random() * 2 - 1) * spec.noise
    const delta = spec.events[day] ?? 0
    const value = roundTo(spec.median + noise + delta, spec.decimals)
    points.push({ day, value, median: spec.median, low: spec.low, high: spec.high })
  }
  return points
}

const seriesCache = new Map<string, SeriesPoint[]>()

function allSeries(signal: string): SeriesPoint[] {
  if (!isSeriesSignal(signal)) return []
  const cached = seriesCache.get(signal)
  if (cached) return cached
  const built = buildSeries(signal)
  seriesCache.set(signal, built)
  return built
}

function isSeriesSignal(signal: string): signal is SeriesSignal {
  return SERIES_SIGNALS.includes(signal as SeriesSignal)
}

export function series(signal: string, toDay: number): SeriesPoint[] {
  return allSeries(signal).filter((point) => point.day <= toDay)
}
