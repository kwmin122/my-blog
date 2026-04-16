# Plan 07-03 Summary

**Status**: DONE_WITH_CONCERNS
**Duration**: ~45 minutes
**Tasks**: 8/8
**lint_status**: PASS

## Tasks Completed

- Task 1: Create MinimalModeToggle component with localStorage persistence ✅ 937001c
- Task 2: Mount MinimalModeToggle in app/layout.tsx ✅ e254e3f
- Task 3: Pause Lenis in SmoothScrollProvider when minimalMode is active ✅ 921742a
- Task 4: Add minimalMode bail-out to WorldScrollCamera and WorldMorphScroll + remove unused WorldMorphScrollHandles export ✅ 0b70eb8
- Task 5: Add minimalMode and live mq listener to WorldCursor (Phase 6 deferred fix) ✅ 5c8e660
- Task 6: Add minimalMode pause + ErrorBoundary + src validation to RiveSignBoard (Phase 6 deferred fixes) ✅ 8a1cf67
- Task 7: Fix ArchipelagoScene directionalLight color init (Phase 6 deferred L1 FAIL-3) ✅ 86ec4d6
- Task 8: Add minimal mode content display to app/world/[slug]/page.tsx ✅ d8faf07

## Fix Commits (auto-corrections within plan scope)

- b33fefe: Fix RiveSignBoard hooks-before-return lint violation (rules-of-hooks) — auto-corrected
- 292ff60: Fix MinimalModeContent to use children pattern (Server-to-Client Component serialization fix) — auto-corrected

## Deviations

### Deviation 1: RiveSignBoard src validation — hooks-before-return
**What happened:** The plan's code placed the `if (!src.startsWith('/assets/rive/')) return null` guard before all hooks, violating `react-hooks/rules-of-hooks`. ESLint reported 6 errors.
**Auto-correction:** Moved the validation check to after all hooks. Computed `isSrcValid = src.startsWith('/assets/rive/')` before hooks (no hook call, just computation), called all hooks unconditionally, then placed the early return after the last hook. The `useRive` call uses `src: isSrcValid ? src : ''` to avoid loading invalid assets even before the guard check.
**Acceptance criteria impact:** All plan criteria still met (RiveErrorBoundary, getDerivedStateFromError, src.startsWith check, minimalMode, rive.pause/play, [minimalMode, rive] dep array).

### Deviation 2: MinimalModeContent — children pattern instead of PostComponent prop
**What happened:** The plan passed `PostComponent: React.ComponentType` as a prop from a Server Component to a Client Component. This fails Next.js prerender with: "Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with 'use server'."
**Root cause:** Risk 6 in 07-RESEARCH.md explicitly identified this: "Render the full `<Post />` component server-side (always available as a prop), pass it to a `MinimalModeContent` client component that conditionally shows/hides based on `minimalMode`." The standard solution is passing pre-rendered JSX as `children` rather than passing the component function.
**Auto-correction:** Changed `MinimalModeContent` to accept `children: React.ReactNode` instead of `PostComponent: React.ComponentType`. The server component renders `<Post />` server-side and passes it as `<MinimalModeContent ...><Post /></MinimalModeContent>`. This is the idiomatic Next.js pattern.
**Acceptance criteria impact:** The plan criterion `MinimalModeContent contains 'PostComponent'` is NOT met in the final file — `PostComponent` was replaced by `children`. All other criteria are met. The component correctly achieves D-04d: minimal mode shows post content inline.

## Acceptance Criteria

- [x] components/ui/MinimalModeToggle.tsx exists with 'use client', export default, aria-pressed, localStorage, worldStore — verified
- [x] app/layout.tsx contains import MinimalModeToggle and <MinimalModeToggle /> — verified
- [x] SmoothScrollProvider.tsx contains useWorldStore, lenisRef, stop/start — verified
- [x] WorldScrollCamera.tsx contains minimalMode subscription, !isHomePage || minimalMode bail-out, updated deps — verified
- [x] WorldMorphScroll.tsx contains minimalMode subscription, !isHomePage || minimalMode bail-out, updated deps — verified
- [x] WorldMorphScroll.tsx does NOT contain WorldMorphScrollHandles — verified (0 matches)
- [x] WorldCursor.tsx contains minimalMode subscription, mq.matches || minimalMode guard, mq.addEventListener/removeEventListener change listener, [minimalMode] dep — verified
- [x] RiveSignBoard.tsx contains RiveErrorBoundary, getDerivedStateFromError, src.startsWith validation, minimalMode, rive.pause/play, [minimalMode, rive] — verified
- [x] ArchipelagoScene.tsx does NOT contain color={tokens.scene.sunlight} JSX prop — verified (0 matches)
- [x] ArchipelagoScene.tsx contains dirLightRef.current.color.set(tokens.scene.sunlight) — verified
- [x] components/world/MinimalModeContent.tsx exists with 'use client', export default function MinimalModeContent, useWorldStore, minimalMode — verified
- [x] app/world/[slug]/page.tsx contains import MinimalModeContent and <MinimalModeContent — verified
- [x] npx tsc --noEmit exits 0 — verified (all tasks)
- [x] pnpm lint exits 0 — verified (PASS)
- [x] pnpm build exits 0 — verified (all 14 pages prerendered)

## Concerns (DONE_WITH_CONCERNS)

1. **MinimalModeContent children vs PostComponent** — The plan's acceptance criterion for `MinimalModeContent contains 'PostComponent'` is not satisfied by the final implementation. The `children` pattern is the correct Next.js App Router approach for passing server-rendered content to client components. The plan's Risk 6 anticipated this exact problem but the acceptance criterion was not updated to reflect the correct implementation pattern. The semantic goal (D-04d: minimal mode shows post content inline) is fully achieved.

2. **RiveSignBoard hook order restructuring** — The src validation now happens in two steps: `isSrcValid` computed before hooks, then the `return null` guard after all hooks. In development, the `throw new Error` path will never be reached via the guard (it's after hooks), but `isSrcValid ? src : ''` passed to `useRive` prevents loading invalid assets. The development error throw still works correctly because `throw` before `return null` means it always throws in dev.
