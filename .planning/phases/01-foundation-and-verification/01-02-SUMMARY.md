# Phase 1 Plan 01-02 — Execution Summary

**Plan:** WorldCanvas + Renderer Fallback + Perf Scaffold
**Executed:** 2026-04-14T00:00:00+09:00
**Status:** completed
**lint_status:** PASS

## Tasks Completed
- [x] Task 1: lib/perf.ts — commit 0ac2a57
- [x] Task 2: WorldScene.tsx — commit 2bc144b
- [x] Task 3: WorldCanvas.tsx — commit 8bedcd8
- [x] Task 4: app/layout.tsx updated — commit bdf80dd
- [x] Task 5: LCPObserver.tsx + text/[slug] updated — commit dbfc544
- [x] Task 6: lint gate verification — commit a37b3af

## Key Files Created
- lib/perf.ts — markWorldFirstFrame(), observeTextLCP()
- components/world/WorldScene.tsx — useFrame one-shot perf mark
- components/world/WorldCanvas.tsx — WebGPU/WebGL2/poster fallback chain, uses next/image + next/link
- components/world/WorldCanvasLoader.tsx — 'use client' wrapper that holds the dynamic ssr:false import (deviation, see Notes)
- components/text/LCPObserver.tsx — LCP measurement client wrapper

## Lint Gate
pnpm run build: PASS (Route (app) summary output, exit 0)
pnpm run lint: PASS (exit 0, 0 warnings, 0 errors)
npx tsc --noEmit: PASS (exit 0, no output)

## Acceptance Criteria Verified
- data-canvas-id wrapper: yes (div wrapping Canvas at components/world/WorldCanvas.tsx:86)
- forceWebGL: mode === 'webgl2': yes (WorldCanvas.tsx:72)
- await renderer.init(): yes (WorldCanvas.tsx:73)
- StaticPosterFallback with /text/ link: yes (uses next/link href="/text")
- [renderer] selected: console.log: yes (WorldCanvas.tsx:75)
- [perf] markers: yes (lib/perf.ts lines 6, 13)

## Notes

### Deviation 1: dynamic({ ssr: false }) moved to client wrapper
Next.js 16 Turbopack enforces that `dynamic` with `ssr: false` cannot be used in Server Components (layout.tsx is a Server Component). The plan's `layout.tsx` snippet used `dynamic` directly in the layout, which fails in Next.js 16.

**Resolution:** Created `components/world/WorldCanvasLoader.tsx` as a `'use client'` module that holds the `dynamic(() => import('@/components/world/WorldCanvas'), { ssr: false })` call. `layout.tsx` imports `WorldCanvasLoader` directly (no dynamic needed). The ssr:false protection is intact — WorldCanvas is still never evaluated during SSR.

The `ssr: false` criterion for `app/layout.tsx` is now satisfied via `WorldCanvasLoader.tsx` (same effect, different file). The `app/layout.tsx` file does not contain `ssr: false` literally but the WorldCanvas is still excluded from SSR.

### Deviation 2: ESLint disable comment pattern
The project ESLint config (`eslint-config-next`) does NOT enable `@typescript-eslint/no-explicit-any`. All `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments generated "unused disable directive" warnings. All such comments were removed — the `as any` casts pass lint without them.

The `react-hooks/set-state-in-effect` rule IS active and flags `setMode(detectMode())` in useEffect. Added a single targeted `// eslint-disable-next-line react-hooks/set-state-in-effect` with an explanatory comment since this pattern is the correct Next.js hydration guard approach specified by the plan.

### Deviation 3: next/image and next/link required
The `@next/next/no-img-element` and `@next/next/no-html-link-for-pages` lint rules required replacing `<img>` with `next/image <Image>` and `<a>` with `next/link <Link>` in StaticPosterFallback. The functional behavior is identical.
