// The selectable parts of the 3D body: the first layer of the body the team
// agreed on (docs/DECISIONS.md, "The 3D body is built by layers").
//
// One row per region. Each row says three things: the words the astronaut
// reads and hears, the body system the status view groups it under, and the
// shapes that draw it. The shapes are primitive descriptions and not three.js
// objects, so this file is data and the scene builds from it.
//
// Nothing here is a medical statement: a region is a place on a body.

/** The systems of FORMATS.md section 2, the ones the 3D body opens. */
export const BODY_REGION_SYSTEMS = [
  'cardiovascular',
  'respiratory',
  'thermoregulation',
  'sleep',
  'neuro_behavioural',
  'metabolic',
  'musculoskeletal',
  'radiation',
] as const

export type BodyRegionSystem = (typeof BODY_REGION_SYSTEMS)[number]

/** Which side of the body a region sits on. `left` is the astronaut's left (+X). */
export type RegionSide = 'left' | 'right' | 'center'

/** A point in the scene, in metres from the floor. */
export type Vec3 = readonly [number, number, number]

/** Stretch and turn every primitive accepts, applied to the mesh. */
interface Shaped {
  at: Vec3
  /** Stretch on each axis, 1 leaves the shape as it is. */
  scale?: Vec3
  /** Rotation in radians, [x, y, z]. */
  rotation?: Vec3
}

export interface SpherePrimitive extends Shaped {
  kind: 'sphere'
  radius: number
}

export interface CapsulePrimitive extends Shaped {
  kind: 'capsule'
  radius: number
  /** Length of the straight part; the two caps add one radius each. */
  length: number
}

/** A tube that narrows (or widens) along its length: a limb segment. */
export interface TaperPrimitive extends Shaped {
  kind: 'taper'
  /** Radius at the +Y end before the rotation. */
  radiusTop: number
  /** Radius at the -Y end before the rotation. */
  radiusBottom: number
  length: number
}

export interface LathePrimitive extends Shaped {
  kind: 'lathe'
  /** Profile as [radius, height] pairs, from the bottom of the segment up. */
  profile: readonly (readonly [number, number])[]
  /** Arc drawn around the vertical axis, [start, length] in radians from +Z. */
  arc: readonly [number, number]
}

export interface BoxPrimitive extends Shaped {
  kind: 'box'
  /** Full size on each axis. */
  size: Vec3
}

export type Primitive =
  | SpherePrimitive
  | CapsulePrimitive
  | TaperPrimitive
  | LathePrimitive
  | BoxPrimitive

export interface BodyRegion {
  /** Lowercase snake_case id, as FORMATS.md section 2 asks for. */
  id: string
  /** Plain words for the astronaut, sentence case. */
  name: string
  side: RegionSide
  /** The systems this place belongs to in the status view. */
  systems: readonly BodyRegionSystem[]
  /** Where a small marker sits on this region, for the pain and injury marks. */
  markerAt: Vec3
  primitives: readonly Primitive[]
}

// The figure is 1.75 m tall and 7.5 heads high (a head is 0.233 m). Landmarks,
// in metres from the floor: chin 1.515, shoulders 1.385, elbow 1.095, waist
// 1.08, hips 0.92, wrist 0.85, knee 0.49, ankle 0.095. The torso is an
// ellipse that is wider than it is deep, so every torso piece shares one depth
// factor and the pieces meet without a step.

/** Front of the torso: 200 degrees, so the sides are shared with the back. */
const FRONT_ARC: readonly [number, number] = [-3.49 / 2, 3.49]
/** Back of the torso: the rest of the circle, centred behind the person. */
const BACK_ARC: readonly [number, number] = [Math.PI - (2 * Math.PI - 3.49) / 2, 2 * Math.PI - 3.49]
const FULL_ARC: readonly [number, number] = [0, 2 * Math.PI]

/** Depth of the torso as a share of its width. */
const TORSO_DEPTH = 0.76
const TORSO_SCALE: Vec3 = [1, 1, TORSO_DEPTH]

const LIMB_SYSTEMS: readonly BodyRegionSystem[] = ['musculoskeletal']

type Point = readonly [number, number]

/**
 * A tapered tube between two points of the front view, slightly longer than
 * the gap at both ends so the neighbouring joints hide its flat caps.
 */
function segment(
  from: Point,
  to: Point,
  radiusFrom: number,
  radiusTo: number,
  overlap = 0.012,
): TaperPrimitive {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const length = Math.hypot(dx, dy)
  const grow = overlap / length
  return {
    kind: 'taper',
    at: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0],
    // The radius changes along the whole length, so the extra at each end
    // keeps the same slope.
    radiusTop: radiusFrom + (radiusFrom - radiusTo) * grow,
    radiusBottom: radiusTo - (radiusFrom - radiusTo) * grow,
    length: length + 2 * overlap,
    // The first point is above the second: the tube leans out (or in) in the front view.
    rotation: [0, 0, Math.atan2(dx, -dy)],
  }
}

/**
 * The half-width of the torso at each height, in metres: hips 0.173 at 0.90,
 * waist 0.131 at 1.10, chest 0.166 at 1.35, then a dome that closes the top. Every
 * torso piece samples this one curve, so the pieces meet with the same slope and
 * no seam shows where they overlap.
 */
const TORSO_HALF_WIDTH: readonly Point[] = [
  [0.78, 0.012],
  [0.8, 0.1],
  [0.84, 0.146],
  [0.9, 0.168],
  [0.95, 0.165],
  [1.0, 0.153],
  [1.05, 0.141],
  [1.1, 0.134],
  [1.15, 0.137],
  [1.2, 0.141],
  [1.25, 0.154],
  [1.3, 0.163],
  [1.35, 0.166],
  [1.4, 0.152],
  [1.44, 0.12],
  [1.47, 0.07],
  [1.485, 0.012],
]

/** The torso curve at one height, by smooth interpolation between landmarks. */
function torsoWidth(y: number): number {
  const points = TORSO_HALF_WIDTH
  let index = 0
  while (index < points.length - 2 && points[index + 1][0] < y) index += 1
  const [y1, w1] = points[index]
  const [y2, w2] = points[index + 1]
  const before = points[Math.max(0, index - 1)][1]
  const after = points[Math.min(points.length - 1, index + 2)][1]
  const t = Math.min(1, Math.max(0, (y - y1) / (y2 - y1)))
  // Catmull-Rom between the two landmarks.
  return (
    0.5 *
    (2 * w1 +
      (-before + w2) * t +
      (2 * before - 5 * w1 + 4 * w2 - after) * t * t +
      (-before + 3 * w1 - 3 * w2 + after) * t * t * t)
  )
}

/** A lathe profile of the torso from `from` to `to`, a little wider by `grow` once it has risen clear of its start. */
function torsoProfile(from: number, to: number, grow = 0): readonly Point[] {
  const steps = Math.max(2, Math.round((to - from) / 0.025))
  const profile: Point[] = []
  for (let step = 0; step <= steps; step += 1) {
    const y = from + ((to - from) * step) / steps
    // The extra width fades in over the first 3.5 cm, so the piece rises out
    // of the one below it with no ledge.
    const fade = Math.min(1, (y - from) / 0.035)
    profile.push([Math.max(0.012, torsoWidth(y) + grow * fade), y - from])
  }
  return profile
}

/** The arm and leg rows, written once and turned to each side. */
function limb(side: 'left' | 'right'): BodyRegion[] {
  const sign = side === 'left' ? 1 : -1
  const x = (value: number): number => sign * value
  const p = (px: number, py: number): Point => [x(px), py]
  const prefix = side
  const words = side === 'left' ? 'Left' : 'Right'
  /** Mirrors the sign of a turn about the front-view axis. */
  const turn = (angle: number): number => sign * angle

  return [
    {
      id: `${prefix}_shoulder`,
      name: `${words} shoulder`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.18), 1.4, 0.066],
      primitives: [
        // The rounded deltoid.
        { kind: 'sphere', at: [x(0.18), 1.382, 0], radius: 0.06, scale: [1, 1.08, 1.02] },
        // The slope of the trapezius from the neck to the shoulder.
        {
          kind: 'capsule',
          at: [x(0.1075), 1.4575, -0.004],
          radius: 0.03,
          length: 0.085,
          rotation: [0, 0, turn(1.12)],
          scale: [1, 1, 1.4],
        },
      ],
    },
    {
      id: `${prefix}_upper_arm`,
      name: `${words} upper arm`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.215), 1.24, 0.05],
      primitives: [segment(p(0.18, 1.382), p(0.25, 1.094), 0.052, 0.038)],
    },
    {
      id: `${prefix}_elbow`,
      name: `${words} elbow`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.25), 1.094, 0.046],
      primitives: [
        { kind: 'sphere', at: [x(0.25), 1.094, -0.002], radius: 0.038, scale: [1, 1.1, 1.04] },
      ],
    },
    {
      id: `${prefix}_forearm`,
      name: `${words} forearm`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.287), 0.97, 0.04],
      primitives: [segment(p(0.25, 1.094), p(0.32, 0.85), 0.041, 0.027)],
    },
    {
      id: `${prefix}_hand`,
      name: `${words} hand`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.333), 0.77, 0.026],
      primitives: [
        // A mitten, a little flatter than it is wide, angled toward the leg.
        {
          kind: 'sphere',
          at: [x(0.334), 0.768, 0],
          radius: 0.04,
          scale: [0.95, 2.15, 0.5],
          rotation: [0, 0, turn(0.16)],
        },
      ],
    },
    {
      id: `${prefix}_thigh`,
      name: `${words} thigh`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.092), 0.7, 0.08],
      primitives: [segment(p(0.09, 0.9), p(0.092, 0.5), 0.076, 0.054, 0.02)],
    },
    {
      id: `${prefix}_knee`,
      name: `${words} knee`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.092), 0.49, 0.06],
      primitives: [
        { kind: 'sphere', at: [x(0.092), 0.49, 0.004], radius: 0.05, scale: [1, 1.12, 1.06] },
      ],
    },
    {
      id: `${prefix}_shin`,
      name: `${words} shin`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.094), 0.28, 0.048],
      primitives: [
        segment(p(0.092, 0.485), p(0.098, 0.1), 0.05, 0.03),
        // The calf: a little volume on the back of the leg.
        { kind: 'sphere', at: [x(0.094), 0.36, -0.012], radius: 0.046, scale: [0.98, 1.65, 1.05] },
      ],
    },
    {
      id: `${prefix}_foot`,
      name: `${words} foot`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.098), 0.07, 0.11],
      primitives: [
        // The ankle.
        { kind: 'sphere', at: [x(0.098), 0.098, -0.006], radius: 0.034, scale: [1, 1.15, 1] },
        // The heel.
        { kind: 'sphere', at: [x(0.098), 0.042, -0.032], radius: 0.04, scale: [0.95, 1.05, 1] },
        // The foot as a wedge that is high at the heel and low at the toes: a
        // tube along the floor, wide in the front view, flat in height.
        {
          kind: 'taper',
          at: [x(0.099), 0.04, 0.05],
          radiusTop: 0.037,
          radiusBottom: 0.04,
          length: 0.16,
          rotation: [Math.PI / 2 + 0.05, 0, 0],
          scale: [1.15, 1, 0.9],
        },
        // The ball of the foot, rounding the toes.
        { kind: 'sphere', at: [x(0.1), 0.03, 0.128], radius: 0.036, scale: [1.2, 0.85, 1.35] },
      ],
    },
  ]
}

/** Every selectable region, in reading order: head down, then the arms. */
export const BODY_REGIONS: readonly BodyRegion[] = [
  {
    id: 'head',
    name: 'Head',
    side: 'center',
    systems: ['neuro_behavioural', 'sleep', 'thermoregulation'],
    markerAt: [0, 1.665, 0.104],
    primitives: [
      // An ovoid, taller than wide and narrower at the jaw than at the brow, in
      // one piece so no seam crosses the face. Chin at 1.515 m, crown at 1.75 m.
      {
        kind: 'lathe',
        at: [0, 1.515, 0],
        scale: [1.05, 1, 1.12],
        profile: [
          [0.006, 0],
          [0.03, 0.006],
          [0.047, 0.02],
          [0.06, 0.045],
          [0.069, 0.075],
          [0.0765, 0.11],
          [0.079, 0.15],
          [0.0765, 0.19],
          [0.068, 0.215],
          [0.052, 0.2275],
          [0.03, 0.2335],
          [0.006, 0.236],
        ],
        arc: FULL_ARC,
      },
    ],
  },
  {
    id: 'neck',
    name: 'Neck',
    side: 'center',
    systems: ['respiratory', 'cardiovascular'],
    markerAt: [0, 1.47, 0.062],
    primitives: [
      // Narrow at the jaw and wider at the base, where it meets the shoulders.
      {
        kind: 'taper',
        at: [0, 1.48, 0],
        radiusTop: 0.047,
        radiusBottom: 0.062,
        length: 0.13,
        scale: [1, 1, 0.95],
      },
      // The slope from the neck into the shoulders.
      { kind: 'sphere', at: [0, 1.452, -0.004], radius: 0.06, scale: [2.3, 0.62, 1.2] },
    ],
  },
  {
    id: 'chest',
    name: 'Chest',
    side: 'center',
    systems: ['cardiovascular', 'respiratory', 'musculoskeletal'],
    markerAt: [0, 1.27, 0.128],
    primitives: [
      {
        kind: 'lathe',
        at: [0, 1.09, 0],
        scale: TORSO_SCALE,
        profile: torsoProfile(1.09, 1.49, 0.004),
        arc: FRONT_ARC,
      },
    ],
  },
  {
    id: 'upper_back',
    name: 'Upper back',
    side: 'center',
    systems: ['musculoskeletal', 'respiratory'],
    markerAt: [0, 1.27, -0.128],
    primitives: [
      {
        kind: 'lathe',
        at: [0, 1.09, 0],
        scale: TORSO_SCALE,
        profile: torsoProfile(1.09, 1.49, 0.004),
        arc: BACK_ARC,
      },
    ],
  },
  {
    id: 'abdomen',
    name: 'Abdomen',
    side: 'center',
    systems: ['metabolic', 'musculoskeletal'],
    markerAt: [0, 1.03, 0.118],
    primitives: [
      {
        kind: 'lathe',
        at: [0, 0.96, 0],
        scale: TORSO_SCALE,
        profile: torsoProfile(0.96, 1.13, 0.0015),
        arc: FRONT_ARC,
      },
    ],
  },
  {
    id: 'lower_back',
    name: 'Lower back',
    side: 'center',
    systems: ['musculoskeletal'],
    markerAt: [0, 1.03, -0.118],
    primitives: [
      {
        kind: 'lathe',
        at: [0, 0.96, 0],
        scale: TORSO_SCALE,
        profile: torsoProfile(0.96, 1.13, 0.0015),
        arc: BACK_ARC,
      },
    ],
  },
  {
    id: 'pelvis',
    name: 'Pelvis',
    side: 'center',
    systems: ['musculoskeletal', 'metabolic'],
    markerAt: [0, 0.9, 0.14],
    primitives: [
      {
        kind: 'lathe',
        at: [0, 0.78, 0],
        scale: TORSO_SCALE,
        profile: torsoProfile(0.78, 1.01, -0.001),
        arc: FULL_ARC,
      },
    ],
  },
  ...limb('left'),
  ...limb('right'),
]

/** Every region id, for the stores and the tests. */
export const BODY_REGION_IDS: readonly string[] = BODY_REGIONS.map(
  (region) => region.id,
)

const BY_ID = new Map(BODY_REGIONS.map((region) => [region.id, region]))

/** The region with this id, or null when the id is not one of ours. */
export function bodyRegion(id: string): BodyRegion | null {
  return BY_ID.get(id) ?? null
}

/** The plain name of a region id; the id itself when it is unknown. */
export function bodyRegionName(id: string): string {
  return BY_ID.get(id)?.name ?? id
}

/**
 * The FORMATS.md system of an id the rest of the app uses, or null when it is
 * not a system we know. The icons and the indicator files name one system
 * `neuro`; FORMATS.md section 2 names it `neuro_behavioural`, so one alias
 * lives here.
 */
export function bodyRegionSystem(id: string | null): BodyRegionSystem | null {
  if (id === null) return null
  if (id === 'neuro') return 'neuro_behavioural'
  return (BODY_REGION_SYSTEMS as readonly string[]).includes(id)
    ? (id as BodyRegionSystem)
    : null
}

/** The regions that belong to one system, in reading order. */
export function regionsOfSystem(system: BodyRegionSystem): BodyRegion[] {
  return BODY_REGIONS.filter((region) => region.systems.includes(system))
}

export const BODY_GROUP_IDS = [
  'head_trunk',
  'left_arm',
  'right_arm',
  'left_leg',
  'right_leg',
] as const

export type BodyGroupId = (typeof BODY_GROUP_IDS)[number]

const ARM_PARTS = ['shoulder', 'upper_arm', 'elbow', 'forearm', 'hand']

/** The group a region is listed under: the centre line, or one limb. */
export function bodyRegionGroup(region: BodyRegion): BodyGroupId {
  if (region.side === 'center') return 'head_trunk'
  const part = region.id.slice(region.side.length + 1)
  const limb = ARM_PARTS.includes(part) ? 'arm' : 'leg'
  return `${region.side}_${limb}`
}

/** Every region under its group, in the order the figure reads, top down. */
export function bodyRegionGroups(): { id: BodyGroupId; regions: BodyRegion[] }[] {
  return BODY_GROUP_IDS.map((id) => ({
    id,
    regions: BODY_REGIONS.filter((region) => bodyRegionGroup(region) === id),
  }))
}
