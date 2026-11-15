// The mannequin: the region data of regions.ts turned into three.js objects.
// Every region gets its own material, so one place on the body lights without
// touching its neighbours. No model file and no texture: spheres stretched into
// ovoids, tapered tubes for the limbs, capsules and rounded segments of a lathe.

import {
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector2,
  type BufferGeometry,
} from 'three'
import { BODY_REGIONS, type Primitive } from './regions'

export interface MannequinPart {
  regionId: string
  meshes: Mesh<BufferGeometry, MeshStandardMaterial>[]
}

export interface Mannequin {
  group: Group
  parts: readonly MannequinPart[]
  materials: ReadonlyMap<string, MeshStandardMaterial>
  dispose(): void
}

// Low poly on purpose: 16 to 24 segments keeps the figure smooth on a phone and
// the second chunk small.
const RADIAL = 16
const LATHE_SEGMENTS = 20

function geometryFor(primitive: Primitive): BufferGeometry {
  switch (primitive.kind) {
    case 'sphere':
      return new SphereGeometry(primitive.radius, RADIAL, RADIAL * 0.75)
    case 'capsule':
      return new CapsuleGeometry(primitive.radius, primitive.length, 4, RADIAL)
    case 'lathe':
      return new LatheGeometry(
        primitive.profile.map(([radius, height]) => new Vector2(radius, height)),
        LATHE_SEGMENTS,
        primitive.arc[0],
        primitive.arc[1],
      )
    case 'taper':
      return new CylinderGeometry(primitive.radiusTop, primitive.radiusBottom, primitive.length, RADIAL, 1)
    case 'box':
      return new BoxGeometry(primitive.size[0], primitive.size[1], primitive.size[2])
  }
}

/**
 * Builds the figure in `baseColor` with no glow anywhere. The caller drives
 * the glow of each region through `materials`.
 */
export function buildMannequin(baseColor: string): Mannequin {
  const group = new Group()
  const parts: MannequinPart[] = []
  const materials = new Map<string, MeshStandardMaterial>()
  const geometries: BufferGeometry[] = []

  for (const region of BODY_REGIONS) {
    const material = new MeshStandardMaterial({
      color: baseColor,
      roughness: 0.42,
      metalness: 0,
      emissive: baseColor,
      emissiveIntensity: 0,
    })
    materials.set(region.id, material)
    const meshes: Mesh<BufferGeometry, MeshStandardMaterial>[] = []
    for (const primitive of region.primitives) {
      const geometry = geometryFor(primitive)
      geometries.push(geometry)
      const mesh = new Mesh(geometry, material)
      mesh.position.set(primitive.at[0], primitive.at[1], primitive.at[2])
      if (primitive.scale) {
        mesh.scale.set(primitive.scale[0], primitive.scale[1], primitive.scale[2])
      }
      if (primitive.rotation) {
        mesh.rotation.set(
          primitive.rotation[0],
          primitive.rotation[1],
          primitive.rotation[2],
        )
      }
      mesh.userData.regionId = region.id
      group.add(mesh)
      meshes.push(mesh)
    }
    parts.push({ regionId: region.id, meshes })
  }

  return {
    group,
    parts,
    materials,
    dispose() {
      for (const geometry of geometries) geometry.dispose()
      for (const material of materials.values()) material.dispose()
      group.clear()
    },
  }
}
