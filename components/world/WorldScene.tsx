'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useRef } from 'react'
import { markWorldFirstFrame } from '@/lib/perf'
import { useWorldStore } from '@/lib/worldStore'
import ArchipelagoScene from './ArchipelagoScene'
import WorldCameraRig from './WorldCameraRig'
import WorldScrollCamera from './WorldScrollCamera'
import UIGlassPanel from '@/components/ui/UIGlassPanel'

function DrawCallMonitor() {
  const gl = useThree((s) => s.gl)
  useFrame(() => {
    const info = (gl as unknown as { info?: { render?: { drawCalls?: number } } }).info
    const calls = info?.render?.drawCalls ?? 0
    if (typeof window !== 'undefined') {
      const prev = Number(sessionStorage.getItem('world-draw-calls-peak') ?? '0')
      if (calls > prev) sessionStorage.setItem('world-draw-calls-peak', String(calls))
    }
    if (process.env.NODE_ENV !== 'production' && calls > 600) {
      console.warn(`[perf] WARN draw calls this frame: ${calls}`)
    }
  })
  return null
}

export default function WorldScene() {
  const hasMarked = useRef(false)
  const postOverlay = useWorldStore((s) => s.postOverlay)

  useFrame(() => {
    if (!hasMarked.current) {
      hasMarked.current = true
      markWorldFirstFrame()
    }
  })

  return (
    <>
      <DrawCallMonitor />
      <WorldCameraRig />
      <WorldScrollCamera />
      <ArchipelagoScene />
      {postOverlay && (
        <Html center distanceFactor={10} position={[0, 1, -3]}>
          <UIGlassPanel style={{ padding: '1rem', minWidth: '200px', pointerEvents: 'none' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.5rem' }}>
              {postOverlay.title}
            </h2>
            <p style={{ margin: 0 }}>{postOverlay.excerpt}</p>
          </UIGlassPanel>
        </Html>
      )}
    </>
  )
}
