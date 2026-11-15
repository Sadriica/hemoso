import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { PAIN_STORAGE_KEY, readPainReports } from '../../data/painStore'
import PainPicker from './PainPicker'
import { injuryWords } from './words'

// The picker loads the 3D body lazily; jsdom has no WebGL, so the body shows its
// fallback and the same accessible list the canvas has. Selecting a place
// through that list is the path a keyboard user takes in the browser too.
const PERSON = 'demo_astronaut_1'

function renderPicker(props: Partial<Parameters<typeof PainPicker>[0]> = {}) {
  return render(
    <PainPicker personId={PERSON} missionDay={41} time="09:15" {...props} />,
  )
}

describe('pain picker', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('opens with the words of the picker and no place chosen', async () => {
    renderPicker()
    expect(
      screen.getByRole('heading', { name: injuryWords.heading }),
    ).toBeInTheDocument()
    expect(screen.getByText(injuryWords.surgeon)).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Left knee' }, { timeout: 5000 }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('adds a place chosen from the accessible list, with its strength and kind', async () => {
    renderPicker()
    await userEvent.click(await screen.findByRole('button', { name: 'Left knee' }, { timeout: 5000 }))

    expect(screen.getByRole('button', { name: 'Left knee' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText(injuryWords.intensityLegend)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 4, name: 'Left knee' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('slider', { name: injuryWords.intensityFor('Left knee') }),
    ).toHaveValue('5')
  })

  it('saves the place, the kind and the strength on this device', async () => {
    renderPicker()
    await userEvent.click(await screen.findByRole('button', { name: 'Left knee' }, { timeout: 5000 }))
    await userEvent.click(screen.getByRole('button', { name: 'Head' }))

    fireEvent.change(
      screen.getByRole('slider', { name: injuryWords.intensityFor('Left knee') }),
      { target: { value: '8' } },
    )
    await userEvent.selectOptions(
      screen.getByLabelText(injuryWords.kindFor('Head')),
      'burn',
    )
    await userEvent.type(
      screen.getByLabelText(injuryWords.noteLabel),
      'from the hatch',
    )

    await userEvent.click(screen.getByRole('button', { name: injuryWords.save }))

    expect(await screen.findByText(injuryWords.savedOnDevice)).toBeInTheDocument()
    const [report] = readPainReports(PERSON)
    expect(report?.missionDay).toBe(41)
    expect(report?.time).toBe('09:15')
    expect(report?.note).toBe('from the hatch')
    expect(report?.regions).toEqual([
      { regionId: 'left_knee', kind: 'pain', intensity: 8 },
      { regionId: 'head', kind: 'burn', intensity: 5 },
    ])
    // The form empties, so the next place starts from a clean sheet.
    expect(screen.queryAllByRole('slider')).toHaveLength(0)
  })

  it('says what is missing instead of saving an empty report', async () => {
    renderPicker()
    await userEvent.click(screen.getByRole('button', { name: injuryWords.save }))
    expect(await screen.findByRole('alert')).toHaveTextContent(injuryWords.empty)
    expect(window.localStorage.getItem(PAIN_STORAGE_KEY)).toBeNull()
  })

  it('shows the hint for both pointers and the groups of the list', async () => {
    renderPicker()
    expect(screen.getByText('Tap the body or pick from the list.')).toBeInTheDocument()
    await screen.findByRole('button', { name: 'Left knee' }, { timeout: 5000 })
    expect(screen.getByRole('list', { name: 'Right arm' })).toBeInTheDocument()
  })

  it('says so when this device does not keep the report', async () => {
    renderPicker({ storage: null })
    await userEvent.click(await screen.findByRole('button', { name: 'Right hand' }))
    await userEvent.click(screen.getByRole('button', { name: injuryWords.save }))
    expect(await screen.findByText(injuryWords.notSaved)).toBeInTheDocument()
  })

  it('drops a place again from its own row', async () => {
    renderPicker()
    await userEvent.click(await screen.findByRole('button', { name: 'Left knee' }, { timeout: 5000 }))
    await userEvent.click(
      screen.getByRole('button', { name: injuryWords.remove('Left knee') }),
    )
    expect(screen.getByRole('button', { name: 'Left knee' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(
      within(screen.getByRole('group', { name: 'Body parts' })).getAllByRole('listitem'),
    ).toHaveLength(25)
  })
})
