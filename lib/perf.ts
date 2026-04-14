export function markWorldFirstFrame() {
  if (typeof performance === 'undefined') return
  performance.mark('world-first-frame')
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  const delta = performance.now() - (nav?.startTime ?? 0)
  console.log(`[perf] /world first-frame: ${delta.toFixed(1)}ms`)
}

export function observeTextLCP() {
  if (typeof PerformanceObserver === 'undefined') return
  const po = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`[perf] /text LCP: ${entry.startTime.toFixed(1)}ms`)
    }
  })
  po.observe({ type: 'largest-contentful-paint', buffered: true })
}
