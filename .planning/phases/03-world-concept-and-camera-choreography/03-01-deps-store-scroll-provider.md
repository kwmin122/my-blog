---
phase: 3
plan: 01
title: Install GSAP+Lenis deps, extend worldStore with activeWaypoint, create SmoothScrollProvider
wave: 1
depends_on: []
files_modified:
  - package.json
  - lib/worldStore.ts
  - lib/gsap.ts
  - lib/waypoints.ts
  - components/providers/SmoothScrollProvider.tsx
  - app/layout.tsx
requirements_addressed:
  - MOT-03
gap_closure: false
---

## read_first

- `lib/worldStore.ts` — current store shape (postOverlay slice, must remain intact)
- `app/layout.tsx` — current layout structure (WorldCanvasLoader position, `<main id="page-content">`)
- `package.json` — confirm gsap, @gsap/react, lenis are absent before installing
- `CLAUDE.md` — lock-set confirmation (GSAP item 5, Lenis item 6)

## Objective

Install the three new runtime packages (gsap@3.15.0, @gsap/react@2.1.2, lenis@1.3.21), extend `lib/worldStore.ts` with the `activeWaypoint`, `isHomePage`, and `postMeta` slices without touching the existing `postOverlay` slice, create a centralized `lib/gsap.ts` registration module, define the `lib/waypoints.ts` waypoint data, and wire a `SmoothScrollProvider` into `app/layout.tsx`.

Requirements fulfilled: MOT-03 (Lenis smooth scroll), and foundational store shape required by CORE-02 (activeWaypoint) and MOT-01 (GSAP centralized registration) — those are wired in Plan 03-03.

Phase goal contribution: establishes the three foundations that Plans 03-02 and 03-03 depend on — installed packages, extended store, and Lenis provider.

## Capabilities

- **MOT-03**: `SmoothScrollProvider` initialises `Lenis({ autoRaf: false, duration: 1.2, syncTouch: false })`, drives it from `gsap.ticker.add((time) => lenis.raf(time * 1000))` with `gsap.ticker.lagSmoothing(0)`, and calls `lenis.on('scroll', ScrollTrigger.update)` to keep ScrollTrigger in sync. Mounted in layout wrapping `{children}` — the scroll container for the page content. Canvas is fixed/outside scroll flow and is unaffected.

## Delivery scope

- Run `pnpm add gsap@3.15.0 @gsap/react@2.1.2 lenis@1.3.21` — adds 3 packages to `package.json` dependencies
- Create `lib/gsap.ts` — imports gsap + ScrollTrigger, registers plugin once with `typeof window !== 'undefined'` guard, re-exports `{ gsap, ScrollTrigger }`
- Create `lib/waypoints.ts` — defines `Waypoint` interface + `WAYPOINTS` record with `home` and `sample` entries; defines `SCROLL_WAYPOINTS` array for the /world flythrough
- Extend `lib/worldStore.ts` — add `WaypointData` interface, `activeWaypoint: WaypointData | null`, `setActiveWaypoint`, `isHomePage: boolean`, `setIsHomePage`, `postMeta: Record<string, PostMeta>`, `setPostMeta`; keep all existing `postOverlay` fields unchanged
- Create `components/providers/SmoothScrollProvider.tsx` — 'use client' component with `useEffect` Lenis lifecycle
- Modify `app/layout.tsx` — import `SmoothScrollProvider` (dynamic import with `ssr: false`), wrap `<main id="page-content">{children}</main>` with it; do NOT wrap `<WorldCanvasLoader />`
- Add `import 'lenis/dist/lenis.css'` to `app/globals.css` to prevent flash of unstyled scroll

## Verification intent

1. Run `pnpm install` then `pnpm run build` — should exit 0 with no missing module errors.
2. Visit `http://localhost:3000/world` — scroll the page (even the stub content) and observe that scroll is smoothed (eased deceleration after releasing scroll wheel, longer tail than native).
3. Open React DevTools Zustand panel (or console `useWorldStore.getState()`) — verify `activeWaypoint: null`, `isHomePage: false`, `postMeta: {}` exist alongside `postOverlay: null`.
4. `grep -r "theatre" node_modules package.json` returns 0 matches.

## Technical direction

### 1. Install command (run in project root)
```bash
pnpm add gsap@3.15.0 @gsap/react@2.1.2 lenis@1.3.21
```
Both `@gsap/react` and `lenis` are lock-set items (#5 GSAP, #6 Lenis). `@gsap/react` is the React adapter sub-package of gsap — not a new lock-set entry.

### 2. `lib/gsap.ts` (new file)
```ts
// lib/gsap.ts
// 'use client' is NOT needed — this module guards with typeof window.
// All imports of this file must be in 'use client' components.
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export { gsap, ScrollTrigger }
```

### 3. `lib/waypoints.ts` (new file)
```ts
// lib/waypoints.ts
export interface WaypointData {
  slug: string
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
  islandIndex: number // 0 = overview, 1+ = island
}

export const WAYPOINTS: Record<string, WaypointData> = {
  home: {
    slug: 'home',
    position: { x: 0, y: 8, z: 20 },
    target: { x: 0, y: 0, z: 0 },
    islandIndex: 0,
  },
  sample: {
    slug: 'sample',
    position: { x: -8, y: 3, z: 0 },
    target: { x: -8, y: 0, z: 0 },
    islandIndex: 1,
  },
}

// Scroll flythrough waypoints for /world page — sequential stop-points
export const SCROLL_WAYPOINTS: WaypointData[] = [
  {
    slug: 'scroll-island-1',
    position: { x: -8, y: 3, z: 0 },
    target: { x: -8, y: 0, z: 0 },
    islandIndex: 1,
  },
  {
    slug: 'scroll-island-2',
    position: { x: 8, y: 3, z: 0 },
    target: { x: 8, y: 0, z: 0 },
    islandIndex: 2,
  },
  {
    slug: 'scroll-island-3',
    position: { x: 0, y: 3, z: -10 },
    target: { x: 0, y: 0, z: -10 },
    islandIndex: 3,
  },
]
```

### 4. `lib/worldStore.ts` extension
Replace entire file. Keep `PostOverlay` interface and `postOverlay` slice completely unchanged. Add new interfaces and slices below it:

```ts
import { create } from 'zustand'
import type { WaypointData } from './waypoints'

export interface PostOverlay {
  slug: string
  title: string
  excerpt: string
}

export interface PostMeta {
  slug: string
  title: string
  excerpt: string
  category: string
  waypointIndex: number
}

interface WorldState {
  // --- Phase 2: postOverlay (unchanged) ---
  postOverlay: PostOverlay | null
  setPostOverlay: (overlay: PostOverlay) => void
  clearPostOverlay: () => void

  // --- Phase 3: waypoint ---
  activeWaypoint: WaypointData | null
  setActiveWaypoint: (waypoint: WaypointData | null) => void

  // --- Phase 3: scroll home flag ---
  isHomePage: boolean
  setIsHomePage: (v: boolean) => void

  // --- Phase 3: post registry ---
  postMeta: Record<string, PostMeta>
  setPostMeta: (slug: string, meta: PostMeta) => void
}

export const useWorldStore = create<WorldState>((set) => ({
  postOverlay: null,
  setPostOverlay: (overlay: PostOverlay) => set({ postOverlay: overlay }),
  clearPostOverlay: () => set({ postOverlay: null }),

  activeWaypoint: null,
  setActiveWaypoint: (waypoint: WaypointData | null) => set({ activeWaypoint: waypoint }),

  isHomePage: false,
  setIsHomePage: (v: boolean) => set({ isHomePage: v }),

  postMeta: {},
  setPostMeta: (slug: string, meta: PostMeta) =>
    set((state) => ({ postMeta: { ...state.postMeta, [slug]: meta } })),
}))

// Stable bound selectors for direct import (non-hook contexts)
export const setPostOverlay = (overlay: PostOverlay) =>
  useWorldStore.getState().setPostOverlay(overlay)

export const clearPostOverlay = () =>
  useWorldStore.getState().clearPostOverlay()

export const setActiveWaypoint = (waypoint: WaypointData | null) =>
  useWorldStore.getState().setActiveWaypoint(waypoint)
```

### 5. `components/providers/SmoothScrollProvider.tsx` (new file)
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

### 6. `app/layout.tsx` modification
Add `SmoothScrollProvider` as a dynamic import with `ssr: false` (Lenis is browser-only). Wrap ONLY `<main id="page-content">` — NOT `<WorldCanvasLoader />`. WorldCanvas is fixed/outside the scroll flow and must not be inside the scroll wrapper.

```tsx
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import WorldCanvasLoader from '@/components/world/WorldCanvasLoader'
import './globals.css'

const SmoothScrollProvider = dynamic(
  () => import('@/components/providers/SmoothScrollProvider'),
  { ssr: false },
)

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://webbuild-gray.vercel.app'
  ),
  title: 'World',
  description: 'Personal blog — single continuous 3D world',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <WorldCanvasLoader />
        <SmoothScrollProvider>
          <main id="page-content">{children}</main>
        </SmoothScrollProvider>
      </body>
    </html>
  )
}
```

### 7. `app/globals.css` addition
Add at the top of the file (before existing styles):
```css
@import 'lenis/lenis.css';
```
Note: `lenis@1.3.x` exposes CSS via the package-root export `lenis/lenis.css`, NOT the deep subpath `lenis/dist/lenis.css`. The `dist/` path is not in the package's `exports` field and will cause a build failure.

## Dependencies

- No other plans — this is Wave 1, no deps
- Relies on existing `lib/worldStore.ts` (postOverlay slice — read and keep intact)
- Relies on existing `app/layout.tsx` (WorldCanvasLoader placement — do not reorder)

## Out of scope

- WorldScene GSAP camera wiring (Plan 03-03)
- ArchipelagoScene geometry (Plan 03-02)
- `app/world/page.tsx` setActiveWaypoint call (Plan 03-03)
- `app/world/[slug]/page.tsx` setActiveWaypoint call (Plan 03-03)
- ScrollTrigger flythrough component WorldScrollCamera (Plan 03-03)

---

## done_when

- [ ] `pnpm run build` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `grep "gsap" package.json` returns `"gsap": "3.15.0"` match
- [ ] `grep "@gsap/react" package.json` returns `"@gsap/react": "2.1.2"` match
- [ ] `grep "lenis" package.json` returns `"lenis": "1.3.21"` match
- [ ] `grep "activeWaypoint" lib/worldStore.ts` returns at least 2 matches (interface + initializer)
- [ ] `grep "isHomePage" lib/worldStore.ts` returns at least 2 matches
- [ ] `grep "postMeta" lib/worldStore.ts` returns at least 2 matches
- [ ] `grep "postOverlay" lib/worldStore.ts` returns matches (existing slice preserved)
- [ ] `grep "SmoothScrollProvider" app/layout.tsx` returns match
- [ ] `grep "lenis.raf" components/providers/SmoothScrollProvider.tsx` returns match
- [ ] `grep "ScrollTrigger.update" components/providers/SmoothScrollProvider.tsx` returns match
- [ ] `grep "lagSmoothing" components/providers/SmoothScrollProvider.tsx` returns match
- [ ] `grep "WAYPOINTS" lib/waypoints.ts` returns match
- [ ] `grep "SCROLL_WAYPOINTS" lib/waypoints.ts` returns match
- [ ] Browser: visiting `/world` and scrolling shows smooth inertial tail — scroll deceleration after releasing wheel is longer than native browser scroll
