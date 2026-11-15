import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { LocalEntryStore } from '../data/entryStore'
import { SERVER_ID_PREFIX } from '../data/historyClient'
import type { Entry, Indicator } from '../domain/types'
import { strings } from '../strings'
import ReportPhase from './ReportPhase'

const heartRate: Indicator = {
  id: 'hr_bpm',
  name: 'Heart rate',
  unit: 'bpm',
  direction: 'both',
  measuredOnBoard: 'example',
  hazards: [],
  minSpread: 4,
  sources: ['Assumption'],
}

function reading(id: string, missionDay: number): Entry {
  return {
    id,
    personId: 'cadet',
    indicatorId: 'hr_bpm',
    value: 70,
    unit: 'bpm',
    missionDay,
    time: '07:00',
    context: 'rest',
  }
}

function phase(entries: Entry[]) {
  return (
    <ReportPhase
      headingRef={createRef<HTMLHeadingElement>()}
      store={new LocalEntryStore({ storage: null })}
      personId="cadet"
      indicators={[heartRate]}
      entries={entries}
      serverConfigured
      onBack={() => {}}
      onDone={() => {}}
      still
    />
  )
}

describe('ReportPhase count of readings logged in this check', () => {
  const copy = strings.phases.report

  it('counts a reading saved here', () => {
    const opened = [reading('a', 1)]
    const { rerender } = render(phase(opened))
    expect(screen.getByText(copy.logged(0))).toBeInTheDocument()
    rerender(phase([...opened, reading('b', 2)]))
    expect(screen.getByText(copy.logged(1))).toBeInTheDocument()
  })

  it('does not count a reading the server sent back while the phase was open', () => {
    const opened = [reading('a', 1)]
    const { rerender } = render(phase(opened))
    rerender(
      phase([
        ...opened,
        reading(`${SERVER_ID_PREFIX}cadet:hr_bpm:2:07:00`, 2),
        reading('b', 3),
      ]),
    )
    expect(screen.getByText(copy.logged(1))).toBeInTheDocument()
  })
})
