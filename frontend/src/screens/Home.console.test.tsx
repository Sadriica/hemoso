import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { loadContent } from '../content/load'
import { strings } from '../strings'
import Home from './Home'

// The system strip of the status console: counts taken from the statuses on
// screen, with the team's own files and the synthetic demo readings.
const data = loadContent()
const PERSON = data.demoEntries[0].personId

describe('Home system strip', () => {
  it('counts the channels and the states, each with words', () => {
    render(<Home personId={PERSON} data={data} entries={data.demoEntries} />)
    const strip = screen.getByRole('list', { name: strings.board.strip.label })
    const items = within(strip).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(
      strings.board.strip.channels(data.indicators.length),
    )
    // The counts of the states add up to the number of channels.
    const total = items
      .slice(1)
      .map((item) => Number.parseInt(item.textContent ?? '', 10))
      .reduce((sum, count) => sum + count, 0)
    expect(total).toBe(data.indicators.length)
    for (const item of items.slice(1)) {
      // An icon and words, never a colour on its own.
      expect(item.querySelector('svg')).not.toBeNull()
      expect(item.textContent).toMatch(/[a-z]{3,}/)
    }
  })

  it('leaves out a state with no channel', () => {
    render(<Home personId="nobody" data={data} entries={[]} />)
    const strip = screen.getByRole('list', { name: strings.board.strip.label })
    const items = within(strip).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[1]).toHaveTextContent(
      strings.board.strip.count.no_data(data.indicators.length),
    )
  })
})
