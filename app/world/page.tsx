'use client'

import { useEffect } from 'react'
import { useWorldStore } from '@/lib/worldStore'
import { WAYPOINTS } from '@/lib/waypoints'
import WorldKeyboardNav from '@/components/world/WorldKeyboardNav'
import useScrollOpacity from '@/lib/useScrollOpacity'

export default function WorldPage() {
  const setActiveWaypoint = useWorldStore((s) => s.setActiveWaypoint)
  const setIsHomePage = useWorldStore((s) => s.setIsHomePage)

  useScrollOpacity()

  useEffect(() => {
    setActiveWaypoint(WAYPOINTS.home)
    setIsHomePage(true)
    return () => {
      setActiveWaypoint(null)
      setIsHomePage(false)
    }
  }, [setActiveWaypoint, setIsHomePage])

  return (
    <>
      <WorldKeyboardNav />
      <div style={{ height: '300vh' }}>
        <h1 style={{ padding: '2rem' }}>/world</h1>
      </div>
    </>
  )
}
