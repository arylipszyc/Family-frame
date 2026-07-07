import { create } from 'zustand'
import type { AppMode } from '../types/AppMode'

interface DisplayState {
  mode: AppMode
  setMode: (mode: AppMode) => void
}

export const useDisplayStore = create<DisplayState>()((set) => ({
  mode: 'welcome',
  setMode: (mode) => set({ mode }),
}))
