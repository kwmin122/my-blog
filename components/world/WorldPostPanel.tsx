'use client'

import { useEffect } from 'react'
import { setPostOverlay, clearPostOverlay } from '@/lib/worldStore'

interface WorldPostPanelProps {
  slug: string
  title: string
  excerpt: string
}

export default function WorldPostPanel({ slug, title, excerpt }: WorldPostPanelProps) {
  useEffect(() => {
    setPostOverlay({ slug, title, excerpt })
    return () => {
      clearPostOverlay()
    }
  }, [slug, title, excerpt])

  return null
}
