'use client'

import dynamic from 'next/dynamic'

const WorldCanvas = dynamic(
  () => import('@/components/world/WorldCanvas'),
  { ssr: false }
)

export default function WorldCanvasLoader() {
  return <WorldCanvas />
}
