import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Planetarium } from './index'
import type { PlanetItem } from './index'

const labels = { center: 'Crew', viewOrbits: 'Orbits', viewList: 'List', orbitsHeading: 'Indicators' }
const items: PlanetItem[] = [
  ['hr', 'Heart rate', 'In your usual range', 'in_range', '83 bpm'],
  ['sl', 'Sleep', 'Needs review', 'review', '4 h'],
  ['mo', 'Mood', 'No data yet', 'no_data', '-'],
].map(([id, name, stateText, state, valueText]) => ({
  id, name, stateText, state: state as PlanetItem['state'], valueText,
  icon: <svg data-testid="ico" />, stateIcon: <svg />, systemColor: 'var(--system-sleep)',
}))

function setup(wide: boolean, extra: { reducedMotion?: boolean; selectedId?: string | null } = {}) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('min-width') ? wide : false,
    addEventListener: () => {}, removeEventListener: () => {},
  }))
  const onSelect = vi.fn()
  const view = render(<Planetarium items={items} labels={labels} selectedId={extra.selectedId ?? null} onSelect={onSelect} reducedMotion={extra.reducedMotion} />)
  return { onSelect, ...view }
}
const toggle = () => screen.getByRole('button', { name: /Orbits|List/ })

beforeEach(() => { Element.prototype.animate = vi.fn(() => ({ finish: vi.fn(), cancel: vi.fn() })) as never })
afterEach(() => { vi.unstubAllGlobals() })

describe('Planetarium', () => {
  it('shows the list by default with accessible state words', () => {
    setup(true)
    const list = screen.getByRole('list', { name: 'Indicators' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('Needs review')).toBeInTheDocument()
    expect(toggle()).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggles to orbits on wide screens with the same items and names', async () => {
    const { onSelect } = setup(true, { selectedId: 'sl' })
    await userEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.getByRole('button', { name: 'Heart rate, In your usual range, 83 bpm' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Sleep, Needs review, 4 h' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: /Mood/ }))
    expect(onSelect).toHaveBeenCalledWith('mo')
  })

  it('keeps the list when the screen is narrow', async () => {
    setup(false)
    await userEvent.click(toggle())
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  it('selects from the list', async () => {
    const { onSelect } = setup(false)
    await userEvent.click(screen.getByRole('button', { name: /Sleep/ }))
    expect(onSelect).toHaveBeenCalledWith('sl')
  })

  it('uses roving tabindex and moves with arrows, Home and End', async () => {
    const { onSelect } = setup(true)
    await userEvent.click(toggle())
    const [a, b, c] = ['Heart rate', 'Sleep', 'Mood'].map((n) => screen.getByRole('button', { name: new RegExp(n) }))
    expect([a, b, c].map((x) => x.tabIndex)).toEqual([0, -1, -1])
    a.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(b).toHaveFocus()
    expect([a, b, c].map((x) => x.tabIndex)).toEqual([-1, 0, -1])
    await userEvent.keyboard('{End}')
    expect(c).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}')
    expect(a).toHaveFocus()
    await userEvent.keyboard('{End}{Home}')
    expect(a).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('sl')
    await userEvent.keyboard(' ')
    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it('returns focus to the toggle on Escape', async () => {
    setup(true)
    await userEvent.click(toggle())
    screen.getByRole('button', { name: /Sleep/ }).focus()
    await userEvent.keyboard('{Escape}')
    expect(toggle()).toHaveFocus()
  })

  it('animates the settling of each body', async () => {
    setup(true)
    await userEvent.click(toggle())
    expect(Element.prototype.animate).toHaveBeenCalledTimes(3)
  })

  it('renders the final layout with no animation under reducedMotion', async () => {
    setup(true, { reducedMotion: true })
    await userEvent.click(toggle())
    expect(Element.prototype.animate).not.toHaveBeenCalled()
    expect(screen.getAllByRole('button', { name: /,/ })).toHaveLength(3)
  })

  it('renders no animation inside .app--still', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('min-width'), addEventListener: () => {}, removeEventListener: () => {} }))
    render(<div className="app--still"><Planetarium items={items} labels={labels} selectedId={null} onSelect={() => {}} /></div>)
    await userEvent.click(toggle())
    expect(Element.prototype.animate).not.toHaveBeenCalled()
  })

  it.each([1, 2, 3, 5, 7, 8])('keeps %i bodies in their own bands inside the square', async (n) => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('min-width'), addEventListener: () => {}, removeEventListener: () => {} }))
    const many = Array.from({ length: n }, (_, i) => ({ ...items[0], id: `i${i}`, name: `Systolic blood pressure ${i}` }))
    render(<Planetarium items={many} labels={labels} selectedId={null} onSelect={() => {}} reducedMotion />)
    await userEvent.click(toggle())
    const pos = Array.from(document.querySelectorAll<HTMLElement>('.planetarium__body')).map((b) => ({
      x: parseFloat(b.style.left), y: parseFloat(b.style.top), left: b.classList.contains('planetarium__body--left'),
    }))
    for (const p of pos) {
      expect(p.x).toBeGreaterThanOrEqual(18)
      expect(p.x).toBeLessThanOrEqual(80)
      expect(p.y).toBeGreaterThanOrEqual(10)
      expect(p.y).toBeLessThanOrEqual(90)
    }
    for (const side of [true, false]) {
      const ys = pos.filter((p) => p.left === side).map((p) => p.y).sort((a, b) => a - b)
      ys.slice(1).forEach((y, k) => expect(y - ys[k]).toBeGreaterThanOrEqual(20))
    }
    expect(document.querySelectorAll('.planetarium__tag')).toHaveLength(n)
  })

  it('can start in the orbit view with the right toggle label and no list', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('min-width'), addEventListener: () => {}, removeEventListener: () => {} }))
    render(<Planetarium items={items} labels={labels} selectedId={null} onSelect={() => {}} initialView="orbits" />)
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.getByRole('group', { name: 'Indicators' })).toBeInTheDocument()
    expect(toggle()).toHaveTextContent('List')
    expect(toggle()).toHaveAttribute('aria-pressed', 'true')
  })

  it('reads the settling duration and easing from the tokens', async () => {
    document.documentElement.style.setProperty('--motion-cinematic', '800ms')
    document.documentElement.style.setProperty('--ease-standard', 'linear')
    setup(true)
    await userEvent.click(toggle())
    const opts = (Element.prototype.animate as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(opts).toMatchObject({ duration: 800, easing: 'linear' })
    document.documentElement.style.removeProperty('--motion-cinematic')
    document.documentElement.style.removeProperty('--ease-standard')
  })

  describe('stylesheet', () => {
    const css = readFileSync('src/components/planetarium/planetarium.css', 'utf8')
    it('reserves the final stage size from the first paint', () => {
      expect(css).toMatch(/\.planetarium__stage \{[^}]*aspect-ratio: 1 \/ 1/)
    })
    it('never cuts or hides text', () => {
      expect(css).not.toMatch(/text-overflow|nowrap|line-clamp/)
    })
    it('keeps raw pixel sizes inside the named custom properties', () => {
      const body = css.replace(/\.planetarium \{[^}]*--planet-target[^}]*\}/, '')
      expect(body.match(/\d+px/g)?.filter((v) => v !== '899px') ?? []).toEqual([])
    })
    it('colours ring, tag edge and state text with the state colour', () => {
      expect(css).toMatch(/\.planetarium__tag \{[^}]*border: var\(--planet-line\) solid var\(--ring\)/)
      expect(css).toMatch(/\.planetarium__tag-state \{ color: var\(--ring\)/)
    })
  })
})
