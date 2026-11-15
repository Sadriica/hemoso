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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BodySilhouette, BODY_ZONES } from '../body'
import type { BodySystem } from '../body/zones'
import type { InjuryKind } from '../../data/painStore'
import type { StatusKind } from '../../icons/meta'
import { BODY_REGIONS, bodyRegionName, bodyRegionSystem, regionsOfSystem } from './regions'
import { MARKER_TOKENS, statusColor, systemColor, themeColors } from './palette'
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
  const [webgl] = useState<boolean | null>(() =>
    typeof document === 'undefined' ? null : hasWebGL(),
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
    const theme = themeColors()
    const mark = {} as Record<InjuryKind, string>
    for (const [kind, token] of Object.entries(MARKER_TOKENS)) {
      mark[kind as InjuryKind] = theme[token]
    }
    return {
      // The control-edge step of the palette: a mid slate that keeps its form
      // under the key light in the dark theme and stays clear of the page in
      // the light one. One token, both themes, no second colour.
      base: theme['color-border-control'],
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
    if (state !== null) return statusColor(themeColors(), state)
    return regionSystem === null
      ? colors.muted
      : systemColor(themeColors(), regionSystem)
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
    const scene = createBodyScene(canvas, colors, {
      onSelect: (regionId) => selectRef.current?.(regionId),
      onHover: writeHover,
      onPulse: addRipple,
    })
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

  const list = (
    <ul
      className={`body3d__regions${webgl === true ? ' body3d__regions--sr' : ''}`}
      aria-label={bodyWords.regionsLabel}
    >
      {BODY_REGIONS.map((region) => (
        <li key={region.id}>
          {onSelect === undefined ? (
            <span>{region.name}</span>
          ) : (
            <button
              type="button"
              className="body3d__region"
              aria-pressed={selected.includes(region.id)}
              onClick={() => onSelect(region.id)}
            >
              {region.name}
            </button>
          )}
        </li>
      ))}
    </ul>
  )

  if (webgl === false) {
    return (
      <figure className="body3d body3d--flat" data-mode={mode}>
        <BodySilhouette system={iconSystem(system)} label={label ?? bodyWords.figure} />
        {list}
        <p className="body3d__live" role="status">
          {announcement}
        </p>
        <figcaption className="body3d__note">{bodyWords.noWebgl}</figcaption>
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
      <p className="body3d__live" role="status">
        {announcement}
      </p>
      {label !== undefined && <figcaption className="body3d__label">{label}</figcaption>}
    </figure>
  )
}
