// lib/gsap.ts
// 'use client' is NOT needed — this module guards with typeof window.
// All imports of this file must be in 'use client' components.
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export { gsap, ScrollTrigger }
