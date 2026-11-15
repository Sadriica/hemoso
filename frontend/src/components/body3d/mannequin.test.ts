import { Box3 } from 'three'
import { describe, expect, it } from 'vitest'
import { buildMannequin } from './mannequin'
import { BODY_REGION_IDS } from './regions'

describe('the mannequin', () => {
  const figure = buildMannequin('#3A4A5E')
  figure.group.updateMatrixWorld(true)

  it('draws every region as its own pickable meshes', () => {
    expect(figure.parts.map((part) => part.regionId)).toEqual(BODY_REGION_IDS)
    for (const part of figure.parts) {
      expect(part.meshes.length).toBeGreaterThan(0)
      for (const mesh of part.meshes) expect(mesh.userData.regionId).toBe(part.regionId)
    }
  })

  it('stands on the floor and is about 7.5 heads tall', () => {
    const box = new Box3().setFromObject(figure.group)
    expect(box.min.y).toBeGreaterThan(-0.01)
    expect(box.min.y).toBeLessThan(0.02)
    expect(box.max.y).toBeGreaterThan(1.7)
    expect(box.max.y).toBeLessThan(1.8)
  })

  it('puts the astronaut left on +X, and the shoulders wider than the thighs', () => {
    const centre = (id: string): number => {
      const part = figure.parts.find((item) => item.regionId === id)
      const box = new Box3()
      for (const mesh of part?.meshes ?? []) box.expandByObject(mesh)
      return (box.min.x + box.max.x) / 2
    }
    expect(centre('left_knee')).toBeGreaterThan(0)
    expect(centre('right_knee')).toBeLessThan(0)
    expect(centre('left_shoulder')).toBeGreaterThan(centre('left_thigh'))
  })

  it('frees its geometry and materials', () => {
    const own = buildMannequin('#3A4A5E')
    const mesh = own.parts[0].meshes[0]
    let freed = 0
    mesh.geometry.addEventListener('dispose', () => (freed += 1))
    own.dispose()
    expect(freed).toBe(1)
    expect(own.group.children).toHaveLength(0)
  })
})
