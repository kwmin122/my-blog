'use client'

import { useEffect } from 'react'
import { setActiveWaypoint } from '@/lib/worldStore'
import { WAYPOINTS } from '@/lib/waypoints'

interface Props { slug: string }

export default function WorldPostWaypointSync({ slug }: Props) {
  useEffect(() => {
    const waypoint = WAYPOINTS[slug] ?? WAYPOINTS.home
    setActiveWaypoint(waypoint)
    return () => {
      setActiveWaypoint(null)
    }
  }, [slug])
  return null
}
