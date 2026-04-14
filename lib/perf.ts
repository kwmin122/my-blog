export function markWorldFirstFrame() {
  if (typeof performance === 'undefined') return
  performance.mark('world-first-frame')
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  const delta = performance.now() - (nav?.startTime ?? 0)
  console.log(`[perf] /world first-frame: ${delta.toFixed(1)}ms`)
}

// Returns the observer so callers can disconnect() on cleanup
export function observeTextLCP(): PerformanceObserver | null {
  if (typeof PerformanceObserver === 'undefined') return null
  const po = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`[perf] /text LCP: ${entry.startTime.toFixed(1)}ms`)
    }
  })
  po.observe({ type: 'largest-contentful-paint', buffered: true })
  return po
}
