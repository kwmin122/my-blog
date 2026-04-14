# Phase 1: Foundation & Verification — Research

**Researched:** 2026-04-14
**Domain:** Next.js 15 App Router + R3F v9 + WebGPURenderer + Vercel deployment + performance.mark()
**Confidence:** HIGH (core patterns verified against official docs and R3F v9 release notes)

---

## Summary

Phase 1 constructs the scaffold that every later phase runs on: a persistent R3F `<WorldCanvas>` in `app/layout.tsx`, a 3-tier renderer fallback chain, Vercel CI, and a `performance.mark()` instrumentation stub.

The single most important technical fact is that **R3F v9 (latest: 9.6.0) natively supports async `gl` prop factories, which is the correct and only required hook for WebGPURenderer**. No special patches or workarounds are needed as of three.js r173+. `WebGPURenderer` (from `three/webgpu`) automatically falls back to WebGL2 when WebGPU is unavailable — the `forceWebGL` constructor option forces WebGL2 explicitly. The critical missing step that causes silent blank canvases is forgetting `await renderer.init()` before returning from the `gl` factory.

The persistent canvas problem across Next.js App Router routes is solved cleanly by placing `<WorldCanvas>` in `app/layout.tsx` as a Client Component loaded with `dynamic({ ssr: false })`. Because Next.js App Router preserves the root layout on client navigation, the canvas is never unmounted. No tunnel-rat or scissor-viewport strategy is needed for Phase 1 — those are relevant for Phase 3+ when separate per-route scene content needs to portal into the global canvas.

COOP/COEP headers are **not required at Phase 1**. They are only needed for SharedArrayBuffer (KTX2 Basis-Universal decode), which is deferred to Phase 8 (INFRA-03). Vercel detects Next.js automatically and deploys on every `main` push with no manual configuration.

**Primary recommendation:** Mount `<WorldCanvas>` in `app/layout.tsx` via `dynamic({ ssr: false })`, use `gl={async (props) => { const r = new WebGPURenderer(props); await r.init(); return r; }}` with `extend(THREE)` from `three/webgpu`, and wrap the whole thing in a `useEffect` gate on `navigator.gpu` + WebGL2 context test to select renderer at runtime.

---

## Project Constraints (from CLAUDE.md)

These directives are locked and the planner MUST honor them:

- Lock-set 12 libraries only. No new dependencies. Any addition requires design doc revision.
- `<WorldCanvas>` in `app/layout.tsx`, never remounts on page transitions.
- Fallback chain: WebGPU → WebGL2 → static poster + `/text/` banner.
- No Theatre.js. GSAP + ScrollTrigger only for camera animation.
- Mobile: static poster by default. WebGPU/WebGL2 canvas only after explicit "탐험하기" button tap.
- `performance.mark()` self-measurement scaffold required (gates applied in Phase 8, not Phase 1).
- Working directory: `/Users/min-kyungwook/Desktop/dev/webbuild`
- GitHub: `https://github.com/kwmin122/my-blog`
- Branch target for Phase 1: `milestone/v0.1-skeleton`

---

## Standard Stack

| Library | Version (npm latest) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| next | 16.2.3 | Framework + App Router | Lock-set; layout persistence |
| three | 0.183.2 (r183) | 3D engine + WebGPURenderer | Lock-set; r171+ has zero-config WebGPU |
| @react-three/fiber | 9.6.0 | React renderer for Three.js | Lock-set; v9 = async gl prop support |
| @react-three/drei | 10.7.7 | R3F helper components | Lock-set; Html, OrbitControls confirmed WebGPU-compatible |
| tailwindcss | 4.2.2 | Styling | Lock-set |
| zustand | 5.0.12 | Global state (renderer mode, perf marks) | Lock-set |
| typescript | 5.x (bundled with next) | Type safety | Project default |

**Note on three.js version numbering:** npm package `three@0.183.2` = three.js r183. The `three/webgpu` entry point is available from r165+. r171 is the "production-ready" milestone per three.js maintainers. r173+ resolves the `gl.xr.addEventListener` R3F compatibility bug.

---

## Architecture Patterns

### Pattern A: Persistent WorldCanvas via layout.tsx + dynamic import

This is the ONLY correct pattern for CORE-01. The key insight: Next.js App Router preserves the root layout DOM across client-side navigations. If `<WorldCanvas>` lives in `app/layout.tsx` and is not conditionally rendered on route, it never unmounts.

**Constraint:** R3F `<Canvas>` uses browser APIs (`window`, `WebGLRenderingContext`, `GPUDevice`). It MUST be a Client Component loaded with `ssr: false` to avoid SSR hydration errors.

```tsx
// app/layout.tsx  (Server Component is fine as outer wrapper)
import dynamic from 'next/dynamic'
import { ReactNode } from 'react'

const WorldCanvas = dynamic(
  () => import('@/components/world/WorldCanvas'),
  { ssr: false }
)

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Fixed-position canvas layer behind everything */}
        <WorldCanvas />
        {/* Page content overlaid on top */}
        <main id="page-content">{children}</main>
      </body>
    </html>
  )
}
```

**Why `dynamic({ ssr: false })` and not `'use client'` alone:** The `three/webgpu` module accesses `self.GPUShaderStage` and `navigator.gpu` at module evaluation time. Even with PR #29919 fixing most cases, dynamic import with `ssr: false` is the defensive approach that avoids any server-side evaluation of WebGPU globals.

### Pattern B: WebGPU → WebGL2 → Poster fallback chain (CORE-05, CORE-06)

The three-tier chain lives in `WorldCanvas.tsx`. The `WebGPURenderer` from `three/webgpu` has **built-in automatic WebGL2 fallback** via `forceWebGL: false` (default). You do NOT need to manually instantiate a `WebGLRenderer` as a fallback inside the `gl` prop — the renderer selects the backend automatically.

The third tier (static poster) is a React-level gate: if the canvas context cannot be created at all (both WebGPU and WebGL2 fail), R3F's `fallback` Canvas prop renders instead.

```tsx
// components/world/WorldCanvas.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { extend } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import type { WebGPURendererParameters } from 'three/webgpu'

// Extend R3F's catalog with three/webgpu exports
extend(THREE as any)

type RendererMode = 'webgpu' | 'webgl2' | 'poster'

function detectMode(): 'webgpu' | 'webgl2' | 'poster' {
  if (typeof navigator === 'undefined') return 'poster'
  // WebGL2 check
  const testCanvas = document.createElement('canvas')
  const gl2 = testCanvas.getContext('webgl2')
  if (!gl2) return 'poster'
  // navigator.gpu existence = WebGPU likely available (actual failure caught by renderer.init())
  if (navigator.gpu) return 'webgpu'
  return 'webgl2'
}

export function WorldCanvas() {
  const [mode, setMode] = useState<RendererMode | null>(null)

  useEffect(() => {
    setMode(detectMode())
  }, [])

  if (mode === null) return null  // hydration guard
  if (mode === 'poster') return <StaticPosterFallback />

  const glFactory = async (props: WebGPURendererParameters) => {
    const renderer = new THREE.WebGPURenderer({
      ...props,
      // forceWebGL: true would skip WebGPU; leave false for auto-selection
      forceWebGL: mode === 'webgl2',
    } as WebGPURendererParameters)
    await renderer.init()  // CRITICAL: omitting this causes a blank canvas with no error
    return renderer
  }

  return (
    <Canvas
      gl={glFactory as any}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      data-canvas-id="world-canvas"
      fallback={<StaticPosterFallback />}
      onCreated={({ gl }) => {
        // Log renderer selection for Phase 1 SC#2 verification
        const backend = (gl as any).backend?.isWebGPUBackend ? 'webgpu' : 'webgl2'
        console.log(`[renderer] selected: ${backend}`)
      }}
    >
      <WorldScene />
    </Canvas>
  )
}

function StaticPosterFallback() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <img
        src="/poster.jpg"
        alt="3D World — upgrade your browser to explore"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)' }}>
        <a href="/text">Read the text version instead</a>
      </div>
    </div>
  )
}
```

**Key finding (MEDIUM confidence):** The `THREE.WebGPURenderer` constructor's `forceWebGL` option does the WebGL2 downgrade internally. If `navigator.gpu` is absent, passing `forceWebGL: true` directly selects the WebGL2 backend. The `await renderer.init()` call is always required regardless of backend selection — it requests the GPU adapter/device (WebGPU path) or sets up the WebGL context (WebGL2 path).

### Pattern C: performance.mark() scaffold (PERF-05)

Measurement points should be placed at:
1. `/world` first meaningful frame: inside `onCreated` callback or a `useFrame` one-shot that marks on the first tick
2. `/text` LCP: `PerformanceObserver` watching `largest-contentful-paint` entries

```tsx
// lib/perf.ts
export function markWorldFirstFrame() {
  if (typeof performance === 'undefined') return
  performance.mark('world-first-frame')
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  const delta = performance.now() - (nav?.startTime ?? 0)
  console.log(`[perf] /world first-frame: ${delta.toFixed(1)}ms`)
}

export function observeTextLCP() {
  if (typeof PerformanceObserver === 'undefined') return
  const po = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`[perf] /text LCP: ${entry.startTime.toFixed(1)}ms`)
    }
  })
  po.observe({ type: 'largest-contentful-paint', buffered: true })
}
```

```tsx
// WorldCanvas.tsx — inside Canvas onCreated
onCreated={() => {
  // One-shot useFrame to mark first render tick
  useThree(({ invalidate }) => {
    const unsubscribe = useFrame(() => {
      markWorldFirstFrame()
      unsubscribe() // fire once
    })
  })
}}
```

**Simpler approach for Phase 1 (use this):** Call `markWorldFirstFrame()` directly inside a `useEffect` with a `useRef` guard in `<WorldScene>`:

```tsx
function WorldScene() {
  const hasMarked = useRef(false)
  useFrame(() => {
    if (!hasMarked.current) {
      hasMarked.current = true
      markWorldFirstFrame()
    }
  })
  return <>{/* empty scene for Phase 1 */}</>
}
```

---

## B3 Findings: R3F + WebGPU Production Maturity

**Confidence: HIGH** for core integration. **MEDIUM** for drei compatibility details (no exhaustive official matrix exists).

### R3F v9 + WebGPURenderer: Status

- **R3F v9 (9.6.0) natively supports WebGPURenderer** via the async `gl` prop factory. This was the primary feature of the v9 release.
- The `gl.xr.addEventListener is not a function` bug (three.js r167–r172) is **fixed in r173+**. Current npm three@0.183.2 (r183) does not have this bug.
- The `extend(THREE as any)` call with `import * as THREE from 'three/webgpu'` is required so R3F's JSX catalog recognizes WebGPU-native classes (e.g., `WebGPURenderer` exports them instead of `WebGLRenderer`).
- Production case references: blog.loopspeed.co.uk (March 2025) and blog.pragmattic.dev document working R3F + WebGPURenderer setups. The `github.com/verekia/r3f-webgpu` repo (6 stars) shows a live comparison.

### WebGPU `navigator.gpu` check reliability

`navigator.gpu` presence is necessary but not sufficient — `requestAdapter()` can still return `null` on supported browsers with GPU inaccessible. The safest check for Phase 1 detection is:

1. Attempt `WebGPURenderer` with `await renderer.init()` — this internally calls `navigator.gpu.requestAdapter()`
2. If `init()` throws, catch it and switch to `forceWebGL: true` path

However, this is complex for Phase 1. The simpler approach is using `forceWebGL: mode === 'webgl2'` based on `navigator.gpu` presence (as shown in Pattern B). A production-quality implementation would wrap `renderer.init()` in try/catch.

### drei v10 Compatibility Matrix

| Helper | WebGPU Compatible | Notes |
|--------|------------------|-------|
| `<Html>` | YES | DOM overlay; renderer-agnostic |
| `<OrbitControls>` | YES | Input/camera; renderer-agnostic |
| `<Environment>` | YES | PMREM generation; works in r183 |
| `useGLTF` / `<Gltf>` | YES | Asset loading; renderer-agnostic |
| `<Text>` | YES | troika-three-text; renderer-agnostic |
| `<Suspense>` boundaries | YES | React-level; renderer-agnostic |
| `<EffectComposer>` (drei) | PARTIAL / AVOID | Wraps pmndrs/postprocessing; some passes require WebGL-specific depth buffer access. **Not used in Phase 1.** |
| `useDepthBuffer` | UNTESTED | Relies on WebGLRenderTarget internals; likely incompatible |
| `<MeshReflectorMaterial>` | UNTESTED | Uses render-to-texture; may need WebGPU-specific port |
| `<BakeShadows>` | YES | Shadow map trigger; works |
| `usePostProcessing` (R3F v9 built-in) | YES | New in v9; TSL-native PostProcessing API |

**Phase 1 only uses:** `<Html>` (for any overlay), basic geometry/mesh primitives, and `<Canvas>` itself. None of the partially-compatible helpers are needed.

### Tree shaking concern

Importing `import * as THREE from 'three/webgpu'` pulls in WebGPU backend code regardless of browser capability. For Phase 1 this is acceptable — bundle size optimization (dynamic import of `three/webgpu` vs `three/webgl`) is a Phase 8 concern. The `next.config.ts` does not require `transpilePackages` for `three` when using Next.js 16+ with Turbopack; Turbopack handles ESM packages natively.

---

## Alternative(s) Considered

### Alternative: WebGL2 default + WebGPU opt-in flag

STATE.md B3 blocker mentions: "if WebGPU+R3F integration is still experimental, v0.1 should be WebGL2 default + WebGPU flag opt-in." This was the risk scenario.

**Finding:** This alternative is NOT necessary. R3F v9 + three.js r183 is production-stable for WebGPU. The `forceWebGL` option + auto-fallback means the risk of breakage is low. Using `WebGPURenderer` as the primary renderer with built-in WebGL2 fallback is correct for Phase 1.

**Reject:** WebGL2-default-only approach.

### Alternative: tunnel-rat for canvas persistence

The `react-three-next` starter and `r3f-scroll-rig` use tunnel-rat / scissor viewports to portal per-page scene content into a global canvas. This is a valid pattern for multiple independent scenes per route.

**Finding:** For Phase 1, this complexity is unnecessary. The WorldCanvas is a single unified scene. Placing it in `layout.tsx` with `dynamic({ ssr: false })` achieves CORE-01 without additional abstractions.

**Reject for Phase 1:** Revisit in Phase 3 if per-route scene content portaling is needed.

### Alternative: `'use client'` directive only (no `dynamic`)

Marking `WorldCanvas.tsx` as `'use client'` without `dynamic({ ssr: false })` would SSR-evaluate the module and potentially hit the `self.GPUShaderStage` global reference issue (fixed in PR #29919 but defensively avoided anyway).

**Reject:** Use `dynamic({ ssr: false })` as standard practice for all canvas components.

---

## Implementation Map

Files to create for Phase 1 skeleton:

```
webbuild/
├── app/
│   ├── layout.tsx                   CREATE — root layout with WorldCanvas + children
│   ├── page.tsx                     CREATE — redirect or intro page
│   ├── world/
│   │   └── page.tsx                 CREATE — /world route (empty, canvas persists from layout)
│   └── text/
│       └── hello/
│           └── page.tsx             CREATE — /text/hello stub for SC#1 route test
├── components/
│   └── world/
│       ├── WorldCanvas.tsx          CREATE — R3F Canvas with WebGPU/WebGL2/poster logic
│       └── WorldScene.tsx           CREATE — empty scene stub + performance.mark hook
├── lib/
│   └── perf.ts                      CREATE — performance.mark() utilities
├── public/
│   └── poster.jpg                   CREATE — static fallback image (placeholder OK for Phase 1)
├── next.config.ts                   CREATE — minimal config (see below)
├── package.json                     CREATE — via pnpm create next-app
└── tsconfig.json                    GENERATED — by create-next-app
```

### next.config.ts (Phase 1 minimum)

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // three/webgpu accesses browser globals; ensure it's never bundled server-side
  // Next.js 16 + Turbopack handles this natively; add explicit guard for webpack fallback
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Prevent three/webgpu from being bundled on the server
        'three/webgpu': false,
      }
    }
    return config
  },
  // No COOP/COEP headers at Phase 1 — SharedArrayBuffer not used until Phase 8 (INFRA-03)
  // headers() will be added in Phase 8
}

export default nextConfig
```

**Note:** If Turbopack (default in Next.js 16) handles this without the webpack alias, remove the webpack block. Test both paths.

---

## Dependencies

### pnpm create next-app command

```bash
pnpm create next-app@latest webbuild \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

Then `cd webbuild` and install Phase 1 required packages:

```bash
pnpm add three@0.183.2 \
  @react-three/fiber@9.6.0 \
  @react-three/drei@10.7.7 \
  zustand@5.0.12
```

### Exact devDependencies to pin

```json
{
  "dependencies": {
    "next": "16.2.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": "0.183.2",
    "@react-three/fiber": "9.6.0",
    "@react-three/drei": "10.7.7",
    "zustand": "5.0.12"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/three": "^0.183.0",
    "tailwindcss": "4.2.2",
    "@types/react": "^19.0.0",
    "@types/node": "^20.0.0"
  }
}
```

**Note:** Lock `three` to exact `0.183.2` (not `^`) to prevent accidental three.js minor bumps that could introduce R3F compatibility regressions.

**Lock-set packages deferred to later phases (do NOT install in Phase 1):**
- `gsap` + `@gsap/scrolltrigger` — Phase 3
- `lenis` — Phase 3
- `next-mdx-remote` or `@next/mdx` — Phase 2
- `@rive-app/react-canvas` — Phase 6
- `@splinetool/react-spline` — Phase 3
- `gltf-transform` — Phase 8

---

## Risk Register

### R1: `await renderer.init()` silently omitted
**Probability:** HIGH (most tutorials miss this step)
**Impact:** HIGH — blank canvas with no error message
**Mitigation:** Wrap `renderer.init()` in try/catch; log success/failure explicitly. Add verification step in task plan.

### R2: `three/webgpu` module evaluated server-side
**Probability:** MEDIUM — mitigated by `dynamic({ ssr: false })`
**Impact:** MEDIUM — build error about undefined `self` / `GPUShaderStage`
**Mitigation:** Always use `dynamic({ ssr: false })` for WorldCanvas. Add webpack alias in next.config.ts as belt-and-suspenders.

### R3: drei `EffectComposer` accidentally used in Phase 1
**Probability:** LOW (Phase 1 has an empty scene)
**Impact:** MEDIUM — runtime crash or blank canvas under WebGPU
**Mitigation:** No post-processing in Phase 1 skeleton. Note in task instructions: if EffectComposer is needed in later phases, use the TSL-native `THREE.PostProcessing` API, not drei's `EffectComposer` wrapper.

### R4: canvas remount detected by SC#1 test (data-canvas-id changes)
**Probability:** MEDIUM — if WorldCanvas is conditionally rendered by route
**Impact:** HIGH — CORE-01 fails
**Mitigation:** Verify `<WorldCanvas />` is unconditional in `app/layout.tsx`. Do not wrap in route-conditional logic. Confirm with React DevTools that canvas DOM node does not unmount during navigation.

### R5: navigator.gpu present but requestAdapter returns null
**Probability:** LOW (primarily virtual machines, some CI environments)
**Impact:** MEDIUM — renderer init throws, canvas blank
**Mitigation:** Wrap `renderer.init()` in try/catch; on failure, retry with `forceWebGL: true`. This is a Phase 1 nice-to-have; SC#2 tests Chrome Canary (WebGPU on) and Chrome stable (WebGPU off) — a try/catch retry adds robustness without extra dependencies.

### R6: Vercel Next.js version mismatch (next@16.x vs Vercel adapter)
**Probability:** LOW — Vercel auto-adapts to latest Next.js
**Impact:** MEDIUM — build failure on first deploy
**Mitigation:** Use Vercel CLI `vercel --prod` for first deploy to confirm adapter compatibility. Check Vercel dashboard for build errors.

### R7: B2 blocker — "WebGPU 15-30x performance" claim is wrong
**Probability:** LOW for order-of-magnitude claim being fully false; MEDIUM for the number being inflated
**Impact:** LOW for Phase 1 (Phase 1 only verifies WebGPU initializes; no performance gates apply)
**Mitigation:** Noted as out-of-scope for Phase 1. Performance gate claims (PERF-01 through PERF-04) are Phase 8 concerns. Phase 1's PERF-05 only requires the measurement scaffold to exist and output values.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|-----------|-------------|-----------|---------|----------|
| Node.js ≥ 20.9 | Next.js 16 | YES (check: `node --version`) | 20.x+ required | Upgrade via nvm |
| pnpm | package manager | YES (project uses pnpm) | any | `npm install -g pnpm` |
| WebGPU in browser | CORE-05 test | Chrome Canary / Chrome 113+ | varies | WebGL2 auto-fallback |
| Vercel account | INFRA-04 | Must create if not exists | free tier OK | Cloudflare Pages (same Next.js support) |
| GitHub repo `kwmin122/my-blog` | INFRA-04 | EXISTS (from CLAUDE.md) | — | Create if missing |

---

## Open Questions

1. **next.config.ts webpack alias needed or not?** — The `three/webgpu` global reference fix (PR #29919) was merged in r165. three@0.183.2 (r183) should be safe without the alias when using `dynamic({ ssr: false })`. Needs empirical test on first `pnpm build`. LOW risk to include the alias defensively.

2. **`extend(THREE as any)` TypeScript typing** — The `as any` cast suppresses type errors but may hide future breaking changes. A typed extend call exists but requires manually importing the extended types. For Phase 1, `as any` is acceptable.

3. **`data-canvas-id` on R3F Canvas** — The R3F `<Canvas>` component does not forward arbitrary data attributes to the underlying `<canvas>` element by default. To satisfy SC#1 (`data-canvas-id` persistence check), either use a wrapper `<div data-canvas-id="world-canvas">` around `<Canvas>`, or verify whether R3F v9 passes additional HTML props through. This needs a quick empirical check during implementation.

4. **Next.js 16 vs Next.js 15** — npm shows `next@16.2.3` as latest. The CLAUDE.md lock-set says "Next.js 15 App Router". Using `next@16.x` is forward-compatible and uses the same App Router paradigm. Confirm the user is OK with installing 16.x (it is the current stable release as of April 2026).

---

## Sources

### HIGH Confidence (official docs + primary repos)
- [R3F v9 Migration Guide — official R3F docs](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide) — async gl prop, WebGPU support confirmation
- [R3F Canvas API — official R3F docs](https://r3f.docs.pmnd.rs/api/canvas) — gl prop signature (sync/async callback)
- [WebGPURenderer — three.js official docs](https://threejs.org/docs/pages/WebGPURenderer.html) — forceWebGL param, constructor signature
- [Next.js App Router Installation — official Next.js docs](https://nextjs.org/docs/app/getting-started/installation) — pnpm create next-app, minimum Node 20.9
- [Vercel Git Integration — official Vercel docs](https://vercel.com/docs/git) — auto-deploy on main push

### MEDIUM Confidence (verified tutorials, recent forum posts)
- [R3F + WebGPU + TypeScript tutorial — loopspeed.co.uk (March 2025)](https://blog.loopspeed.co.uk/react-three-fiber-webgpu-typescript) — extend(THREE), async gl factory pattern
- [R3F + WebGPU + TypeScript tutorial — pragmattic.dev](https://blog.pragmattic.dev/react-three-fiber-webgpu-typescript) — WebGPU detection with WebGPU.isAvailable()
- [R3F WebGPU WebGL2 Fallback — three.js forum](https://discourse.threejs.org/t/r3f-webgpu-webgl2-fallback-tree-shaking/87188) — forceWebGL fallback confirmation, tree-shaking concern
- [three/webgpu Next.js compatibility fix — GitHub issue #29916](https://github.com/mrdoob/three.js/issues/29916) — server-side global reference fix
- [R3F v9 WebGPU support issue — GitHub #3352](https://github.com/pmndrs/react-three-fiber/issues/3352) — closed COMPLETED, workaround no longer needed
- [gl.xr.addEventListener bug — R3F GitHub #3402](https://github.com/pmndrs/react-three-fiber/issues/3402) — fixed in three r173+
- [Three.js 2026 changes — utsubo.com](https://www.utsubo.com/blog/threejs-2026-what-changed) — r171 WebGPU production-ready, Safari 26 coverage
- [drei + WebGPU compatibility — utsubo.com migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide) — EffectComposer caveat, most helpers work

### LOW Confidence (not directly verified, inferred)
- EffectComposer partial compatibility — extrapolated from pmndrs/postprocessing WebGPU issues, no complete drei-specific test matrix found
- `data-canvas-id` forwarding behavior — not explicitly documented, needs empirical test
- Turbopack handling of three/webgpu without transpilePackages — inferred from Next.js 16 docs; needs empirical confirmation
