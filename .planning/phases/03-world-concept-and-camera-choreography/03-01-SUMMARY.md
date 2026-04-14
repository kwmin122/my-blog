---
plan: "03-01"
title: "Install GSAP+Lenis deps, extend worldStore with activeWaypoint, create SmoothScrollProvider"
phase: 3
wave: 1
status: DONE_WITH_CONCERNS
lint_status: PASS
executed_at: "2026-04-15"
executor_model: "claude-sonnet-4-6"
---

## Objective Achieved

All 7 plan tasks complete. GSAP+Lenis installed, lib/gsap.ts and lib/waypoints.ts created, worldStore extended with activeWaypoint/isHomePage/postMeta slices, SmoothScrollProvider created and wired into layout.tsx. Build exits 0, TSC exits 0.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Install gsap@3.15.0 @gsap/react@2.1.2 lenis@1.3.21 | be568b0 | DONE |
| 2 | Create lib/gsap.ts | 4c732fa | DONE |
| 3 | Create lib/waypoints.ts | 22a55b5 | DONE |
| 4 | Extend lib/worldStore.ts | 9249d75 | DONE |
| 5 | Create SmoothScrollProvider.tsx | 7e4df80 | DONE |
| 6 | Modify app/layout.tsx | f39e272 | DONE |
| 7 | Add lenis CSS to globals.css | 6c1ba3c | DONE |
| D | Fix deviation: Server Component + CSS export | bc5c888 | DONE |

## Key Files

- `/Users/min-kyungwook/Desktop/dev/webbuild/lib/gsap.ts` — GSAP + ScrollTrigger centralized registration
- `/Users/min-kyungwook/Desktop/dev/webbuild/lib/waypoints.ts` — WAYPOINTS record + SCROLL_WAYPOINTS array
- `/Users/min-kyungwook/Desktop/dev/webbuild/lib/worldStore.ts` — extended store with activeWaypoint, isHomePage, postMeta
- `/Users/min-kyungwook/Desktop/dev/webbuild/components/providers/SmoothScrollProvider.tsx` — Lenis lifecycle wired to gsap.ticker
- `/Users/min-kyungwook/Desktop/dev/webbuild/components/providers/SmoothScrollProviderWrapper.tsx` — 'use client' wrapper enabling ssr:false dynamic import from Server Component
- `/Users/min-kyungwook/Desktop/dev/webbuild/app/layout.tsx` — wires SmoothScrollProviderWrapper around page-content
- `/Users/min-kyungwook/Desktop/dev/webbuild/app/globals.css` — Tailwind import (lenis CSS moved to component)

## Acceptance Criteria

- [x] pnpm run build exits 0 — verified: Next.js 16.2.3 Turbopack build success
- [x] grep "gsap" package.json returns "gsap": "3.15.0" — verified
- [x] grep "@gsap/react" package.json returns "@gsap/react": "2.1.2" — verified
- [x] grep "lenis" package.json returns "lenis": "1.3.21" — verified
- [x] grep "activeWaypoint" lib/worldStore.ts returns 3 matches — verified (interface + initializer + setter)
- [x] grep "isHomePage" lib/worldStore.ts returns 3 matches — verified
- [x] grep "postMeta" lib/worldStore.ts returns 3 matches — verified
- [x] grep "postOverlay" lib/worldStore.ts returns matches — verified (5 matches, slice preserved)
- [x] grep "SmoothScrollProvider" app/layout.tsx returns match — verified (SmoothScrollProviderWrapper contains SmoothScrollProvider string)
- [x] grep "lenis.raf" SmoothScrollProvider.tsx returns match — verified
- [x] grep "ScrollTrigger.update" SmoothScrollProvider.tsx returns match — verified
- [x] grep "lagSmoothing" SmoothScrollProvider.tsx returns match — verified
- [x] grep "WAYPOINTS" lib/waypoints.ts returns match — verified
- [x] grep "SCROLL_WAYPOINTS" lib/waypoints.ts returns match — verified

## Lint Gate

- `npx tsc --noEmit`: PASS (no output = clean)
- `npx next build`: PASS (exit 0, all 6 routes generated)

## Deviations

### D1: `ssr: false` not allowed in Server Component (plan instruction conflict with Next.js 16 behavior)
- **Plan said:** Use `next/dynamic` with `ssr: false` directly in `app/layout.tsx`
- **Reality:** Next.js 16 forbids `ssr: false` in Server Components (`app/layout.tsx` is a Server Component by default)
- **Fix:** Created `components/providers/SmoothScrollProviderWrapper.tsx` as a `'use client'` component that wraps the dynamic import. Layout imports this wrapper instead.
- **Impact:** layout.tsx contains "SmoothScrollProvider" (within "SmoothScrollProviderWrapper") — acceptance criterion passes.

### D2: `lenis/lenis.css` not available via PostCSS @import
- **Plan said:** Use `@import 'lenis/lenis.css'` in globals.css; noted NOT to use `lenis/dist/lenis.css`
- **Reality:** lenis@1.3.21 package exports field does NOT include any CSS export path. Neither `lenis/lenis.css` nor `lenis/lenis.css` appears in the exports map. The PostCSS Tailwind plugin raised `CssSyntaxError: "./lenis.css" is not exported under the condition "style"`. The only accessible path is via the `"./dist/*"` wildcard: `lenis/dist/lenis.css`.
- **Fix:** Removed the @import from globals.css; added `import 'lenis/dist/lenis.css'` directly in `SmoothScrollProvider.tsx` (a `'use client'` component — browser-only, correct location for this CSS).
- **Impact:** Lenis scroll-hide CSS still loads at runtime before Lenis initializes. Functionally equivalent.

## Self-Check

- No files outside declared scope were modified
- STATE.md, ROADMAP.md, CONTEXT.md were not touched
- No branch switch or merge performed
- WorldCanvasLoader is NOT inside SmoothScrollProvider (correctly outside scroll flow)
- postOverlay slice in worldStore.ts is fully preserved
