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

    // Claim exclusive camera control — kill any in-flight waypoint tween
    // (WorldCameraRig may still be mid-transition when scroll activates)
    gsap.killTweensOf(camera.position)

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
      // tl.kill() already kills the associated ScrollTrigger — do NOT call
      // ScrollTrigger.getAll().kill() here as it would destroy any ST instances
      // registered by other components (future scroll effects, UI parallax, etc.)
    }
  }, { dependencies: [isHomePage] })

  return null
}
