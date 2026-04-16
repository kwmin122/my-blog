'use client'

import { useThree } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { useWorldStore } from '@/lib/worldStore'

export default function WorldCameraRig() {
  const camera = useThree((s) => s.camera)
  const activeWaypoint = useWorldStore((s) => s.activeWaypoint)
  const minimalMode = useWorldStore((s) => s.minimalMode)

  useGSAP(() => {
    if (!activeWaypoint || minimalMode) return

    const { position, target } = activeWaypoint

    const mm = gsap.matchMedia()
    mm.add({ reduceMotion: '(prefers-reduced-motion: reduce)' }, (ctx) => {
      const { reduceMotion } = ctx.conditions as { reduceMotion: boolean }
      const tween = gsap.to(camera.position, {
        x: position.x,
        y: position.y,
        z: position.z,
        duration: reduceMotion ? 0.18 : 1.5,
        ease: reduceMotion ? 'none' : 'power2.inOut',
        overwrite: 'auto',
        onUpdate: () => {
          camera.lookAt(target.x, target.y, target.z)
        },
      })
      return () => { tween.kill() }
    })

    return () => { mm.revert() }
  }, { dependencies: [activeWaypoint, minimalMode], revertOnUpdate: true })
  // revertOnUpdate: true — ensures gsap.matchMedia() context is reverted on each
  // dependency change (not just unmount), preventing context accumulation

  return null
}
