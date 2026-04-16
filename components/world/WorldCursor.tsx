'use client'

import { useRef, useEffect } from 'react'
import { gsap } from '@/lib/gsap'
import { useWorldStore } from '@/lib/worldStore'

export default function WorldCursor() {
  const cursorRef      = useRef<HTMLDivElement>(null)
  const rawPos         = useRef({ x: -9999, y: -9999 })
  const smoothPos      = useRef({ x: -9999, y: -9999 })
  const magnetTarget   = useWorldStore((s) => s.cursorMagnetTarget)
  const magnetRef      = useRef<{ x: number; y: number } | null>(null)

  // Keep a ref in sync so the GSAP ticker callback (closure) always reads the latest value
  // without needing to re-register the ticker on every store update
  useEffect(() => {
    magnetRef.current = magnetTarget
  }, [magnetTarget])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      // Reduced motion: do not hide OS cursor; do not mount custom cursor visually
      return
    }

    document.body.classList.add('cursor-none')

    const onMove = (e: MouseEvent) => {
      rawPos.current.x = e.clientX
      rawPos.current.y = e.clientY
    }
    window.addEventListener('mousemove', onMove)

    // GSAP ticker runs at display framerate — lerp smoothPos toward target each frame
    const tickerCallback = () => {
      const target = magnetRef.current ?? rawPos.current
      smoothPos.current.x += (target.x - smoothPos.current.x) * 0.15
      smoothPos.current.y += (target.y - smoothPos.current.y) * 0.15

      if (cursorRef.current) {
        cursorRef.current.style.transform =
          `translate(${smoothPos.current.x}px, ${smoothPos.current.y}px)`
      }
    }
    gsap.ticker.add(tickerCallback)

    return () => {
      gsap.ticker.remove(tickerCallback)
      window.removeEventListener('mousemove', onMove)
      document.body.classList.remove('cursor-none')
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: 'var(--color-accent-neon)',
        pointerEvents: 'none',
        zIndex: 9999,
        // Start offscreen; first mousemove event positions it correctly
        transform: 'translate(-9999px, -9999px)',
        mixBlendMode: 'screen',
      }}
    />
  )
}
