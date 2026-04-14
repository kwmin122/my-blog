'use client'

import dynamic from 'next/dynamic'

const SmoothScrollProvider = dynamic(
  () => import('@/components/providers/SmoothScrollProvider'),
  { ssr: false },
)

export default function SmoothScrollProviderWrapper({ children }: { children: React.ReactNode }) {
  return <SmoothScrollProvider>{children}</SmoothScrollProvider>
}
