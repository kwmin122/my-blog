'use client'

import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three/webgpu'
import { Fn, uniform, vec4, float, normalize, mix, smoothstep, sin, time, positionWorld, cameraPosition } from 'three/tsl'
import { tokens } from '@/tokens/tokens'

export default function CloudSeaSky() {
  const meshRef = useRef<THREE.Mesh>(null)

  const mat = useMemo(() => {
    const material = new THREE.NodeMaterial()

    // Uniforms for sky colors
    const zenithColor  = uniform(new THREE.Color(0x0a1628))
    const horizonColor = uniform(new THREE.Color(tokens.scene.sky))

    // TSL colorNode: compute horizon gradient based on world elevation angle
    const skyColorFn = Fn(() => {
      // Normalized direction from camera towards fragment (camera-relative, not world-fixed)
      const dir = normalize(positionWorld.sub(cameraPosition))

      // elevation: y component of normalized position
      // smoothstep maps [−0.1, 0.35] → [0, 1] (horizon → zenith)
      const elevation = dir.y

      // Add slow animated shimmer band near horizon via sin(time * 0.3)
      const shimmer = sin(time.mul(0.3)).mul(0.04)

      const t = smoothstep(float(-0.1).add(shimmer), float(0.35), elevation)

      return mix(
        vec4(horizonColor.r, horizonColor.g, horizonColor.b, float(1.0)),
        vec4(zenithColor.r, zenithColor.g, zenithColor.b, float(1.0)),
        t,
      )
    })

    material.colorNode = skyColorFn()
    material.side = THREE.BackSide
    material.depthWrite = false

    return material
  }, [])

  useEffect(() => () => { mat.dispose() }, [mat])

  return (
    <mesh ref={meshRef} scale={[500, 500, 500]}>
      <sphereGeometry args={[1, 32, 16]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}
