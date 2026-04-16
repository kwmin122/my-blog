'use client'

import { useRef, useEffect } from 'react'
import { gsap } from '@/lib/gsap'
import { useWorldStore } from '@/lib/worldStore'

export default function WorldCursor() {
  const cursorRef    = useRef<HTMLDivElement>(null)
  const rawPos       = useRef({ x: -9999, y: -9999 })
  const smoothPos    = useRef({ x: -9999, y: -9999 })
  const magnetTarget = useWorldStore((s) => s.cursorMagnetTarget)
  const magnetRef    = useRef<{ x: number; y: number } | null>(null)
  const minimalMode  = useWorldStore((s) => s.minimalMode)

  // Keep a ref in sync so the GSAP ticker callback (closure) always reads the latest value
  // without needing to re-register the ticker on every store update
  useEffect(() => {
    magnetRef.current = magnetTarget
  }, [magnetTarget])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')

    // Guard: skip custom cursor if reduced motion OR minimal mode active
    if (mq.matches || minimalMode) return

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

    // Phase 6 deferred: live reactivity to OS prefers-reduced-motion change
    const handleMqChange = () => {
      // Re-run the effect by triggering cleanup + re-setup via React
      // The cleanup returned below handles teardown; the dependency array
      // re-runs this effect on mq change only if we force a re-render.
      // Pattern: mq change → dispatch a synthetic event to force teardown
      // Simplest correct approach: call cleanup directly and restore OS cursor.
      // Since React won't re-run the effect on mq.change (no dep change),
      // we must handle it within the event listener:
      if (mq.matches) {
        gsap.ticker.remove(tickerCallback)
        window.removeEventListener('mousemove', onMove)
        document.body.classList.remove('cursor-none')
      }
    }
    mq.addEventListener('change', handleMqChange)

    return () => {
      gsap.ticker.remove(tickerCallback)
      window.removeEventListener('mousemove', onMove)
      mq.removeEventListener('change', handleMqChange)
      document.body.classList.remove('cursor-none')
    }
  }, [minimalMode])

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
