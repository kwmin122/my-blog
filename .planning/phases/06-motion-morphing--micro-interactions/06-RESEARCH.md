# Phase 6: Motion Morphing & Micro-Interactions — Research

**Researched:** 2026-04-16
**Domain:** GSAP ScrollTrigger morph animation, Rive state machines (@rive-app/react-canvas), DOM-based custom cursor, Three.js morphTargetInfluences
**Confidence:** HIGH (all four research questions resolved with verified sources or confirmed first-principles)

---

## Summary

Phase 6 extends the existing WorldScrollCamera / WorldCameraRig architecture with three concurrent scroll-driven behaviors (morph geometry, lighting interpolation, camera) and adds two new interaction layers (Rive state machine overlays, magnetic custom cursor). All four requirements fit within the existing 12-library lock-set: Rive (`@rive-app/react-canvas` v4.28.0) is already named in the lock-set but not yet installed, and GSAP's generic `gsap.to()` can target arbitrary JS object properties, so no proxy libraries are needed.

The decisive architecture choice is to split work across three isolated components mounted inside `WorldScene`: `WorldMorphScroll` (GSAP ScrollTrigger driving morph + light), `RiveSignOverlay` (Rive canvas as `<Html>` child inside R3F), and `WorldCursor` (fixed DOM div, pure CSS transform + mouse events). This separation prevents timing conflicts with the existing `WorldScrollCamera` timeline while reusing its ScrollTrigger trigger element (`#page-content`).

**Primary recommendation:** Add morphTargetInfluences and DirectionalLight color animation to a new ScrollTrigger timeline that runs in **parallel** with WorldScrollCamera's timeline (both targeting `#page-content`, same scrub: 1), using a GSAP proxy ref object read in `useFrame` for the Three.js light color; mount Rive animations as `<Html distanceFactor>` children at island sign positions; implement the custom cursor as a single `position:fixed` div driven by `document.addEventListener('mousemove')` with a `useRef` velocity tracker for magnetic damping.

---

## User Constraints (from PROJECT.md / REQUIREMENTS.md)

- Lock-set hard limit: 12 libraries, **zero new additions**. Rive is already in lock-set.
- `@rive-app/react-canvas` is in lock-set. `@rive-app/react-webgl2` is also in lock-set but `react-canvas` is preferred unless Vector Feathering is required (it is not here).
- No Theatre.js. Camera animation = GSAP + ScrollTrigger only.
- `prefers-reduced-motion` must disable cursor magnet effect and degrade to OS cursor (already handled in Phase 4 via `gsap.matchMedia()` pattern — reuse that pattern here).
- VIS-04 is a **design constraint only**: no special code gate is mandated by the success criteria beyond limiting neutra objects to 3 named meshes. No pixel-counting CI gate is required at phase gate (success criterion 3 says "screenshot" inspection, not automated).
- Custom cursor: **no new `<canvas>`, no new library**. Must use existing R3F canvas + DOM overlay.
- `WorldCanvas` div has `pointerEvents: none` on the container wrapping the R3F Canvas — cursor must live outside that wrapper (inside `UIOverlay` or as a sibling).

---

## Standard Stack

| Library | Version (installed) | Purpose in Phase 6 | Why Standard |
|---------|---------------------|---------------------|--------------|
| `gsap` + `@gsap/react` | 3.15.0 / 2.1.2 | Morph + light color ScrollTrigger timeline | Already used for camera in Phase 3 |
| `three` (WebGPU build) | 0.183.2 | `morphAttributes`, `DirectionalLight.color`, `Color.lerp` | Core 3D engine |
| `@react-three/fiber` | 9.6.0 | `useFrame`, `useThree`, `onPointerOver/Out/Click` on meshes | React integration |
| `@react-three/drei` | 10.7.7 | `<Html distanceFactor>` for Rive overlay positioning | Used in Phase 3 for `<Html>` portal |
| `@rive-app/react-canvas` | 4.28.0 (to install) | `useRive`, `RiveComponent`, `useStateMachineInput` | In lock-set, not yet installed |
| `zustand` | 5.0.12 | `worldStore` slice for cursor target info | Already used for worldStore |
| `tailwindcss` v4 | ^4.0.0 | Cursor div base styles, `cursor-none` body class | Phase 4 baseline |

**Note:** `@rive-app/react-canvas@4.28.0` depends on `@rive-app/canvas@2.37.1`. Installing it adds **zero new lock-set items** — it is a transitive peer of the named lock-set entry.

---

## Architecture Patterns

### A. MOT-02 — Morph Scroll: Simultaneous Morphing + Lighting via ScrollTrigger

**Core pattern:** GSAP can tween arbitrary JS object properties (confirmed from official docs: "Since GSAP can animate any property of any object, you are NOT limited to CSS properties or DOM objects"). Use this to drive a proxy ref whose values are read in `useFrame`.

```tsx
// components/world/WorldMorphScroll.tsx
'use client'
import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import * as THREE from 'three'
import { tokens } from '@/tokens/tokens'

const BASE_COLOR  = new THREE.Color(tokens.scene.sunlight) // e.g. '#fff8e8'
const NEON_COLOR  = new THREE.Color(tokens.color.accentNeon) // oklch → must convert to hex for THREE.Color

export default function WorldMorphScroll() {
  const meshRef  = useRef<THREE.Mesh>(null)      // island A mesh
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const proxy    = useRef({ morph: 0, r: BASE_COLOR.r, g: BASE_COLOR.g, b: BASE_COLOR.b })

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#page-content',
        start: 'top top',
        end: '50% bottom',   // 0% → 50% scroll range per SC-1
        scrub: 1,
      },
    })

    tl.to(proxy.current, {
      morph: 1,
      r: NEON_COLOR.r,
      g: NEON_COLOR.g,
      b: NEON_COLOR.b,
      ease: 'none',
    })

    return () => { tl.kill() }
  }, { dependencies: [], revertOnUpdate: true })

  useFrame(() => {
    if (meshRef.current?.morphTargetInfluences) {
      meshRef.current.morphTargetInfluences[0] = proxy.current.morph
    }
    if (lightRef.current) {
      lightRef.current.color.setRGB(proxy.current.r, proxy.current.g, proxy.current.b)
    }
  })

  return (
    <>
      {/* ref this mesh — geometry must have morphAttributes.position[0] defined */}
      <mesh ref={meshRef} ... />
      <directionalLight ref={lightRef} ... />
    </>
  )
}
```

**Critical:** `useFrame` reads the proxy ref every frame, so there is no React state set in the hot path and no race condition. This mirrors the "proxy object mutated by GSAP, consumed by render loop" pattern that the community has established as the standard for Three.js + GSAP.

**Morph geometry definition:** FloatingIsland currently builds geometry procedurally (SphereGeometry with manual vertex deformation). To add morphTargetInfluences, create a second position buffer (morph target) at geometry creation time:

```ts
// Inside FloatingIsland.tsx — in the useMemo that creates the geometry
const morphPosArray = new Float32Array(pos.array.length)
// ... fill with alternate vertex positions (e.g. flatter island, different silhouette)
geo.morphAttributes.position = [new THREE.Float32BufferAttribute(morphPosArray, 3)]
geo.morphTargetsRelative = false // absolute positions
```

Once `morphAttributes.position` is set before first render, `mesh.morphTargetInfluences` is automatically initialized to `[0]`. GSAP tweens it to `[1]` over scroll.

**Light color:** `DirectionalLight.color` is a `THREE.Color`. Setting `.r`, `.g`, `.b` directly is the correct approach — `THREE.Color.lerp()` in a render loop is the alternative but is less clean when the interpolation target is itself animated. The proxy pattern above gives GSAP control over the lerp curve while `useFrame` applies the result.

**Important constraint:** This new ScrollTrigger timeline uses **the same trigger element** (`#page-content`) as `WorldScrollCamera`. This is safe because GSAP allows multiple independent timelines on the same trigger. However the `end` value (`50% bottom`) must be set independently — it does NOT share the WorldScrollCamera timeline object. Both timelines use `scrub: 1` so they lock to scroll position independently.

**prefers-reduced-motion:** Wrap in `gsap.matchMedia()` exactly as in WorldScrollCamera. When `reduceMotion` is true, `gsap.set(proxy.current, { morph: 1 })` instantly and skip the tl.

---

### B. INT-01 — Rive State Machines as drei `<Html>` Overlays

**Architecture decision:** Rive renders to its own internal `<canvas>` element inside `RiveComponent`. This is NOT a WebGL integration — it is a 2D canvas placed in the DOM. Drei's `<Html>` component places arbitrary DOM trees at world-space positions by computing CSS transforms via R3F's camera projection. This is the correct pattern: Rive canvas floats at a 3D position without any WebGL coupling.

**R3F pointer event vs. HTML event:** Since the Rive component renders in the DOM (not in the Three.js scene), hover and click events come from the **DOM pointer events** on `RiveComponent`, not from R3F raycasting. This is simpler: `onPointerEnter`, `onPointerLeave`, `onClick` on the wrapper div around `RiveComponent` drive the state machine inputs directly.

**API (verified):**
```tsx
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'

// Boolean input for hover state
const { rive, RiveComponent } = useRive({
  src: '/assets/rive/sign-a.riv',
  stateMachines: 'SignMachine',  // matches state machine name in .riv file
  autoplay: true,
})

const hoverInput    = useStateMachineInput(rive, 'SignMachine', 'hover')    // SMIBool
const activateTrigger = useStateMachineInput(rive, 'SignMachine', 'activate') // SMITrigger

// Handler
function handleEnter() { if (hoverInput)    hoverInput.value = true  }
function handleLeave() { if (hoverInput)    hoverInput.value = false }
function handleClick() { if (activateTrigger) activateTrigger.fire()  }
```

**drei `<Html>` positioning pattern:**
```tsx
// Inside WorldScene or ArchipelagoScene — at sign position
<Html distanceFactor={10} position={[-8, 2.5, 0]} center>
  <RiveSignBoard src="/assets/rive/sign-a.riv" stateMachine="SignMachine" />
</Html>
```

`distanceFactor` scales the HTML element with camera distance, keeping it "in world space." The Rive component renders to a 2D canvas inside this div.

**Three Rive signs:** Create three `RiveSignBoard` component instances, one per island, mounted at appropriate world positions. Each gets its own `.riv` file or reuses the same file. Per success criterion 2, each must have `hover` (SMIBool) and `activate` (SMITrigger) inputs in the state machine.

**Rive file requirement:** `.riv` files must be created in the Rive editor (https://rive.app) and placed in `public/assets/rive/`. For Phase 6 planning, create stub `.riv` files (Rive provides export). The planner should include a task to create or source three `.riv` sign animations.

**CRITICAL — Rive with WebGL2 vs canvas:** `@rive-app/react-canvas` uses a 2D canvas renderer. This is correct for this use case (DOM overlay). It does NOT conflict with the WebGPU R3F canvas. They are independent canvas elements.

**pointerEvents on WorldCanvas:** `WorldCanvas` div has `pointerEvents: none`. `<Html>` children from drei render outside the canvas boundary in the DOM overlay, so they receive pointer events normally. No changes needed to WorldCanvas.

---

### C. VIS-04 — Neutra Isolation: Design Constraint, Code Pattern

This is primarily a **naming and placement convention**, not a runtime enforcement system.

**Implementation pattern:**
1. Create three neutra-specific mesh components with explicit `userData.style = 'neutra'` tags: `NeutroSign`, `CRTMonitor`, `PixelCharacter`.
2. Place them only on designated positions (e.g., home island). Do not distribute throughout the scene.
3. Use pixel fonts only on those three objects' `<Html>` labels, not globally.
4. VIS-04 success criterion 3 says "screenshot inspection" and "specific objects 3종에 한정" — this is a visual audit, not a lint gate.

**No pixel-area measurement CI** is required per the success criteria text. The "15% of pixels" criterion is verified manually by screenshot inspection. The planner should include a verification task but NOT a code gate.

**Code tagging pattern:**
```tsx
// Marks objects as neutra-isolated for scene auditing
<mesh userData={{ style: 'neutra', name: 'crt-monitor' }} ... />
```

**Existing colorAudit.ts** (Phase 5) already provides a model for scene auditing — a similar `scripts/neutra-audit.ts` could be added if automated verification is later needed, but it is NOT required for Phase 6 gate.

---

### D. VIS-05 — Custom Cursor: DOM div + CSS Transform + Mouse Events

**Architecture:** A `position: fixed; top: 0; left: 0; pointer-events: none; z-index: 50` div tracks mouse position using `translate(x, y)` CSS transform. No new canvas. No new library.

**Magnetic pull pattern (no Framer Motion needed):**
- On `mousemove`: compute cursor position from event.clientX/Y
- On `pointerenter` of an interactive element (Rive sign div or DOM button): compute vector from cursor to element center, lerp cursor toward element center using a damping factor
- Implement damping with a velocity ref that decays each frame via `requestAnimationFrame` or GSAP ticker

**GSAP ticker pattern (reuses existing GSAP):**
```tsx
// components/world/WorldCursor.tsx
'use client'
import { useRef, useEffect } from 'react'
import { gsap } from '@/lib/gsap'
import { useWorldStore } from '@/lib/worldStore'

export default function WorldCursor() {
  const cursorRef  = useRef<HTMLDivElement>(null)
  const pos        = useRef({ x: 0, y: 0 })  // raw mouse
  const current    = useRef({ x: 0, y: 0 })  // smoothed position
  const magnetTarget = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    // prefers-reduced-motion: degrade to OS cursor
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return  // don't mount cursor, body keeps default cursor

    document.body.classList.add('cursor-none') // Tailwind: hides OS cursor

    const onMove = (e: MouseEvent) => {
      pos.current.x = e.clientX
      pos.current.y = e.clientY
    }
    window.addEventListener('mousemove', onMove)

    // GSAP ticker for smooth damping — runs at display framerate
    const ticker = gsap.ticker.add(() => {
      const target = magnetTarget.current ?? pos.current
      // Lerp toward target (magnetic pull when near interactive element)
      current.current.x += (target.x - current.current.x) * 0.15
      current.current.y += (target.y - current.current.y) * 0.15

      if (cursorRef.current) {
        cursorRef.current.style.transform =
          `translate(${current.current.x}px, ${current.current.y}px)`
      }
    })

    return () => {
      gsap.ticker.remove(ticker)
      window.removeEventListener('mousemove', onMove)
      document.body.classList.remove('cursor-none')
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      style={{
        position: 'fixed', top: 0, left: 0,
        width: 20, height: 20,
        borderRadius: '50%',
        background: 'var(--color-accent-neon)',
        pointerEvents: 'none',
        zIndex: 9999,
        transform: 'translate(-100px, -100px)', // offscreen until first move
      }}
    />
  )
}
```

**Magnetic activation:** Interactive elements (Rive sign wrappers, DOM buttons) need `onPointerEnter` / `onPointerLeave` handlers that set/clear `magnetTarget.current` in the WorldCursor. Since WorldCursor and Rive signs are siblings in the React tree, coordinate via `worldStore` — add a `cursorMagnetTarget: { x: number; y: number } | null` slice to worldStore. Interactive elements write to it; WorldCursor reads from it.

**prefers-reduced-motion gate:** The `useEffect` returns early if `mq.matches === true`. This means:
- The cursor div is never mounted visually
- `cursor-none` class is never applied to body
- OS default cursor remains visible
- Magnetic effect never runs

This satisfies VIS-05 success criterion 4 and complies with the existing Phase 4 MOT-04 `gsap.matchMedia()` pattern.

**R3F raycasting NOT needed for cursor:** Since the cursor tracks DOM pointer events (mouse coordinates), and Rive signs are DOM elements (not 3D objects), no R3F raycasting is required. The cursor is purely DOM-space. R3F's `onPointerOver` on 3D meshes could be used to show a different cursor state when hovering 3D geometry, but the success criteria only require magnet behavior on "월드 UI 상호작용" (world UI interactions), which are the Rive sign DOM overlays.

---

## Implementation Map

### Files to Create

| File | Purpose | Complexity |
|------|---------|------------|
| `components/world/WorldMorphScroll.tsx` | New component: GSAP ScrollTrigger timeline driving morphTargetInfluences proxy ref + directional light color via useFrame | L |
| `components/world/RiveSignBoard.tsx` | Rive state machine component: `useRive` + `useStateMachineInput` for hover (bool) + activate (trigger) | M |
| `components/world/WorldCursor.tsx` | Fixed DOM div cursor + GSAP ticker damping + worldStore magnetic target integration + prefers-reduced-motion gate | M |
| `public/assets/rive/sign-a.riv` | Rive animation file for island A sign (must be created in Rive editor) | M (design task) |
| `public/assets/rive/sign-b.riv` | Rive animation file for island B sign | M (design task) |
| `public/assets/rive/sign-c.riv` | Rive animation file for island C sign | M (design task) |

### Files to Modify

| File | Change | Complexity |
|------|--------|------------|
| `components/world/FloatingIsland.tsx` | Add `morphAttributes.position[0]` to the geometry in `useMemo`; accept `morphRef` prop for external ref | M |
| `components/world/ArchipelagoScene.tsx` | Mount `WorldMorphScroll` + three `<Html>` Rive sign wrappers at island positions; add three neutra objects (`NeutroSign`, `CRTMonitor`, `PixelCharacter`) with `userData.style = 'neutra'` | M |
| `components/world/WorldScene.tsx` | Import and mount `WorldCursor` | S |
| `lib/worldStore.ts` | Add `cursorMagnetTarget: { x: number; y: number } | null` + `setCursorMagnetTarget` action | S |
| `app/globals.css` | Add `.cursor-none * { cursor: none; }` rule; add neutra typography classes (pixel font @font-face if needed, scoped to `.neutra-element`) | S |
| `app/layout.tsx` | No changes needed (WorldCursor mounts inside WorldScene → UIOverlay already in place) | — |
| `package.json` | Add `@rive-app/react-canvas@4.28.0` to dependencies | S |

### Files to NOT change

- `shaders/CloudSeaSky.tsx` — Phase 5 artifact, no Phase 6 changes
- `components/world/WorldScrollCamera.tsx` — Phase 3 artifact; WorldMorphScroll runs a separate ST timeline in parallel, no modification needed
- `components/world/WorldCameraRig.tsx` — untouched
- `lib/waypoints.ts` — untouched (Rive sign positions are hardcoded in ArchipelagoScene)

---

## Dependencies

| Package | Status | Action Required |
|---------|--------|-----------------|
| `@rive-app/react-canvas` | In lock-set, NOT YET INSTALLED | `npm install @rive-app/react-canvas@4.28.0` |
| `@rive-app/canvas` | Transitive dep of react-canvas | Installed automatically |
| `gsap` | Already installed (3.15.0) | None |
| `@gsap/react` | Already installed (2.1.2) | None |
| `three` | Already installed (0.183.2) | None |
| `@react-three/fiber` | Already installed (9.6.0) | None |
| `@react-three/drei` | Already installed (10.7.7) | None |
| `zustand` | Already installed (5.0.12) | None |

**Lock-set verification:** Installing `@rive-app/react-canvas` is explicitly permitted — it is listed as item 10 in the CLAUDE.md lock-set table ("Rive web runtime — 마이크로 인터랙션"). Zero new lock-set items are added.

---

## Risk Register

### Risk 1: GSAP proxy ref pattern relies on `useFrame` ticking every frame
**Severity:** MEDIUM
**What goes wrong:** If ScrollTrigger's `scrub: 1` smoothing means the proxy updates lag by one frame vs. the R3F frame loop, there could be visual stutter.
**Mitigation:** Use `gsap.ticker.lagSmoothing(0)` to disable GSAP's lag smoothing (already the recommended pattern for scroll + render loop sync). The proxy ref is a plain object — there is no React state set in the hot path, so no re-render cost.
**Warning signs:** Visible jitter on morph at 60fps. Fix: reduce `scrub` value or read directly in `onUpdate` callback instead of `useFrame`.

### Risk 2: `morphTargetInfluences` undefined on FloatingIsland mesh
**Severity:** HIGH
**What goes wrong:** Three.js only initializes `mesh.morphTargetInfluences` if `geometry.morphAttributes.position` was non-empty when the mesh was first rendered. If the geometry is created without morph attributes, the array is undefined and `meshRef.current.morphTargetInfluences[0]` throws.
**Mitigation:** Always set `morphAttributes.position = [new THREE.Float32BufferAttribute(..., 3)]` in the FloatingIsland geometry `useMemo` before return. Add a guard in `useFrame`: `if (meshRef.current?.morphTargetInfluences)`.
**Warning signs:** Console TypeError; mesh renders with no morph.

### Risk 3: Rive `.riv` files not created / wrong state machine names
**Severity:** HIGH
**What goes wrong:** `useStateMachineInput(rive, 'SignMachine', 'hover')` returns null if the state machine name or input name in the `.riv` file doesn't match exactly. The Rive component renders but inputs do nothing.
**Mitigation:** Create `.riv` stub files in Rive editor during implementation; document exact state machine name (`SignMachine`) and input names (`hover` bool, `activate` trigger) as constants. Use `console.log(rive?.stateMachineNames)` during dev to verify.
**Warning signs:** `useStateMachineInput` returns null after Rive is ready.

### Risk 4: `<Html distanceFactor>` Rive overlay occlusion / z-fighting
**Severity:** MEDIUM
**What goes wrong:** Rive sign overlays rendered via `<Html>` use CSS `transform` for 3D positioning. At certain camera angles, the sign may appear behind geometry (drei `<Html>` uses `z-index` / CSS stacking, not WebGL depth). The sign could also be visible through islands.
**Mitigation:** Use `<Html occlude>` prop from drei v10 — when `occlude` is set, drei raycasts from the camera to the Html position and hides it when occluded by 3D geometry. Confirm drei v10.7.7 supports `occlude` prop (it has since drei v8+, confidence HIGH).
**Warning signs:** Signs visible through islands or pop behind them.

### Risk 5: WorldCursor `cursor-none` class applied on page before cursor div renders
**Severity:** LOW
**What goes wrong:** If `cursor-none` is applied to `document.body` before the cursor div is positioned, the user briefly sees no cursor at all during hydration.
**Mitigation:** Apply `cursor-none` only inside the `useEffect` (client only), after the GSAP ticker is started. Add a small translate offset starting at `(-9999px, -9999px)` so the div is offscreen until first `mousemove`.
**Warning signs:** Cursor disappears on initial page load for 1-2 frames.

### Risk 6: `oklch` color strings incompatible with `THREE.Color` constructor
**Severity:** HIGH
**What goes wrong:** `tokens.color.accentNeon` is `'oklch(0.82 0.25 140)'`. `new THREE.Color('oklch(...)')` is **not supported** in Three.js r183 (THREE.Color only parses CSS hex, rgb(), hsl(), and named colors). The Color will silently default to black.
**Mitigation:** In `WorldMorphScroll.tsx`, define NEON_COLOR using hex equivalent: `new THREE.Color(0x8eff4f)` (approximately oklch 0.82/0.25/140 converted to hex). Add a comment referencing the token. Do NOT pass raw oklch strings to THREE.Color. The existing `colorAudit.ts` already sidesteps this (it uses hex in `tokens.scene.*`).
**Warning signs:** Light stays black when tweened; check with `console.log(NEON_COLOR)` to verify r/g/b are non-zero.

### Risk 7: Two concurrent ScrollTrigger timelines on `#page-content` may conflict
**Severity:** MEDIUM
**What goes wrong:** `WorldScrollCamera` and `WorldMorphScroll` both create ST instances targeting `#page-content`. If both call `ScrollTrigger.refresh()` simultaneously (race on mount), one may calculate incorrect bounds.
**Mitigation:** WorldMorphScroll should NOT call `ScrollTrigger.refresh()` — WorldScrollCamera already does that (with a `setTimeout(() => ScrollTrigger.refresh(), 0)` guard). GSAP automatically refreshes all STs together. Do not add a second refresh call.
**Warning signs:** Morph animation starts at wrong scroll position; check with `st.progress` in onUpdate.

---

## Code Examples

### Verified morph attribute definition (THREE.js r183 API — confirmed)
```ts
// In FloatingIsland.tsx useMemo, after base geometry construction:
const posAttr = geo.attributes.position as THREE.BufferAttribute
const morphArr = new Float32Array(posAttr.array.length)
// Copy base then deform for alternate shape
for (let i = 0; i < posAttr.count; i++) {
  morphArr[i * 3 + 0] = posAttr.getX(i)
  morphArr[i * 3 + 1] = posAttr.getY(i) * 0.4  // squash for morph target shape
  morphArr[i * 3 + 2] = posAttr.getZ(i)
}
geo.morphAttributes.position = [new THREE.Float32BufferAttribute(morphArr, 3)]
geo.morphTargetsRelative = false
```

### Verified GSAP proxy + useFrame pattern (first-principles, confirmed by GSAP docs)
```ts
const proxy = useRef({ morph: 0, r: 1.0, g: 0.97, b: 0.91 })

// In useGSAP:
gsap.to(proxy.current, {
  morph: 1, r: 0.56, g: 1.0, b: 0.31,
  scrollTrigger: { trigger: '#page-content', start: 'top top', end: '50% bottom', scrub: 1 },
  ease: 'none',
})

// In useFrame:
if (meshRef.current?.morphTargetInfluences) {
  meshRef.current.morphTargetInfluences[0] = proxy.current.morph
}
if (lightRef.current) {
  lightRef.current.color.setRGB(proxy.current.r, proxy.current.g, proxy.current.b)
}
```

### Verified Rive state machine pattern (@rive-app/react-canvas v4.28.0)
```tsx
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'

const { rive, RiveComponent } = useRive({
  src: '/assets/rive/sign-a.riv',
  stateMachines: 'SignMachine',
  autoplay: true,
})
const hoverInput = useStateMachineInput(rive, 'SignMachine', 'hover')      // SMIBool
const activateTrigger = useStateMachineInput(rive, 'SignMachine', 'activate') // SMITrigger

<div
  onPointerEnter={() => { if (hoverInput) hoverInput.value = true }}
  onPointerLeave={() => { if (hoverInput) hoverInput.value = false }}
  onClick={() => { if (activateTrigger) activateTrigger.fire() }}
>
  <RiveComponent style={{ width: 120, height: 80 }} />
</div>
```

### Verified cursor GSAP ticker pattern (reuses gsap@3.15.0 ticker)
```ts
const ticker = gsap.ticker.add(() => {
  current.x += (target.x - current.x) * 0.15
  current.y += (target.y - current.y) * 0.15
  el.style.transform = `translate(${current.x}px, ${current.y}px)`
})
// Cleanup: gsap.ticker.remove(ticker)
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Install Action |
|------------|-------------|-----------|---------|----------------|
| `@rive-app/react-canvas` | INT-01 | Not installed | 4.28.0 (latest) | `npm install @rive-app/react-canvas@4.28.0` |
| `.riv` animation files | INT-01 | Not created | N/A | Create 3 files in Rive editor (design task) |
| `THREE.BufferAttribute` morph API | MOT-02 | Available (three@0.183.2) | r183 | None |
| `gsap.ticker` | VIS-05 | Available (gsap@3.15.0) | 3.15.0 | None |
| `@react-three/drei` `<Html occlude>` | INT-01 | Available (drei@10.7.7) | 10.7.7 | None |

---

## Open Questions

1. **Morph target shape for islands A, B, C:** What should the morph target geometry look like? (e.g., island flattening, rock spike formation, bloom). This is a design decision for the implementation task — the planner should note that the morph target shape must be authored during implementation.

2. **Rive file creation:** `.riv` files are design artifacts, not code artifacts. The planner must include a task that gates on Rive file creation. The files can be simple (idle → hover → activate state transitions) and can be created with Rive's free tier.

3. **Scroll range for MOT-02 (`0% → 50%`):** WorldScrollCamera currently flies through 3 waypoints across `0% → 100%` of scroll. The morph ScrollTrigger must cover only `0% → 50%` (per success criterion 1). The end value `50% bottom` in a ScrollTrigger maps to when the scroll position reaches 50% of `#page-content`. Verify this doesn't interfere with waypoints 2 and 3 animation visually.

4. **THREE.Color hex for oklch tokens:** Exact hex equivalents for `accentNeon = oklch(0.82 0.25 140)` need to be computed and hardcoded. Use an oklch→hex converter tool. This is a one-time setup step.

---

## Sources

**HIGH confidence (official docs / npm registry):**
- [GSAP docs — gsap.to() targets any object](https://gsap.com/docs/v3/GSAP/gsap.to/)
- [GSAP ScrollTrigger docs — scrub, onUpdate, self.progress](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [@rive-app/react-canvas on npm — v4.28.0, exports useRive + useStateMachineInput](https://www.npmjs.com/package/@rive-app/react-canvas)
- [Rive React state machines docs — useStateMachineInput, SMIBool.value, SMITrigger.fire()](https://github.com/rive-app/help-center/blob/master/runtimes/state-machines.md)
- [Rive community doc React API — useRive hook, RiveComponent, stateMachines param](https://rive.app/community/doc/react/docRfaSQ0eaE)
- [three.js r183 morphAttributes API — geometry.morphAttributes.position, morphTargetInfluences](https://dustinpfister.github.io/2023/02/03/threejs-buffer-geometry-morph-attributes/)
- [R3F events API — onPointerOver, onPointerOut, onClick on meshes](https://r3f.docs.pmnd.rs/tutorials/events-and-interaction)

**MEDIUM confidence (community sources, pattern verified independently):**
- [Rive React-canvas integration — state machine trigger pattern](https://tympanus.net/codrops/2025/05/12/integrating-rive-into-a-react-project-behind-the-scenes-of-valley-adventures/)
- [Rive React state machine gist — useStateMachineInput boolean + trigger](https://gist.github.com/ankitvashisht12/67659457e79f102c8d64d7d510b4274c)
- [three.js forum — THREE.Color lerp in animation loop vs GSAP tween](https://discourse.threejs.org/t/using-gsap-to-fade-colour-or-any-var-of-a-material-on-mouse-over-out/41493)
- [GSAP community — morphTargetInfluences + ScrollTrigger](https://gsap.com/community/forums/topic/25016-scrolltrigger-and-threejs/)
- [R3F + GSAP scroll animations pattern](https://wawasensei.hashnode.dev/scroll-animations-with-react-three-fiber-and-gsap)
