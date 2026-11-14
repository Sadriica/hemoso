import { useEffect, useState } from 'react'
import type { ApiClient } from '../api/client'
import type {
  Crew,
  CrewStatus,
  Mission,
  MissionControlStatus,
} from '../api/types'

export type Role = 'astronaut' | 'mission_control'

export interface AppData {
  mission: Mission | null
  crew: Crew[]
  days: number[]
  status: CrewStatus | null
  mcStatus: MissionControlStatus[]
  loading: boolean
  error: boolean
  retry: () => void
}

// Owns all data loading for the app shell. Receives the current selection and
// resolves the first crew/day as defaults while the raw values are still empty.
export function useAppData(
  client: ApiClient,
  role: Role,
  crewId: string,
  day: number,
): AppData {
  const [reloadKey, setReloadKey] = useState(0)

  const [mission, setMission] = useState<Mission | null>(null)
  const [crew, setCrew] = useState<Crew[]>([])
  const [days, setDays] = useState<number[]>([])
  const [status, setStatus] = useState<CrewStatus | null>(null)
  const [mcStatus, setMcStatus] = useState<MissionControlStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const effectiveCrewId = crewId || crew[0]?.id || ''
  const effectiveDay = day || days[0] || 0

  useEffect(() => {
    let cancelled = false
    async function loadStatic() {
      setError(false)
      try {
        const [missionData, crewData, daysData] = await Promise.all([
          client.getMission(),
          client.getCrew(),
          client.getDemoDays(),
        ])
        if (cancelled) return
        setMission(missionData)
        setCrew(crewData)
        setDays(daysData)
      } catch {
        if (!cancelled) setError(true)
      }
    }
    void loadStatic()
    return () => {
      cancelled = true
    }
  }, [client, reloadKey])

  useEffect(() => {
    if (effectiveDay === 0) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(false)
      try {
        if (role === 'astronaut') {
          const data = await client.getCrewStatus(effectiveCrewId, effectiveDay)
          if (!cancelled) setStatus(data)
        } else {
          const data = await client.getMissionControlStatus(effectiveDay)
          if (!cancelled) setMcStatus(data)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [client, role, effectiveCrewId, effectiveDay, reloadKey])

  const retry = () => setReloadKey((key) => key + 1)

  return { mission, crew, days, status, mcStatus, loading, error, retry }
}
