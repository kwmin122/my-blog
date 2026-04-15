'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

interface FloatingIslandProps {
  id: string
  position: [number, number, number]
  scale: [number, number, number]
  seed: number
}

export default function FloatingIsland({ id, position, scale, seed }: FloatingIslandProps) {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 12, 8)
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      // Flatten bottom half to create island silhouette
      if (y < 0) pos.setY(i, y * 0.35)
      // Sine wave deformation for irregular top surface
      const wave = Math.sin(pos.getX(i) * seed + pos.getZ(i) * seed * 0.7) * 0.25
      pos.setY(i, pos.getY(i) + wave)
    }
    g.computeVertexNormals()
    return g
  }, [seed])

  return (
    <mesh geometry={geo} position={position} scale={scale} name={id}>
      <meshStandardMaterial color="#c4a882" roughness={0.9} metalness={0.05} />
    </mesh>
  )
}
