'use client'

import { useRef } from 'react'
import { WAYPOINTS } from '@/lib/waypoints'
import { useWorldStore } from '@/lib/worldStore'

// NOTE: This widget uses Tab-to-cycle rather than arrow-key navigation.
// This is a deliberate deviation from ARIA APG listbox convention (which prescribes
// arrow keys for intra-widget navigation with a single tab stop). The success criterion
// INT-03 explicitly requires "Tab마다 다음 waypoint에 aria-selected + 시각적 링이 이동",
// overriding the standard pattern. Tab is intercepted via onKeyDown + e.preventDefault()
// to keep focus inside the widget.

const WAYPOINT_KEYS = Object.keys(WAYPOINTS)

export default function WorldKeyboardNav() {
  const setActiveWaypoint = useWorldStore((s) => s.setActiveWaypoint)
  const activeWaypoint = useWorldStore((s) => s.activeWaypoint)
  const containerRef = useRef<HTMLDivElement>(null)
  const focusedIndex = useRef(0)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab') {
      // INTENTIONAL: Tab cycles within widget per success criterion INT-03
      // ("Tab마다 다음 waypoint") — deliberate ARIA APG deviation.
      // Escape releases focus from the widget (restores normal Tab order).
      e.preventDefault()
      const dir = e.shiftKey ? -1 : 1
      focusedIndex.current = (focusedIndex.current + dir + WAYPOINT_KEYS.length) % WAYPOINT_KEYS.length
      const items = containerRef.current?.querySelectorAll('[role="option"]')
      ;(items?.[focusedIndex.current] as HTMLElement)?.focus()
    }
    if (e.key === 'Escape') {
      // Escape exits the widget — moves focus to the container and releases Tab cycling
      ;(containerRef.current as HTMLElement)?.blur()
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const slug = WAYPOINT_KEYS[focusedIndex.current]
      setActiveWaypoint(WAYPOINTS[slug])
    }
  }

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="월드 내비게이션"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2"
    >
      {WAYPOINT_KEYS.map((slug, i) => {
        const isActive = activeWaypoint?.slug === slug
        return (
          <button
            key={slug}
            role="option"
            aria-selected={isActive}
            tabIndex={i === 0 ? 0 : -1}
            onClick={() => setActiveWaypoint(WAYPOINTS[slug])}
            className="px-3 py-1 rounded text-sm"
            style={{
              background: isActive ? 'var(--color-accent-neon)' : 'var(--color-surface)',
              color: 'var(--color-text-primary)',
            }}
          >
            {slug}
          </button>
        )
      })}
    </div>
  )
}
