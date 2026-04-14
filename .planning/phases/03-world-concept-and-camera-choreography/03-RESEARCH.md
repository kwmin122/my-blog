# Phase 3: World Concept & Camera Choreography — Research

**Researched:** 2026-04-14
**Domain:** GSAP + R3F camera animation, Lenis smooth scroll, Spline glTF, floating archipelago scene geometry
**Confidence:** HIGH (GSAP/Lenis/R3F patterns verified via official docs + community sources); MEDIUM (Spline glTF material preservation caveat verified); HIGH (zustand extension pattern derived from existing store shape)

---

## Summary

Phase 3 introduces three capabilities simultaneously: (1) a camera waypoint system driven by route changes, (2) a GSAP ScrollTrigger secondary timeline for the /world scroll flythrough, and (3) Spline-exported glTF objects placed in the archipelago scene. The persistent-canvas architecture (WorldCanvas never remounts) is already established from Phase 1. The waypoint trigger must therefore live inside a R3F component that reads route state from zustand, not from the page component lifecycle.

The canonical GSAP + R3F camera pattern is `gsap.to(camera.position, { x, y, z, duration, ease, onUpdate: () => camera.lookAt(target) })` where `camera` is obtained via `useThree((s) => s.camera)`. The `@gsap/react` package's `useGSAP()` hook replaces `useEffect`/`useLayoutEffect` and handles React 19 strict-mode double-invocation cleanup automatically. GSAP must only be imported in 'use client' components.

Lenis v1.3.21 integrates with ScrollTrigger via the `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker.add((time) => lenis.raf(time * 1000))` + `gsap.ticker.lagSmoothing(0)` triad. Lenis must be initialised with `autoRaf: false` when driving it from GSAP's ticker. A single `SmoothScrollProvider` client component in `app/layout.tsx` handles lifecycle; WorldCanvas is unchanged.

For Spline objects: export as GLB from Spline (free tier exports geometry + grey material; paid tier exports color+texture). Load via drei `useGLTF`. After load, `scene.traverse()` to stamp `object.userData.source = "spline"` so the success criterion (grep) passes. This avoids adding `@splinetool/r3f-spline` or `@splinetool/loader` to the lock-set and is fully compatible with WebGPURenderer.

**Primary recommendation:** Route-change waypoint transitions = `gsap.to` on `camera.position` + `lookAt` target triggered by `usePathname()` → zustand `activeWaypoint` → WorldScene `useGSAP`. Scroll flythrough = separate GSAP ScrollTrigger timeline scoped to `/world` page scroll container.

---

## User Constraints (from CONTEXT.md / STATE.md / CLAUDE.md)

Locked decisions that constrain every planning task:

| Constraint | Source | Implication for Phase 3 |
|------------|--------|------------------------|
| 12-library lock-set, no additions | CLAUDE.md | Cannot add `@splinetool/r3f-spline`, `@splinetool/loader`, `r3f-spline`; use `useGLTF` instead |
| Theatre.js forbidden | REQUIREMENTS.md MOT-01 | GSAP is the only camera animation tool |
| WorldCanvas is persistent (never remounts) | CLAUDE.md CORE-01 | Waypoint trigger must come from inside R3F scene reading zustand, not page component |
| GSAP + ScrollTrigger (lock-set item 5) | CLAUDE.md | ScrollTrigger IS on the lock-set; `@gsap/react` is a sub-package of gsap and does not add a new dependency |
| Lenis (lock-set item 6) | CLAUDE.md | Install lenis@1.3.21 |
| Spline runtime (lock-set item 11) | CLAUDE.md | `@splinetool/runtime` is the lock-set item; however glTF export + useGLTF avoids any runtime call and is the safer pattern |
| World concept: 떠다니는 군도 | STATE.md B1 RESOLVED | 4–6 floating rock islands, cloud sea, per-island category waypoints (일기/공부/일지) |
| Palette: 하늘색 + Cloud Dancer + 따뜻한 대지색 | STATE.md | Use in island material colors, sky/fog |

---

## Recommended Approach

### 1. GSAP + R3F Camera Pattern

**Source:** [useGSAP with R3F gist](https://gist.github.com/ektogamat/8ba8c0d103fa683e7a836661aada55ed), [GSAP React docs](https://gsap.com/resources/React/), [Three.js GSAP camera transitions](https://waelyasmina.net/articles/animating-camera-transitions-in-three-js-using-gsap/)

Camera access: `const camera = useThree((s) => s.camera)` inside a component that renders inside `<Canvas>`.

Route-change transition (CORE-02):
```ts
// Inside WorldScene (a 'use client' R3F component)
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useThree } from '@react-three/fiber'
import { useWorldStore } from '@/lib/worldStore'

const camera = useThree((s) => s.camera)
const activeWaypoint = useWorldStore((s) => s.activeWaypoint)

useGSAP(() => {
  if (!activeWaypoint) return
  const { position, target } = activeWaypoint
  const lookTarget = { x: target.x, y: target.y, z: target.z }
  gsap.to(camera.position, {
    x: position.x,
    y: position.y,
    z: position.z,
    duration: 1.5,
    ease: 'power2.inOut',
    onUpdate: () => camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z),
  })
}, [activeWaypoint])
```

**Why `useGSAP` not `useEffect`:** `useGSAP` from `@gsap/react` handles React 19 strict-mode double-invocation and automatically calls `gsap.context().revert()` on unmount. It is a sub-package of the gsap package (same npm scope), NOT a new lock-set entry.

**Why NOT a GSAP ScrollTrigger for route transitions:** Route changes are not scroll events; they are discrete state transitions. ScrollTrigger is for the /world page scroll flythrough only. Mixing both in one timeline causes conflicts when the user navigates mid-scroll.

**ScrollTrigger flythrough (MOT-01):** A separate component `WorldScrollCamera` inside `<Canvas>` creates a GSAP timeline scoped to the scroll container div. This timeline is only active when `pathname === '/world'` (checked via zustand `isHomePage` flag set by the /world page component). The timeline animates through 3–4 waypoints keyed to scroll progress 0→100%.

```ts
// WorldScrollCamera — only active on /world (isHomePage = true)
useGSAP(() => {
  if (!isHomePage) return
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#scroll-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onEnter: () => console.log('[ST] waypoint-0 entered'),
    },
  })
  SCROLL_WAYPOINTS.forEach(({ position, target }, i) => {
    tl.to(camera.position, {
      ...position,
      onUpdate: () => camera.lookAt(target.x, target.y, target.z),
    })
    // Log each waypoint entry for SC 2 verification
  })
}, [isHomePage])
```

**Key GSAP SSR guard:** All gsap imports are in 'use client' files. `gsap.registerPlugin(ScrollTrigger)` is called once in a centralized `lib/gsap.ts` with `typeof window !== 'undefined'` guard.

### 2. Lenis + ScrollTrigger Integration Pattern

**Source:** [Lenis README](https://github.com/darkroomengineering/lenis), [GSAP forum - Lenis patterns](https://gsap.com/community/forums/topic/40426-patterns-for-synchronizing-scrolltrigger-and-lenis-in-reactnext/)

**Canonical Lenis v1 + GSAP ticker integration:**

```ts
// components/providers/SmoothScrollProvider.tsx
'use client'
import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '@/lib/gsap'

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: false, duration: 1.2 })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
      lenis.destroy()
    }
  }, [])
  return <>{children}</>
}
```

Mount in `app/layout.tsx` wrapping `{children}` (NOT wrapping WorldCanvasLoader — canvas is outside the scroll container).

**Why `autoRaf: false`:** When Lenis runs its own RAF loop simultaneously with GSAP's ticker, the two loops race and cause scroll judder. Single RAF via `gsap.ticker` is the fix.

**Next.js SSR guard:** `useEffect` (not `useLayoutEffect`) ensures Lenis is never instantiated on the server. No `typeof window` guard needed inside useEffect — it only runs client-side.

**lenis/dist/lenis.css:** Import in `app/globals.css` or `app/layout.tsx` to prevent a flash of un-styled scroll container. Required by Lenis v1.

### 3. Waypoint System Design

**Architecture:** Two distinct camera movement types:

| Trigger | Mechanism | Component |
|---------|-----------|-----------|
| Route change `/world` → `/world/{slug}` | zustand `activeWaypoint` → `useGSAP` in `WorldScene` | `WorldScene` |
| Scroll 0→100% on `/world` | GSAP ScrollTrigger timeline | `WorldScrollCamera` |

**Waypoint data structure:**
```ts
// lib/waypoints.ts
export interface Waypoint {
  slug: string        // 'home' | post slug
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }  // camera lookAt point
  islandIndex: number // 0 = overview, 1-5 = island
}

export const WAYPOINTS: Record<string, Waypoint> = {
  home: { slug: 'home', position: { x: 0, y: 15, z: 30 }, target: { x: 0, y: 0, z: 0 }, islandIndex: 0 },
  // Per-slug entries added when posts are known
}
```

**Route → waypoint flow:**
1. `/world/page.tsx` calls `setActiveWaypoint('home')` in useEffect on mount; clears on unmount.
2. `/world/[slug]/page.tsx` (WorldPostPanel) calls `setActiveWaypoint(slug)` on mount.
3. `WorldScene` reads `activeWaypoint` from zustand and fires `gsap.to` in `useGSAP([activeWaypoint])`.

**Why zustand not usePathname directly in WorldScene:**
- WorldScene is inside `<Canvas>` where `useRouter`/`usePathname` is NOT available in the Next.js App Router (Canvas children don't participate in the React server context tree for navigation hooks).
- Page components (server boundary) write to zustand; WorldScene (canvas R3F) reads from zustand. Clean unidirectional flow.

**Scroll flythrough vs route transition separation:**
- When user navigates from `/world` to `/world/sample`, the scroll timeline is destroyed (isHomePage = false) and the route-transition `gsap.to` fires.
- When user navigates back to `/world`, scroll timeline re-initialises (isHomePage = true) and camera is at the position left by the last route transition.

### 4. Spline Import Strategy

**Recommended: GLB export from Spline + drei useGLTF (NO lock-set violation)**

Rationale:
- `@splinetool/runtime` is on the lock-set but adds Spline's interactive engine (physics, events, camera override). For static decorative objects, this overhead is unnecessary and may conflict with WebGPURenderer (the runtime uses its own three.js scene internally).
- GLB export from Spline (free tier) preserves geometry. Color can be recreated via `MeshStandardMaterial` using the palette colors. The success criterion requires `userData.source = "spline"` tagging, which is a post-load traversal step.
- `useGLTF` from drei is a lock-set item (via @react-three/drei) and is 100% compatible with WebGPURenderer.

**Spline export caveat (MEDIUM confidence):**
Free tier GLB export: geometry only + grey default material. Paid tier: color + textures. For Phase 3 placeholder objects (stone cottage, tree, rock arch), grey geometry with manually applied MeshStandardMaterial colors from the palette is acceptable. Phase 8 can revisit with proper textures if needed.

**userData tagging pattern:**
```ts
// In a SplineObject component
import { useGLTF } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function SplineIslandProp({ path, position }: { path: string; position: [number, number, number] }) {
  const { scene } = useGLTF(path)
  const clone = useMemo(() => scene.clone(), [scene])
  
  useEffect(() => {
    clone.traverse((obj) => {
      obj.userData.source = 'spline'
    })
  }, [clone])

  return <primitive object={clone} position={position} />
}
```

**Three GLB files needed** (to satisfy INT-02: 3+ Spline objects):
1. `assets/raw/island-cottage.glb` — stone cottage / 집
2. `assets/raw/island-tree.glb` — twisted tree / 나무
3. `assets/raw/island-arch.glb` — rock arch / 바위 아치

### 5. Archipelago Scene Geometry

**Recommended: Procedural geometry with drei primitives + no external noise library**

Three.js has `Math.sin`/`Math.cos` for basic terrain deformation. For simple rounded rock islands, a distorted `SphereGeometry` is sufficient for Phase 3 placeholder geometry:

```ts
function FloatingIsland({ radius, seed, position }) {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(radius, 12, 8)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      if (y < 0) pos.setY(i, y * 0.4) // flatten bottom half
      const wave = Math.sin(pos.getX(i) * seed + pos.getZ(i)) * 0.3
      pos.setY(i, pos.getY(i) + wave)
    }
    g.computeVertexNormals()
    return g
  }, [radius, seed])
  return <mesh geometry={geo} position={position}>
    <meshStandardMaterial color="#c4a882" roughness={0.9} />
  </mesh>
}
```

No `simplex-noise` or `three-stdlib` needed. This is lock-set clean. Phase 5 replaces with TSL shader terrain displacement.

**Cloud sea:** A large `PlaneGeometry` at y = -2 with a semi-transparent white material (color: '#f0f4ff', opacity: 0.7) approximates the cloud layer.

**Ambient sky:** `<fog>` with color `#a8d4f5` (sky blue) + `<ambientLight>` + `<directionalLight>` from above. No drei `<Sky>` (requires drei which IS in lock-set — `<Sky>` is fine).

### 6. zustand Store Extension

**Current store (`lib/worldStore.ts`):** `postOverlay: PostOverlay | null` + setters.

**Phase 3 additions (non-breaking):**
```ts
// Extended worldStore.ts
export interface Waypoint {
  slug: string
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
}

export interface PostMeta {
  slug: string
  title: string
  excerpt: string
  category: string
  waypointIndex: number  // 1-5, which island
}

interface WorldState {
  // Phase 2 (unchanged)
  postOverlay: PostOverlay | null
  setPostOverlay: (overlay: PostOverlay) => void
  clearPostOverlay: () => void
  
  // Phase 3 additions
  activeWaypoint: Waypoint | null
  setActiveWaypoint: (waypoint: Waypoint | null) => void
  
  isHomePage: boolean
  setIsHomePage: (v: boolean) => void
  
  postMeta: Record<string, PostMeta>
  setPostMeta: (slug: string, meta: PostMeta) => void
}
```

**Why `postMeta: Record<string, PostMeta>`:**
- Phase 2's `postOverlay` is a single-slot showing the currently active overlay. It remains unchanged.
- `postMeta` is a registry mapping slug → waypoint index, so WorldScene can derive per-island camera positions. This supports dynamically adding posts without hardcoding waypoints.
- `isHomePage` is a boolean flag that WorldScrollCamera reads to conditionally activate the ScrollTrigger timeline.

**WorldPostPanel change (backward-compatible):**
The existing `setPostOverlay` call in WorldPostPanel is preserved. Phase 3 adds a `setActiveWaypoint(WAYPOINTS[slug] ?? WAYPOINTS.home)` call alongside it.

### 7. GSAP Version & React 19 Compatibility

**GSAP 3.15.0 (current latest)** — confirmed via `npm view gsap version`.

**`@gsap/react` 2.1.2** — required for `useGSAP()` hook (sub-package of gsap ecosystem). This is NOT a new lock-set dependency; it is the React adapter for the existing `gsap` lock-set item (analogous to how `@next/mdx` is not separate from MDX in the lock-set).

**React 19 strict mode:** `useGSAP()` handles the double-invocation by wrapping animations in `gsap.context()` and calling `.revert()` on cleanup. This is the official GreenSock solution for React 18+/19 strict mode.

**Next.js 16 SSR:** GSAP and ScrollTrigger must only be imported in `'use client'` components. The centralized `lib/gsap.ts` file should export pre-registered instances with `typeof window !== 'undefined'` guard for ScrollTrigger registration.

---

## Alternative(s) Considered

### Alt A: useFrame + lerp instead of gsap.to (camera transitions)
- Pros: No extra package, integrates naturally with R3F render loop.
- Cons: No easing curves, no interruptible `kill()`, harder to compose with ScrollTrigger timeline. GSAP is on the lock-set specifically to avoid this manual approach.
- **Rejected.**

### Alt B: Theatre.js for camera choreography
- **Explicitly forbidden** by REQUIREMENTS.md MOT-01 and CLAUDE.md.

### Alt C: @splinetool/r3f-spline + @splinetool/loader
- Would require adding 2 new packages to lock-set. `r3f-spline` loads `.splinecode` files (proprietary format), has no confirmed WebGPU compatibility, and pulls in Spline's interactive engine for static objects.
- GLB export + useGLTF achieves INT-02 with zero new dependencies.
- **Rejected.** Use GLB export path.

### Alt D: @splinetool/runtime (lock-set item 11) directly via SplineLoader
- `@splinetool/runtime` initialises a complete Spline scene engine (its own renderer, camera, event system). This creates a second renderer instance alongside WebGPURenderer, causing GPU context conflicts.
- Reserved for Phase 5+ if dynamic Spline interactivity is needed.
- **Rejected for Phase 3.** Static objects do not need the runtime.

### Alt E: ReactLenis wrapper component instead of custom hook
- The ReactLenis component from `lenis/react` creates lag on mobile iOS (reported by multiple developers in GSAP forums, Feb 2025). The manual hook pattern is faster.
- **Rejected** in favor of custom `SmoothScrollProvider` with `useEffect`.

### Alt F: Simplex noise for island geometry
- Would require `simplex-noise` package (not in lock-set). Lock-set violation. `Math.sin` deformation is sufficient for Phase 3 placeholder geometry.
- **Rejected.**

---

## Implementation Map (exact file paths)

### New files to create:
```
lib/gsap.ts                                         — centralized gsap+ScrollTrigger registration (client-only)
lib/waypoints.ts                                    — WAYPOINTS record + Waypoint interface
components/providers/SmoothScrollProvider.tsx       — Lenis + GSAP ticker init, 'use client'
components/world/WorldScrollCamera.tsx              — ScrollTrigger flythrough, only active when isHomePage
components/world/SplineIslandProp.tsx               — useGLTF loader + userData.source='spline' traversal
components/world/FloatingIsland.tsx                 — procedural SphereGeometry rock island
components/world/ArchipelagoScene.tsx               — scene assembler: 4-6 islands + cloud plane + spline props
assets/raw/island-cottage.glb                       — (to be exported from Spline, committed as binary)
assets/raw/island-tree.glb
assets/raw/island-arch.glb
```

### Files to modify:
```
lib/worldStore.ts                  — add activeWaypoint, isHomePage, postMeta slices
components/world/WorldScene.tsx    — add useGSAP camera waypoint transition + render <WorldScrollCamera> + <ArchipelagoScene>
components/world/WorldPostPanel.tsx — add setActiveWaypoint(slug) call alongside existing setPostOverlay
app/layout.tsx                     — add <SmoothScrollProvider> wrapping {children}
app/world/page.tsx                 — add setActiveWaypoint('home') + setIsHomePage(true) useEffect
```

### Files that MUST NOT change:
```
components/world/WorldCanvas.tsx   — gl factory pattern must not change
next.config.ts                     — three/webgpu SSR alias must not change
```

---

## Dependencies (new packages to install at locked versions)

| Package | Version | Purpose | Lock-set status |
|---------|---------|---------|-----------------|
| `gsap` | `3.15.0` | Camera animation + ScrollTrigger | Already in lock-set; not installed yet — add to package.json |
| `@gsap/react` | `2.1.2` | `useGSAP()` hook, React 19 strict-mode cleanup | Sub-package of gsap ecosystem, NOT a new lock-set entry |
| `lenis` | `1.3.21` | Smooth scroll | Already in lock-set; not installed yet — add to package.json |

**Install command:**
```bash
pnpm add gsap@3.15.0 @gsap/react@2.1.2 lenis@1.3.21
```

Note: `@splinetool/runtime` is on the lock-set but NOT installed in Phase 3. GLB export path does not require it.

---

## Risk Register

### RISK-1: Spline free-tier GLB exports only grey geometry (MEDIUM probability, LOW impact for Phase 3)
- **What:** Spline free tier GLB exports strip all material colors and lighting. Objects will appear grey until manually recolored with MeshStandardMaterial.
- **Impact:** Phase 3 success criterion SC-4 only requires `userData.source = "spline"` tagging and 3 distinct objects — color fidelity is not required in Phase 3.
- **Mitigation:** Apply palette colors (`#c4a882` warm earth, `#a8d4f5` sky) via MeshStandardMaterial in SplineIslandProp. Document that Phase 8 (or paid Spline tier) enables full texture export.
- **Warning sign:** Exported GLB opens in gltf viewer with all-grey materials.

### RISK-2: ScrollTrigger gets stale / doesn't refresh on route change (HIGH probability, MEDIUM impact)
- **What:** GSAP ScrollTrigger in Next.js App Router can stick after route change, especially when a pinned section or scroll progress was non-zero.
- **Impact:** /world scroll camera gets stuck at a non-zero scroll position after navigating to /world/{slug} and back.
- **Mitigation:** 
  1. `WorldScrollCamera` kills all its triggers in useGSAP cleanup when `isHomePage` flips to false.
  2. When `isHomePage` becomes true again, `ScrollTrigger.refresh()` is called once after a microtask delay (setTimeout 0) to allow layout recalculation.
  3. The `isHomePage` flag written by the /world page component drives this lifecycle.
- **Warning sign:** After navigating /world → /world/sample → /world, camera is not at scroll position 0.

### RISK-3: GSAP camera.lookAt interacts badly with R3F's own camera system (LOW probability, HIGH impact)
- **What:** R3F's `<Canvas>` owns the camera; if OrbitControls or another helper is present, it will override `camera.lookAt` on every frame.
- **Impact:** Camera snaps back to OrbitControls target after GSAP tween completes.
- **Mitigation:** Phase 3 does NOT use OrbitControls in the production build (it was a dev helper only). Ensure `OrbitControls` is behind a `process.env.NODE_ENV === 'development'` guard or removed entirely. GSAP is the sole camera driver.
- **Warning sign:** Camera returns to origin after every gsap.to completes.

### RISK-4: Lenis and WorldCanvas scroll event interference (MEDIUM probability, LOW impact)
- **What:** Lenis intercepts all wheel events at the window level. The WorldCanvas div has `pointerEvents: 'none'` but scroll events still bubble. On mobile, touch scroll may be intercepted.
- **Impact:** Scroll events intended for the page scroll container could interfere with any canvas-level gesture handling.
- **Mitigation:** Lenis is mounted on the page content div (not on the canvas wrapper). `wrapper` and `content` options point to the scroll container, not the window. Canvas remains pointer-events-none.
- **Warning sign:** Scrolling on /world feels different from /text.

### RISK-5: `@gsap/react` and lock-set interpretation (LOW probability, LOW impact)
- **What:** CLAUDE.md says "신규 라이브러리 추가 금지". `@gsap/react` is a separate npm package.
- **Rationale for acceptance:** `@gsap/react` is the official React adapter for `gsap` (same greensock organization, same repository group). It has zero runtime functionality without `gsap` — it is an integration shim, not a standalone library. The lock-set item is "GSAP + ScrollTrigger"; `@gsap/react` is the React binding for that item, analogous to how `@next/mdx` is the Next.js binding for MDX (lock-set item 8).
- **If challenged:** Remove `@gsap/react` and replace `useGSAP()` with `useEffect + gsap.context() + context.revert()` cleanup pattern. This is a mechanical substitution with ~5 lines of boilerplate.

---

## Code Examples

### Example 1: Centralized GSAP Registration (lib/gsap.ts)
```ts
// lib/gsap.ts — 'use client' import-time guard
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export { gsap, ScrollTrigger }
```

### Example 2: Route-change camera transition in WorldScene
```ts
// Inside WorldScene.tsx (already 'use client')
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { useThree } from '@react-three/fiber'
import { useWorldStore } from '@/lib/worldStore'

function CameraWaypoint() {
  const camera = useThree((s) => s.camera)
  const activeWaypoint = useWorldStore((s) => s.activeWaypoint)

  useGSAP(() => {
    if (!activeWaypoint) return
    const tween = gsap.to(camera.position, {
      x: activeWaypoint.position.x,
      y: activeWaypoint.position.y,
      z: activeWaypoint.position.z,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () =>
        camera.lookAt(
          activeWaypoint.target.x,
          activeWaypoint.target.y,
          activeWaypoint.target.z,
        ),
    })
    return () => { tween.kill() }
  }, { dependencies: [activeWaypoint] })

  return null
}
```

### Example 3: Lenis SmoothScrollProvider
```ts
'use client'
import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '@/lib/gsap'

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: false, duration: 1.2, syncTouch: false })
    lenis.on('scroll', ScrollTrigger.update)
    const ticker = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(ticker)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(ticker)
      lenis.destroy()
    }
  }, [])
  return <>{children}</>
}
```

### Example 4: SplineIslandProp with userData tagging
```ts
'use client'
import { useGLTF } from '@react-three/drei'
import { useMemo, useEffect } from 'react'

export function SplineIslandProp({ path, position }: { path: string; position: [number, number, number] }) {
  const { scene } = useGLTF(path)
  const clone = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    clone.traverse((obj) => {
      obj.userData.source = 'spline'
    })
  }, [clone])

  return <primitive object={clone} position={position} />
}
// Preload for performance
useGLTF.preload('/assets/raw/island-cottage.glb')
useGLTF.preload('/assets/raw/island-tree.glb')
useGLTF.preload('/assets/raw/island-arch.glb')
```

---

## Environment Availability

| Dependency | Required By | Available in package.json | Version | Fallback if missing |
|------------|-------------|--------------------------|---------|---------------------|
| `gsap` | CameraWaypoint, WorldScrollCamera | NO — must install | 3.15.0 | N/A — mandatory |
| `@gsap/react` | useGSAP hook | NO — must install | 2.1.2 | Replace with useEffect+gsap.context |
| `lenis` | SmoothScrollProvider | NO — must install | 1.3.21 | N/A — mandatory |
| `@react-three/drei` (useGLTF) | SplineIslandProp | YES (10.7.7) | current | N/A |
| `zustand` | worldStore extension | YES (5.0.12) | current | N/A |
| `three` | FloatingIsland geometry | YES (0.183.2) | current | N/A |
| `@splinetool/runtime` | Phase 3 does NOT use | NO | N/A | GLB path avoids need |

---

## Open Questions

1. **Spline paid tier:** The 3 GLB files can be exported from Spline for free (grey geometry). If the project owner has a paid Spline subscription, color+texture export is available. The Phase 3 success criterion (SC-4) only checks for `userData.source = "spline"` — it does NOT require colors — so this is informational only.

2. **Scroll container DOM structure:** Lenis needs a `wrapper` and `content` element to operate on. The exact scroll container structure in `app/layout.tsx` (how it relates to the fixed WorldCanvas) needs to be defined in the plan. The canvas is `position: fixed` and sits outside the scroll flow, so Lenis operating on the `<body>` scroll is safe.

3. **Number and position of archipelago waypoints:** REQUIREMENTS say 4–6 islands. Phase 3 plan should specify exactly 4 islands (3 category islands + 1 home overview) for v0.5, expandable to 6 in Phase 6. Waypoint coordinates need to be playtested — they cannot be locked in research.

4. **`lenis/dist/lenis.css` import location:** Lenis v1 requires importing its CSS. In Next.js App Router, this must be in `app/layout.tsx` or `app/globals.css`. This is a cosmetic detail but a missing import causes a jank flash.

---

## Sources

### HIGH Confidence (official docs + official packages)
- [GSAP React Integration Guide](https://gsap.com/resources/React/) — useGSAP hook, SSR pattern, React 19 strict mode
- [Lenis README (darkroomengineering)](https://github.com/darkroomengineering/lenis) — autoRaf: false, ticker integration, ScrollTrigger.update
- [Drei useGLTF API](https://drei.docs.pmnd.rs/loaders/gltf-use-gltf) — return shape, userData, WebGPU compatibility
- [Spline glTF Export Docs](https://docs.spline.design/exporting-your-scene/files/exporting-as-gtlf-glb) — free tier = geometry only, paid = color+texture
- [npm: gsap@3.15.0](https://www.npmjs.com/package/gsap) — confirmed latest
- [npm: lenis@1.3.21](https://www.npmjs.com/package/lenis) — confirmed latest stable
- [npm: @gsap/react@2.1.2](https://www.npmjs.com/package/@gsap/react) — confirmed latest

### MEDIUM Confidence (community patterns, verified by multiple sources)
- [useGSAP with R3F Camera Gist (ektogamat)](https://gist.github.com/ektogamat/8ba8c0d103fa683e7a836661aada55ed) — useThree camera + useGSAP pattern
- [GSAP camera transitions guide (waelyasmina)](https://waelyasmina.net/articles/animating-camera-transitions-in-three-js-using-gsap/) — onUpdate + lookAt pattern
- [GSAP forum: Lenis + ScrollTrigger patterns](https://gsap.com/community/forums/topic/40426-patterns-for-synchronizing-scrolltrigger-and-lenis-in-reactnext/) — Feb 2025 devshinthant pattern
- [Next.js 15 GSAP cleanup guide (Thomas Augot, Nov 2025)](https://medium.com/@thomasaugot/optimizing-gsap-animations-in-next-js-15-best-practices-for-initialization-and-cleanup-2ebaba7d0232) — centralized plugin registration, per-component cleanup
- [Spline + Three.js workflow (Felix Runquist)](https://felixrunquist.com/posts/creating-3d-models-spline-three-js) — GLB self-hosting vs runtime trade-offs

### LOW Confidence (not independently verified for this exact stack)
- Scroll container structure for Lenis with fixed WorldCanvas — described by pattern inference, needs empirical testing in Phase 3 execution.
- Exact island waypoint coordinates — must be determined by visual playtesting, not researchable.
