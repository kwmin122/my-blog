# Phase 4: Design System & Accessibility Baseline — Research

**Researched:** 2026-04-15
**Domain:** Design tokens (Tailwind v4 @theme + TypeScript), ESLint flat config custom rules, ARIA keyboard navigation, prefers-reduced-motion (GSAP), canvas aria-hidden
**Confidence:** HIGH (all critical claims verified against official docs or official sources)

---

## Summary

Phase 4 delivers four orthogonal requirements that touch nearly every layer of the codebase: token enforcement (DSGN-01), `/text/` route accessibility (A11Y-03), reduced-motion fallback in camera components (MOT-04), and keyboard waypoint navigation (INT-03). None of these depend on each other at runtime, but DSGN-01 (tokens + lint) is a prerequisite for the focus-ring styling required by A11Y-03 and INT-03.

The defining technical challenge is the ESLint custom rule: it must be wired inline in `eslint.config.mjs` as a local plugin — no separate package — and must catch hex literals in `Literal`, `JSXAttribute`, and `Property` (style objects) AST nodes. The `prefers-reduced-motion` problem is cleanly solved with GSAP's built-in `gsap.matchMedia()` conditions object, requiring zero new dependencies. The keyboard waypoint navigator (`WorldKeyboardNav`) should NOT use Tab-to-cycle (violates ARIA APG conventions); it should be a single-tab-stop `role="listbox"` with arrow-key cycling inside, `aria-activedescendant`, and `aria-selected` on items — except the success criterion literally says "Tab마다 다음 waypoint" which means the requirement overrides ARIA best practice. The implementation must therefore use Tab-to-cycle with a focus trap inside the widget, and add a note in the code about this deliberate deviation.

**Primary recommendation:** Implement in three waves — Wave 1 parallel: (a) `tokens/tokens.ts` + `globals.css @theme` + ESLint rule, (b) `/text/` skip-nav + heading structure + focus ring + aria-hidden canvas. Wave 2: `WorldCameraRig` + `WorldScrollCamera` reduced-motion patch. Wave 3: `WorldKeyboardNav` component (depends on tokens for focus ring visual).

---

## User Constraints (from REQUIREMENTS.md + design doc)

| Constraint | Source | Implication |
|-----------|--------|-------------|
| Lock-set: 12 libs only, no new deps | CLAUDE.md | No `@react-three/a11y`, no external skip-nav package. Native CSS + React + GSAP only. |
| Tailwind v4 | CLAUDE.md lock-set | Use `@theme` in globals.css, not tailwind.config.js. |
| `prefers-reduced-motion` = fade-cut = ≤200ms duration, not CSS-only | Phase 4 SC #4 | Must patch GSAP tween duration, not just add CSS transition. |
| Focus ring token = `--focus-ring` CSS custom property | design doc | Token name is prescribed; must export from tokens.ts AND define in @theme. |
| `pnpm lint` must fail on hardcoded hex | Phase 4 SC #1 | `--max-warnings 0` already in package.json scripts. Rule must be `"error"` level. |
| No Theatre.js, no Astro, no external CMS | CLAUDE.md | Out of scope; confirm no drift. |

---

## Standard Stack

| Library / API | Version | Purpose in Phase 4 | Confidence |
|---------------|---------|---------------------|------------|
| Tailwind v4 `@theme` directive | 4.x (project locked) | Define CSS custom properties that generate utility classes | HIGH — official Tailwind docs |
| ESLint flat config `plugins` inline object | ESLint 9 (project uses eslint ^9) | Define `local/no-hardcoded-hex` rule without separate package | HIGH — official ESLint docs |
| `gsap.matchMedia()` conditions object | GSAP 3.15.0 (project locked) | Reduced-motion branch inside `useGSAP` without extra state | HIGH — official GSAP docs |
| `window.matchMedia` + React `useEffect` | Browser + React 19 | SSR-safe `usePrefersReducedMotion` hook | HIGH — MDN + Josh Comeau |
| `aria-hidden="true"` on canvas wrapper | HTML ARIA | Hide entire 3D subtree from screen reader | HIGH — MDN ARIA spec |
| Native `<a href="#page-content">` skip link | HTML | Skip-nav without Reach UI | HIGH — WCAG technique |
| `role="listbox"` + `aria-activedescendant` | WAI-ARIA APG | Waypoint keyboard nav container | HIGH — W3C APG |
| `aria-selected` on `role="option"` items | WAI-ARIA | Per-waypoint selection state | HIGH — W3C APG |

---

## Recommended Approach

### DSGN-01 — Design Tokens + ESLint Lint Gate

**Step 1: globals.css @theme block**

Tailwind v4's `@theme` directive compiles token definitions to CSS custom properties on `:root` and simultaneously generates utility classes. Non-standard tokens (focus-ring, lighting intensity) that don't map to a Tailwind utility namespace must be defined in a separate `:root {}` block or via `@layer base`.

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Color */
  --color-base: oklch(0.12 0.01 240);
  --color-surface: oklch(0.18 0.02 240);
  --color-accent-neon: oklch(0.82 0.25 140);
  --color-accent-sky: oklch(0.78 0.15 220);
  --color-accent-light: oklch(0.90 0.08 60);
  --color-text-primary: oklch(0.96 0.01 240);
  --color-text-muted: oklch(0.70 0.03 240);

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  --spacing-xl: 4rem;

  /* Typography */
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-4xl: 2.25rem;

  /* Easing */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Tokens outside Tailwind namespace — define in :root */
:root {
  /* Focus ring (not a Tailwind utility, used only in CSS :focus-visible) */
  --focus-ring: 0 0 0 3px oklch(0.82 0.25 140);

  /* Lighting — used by GSAP/Three.js JS consumers via tokens.ts */
  --lighting-ambient-intensity: 0.4;
  --lighting-directional-intensity: 1.2;
  --lighting-accent-hue: 140;
}
```

**Step 2: tokens/tokens.ts (TypeScript mirror)**

`tokens.ts` exports typed JS constants that mirror the CSS values. This is the dual-source strategy — CSS defines truth for Tailwind utilities and runtime CSS vars; TS exports the same values for Three.js/GSAP JS consumers (lighting intensities, easing strings, color values passed to `THREE.Color`).

```typescript
// tokens/tokens.ts
// Single source of truth for JS consumers (Three.js lights, GSAP ease strings).
// CSS consumers: use var(--color-*) / var(--lighting-*) directly.

export const tokens = {
  color: {
    base:        'oklch(0.12 0.01 240)',
    surface:     'oklch(0.18 0.02 240)',
    accentNeon:  'oklch(0.82 0.25 140)',
    accentSky:   'oklch(0.78 0.15 220)',
    accentLight: 'oklch(0.90 0.08 60)',
    textPrimary: 'oklch(0.96 0.01 240)',
    textMuted:   'oklch(0.70 0.03 240)',
  },
  spacing: {
    xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem',
  },
  typography: {
    sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem',
    '2xl': '1.5rem', '4xl': '2.25rem',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in:      'cubic-bezier(0.4, 0, 1, 1)',
    out:     'cubic-bezier(0, 0, 0.2, 1)',
    bounce:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  lighting: {
    ambientIntensity:     0.4,
    directionalIntensity: 1.2,
    accentHue:            140,
  },
} as const

export type TokenColor   = typeof tokens.color
export type TokenEasing  = typeof tokens.easing
export type TokenLighting = typeof tokens.lighting
```

**Step 3: ESLint inline custom rule in eslint.config.mjs**

The rule must target `Literal` nodes (bare string values), catching hex strings wherever they appear — in JSX props, style object properties, and regular assignments. The `Literal` visitor is sufficient because every hardcoded hex string ultimately resolves to a `Literal` node in the AST, regardless of context.

The pattern to match: `/#[0-9a-fA-F]{3,8}\b/` — catches #RGB, #RRGGBB, #RRGGBBAA.

`eslint-config-next` returns an array of config objects. Spreading it and appending a new config object with the local plugin is the correct flat config extension pattern.

```js
// eslint.config.mjs
import nextConfig from 'eslint-config-next'

const noHardcodedHexRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow hardcoded hex color literals — use design tokens instead' },
    messages: {
      noHex: 'Hardcoded hex color "{{ value }}" detected. Use a token from tokens/tokens.ts or var(--color-*) instead.',
    },
  },
  create(context) {
    const HEX_RE = /#[0-9a-fA-F]{3,8}\b/

    function checkString(node, value) {
      if (typeof value === 'string' && HEX_RE.test(value)) {
        context.report({
          node,
          messageId: 'noHex',
          data: { value: value.trim() },
        })
      }
    }

    return {
      // Catches: color: '#fff', style={{ color: '#fff' }}, const c = '#fff'
      Literal(node) {
        checkString(node, node.value)
      },
      // Catches: `color: ${'#fff'}` — template literal quasis
      TemplateElement(node) {
        checkString(node, node.value?.raw)
      },
    }
  },
}

export default [
  ...nextConfig,
  {
    plugins: {
      local: {
        rules: { 'no-hardcoded-hex': noHardcodedHexRule },
      },
    },
    rules: {
      'local/no-hardcoded-hex': 'error',
    },
  },
]
```

**Critical note on `eslint-config-next` shape:** `eslint-config-next` exports an array of config objects in ESLint 9 flat config format. Spreading it with `...nextConfig` then appending the local plugin config is the confirmed pattern for Next.js 16 + ESLint 9. If `nextConfig` is not an array (some versions export a single object), replace `...nextConfig` with `nextConfig`.

**Existing files that will trigger the new rule and need patching:**

- `WorldCanvas.tsx` line 32: `background: '#0a0a0a'` — must become `tokens.color.base` or `var(--color-base)`
- `WorldCanvas.tsx` line 51: `style={{ color: 'white' }}` — `'white'` is NOT a hex, so this is fine
- `WorldScene.tsx` line 34: `background: 'rgba(0,0,0,0.7)'` — not a hex, fine
- `WorldScene.tsx` line 37: `color: 'white'` — not a hex, fine

Only `WorldCanvas.tsx`'s `#0a0a0a` will fail. Patch it in plan 04-01 before enabling the rule, or add a targeted `eslint-disable` comment with a TODO for the pre-token legacy value.

---

### A11Y-03 — `/text/{slug}` Keyboard + Screen Reader Accessibility

**Skip-nav link**

Add to `app/layout.tsx` before `<WorldCanvasLoader />`:

```tsx
<a
  href="#page-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[--color-surface] focus:text-[--color-text-primary] focus:outline-none focus:ring-[--focus-ring]"
>
  본문으로 건너뛰기
</a>
```

`<main id="page-content">` already exists in layout.tsx line 27 — the skip link target is already present.

**Heading structure in `/text/{slug}/page.tsx`**

The `<article>` must not contain an implicit H1 inside the MDX; the MDX frontmatter `title` should render as the page's H1 explicitly in the page component so the heading tree is `H1 > H2 > H3`, not two H1s.

Current `page.tsx` renders `<Post />` directly which includes MDX H1. This is fine if MDX files use `# Title` as the first heading. The risk is: the layout does NOT have a page-level H1 above the article, meaning the first heading the reader encounters is inside MDX. This is acceptable for a content page but should be verified by confirming MDX files start with `# Title`.

**Focus ring via token**

In `globals.css`:

```css
@layer base {
  :focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
}
```

This applies the `--focus-ring` token globally to all focusable elements, satisfying SC #2.

**aria-hidden on 3D canvas**

The canvas wrapper `<div data-canvas-id="world-canvas">` in `WorldCanvas.tsx` needs `aria-hidden="true"`. The current code (line 99) does not have it.

Correct placement is on the wrapper `<div>` in `WorldCanvas.tsx`, NOT on `<WorldCanvasLoader>` or the `<Canvas>` element directly (R3F renders the `<canvas>` inside its own wrapper; `aria-hidden` on the outer div covers the entire subtree).

```tsx
<div
  data-canvas-id="world-canvas"
  aria-hidden="true"                   // add this
  style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
>
```

**Important:** Because `pointerEvents: 'none'` is already set, the canvas wrapper cannot receive focus, so `aria-hidden` on it is safe (MDN explicitly warns against `aria-hidden` on focusable elements — this wrapper is not focusable).

The `<StaticPosterFallback>` renders a `<Link href="/text">` which IS focusable. This link must NOT be inside the `aria-hidden` container. In the current code, `StaticPosterFallback` is returned instead of the `<div>` wrapper, so it is never inside the `aria-hidden` div. This is correct and safe.

**Published date and metadata for screen readers**

`/text/[slug]/page.tsx` currently does not render publication date from frontmatter. The MDX file's frontmatter `date` field should be rendered as `<time dateTime="...">` within the `<article>` for SC #3 (발행일 선형 낭독). This requires updating `page.tsx` to extract frontmatter metadata and render it.

---

### MOT-04 — prefers-reduced-motion Fade-Cut

**Verified approach: `gsap.matchMedia()` conditions object inside `useGSAP`**

GSAP 3.15.0 has `gsap.matchMedia()` which creates a reactive media query context. The `reduceMotion: '(prefers-reduced-motion: reduce)'` condition reduces tween duration to 0 (teleport) or a minimal 200ms.

The "fade-cut" requirement means the camera teleports in ≤200ms — not a literal CSS opacity fade. The specification says "camera가 200ms fade-cut으로 전환". Implementation: set `duration: 0.18` (180ms) and `ease: 'none'` when `reduceMotion` is true.

**WorldCameraRig.tsx patch:**

```tsx
useGSAP(() => {
  if (!activeWaypoint) return
  const { position, target } = activeWaypoint

  const mm = gsap.matchMedia()
  mm.add(
    { reduceMotion: '(prefers-reduced-motion: reduce)' },
    (ctx) => {
      const { reduceMotion } = ctx.conditions as { reduceMotion: boolean }
      const tween = gsap.to(camera.position, {
        x: position.x, y: position.y, z: position.z,
        duration: reduceMotion ? 0.18 : 1.5,
        ease: reduceMotion ? 'none' : 'power2.inOut',
        overwrite: 'auto',
        onUpdate: () => { camera.lookAt(target.x, target.y, target.z) },
      })
      return () => { tween.kill() }
    }
  )

  return () => { mm.revert() }
}, { dependencies: [activeWaypoint] })
```

**WorldScrollCamera.tsx patch:**

ScrollTrigger scrub:1 continuously drives the camera — when `prefers-reduced-motion` is active, the entire scroll-driven timeline should be disabled and replaced with a direct snap to the nearest waypoint.

```tsx
useGSAP(() => {
  if (!isHomePage) return

  const mm = gsap.matchMedia()
  mm.add(
    { reduceMotion: '(prefers-reduced-motion: reduce)' },
    (ctx) => {
      const { reduceMotion } = ctx.conditions as { reduceMotion: boolean }

      if (reduceMotion) {
        // Snap camera to home waypoint immediately — no ScrollTrigger
        gsap.set(camera.position, { x: 0, y: 8, z: 20 })
        return
      }

      gsap.killTweensOf(camera.position)
      const rafId = setTimeout(() => { ScrollTrigger.refresh() }, 0)
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '#page-content',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        },
      })
      SCROLL_WAYPOINTS.forEach(({ position, target }, i) => {
        tl.to(camera.position, {
          x: position.x, y: position.y, z: position.z, duration: 1,
          onUpdate: () => { camera.lookAt(target.x, target.y, target.z) },
          onStart: () => { console.log(`[ST] waypoint-${i} entered`) },
        })
      })
      return () => { clearTimeout(rafId); tl.kill() }
    }
  )

  return () => { mm.revert() }
}, { dependencies: [isHomePage] })
```

**Phase 3 accepted WARNs to fix in this phase:**

These are cleanup items. They should go in the same plan as the component that owns them:

| WARN | Owner | Fix | Plan |
|------|-------|-----|------|
| SmoothScrollProvider: add ref-guard for double-ticker in StrictMode | `providers/SmoothScrollProviderWrapper.tsx` | `const initialized = useRef(false); if (initialized.current) return; initialized.current = true` inside the Lenis creation `useEffect` | Plan 04-03 (reduced-motion patch — same wave modifies providers area) |
| WorldScrollCamera: `rafId` variable misnamed (holds setTimeout not rAF) | `WorldScrollCamera.tsx` | Rename `rafId` → `timeoutId` | Plan 04-03 (reduced-motion rewrites this file) |
| WorldPostWaypointSync: add console.warn for unknown slug fallback | `WorldPostWaypointSync.tsx` | Add `console.warn('[waypoint] unknown slug:', slug)` | Plan 04-03 (minor, bundle with the motion patch wave) |
| `useGSAP` without `scope` ref in WorldCameraRig + WorldScrollCamera | Both files | **No action needed.** GSAP confirmed: scope is only needed when using CSS selector strings. WorldCameraRig and WorldScrollCamera use `gsap.to(camera.position)` — direct object reference, no selectors. Scope omission is correct behavior, not a defect. | — |

---

### INT-03 — WorldKeyboardNav Component

**ARIA pattern decision: the requirement overrides standard APG convention**

The success criterion says "Tab마다 다음 waypoint에 aria-selected + 시각적 링이 이동" — Tab cycles through waypoints. The WAI-ARIA APG toolbar and listbox patterns use arrow keys for intra-widget navigation with a single tab stop. The project requirement deliberately overrides this.

Implementation approach: use `role="listbox"` on the container with `aria-label="월드 내비게이션"`, and `role="option"` on each waypoint item. Use `tabindex={0}` on the currently active item and `tabindex={-1}` on all others (roving tabindex). Tab key naturally moves to the next `tabindex={0}` element in the DOM, but since only one item at a time is `tabindex={0}`, the standard Tab behavior would exit the widget after the one focusable item.

To make Tab cycle WITHIN the widget (as the requirement demands), use `onKeyDown` on the container to intercept Tab:

```tsx
// components/world/WorldKeyboardNav.tsx
'use client'
import { useRef, useEffect } from 'react'
import { WAYPOINTS } from '@/lib/waypoints'
import { useWorldStore } from '@/lib/worldStore'

const WAYPOINT_KEYS = Object.keys(WAYPOINTS)

export default function WorldKeyboardNav() {
  const setActiveWaypoint = useWorldStore((s) => s.setActiveWaypoint)
  const activeWaypoint = useWorldStore((s) => s.activeWaypoint)
  const containerRef = useRef<HTMLDivElement>(null)
  const focusedIndex = useRef(0)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const dir = e.shiftKey ? -1 : 1
      focusedIndex.current = (focusedIndex.current + dir + WAYPOINT_KEYS.length) % WAYPOINT_KEYS.length
      const items = containerRef.current?.querySelectorAll('[role="option"]')
      ;(items?.[focusedIndex.current] as HTMLElement)?.focus()
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const slug = WAYPOINT_KEYS[focusedIndex.current]
      setActiveWaypoint(WAYPOINTS[slug])
    }
  }

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="월드 내비게이션"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      // Positioned outside the canvas but inside the world route DOM
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2"
    >
      {WAYPOINT_KEYS.map((slug, i) => {
        const isActive = activeWaypoint?.slug === slug
        return (
          <button
            key={slug}
            role="option"
            aria-selected={isActive}
            tabIndex={i === 0 ? 0 : -1}
            onClick={() => setActiveWaypoint(WAYPOINTS[slug])}
            // Focus ring via --focus-ring token applied globally in globals.css
            className="px-3 py-1 rounded text-sm transition-colors"
            style={{
              background: isActive ? 'var(--color-accent-neon)' : 'var(--color-surface)',
              color: 'var(--color-text-primary)',
            }}
          >
            {slug}
          </button>
        )
      })}
    </div>
  )
}
```

**Mounting location:** `WorldKeyboardNav` must mount in the DOM tree that is NOT inside `aria-hidden="true"`. The canvas wrapper `div[data-canvas-id]` is `aria-hidden`. The overlay element must be a sibling of that div, not a child.

In `app/world/page.tsx` (or via `WorldCanvasLoader`'s sibling slot in layout):

```tsx
// app/world/page.tsx  — add WorldKeyboardNav as a sibling outside canvas
import WorldKeyboardNav from '@/components/world/WorldKeyboardNav'

export default function WorldPage() {
  return (
    <>
      <WorldKeyboardNav />
      {/* existing world page content / scroll spacer */}
    </>
  )
}
```

The R3F `<Html>` component (inside `WorldScene`) renders into a portal that is INSIDE the canvas wrapper's DOM parent but separate from the `aria-hidden` container — check that `Html` output is not caught inside the `aria-hidden` div. R3F `<Html>` uses a `div` appended to `document.body` by default unless `portal` prop is set, so it is outside the `aria-hidden` wrapper. This is safe.

**Visual focus ring for waypoint items:** the globally applied `:focus-visible { box-shadow: var(--focus-ring) }` in globals.css applies automatically to the `<button role="option">` elements.

---

## Alternative(s) Considered

### ESLint rule: External package `no-restricted-syntax` selector vs custom Literal visitor

`no-restricted-syntax` with a selector like `Literal[value=/^#[0-9a-f]{6}$/i]` is a simpler approach requiring no custom rule code. However, the project has `--max-warnings 0` and `no-restricted-syntax` message output is less informative. The custom `local/no-hardcoded-hex` approach chosen provides a clear message pointing to the tokens file.

**Verdict:** Use custom rule. More instructive error message, easier to add an allowlist later (e.g., `// eslint-disable-next-line local/no-hardcoded-hex` for intentional cases).

### prefers-reduced-motion: CSS `@media (prefers-reduced-motion: reduce)` only vs GSAP matchMedia

CSS-only approach would not affect GSAP-driven camera tweens (Three.js positions are not CSS properties). GSAP `matchMedia()` is the only way to branch JS animation logic reactively. The `window.matchMedia` + `usePrefersReducedMotion` hook (Josh Comeau pattern) would also work but requires a custom hook and an extra `useEffect`. `gsap.matchMedia()` integrates naturally inside `useGSAP` and handles cleanup automatically.

**Verdict:** Use `gsap.matchMedia()` inside the existing `useGSAP` hooks. Zero new dependencies, reactive to OS preference changes at runtime.

### Keyboard nav: Tab-cycle vs arrow-key (ARIA-compliant)

Standard ARIA APG recommends arrow-key navigation within composite widgets with a single tab stop. However, the success criterion explicitly requires "Tab마다 다음 waypoint". The Tab-cycling implementation with `e.preventDefault()` inside the container's `onKeyDown` meets the stated requirement. A comment in the code should document the deliberate deviation.

**Verdict:** Implement Tab-cycle as specified. Add code comment noting ARIA APG deviation for future review.

### Canvas aria-hidden: on `<Canvas>` (R3F) vs on wrapper div

R3F renders a `<canvas>` element inside the `<Canvas>` component's render, plus possibly a `<div>` wrapper depending on version. Placing `aria-hidden` on the outermost wrapper `<div data-canvas-id="world-canvas">` ensures the entire subtree (canvas, any R3F portals inside that div) is hidden. Placing it on the R3F `<Canvas>` itself would work but is less reliable across R3F versions.

**Verdict:** `aria-hidden="true"` on the wrapper div in `WorldCanvas.tsx`.

---

## Implementation Map

| File | Action | Plan |
|------|--------|------|
| `tokens/tokens.ts` | Create — 5-category typed export | 04-01 |
| `app/globals.css` | Modify — add `@theme {}` block + `:root {}` non-Tailwind tokens + `:focus-visible` global rule | 04-01 |
| `eslint.config.mjs` | Modify — spread nextConfig array + add local plugin with `no-hardcoded-hex` rule at `"error"` level | 04-01 |
| `components/world/WorldCanvas.tsx` | Modify — add `aria-hidden="true"` to wrapper div; patch `#0a0a0a` → `var(--color-base)` | 04-01 |
| `app/layout.tsx` | Modify — add skip-nav `<a href="#page-content">` before WorldCanvasLoader | 04-02 |
| `app/text/[slug]/page.tsx` | Modify — extract frontmatter `date`, render `<time>` inside article | 04-02 |
| `components/world/WorldCameraRig.tsx` | Modify — wrap tween in `gsap.matchMedia()` conditions for reduceMotion | 04-03 |
| `components/world/WorldScrollCamera.tsx` | Modify — wrap ScrollTrigger timeline in `gsap.matchMedia()` conditions; rename `rafId` → `timeoutId` | 04-03 |
| `components/providers/SmoothScrollProviderWrapper.tsx` | Modify — add `initialized` ref guard for StrictMode double-tick | 04-03 |
| `components/world/WorldPostWaypointSync.tsx` | Modify — add `console.warn` for unknown slug | 04-03 |
| `components/world/WorldKeyboardNav.tsx` | Create — listbox + roving tabindex + Tab-cycle + Enter-to-activate | 04-04 |
| `app/world/page.tsx` | Modify — mount `<WorldKeyboardNav />` as sibling outside canvas aria-hidden | 04-04 |

---

## Wave Structure Recommendation

**Wave 1 (parallel) — Foundation**

- **Plan 04-01**: Tokens + ESLint rule
  - Create `tokens/tokens.ts`
  - Modify `globals.css` (`@theme`, `:root`, `:focus-visible`)
  - Modify `eslint.config.mjs` (local plugin + rule)
  - Patch `WorldCanvas.tsx` hex → token (prerequisite to lint not failing on existing code)
  - Verify: `pnpm lint` fails on a test hex string, passes on token usage

- **Plan 04-02**: `/text/` A11Y
  - Add skip-nav to `app/layout.tsx`
  - Add `<time>` publication date to `app/text/[slug]/page.tsx`
  - Verify: Tab navigation through all links, VoiceOver reads heading + date, 3D DOM absent from SR tree

These two plans have zero runtime dependency on each other. They CAN be executed in parallel by separate sessions, but since this is a 1-person project, run them sequentially within a session.

**Wave 2 (sequential after Wave 1) — Motion + Cleanup**

- **Plan 04-03**: Reduced-motion patches + Phase 3 cleanup
  - Modify `WorldCameraRig.tsx` — `gsap.matchMedia()` branch
  - Modify `WorldScrollCamera.tsx` — `gsap.matchMedia()` branch + `rafId` rename
  - Modify `SmoothScrollProviderWrapper.tsx` — StrictMode ref guard
  - Modify `WorldPostWaypointSync.tsx` — unknown slug warn
  - Verify: devtools `prefers-reduced-motion: reduce` → 200ms cut observed

**Wave 3 (sequential after Wave 2) — Keyboard Nav**

- **Plan 04-04**: WorldKeyboardNav
  - Create `components/world/WorldKeyboardNav.tsx`
  - Modify `app/world/page.tsx` to mount it
  - Verify: Tab cycles waypoints, aria-selected updates, Enter moves camera, focus ring visible

Wave 3 depends on Wave 1 (tokens must exist for focus ring) and Wave 2 (camera must respond to `setActiveWaypoint` which is tested in the verify step).

---

## Dependencies

**No new packages required.** All implementation uses:

- Existing GSAP 3.15.0: `gsap.matchMedia()` — documented in GSAP 3.x, available since GSAP 3.9.0 (project has 3.15.0)
- Existing ESLint 9 flat config: inline plugin pattern
- Existing Tailwind v4: `@theme` directive
- Native browser APIs: `window.matchMedia`, `aria-*` attributes, CSS `:focus-visible`

Lock-set constraint: SATISFIED. Zero new dependencies.

---

## Risk Register

### Risk 1: `eslint-config-next` exports shape in Next.js 16
**Probability:** MEDIUM
**Impact:** HIGH — if `nextConfig` is not an iterable array, `...nextConfig` throws
**Mitigation:** After writing `eslint.config.mjs`, run `pnpm lint` on a trivial file first. If it throws a spread error, replace `...nextConfig` with `nextConfig` (pass as first element in the array). The `eslint-config-next` package from Next.js 15+ exports a flat config array.

### Risk 2: Existing files with hardcoded hex break CI immediately after ESLint rule is enabled
**Probability:** HIGH (WorldCanvas.tsx has `#0a0a0a`)
**Impact:** HIGH — `pnpm lint --max-warnings 0` will fail
**Mitigation:** Plan 04-01 must patch ALL existing hex occurrences in the same commit that adds the rule. Verify by running `grep -r "#[0-9a-fA-F]\{3,8\}" --include="*.tsx" --include="*.ts" .` before committing.

### Risk 3: gsap.matchMedia() cleanup not called when `isHomePage` flips
**Probability:** MEDIUM
**Impact:** MEDIUM — stale reduced-motion branch if user navigates away while matchMedia is active
**Mitigation:** The `return () => { mm.revert() }` cleanup inside `useGSAP` cleanup callback handles this. `mm.revert()` kills all matchMedia contexts. Verify in testing by toggling `isHomePage` and checking that no orphaned ScrollTrigger instances remain.

### Risk 4: WorldKeyboardNav Tab-cycling traps focus for keyboard-only users on non-world routes
**Probability:** MEDIUM
**Impact:** HIGH — if `WorldKeyboardNav` renders on `/text/` routes, Tab will be trapped
**Mitigation:** `WorldKeyboardNav` must ONLY mount on `app/world/page.tsx` (and `app/world/[slug]/page.tsx` if it exists). NOT in layout.tsx. Verify by navigating to `/text/sample` with keyboard only and confirming normal Tab flow.

### Risk 5: R3F `<Html>` portal position relative to aria-hidden canvas wrapper
**Probability:** LOW (R3F `<Html>` appends to document.body by default)
**Impact:** HIGH if caught inside aria-hidden — SR would miss the waypoint overlay text
**Mitigation:** Verify in DevTools that `Html` output div is a direct child of `<body>`, not inside `div[data-canvas-id]`. R3F v9 `<Html>` default behavior appends to `document.body`. Confirm this in the verify step.

### Risk 6: `@theme` syntax not supported by installed Tailwind v4 minor version
**Probability:** LOW (project has tailwindcss ^4.0.0)
**Impact:** MEDIUM — build failure if version is below 4.0 stable
**Mitigation:** `@theme` is a Tailwind v4.0.0 stable feature per official docs. The lock-set `tailwindcss: "^4.0.0"` covers this.

---

## Open Questions

1. **`eslint-config-next` in Next.js 16**: Does it export a flat config array in the v16.2.3 package? Next.js 15 confirmed this. Next.js 16 (currently bleeding edge) has not been independently verified at time of research. Must check actual exported shape at plan execution time.

2. **`app/world/[slug]/page.tsx`**: Does this route exist in the codebase? If it does, `WorldKeyboardNav` should mount there too. If not, Plan 04-04 only touches `app/world/page.tsx`. Check with `ls app/world/` at plan start.

3. **Publication date in MDX frontmatter**: Does the sample MDX file have a `date` field? If not, `page.tsx` patch for `<time>` must also add the field to the sample content.

---

## Sources

### HIGH Confidence
- [Tailwind v4 Theme Variables — official docs](https://tailwindcss.com/docs/theme) — @theme directive, CSS custom property output, namespace-to-utility mapping
- [ESLint Configure Plugins — official docs](https://eslint.org/docs/latest/use/configure/plugins) — inline plugin pattern, `plugins` key structure in flat config
- [ESLint Custom Rules — official docs](https://eslint.org/docs/latest/extend/custom-rules) — `rule.create()`, AST visitor types, `context.report()` with `messageId`
- [gsap.matchMedia() — official GSAP docs](https://gsap.com/docs/v3/GSAP/gsap.matchMedia/) — conditions object, `reduceMotion` pattern, cleanup via `mm.revert()`
- [WAI-ARIA APG Toolbar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) — keyboard interaction, Tab behavior exits widget, roving tabindex
- [MDN aria-hidden](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-hidden) — correct usage on non-focusable container
- [GSAP React Guide](https://gsap.com/resources/React/) — scope is optional when no CSS selectors used; confirmed `useGSAP` without scope is correct for `gsap.to(camera.position)` usage

### MEDIUM Confidence
- [Exploring Typesafe design tokens in Tailwind 4 — DEV Community](https://dev.to/wearethreebears/exploring-typesafe-design-tokens-in-tailwind-4-372d) — dual CSS+TS token strategy pattern (community article, verified against official Tailwind docs)
- [Josh Comeau: usePrefersReducedMotion hook](https://joshwcomeau.com/snippets/react-hooks/use-prefers-reduced-motion/) — SSR-safe hook pattern with `change` event listener
- [WAI-ARIA APG Keyboard Interface practices](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) — single tab stop convention for composite widgets
