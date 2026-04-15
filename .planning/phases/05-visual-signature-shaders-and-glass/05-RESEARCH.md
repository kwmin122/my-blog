# Phase 5: Visual Signature — Shaders & Glass - Research

**Researched:** 2026-04-15
**Domain:** Three.js TSL node materials, CSS backdrop-filter, design token enforcement
**Confidence:** HIGH (all claims verified against installed node_modules source)

---

## Summary

Phase 5 implements three visual systems that don't share code but must ship as a unit: a custom TSL sky shader (VIS-01), liquid glass backdrop-filter on every floating UI panel (VIS-02), and a dev-time color palette enforcement system (VIS-03).

The project already imports from `three/webgpu`, which contains all TSL node classes (`NodeMaterial`, `MeshStandardNodeMaterial`, `positionWorld`, `normalWorld`, `time`, `uniform`, `Fn`, etc.) at r183. The `three/tsl` entry re-exports these for convenience. `three/examples/jsm/objects/SkyMesh.js` in the installed package uses exactly this pattern — `NodeMaterial` + `vertexNode` + `colorNode` — and its source is the single best reference for the Phase 5 sky shader.

Liquid glass is pure CSS. The `--panel-opacity` CSS variable already has a home in `globals.css :root`. Driving it via GSAP `ScrollTrigger.create({ onUpdate })` → `document.documentElement.style.setProperty('--panel-opacity', value)` is the direct path that fits the existing Lenis + ScrollTrigger wiring in `SmoothScrollProvider`.

VIS-03 is the least risky piece: `tokens.ts` already exports `color.base`, `color.accentNeon`, `color.accentSky`, `color.accentLight`. The only additions needed are (a) renaming/aliasing `color.base` as `baseTone` per the success criterion wording, and (b) adding a runtime dev-only warning that fires when a Three.js light color's HSL chroma falls outside `baseTone ± accent` range. The K-means audit (`scripts/color-audit.ts`) is informational and does not need to block the build.

**Primary recommendation:** Implement VIS-01 as a custom `CloudSeaSkyShader` component that wraps `NodeMaterial` with a simplified Preetham-style atmosphere in TSL (using `positionWorld`, `cameraPosition`, `time`, `Fn()` — all confirmed present in `three/webgpu` r183). Replace the flat cloud plane in `ArchipelagoScene` with this component. For VIS-02, create `UIGlassPanel` as a thin CSS wrapper with `backdrop-filter: blur(12px) saturate(1.8)` and wire `--panel-opacity` via a new `useScrollOpacity` hook using GSAP ScrollTrigger's `onUpdate` callback.

---

## Project Constraints (from CLAUDE.md)

- **Lock-set (12 libraries only):** No new npm dependencies. All Phase 5 code must use only: Next.js, three.js + WebGPURenderer, R3F, drei, GSAP + ScrollTrigger, Lenis, zustand, MDX, Tailwind v4, Rive, Spline runtime, gltf-transform.
- **tokens.ts is excluded from `local/no-hardcoded-hex` ESLint rule** — hex values in tokens.ts are legal. All other files must use token references.
- **Design doc is the original truth.** If success criteria here conflict with `.planning/`, fix `.planning/`, not the design doc.
- **No Theatre.js.** Not relevant here, but confirms GSAP is the sole animation driver.
- **`three/webgpu` import pattern** is already established in `WorldCanvas.tsx` (`import * as THREE from 'three/webgpu'`). TSL imports must follow the same entry point convention.

---

## Standard Stack

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three/webgpu | r183 (0.183.2) | NodeMaterial + TSL node graph for shader | Already used; r183 bundles SkyMesh example as reference |
| three/tsl | r183 | Named TSL node exports (`Fn`, `uniform`, `positionWorld`, `time`, etc.) | Re-exports from three/webgpu; cleaner named imports |
| @react-three/fiber | 9.6.0 | `useFrame` for time-uniform update; mesh JSX | Already in WorldScene |
| GSAP ScrollTrigger | 3.15.0 | `onUpdate` → `setProperty('--panel-opacity')` | Already wired in SmoothScrollProvider |
| Tailwind v4 | 4.x | `backdrop-blur-*`, `backdrop-saturate-*` utilities | Already in use; v4 has first-class backdrop-filter support |

---

## Architecture Patterns

### VIS-01: TSL Sky Shader

**How NodeMaterial works in r183:**

The `three/webgpu` bundle exports `NodeMaterial` as a class with two key properties for Phase 5:
- `material.vertexNode` — node assigned to vertex position output (replaces `gl_Position` logic)
- `material.colorNode` — node assigned to fragment color output (replaces `gl_FragColor`)

Both accept the result of calling a `Fn(() => { ... })()` expression. The `Fn` function creates a composable shader function node; calling it with `()` at definition time creates a `ShaderNode` instance that is evaluated lazily at render time. Uniform values created with `uniform(value)` auto-sync when `.value` is mutated, or can use `.onRenderUpdate(() => frame.time)` for the `time` built-in.

**Confirmed built-in nodes available in three/webgpu r183:**
- `positionWorld` — world-space vertex position (computed via `modelWorldMatrix.mul(positionLocal).xyz`)
- `normalWorld` — world-space normal
- `cameraPosition` — camera world position (available as a uniform)
- `time` — `uniform(0).setGroup(renderGroup).onRenderUpdate((frame) => frame.time)` — already ticking
- `uv` — `attribute('uv', 'vec2')` — UV attribute shortcut
- `modelViewProjection` — full MVP transform node
- Math nodes: `Fn`, `uniform`, `vec2/3/4`, `float`, `mix`, `smoothstep`, `normalize`, `dot`, `sin`, `cos`, `pow`, `clamp`, `exp`, `acos`, `add`, `sub`, `mul`, `Loop`, `If`

**Compile target:** When `WebGPURenderer` (non-forced) is used, the node graph compiles to WGSL. When `forceWebGL: true` is set, the same graph compiles to GLSL. This is fully automatic — no duplicate code needed. The `three/webgpu` r183 bundle includes `GLSLNodeParser` in its export list, confirming both code paths exist.

**Best target object for VIS-01:** The cloud sea plane mesh in `ArchipelagoScene.tsx` (currently `meshStandardMaterial` with `color={tokens.scene.cloud}`). Replacing it with a custom `CloudSeaShader` component that uses `NodeMaterial` + animated normal-based color mix is the lowest complexity path (no sky dome sizing, no camera projection tricks). Alternatively, swap the existing flat sky color + fog for a `SkyMesh`-derived component — this is more visual impact but the Preetham model requires more parameter tuning.

**Recommended target: sky/atmosphere.** The `SkyMesh.js` example is in the installed package at `three/examples/jsm/objects/SkyMesh.js`. It uses `NodeMaterial + vertexNode + colorNode` with `positionWorld`, `cameraPosition`, and `time` — exactly the confirmed API. The phase can either:
1. Import `SkyMesh` directly from examples (already installed — no new package)
2. Write a simplified custom sky node that mixes `tokens.scene.sky` with the neon accent based on vertical angle

Option 2 is "자작 TSL 셰이더" (custom-authored shader) which VIS-01 explicitly requires. Option 1 satisfies the functional requirement but is a library component, not a "자작" shader.

**Recommended: Option 2 — custom simplified sky shader.** Use `SkyMesh.js` as reference, write a simpler 30-line TSL `Fn` that does `mix(horizonColor, zenithColor, smoothstep(0, 0.5, direction.y))` with a `time`-animated offset for subtle cloud motion. This fulfills "자작" and is proven by the SkyMesh source pattern.

**R3F integration pattern:**

```tsx
// Pattern from FloatingIsland.tsx precedent — useMemo + imperative material
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { Fn, vec3, vec4, float, mix, smoothstep, dot, normalize,
         positionWorld, cameraPosition, uniform } from 'three/tsl'

export function SkySphere() {
  const material = useMemo(() => {
    const mat = new THREE.NodeMaterial()
    mat.side = THREE.BackSide
    mat.depthWrite = false
    // colorNode definition goes here
    mat.colorNode = Fn(() => { ... })()
    return mat
  }, [])

  return (
    <mesh material={material} scale={[500, 500, 500]}>
      <sphereGeometry args={[1, 32, 32]} />
    </mesh>
  )
}
```

`useFrame` is only needed if uniforms require per-frame mutation; the `time` built-in updates automatically via `renderGroup`.

**Important:** R3F's `extend(THREE)` call in `WorldCanvas.tsx` already registers all three/webgpu classes. `<meshStandardNodeMaterial>` JSX camelCase works. However, for a custom `NodeMaterial` instance, the imperative `useMemo` pattern (creating the material imperatively and passing it via `material={mat}`) is safer and is consistent with the existing `FloatingIsland.tsx` precedent.

---

### VIS-02: Liquid Glass Backdrop-Filter

**CSS pattern:**

```css
/* globals.css :root addition */
--panel-opacity: 0.6;  /* default mid-value */

.glass-panel {
  background: oklch(0.12 0.01 240 / var(--panel-opacity));
  backdrop-filter: blur(12px) saturate(1.8);
  -webkit-backdrop-filter: blur(12px) saturate(1.8);
  border: 1px solid oklch(0.96 0.01 240 / 0.1);
  border-radius: 12px;
}
```

**Tailwind v4 approach:** Tailwind v4 ships `backdrop-blur-*` and `backdrop-saturate-*` as utility classes (`backdrop-blur-md` = `backdrop-filter: blur(12px)`, `backdrop-saturate-180` = `backdrop-filter: saturate(1.8)`). Both utilities can coexist on the same element and stack into a single `backdrop-filter` declaration. The background opacity is not a Tailwind utility (dynamic CSS var), so a CSS class + inline style combination is appropriate.

**Driving `--panel-opacity` via GSAP ScrollTrigger:**

The existing `SmoothScrollProvider` already calls `lenis.on('scroll', ScrollTrigger.update)` and `gsap.ticker.add(ticker)`. A new `useScrollOpacity` hook can register a `ScrollTrigger.create({ trigger: scrollContainer, start: 'top top', end: 'bottom bottom', onUpdate: (st) => document.documentElement.style.setProperty('--panel-opacity', lerp(0.4, 0.85, st.progress)) })`. This hook lives in `lib/useScrollOpacity.ts` and is called once in a client component that mounts in `app/world/page.tsx`.

Note: Lenis exposes a `on('scroll', ({progress}) => ...)` event. This is simpler than ScrollTrigger for a single global progress value and avoids needing a trigger element. Either works; the ScrollTrigger approach is consistent with existing Phase 3 camera choreography code.

**Safari support for `backdrop-filter`:**
- iOS Safari 9+ supports `-webkit-backdrop-filter` with prefix
- iOS Safari 18 (shipping 2025) removed the need for prefix in most cases, but `-webkit-` prefix should still be included for iOS 15-17 compatibility
- `backdrop-filter` without prefix: iOS Safari 15.4+, which covers all iOS 17+ devices (the project's stated iOS 17+ target)
- **Conclusion:** Always include both `-webkit-backdrop-filter` and `backdrop-filter`. No polyfill needed.

**Performance note on backdrop-filter:**
- `backdrop-filter` triggers GPU compositing. Every element with `backdrop-filter` gets its own compositing layer.
- Mitigation: Limit the number of simultaneous glass panels to ≤ 4 visible at once. The current codebase has: `WorldKeyboardNav` (bottom bar, always visible), `WorldPostPanel` (overlay inside R3F Html, appears on post pages), nav header (not yet implemented). This is within the safe range.
- Do NOT apply `backdrop-filter` to the `<main>` element or full-screen overlays — only to discrete panel components.

---

### VIS-03: Palette Enforcement

**Current tokens.ts state:**
- `color.base: 'oklch(0.12 0.01 240)'` — near-black blue base
- `color.accentNeon: 'oklch(0.82 0.25 140)'` — high-chroma green-neon (chroma 0.25)
- `color.accentSky: 'oklch(0.78 0.15 220)'` — medium-chroma sky blue (chroma 0.15)
- `color.accentLight: 'oklch(0.90 0.08 60)'` — low-chroma warm light (chroma 0.08)
- `scene.*` colors are hex and are NOT part of the locked accent system — they are Three.js geometry colors

**What VIS-03 requires:**
The success criterion says `baseTone` 1 value + `accent.*` 3 values in tokens.ts. The current export uses `color.base` and `color.accentNeon/Sky/Light`. The rename/aliasing needed: add `baseTone` export alias. This is a tokens.ts surgery: add `export const baseTone = tokens.color.base` or restructure the token export.

**Dev console warning system for light color chroma:**
Three.js light colors are `THREE.Color` instances. When a `DirectionalLight` or `AmbientLight` is created with a color outside the palette, there's no automatic warning. The solution is a dev-only utility function:

```ts
// lib/colorAudit.ts (dev-only)
import { Color } from 'three/webgpu'

const ACCENT_CHROMA_MAX = 0.25  // accentNeon is highest
const BASE_CHROMA_MAX = 0.02    // base+surface are near 0

export function assertLightColor(color: THREE.Color, label: string) {
  if (process.env.NODE_ENV !== 'development') return
  // Convert to oklch approximation — Three.js Color.getHSL() gives HSL
  // Chroma in oklch ≠ saturation in HSL, but HSL saturation > 0.5 on a dark background
  // signals palette violation. Use as heuristic.
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)
  if (hsl.s > 0.8 && !isPaletteHue(hsl.h)) {
    console.warn(`[VIS-03] Light "${label}" uses out-of-palette saturation (HSL s=${hsl.s.toFixed(2)}, h=${(hsl.h * 360).toFixed(0)})`)
  }
}
```

This is called in `ArchipelagoScene.tsx` via a `useEffect` or a helper that inspects the scene after it mounts. A `useEffect`-based scene color audit is the cleanest approach: traverse `scene.children`, filter for `Light` instances, call `assertLightColor`.

**K-means color audit (`scripts/color-audit.ts`):**
This is listed in the success criteria as informational validation. It is NOT a build gate for Phase 5. A minimal implementation uses `child_process` to take a screenshot (Puppeteer — not in lock-set), so it cannot be automated in Phase 5 without new dependencies. The recommended approach: mark this as a manual verification step using an online K-means tool (e.g., CSS Color Thief or browser devtools color palette inspector), and document it as a future Phase 8 CI check.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atmospheric sky shader math | Custom Preetham model from scratch | Reference `three/examples/jsm/objects/SkyMesh.js` (already installed) for node patterns | Math is complex; SkyMesh source shows exact TSL idioms for r183 |
| TSL time animation | Custom RAF loop to update uniforms | `time` built-in node from `three/tsl` (auto-updates via `renderGroup`) | Already wired in renderer; no useFrame needed |
| Scroll progress for opacity | Custom scroll listener | `ScrollTrigger.create({ onUpdate })` or `lenis.on('scroll', ({progress}) => ...)` | Both already wired in SmoothScrollProvider |
| CSS compositing | Custom WebGL overlay | CSS `backdrop-filter` + `--panel-opacity` CSS var | Hardware-accelerated, no extra GPU context |
| Color audit at build time | Puppeteer screenshot | Manual inspection + `assertLightColor()` runtime dev warning | Puppeteer not in lock-set |

---

## Common Pitfalls

### Pitfall 1: TSL Fn() called outside R3F context
**What goes wrong:** `Fn(() => { ... })()` called at module level (outside `useMemo`) causes "NodeBuilder not initialized" error in WebGPU renderer.
**Why:** The node graph is compiled to WGSL/GLSL on first render. Constructing nodes before the renderer is initialized fails the compile step.
**How to avoid:** Always construct `NodeMaterial` and its node graph inside `useMemo` (or inside the Three.js constructor as SkyMesh does). Never at module/export level.
**Warning signs:** Console error mentioning "NodeBuilder" or "WebGPURenderer not initialized" on first frame.

### Pitfall 2: `three/tsl` import vs `three/webgpu` import collision
**What goes wrong:** Importing `NodeMaterial` from `three/tsl` and from `three/webgpu` in the same file may result in two different class instances if bundler deduplication fails, causing `instanceof NodeMaterial` checks to fail.
**Why:** `three/tsl` re-exports from `three/webgpu`, but bundler tree-shaking may create separate instances.
**How to avoid:** Import `NodeMaterial`, `MeshStandardNodeMaterial`, and class constructors from `three/webgpu`. Import TSL function primitives (`Fn`, `uniform`, `vec3`, `time`, etc.) from `three/tsl`.
**Warning signs:** R3F `<primitive object={mat}>` fails type check or material doesn't apply.

### Pitfall 3: `backdrop-filter` on a parent that has `transform: translateZ(0)`
**What goes wrong:** Elements with `backdrop-filter` fail to blur content behind them if a parent has CSS `transform`, `filter`, `will-change: transform`, or `contain: paint`. The blur only affects content in the same stacking context below.
**Why:** `backdrop-filter` creates a new stacking context. If the 3D canvas (`position: fixed, z-index: 0`) and the glass panel aren't in the correct stacking context relationship, the blur sees nothing behind it.
**How to avoid:** The canvas is `position: fixed; z-index: 0; aria-hidden`. Glass panels must be in a stacking context above z-index 0 but not inside a `transform`-bearing container. Verify by temporarily setting `background: red` and checking the blur samples the canvas.
**Warning signs:** `backdrop-filter` renders but shows no blur — just a tinted rectangle.

### Pitfall 4: `--panel-opacity` CSS var updates causing layout thrash
**What goes wrong:** Calling `document.documentElement.style.setProperty` on every scroll frame (60fps) causes style recalculation on every frame.
**Why:** CSS custom property updates on `:root` invalidate all elements that use that variable.
**How to avoid:** Throttle updates to once per 16ms using `ScrollTrigger`'s built-in `onUpdate` (which already fires once per tick, not multiple times per frame). Use `gsap.quickSetter(document.documentElement, '--panel-opacity', '')` for the most efficient path — GSAP quickSetter batches the style write.
**Warning signs:** "Forced style recalculation" warnings in Chrome devtools Performance tab.

### Pitfall 5: VIS-03 `baseTone` naming conflict with existing `color.base`
**What goes wrong:** Success criterion says "tokens.ts에서 baseTone 1값 + accent.* 3값만 export". If `color.base` and `color.surface` continue to export alongside a new `baseTone`, the criterion is literally unmet.
**Why:** The success criterion is read as "only baseTone + 3 accents should be the authoritative palette exports" — not that ALL color tokens must be removed. `scene.*` and `textPrimary`/`textMuted` are functional, not palette-defining.
**How to avoid:** Add `export const baseTone = tokens.color.base` and `export const accent = { neon: tokens.color.accentNeon, sky: tokens.color.accentSky, light: tokens.color.accentLight }` as named exports alongside the existing `tokens` object. The ESLint rule already excludes `tokens.ts`, so no lint changes needed. Document in a comment that baseTone + accent.* are the "palette lock" exports.
**Warning signs:** Verification step finds multiple conflicting accent exports or missing `baseTone` named export.

### Pitfall 6: SkyMesh fog color conflict
**What goes wrong:** `ArchipelagoScene.tsx` attaches `<fog>` with `tokens.scene.sky` (`#a8d4f5`). A new TSL sky sphere will render behind the fog, making the sky invisible beyond the fog distance.
**Why:** Fog is a flat color, not a gradient. The TSL sky shader's gradient will be obscured by the uniform fog color.
**How to avoid:** When adding the TSL sky sphere, remove or disable the `<fog>` and `<color attach="background">` lines, or sync the fog color to the sky shader's horizon color via a uniform. The simplest approach: keep fog but set its near/far distance past the sky sphere (sky sphere is typically scaled to 500+ units).
**Warning signs:** Sky appears as a flat color despite the shader running.

---

## Code Examples

### TSL Shader Pattern (verified from SkyMesh.js in three r183)

```tsx
// shaders/CloudSeaSky.tsx
import { useMemo } from 'react'
import * as THREE from 'three/webgpu'
import {
  Fn, uniform, vec3, vec4, float,
  mix, smoothstep, dot, normalize, clamp, sin,
  positionWorld, cameraPosition, time
} from 'three/tsl'
import { tokens } from '@/tokens/tokens'

// Build material once — this is the "자작 TSL 셰이더"
function buildSkyMaterial() {
  const mat = new THREE.NodeMaterial()
  mat.side = THREE.BackSide
  mat.depthWrite = false

  // Uniforms — mutate .value to update
  const horizonColor = uniform(new THREE.Color(tokens.scene.sky))
  const zenithColor  = uniform(new THREE.Color(tokens.color.base))
  const timeOffset   = float(0)  // use built-in `time` instead

  const colorNode = Fn(() => {
    const dir = normalize(positionWorld.sub(cameraPosition))
    // Smooth gradient from horizon (y=0) to zenith (y=1)
    const t = smoothstep(float(0), float(0.6), dir.y.add(float(0.1)))
    // Subtle animated shimmer using built-in time
    const shimmer = sin(time.mul(0.3)).mul(0.02).add(1.0)
    const skyColor = mix(horizonColor, zenithColor, t).mul(shimmer)
    return vec4(skyColor, float(1))
  })()

  mat.colorNode = colorNode
  return mat
}

export function CloudSeaSky() {
  const material = useMemo(() => buildSkyMaterial(), [])
  return (
    <mesh material={material} scale={[500, 500, 500]}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  )
}
```

Source pattern: `three/examples/jsm/objects/SkyMesh.js` (installed at node_modules/three/examples/jsm/objects/SkyMesh.js, lines 1-359).

### Liquid Glass CSS Pattern

```css
/* Add to globals.css :root */
--panel-opacity: 0.6;

/* New utility class (not Tailwind — dynamic CSS var) */
.glass-panel {
  background: oklch(0.12 0.01 240 / var(--panel-opacity));
  -webkit-backdrop-filter: blur(12px) saturate(1.8);
  backdrop-filter: blur(12px) saturate(1.8);
  border: 1px solid oklch(0.96 0.01 240 / 0.08);
  border-radius: 0.75rem;
  transition: background 0.2s var(--ease-default);
}
```

### Scroll Opacity Hook Pattern

```ts
// lib/useScrollOpacity.ts
'use client'
import { useEffect } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import gsap from 'gsap'

export function useScrollOpacity(scrollContainer: HTMLElement | null) {
  useEffect(() => {
    if (!scrollContainer) return
    const setter = gsap.quickSetter(
      document.documentElement, '--panel-opacity', ''
    )
    const st = ScrollTrigger.create({
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const opacity = 0.4 + (0.85 - 0.4) * self.progress
        setter(opacity)
      },
    })
    return () => st.kill()
  }, [scrollContainer])
}
```

### VIS-03 tokens.ts additions

```ts
// Add to tokens/tokens.ts (bottom, after existing exports)

// Palette lock exports — these are the authoritative VIS-03 colors.
// baseTone: single dark base. accent.*: three dopamine accents.
export const baseTone = tokens.color.base  // 'oklch(0.12 0.01 240)'
export const accent = {
  neon:   tokens.color.accentNeon,   // 'oklch(0.82 0.25 140)'
  sky:    tokens.color.accentSky,    // 'oklch(0.78 0.15 220)'
  light:  tokens.color.accentLight,  // 'oklch(0.90 0.08 60)'
} as const
```

### Dev Console Light Color Warning

```ts
// lib/colorAudit.ts
import type { Color } from 'three'

// oklch chroma approximately maps to HSL saturation:
// accentNeon chroma 0.25 ≈ HSL s 0.75 at L=0.82
// threshold: warn if s > 0.5 AND hue not in {100-150 neon, 200-240 sky, 40-70 light}
const PALETTE_HUES = [
  { min: 100/360, max: 150/360 }, // neon green
  { min: 200/360, max: 240/360 }, // sky blue
  { min: 40/360,  max: 70/360  }, // warm light
]

function inPaletteHue(h: number): boolean {
  return PALETTE_HUES.some(({ min, max }) => h >= min && h <= max)
}

export function assertLightColor(color: Color, label: string) {
  if (process.env.NODE_ENV !== 'development') return
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)
  if (hsl.s > 0.5 && !inPaletteHue(hsl.h)) {
    console.warn(
      `[VIS-03] "${label}" light color HSL(h=${(hsl.h*360).toFixed(0)}, s=${hsl.s.toFixed(2)}) is outside baseTone+accent palette`
    )
  }
}
```

---

## Implementation Map

### Files to CREATE

```
shaders/
  CloudSeaSky.tsx          — TSL NodeMaterial sky sphere (VIS-01)

components/ui/
  UIGlassPanel.tsx         — glass wrapper component (VIS-02)

lib/
  useScrollOpacity.ts      — GSAP ScrollTrigger → --panel-opacity hook (VIS-02)
  colorAudit.ts            — dev-only light color warning util (VIS-03)
```

### Files to MODIFY

```
tokens/tokens.ts
  + export const baseTone = tokens.color.base
  + export const accent = { neon, sky, light } as const
  (no removals — existing exports remain for backward compat)

components/world/ArchipelagoScene.tsx
  + import CloudSeaSky from '@/shaders/CloudSeaSky'
  + replace <fog> + <color attach="background"> with <CloudSeaSky>
  + replace cloud plane <meshStandardMaterial> with glass-referencing NodeMaterial
    OR keep cloud plane and only add sky sphere (simpler)
  + add useEffect calling assertLightColor on mounted lights

components/world/WorldKeyboardNav.tsx
  + replace inline style panel background with .glass-panel class + UIGlassPanel wrapper

components/world/WorldScene.tsx
  + update postOverlay Html panel to use UIGlassPanel

app/world/page.tsx
  + add useScrollOpacity(scrollContainerRef)

app/globals.css
  + add --panel-opacity: 0.6 to :root
  + add .glass-panel CSS rule
```

### Files NOT to modify

- `WorldCanvas.tsx` — renderer setup is complete; no changes needed for TSL
- `lib/waypoints.ts` — not related to Phase 5
- `lib/worldStore.ts` — no new state needed
- `SmoothScrollProvider.tsx` — Lenis+GSAP wiring is already done; `useScrollOpacity` hooks into ScrollTrigger externally

---

## Dependencies

**No new npm dependencies.** All functionality is implemented with:
- `three/webgpu` and `three/tsl` (already installed as `three@0.183.2`)
- GSAP ScrollTrigger (already installed as `gsap@3.15.0`)
- CSS (no library)

The `SkyMesh.js` example file used as reference is already in `node_modules/three/examples/jsm/objects/SkyMesh.js`. It is NOT imported at runtime — it serves as code reference only. The Phase 5 shader is a custom rewrite.

---

## Risk Register

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| TSL `Fn()` API changes between patch versions of r183 | LOW | LOW | Verified against installed r183 bundle; `Fn` is in the public `three/tsl` named export |
| `NodeMaterial.colorNode` / `vertexNode` property not recognized by R3F JSX catalog | MEDIUM | LOW | Use imperative `useMemo` pattern (not JSX prop); consistent with FloatingIsland.tsx |
| `backdrop-filter` invisible because canvas stacking context blocks it | HIGH | MEDIUM | Canvas is `position: fixed; z-index: 0; pointer-events: none`. Panels at z-index > 0 in normal flow. Test in Chrome first; if invisible, add `isolation: isolate` on the panel's parent. |
| `--panel-opacity` CSS var update causing 60fps style recalculation | MEDIUM | MEDIUM | Use `gsap.quickSetter` (batches to one write per frame); confirmed GSAP 3.15 has quickSetter API |
| `SkyMesh` fog color conflict (existing `<fog>` makes sky invisible) | MEDIUM | HIGH | Remove `<fog>` + `<color attach="background">` when adding TSL sky sphere; or adjust fog far distance > 400 units |
| VIS-03 K-means audit requires Puppeteer (not in lock-set) | LOW | CERTAIN | Mark as manual verification; automated version deferred to Phase 8 or future CI |
| iOS Safari 15-16 backdrop-filter flicker on scroll | LOW | LOW | Only occurs with `will-change: transform` on parent; do not add will-change to glass panels |
| `assertLightColor` warning fires for existing scene.sunlight (#fff8e8) | LOW | MEDIUM | `#fff8e8` in HSL is h≈40, s≈1.0 (very warm white) — HUE 40 IS in the `light` palette range (40-70). Will not false-positive. |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|-----------|-------------|-----------|---------|---------|
| `three/tsl` named exports (Fn, uniform, positionWorld, time, etc.) | VIS-01 shader | YES | r183 | N/A — same bundle |
| `THREE.NodeMaterial` | VIS-01 shader | YES | r183 (confirmed in three.webgpu.js export list) | N/A |
| `backdrop-filter` CSS | VIS-02 glass | YES | iOS Safari 15.4+, all modern Chrome/Firefox | Graceful degradation: `background` fallback at 0.9 opacity |
| `gsap.quickSetter` | VIS-02 scroll opacity | YES | GSAP 3.15.0 | `style.setProperty` directly |
| `ScrollTrigger.create({ onUpdate })` | VIS-02 scroll opacity | YES | Confirmed in ScrollTrigger.js source | Lenis `on('scroll', {progress})` as alternative |
| `THREE.Color.getHSL()` | VIS-03 warning | YES | three r183 (standard Color method) | N/A |

---

## Open Questions

1. **VIS-01 target geometry final decision:** Sky sphere (requires removing fog) vs cloud plane (simpler, no fog conflict, but less visually dramatic). The planner should specify which achieves "월드 하늘·바다·지형 중 1개가 TSL 노드 그래프로 렌더" most cleanly. Recommendation: sky sphere + remove fog, because the success criterion explicitly names "하늘" first.

2. **VIS-02 UIGlassPanel scope:** The success criterion says "모든 UIOverlay 자손 패널". Currently there is no `UIOverlay` wrapper component — panels are inline styles in `WorldKeyboardNav` and `WorldScene`. The planner should decide: create a new `<UIOverlay>` wrapper that all floating panels live inside, or mark each existing panel with a data attribute. Recommendation: create `<UIOverlay>` as a `position: fixed` full-viewport transparent container in `app/layout.tsx` above the canvas, then move `WorldKeyboardNav` and the postOverlay Html inside it.

3. **`--panel-opacity` scroll trigger position:** The world page has `height: 300vh`. The ScrollTrigger needs a `trigger` element. The most reliable choice is the `<main>` element or a dedicated scroll wrapper div in `app/world/page.tsx`.

---

## Sources

**HIGH confidence (verified in installed node_modules):**
- `node_modules/three/examples/jsm/objects/SkyMesh.js` — Complete TSL NodeMaterial pattern with vertexNode/colorNode, positionWorld, cameraPosition, time, Fn — lines 1-359
- `node_modules/three/build/three.webgpu.js` — Confirmed exports: `NodeMaterial`, `MeshStandardNodeMaterial`, `positionWorld`, `normalWorld`, `time`, `cameraPosition`, `Fn`, `uniform`, TSL math nodes
- `node_modules/three/package.json` — Confirmed `./tsl` and `./webgpu` entry points
- `node_modules/gsap/dist/ScrollTrigger.js` — Confirmed `onUpdate(self)` callback with `self.progress`
- `components/providers/SmoothScrollProvider.tsx` — Confirmed Lenis + GSAP ticker integration pattern
- `tokens/tokens.ts` — Confirmed existing token structure and ESLint exclusion
- `eslint.config.mjs` — Confirmed `tokens/tokens.ts` excluded from no-hardcoded-hex rule
- `components/world/FloatingIsland.tsx` — Confirmed `useMemo + imperative material` pattern precedent
- `components/world/WorldCanvas.tsx` — Confirmed `three/webgpu` import pattern + `extend(THREE)`

**MEDIUM confidence (browser compatibility — from MDN/Can I Use knowledge, unverified live):**
- `backdrop-filter` iOS Safari 15.4+ support (both `-webkit-` prefixed and unprefixed)
- `gsap.quickSetter` CSS variable write performance (documented GSAP 3 feature, version 3.15 confirmed installed)
