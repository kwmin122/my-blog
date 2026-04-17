import { create } from 'zustand'
import type { WaypointData } from './waypoints'

export interface PostOverlay {
  slug: string
  title: string
  excerpt: string
}

export interface PostMeta {
  slug: string
  title: string
  excerpt: string
  category: string
  waypointIndex: number
}

interface WorldState {
  // --- Phase 2: postOverlay (unchanged) ---
  postOverlay: PostOverlay | null
  setPostOverlay: (overlay: PostOverlay) => void
  clearPostOverlay: () => void

  // --- Phase 3: waypoint ---
  activeWaypoint: WaypointData | null
  setActiveWaypoint: (waypoint: WaypointData | null) => void

  // --- Phase 3: scroll home flag ---
  isHomePage: boolean
  setIsHomePage: (v: boolean) => void

  // --- Phase 3: post registry ---
  postMeta: Record<string, PostMeta>
  setPostMeta: (slug: string, meta: PostMeta) => void

  // --- Phase 6: custom cursor magnetic target ---
  cursorMagnetTarget: { x: number; y: number } | null
  setCursorMagnetTarget: (target: { x: number; y: number } | null) => void

  // --- Phase 7: minimal mode (cognitive accessibility toggle) ---
  minimalMode: boolean
  setMinimalMode: (v: boolean) => void
}

export const useWorldStore = create<WorldState>((set) => ({
  postOverlay: null,
  setPostOverlay: (overlay: PostOverlay) => set({ postOverlay: overlay }),
  clearPostOverlay: () => set({ postOverlay: null }),

  activeWaypoint: null,
  setActiveWaypoint: (waypoint: WaypointData | null) => set({ activeWaypoint: waypoint }),

  isHomePage: false,
  setIsHomePage: (v: boolean) => set({ isHomePage: v }),

  postMeta: {},
  setPostMeta: (slug: string, meta: PostMeta) =>
    set((state) => ({ postMeta: { ...state.postMeta, [slug]: meta } })),

  cursorMagnetTarget: null,
  setCursorMagnetTarget: (target) => set({ cursorMagnetTarget: target }),

  minimalMode: false,
  setMinimalMode: (v: boolean) => set({ minimalMode: v }),
}))

// Stable bound selectors for direct import (non-hook contexts)
export const setPostOverlay = (overlay: PostOverlay) =>
  useWorldStore.getState().setPostOverlay(overlay)

export const clearPostOverlay = () =>
  useWorldStore.getState().clearPostOverlay()

export const setActiveWaypoint = (waypoint: WaypointData | null) =>
  useWorldStore.getState().setActiveWaypoint(waypoint)

export const setCursorMagnetTarget = (target: { x: number; y: number } | null) =>
  useWorldStore.getState().setCursorMagnetTarget(target)

export const setMinimalMode = (v: boolean) =>
  useWorldStore.getState().setMinimalMode(v)
