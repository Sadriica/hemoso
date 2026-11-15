import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { readSymptomReports } from '../../data/symptomStore'
import type { SymptomDef } from '../../domain/symptoms'
import { strings } from '../../strings'
import SymptomChecklist from './SymptomChecklist'

const copy = strings.symptoms
const defs: SymptomDef[] = [
  { id: 'thirst', name: 'Thirst', redFlag: false, shared: false, source: 'Assumption' },
  { id: 'confusion', name: 'Confusion', redFlag: true, shared: true, source: 'Assumption' },
]

function open() {
  const user = userEvent.setup()
  render(<SymptomChecklist personId="astro_1" defs={defs} entries={[]} />)
  return user
}

describe('SymptomChecklist', () => {
  beforeEach(() => localStorage.clear())

  it('is not shown without symptom definitions', () => {
    const { container } = render(
      <SymptomChecklist personId="astro_1" defs={[]} entries={[]} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('is optional, closed by default, and a fieldset of real checkboxes with a legend', async () => {
    const user = open()
    expect(screen.queryByRole('checkbox')).toBeNull()
    await user.click(screen.getByRole('button', { name: copy.toggle }))
    const group = screen.getByRole('group', { name: copy.legend })
    expect(group.tagName).toBe('FIELDSET')
    expect(screen.getAllByRole('checkbox').map((box) => (box as HTMLInputElement).labels?.[0].textContent)).toEqual([
      'Thirst',
      'Confusion',
    ])
  })

  it('saves the ticked symptoms with their strength and says so', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: copy.toggle }))
    await user.click(screen.getByRole('checkbox', { name: 'Thirst' }))
    await user.selectOptions(screen.getByRole('combobox', { name: copy.strength('Thirst') }), '3')
    await user.click(screen.getByRole('button', { name: copy.save }))
    expect(screen.getByRole('status')).toHaveTextContent(copy.saved(1))
    const [report] = readSymptomReports('astro_1')
    expect(report).toMatchObject({ symptomId: 'thirst', severity: 3, missionDay: 1 })
    expect(screen.getByRole('checkbox', { name: 'Thirst' })).not.toBeChecked()
  })

  it('asks for a tick instead of saving nothing', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: copy.toggle }))
    await user.click(screen.getByRole('button', { name: copy.save }))
    expect(screen.getByRole('status')).toHaveTextContent(copy.nothingTicked)
    expect(readSymptomReports('astro_1')).toEqual([])
  })

  it('shows "Call your CMO now" at once for a red flag, before saving, and keeps it after', async () => {
    const user = open()
    expect(screen.queryByText(copy.callCmo)).toBeNull()
    await user.click(screen.getByRole('button', { name: copy.toggle }))
    await user.click(screen.getByRole('checkbox', { name: 'Confusion' }))
    expect(screen.getByRole('alert')).toHaveTextContent(copy.callCmo)
    expect(screen.getByRole('alert')).toHaveTextContent('Confusion')
    expect(readSymptomReports('astro_1')).toEqual([])
    await user.click(screen.getByRole('button', { name: copy.save }))
    expect(screen.getByRole('alert')).toHaveTextContent(copy.callCmo)
    // Closing the list does not hide it.
    await user.click(screen.getByRole('button', { name: copy.toggle }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('does not show the line for a symptom that is not a red flag', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: copy.toggle }))
    await user.click(screen.getByRole('checkbox', { name: 'Thirst' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
