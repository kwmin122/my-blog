'use client'

import { useGLTF } from '@react-three/drei'
import { useMemo, useEffect } from 'react'
import type * as THREE from 'three'

interface SplineIslandPropProps {
  path: string
  position: [number, number, number]
  scale?: [number, number, number]
  name: string
}

export default function SplineIslandProp({ path, position, scale = [1, 1, 1], name }: SplineIslandPropProps) {
  const { scene } = useGLTF(path)
  // Clone so multiple instances do not share the same scene graph
  const clone = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    clone.traverse((obj: THREE.Object3D) => {
      obj.userData.source = 'spline'
    })
  }, [clone])

  return <primitive object={clone} position={position} scale={scale} name={name} />
}

// Preload at module evaluation time — avoids waterfall on first render
useGLTF.preload('/assets/raw/island-cottage.glb')
useGLTF.preload('/assets/raw/island-tree.glb')
useGLTF.preload('/assets/raw/island-arch.glb')
