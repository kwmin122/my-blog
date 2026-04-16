'use client'

import { useRef } from 'react'
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'
import { useWorldStore } from '@/lib/worldStore'

const STATE_MACHINE = 'SignMachine'

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

  // SMIBool — set value to true/false on pointer enter/leave
  const hoverInput    = useStateMachineInput(rive, STATE_MACHINE, 'hover')
  // SMITrigger — fire on click
  const activateTrigger = useStateMachineInput(rive, STATE_MACHINE, 'activate')

  function handlePointerEnter() {
    if (hoverInput) hoverInput.value = true
    // Compute element center for magnetic cursor pull
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setCursorMagnetTarget({
        x: rect.left + rect.width / 2,
        y: rect.top  + rect.height / 2,
      })
    }
  }

  function handlePointerLeave() {
    if (hoverInput) hoverInput.value = false
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
