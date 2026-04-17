# Phase 7: Content, A11Y Polish & Cognitive Toggle — Research

**Researched:** 2026-04-16
**Domain:** Content schema validation, alt sidecar JSON, SR-only DOM accessibility, cognitive minimal mode
**Confidence:** HIGH (all findings derived from direct code inspection of the live codebase)

---

## Summary

Phase 7 closes four requirements (CONT-02, CONT-03, A11Y-01, A11Y-02) that together form the accessibility and content completeness gate for v1.0. All four requirements build on infrastructure already present in the codebase — `lib/posts.ts`, `lib/worldStore.ts`, and the component layer are ready extension points. No new packages are needed; the lock-set is sufficient for every requirement.

The work divides cleanly into a data-first sequence: (1) schema enforcement — validate category enum and minimum count at build time — (2) alt sidecar JSON schema finalization and `getAltData()` utility, (3) `WorldSRMirror` DOM component that consumes frontmatter + alt data, (4) `worldStore` minimal-mode slice and the cascaded pause logic across Lenis, GSAP, WorldCursor, and Rive. Phase 6 left seven tracked deferred items; this research identifies which four are in scope for Phase 7 and which three should stay deferred.

**Primary recommendation:** Implement in data-contract-first order: schema/validation → alt util → SR mirror → minimal mode. Each step adds a concrete contract the next step depends on; doing them out of order creates rework.

---

## User Constraints (from CONTEXT.md)

These are locked decisions from `/sunco:discuss 7`. The planner MUST honor them verbatim.

- **D-01a** — Allowed categories: `일기 | 공부 | 일지` only. Any other value = build failure. `sample.mdx`'s `category: '탐험'` must be changed.
- **D-01b** — Minimum 5 `.mdx` files; each of the three categories represented at least once.
- **D-01c** — Validation via `validatePostsMeta()` in `lib/posts.ts`, called from `next.config.ts` during build (not lint-only, not vitest-only).
- **D-02a** — Every `.mdx` must have a sibling `.alt.json` with the same basename. CI check required.
- **D-02b** — Alt JSON schema: `{ "visuals": [{ "id": string, "alt": string }] }`. The top-level `"slug"` field in `sample.alt.json` is vestigial and should be removed.
- **D-02c** — `getAltData(slug)` utility in `lib/posts.ts`; consumed by Phase 7 SR mirror.
- **D-03a** — `WorldSRMirror` is a sibling of `<canvas>`, NOT inside `<Html>` 3D layer.
- **D-03b** — Each waypoint: static `<div class="sr-only">` with title + excerpt + alt visuals; only active waypoint gets `aria-live="polite"`.
- **D-03c** — Single source of truth for SR content = MDX frontmatter + `.alt.json`. No scraping from `<Html>` excerpts.
- **D-03d** — `components/world/WorldSRMirror.tsx` (new file); subscribes to `worldStore.activeWaypoint.slug`.
- **D-04a** — `localStorage` key `world:minimal-mode`; read on first mount; SSR-safe (read only inside `useEffect`).
- **D-04b** — Toggle rendered in existing header or `<UIOverlay>` — must be keyboard-reachable at all times.
- **D-04c** — Minimal mode pauses: Lenis scroll, GSAP camera/morph animations, WorldCursor magnet effect, Rive autoplay/interaction.
- **D-04d** — Minimal mode replaces `<main>` content with `/text/{slug}` inline render (or link). 3D scene stays but is static.
- **D-04e** — `worldStore` gains `minimalMode: boolean` + `setMinimalMode(v: boolean)` slice; components subscribe individually.

**Out of scope (deferred to Phase 8):** SplineIslandProp Suspense boundary, WorldKeyboardNav Escape trap, aria-describedby deep linking.

---

## Project Constraints (from CLAUDE.md)

- Lock-set: 12 libraries only. No new dependencies without design doc revision.
- `lib/posts.ts` is `import 'server-only'` — must stay server-only. `validatePostsMeta()` and `getAltData()` both run at build/server time only.
- `next.config.ts` wraps `withMDX(nextConfig)` — any build-time hook must be compatible with this wrapper pattern.
- MDX metadata pattern is `export const metadata = { title, excerpt, date, category }` — not frontmatter YAML.
- `<WorldCanvas>` is a persistent layout component — never re-mounts on route change.
- Architecture principle: 3D layer (`<Html>`) and accessibility layer (DOM) are explicitly separated.

---

## Standard Stack

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.12 | `minimalMode` slice, activeWaypoint subscription | Already used for all global state |
| @next/mdx | 16.2.3 | MDX compilation, `export const metadata` pattern | Already in use; no new dep needed |
| node:fs (built-in) | — | `validatePostsMeta()`, `getAltData()` at build time | Already used in `lib/posts.ts` |
| gsap | 3.15.0 | `gsap.matchMedia` / `gsap.killTweensOf` for minimal mode pause | Already used in WorldScrollCamera, WorldMorphScroll |
| Lenis | 1.3.21 | `.stop()` / `.start()` for minimal mode | Already used in SmoothScrollProvider |
| @rive-app/react-canvas | 4.28.0 | `useRive` `pause()` in RiveSignBoard | Already used |

---

## Architecture Patterns

### A. Content Schema Validation (D-01)

`lib/posts.ts` already has `getPostSlugs()` using `readdirSync`. `validatePostsMeta()` must:
1. Read all `.mdx` slugs via `getPostSlugs()`.
2. Dynamically `require()`/`import()` each MDX file's exported `metadata` object — BUT this cannot use `await import()` at the Node script level inside `next.config.ts` because `next.config.ts` is synchronous at module evaluation. The safe pattern is a sync read of the MDX file text and extraction of the `export const metadata = { ... }` literal via regex or JSON parse of a generated manifest.

**Recommended approach for build-time validation:** Add a `scripts/validate-posts.mjs` (plain Node ESM) that reads each MDX file as text, extracts the metadata object with regex (`/category:\s*'([^']+)'/`), validates enum membership and minimum count, then `process.exit(1)` on failure. In `package.json` `build` script: `"build": "node scripts/validate-posts.mjs && next build"`. This is simpler and more reliable than hooking into `next.config.ts`'s module evaluation scope. The CONTEXT.md says "next.config.ts または content loader에서 빌드 타임 throw" — a pre-build script achieves the same contract without the sync/async mismatch risk.

However, CONTEXT.md D-01c says explicitly: `validatePostsMeta()` in `lib/posts.ts` → called from `next.config.ts`. The `next.config.ts` exports a config object that is evaluated synchronously. If `validatePostsMeta()` is purely synchronous (reads files with `readdirSync` + `readFileSync` + regex parse on the metadata block), it CAN be called at the top of `next.config.ts` before the config object is constructed. This works because `readdirSync`/`readFileSync` are sync. Node.js module eval is synchronous. The function does not need dynamic `import()`.

**Concrete pattern:**

```typescript
// lib/posts.ts (additions)
import { readFileSync } from 'node:fs'

const VALID_CATEGORIES = ['일기', '공부', '일지'] as const
type ValidCategory = typeof VALID_CATEGORIES[number]

export function validatePostsMeta(): void {
  const slugs = getPostSlugs()
  if (slugs.length < 5) {
    throw new Error(`[CONT-02] .mdx 파일이 ${slugs.length}편입니다. 5편 이상 필요.`)
  }
  const categoryCounts: Record<string, number> = {}
  for (const slug of slugs) {
    const filePath = join(process.cwd(), 'content', 'posts', `${slug}.mdx`)
    const text = readFileSync(filePath, 'utf-8')
    const match = text.match(/category:\s*['"](.+?)['"]/)
    const category = match?.[1]
    if (!category || !(VALID_CATEGORIES as readonly string[]).includes(category)) {
      throw new Error(`[CONT-02] ${slug}.mdx category '${category}'는 유효하지 않습니다. 허용값: ${VALID_CATEGORIES.join(', ')}`)
    }
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1
  }
  for (const cat of VALID_CATEGORIES) {
    if (!categoryCounts[cat]) {
      throw new Error(`[CONT-02] '${cat}' 카테고리 글이 없습니다. 각 카테고리 1편 이상 필요.`)
    }
  }
}
```

```typescript
// next.config.ts (additions at top, before NextConfig object)
import { validatePostsMeta } from './lib/posts'
// Only run validation during actual builds (not in IDE type-check or vitest)
if (process.env.NEXT_PHASE !== 'phase-development-server') {
  validatePostsMeta()
}
```

**IMPORTANT CAVEAT:** `lib/posts.ts` has `import 'server-only'` at line 1. Importing it from `next.config.ts` (which runs in Node context, not Next.js server runtime) will trigger the `server-only` module throwing. The `server-only` package throws when imported outside the Next.js server runtime. Solution: either (a) move `validatePostsMeta()` to a separate `lib/validate-posts.ts` file without the `server-only` import, or (b) wrap the `server-only` import in a conditional. Option (a) is cleaner — create `lib/validate-posts.ts` without `server-only`, import `getPostSlugs` from it or duplicate the minimal read logic. This is a key implementation nuance the planner must address.

### B. Alt JSON Schema (D-02)

Current `sample.alt.json`: `{ "slug": "sample", "visuals": [] }`.
Required schema: `{ "visuals": [{ "id": string, "alt": string }] }`.
The `"slug"` field is vestigial. The planner should update `sample.alt.json` to conform to the D-02b schema and drop `"slug"`.

`getAltData(slug)` pattern:

```typescript
// lib/validate-posts.ts (or lib/posts.ts if server-only is resolved)
import { readFileSync, existsSync } from 'node:fs'

export interface AltVisual {
  id: string
  alt: string
}
export interface AltData {
  visuals: AltVisual[]
}

export function getAltData(slug: string): AltData {
  const altPath = join(process.cwd(), 'content', 'posts', `${slug}.alt.json`)
  if (!existsSync(altPath)) return { visuals: [] }
  const raw = readFileSync(altPath, 'utf-8')
  const parsed = JSON.parse(raw) as Partial<AltData>
  return { visuals: parsed.visuals ?? [] }
}
```

**CI check for alt JSON existence:** The CI check can be part of `validatePostsMeta()` — for each slug, check that `${slug}.alt.json` exists alongside the `.mdx`. If not, throw (or warn). No separate CI job needed if this is folded into the existing build-time throw pattern.

### C. SR-only DOM Mirror (D-03)

`WorldSRMirror.tsx` is a plain React DOM component (no R3F). It renders outside the `<canvas>` as a sibling in the DOM. Looking at `app/layout.tsx`, the natural placement is inside `<UIOverlay>` alongside `<WorldCursor>` — both are visual/accessibility overlays that persist across routes.

The component subscribes to `worldStore.activeWaypoint` to know the currently active slug, and to `worldStore.postMeta` which already stores `{ slug, title, excerpt, category, waypointIndex }` records populated by Phase 3. However, `WorldSRMirror` needs not just the active waypoint but ALL post metadata to render static `sr-only` divs for every waypoint. The static divs should be rendered from a static list (passed as props or derived from a server component) to avoid SR reading only the currently visible one.

**Key design decision:** WorldSRMirror needs the full posts metadata list (all slugs + their frontmatter title/excerpt + alt visuals). This data is available at build time. The cleanest pattern:
- In `app/world/[slug]/page.tsx` or in `app/layout.tsx`, gather all post metadata at the server component level and pass it down via props or a context.
- OR: mount `WorldSRMirror` as a Server Component that reads posts at build time, converting it to a client-only component for the aria-live part only.

The current architecture: `app/layout.tsx` is a Server Component. `UIOverlay` is a `'use client'` component (wraps children). The approach: render `WorldSRMirror` from within `app/layout.tsx` as a server component that fetches all post slugs/metadata, then embeds a `WorldSRMirrorClient` that receives the static list and only does the aria-live subscription on the client.

**Simpler alternative that still works:** Make `WorldSRMirror` fully client-side, read all slugs from a static JSON manifest generated at build time, or pass all data as a server-rendered prop. Given the small number of posts (5), a static array hardcoded or imported from a generated JSON is acceptable.

**aria-live strategy:**

```tsx
// components/world/WorldSRMirror.tsx
'use client'
import { useWorldStore } from '@/lib/worldStore'

interface PostSRData {
  slug: string
  title: string
  excerpt: string
  visuals: { id: string; alt: string }[]
}

export default function WorldSRMirror({ posts }: { posts: PostSRData[] }) {
  const activeWaypoint = useWorldStore((s) => s.activeWaypoint)
  const activeSlug = activeWaypoint?.slug

  return (
    <div aria-label="월드 콘텐츠 접근성 미러" className="sr-only">
      {/* Static descriptors — always present for AT crawling */}
      {posts.map((post) => (
        <div key={post.slug} id={`sr-post-${post.slug}`}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
          {post.visuals.map((v) => (
            <p key={v.id}>{v.alt}</p>
          ))}
        </div>
      ))}
      {/* Live region — only the active waypoint content is announced */}
      <div aria-live="polite" aria-atomic="true">
        {activeSlug && posts.find((p) => p.slug === activeSlug)?.title
          ? `현재 위치: ${posts.find((p) => p.slug === activeSlug)?.title}`
          : null}
      </div>
    </div>
  )
}
```

The parent server component calls `getPostSlugs()` and `getAltData(slug)` for each, then passes the assembled array to `WorldSRMirror`.

### D. Minimal Mode Toggle (D-04)

**worldStore slice addition:**

```typescript
// lib/worldStore.ts additions
minimalMode: boolean
setMinimalMode: (v: boolean) => void
```

Initial value: `false` (not reading localStorage in store initializer — localStorage is browser-only and causes SSR mismatch if read at module level). The component that mounts the toggle reads `localStorage` in `useEffect` and calls `setMinimalMode()` once on mount.

**Pause APIs per subsystem:**

- **Lenis:** `lenis` instance is local to `SmoothScrollProvider`. Two options: (a) expose lenis instance via a React ref or context so WorldMinimalToggle can call `lenis.stop()` / `lenis.start()`, or (b) have `SmoothScrollProvider` subscribe to `worldStore.minimalMode` directly and pause/resume internally. Option (b) is architecturally cleaner (no prop drilling, consistent with the store-subscription pattern used elsewhere).

- **GSAP camera/morph animations:** `WorldScrollCamera` and `WorldMorphScroll` already use `gsap.matchMedia()` with `reduceMotion` condition. Minimal mode can use the same `mm.add()` pattern by adding a media query-like condition using a custom matchMedia substitute, OR more simply: both components subscribe to `worldStore.minimalMode` in their `useGSAP` dependency array and call `tl.pause()` / `tl.resume()`. The cleanest approach: add `minimalMode` to the `useGSAP` dependency array and use `if (minimalMode) return` at the top of the hook body (same as `if (!isHomePage) return`). This kills and recreates the timeline cleanly via `revertOnUpdate: true`.

- **WorldCursor:** Subscribe to `minimalMode`; if true, skip the ticker registration and `cursor-none` class. The existing `useEffect` already checks `prefers-reduced-motion` — the same guard pattern extends naturally to `minimalMode`.

- **Rive autoplay:** `RiveSignBoard` passes `autoplay: true` to `useRive`. With `minimalMode`, the `.riv` should not autoplay. The `useRive` hook returns a `rive` object with `rive.pause()` method. Add a `useEffect` in `RiveSignBoard` that watches `minimalMode` from the store and calls `rive?.pause()` when true, `rive?.play()` when false.

**localStorage SSR safety:**

```typescript
// components/ui/MinimalModeToggle.tsx
'use client'
import { useEffect } from 'react'
import { useWorldStore } from '@/lib/worldStore'

export default function MinimalModeToggle() {
  const { minimalMode, setMinimalMode } = useWorldStore()

  // Hydrate from localStorage on first client render only
  useEffect(() => {
    const stored = localStorage.getItem('world:minimal-mode')
    if (stored === 'true') setMinimalMode(true)
  }, [setMinimalMode])

  function toggle() {
    const next = !minimalMode
    setMinimalMode(next)
    localStorage.setItem('world:minimal-mode', String(next))
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={minimalMode}
      aria-label={minimalMode ? '미니멀 모드 해제' : '미니멀 모드 활성화'}
    >
      {minimalMode ? '일반 모드' : '미니멀 모드'}
    </button>
  )
}
```

**D-04d — Inline text content in minimal mode:** `app/world/[slug]/page.tsx` currently renders `<WorldPostPanel>` and `<WorldPostWaypointSync>`. In minimal mode the `<main>` should render the full post text. Options: (a) add a client wrapper in `app/world/[slug]/page.tsx` that conditionally renders the `<Post />` MDX component when `minimalMode` is true, (b) render a styled link to `/text/{slug}` as the fallback. Option (a) requires the MDX component to be imported in what is currently a server component — this is fine since `app/world/[slug]/page.tsx` already does `import()` of the MDX module. A `MinimalModeContent` client component that receives the `<Post />` component or the slug and handles the conditional display is the correct pattern.

---

## Implementation Map

### Files to Modify

| Path | Change |
|------|--------|
| `lib/posts.ts` | Decide on `server-only` boundary: either keep as-is and create a separate `lib/validate-posts.ts`, or note the constraint |
| `content/posts/sample.mdx` | Change `category: '탐험'` → `category: '일기'` (or another valid category) |
| `content/posts/sample.alt.json` | Remove vestigial `"slug"` field; add at least one `{ "id", "alt" }` entry in `visuals` |
| `lib/worldStore.ts` | Add `minimalMode: boolean` + `setMinimalMode()` slice |
| `components/providers/SmoothScrollProvider.tsx` | Subscribe to `minimalMode`; call `lenis.stop()` / `lenis.start()` |
| `components/world/WorldScrollCamera.tsx` | Add `minimalMode` to `useGSAP` deps; bail out (or `tl.pause()`) when true |
| `components/world/WorldMorphScroll.tsx` | Add `minimalMode` to `useGSAP` deps; bail out when true. Also: remove unused `WorldMorphScrollHandles` export (Phase 6 deferred) |
| `components/world/WorldCursor.tsx` | Subscribe to `minimalMode`; skip cursor registration. Also: add `mq.addEventListener('change', ...)` for live reduced-motion reactivity (Phase 6 deferred) |
| `components/world/RiveSignBoard.tsx` | Subscribe to `minimalMode`; call `rive?.pause()` / `rive?.play()`. Also: add `ErrorBoundary` wrapper (Phase 6 deferred). Also: validate `src` starts with `/assets/rive/` (Phase 6 deferred security) |
| `app/world/[slug]/page.tsx` | Add minimal mode content rendering (conditionally show MDX inline or link to `/text/{slug}`) |
| `app/layout.tsx` | Mount `WorldSRMirror` (with posts data passed from server) and `MinimalModeToggle` inside `UIOverlay` |
| `next.config.ts` | Call `validatePostsMeta()` during build (from `lib/validate-posts.ts`) |

### Files to Create

| Path | Purpose |
|------|---------|
| `lib/validate-posts.ts` | `validatePostsMeta()` + `getAltData()` — no `server-only`, safe to import from `next.config.ts` |
| `components/world/WorldSRMirror.tsx` | SR-only DOM mirror; subscribes to `activeWaypoint`; aria-live for active post |
| `components/ui/MinimalModeToggle.tsx` | Toggle button; reads/writes `localStorage`; calls `setMinimalMode()` |
| `content/posts/post-diary-01.mdx` | `category: '일기'` — content at author's discretion |
| `content/posts/post-diary-01.alt.json` | Sibling alt JSON |
| `content/posts/post-study-01.mdx` | `category: '공부'` |
| `content/posts/post-study-01.alt.json` | |
| `content/posts/post-log-01.mdx` | `category: '일지'` |
| `content/posts/post-log-01.alt.json` | |
| `content/posts/post-diary-02.mdx` | Second `일기` post (to reach 5 total with sample reclassified) |
| `content/posts/post-diary-02.alt.json` | |
| `lib/waypoints.ts` | Add waypoint entries for each new slug (3–4 new islands or reuse existing) |

**Note on post count:** current state is 1 `.mdx` file (`sample.mdx`). Need 4 more to reach minimum 5. With `sample.mdx` reclassified to `일기`, adding posts for `공부` (1), `일지` (1), and two more for any category gives `일기: 3, 공부: 1, 일지: 1` = 5 total, satisfying both the count gate and the "each category at least 1" gate.

---

## Dependencies

No new packages required. Every requirement is satisfiable with the existing lock-set:
- Build-time validation: Node.js built-in `fs`, `path`
- Alt JSON read: Node.js built-in `fs`
- SR-only DOM: plain HTML/React — no library needed
- Minimal mode state: zustand (already present)
- Lenis pause: `lenis.stop()` / `lenis.start()` — available in Lenis 1.3.x API
- GSAP pause: `tl.pause()` or dependency-driven revert — available in GSAP 3.15
- Rive pause: `rive.pause()` — available in `@rive-app/react-canvas` 4.28.0

**Lenis `.stop()` / `.start()` API — confidence HIGH:** Lenis 1.x public API includes `stop()` and `start()` methods documented in the official Lenis README. `destroy()` is already called in `SmoothScrollProvider` cleanup, confirming the lenis instance is accessible there.

**Rive `rive.pause()` — confidence HIGH:** `@rive-app/react-canvas` 4.x `useRive()` hook returns `{ rive }` where `rive` is the Rive instance. The Rive JS runtime exposes `.pause()` and `.play()` as instance methods.

---

## Risk Register

### Risk 1: `server-only` import in `next.config.ts`
**What goes wrong:** `lib/posts.ts` starts with `import 'server-only'`. The `server-only` package throws a build error when imported outside the Next.js server runtime (e.g., from `next.config.ts` evaluated in Node.js). Calling `validatePostsMeta()` from `lib/posts.ts` in `next.config.ts` will break the build with a module error.
**Why:** The `server-only` package has a package.json `exports` condition that throws in non-server contexts.
**How to avoid:** Create `lib/validate-posts.ts` as a separate file without the `server-only` import. Move or duplicate the minimal `readFileSync`-based logic there. Keep `lib/posts.ts`'s `server-only` guard intact.
**Warning signs:** Build fails with "This module cannot be imported from a Client Component" or similar `server-only` error message during `next build`.

### Risk 2: `next.config.ts` evaluation timing with `validatePostsMeta()`
**What goes wrong:** `next.config.ts` is evaluated synchronously at the start of `next build`. If `validatePostsMeta()` throws, the entire build aborts before any source compilation. This is the desired behavior, but if the function throws on false positives (e.g., `.mdx` files that don't export metadata yet, or test fixtures), dev iteration becomes painful.
**How to avoid:** Gate the validation call with `process.env.NEXT_PHASE !== 'phase-development-server'` so `next dev` skips it. Only run during `next build`.
**Warning signs:** `next dev` crashes on startup with a validation error.

### Risk 3: `activeWaypoint` slug resolution gap in `WorldSRMirror`
**What goes wrong:** `worldStore.activeWaypoint` is set by `WorldPostWaypointSync` which is mounted only on `/world/[slug]` pages. On the `/world` home page, `activeWaypoint` is null. `WorldSRMirror` must handle null gracefully.
**How to avoid:** Null-guard in `WorldSRMirror`; show a fallback `aria-live` message like "월드 홈" when slug is null or 'home'.
**Warning signs:** Screen reader announces nothing when user is on `/world` home.

### Risk 4: Lenis instance not accessible from `minimalMode` subscriber
**What goes wrong:** `SmoothScrollProvider` creates a Lenis instance in a `useEffect`. Other components can't call `lenis.stop()` directly since the instance is local. If `SmoothScrollProvider` doesn't subscribe to `worldStore.minimalMode`, there's no way to pause Lenis from the toggle.
**How to avoid:** Add `useWorldStore` subscription inside `SmoothScrollProvider` directly. When `minimalMode` flips to true, call `lenis.stop()`; when false, call `lenis.start()`. The instance ref is already accessible there.
**Warning signs:** Scroll continues after minimal mode toggle is activated.

### Risk 5: GSAP timeline recreation vs. pause
**What goes wrong:** `WorldScrollCamera` and `WorldMorphScroll` use `useGSAP` with `revertOnUpdate: true`. Adding `minimalMode` as a dependency means the entire timeline is killed and recreated on toggle. This is slightly expensive but correct. If instead `tl.pause()` is called directly, the timeline state is preserved but the scroll position may be stuck.
**How to avoid:** Use the `if (minimalMode) return` pattern at the top of `useGSAP` (same as `if (!isHomePage) return`). This cleanly kills the timeline and all associated ScrollTriggers. The camera snaps to its current position (no animation). On re-enable, the timeline recreates from scroll position.
**Warning signs:** After toggling minimal mode off, camera doesn't respond to scroll.

### Risk 6: `app/world/[slug]/page.tsx` MDX import in minimal mode render
**What goes wrong:** `app/world/[slug]/page.tsx` is a Server Component. Conditional rendering based on `minimalMode` (a client-side state) cannot be done directly in a Server Component. The minimal mode content display must be delegated to a Client Component.
**How to avoid:** Render the full `<Post />` component server-side (always available as a prop), pass it to a `MinimalModeContent` client component that conditionally shows/hides based on `minimalMode`. Since the MDX content is rendered server-side anyway, this just controls CSS visibility or conditional mounting on the client.
**Warning signs:** Type error "useState/useEffect cannot be called in Server Component" if minimal mode logic is added directly to `app/world/[slug]/page.tsx`.

### Risk 7: Waypoint registry gap for new posts
**What goes wrong:** `lib/waypoints.ts` currently only has `home` and `sample` entries. New posts added for CONT-02 won't have waypoints unless added. `WorldPostWaypointSync` already warns and falls back to `home` for unknown slugs — but this means the new posts won't navigate the camera to distinct islands.
**How to avoid:** Add waypoint entries in `lib/waypoints.ts` for each new slug. The 3 existing island positions (`-8,y,0`, `8,y,0`, `0,y,-10`) are available as `SCROLL_WAYPOINTS` and can be referenced directly. One option: map new post slugs to existing SCROLL_WAYPOINTS positions rather than adding new geometry.
**Warning signs:** Camera stays at home position when navigating to a new post's `/world/[slug]`.

---

## Phase 6 Deferred Items — Scope Decision

From `06-VERIFICATION.md §Issues to Fix` (7 items):

| Item | In Phase 7 | Rationale |
|------|-----------|-----------|
| WorldCursor: `mq.addEventListener('change', ...)` | **YES** | Directly related to minimal mode work — both modify `WorldCursor`'s `useEffect`. Combine in one PR. |
| RiveSignBoard: ErrorBoundary wrapper | **YES** | Low effort (wrap with `<ErrorBoundary>`). Phase 7 touches `RiveSignBoard` for `minimalMode` pause anyway. |
| RiveSignBoard: validate `src` starts with `/assets/rive/` | **YES** | Two-line addition, same file edit. |
| WorldMorphScroll: remove unused `WorldMorphScrollHandles` export | **YES** | One-line deletion. Phase 7 touches `WorldMorphScroll` for `minimalMode`. |
| ArchipelagoScene: move `directionalLight color` init to `useEffect` | **YES** | Touched in Phase 7 for any WorldSRMirror integration? Low risk standalone fix, can be bundled. Actually not required by Phase 7 work — keep but note it's a quick fix. |
| SplineIslandProp: add Suspense boundary | **DEFER to Phase 8** | Requires Suspense boundary design and fallback mesh; better handled in Phase 8 perf work. |
| WorldKeyboardNav: fix Escape keyboard trap | **DEFER to Phase 8** | Keyboard navigation hardening is Phase 8 scope. |

---

## Code Examples

### Build-time validation skeleton (lib/validate-posts.ts)

```typescript
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const VALID_CATEGORIES = ['일기', '공부', '일지'] as const

export function validatePostsMeta(): void {
  const postsDir = join(process.cwd(), 'content', 'posts')
  const slugs = readdirSync(postsDir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''))

  if (slugs.length < 5) {
    throw new Error(`[CONT-02] posts ${slugs.length}/5 — 5편 이상 필요`)
  }
  const counts: Record<string, number> = {}
  for (const slug of slugs) {
    const text = readFileSync(join(postsDir, `${slug}.mdx`), 'utf-8')
    const m = text.match(/category:\s*['"](.+?)['"]/)
    const cat = m?.[1]
    if (!cat || !(VALID_CATEGORIES as readonly string[]).includes(cat)) {
      throw new Error(`[CONT-02] ${slug}: category '${cat}' invalid. Valid: ${VALID_CATEGORIES.join(', ')}`)
    }
    if (!existsSync(join(postsDir, `${slug}.alt.json`))) {
      throw new Error(`[CONT-03] ${slug}: missing ${slug}.alt.json`)
    }
    counts[cat] = (counts[cat] ?? 0) + 1
  }
  for (const cat of VALID_CATEGORIES) {
    if (!counts[cat]) throw new Error(`[CONT-02] no post in category '${cat}'`)
  }
}
```

### next.config.ts call site

```typescript
// next.config.ts — add before NextConfig object
import { validatePostsMeta } from './lib/validate-posts'
if (process.env.NEXT_PHASE !== 'phase-development-server') {
  validatePostsMeta()
}
```

### worldStore minimal mode slice

```typescript
// lib/worldStore.ts — add to WorldState interface
minimalMode: boolean
setMinimalMode: (v: boolean) => void

// add to create() initializer
minimalMode: false,
setMinimalMode: (v: boolean) => set({ minimalMode: v }),
```

### SmoothScrollProvider minimal mode pause

```typescript
// components/providers/SmoothScrollProvider.tsx
const minimalMode = useWorldStore((s) => s.minimalMode)
useEffect(() => {
  if (!lenis) return  // lenis ref needed
  if (minimalMode) lenis.stop()
  else lenis.start()
}, [minimalMode])
// Note: lenis instance must be stored in a ref accessible to this effect
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|-----------|-------------|-----------|---------|---------|
| `node:fs` | validatePostsMeta, getAltData | Built-in | Node 20+ | None needed |
| zustand | minimalMode slice | Yes | 5.0.12 | — |
| Lenis `.stop()/.start()` | SmoothScrollProvider pause | Yes | 1.3.21 | None needed |
| GSAP `tl.pause()` / `mm.add` | WorldScrollCamera, WorldMorphScroll | Yes | 3.15.0 | — |
| Rive `rive.pause()` | RiveSignBoard | Yes | 4.28.0 | — |
| `@next/mdx` import pattern | MDX metadata extraction | Yes | 16.2.3 | — |
| GitHub Actions CI | alt JSON existence check | No `.github/` dir exists yet | — | Add as part of Phase 7 if needed; or build-time throw covers it |

**Note on CI:** There is no `.github/workflows/` directory in the repo at inspection time. The CONTEXT.md states CI check for alt JSON. Given that `validatePostsMeta()` in `next.config.ts` already throws on missing `.alt.json` during `next build`, and `vercel.yml` (GitHub Actions → Vercel deploy) runs `next build`, the build-time throw IS the CI check. No separate GitHub Actions workflow is needed for Phase 7.

---

## Open Questions

1. **`ArchipelagoScene` directionalLight color init** — Phase 6 L1 FAIL-3: `color={tokens.scene.sunlight}` on `<directionalLight>` conflicts with `WorldMorphScroll.setRGB()`. This is a pre-existing R3F reconciler priority issue. Fixing it (moving color init to `useEffect`) is a 3-line change and should be bundled with Phase 7 `ArchipelagoScene` work, but it's not strictly required by Phase 7 requirements. The planner should decide if this is in scope.

2. **New island geometry for new posts** — The 5 posts need visual representation in the 3D world. Currently 3 `FloatingIsland` instances exist (`home-island`, `sample-island`, `study-island`). New posts can be mapped to existing islands (via `SCROLL_WAYPOINTS` reuse) or trigger new `FloatingIsland` additions. This is an architectural decision the planner must clarify: if new islands are added to `ArchipelagoScene`, that's 3D work beyond the content/a11y scope. The minimal approach: reuse existing island positions for new post waypoints (no new geometry).

3. **Minimal mode inline content in `/world/[slug]`** — D-04d says "인라인 렌더 (또는 링크 중심)". The planner must choose between: (a) rendering full MDX inline in `<main>` when `minimalMode` is true (requires client-conditional rendering pattern), (b) showing a styled prominent link to `/text/{slug}`. The link approach is simpler and avoids the Server Component / Client Component boundary issue entirely, but is slightly less accessible than inline content. The decision is at planner discretion (D-04d parenthetical allows it).

---

## Sources

**HIGH confidence (direct code inspection):**
- `/Users/a0000/dev/webbuild/lib/posts.ts` — `getPostSlugs()` pattern, `server-only` import
- `/Users/a0000/dev/webbuild/lib/worldStore.ts` — zustand slice patterns, `cursorMagnetTarget` reference
- `/Users/a0000/dev/webbuild/components/world/WorldCursor.tsx` — `prefers-reduced-motion` guard, GSAP ticker pattern
- `/Users/a0000/dev/webbuild/components/world/WorldScrollCamera.tsx` — `gsap.matchMedia` / `revertOnUpdate` pattern
- `/Users/a0000/dev/webbuild/components/world/WorldMorphScroll.tsx` — GSAP ScrollTrigger timeline pattern, unused export
- `/Users/a0000/dev/webbuild/components/world/RiveSignBoard.tsx` — `useRive`, `autoplay`, trigger pattern
- `/Users/a0000/dev/webbuild/components/providers/SmoothScrollProvider.tsx` — `lenis.destroy()` confirming instance accessibility
- `/Users/a0000/dev/webbuild/content/posts/sample.alt.json` — vestigial `"slug"` field confirmed
- `/Users/a0000/dev/webbuild/next.config.ts` — `withMDX` wrapper, no existing build hooks
- `/Users/a0000/dev/webbuild/app/layout.tsx` — `UIOverlay` + `WorldCursor` mount pattern
- `/Users/a0000/dev/webbuild/.planning/phases/06-motion-morphing--micro-interactions/06-VERIFICATION.md` — 7 deferred items confirmed
- `/Users/a0000/dev/webbuild/lib/waypoints.ts` — only `home` + `sample` entries present; new posts need entries

**HIGH confidence (official documentation basis):**
- Lenis 1.x API: `.stop()`, `.start()`, `.destroy()` documented in Lenis GitHub README
- Rive JS runtime: `.pause()`, `.play()` on Rive instance documented in rive.app/docs
- `next.config.ts` synchronous evaluation: Node.js module system; `readdirSync`/`readFileSync` are synchronous
- `server-only` package behavior: throws outside Next.js server runtime — documented in Next.js docs
