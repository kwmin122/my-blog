import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack config (Next.js 16 default bundler)
  // three/webgpu uses browser globals — dynamic({ ssr: false }) is the primary
  // guard; this alias acts as belt-and-suspenders for the webpack fallback path.
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
