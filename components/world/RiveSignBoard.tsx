'use client'

import { Component, type ReactNode, useEffect, useRef } from 'react'
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'
import { useWorldStore } from '@/lib/worldStore'

// Names match the rive-runtime state_machine_triggers test asset used for sign-*.riv
const STATE_MACHINE = 'State Machine 1'

interface RiveSignBoardProps {
  src: string       // e.g. '/assets/rive/sign-a.riv'
  label: string     // accessible label text
  width?: number    // canvas width in px, default 120
  height?: number   // canvas height in px, default 80
}

class RiveErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

function RiveSignBoardInner({
  src,
  label,
  width = 120,
  height = 80,
}: RiveSignBoardProps) {
  // Phase 6 deferred: validate src starts with '/assets/rive/' (security WARN-1)
  if (!src.startsWith('/assets/rive/')) {
    if (process.env.NODE_ENV === 'development') {
      throw new Error(`[RiveSignBoard] src must start with '/assets/rive/'. Got: '${src}'`)
    }
    return null
  }

  const setCursorMagnetTarget = useWorldStore((s) => s.setCursorMagnetTarget)
  const minimalMode = useWorldStore((s) => s.minimalMode)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: STATE_MACHINE,
    autoplay: true,
  })

  // Phase 6 deferred: pause/resume Rive on minimal mode toggle (D-04c)
  useEffect(() => {
    if (!rive) return
    if (minimalMode) {
      rive.pause()
    } else {
      rive.play()
    }
  }, [minimalMode, rive])

  // SMITrigger — fires the one-shot trigger on click
  const activateTrigger = useStateMachineInput(rive, STATE_MACHINE, 'Trigger 1')

  function handlePointerEnter() {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setCursorMagnetTarget({
        x: rect.left + rect.width / 2,
        y: rect.top  + rect.height / 2,
      })
    }
  }

  function handlePointerLeave() {
    setCursorMagnetTarget(null)
  }

  function handleClick() {
    if (activateTrigger) activateTrigger.fire()
  }

  return (
    <div
      ref={wrapperRef}
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      style={{
        width,
        height,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <RiveComponent style={{ width, height }} />
    </div>
  )
}

export default function RiveSignBoard(props: RiveSignBoardProps) {
  return (
    <RiveErrorBoundary>
      <RiveSignBoardInner {...props} />
    </RiveErrorBoundary>
  )
}
