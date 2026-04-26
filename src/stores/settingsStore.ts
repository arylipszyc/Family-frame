import { create } from 'zustand'

interface SettingsState {
  photoRotationInterval: number   // ms
  nightModeStart: string          // "HH:MM"
  nightModeEnd: string            // "HH:MM"
  setPhotoRotationInterval: (ms: number) => void
  setNightModeStart: (t: string) => void
  setNightModeEnd: (t: string) => void
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  photoRotationInterval: 30_000,
  nightModeStart: '22:00',
  nightModeEnd: '07:00',
  setPhotoRotationInterval: (ms) => set({ photoRotationInterval: ms }),
  setNightModeStart: (t) => set({ nightModeStart: t }),
  setNightModeEnd: (t) => set({ nightModeEnd: t }),
}))
