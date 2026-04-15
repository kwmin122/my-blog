'use client'

import React from 'react'

export default function UIGlassPanel({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={['glass-panel', className].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </div>
  )
}

export function UIOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10 }}>
      {children}
    </div>
  )
}
