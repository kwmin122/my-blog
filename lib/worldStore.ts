import { create } from 'zustand'

export interface PostOverlay {
  slug: string
  title: string
  excerpt: string
}

interface WorldState {
  postOverlay: PostOverlay | null
  setPostOverlay: (overlay: PostOverlay) => void
  clearPostOverlay: () => void
}

export const useWorldStore = create<WorldState>((set) => ({
  postOverlay: null,
  setPostOverlay: (overlay: PostOverlay) => set({ postOverlay: overlay }),
  clearPostOverlay: () => set({ postOverlay: null }),
}))

export const setPostOverlay = (overlay: PostOverlay) =>
  useWorldStore.getState().setPostOverlay(overlay)

export const clearPostOverlay = () =>
  useWorldStore.getState().clearPostOverlay()
