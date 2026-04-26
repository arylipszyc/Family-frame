import { create } from 'zustand'
import type { AppMode } from '../types/AppMode'

interface DisplayState {
  mode: AppMode
  currentPhotoIndex: number
  setMode: (mode: AppMode) => void
  setCurrentPhotoIndex: (index: number) => void
}

export const useDisplayStore = create<DisplayState>()((set) => ({
  mode: 'welcome',
  currentPhotoIndex: 0,
  setMode: (mode) => set({ mode }),
  setCurrentPhotoIndex: (index) => set({ currentPhotoIndex: index }),
}))
