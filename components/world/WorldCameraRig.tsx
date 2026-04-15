'use client'

import { useThree } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { useWorldStore } from '@/lib/worldStore'

export default function WorldCameraRig() {
  const camera = useThree((s) => s.camera)
  const activeWaypoint = useWorldStore((s) => s.activeWaypoint)

  useGSAP(() => {
    if (!activeWaypoint) return

    const { position, target } = activeWaypoint
    const tween = gsap.to(camera.position, {
      x: position.x,
      y: position.y,
      z: position.z,
      duration: 1.5,
      ease: 'power2.inOut',
      overwrite: 'auto', // kill any competing scroll-driven tween on camera.position
      onUpdate: () => {
        camera.lookAt(target.x, target.y, target.z)
      },
    })

    return () => {
      tween.kill()
    }
  }, { dependencies: [activeWaypoint] })

  return null
}
