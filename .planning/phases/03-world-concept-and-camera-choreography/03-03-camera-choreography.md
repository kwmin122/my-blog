---
phase: 3
plan: 03
title: Camera choreography — WorldCameraRig + route-change GSAP transitions + /world ScrollTrigger flythrough + waypoint store wiring
wave: 2
depends_on: [03-01, 03-02]
files_modified:
  - components/world/WorldCameraRig.tsx
  - components/world/WorldScrollCamera.tsx
  - components/world/WorldPostWaypointSync.tsx
  - components/world/WorldScene.tsx
  - app/world/page.tsx
  - app/world/[slug]/page.tsx
requirements_addressed:
  - CORE-02
  - MOT-01
  - MOT-03
gap_closure: false
---

## read_first

- `components/world/WorldScene.tsx` — current state after Plan 03-02 (has ArchipelagoScene, postOverlay Html)
- `lib/worldStore.ts` — state after Plan 03-01 (must have activeWaypoint, isHomePage, setActiveWaypoint, setIsHomePage)
- `lib/waypoints.ts` — state after Plan 03-01 (WAYPOINTS record, SCROLL_WAYPOINTS array)
- `lib/gsap.ts` — state after Plan 03-01 (gsap + ScrollTrigger exports)
- `app/world/page.tsx` — current stub (returns static div, needs setActiveWaypoint + setIsHomePage)
- `app/world/[slug]/page.tsx` — existing WorldPostPanel page (needs setActiveWaypoint(slug))

## Objective

Wire camera movement to the zustand waypoint store. Create two camera-driving components:

1. `WorldCameraRig` — lives inside `<Canvas>`, reads `activeWaypoint` from zustand, fires `gsap.to(camera.position, ...)` with `useGSAP` on every waypoint change. Handles route-change transitions (CORE-02).
2. `WorldScrollCamera` — lives inside `<Canvas>`, reads `isHomePage` from zustand, creates a GSAP ScrollTrigger timeline scrubbing through 3 waypoints when `isHomePage === true`, destroys it when false (MOT-01).

Also wire page components: `/world/page.tsx` calls `setActiveWaypoint(WAYPOINTS.home)` + `setIsHomePage(true)` on mount, clears on unmount. `/world/[slug]/page.tsx` calls `setActiveWaypoint(WAYPOINTS[slug] ?? WAYPOINTS.home)` on mount.

Requirements fulfilled: CORE-02 (route-change interpolation), MOT-01 (GSAP ScrollTrigger camera animation, Theatre.js 0), MOT-03 (Lenis already wired in 03-01 — this plan's scroll flythrough activates on top of it).

## Capabilities

- **CORE-02**: `WorldCameraRig` watches `activeWaypoint` via `useWorldStore`. On change, fires `gsap.to(camera.position, { x, y, z, duration: 1.5, ease: 'power2.inOut', onUpdate: () => camera.lookAt(...) })`. Page components write waypoint on navigation — `/world` → home, `/world/sample` → sample position. Camera interpolates 1.5s.

- **MOT-01**: `WorldScrollCamera` creates a GSAP ScrollTrigger timeline on `#page-content` scroll container. Timeline has 3 `.to()` segments for SCROLL_WAYPOINTS. Each segment logs `[ST] waypoint-N entered` via `onEnter` callback for devtools verification. Timeline is created when `isHomePage === true` and killed in `useGSAP` cleanup when `isHomePage` flips to false. `ScrollTrigger.refresh()` is called in a `setTimeout(0)` after timeline creation to handle Next.js App Router layout reflow.

- **MOT-03** (reinforced): Lenis is already running from Plan 03-01's `SmoothScrollProvider`. This plan's ScrollTrigger flythrough runs on the Lenis-smoothed scroll — the two interact via the `lenis.on('scroll', ScrollTrigger.update)` bridge already wired in 03-01.

## Delivery scope

- Create `components/world/WorldCameraRig.tsx` — `useThree` camera + `useGSAP` + `activeWaypoint` watcher; returns null (no rendered geometry)
- Create `components/world/WorldScrollCamera.tsx` — `useThree` camera + `useGSAP` + ScrollTrigger timeline, conditional on `isHomePage`; returns null
- Modify `components/world/WorldScene.tsx` — add `<WorldCameraRig />` and `<WorldScrollCamera />` inside the fragment
- Modify `app/world/page.tsx` — convert to 'use client', add `useEffect` to call `setActiveWaypoint(WAYPOINTS.home)` + `setIsHomePage(true)` on mount; clear both on unmount
- Modify `app/world/[slug]/page.tsx` — add `useEffect` to call `setActiveWaypoint(WAYPOINTS[slug] ?? WAYPOINTS.home)` + `setIsHomePage(false)` on mount

## Verification intent

1. Type `/world` in address bar → camera is at `[0, 8, 20]` looking at `[0, 0, 0]` (overview of all islands). Type `/world/sample` → camera flies ~1.5s to `[-8, 3, 0]` looking at `[-8, 0, 0]`. No instant snap — visible interpolation.
2. On `/world`, scroll from top to bottom of page — camera moves through 3 waypoints (island-1 → island-2 → island-3). DevTools console shows `[ST] waypoint-0 entered`, `[ST] waypoint-1 entered`, `[ST] waypoint-2 entered` each exactly once per full scroll.
3. Navigate `/world` → `/world/sample` → back to `/world`. On return to `/world`, scroll flythrough re-initialises (console shows waypoint logs again on scroll). Camera starts at the position from the route-transition, NOT at scroll-position 0 of the flythrough.
4. `grep -r "theatre" node_modules package.json` returns 0 matches (Theatre.js absence).
5. DevTools Performance: set `prefers-reduced-motion` to normal — camera tweens at 1.5s. (Phase 4 will add the fade-cut for reduced motion — not required here.)

## Technical direction

### 1. `components/world/WorldCameraRig.tsx` (new file)

```ts
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
```

**Why `useGSAP` not `useEffect`:** React 19 strict-mode double-invocation; `useGSAP` wraps in `gsap.context()` and calls `.revert()` on cleanup automatically.

**Why `{ dependencies: [activeWaypoint] }` syntax:** `useGSAP` from `@gsap/react` accepts a config object as second arg where `dependencies` maps to the standard `useEffect` deps array.

### 2. `components/world/WorldScrollCamera.tsx` (new file)

```ts
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
```

**Trigger `#page-content`:** This is the existing `<main id="page-content">` in `app/layout.tsx`. After Plan 03-01, it is wrapped by `SmoothScrollProvider` which drives Lenis on the body/window scroll. `ScrollTrigger` reads the window scroll position (updated by `lenis.on('scroll', ScrollTrigger.update)` — already wired).

**`scrub: 1`:** Smooth scrub lag of 1 second ensures the camera does not jump but follows the scroll progress with a 1s lag, creating fluid flythrough.

**`onStart` vs `onEnter`:** Using `onStart` on each timeline segment fires exactly once per forward pass, matching the "each waypoint fires once" success criterion.

### 3. `components/world/WorldScene.tsx` final modification

Add both camera components inside the fragment. The `<WorldCameraRig />` and `<WorldScrollCamera />` components render null and operate purely as scene-level hooks.

```ts
'use client'

import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useRef } from 'react'
import { markWorldFirstFrame } from '@/lib/perf'
import { useWorldStore } from '@/lib/worldStore'
import ArchipelagoScene from './ArchipelagoScene'
import WorldCameraRig from './WorldCameraRig'
import WorldScrollCamera from './WorldScrollCamera'

export default function WorldScene() {
  const hasMarked = useRef(false)
  const postOverlay = useWorldStore((s) => s.postOverlay)

  useFrame(() => {
    if (!hasMarked.current) {
      hasMarked.current = true
      markWorldFirstFrame()
    }
  })

  return (
    <>
      <WorldCameraRig />
      <WorldScrollCamera />
      <ArchipelagoScene />
      {postOverlay && (
        <Html center distanceFactor={10} position={[0, 1, -3]}>
          <div
            style={{
              background: 'rgba(0,0,0,0.7)',
              padding: '1rem',
              color: 'white',
              pointerEvents: 'none',
              minWidth: '200px',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.5rem' }}>
              {postOverlay.title}
            </h2>
            <p style={{ margin: 0 }}>{postOverlay.excerpt}</p>
          </div>
        </Html>
      )}
    </>
  )
}
```

### 4. `app/world/page.tsx` modification

Convert to `'use client'`. Add `useEffect` to write home waypoint and set `isHomePage = true` on mount, clear on unmount.

```ts
'use client'

import { useEffect } from 'react'
import { useWorldStore } from '@/lib/worldStore'
import { WAYPOINTS } from '@/lib/waypoints'

export default function WorldPage() {
  const setActiveWaypoint = useWorldStore((s) => s.setActiveWaypoint)
  const setIsHomePage = useWorldStore((s) => s.setIsHomePage)

  useEffect(() => {
    setActiveWaypoint(WAYPOINTS.home)
    setIsHomePage(true)
    return () => {
      setActiveWaypoint(null)
      setIsHomePage(false)
    }
  }, [setActiveWaypoint, setIsHomePage])

  return (
    <div>
      <h1>/world</h1>
    </div>
  )
}
```

### 5. `app/world/[slug]/page.tsx` modification

**The slug page is a server component** (Phase 2 built it as a server component that renders `WorldPostPanel` as a client bridge). Do NOT convert it to `'use client'` — that would break SSR and static generation. Instead, create a new `WorldPostWaypointSync` client component alongside the existing `WorldPostPanel` pattern.

**Step 5a — Create `components/world/WorldPostWaypointSync.tsx`** (new file):
```ts
'use client'

import { useEffect } from 'react'
import { setActiveWaypoint, clearPostOverlay } from '@/lib/worldStore'
import { WAYPOINTS } from '@/lib/waypoints'

interface Props { slug: string }

export default function WorldPostWaypointSync({ slug }: Props) {
  useEffect(() => {
    const waypoint = WAYPOINTS[slug] ?? WAYPOINTS.home
    setActiveWaypoint(waypoint)
    return () => {
      setActiveWaypoint(null)
    }
  }, [slug])
  return null
}
```

Note: `setActiveWaypoint` is the stable bound selector exported from `lib/worldStore.ts` (added in Plan 03-01 — not the hook, the direct getState() call). `isHomePage` is set to `false` by default (initial store value) and cleared when the home page unmounts — no explicit `setIsHomePage(false)` call needed here.

**Step 5b — Add `WorldPostWaypointSync` to `app/world/[slug]/page.tsx`**:

Read the existing page file first to locate the `return` statement. Add `WorldPostWaypointSync` alongside the existing `WorldPostPanel`:

```ts
// Add import
import WorldPostWaypointSync from '@/components/world/WorldPostWaypointSync'

// In the return statement (alongside existing WorldPostPanel):
return (
  <>
    <WorldPostPanel slug={slug} title={metadata.title} excerpt={metadata.excerpt} />
    <WorldPostWaypointSync slug={slug} />
  </>
)
```

Also add `files_modified` note: `components/world/WorldPostWaypointSync.tsx` (new file) must be added.

Import additions to `app/world/[slug]/page.tsx`:
```ts
import WorldPostWaypointSync from '@/components/world/WorldPostWaypointSync'
```

### 6. OrbitControls guard
The existing `WorldScene` does not have OrbitControls (confirmed by reading the file). No action needed. If a dev later adds OrbitControls, it must be behind `process.env.NODE_ENV === 'development'` guard to avoid overriding GSAP camera lookAt.

### 7. `#page-content` scroll height
For the ScrollTrigger flythrough to fire, `#page-content` must be tall enough to scroll. The current `/world/page.tsx` stub has no content height. Add inline style to give it scroll room:
```tsx
return (
  <div style={{ height: '300vh' }}>
    <h1 style={{ padding: '2rem' }}>/world</h1>
  </div>
)
```
This 300vh height creates enough scroll distance for the 3-waypoint flythrough. Phase 6 (MOT-02) will replace with real content.

## Dependencies

- Plan 03-01 must be complete: `lib/worldStore.ts` must export `activeWaypoint`, `isHomePage`, `setActiveWaypoint`, `setIsHomePage`; `lib/gsap.ts` must export `gsap`, `ScrollTrigger`; `lib/waypoints.ts` must export `WAYPOINTS`, `SCROLL_WAYPOINTS`; `gsap@3.15.0`, `@gsap/react@2.1.2`, `lenis@1.3.21` must be in node_modules
- Plan 03-02 must be complete: `components/world/ArchipelagoScene.tsx` must exist; `components/world/WorldScene.tsx` must already have `<ArchipelagoScene />` render
- Existing `app/world/[slug]/page.tsx` must be read before modification to preserve existing postOverlay logic

## Out of scope

- `prefers-reduced-motion` fade-cut fallback (Phase 4, MOT-04)
- Keyboard waypoint navigation (Phase 4, INT-03)
- Rive state machine signposts (Phase 6, INT-01)
- Design tokens (Phase 4, DSGN-01)
- Real Spline GLBs (Phase 5/8)
- TSL shaders on scene geometry (Phase 5)
- Morphing scroll (Phase 6, MOT-02)

---

## done_when

- [ ] `pnpm run build` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `grep "WorldCameraRig" components/world/WorldScene.tsx` returns match
- [ ] `grep "WorldScrollCamera" components/world/WorldScene.tsx` returns match
- [ ] `grep "useGSAP" components/world/WorldCameraRig.tsx` returns match
- [ ] `grep "power2.inOut" components/world/WorldCameraRig.tsx` returns match (correct ease)
- [ ] `grep "duration: 1.5" components/world/WorldCameraRig.tsx` returns match (1.5s transition)
- [ ] `grep "camera.lookAt" components/world/WorldCameraRig.tsx` returns match
- [ ] `grep "ScrollTrigger" components/world/WorldScrollCamera.tsx` returns match
- [ ] `grep "scrub" components/world/WorldScrollCamera.tsx` returns match
- [ ] `grep "ST.*waypoint" components/world/WorldScrollCamera.tsx` returns match (console log verification)
- [ ] `grep "WorldPostWaypointSync" app/world/[slug]/page.tsx` returns match
- [ ] `grep "setActiveWaypoint" components/world/WorldPostWaypointSync.tsx` returns match
- [ ] `grep "setActiveWaypoint" app/world/page.tsx` returns match
- [ ] `grep "setIsHomePage" app/world/page.tsx` returns match
- [ ] `grep "WAYPOINTS.home" app/world/page.tsx` returns match
- [ ] `grep -r "theatre" node_modules package.json` returns 0 matches
- [ ] Browser: navigating `/world` → camera is at overview position `[0, 8, 20]` (islands visible small in distance)
- [ ] Browser: navigating `/world/sample` → camera flies 1.5s to `[-8, 3, 0]` (sample island fills view); no instant snap
- [ ] Browser: on `/world` scrolling 0% → 100% — devtools console shows `[ST] waypoint-0 entered`, `[ST] waypoint-1 entered`, `[ST] waypoint-2 entered` each appearing exactly once
- [ ] Browser: existing `/world/sample` `<Html>` postOverlay still shows title + excerpt (regression check)
