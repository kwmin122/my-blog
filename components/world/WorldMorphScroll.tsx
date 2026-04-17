'use client'

import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useWorldStore } from '@/lib/worldStore'

// oklch(0.82 0.25 140) → approximate hex #8eff4f (neon green accent)
// Source: tokens.color.accentNeon — oklch() not supported by THREE.Color
const NEON_HEX = 0x8eff4f

// tokens.scene.sunlight = '#fff8e8' — base warm sunlight color
const BASE_HEX = 0xfff8e8

const BASE_COLOR = new THREE.Color(BASE_HEX)
const NEON_COLOR = new THREE.Color(NEON_HEX)

// Proxy ref: GSAP tweens these plain numeric values; useFrame applies them to Three.js objects
function makeProxy() {
  return {
    morph: 0,
    r: BASE_COLOR.r,
    g: BASE_COLOR.g,
    b: BASE_COLOR.b,
  }
}

interface WorldMorphScrollProps {
  meshRef: React.RefObject<THREE.Mesh | null>
  lightRef: React.RefObject<THREE.DirectionalLight | null>
}

export default function WorldMorphScroll({ meshRef, lightRef }: WorldMorphScrollProps) {
  const proxy = useRef(makeProxy())
  const isHomePage = useWorldStore((s) => s.isHomePage)
  const minimalMode = useWorldStore((s) => s.minimalMode)

  useGSAP(() => {
    if (!isHomePage || minimalMode) return

    const mm = gsap.matchMedia()
    mm.add({ reduceMotion: '(prefers-reduced-motion: reduce)' }, (ctx) => {
      const { reduceMotion } = ctx.conditions as { reduceMotion: boolean }

      if (reduceMotion) {
        // Instant set — skip smooth animation
        proxy.current.morph = 0
        proxy.current.r = BASE_COLOR.r
        proxy.current.g = BASE_COLOR.g
        proxy.current.b = BASE_COLOR.b
        return
      }

      // Parallel timeline on same #page-content trigger — does NOT call ScrollTrigger.refresh()
      // (WorldScrollCamera already calls it; GSAP refreshes all STs together)
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '#page-content',
          start: 'top top',
          end: '50% bottom',  // 0% → 50% scroll range per MOT-02 success criterion 1
          scrub: 1,
        },
      })

      tl.to(proxy.current, {
        morph: 1,
        r: NEON_COLOR.r,
        g: NEON_COLOR.g,
        b: NEON_COLOR.b,
        ease: 'none',
      })

      return () => { tl.kill() }
    })

    return () => { mm.revert() }
  }, { dependencies: [isHomePage, minimalMode], revertOnUpdate: true })

  useFrame(() => {
    if (minimalMode) return
    if (meshRef.current?.morphTargetInfluences) {
      meshRef.current.morphTargetInfluences[0] = proxy.current.morph
    }
    if (lightRef.current) {
      lightRef.current.color.setRGB(proxy.current.r, proxy.current.g, proxy.current.b)
    }
  })

  return null
}
