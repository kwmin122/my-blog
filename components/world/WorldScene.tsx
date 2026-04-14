'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { markWorldFirstFrame } from '@/lib/perf'

export default function WorldScene() {
  const hasMarked = useRef(false)

  useFrame(() => {
    if (!hasMarked.current) {
      hasMarked.current = true
      markWorldFirstFrame()
    }
  })

  // Empty scene stub for Phase 1
  return null
}
