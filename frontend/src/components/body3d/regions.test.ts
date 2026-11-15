import { describe, expect, it } from 'vitest'
import {
  BODY_REGION_IDS,
  BODY_REGION_SYSTEMS,
  BODY_REGIONS,
  bodyRegion,
  bodyRegionName,
  bodyRegionGroups,
  bodyRegionSystem,
  regionsOfSystem,
} from './regions'

// The first layer of the body the team agreed on (docs/DECISIONS.md): zones
// first, then muscles, bones and organs. These are the zones.
const ZONES = [
  'head',
  'neck',
  'chest',
  'upper_back',
  'abdomen',
  'lower_back',
  'pelvis',
]

const LIMBS = [
  'shoulder',
  'upper_arm',
  'elbow',
  'forearm',
  'hand',
  'thigh',
  'knee',
  'shin',
  'foot',
]

const EXPECTED = [
  ...ZONES,
  ...LIMBS.map((part) => `left_${part}`),
  ...LIMBS.map((part) => `right_${part}`),
]

describe('body regions', () => {
  it('has every zone of the first layer exactly once', () => {
    expect([...BODY_REGION_IDS].sort()).toEqual([...EXPECTED].sort())
    expect(new Set(BODY_REGION_IDS).size).toBe(BODY_REGION_IDS.length)
  })

  it('writes ids as lowercase snake_case', () => {
    for (const id of BODY_REGION_IDS) {
      expect(id).toMatch(/^[a-z][a-z0-9_]*$/)
    }
  })

  it('matches the side to the id', () => {
    for (const region of BODY_REGIONS) {
      if (region.id.startsWith('left_')) expect(region.side).toBe('left')
      else if (region.id.startsWith('right_')) expect(region.side).toBe('right')
      else expect(region.side).toBe('center')
    }
  })

  it('names only the systems of FORMATS.md section 2', () => {
    for (const region of BODY_REGIONS) {
      expect(region.systems.length).toBeGreaterThan(0)
      for (const system of region.systems) {
        expect(BODY_REGION_SYSTEMS).toContain(system)
      }
    }
  })

  it('gives every region at least one primitive to draw', () => {
    for (const region of BODY_REGIONS) {
      expect(region.primitives.length).toBeGreaterThan(0)
      for (const primitive of region.primitives) {
        expect(Number.isFinite(primitive.at[1])).toBe(true)
        if (primitive.kind === 'lathe') {
          expect(primitive.profile.length).toBeGreaterThanOrEqual(2)
          for (const [radius, height] of primitive.profile) {
            expect(radius).toBeGreaterThan(0)
            expect(height).toBeGreaterThanOrEqual(0)
          }
        }
        if (primitive.kind === 'capsule') {
          expect(primitive.radius).toBeGreaterThan(0)
          expect(primitive.length).toBeGreaterThan(0)
        }
      }
      // A mark sits on the person, between the floor and the top of the head.
      expect(region.markerAt[1]).toBeGreaterThan(0)
      expect(region.markerAt[1]).toBeLessThan(1.8)
    }
  })

  it('keeps the two sides of a limb the same shape', () => {
    for (const part of LIMBS) {
      const left = bodyRegion(`left_${part}`)
      const right = bodyRegion(`right_${part}`)
      expect(left).not.toBeNull()
      expect(right).not.toBeNull()
      expect(left?.primitives.length).toBe(right?.primitives.length)
      expect(left?.systems).toEqual(right?.systems)
    }
  })

  it('opens a system as its regions', () => {
    const cardio = regionsOfSystem('cardiovascular').map((region) => region.id)
    expect(cardio).toContain('chest')
    expect(cardio).toContain('neck')
    expect(regionsOfSystem('sleep').map((region) => region.id)).toEqual(['head'])
    expect(regionsOfSystem('musculoskeletal')).not.toHaveLength(0)
  })

  it('maps the icon name neuro to the system name of FORMATS.md', () => {
    expect(bodyRegionSystem('neuro')).toBe('neuro_behavioural')
    expect(bodyRegionSystem('neuro_behavioural')).toBe('neuro_behavioural')
    expect(bodyRegionSystem('cardiovascular')).toBe('cardiovascular')
    expect(bodyRegionSystem('unknown')).toBeNull()
    expect(bodyRegionSystem(null)).toBeNull()
  })

  it('names a region, and falls back to the id', () => {
    expect(bodyRegionName('left_knee')).toBe('Left knee')
    expect(bodyRegionName('made_up')).toBe('made_up')
    expect(bodyRegion('left_knee')?.name).toBe('Left knee')
    expect(bodyRegion('made_up')).toBeNull()
  })
})

describe('body region groups', () => {
  it('lists every region once, under head and trunk or one limb', () => {
    const groups = bodyRegionGroups()
    expect(groups.map((group) => group.id)).toEqual([
      'head_trunk',
      'left_arm',
      'right_arm',
      'left_leg',
      'right_leg',
    ])
    expect(groups.flatMap((group) => group.regions)).toHaveLength(BODY_REGIONS.length)
    const byId = Object.fromEntries(
      groups.map((group) => [group.id, group.regions.map((region) => region.id)]),
    )
    expect(byId.head_trunk).toHaveLength(7)
    expect(byId.left_arm).toEqual([
      'left_shoulder',
      'left_upper_arm',
      'left_elbow',
      'left_forearm',
      'left_hand',
    ])
    expect(byId.right_leg).toEqual([
      'right_thigh',
      'right_knee',
      'right_shin',
      'right_foot',
    ])
  })
})
