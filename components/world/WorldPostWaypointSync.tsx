'use client'

import { useEffect } from 'react'
import { setActiveWaypoint } from '@/lib/worldStore'
import { WAYPOINTS } from '@/lib/waypoints'

interface Props { slug: string }

export default function WorldPostWaypointSync({ slug }: Props) {
  useEffect(() => {
    if (!WAYPOINTS[slug]) {
      console.warn('[waypoint] unknown slug:', slug, '— falling back to home')
    }
    const waypoint = WAYPOINTS[slug] ?? WAYPOINTS.home
    setActiveWaypoint(waypoint)
    return () => {
      setActiveWaypoint(null)
    }
  }, [slug])
  return null
}
