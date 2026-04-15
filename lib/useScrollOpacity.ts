'use client'

import { useEffect } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'

export default function useScrollOpacity(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return

    const setter = gsap.quickSetter(document.documentElement, '--panel-opacity', '') as (v: number) => void

    const st = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        setter(0.4 + 0.45 * self.progress)
      },
    })

    ScrollTrigger.refresh()

    return () => {
      st.kill()
    }
  }, [])
}
