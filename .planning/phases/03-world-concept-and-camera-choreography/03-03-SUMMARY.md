---
plan: "03-03"
title: "Camera choreography — WorldCameraRig + route-change GSAP transitions + /world ScrollTrigger flythrough + waypoint store wiring"
phase: 3
wave: 2
status: DONE
lint_status: PASS
executed_at: "2026-04-15"
executor_model: "claude-sonnet-4-6"
---

## Objective Achieved

Wired camera movement to the zustand waypoint store via two null-render camera-driving components (WorldCameraRig, WorldScrollCamera), and connected all page components to the store so that route changes and scroll events drive camera position and orientation through GSAP transitions.

## Tasks Completed

| # | Title | File(s) | Commit |
|---|-------|---------|--------|
| 1 | Create WorldCameraRig.tsx | components/world/WorldCameraRig.tsx | eb92fca |
| 2 | Create WorldScrollCamera.tsx | components/world/WorldScrollCamera.tsx | 750cff9 |
| 3 | Add camera rigs to WorldScene | components/world/WorldScene.tsx | 8440dfa |
| 4 | Create WorldPostWaypointSync.tsx | components/world/WorldPostWaypointSync.tsx | 8631843 |
| 5 | Wire app/world/page.tsx | app/world/page.tsx | a850753 |
| 6 | Add WorldPostWaypointSync to [slug]/page.tsx | app/world/[slug]/page.tsx | 5a9c6f9 |

## Key Files

- `/Users/min-kyungwook/Desktop/dev/webbuild/components/world/WorldCameraRig.tsx` (new)
- `/Users/min-kyungwook/Desktop/dev/webbuild/components/world/WorldScrollCamera.tsx` (new)
- `/Users/min-kyungwook/Desktop/dev/webbuild/components/world/WorldPostWaypointSync.tsx` (new)
- `/Users/min-kyungwook/Desktop/dev/webbuild/components/world/WorldScene.tsx` (modified)
- `/Users/min-kyungwook/Desktop/dev/webbuild/app/world/page.tsx` (modified)
- `/Users/min-kyungwook/Desktop/dev/webbuild/app/world/[slug]/page.tsx` (modified)

## Acceptance Criteria

- [x] `pnpm run build` exits 0 — verified: `next build` succeeded with all 6 routes generated
- [x] `npx tsc --noEmit` exits 0 — verified: no output (clean)
- [x] `grep "WorldCameraRig" components/world/WorldScene.tsx` returns match — lines 9, 25
- [x] `grep "WorldScrollCamera" components/world/WorldScene.tsx` returns match — lines 10, 26
- [x] `grep "useGSAP" components/world/WorldCameraRig.tsx` returns match — lines 4, 12
- [x] `grep "power2.inOut" components/world/WorldCameraRig.tsx` returns match — line 21
- [x] `grep "duration: 1.5" components/world/WorldCameraRig.tsx` returns match — line 20
- [x] `grep "camera.lookAt" components/world/WorldCameraRig.tsx` returns match — line 23
- [x] `grep "ScrollTrigger" components/world/WorldScrollCamera.tsx` returns match — lines 5, 16, 18, 48
- [x] `grep "scrub" components/world/WorldScrollCamera.tsx` returns match — line 26
- [x] `grep "ST.*waypoint" components/world/WorldScrollCamera.tsx` returns match — line 40
- [x] `grep "WorldPostWaypointSync" app/world/[slug]/page.tsx` returns match — lines 5, 42
- [x] `grep "setActiveWaypoint" components/world/WorldPostWaypointSync.tsx` returns match — lines 4, 12, 14
- [x] `grep "setActiveWaypoint" app/world/page.tsx` returns match — lines 8, 12, 15
- [x] `grep "setIsHomePage" app/world/page.tsx` returns match — lines 9, 13, 16
- [x] `grep "WAYPOINTS.home" app/world/page.tsx` returns match — line 12

## Lint Gate

- `npx tsc --noEmit`: PASS (no output)
- `npx next build`: PASS (exit 0, 6/6 routes, no errors)

## Deviations

None. The plan matched reality exactly:
- worldStore.ts already exported the stable `setActiveWaypoint` bound selector (Plan 03-01 delivered this)
- app/world/[slug]/page.tsx was confirmed as Server Component and was NOT converted to 'use client'
- WorldPostWaypointSync uses the bound selector (`import { setActiveWaypoint } from '@/lib/worldStore'`) not the hook, as specified
- app/world/page.tsx uses the hook versions (via useWorldStore) as specified since it is a new 'use client' component

## Self-Check

- WorldCameraRig: null-render R3F component, `useGSAP({ dependencies: [activeWaypoint] })` fires gsap.to on camera.position with 1.5s power2.inOut ease and lookAt onUpdate callback
- WorldScrollCamera: null-render R3F component, `useGSAP({ dependencies: [isHomePage] })` creates ScrollTrigger timeline on #page-content scrub:1, three SCROLL_WAYPOINTS each logging [ST] waypoint-N entered via onStart
- WorldScene: WorldCameraRig and WorldScrollCamera rendered as first children before ArchipelagoScene
- WorldPostWaypointSync: sets waypoint on slug mount using stable bound selector, clears on unmount
- app/world/page.tsx: 300vh scroll room, sets WAYPOINTS.home + isHomePage true on mount, clears on unmount
- app/world/[slug]/page.tsx: remains Server Component, WorldPostWaypointSync added as sibling to WorldPostPanel
