// The 3D body: a stylised mannequin the astronaut turns, hovers and taps.
//
// Two modes. `status` lights the regions of one body system in the colour of
// its state, the way the 2D silhouette did. `pain` selects regions, one tap per
// place, and marks each one with the kind of mark and its strength.
//
// The chunk holds three.js and loads only when the screen asks for it. No WebGL
// falls back to the 2D silhouette of components/body, with the same list of
// body parts, so the selection still works.

import './body3d.css'

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { BodySilhouette, BODY_ZONES } from '../body'
import type { BodySystem } from '../body/zones'
import type { InjuryKind } from '../../data/painStore'
import type { StatusKind } from '../../icons/meta'
import { bodyRegionGroups, bodyRegionName, bodyRegionSystem, regionsOfSystem } from './regions'
import { BODY_BASE_TOKEN, MARKER_TOKENS, sceneColors, statusColor, systemColor } from './palette'
import { createBodyScene, type BodyScene, type SceneColors, type SceneState } from './scene'
import { bodyWords } from './words'

export interface Body3DMark {
  regionId: string
  kind: InjuryKind
  intensity: number
}

export interface Body3DProps {
  /** `status` lights one system; `pain` selects places. */
  mode: 'status' | 'pain'
  /** System id of the selected indicator, as the icon set names it. */
  system?: string | null
  /** Status of the selected indicator, for the colour of the lit regions. */
  state?: StatusKind | null
  /** Caption under the figure and the accessible name of the canvas. */
  label?: string
  selected?: readonly string[]
  marks?: readonly Body3DMark[]
  /** The app's reduce motion switch. The system setting is read as well. */
  reducedMotion?: boolean
  onSelect?: (regionId: string) => void
}

/** WebGL, once per session: two contexts asked for one is a waste. */
let webglSupport: boolean | null = null
const webglListeners = new Set<() => void>()

function hasWebGL(): boolean {
  if (webglSupport !== null) return webglSupport
  try {
    const probe = document.createElement('canvas')
    const context = probe.getContext('webgl2') ?? probe.getContext('webgl')
    webglSupport = context !== null
    // A browser keeps a few contexts at once; the probe gives its own back, so
    // the real canvas is never the one context too many.
    context?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webglSupport = false
  }
  return webglSupport
}

// The probe can say yes for a context that cannot draw. The first renderer
// that throws settles it for the session, and every figure on screen hears it.
function markWebGLBroken(): void {
  webglSupport = false
  for (const listener of webglListeners) listener()
}

function subscribeWebGL(listener: () => void): () => void {
  webglListeners.add(listener)
  return () => webglListeners.delete(listener)
}

function iconSystem(system: string | null | undefined): BodySystem | null {
  if (system === null || system === undefined) return null
  return (BODY_ZONES as readonly string[]).includes(system) ? (system as BodySystem) : null
}

/** The reduce motion switch of the app, or the one of the operating system. */
function useStillMotion(forced: boolean | undefined): boolean {
  const [systemReduced, setSystemReduced] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = (): void => setSystemReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return forced === true || systemReduced
}

export default function Body3D({
  mode,
  system = null,
  state = null,
  label,
  selected = [],
  marks = [],
  reducedMotion = false,
  onSelect,
}: Body3DProps) {
  const still = useStillMotion(reducedMotion)
  const listId = useId()
  const webgl = useSyncExternalStore<boolean | null>(
    subscribeWebGL,
    hasWebGL,
    () => null,
  )
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoverRef = useRef<HTMLSpanElement>(null)
  const sceneRef = useRef<BodyScene | null>(null)
  const selectRef = useRef<((regionId: string) => void) | null>(null)
  // The ring of a tap: a screen element at the point that was touched, so it
  // reads on top of the figure whatever way the body is turned.
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const rippleId = useRef(0)

  const colors = useMemo<SceneColors>(() => {
    // One palette for both themes: see sceneColors() for the contrast pairs.
    const theme = sceneColors()
    const mark = {} as Record<InjuryKind, string>
    for (const [kind, token] of Object.entries(MARKER_TOKENS)) {
      mark[kind as InjuryKind] = theme[token]
    }
    return {
      // A dark slate: the glow colours of the palette all read on it at 3:1.
      base: theme[BODY_BASE_TOKEN],
      accent: theme['color-accent'],
      muted: theme['color-text-muted'],
      mark,
    }
  }, [])

  const regionSystem = bodyRegionSystem(system)
  const lit = useMemo(
    () =>
      mode === 'status' && regionSystem !== null
        ? regionsOfSystem(regionSystem).map((region) => region.id)
        : [],
    [mode, regionSystem],
  )
  const litColor = useMemo(() => {
    if (state !== null) return statusColor(sceneColors(), state)
    return regionSystem === null
      ? colors.muted
      : systemColor(sceneColors(), regionSystem)
  }, [state, regionSystem, colors.muted])

  const sceneState = useMemo<SceneState>(
    () => ({
      mode,
      lit,
      litColor,
      marks: mode === 'pain' ? marks : [],
      reducedMotion: still,
    }),
    [mode, lit, litColor, marks, still],
  )

  const writeHover = useCallback(
    (name: string | null, at: { x: number; y: number } | null) => {
      const element = hoverRef.current
      if (element === null) return
      if (name === null || at === null) {
        element.hidden = true
        return
      }
      element.hidden = false
      element.textContent = name
      element.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px) translate(-50%, -140%)`
    },
    [],
  )

  const addRipple = useCallback((at: { x: number; y: number }) => {
    rippleId.current += 1
    const id = rippleId.current
    setRipples((list) => [...list, { id, x: at.x, y: at.y }])
  }, [])

  const dropRipple = useCallback((id: number) => {
    setRipples((list) => list.filter((ripple) => ripple.id !== id))
  }, [])

  useEffect(() => {
    selectRef.current = onSelect ?? null
  }, [onSelect])

  const stateRef = useRef(sceneState)
  useEffect(() => {
    stateRef.current = sceneState
    sceneRef.current?.apply(sceneState)
  }, [sceneState])

  useEffect(() => {
    if (webgl !== true) return
    const canvas = canvasRef.current
    if (canvas === null) return
    // A browser can hand out a context and still fail to draw with it (a
    // blocked GPU, a headless browser, a lost driver). The renderer then
    // throws; the figure falls back to the flat body and the page stays up.
    let scene: BodyScene
    try {
      scene = createBodyScene(canvas, colors, {
        onSelect: (regionId) => selectRef.current?.(regionId),
        onHover: writeHover,
        onPulse: addRipple,
      })
    } catch {
      markWebGLBroken()
      return
    }
    sceneRef.current = scene
    scene.apply(stateRef.current)
    return () => {
      sceneRef.current = null
      scene.dispose()
      writeHover(null, null)
    }
  }, [webgl, colors, writeHover, addRipple])

  const announcement =
    selected.length === 0
      ? ''
      : bodyWords.selected(selected.map(bodyRegionName).join(', '))

  // Pain mode: the list of body parts is a way to choose, as first-class as the
  // mesh (an elbow is a few pixels wide on a phone). Status mode has no list:
  // 25 inert names are noise for a screen reader, so only the lit places are
  // named, in text that is visually hidden.
  const list =
    onSelect === undefined ? null : (
      <div className="body3d__parts" role="group" aria-label={bodyWords.regionsLabel}>
        {bodyRegionGroups().map((group) => (
          <section key={group.id} className="body3d__group">
            <h4 id={`${listId}-${group.id}`} className="body3d__group-name">
              {bodyWords.groups[group.id]}
            </h4>
            <ul className="body3d__regions" aria-labelledby={`${listId}-${group.id}`}>
              {group.regions.map((region) => (
                <li key={region.id}>
                  <button
                    type="button"
                    className="body3d__region"
                    aria-pressed={selected.includes(region.id)}
                    onClick={() => onSelect(region.id)}
                  >
                    <span className="body3d__check" aria-hidden="true">
                      ✓
                    </span>
                    {region.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    )
  const litNames = lit.map(bodyRegionName).join(', ')
  const litText =
    mode === 'status' && lit.length > 0 ? (
      <p className="body3d__hint">{bodyWords.lit(litNames)}</p>
    ) : null

  if (webgl === false) {
    return (
      <figure className="body3d body3d--flat" data-mode={mode}>
        <BodySilhouette system={iconSystem(system)} label={label ?? bodyWords.figure} />
        {list}
        {litText}
        <p className="body3d__live" role="status">
          {announcement}
        </p>
        {list !== null && (
          <figcaption className="body3d__note">{bodyWords.noWebgl}</figcaption>
        )}
      </figure>
    )
  }

  return (
    <figure className="body3d" data-mode={mode}>
      <div className="body3d__stage">
        {webgl === true ? (
          <>
            <canvas
              ref={canvasRef}
              className="body3d__canvas"
              role="img"
              aria-label={label ?? bodyWords.figure}
            />
            <span ref={hoverRef} className="body3d__hover" aria-hidden="true" hidden />
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="body3d__pulse"
                aria-hidden="true"
                style={{ transform: `translate(${ripple.x}px, ${ripple.y}px)` }}
                onAnimationEnd={() => dropRipple(ripple.id)}
              />
            ))}
          </>
        ) : null}
      </div>
      {webgl === true ? (
        <div className="body3d__turn">
          <button
            type="button"
            className="body3d__turn-button"
            aria-label={bodyWords.turnLeft}
            onClick={() => sceneRef.current?.orbit(-1)}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            className="body3d__turn-button"
            aria-label={bodyWords.resetView}
            onClick={() => sceneRef.current?.resetView()}
          >
            <span aria-hidden="true">◦</span>
          </button>
          <button
            type="button"
            className="body3d__turn-button"
            aria-label={bodyWords.turnRight}
            onClick={() => sceneRef.current?.orbit(1)}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      ) : null}
      {list}
      {litText}
      <p className="body3d__live" role="status">
        {announcement}
      </p>
      {label !== undefined && <figcaption className="body3d__label">{label}</figcaption>}
    </figure>
  )
}
