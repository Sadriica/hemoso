import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocalEntryStore } from '../data/entryStore'
import { createSyncClient } from '../data/sync'
import { strings } from '../strings'
import Topbar from './Topbar'

function bar(clock: { missionDay: number; time: string } | null) {
  return render(
    <Topbar
      clock={clock}
      personId={clock ? 'demo_astronaut_1' : null}
      store={new LocalEntryStore()}
      client={createSyncClient()}
      motionReduced={false}
      onToggleMotion={() => {}}
    />,
  )
}

describe('Topbar clock', () => {
  it('shows the day and the time of the person', () => {
    bar({ missionDay: 12, time: '09:05' })
    expect(screen.getByText(strings.header.metadata(12, '09:05'))).toBeInTheDocument()
  })

  it('offers the mission start editor only when it can be changed', () => {
    const { unmount } = render(
      <Topbar
        clock={{ missionDay: 3, time: '09:05' }}
        personId="ana"
        missionStart="2026-11-02"
        onChangeMissionStart={() => {}}
        store={new LocalEntryStore()}
        client={createSyncClient()}
        motionReduced={false}
        onToggleMotion={() => {}}
      />,
    )
    expect(screen.getByText(strings.mission.started('2 Nov'))).toBeInTheDocument()
    unmount()
    bar({ missionDay: 12, time: '09:05' })
    expect(screen.queryByText(strings.mission.change)).toBeNull()
  })

  it('hides the day and the clock without a person', () => {
    const { container } = bar(null)
    expect(container.querySelector('.topbar__stamp')).toBeNull()
    expect(screen.queryByText(/Flight Day \d/)).toBeNull()
  })
})
