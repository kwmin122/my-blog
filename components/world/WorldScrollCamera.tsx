'use client'

import { useThree } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useWorldStore } from '@/lib/worldStore'
import { SCROLL_WAYPOINTS } from '@/lib/waypoints'

export default function WorldScrollCamera() {
  const camera = useThree((s) => s.camera)
  const isHomePage = useWorldStore((s) => s.isHomePage)

  useGSAP(() => {
    if (!isHomePage) return

    // Allow layout to settle before ScrollTrigger calculates bounds
    const rafId = setTimeout(() => {
      ScrollTrigger.refresh()
    }, 0)

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#page-content',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
      },
    })

    SCROLL_WAYPOINTS.forEach(({ position, target }, i) => {
      tl.to(camera.position, {
        x: position.x,
        y: position.y,
        z: position.z,
        duration: 1,
        onUpdate: () => {
          camera.lookAt(target.x, target.y, target.z)
        },
        onStart: () => {
          console.log(`[ST] waypoint-${i} entered`)
        },
      })
    })

    return () => {
      clearTimeout(rafId)
      tl.kill()
      ScrollTrigger.getAll().forEach((st) => st.kill())
    }
  }, { dependencies: [isHomePage] })

  return null
}
