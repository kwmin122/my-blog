'use client'

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { extend } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import WorldScene from './WorldScene'

// Register three/webgpu classes with R3F's JSX catalog
// eslint-disable-next-line @typescript-eslint/no-explicit-any
extend(THREE as any)

type RendererMode = 'webgpu' | 'webgl2' | 'poster'

function detectMode(): RendererMode {
  if (typeof navigator === 'undefined') return 'poster'
  // Check WebGL2 availability first — required for both WebGL2 and WebGPU paths
  const testCanvas = document.createElement('canvas')
  const gl2 = testCanvas.getContext('webgl2')
  if (!gl2) return 'poster'
  // navigator.gpu presence indicates WebGPU is likely available
  // Actual init failure is caught in glFactory and triggers poster fallback
  if (navigator.gpu) return 'webgpu'
  return 'webgl2'
}

function StaticPosterFallback() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#0a0a0a' }}>
      <img
        src="/poster.jpg"
        alt="3D World — upgrade your browser to explore"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          whiteSpace: 'nowrap',
        }}
      >
        <a href="/text" style={{ color: 'inherit', textDecoration: 'underline' }}>
          텍스트로 읽기 →
        </a>
      </div>
    </div>
  )
}

export default function WorldCanvas() {
  const [mode, setMode] = useState<RendererMode | null>(null)

  useEffect(() => {
    setMode(detectMode())
  }, [])

  // null during SSR hydration window — renders nothing until client detects mode
  if (mode === null) return null
  if (mode === 'poster') return <StaticPosterFallback />

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const glFactory = async (props: any) => {
    try {
      const renderer = new THREE.WebGPURenderer({
        ...props,
        forceWebGL: mode === 'webgl2',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      await renderer.init()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const backend = (renderer as any).backend?.isWebGPUBackend ? 'webgpu' : 'webgl2'
      console.log(`[renderer] selected: ${backend}`)
      return renderer
    } catch (err) {
      console.warn('[renderer] init failed, switching to poster fallback', err)
      setMode('poster')
      return null
    }
  }

  return (
    <div
      data-canvas-id="world-canvas"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Canvas gl={glFactory as any} fallback={<StaticPosterFallback />}>
        <WorldScene />
      </Canvas>
    </div>
  )
}
