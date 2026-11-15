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

export interface SpherePrimitive {
  kind: 'sphere'
  at: Vec3
  radius: number
  /** Stretch of the sphere on each axis, 1 leaves it round. */
  scale?: Vec3
}

export interface CapsulePrimitive {
  kind: 'capsule'
  at: Vec3
  radius: number
  /** Length of the straight part; the two caps add one radius each. */
  length: number
  /** Rotation in radians, [x, y, z]. */
  rotation?: Vec3
}

export interface LathePrimitive {
  kind: 'lathe'
  at: Vec3
  /** Profile as [radius, height] pairs, from the bottom of the segment up. */
  profile: readonly (readonly [number, number])[]
  /** Arc drawn around the vertical axis, [start, length] in radians from +Z. */
  arc: readonly [number, number]
}

export interface BoxPrimitive {
  kind: 'box'
  at: Vec3
  /** Full size on each axis. */
  size: Vec3
}

export type Primitive = SpherePrimitive | CapsulePrimitive | LathePrimitive | BoxPrimitive

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

/** Front of the torso: 200 degrees, so the sides are shared with the back. */
const FRONT_ARC: readonly [number, number] = [-3.49 / 2, 3.49]
/** Back of the torso: the rest of the circle, centred behind the person. */
const BACK_ARC: readonly [number, number] = [Math.PI - (2 * Math.PI - 3.49) / 2, 2 * Math.PI - 3.49]

const LIMB_SYSTEMS: readonly BodyRegionSystem[] = ['musculoskeletal']

/** The arm and leg rows, written once and turned to each side. */
function limb(
  side: 'left' | 'right',
): BodyRegion[] {
  const sign = side === 'left' ? 1 : -1
  const x = (value: number): number => sign * value
  const prefix = side
  const words = side === 'left' ? 'Left' : 'Right'

  return [
    {
      id: `${prefix}_shoulder`,
      name: `${words} shoulder`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.175), 1.39, 0.06],
      primitives: [{ kind: 'sphere', at: [x(0.175), 1.383, 0], radius: 0.075 }],
    },
    {
      id: `${prefix}_upper_arm`,
      name: `${words} upper arm`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.203), 1.25, 0.05],
      primitives: [
        {
          kind: 'capsule',
          at: [x(0.203), 1.243, 0],
          radius: 0.047,
          length: 0.2,
          rotation: [0, 0, sign * 0.174],
        },
      ],
    },
    {
      id: `${prefix}_elbow`,
      name: `${words} elbow`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.228), 1.1, 0.05],
      primitives: [{ kind: 'sphere', at: [x(0.228), 1.1, 0], radius: 0.045 }],
    },
    {
      id: `${prefix}_forearm`,
      name: `${words} forearm`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.243), 1.0, 0.05],
      primitives: [
        {
          kind: 'capsule',
          at: [x(0.243), 1.0, 0],
          radius: 0.039,
          length: 0.165,
          rotation: [0, 0, sign * 0.17],
        },
      ],
    },
    {
      id: `${prefix}_hand`,
      name: `${words} hand`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.258), 0.85, 0.05],
      primitives: [
        {
          kind: 'sphere',
          at: [x(0.258), 0.845, 0],
          radius: 0.05,
          scale: [0.85, 1.5, 0.5],
        },
      ],
    },
    {
      id: `${prefix}_thigh`,
      name: `${words} thigh`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.085), 0.62, 0.08],
      primitives: [
        { kind: 'capsule', at: [x(0.085), 0.615, 0], radius: 0.068, length: 0.26 },
      ],
    },
    {
      id: `${prefix}_knee`,
      name: `${words} knee`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.085), 0.435, 0.07],
      primitives: [{ kind: 'sphere', at: [x(0.085), 0.435, 0], radius: 0.057 }],
    },
    {
      id: `${prefix}_shin`,
      name: `${words} shin`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.085), 0.27, 0.06],
      primitives: [
        { kind: 'capsule', at: [x(0.085), 0.27, 0], radius: 0.049, length: 0.235 },
      ],
    },
    {
      id: `${prefix}_foot`,
      name: `${words} foot`,
      side,
      systems: LIMB_SYSTEMS,
      markerAt: [x(0.085), 0.06, 0.14],
      primitives: [{ kind: 'box', at: [x(0.085), 0.06, 0.045], size: [0.085, 0.07, 0.19] }],
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
    markerAt: [0, 1.62, 0.12],
    primitives: [
      {
        kind: 'sphere',
        at: [0, 1.6, 0],
        radius: 0.105,
        scale: [1, 1.15, 1.02],
      },
    ],
  },
  {
    id: 'neck',
    name: 'Neck',
    side: 'center',
    systems: ['respiratory', 'cardiovascular'],
    markerAt: [0, 1.47, 0.07],
    primitives: [{ kind: 'capsule', at: [0, 1.462, 0], radius: 0.052, length: 0.055 }],
  },
  {
    id: 'chest',
    name: 'Chest',
    side: 'center',
    systems: ['cardiovascular', 'respiratory', 'musculoskeletal'],
    markerAt: [0, 1.28, 0.19],
    primitives: [
      {
        kind: 'lathe',
        at: [0, 1.1, 0],
        profile: [
          [0.146, 0],
          [0.176, 0.12],
          [0.19, 0.24],
          [0.166, 0.31],
        ],
        arc: FRONT_ARC,
      },
    ],
  },
  {
    id: 'upper_back',
    name: 'Upper back',
    side: 'center',
    systems: ['musculoskeletal', 'respiratory'],
    markerAt: [0, 1.28, -0.19],
    primitives: [
      {
        kind: 'lathe',
        at: [0, 1.1, 0],
        profile: [
          [0.149, 0],
          [0.179, 0.12],
          [0.193, 0.24],
          [0.169, 0.31],
        ],
        arc: BACK_ARC,
      },
    ],
  },
  {
    id: 'abdomen',
    name: 'Abdomen',
    side: 'center',
    systems: ['metabolic', 'musculoskeletal'],
    markerAt: [0, 1.04, 0.16],
    primitives: [
      {
        kind: 'lathe',
        at: [0, 0.98, 0],
        profile: [
          [0.157, 0],
          [0.146, 0.06],
          [0.144, 0.12],
        ],
        arc: FRONT_ARC,
      },
    ],
  },
  {
    id: 'lower_back',
    name: 'Lower back',
    side: 'center',
    systems: ['musculoskeletal'],
    markerAt: [0, 1.04, -0.16],
    primitives: [
      {
        kind: 'lathe',
        at: [0, 0.98, 0],
        profile: [
          [0.16, 0],
          [0.149, 0.06],
          [0.147, 0.12],
        ],
        arc: BACK_ARC,
      },
    ],
  },
  {
    id: 'pelvis',
    name: 'Pelvis',
    side: 'center',
    systems: ['musculoskeletal', 'metabolic'],
    markerAt: [0, 0.88, 0.17],
    primitives: [
      {
        kind: 'lathe',
        at: [0, 0.8, 0],
        profile: [
          [0.155, 0],
          [0.176, 0.09],
          [0.168, 0.13],
          [0.157, 0.18],
        ],
        arc: [0, 2 * Math.PI],
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
