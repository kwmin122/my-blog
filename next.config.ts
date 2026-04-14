import type { NextConfig } from 'next'
import createMDX from '@next/mdx'

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
}

const withMDX = createMDX({
  // No remark/rehype plugins at this stage (Phase 7 work)
})

export default withMDX(nextConfig)
