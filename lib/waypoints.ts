// lib/waypoints.ts
export interface WaypointData {
  slug: string
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
  islandIndex: number // 0 = overview, 1+ = island
}

export const WAYPOINTS: Record<string, WaypointData> = {
  home: {
    slug: 'home',
    position: { x: 0, y: 8, z: 20 },
    target: { x: 0, y: 0, z: 0 },
    islandIndex: 0,
  },
  sample: {
    slug: 'sample',
    position: { x: -8, y: 3, z: 0 },
    target: { x: -8, y: 0, z: 0 },
    islandIndex: 1,
  },
  'post-diary-01': {
    slug: 'post-diary-01',
    position: { x: -8, y: 3, z: 0 },
    target: { x: -8, y: 0, z: 0 },
    islandIndex: 1,
  },
  'post-diary-02': {
    slug: 'post-diary-02',
    position: { x: 8, y: 3, z: 0 },
    target: { x: 8, y: 0, z: 0 },
    islandIndex: 2,
  },
  'post-study-01': {
    slug: 'post-study-01',
    position: { x: 8, y: 3, z: 0 },
    target: { x: 8, y: 0, z: 0 },
    islandIndex: 2,
  },
  'post-log-01': {
    slug: 'post-log-01',
    position: { x: 0, y: 3, z: -10 },
    target: { x: 0, y: 0, z: -10 },
    islandIndex: 3,
  },
}

// Scroll flythrough waypoints for /world page — sequential stop-points
export const SCROLL_WAYPOINTS: WaypointData[] = [
  {
    slug: 'scroll-island-1',
    position: { x: -8, y: 3, z: 0 },
    target: { x: -8, y: 0, z: 0 },
    islandIndex: 1,
  },
  {
    slug: 'scroll-island-2',
    position: { x: 8, y: 3, z: 0 },
    target: { x: 8, y: 0, z: 0 },
    islandIndex: 2,
  },
  {
    slug: 'scroll-island-3',
    position: { x: 0, y: 3, z: -10 },
    target: { x: 0, y: 0, z: -10 },
    islandIndex: 3,
  },
]
