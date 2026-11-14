import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { MockClient } from './api/client'
import type { CrewStatus, Mission } from './api/types'

class FlakyClient extends MockClient {
  failMission = true

  override getMission(): Promise<Mission> {
    if (this.failMission) return Promise.reject(new Error('boom'))
    return super.getMission()
  }
}

class HoldableClient extends MockClient {
  private resolveCrewB: ((value: CrewStatus) => void) | null = null
  private heldDay = 0
  holdCrewB = true

  releaseCrewB() {
    const resolve = this.resolveCrewB
    const day = this.heldDay
    this.holdCrewB = false
    this.resolveCrewB = null
    if (resolve) {
      void super.getCrewStatus('crew_b', day).then(resolve)
    }
  }

  override getCrewStatus(crewId: string, day: number): Promise<CrewStatus> {
    if (crewId === 'crew_b' && this.holdCrewB) {
      this.heldDay = day
      return new Promise((resolve) => {
        this.resolveCrewB = resolve
      })
    }
    return super.getCrewStatus(crewId, day)
  }
}

describe('App shell', () => {
  it('shows the skip link targeting a focusable main landmark and the synthetic notice', async () => {
    render(<App />)

    const link = screen.getByRole('link', { name: /skip to main content/i })
    expect(link).toHaveAttribute('href', '#main-content')

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main-content')
    expect(main).toHaveAttribute('tabindex', '-1')

    expect(screen.getByRole('banner')).toHaveTextContent('HeMoSo')
    expect(screen.getByRole('heading', { level: 1, name: 'HeMoSo' })).toBeInTheDocument()
    expect(screen.getByText('Demo with synthetic data only.')).toBeInTheDocument()

    await screen.findAllByText('Green · OK')
  })

  it('does not show "Day 0" before the days load', async () => {
    render(<App />)

    expect(screen.queryByText('Day 0')).not.toBeInTheDocument()

    await screen.findAllByText('Green · OK')
  })

  it('shows Yellow · Watch after changing the day to 41', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findAllByText('Green · OK')
    expect(screen.queryByText('Yellow · Watch')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/mission day/i), '41')

    const yellow = await screen.findAllByText('Yellow · Watch')
    expect(yellow.length).toBeGreaterThan(0)
    expect(screen.queryByText('Orange · Needs attention')).not.toBeInTheDocument()
  })

  it('role switch shows mission control fitness only', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findAllByText('Green · OK')

    await user.click(screen.getByRole('button', { name: /mission control/i }))

    expect(await screen.findAllByText('Fit')).toHaveLength(3)
    expect(screen.queryByText('Heart and circulation')).not.toBeInTheDocument()
    expect(screen.queryByText(/what changed/i)).not.toBeInTheDocument()
  })

  it('shows a crew picker for the astronaut role', async () => {
    render(<App />)
    await screen.findAllByText('Green · OK')

    expect(screen.getByLabelText(/crew member/i)).toBeInTheDocument()
  })

  it('retry clears the error after a failed first load', async () => {
    const user = userEvent.setup()
    const client = new FlakyClient()
    render(<App client={client} />)

    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument()

    client.failMission = false
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findAllByText('Green · OK')).not.toHaveLength(0)
    expect(screen.queryByText('Something went wrong.')).not.toBeInTheDocument()
  })

  it('keeps the heading matching the shown data while switching crew', async () => {
    const user = userEvent.setup()
    const client = new HoldableClient()
    render(<App client={client} />)

    await screen.findAllByText('Green · OK')

    await user.selectOptions(screen.getByLabelText(/mission day/i), '41')
    await screen.findAllByText('Yellow · Watch')

    await user.selectOptions(screen.getByLabelText(/crew member/i), 'crew_b')

    // The new crew's data is held back, so Astronaut A's yellow stays on screen
    // under Astronaut A's heading, never under Astronaut B's.
    expect(screen.getByRole('heading', { name: 'Astronaut A' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Astronaut B' })).not.toBeInTheDocument()

    client.releaseCrewB()
    await screen.findAllByText('Green · OK')
    expect(screen.getByRole('heading', { name: 'Astronaut B' })).toBeInTheDocument()
    expect(screen.queryByText('Yellow · Watch')).not.toBeInTheDocument()
  })
})
