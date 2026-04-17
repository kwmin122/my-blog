import type { NextConfig } from 'next'
import createMDX from '@next/mdx'
import { validatePostsMeta } from './lib/validate-posts'

// Run content validation during production builds only.
// NEXT_PHASE is set to 'phase-development-server' during `next dev`.
// During `next build` it is set to 'phase-production-build'.
if (process.env.NEXT_PHASE !== 'phase-development-server') {
  validatePostsMeta()
}

const nextConfig: NextConfig = {
  // Enable .md and .mdx pages
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  // Turbopack config (Next.js 16 default bundler).
  // three/webgpu is guarded by (1) 'use client', (2) ssr:false in WorldCanvasLoader,
  // and (3) the webpack alias below. Turbopack-native resolveAlias for `false`
  // values is not supported — left empty intentionally.
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'three/webgpu': false,
      }
    }
    return config
  },
  async headers() {
    return [
      {
        // KTX2 MIME type for compressed texture assets
        source: '/:path*.ktx2',
        headers: [{ key: 'Content-Type', value: 'image/ktx2' }],
      },
      {
        // COOP/COEP for SharedArrayBuffer (Draco WASM + KTX2 transcoder)
        // Scoped to /world path only to avoid breaking Rive CDN on other routes
        source: '/world',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
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
}

const withMDX = createMDX({
  // No remark/rehype plugins at this stage (Phase 7 work)
})

export default withMDX(nextConfig)
