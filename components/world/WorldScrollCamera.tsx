'use client'

import { useThree } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useWorldStore } from '@/lib/worldStore'
import { SCROLL_WAYPOINTS, WAYPOINTS } from '@/lib/waypoints'

export default function WorldScrollCamera() {
  const camera = useThree((s) => s.camera)
  const isHomePage = useWorldStore((s) => s.isHomePage)

  useGSAP(() => {
    if (!isHomePage) return

    const mm = gsap.matchMedia()
    mm.add({ reduceMotion: '(prefers-reduced-motion: reduce)' }, (ctx) => {
      const { reduceMotion } = ctx.conditions as { reduceMotion: boolean }

      if (reduceMotion) {
        // Snap camera to home position — uses WAYPOINTS.home so it stays in sync
        const { position, target } = WAYPOINTS.home
        gsap.set(camera.position, { x: position.x, y: position.y, z: position.z })
        camera.lookAt(target.x, target.y, target.z)
        return
      }

      // Claim exclusive camera control — kill any in-flight waypoint tween
      gsap.killTweensOf(camera.position)

      // Allow layout to settle before ScrollTrigger calculates bounds
      const timeoutId = setTimeout(() => {
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
        clearTimeout(timeoutId)
        tl.kill()
        // tl.kill() already kills the associated ScrollTrigger — do NOT call
        // ScrollTrigger.getAll().kill() here as it would destroy any ST instances
        // registered by other components
      }
    })

    return () => { mm.revert() }
  }, { dependencies: [isHomePage], revertOnUpdate: true })
  // revertOnUpdate: true — ensures gsap.matchMedia() context is reverted on each
  // dependency change, not just on unmount

  return null
}
