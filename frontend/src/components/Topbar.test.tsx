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

  it('names who is on duty in plain words', () => {
    bar({ missionDay: 12, time: '09:05' })
    expect(screen.getByText('On duty: Demo astronaut 1')).toBeInTheDocument()
  })

  it('keeps the synthetic data sentence inside the bar, as plain text', () => {
    const { container } = bar({ missionDay: 12, time: '09:05' })
    const notice = screen.getByText(strings.syntheticNotice)
    expect(container.querySelector('.topbar__bar')).toContainElement(notice)
    expect(container.querySelector('.topbar__who')).toBeNull()
  })

  it('has a motion switch that says its state and names itself', () => {
    bar(null)
    const toggle = screen.getByRole('button', { name: strings.topbar.reduceMotion })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle).toHaveAttribute('title', strings.topbar.motionOn)
  })

  it('hides the day and the clock without a person', () => {
    const { container } = bar(null)
    expect(container.querySelector('.topbar__stamp')).toBeNull()
    expect(screen.queryByText(/Flight Day \d/)).toBeNull()
  })
})
