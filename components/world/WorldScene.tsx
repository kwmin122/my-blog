'use client'

import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useRef } from 'react'
import { markWorldFirstFrame } from '@/lib/perf'
import { useWorldStore } from '@/lib/worldStore'

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
      {postOverlay && (
        <Html center distanceFactor={10} position={[0, 1, -3]}>
          <div
            style={{
              background: 'rgba(0,0,0,0.7)',
              padding: '1rem',
              color: 'white',
              pointerEvents: 'none',
              minWidth: '200px',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.5rem' }}>
              {postOverlay.title}
            </h2>
            <p style={{ margin: 0 }}>{postOverlay.excerpt}</p>
          </div>
        </Html>
      )}
    </>
  )
}
