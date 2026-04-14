'use client'

import { useEffect } from 'react'
import { observeTextLCP } from '@/lib/perf'

export default function LCPObserver() {
  useEffect(() => {
    observeTextLCP()
  }, [])
  return null
}
