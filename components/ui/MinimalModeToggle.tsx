'use client'

import { useEffect } from 'react'
import { useWorldStore } from '@/lib/worldStore'

export default function MinimalModeToggle() {
  const minimalMode = useWorldStore((s) => s.minimalMode)
  const setMinimalMode = useWorldStore((s) => s.setMinimalMode)

  // SSR-safe: read localStorage on first client render only (D-04a)
  useEffect(() => {
    const stored = localStorage.getItem('world:minimal-mode')
    if (stored === 'true') setMinimalMode(true)
  }, [setMinimalMode])

  function toggle() {
    const next = !minimalMode
    setMinimalMode(next)
    localStorage.setItem('world:minimal-mode', String(next))
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={minimalMode}
      aria-label={minimalMode ? '미니멀 모드 해제' : '미니멀 모드 활성화'}
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9998,
        padding: '0.375rem 0.75rem',
        borderRadius: '0.375rem',
        border: '1px solid var(--color-text-muted)',
        background: minimalMode
          ? 'var(--color-accent-neon)'
          : 'var(--color-surface)',
        color: minimalMode
          ? 'var(--color-bg)'
          : 'var(--color-text-primary)',
        fontSize: '0.875rem',
        cursor: 'pointer',
      }}
    >
      {minimalMode ? '일반 모드' : '미니멀 모드'}
    </button>
  )
}
