'use client'

import React, { useMemo } from 'react'
import * as THREE from 'three'
import { tokens } from '@/tokens/tokens'

interface FloatingIslandProps {
  id: string
  position: [number, number, number]
  scale: [number, number, number]
  seed: number
  morphRef?: React.Ref<THREE.Mesh>  // optional external ref for WorldMorphScroll
}

export default function FloatingIsland({ id, position, scale, seed, morphRef }: FloatingIslandProps) {
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

    // Morph target: squash island to flat disk (morphTargetInfluences[0])
    const posAttr = g.attributes.position as THREE.BufferAttribute
    const morphArr = new Float32Array(posAttr.array.length)
    for (let i = 0; i < posAttr.count; i++) {
      morphArr[i * 3 + 0] = posAttr.getX(i)
      morphArr[i * 3 + 1] = posAttr.getY(i) * 0.4  // squash to flat disk
      morphArr[i * 3 + 2] = posAttr.getZ(i)
    }
    g.morphAttributes.position = [new THREE.Float32BufferAttribute(morphArr, 3)]
    g.morphTargetsRelative = false

    return g
  }, [seed])

  return (
    <mesh ref={morphRef} geometry={geo} position={position} scale={scale} name={id}>
      <meshStandardMaterial color={tokens.scene.islandSand} roughness={0.9} metalness={0.05} />
    </mesh>
  )
}
