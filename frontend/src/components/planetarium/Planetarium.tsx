import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import './planetarium.css'

/** Visual state of one indicator. */
export type PlanetState = 'in_range' | 'outside' | 'review' | 'no_data'

/** One indicator shown as a body. Every visible word and icon is passed in. */
export interface PlanetItem {
  /** Indicator id. */
  id: string
  /** Indicator name. */
  name: string
  /** The state in words. */
  stateText: string
  /** Drives the ring colour and the dashed no-data ring. */
  state: PlanetState
  /** Value with its unit. */
  valueText: string
  /** Indicator icon. */
  icon: ReactNode
  /** State icon shape. */
  stateIcon: ReactNode
  /** CSS colour for the indicator icon, e.g. 'var(--system-sleep)'. */
  systemColor: string
}

/** Words of the component, all supplied by the caller. */
export interface PlanetariumLabels {
  /** Text under the astronaut mark. */
  center: string
  /** Toggle text while the list shows (switches to orbits). */
  viewOrbits: string
  /** Toggle text while the orbits show (switches to the list). */
  viewList: string
  /** Accessible name of the list and of the orbit group. */
  orbitsHeading: string
}

/** Props of Planetarium. */
export interface PlanetariumProps {
  items: PlanetItem[]
  labels: PlanetariumLabels
  /** Id of the selected item, or null. Shared by both views. */
  selectedId: string | null
  /** Called with the id when an item is chosen. */
  onSelect: (id: string) => void
  /** Force the final layout with no animation. */
  reducedMotion?: boolean
  /** View on first paint. Default 'list'. The orbit view still needs a wide screen. */
  initialView?: 'list' | 'orbits'
}

const STATE_CLASS: Record<PlanetState, string> = {
  in_range: 'in-range',
  outside: 'outside',
  review: 'review',
  no_data: 'no-data',
}

const WIDE = '(min-width: 900px)'
const mq = (q: string) =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(q) : null

/**
 * Position of body i of n, in percent of the square. Deterministic: bodies
 * alternate right and left of the astronaut, spread evenly from top to bottom
 * on each side, so every tag has its own band and sits on the outer side.
 */
function place(i: number, n: number) {
  const left = i % 2 === 1
  const k = Math.floor(i / 2)
  const m = Math.ceil((n - (left ? 1 : 0)) / 2)
  const dy = m < 2 ? 0 : -36 + (k * 72) / (m - 1)
  const dx = 14 + (k % 2) * 6
  return { r: Math.hypot(dx, dy), x: 50 + (left ? -dx : dx), y: 50 + dy, left }
}

/** Status view: a plain list by default, concentric orbits on wide screens. */
export function Planetarium({ items, labels, selectedId, onSelect, reducedMotion, initialView = 'list' }: PlanetariumProps) {
  const [view, setView] = useState<'list' | 'orbits'>(initialView)
  const [wide, setWide] = useState(() => mq(WIDE)?.matches ?? false)
  const [stillAncestor, setStillAncestor] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const m = mq(WIDE)
    if (!m) return
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])

  useLayoutEffect(() => {
    setStillAncestor(!!root.current?.closest('.app--still'))
  }, [])

  const still = !!reducedMotion || stillAncestor || !!mq('(prefers-reduced-motion: reduce)')?.matches
  const orbits = view === 'orbits' && wide
  const active = items.some((it) => it.id === focusId)
    ? focusId
    : items.some((it) => it.id === selectedId)
      ? selectedId
      : (items[0]?.id ?? null)

  // Glide each body from the centre to its orbit; any key or pointer jumps to the end.
  useLayoutEffect(() => {
    const box = stage.current
    if (!orbits || still || root.current?.closest('.app--still') || !box || typeof box.animate !== 'function') return
    const size = box.getBoundingClientRect().width
    const css = getComputedStyle(box)
    const raw = css.getPropertyValue('--motion-cinematic').trim()
    const num = parseFloat(raw)
    const ms = Math.min(raw.endsWith('ms') && num > 0 ? num : raw.endsWith('s') && num > 0 ? num * 1000 : 1200, 1200)
    const ease = css.getPropertyValue('--ease-standard').trim() || 'cubic-bezier(0.2, 0.7, 0.1, 1)'
    const anims = Array.from(box.querySelectorAll<HTMLElement>('.planetarium__body')).map((el, i) => {
      const p = place(i, items.length)
      const dx = ((50 - p.x) / 100) * size
      const dy = ((50 - p.y) / 100) * size
      return el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) translate(-50%, -50%)`, opacity: 0 },
          { transform: 'translate(-50%, -50%)', opacity: 1 },
        ],
        { duration: ms, easing: ease },
      )
    })
    const skip = () => anims.forEach((a) => a.finish())
    window.addEventListener('keydown', skip, true)
    window.addEventListener('pointerdown', skip, true)
    return () => {
      window.removeEventListener('keydown', skip, true)
      window.removeEventListener('pointerdown', skip, true)
      anims.forEach((a) => a.cancel())
    }
    // Settle only when the orbit view appears or the set of items changes.
  }, [orbits, still, items.length])

  function focusItem(id: string) {
    setFocusId(id)
    root.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)?.focus()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      toggle.current?.focus()
      return
    }
    if (!orbits || !items.length) return
    const at = Math.max(0, items.findIndex((it) => it.id === active))
    const last = items.length - 1
    const to =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? Math.min(at + 1, last)
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? Math.max(at - 1, 0)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : -1
    if (to < 0) return
    e.preventDefault()
    focusItem(items[to].id)
  }

  function choose(id: string) {
    setFocusId(id)
    onSelect(id)
  }

  return (
    <div className="planetarium" ref={root} onKeyDown={onKeyDown}>
      <button
        type="button"
        className="planetarium__toggle"
        ref={toggle}
        aria-pressed={view === 'orbits'}
        onClick={() => setView(view === 'list' ? 'orbits' : 'list')}
      >
        {view === 'list' ? labels.viewOrbits : labels.viewList}
      </button>

      {orbits ? (
        <div className="planetarium__stage" ref={stage} role="group" aria-label={labels.orbitsHeading}>
          <svg className="planetarium__lines" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            {items.map((_, i) => (
              <circle key={i} cx="50" cy="50" r={place(i, items.length).r} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <div className="planetarium__center">
            <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" focusable="false">
              <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="1.75" />
              <rect x="13" y="18" width="22" height="13" rx="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
            </svg>
            <span>{labels.center}</span>
          </div>
          {items.map((it, i) => {
            const p = place(i, items.length)
            return (
              <div
                key={it.id}
                className={`planetarium__body planetarium__body--${STATE_CLASS[it.state]}${p.left ? ' planetarium__body--left' : ''}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <button
                  type="button"
                  data-id={it.id}
                  tabIndex={it.id === active ? 0 : -1}
                  aria-pressed={it.id === selectedId}
                  aria-label={`${it.name}, ${it.stateText}, ${it.valueText}`}
                  className="planetarium__orb"
                  onClick={() => choose(it.id)}
                >
                  <span className="planetarium__disc" style={{ color: it.systemColor }} aria-hidden="true">
                    {it.icon}
                  </span>
                </button>
                <span className="planetarium__tag" aria-hidden="true">
                  <span className="planetarium__tag-name">{it.name}</span>
                  <span className="planetarium__tag-state">
                    {it.stateIcon}
                    {it.stateText}
                  </span>
                  <span>{it.valueText}</span>
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <ul className="planetarium__list" aria-label={labels.orbitsHeading}>
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                data-id={it.id}
                aria-pressed={it.id === selectedId}
                className={`planetarium__row planetarium__row--${STATE_CLASS[it.state]}`}
                onClick={() => choose(it.id)}
              >
                <span className="planetarium__row-icon" style={{ color: it.systemColor }} aria-hidden="true">
                  {it.icon}
                </span>
                <span className="planetarium__row-name">{it.name}</span>
                <span className="planetarium__row-state">
                  {it.stateIcon}
                  {it.stateText}
                </span>
                <span className="planetarium__row-value">{it.valueText}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Planetarium
