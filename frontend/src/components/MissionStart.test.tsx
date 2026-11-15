import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { strings } from '../strings'
import MissionStart from './MissionStart'

describe('MissionStart', () => {
  it('names the start and offers to change it', () => {
    render(<MissionStart start="2026-11-02" onChange={() => {}} />)
    expect(screen.getByText(strings.mission.started('2 Nov'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: strings.mission.change })).toBeInTheDocument()
  })

  it('says when none is set', () => {
    render(<MissionStart start={null} onChange={() => {}} />)
    expect(screen.getByText(strings.mission.notSet)).toBeInTheDocument()
  })

  it('saves a new date and closes, or cancels with Escape', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MissionStart start="2026-11-02" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: strings.mission.change }))
    const field = screen.getByLabelText(strings.mission.dayOneLabel)
    expect(field).toHaveFocus()
    await user.clear(field)
    await user.type(field, '2026-11-05')
    await user.click(screen.getByRole('button', { name: strings.mission.save }))
    expect(onChange).toHaveBeenCalledWith('2026-11-05')
    await user.click(screen.getByRole('button', { name: strings.mission.change }))
    await user.keyboard('{Escape}')
    expect(screen.queryByLabelText(strings.mission.dayOneLabel)).toBeNull()
    expect(onChange).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: strings.mission.change })).toHaveFocus()
  })

  it('says why a date is refused and saves nothing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MissionStart start="2026-11-02" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: strings.mission.change }))
    const field = screen.getByLabelText(strings.mission.dayOneLabel)
    await user.clear(field)
    await user.type(field, '2026-02-31')
    await user.click(screen.getByRole('button', { name: strings.mission.save }))
    expect(screen.getByRole('alert')).toHaveTextContent(strings.mission.dayOneInvalid)
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveFocus()
    await user.clear(field)
    await user.type(field, '2999-01-01')
    await user.click(screen.getByRole('button', { name: strings.mission.save }))
    expect(screen.getByRole('alert')).toHaveTextContent(strings.mission.dayOneFuture)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('closes with Cancel and keeps the saved date', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MissionStart start="2026-11-02" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: strings.mission.change }))
    await user.click(screen.getByRole('button', { name: strings.mission.cancel }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(strings.mission.started('2 Nov'))).toBeInTheDocument()
  })
})
