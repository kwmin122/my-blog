import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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

export default nextConfig
