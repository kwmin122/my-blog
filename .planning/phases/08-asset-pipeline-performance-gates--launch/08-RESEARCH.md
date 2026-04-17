# Phase 8: Asset Pipeline, Performance Gates & Launch — Research

**Researched:** 2026-04-17
**Domain:** gltf-transform, Suspense staged loading, Vercel headers, performance instrumentation
**Confidence:** HIGH (all major claims verified against official docs or npm metadata)

---

## Summary

Phase 8 must satisfy six distinct concerns: (1) integrate gltf-transform CLI into the build script so all three GLBs under `public/assets/raw/` are compressed with Draco geometry and ETC1S/UASTC texture codecs and output to `public/assets/out/`; (2) wire up three-tier Suspense boundaries inside ArchipelagoScene (skybox → terrain → details); (3) set KTX2 MIME and security headers via `next.config.ts headers()` (preferred) or `vercel.json`; (4) pass PERF-01 through PERF-04 using instrumentation that already exists in `lib/perf.ts`, augmented with a `/_perf` report route and per-frame draw-call logging via `renderer.info.render.drawCalls`; (5) add the `탐험하기` mobile gate to `WorldCanvas` (not yet built — mobile currently falls straight to poster); and (6) resolve two deferred Phase-6 items: SplineIslandProp Suspense boundary and WorldKeyboardNav Escape-trap focus release.

**Primary recommendation:** Use `@gltf-transform/cli` 4.3.0 as a `devDependency`, drive it through a Node.js script (`scripts/compress-assets.mjs`) called in `package.json prebuild`, and handle headers in `next.config.ts` (avoiding a separate `vercel.json` that diverges from Next.js 16's built-in header control).

---

## Project Constraints (from CLAUDE.md)

- Lock-set of 12 libraries — new `npm install` requires design-doc revision. `@gltf-transform/cli` is listed as library #12, so it is already approved. No other new production dependencies are permitted.
- `@gltf-transform/cli` bundles `draco3dgltf 1.5.7`, `sharp 0.34.x`, `meshoptimizer 1.0.x`, and KTX codecs — these arrive as transitive dependencies of the CLI and do NOT count as new lock-set entries.
- Build tool: pnpm (per existing `node_modules/.pnpm/` lockfile structure). Commands should use `pnpm`.
- ESLint config: `eslint.config.mjs`, max-warnings 0.
- Hosting: Vercel (production URL `https://webbuild-gray.vercel.app`). `vercel.json` does not exist yet.
- Assets at build time live under `public/assets/raw/*.glb` (three files: `island-arch.glb`, `island-cottage.glb`, `island-tree.glb`). The files are currently placeholder stubs (4 KB each, minimal geometry, no textures). The compression script must run regardless and produce output files.
- `poster.jpg` is a 332-byte 1x1 placeholder. PERF-04 requires a real poster image for LCP ≤ 1.8 s to be meaningful; the planner must account for this.

---

## Standard Stack

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@gltf-transform/cli` | 4.3.0 | Build-time GLB compression CLI (includes draco3dgltf, sharp, meshoptimizer) | Lock-set #12 |
| `@gltf-transform/core` | 4.3.0 | NodeIO API for the compression script | Comes with CLI |
| `@gltf-transform/functions` | 4.3.0 | `draco()`, `textureCompress()`, `prune()`, `dedup()` transform functions | Comes with CLI |
| `@gltf-transform/extensions` | 4.3.0 | `KHRDracoMeshCompression` extension registration | Comes with CLI |
| `draco3dgltf` | 1.5.7 | Draco encoder/decoder WASM module | Bundled by CLI |
| three.js `Info` API | r183 | `renderer.info.render.drawCalls` for PERF-03 | Already in lock-set |
| R3F `useThree` | 9.6.0 | Access renderer in R3F context | Already in lock-set |
| Next.js `headers()` in `next.config.ts` | 16.2.3 | KTX2 MIME + COOP/COEP response headers | Already in lock-set |
| `@react-three/drei` `useGLTF` | 10.7.7 | `extendLoader` for KTX2Loader on compressed GLBs | Already in lock-set |

---

## Architecture Patterns

### INFRA-01: gltf-transform Build Integration

The CLI is installed as a devDependency. A Node.js ESM script runs before `next build` via `"prebuild"` in `package.json`. The script processes each GLB in `public/assets/raw/` and writes to `public/assets/out/`, logging file sizes before and after to satisfy Roadmap success criterion #1 ("40% size reduction logged").

Since current GLBs are stubs with no textures, KTX2 texture compression (`textureCompress`) will produce a no-op for texture slots — this is fine. The draco step will compress any triangle geometry present. The script should not fail if textures are absent.

Preferred script structure (`scripts/compress-assets.mjs`):

```js
// ESM, Node.js only — not bundled by Next.js
import { NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import { draco, prune, dedup } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { statSync, mkdirSync } from 'node:fs'
import { globSync } from 'node:fs'
import path from 'node:path'

const RAW_DIR = 'public/assets/raw'
const OUT_DIR = 'public/assets/out'
mkdirSync(OUT_DIR, { recursive: true })

const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'draco3d.decoder': await draco3d.createDecoderModule(),
  })

for (const file of globSync(`${RAW_DIR}/*.glb`)) {
  const outFile = path.join(OUT_DIR, path.basename(file))
  const before = statSync(file).size
  const document = await io.read(file)
  await document.transform(prune(), dedup(), draco({ method: 'edgebreaker' }))
  await io.write(outFile, document)
  const after = statSync(outFile).size
  const pct = ((1 - after / before) * 100).toFixed(1)
  console.log(`[compress] ${path.basename(file)}: ${before}B → ${after}B (−${pct}%)`)
}
```

`package.json` scripts change:
```json
"prebuild": "node scripts/compress-assets.mjs",
"build": "next build"
```

**Important:** `SplineIslandProp` must be updated to load from `public/assets/out/*.glb` (not `raw/`) after compression runs. Both the `useGLTF` calls and the three `useGLTF.preload()` calls at the bottom of `SplineIslandProp.tsx` must point to `/assets/out/island-*.glb`.

### INFRA-02: Suspense Staged Loading (3-tier)

Current state: `ArchipelagoScene` renders all scene objects flat with no Suspense boundaries. `SplineIslandProp` calls `useGLTF` (which suspends on first use) but has no wrapping `<Suspense>` — this is the Phase-6 deferred item.

The 3-tier structure maps to the scene graph hierarchy:

- **Tier 1 (skybox):** `<CloudSeaSky />` — no async loading (TSL shader, no external assets). Renders immediately. No Suspense needed, but wrapping is harmless.
- **Tier 2 (terrain):** `<FloatingIsland>` meshes — no async loading (procedural geometry). Renders after skybox settles. No Suspense needed.
- **Tier 3 (details):** `<SplineIslandProp>` components + `<RiveSignBoard>` components — external GLB and Rive assets loaded with `useGLTF`/`useRive`. These need `<Suspense>` wrappers.

The meaningful Suspense work is wrapping the three `SplineIslandProp` instances and the three `RiveSignBoard` instances inside a `<Suspense fallback={null}>` (or a lightweight placeholder mesh).

Recommended pattern in `ArchipelagoScene.tsx`:

```tsx
// Tier 1 + 2 render immediately (no Suspense needed)
<CloudSeaSky />
<FloatingIsland ... />
{/* Tier 3: external assets — Suspense boundary */}
<Suspense fallback={null}>
  <SplineIslandProp path="/assets/out/island-cottage.glb" ... />
  <SplineIslandProp path="/assets/out/island-tree.glb" ... />
  <SplineIslandProp path="/assets/out/island-arch.glb" ... />
</Suspense>
<Suspense fallback={null}>
  <Html ...><RiveSignBoard ... /></Html>
  {/* repeat for sign-b, sign-c */}
</Suspense>
```

The Canvas-level Suspense for the entire WorldScene is provided by R3F internally via the `fallback` prop on `<Canvas>`. The tier-3 boundaries are separate inner boundaries so the skybox and terrain always display regardless of GLB load state.

**Phase-6 deferred — SplineIslandProp Suspense boundary:** This is addressed by the tier-3 wrapping above. The component itself does not need internal changes; the `<Suspense>` wrapper is in `ArchipelagoScene`.

### INFRA-03: KTX2 MIME + COOP/COEP Headers

Use `next.config.ts` `async headers()` function. This keeps header config version-controlled alongside the Next.js config and avoids a separate `vercel.json`.

```ts
// In next.config.ts, inside the NextConfig object:
async headers() {
  return [
    {
      // KTX2 MIME type for compressed textures
      source: '/:path*.ktx2',
      headers: [{ key: 'Content-Type', value: 'image/ktx2' }],
    },
    {
      // COOP/COEP for SharedArrayBuffer (used by KTX2 WASM transcoder + DracoDecoder)
      source: '/(.*)',
      headers: [
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
      ],
    },
  ]
},
```

**COEP caveat:** `require-corp` breaks cross-origin subresources (CDN iframes, embeds) that don't send `Cross-Origin-Resource-Policy` or `CORP` headers. The Rive CDN-loaded WASM and the Draco CDN decoder URL `https://www.gstatic.com/draco/v1/decoders/` must be served with correct CORP headers, OR those resources must be self-hosted. For `gstatic.com` (Google CDN), CORP headers are NOT sent, so Draco decoders must be self-hosted under `/draco/` in `public/`. The `useGLTF` `useDraco` parameter accepts a string path: `useGLTF(path, '/draco/')` routes decoder loading to `public/draco/`. Rive's React Canvas runtime uses an embedded WASM worker that is same-origin and unaffected.

**Alternative if COEP is too disruptive:** Use `require-corp` only for the `/world` route and omit it for `/text/*`. This is a valid Roadmap success criterion #3 interpretation: "SharedArrayBuffer 경로에 한정."

### PERF-01: /text/ LCP ≤ 1.5s

Current state: `LCPObserver` (already in `app/text/[slug]/page.tsx`) calls `observeTextLCP()` which logs to console. The `/text/` index page (`app/text/page.tsx`) does not exist yet — only `app/text/[slug]/page.tsx`.

For LCP ≤ 1.5s on `/text/[slug]`:
- `poster.jpg` must be replaced with a real image (current stub is 332 bytes / 1x1 pixel). The LCP element on the text route is the article text block, not the poster.
- The `WorldCanvas` loads via `dynamic({ ssr: false })` and does not block the text route's First Contentful Paint.
- No font face loads (no `@font-face` in `globals.css`) — system fonts. This is fine for LCP.
- The prose article content is the LCP candidate. `<time>` element and MDX render are server-rendered. LCP should be achievable with static generation (already using `dynamicParams = false`).
- If `observeTextLCP()` output needs to reach `/_perf`, the perf store must persist values across navigation. Use Zustand `perfStore` or `sessionStorage`.

### PERF-02: /world First Meaningful Frame ≤ 3.0s

`markWorldFirstFrame()` already fires in `WorldScene.useFrame` on the first render. It uses `performance.now() - nav.startTime`. Currently logs to console only.

For PERF-02 verification: expose the value to the `/_perf` route. The `markWorldFirstFrame` function should store the delta in a module-level variable or `sessionStorage['world-first-frame']` so the `/_perf` page can read it without the Canvas needing to be active.

The 3.0 s budget includes WebGPU init (`await renderer.init()`) + first useFrame tick. On a desktop 1080p Chrome build, WebGPU init typically completes in 50–200 ms; the budget is generous.

### PERF-03: 60fps + draw call ≤ 800

The three.js `Info` API (verified in `@types/three@0.183.0`):
- `renderer.info.render.drawCalls` — draw calls of the **current frame** (resets each frame when `autoReset: true`)
- Access via R3F: `useThree((s) => s.gl)` returns the renderer; cast to `(renderer as any).info.render.drawCalls`

Current scene object count: `CloudSeaSky` (1 sphere), 3 `FloatingIsland` (1 mesh each), 3 `SplineIslandProp` (scene.clone, unknown mesh count), 3 `RiveSignBoard` (`<Html>` — no 3D draw calls), `WorldMorphScroll` (no direct mesh), `WorldCameraRig` (no mesh). Estimated draw calls well below 800.

For ongoing monitoring, add a dev-only `useFrame` hook in `WorldScene` that reads `gl.info.render.drawCalls` and conditionally logs when approaching threshold:

```tsx
// Dev only
if (process.env.NODE_ENV !== 'production') {
  const calls = (gl as any).info?.render?.drawCalls ?? 0
  if (calls > 600) console.warn(`[perf] draw calls: ${calls}`)
}
```

The `(renderer as any)` cast is needed because `@types/three@0.183.0` exposes `info` on the common `Info` class but R3F types `gl` as `WebGLRenderer | THREE.WebGLRenderer` without the WebGPU renderer's `info.render.drawCalls` typed. The field exists at runtime on WebGPURenderer.

### PERF-04: Mobile Poster LCP ≤ 1.8s + 탐험하기 Gate

Current state: `WorldCanvas.detectMode()` returns `'poster'` if WebGL2 is absent. Mobile devices with WebGL2 support currently proceed to full WebGPU/WebGL2 mode — **the `탐험하기` button does not exist**.

Required changes:
1. Add mobile detection to `detectMode()`: use `window.matchMedia('(hover: none) and (pointer: coarse)')` as the mobile heuristic (more reliable than UA sniffing).
2. When mobile detected: set mode to a new `'mobile-poster'` state that shows the poster + `탐험하기` button.
3. `탐험하기` button tap: transition mode to `'webgpu'` or `'webgl2'` (whichever is available).
4. Before tap: no WebGPU/WebGL2 context is created (Roadmap success criterion #6).

Mobile LCP candidate is the `<Image src="/poster.jpg" priority>` element. For ≤ 1.8 s: ensure `priority` prop is set (generates `<link rel="preload">` in Next.js), and the real poster image is properly sized.

Pattern addition to `WorldCanvas.tsx`:
```ts
type RendererMode = 'webgpu' | 'webgl2' | 'poster' | 'mobile-pending'

function detectMode(): RendererMode {
  if (typeof navigator === 'undefined') return 'poster'
  // Mobile gate: coarse pointer = touch device, no fine hover
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return 'mobile-pending'
  // ... existing WebGL2/WebGPU check
}
```

The `mobile-pending` state renders `<StaticPosterFallback>` plus a `<button>` overlay styled with Tailwind glass-panel tokens. Tap activates the 3D world by re-running `detectMode` minus the mobile check, or by directly calling the `glFactory`.

### WorldKeyboardNav Escape Trap (Phase-6 Deferred)

Current state: `WorldKeyboardNav.tsx` line 34 — `(containerRef.current as HTMLElement)?.blur()`. This is the Escape handler that releases focus from the widget. The code is already written. The deferred item note in STATE.md says "Escape releases focus from the widget."

After reading the code, the Escape implementation IS already present. The deferred item likely referred to a verification that `blur()` correctly restores normal Tab order — this should be tested in Phase 8's verification layer, not re-coded.

### /_perf Report Route (PERF-05 + Roadmap Success Criterion #4)

Create `app/_perf/page.tsx` as a client component that reads:
- `sessionStorage['world-first-frame']` (ms delta set by `markWorldFirstFrame`)
- `sessionStorage['text-lcp']` (set by an update to `observeTextLCP` callback)
- Per-frame draw call max (stored in module-level variable, reset on mount)

Display as a simple table with pass/fail for each PERF gate threshold.

---

## Implementation Map

Files to **modify**:

| File | Change |
|------|--------|
| `package.json` | Add `"prebuild": "node scripts/compress-assets.mjs"` script; add `@gltf-transform/cli` as devDependency |
| `next.config.ts` | Add `async headers()` function with KTX2 MIME + COOP/COEP rules |
| `components/world/SplineIslandProp.tsx` | Change asset paths from `/assets/raw/` to `/assets/out/`; wrap `useGLTF` calls with `extendLoader` for KTX2Loader |
| `components/world/ArchipelagoScene.tsx` | Wrap `SplineIslandProp` and `RiveSignBoard` in `<Suspense fallback={null}>` (tier-3 boundary) |
| `components/world/WorldCanvas.tsx` | Add `'mobile-pending'` mode, `탐험하기` button, mobile detection via `matchMedia` |
| `components/world/WorldScene.tsx` | Add dev-only draw-call logging; expose `gl.info.render.drawCalls` to perf store |
| `lib/perf.ts` | Update `markWorldFirstFrame` and `observeTextLCP` to persist values to `sessionStorage` |

Files to **create**:

| File | Purpose |
|------|---------|
| `scripts/compress-assets.mjs` | Node.js ESM script: gltf-transform Draco+ETC1S pipeline |
| `app/_perf/page.tsx` | Performance report page: reads sessionStorage, displays PERF-01~04 gate results |
| `public/draco/` (directory + files) | Self-hosted Draco decoder WASM files (copy from `node_modules/three/examples/jsm/libs/draco/`) |

---

## Dependencies

| Package | Version | Purpose | Lock-set status |
|---------|---------|---------|-----------------|
| `@gltf-transform/cli` | `^4.3.0` | Build-time GLB compression (includes draco3dgltf 1.5.7, sharp 0.34.x) | Approved (lock-set #12) |

No other new production dependencies. `@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions` are transitive dependencies of the CLI — they do not appear in `package.json` directly.

---

## Risk Register

### Risk 1: COEP breaks Rive CDN WASM
**Probability:** MEDIUM. **Impact:** HIGH (INT-01 breaks site-wide).
**What goes wrong:** `Cross-Origin-Embedder-Policy: require-corp` prevents loading cross-origin resources without `Cross-Origin-Resource-Policy` headers. Rive's React Canvas runtime loads WASM from the Rive CDN, which may not send CORP headers.
**Mitigation:** Scope COEP to `/world` path only: `source: '/world'` and `source: '/world/:path*'` in the headers array. The `/text/*` and other routes are unaffected. Rive sign boards are inside `<Html>` elements in the Canvas context, so they only load when on a world route. Alternatively, test `@rive-app/react-canvas@4.28.0` with COEP in a staging deploy before shipping.

### Risk 2: gltf-transform script fails on stub GLBs
**Probability:** MEDIUM. **Impact:** LOW (build fails, easy to diagnose).
**What goes wrong:** Stub GLBs (4 KB, 1x1 pixel JFIF geometry) may lack valid mesh data for Draco compression; `draco()` may throw or produce a zero-byte output.
**Mitigation:** Wrap the `document.transform()` call in try/catch and fall back to a file copy if compression fails. Log a warning rather than crashing the prebuild script. The compression step is best-effort for stub assets.

### Risk 3: `renderer.info.render.drawCalls` not available on WebGPURenderer
**Probability:** LOW. **Impact:** LOW (PERF-03 measurement fails silently).
**What goes wrong:** The R3F `gl` type is `WebGLRenderer` in @types/three; the property path `(gl as any).info?.render?.drawCalls` uses optional chaining so it degrades to `undefined` rather than throwing.
**What the types say:** `@types/three@0.183.0` confirms `Info.render.drawCalls: number` exists on the shared `Info` class. At runtime on WebGPURenderer the `info` property is the same `Info` instance.
**Mitigation:** Use optional chaining `(gl as any).info?.render?.drawCalls ?? 0`. If it returns 0 consistently, fall back to `(gl as any).info?.render?.frameCalls` which is the frame-level render count. Both are valid proxies for draw call budget tracking.

### Risk 4: Mobile matchMedia heuristic misidentifies touch laptops
**Probability:** LOW. **Impact:** MEDIUM (Surface Pro / iPad Magic Keyboard users see poster instead of world).
**What goes wrong:** `(hover: none) and (pointer: coarse)` correctly identifies phones but misidentifies some hybrid devices.
**Mitigation:** Add an explicit "탐험하기 on desktop" escape: if the user is shown the mobile poster and their device has a pointing device that becomes fine later (e.g., keyboard attached), the button tap still activates the world. The gate is about not auto-starting the WebGPU context, not about permanently blocking.

### Risk 5: No real poster.jpg for PERF-04 measurement
**Probability:** HIGH. **Impact:** HIGH (LCP measurement meaningless with 1x1 placeholder).
**What goes wrong:** The current `public/poster.jpg` is a 332-byte 1x1 pixel JFIF. Any LCP measurement against it will be sub-1ms and trivially "passes" but proves nothing about a real poster.
**Mitigation:** Replace `poster.jpg` with a real 1920x1080 screenshot of the 3D world (exported from the running app) before running the PERF-04 measurement. Size target: ≤ 150 KB WebP (Next.js Image will handle optimization). The planner should include this as an explicit task with a human-action checkpoint.

### Risk 6: KTX2Loader extendLoader pattern causes "Multiple active KTX2 loaders" warning
**Probability:** HIGH for current stub assets, LOW once real textures are present.
**What goes wrong:** Each `SplineIslandProp` creates a separate `useGLTF` cache entry. If each passes an `extendLoader` that creates a new `KTX2Loader` instance, the drei warning fires: "Multiple active KTX2 loaders may cause performance issues."
**Mitigation:** Create a single `KTX2Loader` instance in a module-level constant (outside any component), set its transcoder path, then share it across all three `useGLTF` calls via the same `extendLoader` reference. Since current GLBs have no KTX2 textures (they are geometry stubs), this risk is deferred until real textured assets are present. For Phase 8, the `extendLoader` setup is preparatory.

---

## Code Examples

### Verified: `renderer.info.render.drawCalls` access in R3F useFrame

```tsx
// Inside an R3F component (e.g., WorldScene.tsx)
import { useThree, useFrame } from '@react-three/fiber'

function DrawCallMonitor() {
  const gl = useThree((s) => s.gl)
  useFrame(() => {
    if (process.env.NODE_ENV !== 'production') {
      const calls = (gl as any).info?.render?.drawCalls ?? 0
      if (calls > 600) console.warn(`[perf] WARN draw calls this frame: ${calls}`)
    }
  })
  return null
}
```

Source: `@types/three@0.183.0` Info.d.ts confirms `render.drawCalls: number` on the shared `Info` class. Verified in `/Users/a0000/dev/webbuild/node_modules/.pnpm/@types+three@0.183.0/node_modules/@types/three/src/renderers/common/Info.d.ts`.

### Verified: Next.js 16.2 `async headers()` pattern

```ts
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*.ktx2',
        headers: [{ key: 'Content-Type', value: 'image/ktx2' }],
      },
      {
        source: '/world/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ]
  },
  // ... rest of config
}
```

Source: Next.js docs `https://nextjs.org/docs/app/api-reference/config/next-config-js/headers` (version 16.2.4, lastUpdated 2026-04-15). Confirmed: `headers()` is an async function returning array of `{ source, headers: [{key, value}] }` objects.

### Verified: gltf-transform 4.x NodeIO + draco pipeline

```js
// scripts/compress-assets.mjs
import { NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import { draco, prune, dedup } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'

const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'draco3d.decoder': await draco3d.createDecoderModule(),
  })

const document = await io.read('public/assets/raw/island-cottage.glb')
await document.transform(prune(), dedup(), draco({ method: 'edgebreaker' }))
await io.write('public/assets/out/island-cottage.glb', document)
```

Source: `@gltf-transform/cli@4.3.0` npm metadata confirms `draco3dgltf` is a bundled dependency at 1.5.7. Official draco function docs at `https://gltf-transform.dev/modules/functions/functions/draco`.

### Verified: `useGLTF` with Draco self-hosted decoder

```tsx
// In SplineIslandProp.tsx after path update
const { scene } = useGLTF(path, '/draco/')
// '/draco/' = public/draco/ — self-hosted to avoid COEP cross-origin block
```

Source: `@react-three/drei@10.7.7` `useGLTF` signature: `useGLTF(path, useDraco?, useMeshOpt?, extendLoader?)`. `useDraco` accepts a string path to the decoder directory.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| `@gltf-transform/cli` | INFRA-01 prebuild | Install needed | 4.3.0 | Manual compress step |
| `draco3dgltf` | compression script | Comes with CLI | 1.5.7 | N/A |
| `sharp` | texture compress | Comes with CLI | 0.34.x | Skip textureCompress |
| Draco decoder WASM (`public/draco/`) | useGLTF runtime | Must be copied from node_modules | three r183 | CDN (breaks COEP) |
| `performance.mark` / `PerformanceObserver` | perf instrumentation | Chrome 57+, all modern | Native | console.time fallback |
| `window.matchMedia` | mobile detection | All modern browsers | Native | UA string fallback |
| `sessionStorage` | `/_perf` report | All modern browsers | Native | in-memory store |

---

## Open Questions

1. **Will real GLB assets with textures be added before Phase 8 ships?** If yes, the KTX2 texture compression path (`textureCompress` with `encoder: sharp, targetFormat: 'webp'` or `'ktx2'`) must be enabled. If stubs remain, texture compression is a no-op.
2. **Does the Rive WASM CDN send `Cross-Origin-Resource-Policy: cross-origin`?** This determines whether `require-corp` can be applied globally or only to the `/world` path. Testing in a staging deploy is recommended before scoping the header to all routes.
3. **Poster image creation:** Who creates the real `poster.jpg`? It must be a 1920×1080 (or similar) screenshot of the 3D world. This is a human-action dependency for PERF-04 to be meaningfully measurable.
4. **Is WorldKeyboardNav Escape truly deferred?** After reading the code, the Escape handler is already implemented (line 34: `containerRef.current?.blur()`). The Phase-6 deferred status may refer to a missing test or a UX concern about focus-visible indicator disappearing on blur. The planner should include a verification task rather than a code-change task.

---

## Sources

**HIGH confidence (official docs, npm metadata, types):**
- [Next.js App Router headers() API docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers) — v16.2.4, updated 2026-04-15
- [Vercel vercel.json headers reference](https://vercel.com/docs/project-configuration/vercel-json#headers) — headers array structure confirmed
- [@gltf-transform/cli npm registry](https://www.npmjs.com/package/@gltf-transform/cli) — v4.3.0 confirmed, draco3dgltf bundled
- [gltf-transform draco() function docs](https://gltf-transform.dev/modules/functions/functions/draco) — NodeIO + draco pipeline example
- [drei useGLTF API docs](https://drei.docs.pmnd.rs/loaders/gltf-use-gltf) — `useDraco` string path + `extendLoader` signature
- `@types/three@0.183.0` `Info.d.ts` — `renderer.info.render.drawCalls` field confirmed at `/Users/a0000/dev/webbuild/node_modules/.pnpm/@types+three@0.183.0/node_modules/@types/three/src/renderers/common/Info.d.ts`

**MEDIUM confidence (web search + community, not independently verified against 2026 current state):**
- [KTX2 + useGLTF discussion (drei #1335)](https://github.com/pmndrs/drei/discussions/1335) — `extendLoader` pattern for KTX2
- [three.js forum: KTX2 + DracoLoader combined](https://discourse.threejs.org/t/how-to-add-both-ktx2loader-and-dracoloader-for-compressed-glb/46726) — self-hosting pattern
- [gltf-transform draco + ktx2 forum example](https://discourse.threejs.org/t/compression-draco-ktx2-example/31382)

---

## RESEARCH COMPLETE
