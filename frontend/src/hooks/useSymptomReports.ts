import { useEffect, useMemo, useState } from 'react'
import { mergeSymptomReports, type SymptomReport } from '../domain/symptoms'
import { readSymptomReports, subscribeSymptoms } from '../data/symptomStore'

// One person's symptom reports: the demo log of config/ (their own rows only)
// and what this device stored, live. Both are one list, one report per key.
export function useSymptomReports(
  personId: string,
  demoReports: SymptomReport[],
): SymptomReport[] {
  const [version, setVersion] = useState(0)
  useEffect(() => subscribeSymptoms(() => setVersion((count) => count + 1)), [])
  return useMemo(
    () =>
      mergeSymptomReports(
        demoReports.filter((report) => report.personId === personId),
        // `version` only says that the store changed.
        version >= 0 ? readSymptomReports(personId) : [],
      ),
    [personId, demoReports, version],
  )
}
