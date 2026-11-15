// The WebGL side of the body: renderer, lights, pointer control, the glow of
// each region, the pulse ring, and the camera easing. React owns the state and
// calls `apply`; this file owns everything three.js and nothing else.
//
// Motion rules are DESIGN.md section 7: a change of state animates in 150 to
// 400 ms, the idle turn stops on the first interaction, and under reduced
// motion only the colour changes.
//
// Frames are asked for, never run forever: `step` returns whether the frame it
// just drew still moved, and frame.ts stops the loop when nothing does. A
// state change, a resize, a hover or an input draws once and lets the motion
// that follows keep the loop alive; a hidden page draws nothing.

import {
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  Raycaster,
  RingGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  WebGLRenderer,
  type BufferGeometry,
} from 'three'
import { bodyRegion } from './regions'
import { sceneColors } from './palette'
import { buildMannequin } from './mannequin'
import { createFrameLoop } from './frame'
import type { InjuryKind } from '../../data/painStore'

export type SceneMode = 'status' | 'pain'

export interface SceneMark {
  regionId: string
  kind: InjuryKind
  /** 0 to 10, the scale the picker shows. */
  intensity: number
}

export interface SceneState {
  mode: SceneMode
  /** Region ids lit by the status view. */
  lit: readonly string[]
  /** Colour of the lit regions: the state colour when there is one. */
  litColor: string
  marks: readonly SceneMark[]
  reducedMotion: boolean
}

export interface SceneColors {
  /** The body itself. */
  base: string
  accent: string
  muted: string
  /** Colour of each kind of mark. */
  mark: Record<InjuryKind, string>
}

export interface BodyScene {
  /** Applies the React state; cheap, it only stores values. */
  apply(state: SceneState): void
  /** Turns the body a third of a turn. Direction -1 is left, 1 is right. */
  orbit(direction: number): void
  resetView(): void
  dispose(): void
}

export interface SceneCallbacks {
  onSelect(regionId: string): void
  /** The region under the pointer, or null; the position is in canvas pixels. */
  onHover(name: string | null, at: { x: number; y: number } | null): void
  /** A tap, in canvas pixels: the screen ring that shows where it landed. */
  onPulse(at: { x: number; y: number }): void
}

const IDLE_TURN = 0.16 // radians per second
const BUTTON_TURN = Math.PI / 3
const HOME = { distance: 3.5, y: 0.93 }
const FOCUS_DISTANCE = 2.8
const ZOOM_MIN = 2
const ZOOM_MAX = 4.6
/** A pointer that moved less than this is a tap, not a drag. */
const TAP_SLOP = 8
const CAMERA_EASE = 0.4
const GLOW_EASE = 0.25
/**
 * Below these the picture is at rest: one more frame would not change a pixel,
 * so the loop stops. The angle is a thirtieth of a degree, the view is about
 * two thousandths of a world unit, the colours are in the 0 to 1 of three.js.
 */
const REST_ANGLE = 0.0005
const REST_VIEW = 0.002
const REST_COLOR = 0.002
const REST_GLOW = 0.004
/** The four numbers the camera eases, in the order of the frame loop. */
const VIEW_AXES = ['distance', 'x', 'y', 'z'] as const

const MARKER_GEOMETRY: Record<InjuryKind, () => BufferGeometry> = {
  pain: () => new SphereGeometry(0.026, 12, 10),
  swelling: () => new TorusGeometry(0.03, 0.009, 6, 16),
  bruise: () => new OctahedronGeometry(0.03),
  cut_or_scrape: () => new BoxGeometry(0.05, 0.01, 0.05),
  burn: () => new ConeGeometry(0.026, 0.045, 10),
  sprain_or_strain: () => new CylinderGeometry(0.024, 0.024, 0.03, 10),
}

export function createBodyScene(
  canvas: HTMLCanvasElement,
  colors: SceneColors,
  callbacks: SceneCallbacks,
): BodyScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

  // Two tones the caller does not pass: the figure always uses the dark set.
  const tones = sceneColors()
  const scene = new Scene()
  const camera = new PerspectiveCamera(34, 1, 0.1, 20)

  // Four lights give the figure its depth without a texture or a shadow map.
  // A soft sky and ground keep every side readable, a warm key from the front
  // right models the form, and two cool lights from behind left and right graze
  // the edges, so the outline is a bright line against the stage whichever way
  // the body is turned.
  scene.add(new HemisphereLight(new Color(colors.muted), new Color(tones['color-border-control']), 2.6))
  const key = new DirectionalLight(new Color(tones['color-text']), 3.4)
  key.position.set(1.6, 2.8, 2.4)
  scene.add(key)
  const fill = new DirectionalLight(new Color(colors.muted), 1.1)
  fill.position.set(-1.8, 1.0, 2.0)
  scene.add(fill)
  for (const side of [-1, 1]) {
    const rim = new DirectionalLight(new Color(colors.accent), 5)
    rim.position.set(side * 3, 1.6, -1.6)
    scene.add(rim)
  }

  // A pad under the feet: the body tone seen as a soft shadow on the light
  // stage and a lighter floor on the dark one, with a thin ring of the accent.
  const floorGeometries = [new CircleGeometry(0.42, 40), new RingGeometry(0.4, 0.425, 48)]
  const floorMaterials = [
    new MeshBasicMaterial({ color: new Color(colors.base), transparent: true, opacity: 0.45, depthWrite: false }),
    new MeshBasicMaterial({ color: new Color(colors.accent), transparent: true, opacity: 0.55, depthWrite: false }),
  ]
  for (const [index, geometry] of floorGeometries.entries()) {
    const floor = new Mesh(geometry, floorMaterials[index])
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0.001 + index * 0.001
    scene.add(floor)
  }

  const pivot = new Group()
  scene.add(pivot)
  const mannequin = buildMannequin(colors.base)
  pivot.add(mannequin.group)
  const markerGroup = new Group()
  pivot.add(markerGroup)

  const raycaster = new Raycaster()
  const pointer = new Vector2()
  const pointers = new Map<number, { x: number; y: number }>()

  let state: SceneState = { mode: 'status', lit: [], litColor: colors.accent, marks: [], reducedMotion: false }
  let markSignature = ''

  let yaw = 0
  let goalYaw = 0
  let pitch = 0
  let goalPitch = 0
  let interacted = false
  let dragging = false
  let dragStart = { x: 0, y: 0 }
  let dragMoved = 0
  let hovered: string | null = null
  let pinchDistance = 0

  const viewNow = { distance: HOME.distance, x: 0, y: HOME.y, z: 0 }
  const viewGoal = { distance: HOME.distance, x: 0, y: HOME.y, z: 0 }

  function resize(): void {
    const width = canvas.clientWidth || 320
    const height = canvas.clientHeight || 480
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    loop.request()
  }

  function regionAt(clientX: number, clientY: number): string | null {
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(mannequin.group.children, false)[0]
    const id = hit?.object.userData.regionId
    return typeof id === 'string' ? id : null
  }

  function toCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function tap(clientX: number, clientY: number): void {
    if (state.reducedMotion) return
    callbacks.onPulse(toCanvasPoint(clientX, clientY))
  }

  function select(regionId: string): void {
    interacted = true
    callbacks.onSelect(regionId)
    const region = bodyRegion(regionId)
    if (region !== null) {
      viewGoal.x = 0
      viewGoal.y = Math.min(1.45, Math.max(0.35, region.markerAt[1]))
      viewGoal.z = 0
      viewGoal.distance = FOCUS_DISTANCE
    }
    loop.request()
  }

  function onPointerDown(event: PointerEvent): void {
    interacted = true
    loop.request()
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y)
      dragging = false
      return
    }
    dragging = true
    dragMoved = 0
    dragStart = { x: event.clientX, y: event.clientY }
    canvas.setPointerCapture?.(event.pointerId)
  }

  function onPointerMove(event: PointerEvent): void {
    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      const next = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchDistance > 0) {
        viewGoal.distance = clampZoom(viewGoal.distance - (next - pinchDistance) * 0.01)
        loop.request()
      }
      pinchDistance = next
      return
    }
    if (dragging) {
      const dx = event.clientX - dragStart.x
      const dy = event.clientY - dragStart.y
      dragMoved = Math.max(dragMoved, Math.hypot(dx, dy))
      dragStart = { x: event.clientX, y: event.clientY }
      goalYaw += dx * 0.009
      goalPitch = Math.max(-0.35, Math.min(0.35, goalPitch + dy * 0.005))
      loop.request()
      return
    }
    const id = regionAt(event.clientX, event.clientY)
    if (id !== hovered) {
      hovered = id
      canvas.style.cursor = id === null ? 'grab' : 'pointer'
      loop.request()
    }
    callbacks.onHover(id === null ? null : bodyRegion(id)?.name ?? id, toCanvasPoint(event.clientX, event.clientY))
  }

  function onPointerUp(event: PointerEvent): void {
    pointers.delete(event.pointerId)
    if (pointers.size < 2) pinchDistance = 0
    const wasDragging = dragging
    dragging = false
    if (!wasDragging || dragMoved > TAP_SLOP) return
    const id = regionAt(event.clientX, event.clientY)
    if (id === null) return
    tap(event.clientX, event.clientY)
    hovered = id
    select(id)
  }

  function onPointerLeave(): void {
    hovered = null
    loop.request()
    callbacks.onHover(null, null)
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault()
    interacted = true
    viewGoal.distance = clampZoom(viewGoal.distance + event.deltaY * 0.0015)
    loop.request()
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('pointerleave', onPointerLeave)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  function clampZoom(value: number): number {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))
  }

  function rebuildMarkers(): void {
    const signature = state.marks
      .map((mark) => `${mark.regionId}:${mark.kind}:${mark.intensity}`)
      .join('|')
    if (signature === markSignature) return
    markSignature = signature
    for (const child of [...markerGroup.children]) {
      markerGroup.remove(child)
      const mesh = child as Mesh<BufferGeometry, MeshBasicMaterial>
      mesh.geometry.dispose()
      mesh.material.dispose()
    }
    for (const mark of state.marks) {
      const region = bodyRegion(mark.regionId)
      if (region === null) continue
      const mesh = new Mesh(
        MARKER_GEOMETRY[mark.kind](),
        new MeshBasicMaterial({ color: new Color(colors.mark[mark.kind]) }),
      )
      mesh.position.set(region.markerAt[0], region.markerAt[1], region.markerAt[2])
      markerGroup.add(mesh)
    }
  }

  // Colours and lookups for the paint loop, replaced on apply() and never in
  // the frame, so a frame allocates nothing.
  const accentColor = new Color(colors.accent)
  const mutedColor = new Color(colors.muted)
  const baseColor = new Color(colors.base)
  const litColor = new Color(colors.accent)
  const markColor = new Color()
  let litSet = new Set<string>()
  let marksById = new Map<string, SceneMark>()

  /** Paints the glow of every region; true while a colour still eases. */
  function paintRegions(dt: number): boolean {
    const step = state.reducedMotion ? 1 : 1 - Math.exp(-dt / GLOW_EASE)
    let moving = false
    for (const part of mannequin.parts) {
      const material = mannequin.materials.get(part.regionId)
      if (material === undefined) continue
      const mark = state.mode === 'pain' ? marksById.get(part.regionId) : undefined
      let color = baseColor
      let intensity = 0
      if (mark !== undefined) {
        // Low is muted, 10 is the accent: the strength is the fill of the colour.
        color = markColor.copy(mutedColor).lerp(accentColor, mark.intensity / 10)
        intensity = 0.18 + 0.55 * (mark.intensity / 10)
      } else if (litSet.has(part.regionId)) {
        color = litColor
        intensity = 0.62
      } else if (hovered === part.regionId) {
        color = accentColor
        intensity = 0.3
      }
      material.emissive.lerp(color, step)
      material.emissiveIntensity += (intensity - material.emissiveIntensity) * step
      if (
        Math.abs(intensity - material.emissiveIntensity) > REST_GLOW ||
        Math.abs(color.r - material.emissive.r) > REST_COLOR ||
        Math.abs(color.g - material.emissive.g) > REST_COLOR ||
        Math.abs(color.b - material.emissive.b) > REST_COLOR
      ) {
        moving = true
      }
    }
    return moving
  }

  /** One frame of `dt` seconds; true while the picture still moves. */
  function step(dt: number): boolean {
    if (!interacted && !state.reducedMotion) goalYaw += IDLE_TURN * dt
    const turnStep = state.reducedMotion ? 1 : 1 - Math.exp(-dt / 0.12)
    yaw += (goalYaw - yaw) * turnStep
    pitch += (goalPitch - pitch) * turnStep
    pivot.rotation.set(pitch, yaw, 0)

    const viewStep = state.reducedMotion ? 1 : 1 - Math.exp(-dt / CAMERA_EASE)
    for (const axis of VIEW_AXES) {
      viewNow[axis] += (viewGoal[axis] - viewNow[axis]) * viewStep
    }
    camera.position.set(viewNow.x, viewNow.y + 0.02, viewNow.distance)
    camera.lookAt(viewNow.x, viewNow.y, viewNow.z)

    const glowMoving = paintRegions(dt)
    renderer.render(scene, camera)

    // The idle turn never arrives, so it keeps the loop; every other motion
    // ends one frame after it reaches its goal.
    return (
      (!interacted && !state.reducedMotion) ||
      Math.abs(goalYaw - yaw) > REST_ANGLE ||
      Math.abs(goalPitch - pitch) > REST_ANGLE ||
      VIEW_AXES.some((axis) => Math.abs(viewGoal[axis] - viewNow[axis]) > REST_VIEW) ||
      glowMoving
    )
  }

  const loop = createFrameLoop(step, {
    request: (callback) => requestAnimationFrame(callback),
    cancel: (handle) => cancelAnimationFrame(handle),
    hidden: () => document.hidden,
    listenVisibility: (listener) => {
      document.addEventListener('visibilitychange', listener)
      return () => document.removeEventListener('visibilitychange', listener)
    },
  })

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  return {
    apply(next: SceneState) {
      state = next
      litSet = new Set(next.lit)
      marksById = new Map(next.marks.map((mark) => [mark.regionId, mark]))
      litColor.set(next.litColor)
      rebuildMarkers()
      loop.request()
    },
    orbit(direction: number) {
      interacted = true
      goalYaw += direction * BUTTON_TURN
      loop.request()
    },
    resetView() {
      interacted = true
      goalYaw = 0
      yaw = 0
      goalPitch = 0
      viewGoal.distance = HOME.distance
      viewGoal.x = 0
      viewGoal.y = HOME.y
      viewGoal.z = 0
      loop.request()
    },
    dispose() {
      loop.dispose()
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('wheel', onWheel)
      for (const child of [...markerGroup.children]) {
        const mesh = child as Mesh<BufferGeometry, MeshBasicMaterial>
        mesh.geometry.dispose()
        mesh.material.dispose()
      }
      markerGroup.clear()
      mannequin.dispose()
      for (const geometry of floorGeometries) geometry.dispose()
      for (const material of floorMaterials) material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
