'use client'

import { useEffect } from 'react'
import FloatingIsland from './FloatingIsland'
import SplineIslandProp from './SplineIslandProp'
import { tokens } from '@/tokens/tokens'
import CloudSeaSky from '@/shaders/CloudSeaSky'
import { assertLightColor } from '@/lib/colorAudit'

export default function ArchipelagoScene() {
  useEffect(() => {
    assertLightColor(tokens.scene.sunlight, 'directionalLight')
    assertLightColor(tokens.scene.sky, 'fog-sky-removed')
  }, [])

  return (
    <>
      <CloudSeaSky />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow={false}
        color={tokens.scene.sunlight}
      />

      {/* Cloud sea plane */}
      <mesh position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial
          color={tokens.scene.cloud}
          transparent
          opacity={0.72}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Floating islands */}
      <FloatingIsland id="home-island"   position={[0,   0,   0]}  scale={[4,   1.5, 4]}   seed={2.3} />
      <FloatingIsland id="sample-island" position={[-8, -1,   0]}  scale={[3,   1.2, 3]}   seed={3.7} />
      <FloatingIsland id="study-island"  position={[8,  -2,   0]}  scale={[2.5, 1,   2.5]} seed={5.1} />

      {/* Spline placeholder props — userData.source = 'spline' tagged in SplineIslandProp */}
      <SplineIslandProp
        path="/assets/raw/island-cottage.glb"
        position={[0, 1.8, 0]}
        scale={[0.6, 0.6, 0.6]}
        name="spline-cottage"
      />
      <SplineIslandProp
        path="/assets/raw/island-tree.glb"
        position={[-8, 0.6, 0]}
        scale={[0.5, 0.5, 0.5]}
        name="spline-tree"
      />
      <SplineIslandProp
        path="/assets/raw/island-arch.glb"
        position={[4, 1.0, -2]}
        scale={[0.7, 0.7, 0.7]}
        name="spline-arch"
      />
    </>
  )
}
