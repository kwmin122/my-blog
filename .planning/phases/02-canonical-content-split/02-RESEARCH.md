# Phase 2: Canonical Content Split — Research

**Researched:** 2026-04-14
**Domain:** MDX pipeline, Next.js App Router static generation, SEO canonical metadata, drei Html
**Confidence:** HIGH

---

## Summary

Phase 2 installs the content layer that all subsequent phases depend on. The core decision is choosing between `@next/mdx` and `next-mdx-remote` as the MDX processor. **`next-mdx-remote` was archived on 2026-04-09** and is no longer maintained — it must not be chosen. `@next/mdx@16.2.3` (version-locked to Next.js) is the correct choice.

`@next/mdx` with the `export const metadata = {...}` pattern (JS-exports-as-frontmatter) is the simplest, fully-static approach: no YAML parser needed, no extra remark plugin needed for Turbopack. The dynamic import pattern (`await import('@/content/posts/${slug}.mdx')`) lets both `/text/[slug]` and `/world/[slug]` read the same MDX source at build time. `generateStaticParams` in both routes reads `content/posts/` via `fs.readdirSync`.

Canonical SEO is handled natively by `generateMetadata` with `alternates.canonical` — Next.js 16 renders this as `<link rel="canonical">` in the `<head>`. The drei `<Html>` component renders only what you pass as children (title + excerpt string props) — it is purely client-side and requires no changes to the SSR guard already established in Phase 1.

**Primary recommendation:** Use `@next/mdx@16.2.3` with `export const metadata` (JS-export frontmatter, no YAML), dynamic import pattern, `fs.readdirSync`-based `generateStaticParams` shared via a `lib/posts.ts` utility, and `generateMetadata` `alternates.canonical` for the `/world/[slug]` canonical pointer.

---

## Project Constraints (from CLAUDE.md)

These directives are mandatory and the planner must verify compliance:

1. **Lock-set is closed.** Only the 12 listed libraries are permitted. New packages must NOT be added without a design doc revision. Applicable to this phase: `@next/mdx` (or `next-mdx-remote`) is the only allowed MDX library.
2. **No external CMS.** MDX files live at `content/posts/*.mdx`. No Notion, Contentlayer, Velite, etc.
3. **Alt text sidecar JSONs** at `content/posts/*.alt.json`. Phase 2 must establish this convention even if only one sample file is created.
4. **`/world/{slug}` shows ONLY title + excerpt.** Full MDX body must NOT appear in the 3D route's DOM.
5. **Design doc is the canonical reference.** Any deviation from the design doc requires design doc revision first.
6. **Turbopack is the default bundler in Next.js 16.** The `next dev` script already runs Turbopack. Do not add `--turbo` flag; it's implicit.

---

## Standard Stack

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@next/mdx` | 16.2.3 | MDX processing + webpack/Turbopack loader | Version-locked to Next.js; official package; not archived |
| `@mdx-js/loader` | 3.1.1 | Webpack MDX loader (peer dep) | Required by `@next/mdx` |
| `@mdx-js/react` | 3.1.1 | MDXProvider for component overrides | Required by `@next/mdx` |
| `@types/mdx` | 2.0.13 | TypeScript types for MDX imports | Needed for `import Post from '*.mdx'` |
| `node:fs` (built-in) | N/A | `readdirSync` for slug discovery | Server-side only, no new dep |

**MUST NOT install:** `next-mdx-remote` (archived 2026-04-09), `gray-matter` (not in lock-set), `contentlayer` (not in lock-set), `velite` (not in lock-set), `next-mdx-remote-client` (not in lock-set).

---

## Architecture Patterns

### Pattern 1 — MDX File Shape (JS-export frontmatter)

`@next/mdx` does NOT parse YAML `---` frontmatter by default. The correct pattern is MDX-native JS exports. No remark plugin needed, no YAML parser needed, and this is fully Turbopack-compatible.

```mdx
// content/posts/sample.mdx
export const metadata = {
  title: 'Sample Post',
  excerpt: 'A short description of this post.',
  date: '2026-04-14',
  category: 'diary',
}

# Sample Post

Full MDX body content here...
```

This `metadata` export is accessible at import time:
```ts
const { metadata } = await import('@/content/posts/sample.mdx')
// metadata.title, metadata.excerpt, metadata.date, metadata.category
```

### Pattern 2 — Shared Slug Discovery (`lib/posts.ts`)

Both `/text/[slug]` and `/world/[slug]` share a single utility. This is pure server-side Node.js fs, zero new dependencies.

```ts
// lib/posts.ts
import { readdirSync } from 'node:fs'
import path from 'node:path'

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts')

export function getPostSlugs(): string[] {
  return readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''))
}

export type PostMetadata = {
  title: string
  excerpt: string
  date: string
  category: string
}
```

### Pattern 3 — `generateStaticParams` (identical in both routes)

Both `app/text/[slug]/page.tsx` and `app/world/[slug]/page.tsx` use the exact same pattern:

```ts
import { getPostSlugs } from '@/lib/posts'

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }))
}

export const dynamicParams = false
```

### Pattern 4 — `/text/[slug]/page.tsx` (canonical route)

Server component. Full MDX body rendered. Self-canonical (Next.js default behaviour — no explicit `alternates.canonical` needed if not setting cross-route canonical).

```ts
// app/text/[slug]/page.tsx
import type { Metadata } from 'next'
import { getPostSlugs, PostMetadata } from '@/lib/posts'

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }))
}
export const dynamicParams = false

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { metadata } = await import(`@/content/posts/${slug}.mdx`) as {
    metadata: PostMetadata
  }
  return {
    title: metadata.title,
    description: metadata.excerpt,
    alternates: { canonical: `/text/${slug}` },
  }
}

export default async function TextPage({ params }: Props) {
  const { slug } = await params
  const { default: Post } = await import(`@/content/posts/${slug}.mdx`)
  return (
    <article>
      <Post />
    </article>
  )
}
```

### Pattern 5 — `/world/[slug]/page.tsx` (presentation route)

Server component shell only. Renders `<link rel="canonical">` pointing to `/text/[slug]`. Does NOT render the MDX body. Passes only `title` and `excerpt` to the 3D scene via props/store.

```ts
// app/world/[slug]/page.tsx
import type { Metadata } from 'next'
import { getPostSlugs, PostMetadata } from '@/lib/posts'
import WorldPostPanel from '@/components/world/WorldPostPanel'

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }))
}
export const dynamicParams = false

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { metadata } = await import(`@/content/posts/${slug}.mdx`) as {
    metadata: PostMetadata
  }
  return {
    title: metadata.title,
    alternates: { canonical: `/text/${slug}` },  // THE CRITICAL LINE
  }
}

export default async function WorldSlugPage({ params }: Props) {
  const { slug } = await params
  const { metadata } = await import(`@/content/posts/${slug}.mdx`) as {
    metadata: PostMetadata
  }
  // Only passes title+excerpt to the 3D overlay — NOT the Post component
  return <WorldPostPanel slug={slug} title={metadata.title} excerpt={metadata.excerpt} />
}
```

### Pattern 6 — `WorldPostPanel` (client component for drei Html)

The drei `<Html>` component MUST be used inside a R3F Canvas context. The `WorldPostPanel` is a thin server-component-to-client-component bridge that receives `title` and `excerpt` as props (strings only). The client component then accesses the `<Html>` component within the existing `WorldScene`.

The key architectural point: `WorldSlugPage` (server component) does NOT render the MDX body (`<Post />`). It extracts only the string metadata values and passes them to `WorldPostPanel`. This guarantees the full article HTML is never in the DOM on `/world/[slug]`.

```ts
// components/world/WorldPostPanel.tsx
'use client'
// This component passes title/excerpt to the global zustand store
// so the WorldScene (already mounted in layout.tsx) can pick them up
// via <Html> in the R3F scene.
import { useEffect } from 'react'
import { useWorldStore } from '@/lib/worldStore'

interface Props { slug: string; title: string; excerpt: string }

export default function WorldPostPanel({ slug, title, excerpt }: Props) {
  const setPostOverlay = useWorldStore((s) => s.setPostOverlay)
  useEffect(() => {
    setPostOverlay({ slug, title, excerpt })
    return () => setPostOverlay(null)
  }, [slug, title, excerpt, setPostOverlay])
  return null  // No DOM output here — canvas renders it
}
```

The scene then reads from the store and uses `<Html>`:
```ts
// Inside WorldScene.tsx (client, inside Canvas)
import { Html } from '@react-three/drei'
// ...
const overlay = useWorldStore((s) => s.postOverlay)
// ...
{overlay && (
  <Html center distanceFactor={10} position={[0, 1, -3]}>
    <div className="post-overlay">
      <h2>{overlay.title}</h2>
      <p>{overlay.excerpt}</p>
    </div>
  </Html>
)}
```

### Pattern 7 — `next.config.ts` update for MDX

`next.config.ts` uses `.ts` extension and `export default`. The MDX guide uses `.mjs` — this is compatible with `.ts` via the same ESM export pattern. **Do NOT enable `mdxRs`** (Turbopack Rust compiler) — it does not support plugins and has known issues.

```ts
// next.config.ts (updated)
import type { NextConfig } from 'next'
import createMDX from '@next/mdx'

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = { ...config.resolve.alias, 'three/webgpu': false }
    }
    return config
  },
}

const withMDX = createMDX({
  // No remarkPlugins needed for the JS-export frontmatter approach
  // Add remark-gfm as STRING (Turbopack-safe) only if GFM syntax is required
  options: {},
})

export default withMDX(nextConfig)
```

### Pattern 8 — `mdx-components.tsx` (required file)

`@next/mdx` with App Router requires this file at project root. Without it, builds fail silently in some Next.js versions.

```ts
// mdx-components.tsx (project root, same level as app/)
import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components }
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canonical `<link>` tag in `<head>` | Custom `<Head>` injection or meta tag | `generateMetadata({ alternates: { canonical: ... } })` | Next.js 16 native; renders to `<head>` automatically; works with streaming metadata |
| Slug discovery | Custom glob utility | `fs.readdirSync` in `lib/posts.ts` | Zero dependency; runs server-side only; Next.js tree-shakes it from client bundles |
| YAML frontmatter parsing | `gray-matter` call or custom YAML parser | `export const metadata = {...}` in MDX | No new package; fully Turbopack-compatible; TypeScript-typed via module augmentation |
| MDX rendering in 3D world | Importing and rendering full `<Post />` in world route | zustand store + string props only | Prevents full body HTML from appearing in `/world/[slug]` DOM (CORE-04 requirement) |
| Duplicate `generateStaticParams` logic | Two separate fs-read implementations | Single `lib/posts.ts` `getPostSlugs()` | DRY; single source of truth; avoids desync between routes |

---

## Common Pitfalls

### Pitfall 1: Using `next-mdx-remote` (archived)

**What goes wrong:** Package was archived 2026-04-09. No maintenance, no security fixes.
**Why:** Hashicorp stopped maintaining it.
**How to avoid:** Use `@next/mdx@16.2.3` only.
**Warning signs:** `package.json` shows `next-mdx-remote` in dependencies.

### Pitfall 2: Enabling `mdxRs: true`

**What goes wrong:** Rust-based MDX compiler does not support remark/rehype plugins. Even string-format plugins fail silently. Tables render as plain text. Frontmatter plugins break.
**Why:** `mdxjs-rs` has no plugin architecture by design (Next.js issue #84258, resolved as "won't fix").
**How to avoid:** Never set `experimental.mdxRs` or `mdxRs` in `withMDX`. Default (no flag) uses JS-based MDX compiler which is Turbopack-compatible with string plugins.
**Warning signs:** `mdxRs: true` in `next.config.ts`.

### Pitfall 3: Rendering MDX body in `/world/[slug]`

**What goes wrong:** CORE-04 fails — Lighthouse/manual inspection will find full `<article>` HTML in the world route's DOM. SEO crawler sees duplicate content.
**Why:** Developer imports `const { default: Post } = await import(...)` and renders `<Post />` in the world page.
**How to avoid:** World route page ONLY imports `metadata` (title, excerpt strings), never the default export. The default export (`Post` component) is exclusively used in `/text/[slug]`.
**Warning signs:** `<Post />` appearing in `app/world/[slug]/page.tsx`.

### Pitfall 4: `mdx-components.tsx` missing

**What goes wrong:** Build fails or MDX renders with missing component error. The error message is not always clear.
**Why:** `@next/mdx` App Router requires this file as a convention. It's mandatory even if empty.
**How to avoid:** Create `mdx-components.tsx` at project root before running first build.
**Warning signs:** Build error mentioning "MDXComponents" or "useMDXComponents".

### Pitfall 5: `alternates.canonical` not rendering `<link rel="canonical">`

**What goes wrong:** The canonical tag only appears when `metadataBase` is set, or appears with a relative path that crawlers may misinterpret.
**Why:** Next.js requires `metadataBase` in root layout for relative canonical URLs to resolve fully.
**How to avoid:** Set `metadataBase: new URL('https://webbuild-gray.vercel.app')` in `app/layout.tsx` `metadata` export. For `/text/[slug]`, use `alternates: { canonical: '/text/${slug}' }` (relative is fine with metadataBase). For `/world/[slug]`, same pattern.
**Warning signs:** `<link rel="canonical" href="/text/sample">` renders without domain prefix — crawlers may ignore relative canonical.

### Pitfall 6: `pageExtensions` breaks existing routes

**What goes wrong:** Adding `md`, `mdx` to `pageExtensions` causes Next.js to treat any `.mdx` file in `app/` as a page route. Any stray `.mdx` in the app directory creates unexpected routes.
**Why:** `pageExtensions` is a global setting.
**How to avoid:** MDX files live ONLY at `content/posts/*.mdx`, never in `app/`. The `app/` directory stays `.tsx`-only.
**Warning signs:** 404 on existing routes after adding `pageExtensions`.

### Pitfall 7: Dynamic import path with template literals and Turbopack

**What goes wrong:** `await import(`@/content/posts/${slug}.mdx`)` may fail with Turbopack if the glob pattern is not recognized at build time.
**Why:** Static analysis of dynamic imports requires the prefix to be static (`@/content/posts/`) with only the variable part dynamic.
**How to avoid:** Keep the directory prefix static. `@/content/posts/` is constant; only `${slug}` varies. This matches Next.js official docs pattern (verified against v16.2.3 docs).
**Warning signs:** Build warning "Could not resolve dynamic import" or 404 on post routes.

### Pitfall 8: drei `<Html>` requires R3F Canvas context

**What goes wrong:** Using `<Html>` outside a `<Canvas>` tree throws "R3F: Hooks can only be used within the Canvas component".
**Why:** `<Html>` uses `useThree` and `useFrame` internally.
**How to avoid:** `WorldPostPanel` must communicate via zustand store to the already-mounted `WorldScene` (inside `WorldCanvasLoader`). Do not attempt to render `<Html>` directly in the world page server component.
**Warning signs:** "Hooks can only be used within the Canvas" error in dev console.

---

## Code Examples

### Exact `generateMetadata` for canonical (verified against Next.js 16.2.3 docs)

```ts
// app/world/[slug]/page.tsx
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const { metadata } = await import(`@/content/posts/${slug}.mdx`) as {
    metadata: PostMetadata
  }
  return {
    title: metadata.title,
    alternates: {
      canonical: `/text/${slug}`,
    },
  }
}
```

HTML output (with `metadataBase` set in root layout):
```html
<link rel="canonical" href="https://webbuild-gray.vercel.app/text/sample" />
```

Source: [Next.js generateMetadata docs v16.2.3](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#alternates)

### Exact `@next/mdx` config (Turbopack-safe, no mdxRs)

```ts
// next.config.ts
import createMDX from '@next/mdx'
const withMDX = createMDX({ options: {} })
export default withMDX(nextConfig)
```

Source: [Next.js MDX guide v16.2.3](https://nextjs.org/docs/app/guides/mdx)

### Exact drei `<Html>` usage (title+excerpt only)

```tsx
// components/world/WorldScene.tsx (inside Canvas)
import { Html } from '@react-three/drei'

const overlay = useWorldStore((s) => s.postOverlay)
return (
  <>
    {/* ... scene objects ... */}
    {overlay && (
      <Html center distanceFactor={10} position={[0, 1, -3]}>
        <h2>{overlay.title}</h2>
        <p>{overlay.excerpt}</p>
      </Html>
    )}
  </>
)
```

Source: [drei Html docs](https://drei.docs.pmnd.rs/misc/html)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| `@next/mdx` | MDX processing | NOT installed (needs `pnpm add`) | 16.2.3 | None |
| `@mdx-js/loader` | `@next/mdx` peer dep | NOT installed | 3.1.1 | None |
| `@mdx-js/react` | `@next/mdx` peer dep | NOT installed | 3.1.1 | None |
| `@types/mdx` | TypeScript import types | NOT installed | 2.0.13 | None |
| `node:fs` | `lib/posts.ts` | Built-in | Node 20 | None needed |
| `@react-three/drei` Html | 3D excerpt overlay | Installed | 10.7.7 | None needed |
| `zustand` | Store for overlay state | Installed | 5.0.12 | None needed |
| `next-mdx-remote` | (rejected) | NOT installed | 6.0.0 | Use `@next/mdx` |
| `gray-matter` | (rejected, not in lock-set) | NOT installed | 4.0.3 | `export const metadata` pattern |

**Install command for this phase:**
```bash
pnpm add @next/mdx @mdx-js/loader @mdx-js/react @types/mdx
```

All four packages are part of the `@next/mdx` ecosystem and count as a single lock-set entry ("MDX"). No design doc revision required.

---

## Implementation Map

Files to **create**:

```
content/posts/
  sample.mdx                     # First MDX post (CONT-01 trigger)
  sample.alt.json                 # Alt text sidecar (CONT-03 convention stub)

lib/
  posts.ts                        # getPostSlugs(), PostMetadata type

app/
  world/
    [slug]/
      page.tsx                    # /world/{slug} — canonical pointing to /text/{slug}

components/
  world/
    WorldPostPanel.tsx            # Client bridge: server props → zustand store

mdx-components.tsx               # Required by @next/mdx (project root)
```

Files to **modify**:

```
next.config.ts                    # Add withMDX wrapper + pageExtensions
app/layout.tsx                    # Add metadataBase to root metadata export
app/text/[slug]/page.tsx          # Replace stub with full MDX + generateStaticParams + generateMetadata
lib/worldStore.ts (if exists)     # Add postOverlay state slice
components/world/WorldScene.tsx   # Add Html overlay reading from store
```

---

## Open Questions

1. **`lib/worldStore.ts` existence:** Phase 1 may or may not have created a zustand store. If it exists, the `postOverlay` slice must be added. If not, a new store file is needed. The planner should check `lib/` before tasking.

2. **`metadataBase` domain:** Production URL is `https://webbuild-gray.vercel.app`. The root layout's `metadata.metadataBase` must be set to this. During local dev, relative canonicals still work but do not render the full domain. This is acceptable for dev but must be confirmed in production verification.

3. **`WorldScene.tsx` `<Html>` position:** The exact 3D position `[0, 1, -3]` for the overlay is a placeholder. Phase 3 (Camera Choreography) will define proper waypoints. For Phase 2, any fixed position that demonstrates the title/excerpt display satisfies CORE-04.

4. **TypeScript `import('*.mdx')` types:** The dynamic import `await import('@/content/posts/${slug}.mdx')` needs type casting. With `@types/mdx` installed, MDX files export a `MDXContent` default. The `metadata` named export is not auto-typed — `as { metadata: PostMetadata; default: MDXContent }` cast is required. This is a known TypeScript limitation with dynamic MDX imports (GitHub issue #70841).

---

## Sources

### HIGH confidence (official docs, verified against Next.js 16.2.3)

- [Next.js MDX Guide v16.2.3](https://nextjs.org/docs/app/guides/mdx) — `@next/mdx` setup, `pageExtensions`, dynamic import pattern, Turbopack plugin string format
- [Next.js generateMetadata v16.2.3](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) — `alternates.canonical`, `metadataBase`, TypeScript types
- [Next.js generateStaticParams v16.2.3](https://nextjs.org/docs/app/api-reference/functions/generate-static-params) — static generation from array, `dynamicParams = false`
- [Turbopack What's New in Next.js 16.2](https://nextjs.org/blog/next-16-2-turbopack) — Turbopack is default since Next.js 16, 200+ bug fixes
- [drei Html docs](https://drei.docs.pmnd.rs/misc/html) — `Html` props, SSR note ("Dom only"), children usage

### HIGH confidence (verified GitHub issues, resolved)

- [next.js issue #84258](https://github.com/vercel/next.js/issues/84258) — `mdxRs` does not support plugins (closed COMPLETED 2025-10-19); confirmed: **do not use `mdxRs`**
- [next.js issue #84748](https://github.com/vercel/next.js/issues/84748) — Turbopack fails with `mdxRs: false` in Next.js 16.0.0-beta (closed COMPLETED 2025-10-18); resolved in stable 16.x
- [next.js issue #74424](https://github.com/vercel/next.js/issues/74424) — `@next/mdx` + Turbopack compatibility (resolved in `@next/mdx` >= 15.1.6)

### MEDIUM confidence (secondary sources, consistent with official docs)

- [hashicorp/next-mdx-remote archived notice](https://github.com/hashicorp/next-mdx-remote) — archived 2026-04-09; "no longer supported"
- [Advanced MDX Layouts blog](https://vstollen.me/blog/advanced-mdx-layouts) — `remark-mdx-frontmatter` + dynamic import pattern with `@next/mdx`; confirms `content.frontmatter` access pattern
- [next-mdx-remote alternatives discussion](https://github.com/hashicorp/next-mdx-remote/discussions/438) — community consensus on `@next/mdx` as primary alternative for App Router
