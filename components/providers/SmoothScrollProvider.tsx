'use client'

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useWorldStore } from '@/lib/worldStore'

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false)
  const lenisRef = useRef<Lenis | null>(null)
  const minimalMode = useWorldStore((s) => s.minimalMode)

  useEffect(() => {
    // Guard against React 18 StrictMode double-invocation of effects
    if (initialized.current) return
    initialized.current = true

    const lenis = new Lenis({ autoRaf: false, duration: 1.2, syncTouch: false })
    lenisRef.current = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const ticker = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(ticker)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(ticker)
      lenis.destroy()
      lenisRef.current = null
      initialized.current = false
    }
  }, [])

  // Pause / resume Lenis when minimal mode toggles (D-04c)
  useEffect(() => {
    if (!lenisRef.current) return
    if (minimalMode) {
      lenisRef.current.stop()
    } else {
      lenisRef.current.start()
    }
  }, [minimalMode])

  return <>{children}</>
}
