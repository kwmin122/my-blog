'use client'

import { useRef } from 'react'
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

export default function RiveSignBoard({
  src,
  label,
  width = 120,
  height = 80,
}: RiveSignBoardProps) {
  const setCursorMagnetTarget = useWorldStore((s) => s.setCursorMagnetTarget)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: STATE_MACHINE,
    autoplay: true,
  })

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
