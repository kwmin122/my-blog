'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import FloatingIsland from './FloatingIsland'
import SplineIslandProp from './SplineIslandProp'
import WorldMorphScroll from './WorldMorphScroll'
import { tokens } from '@/tokens/tokens'
import CloudSeaSky from '@/shaders/CloudSeaSky'
import { assertLightColor } from '@/lib/colorAudit'
import { Html } from '@react-three/drei'
import RiveSignBoard from './RiveSignBoard'

export default function ArchipelagoScene() {
  const homeMeshRef  = useRef<THREE.Mesh>(null)
  const dirLightRef  = useRef<THREE.DirectionalLight>(null)

  useEffect(() => {
    assertLightColor(tokens.scene.sunlight, 'directionalLight')
    assertLightColor(tokens.scene.sky, 'fog-sky-removed')
  }, [])

  return (
    <>
      <CloudSeaSky />

      {/* WorldMorphScroll runs parallel ST timeline on same #page-content trigger */}
      <WorldMorphScroll meshRef={homeMeshRef} lightRef={dirLightRef} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        ref={dirLightRef}
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

      {/* Floating islands — home island gets morphRef for WorldMorphScroll */}
      <FloatingIsland
        id="home-island"
        position={[0, 0, 0]}
        scale={[4, 1.5, 4]}
        seed={2.3}
        morphRef={homeMeshRef}
      />
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

      {/* Rive sign overlays — INT-01: hover → 'hover' SMIBool true, click → 'activate' SMITrigger.fire() */}
      <Html occlude distanceFactor={10} position={[0, 3.5, 0]} center>
        <RiveSignBoard src="/assets/rive/sign-a.riv" label="홈 섬 표지판" />
      </Html>

      <Html occlude distanceFactor={10} position={[-8, 2.5, 0]} center>
        <RiveSignBoard src="/assets/rive/sign-b.riv" label="샘플 섬 표지판" />
      </Html>

      <Html occlude distanceFactor={10} position={[8, 1.5, 0]} center>
        <RiveSignBoard src="/assets/rive/sign-c.riv" label="공부 섬 표지판" />
      </Html>

      {/* VIS-04: Neutra-isolated objects — confined to home island only.
          userData.style = 'neutra' for scene auditing.
          These three objects are the exclusive hosts of CRT/pixel/Y2K aesthetics. */}

      {/* NeutroSign — retro sign post on home island */}
      <mesh
        name="neutra-sign"
        userData={{ style: 'neutra', name: 'neutra-sign' }}
        position={[1.2, 1.6, 0.5]}
      >
        <boxGeometry args={[0.08, 1.2, 0.08]} />
        {/* 0x2a2a2a — dark charcoal post — neutra-isolated */}
        <meshStandardMaterial color={0x2a2a2a} roughness={0.8} metalness={0.3} />
      </mesh>
      <mesh
        userData={{ style: 'neutra', name: 'neutra-sign-board' }}
        position={[1.2, 2.4, 0.5]}
      >
        <boxGeometry args={[0.7, 0.4, 0.06]} />
        {/* 0x00ff88 approximates accentNeon for pixel-styled sign — neutra-isolated */}
        <meshStandardMaterial color={0x00ff88} roughness={0.3} metalness={0.1} emissive={0x00ff88} emissiveIntensity={0.4} />
      </mesh>

      {/* CRTMonitor — retro CRT monitor shell */}
      <mesh
        name="neutra-crt"
        userData={{ style: 'neutra', name: 'crt-monitor' }}
        position={[-1.5, 1.4, -0.8]}
        rotation={[0, 0.4, 0]}
      >
        <boxGeometry args={[0.7, 0.6, 0.5]} />
        {/* 0x1a1a2e — deep navy CRT shell — neutra-isolated */}
        <meshStandardMaterial color={0x1a1a2e} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh
        userData={{ style: 'neutra', name: 'crt-screen' }}
        position={[-1.5, 1.4, -0.56]}
        rotation={[0, 0.4, 0]}
      >
        <planeGeometry args={[0.5, 0.38]} />
        {/* 0x8eff4f approximates accentNeon oklch(0.82 0.25 140) for CRT glow */}
        <meshStandardMaterial color={0x8eff4f} emissive={0x8eff4f} emissiveIntensity={0.8} roughness={0} metalness={0} />
      </mesh>

      {/* PixelCharacter — low-poly pixel avatar figure */}
      <mesh
        name="neutra-pixel-char"
        userData={{ style: 'neutra', name: 'pixel-character' }}
        position={[0.2, 1.6, -1.2]}
      >
        {/* Head — 0xffd700 gold — neutra-isolated */}
        <boxGeometry args={[0.25, 0.25, 0.25]} />
        <meshStandardMaterial color={0xffd700} roughness={1} metalness={0} />
      </mesh>
      <mesh
        userData={{ style: 'neutra', name: 'pixel-character-body' }}
        position={[0.2, 1.2, -1.2]}
      >
        <boxGeometry args={[0.2, 0.3, 0.15]} />
        {/* 0x4488ff — pixel blue body — neutra-isolated */}
        <meshStandardMaterial color={0x4488ff} roughness={1} metalness={0} />
      </mesh>
    </>
  )
}
