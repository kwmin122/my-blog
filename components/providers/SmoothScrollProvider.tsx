'use client'

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { gsap, ScrollTrigger } from '@/lib/gsap'

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false)

  useEffect(() => {
    // Guard against React 18 StrictMode double-invocation of effects
    if (initialized.current) return
    initialized.current = true

    const lenis = new Lenis({ autoRaf: false, duration: 1.2, syncTouch: false })
    lenis.on('scroll', ScrollTrigger.update)
    const ticker = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(ticker)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(ticker)
      lenis.destroy()
      initialized.current = false
    }
  }, [])
  return <>{children}</>
}
