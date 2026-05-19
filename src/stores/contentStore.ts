import { create } from 'zustand'
import type { Photo } from '../types/Photo'
import type { YiddishPhrase } from '../types/YiddishPhrase'
import type { Birthday } from '../types/Birthday'
import yiddishData from '../data/yiddish.json'
import { testPhotos } from '../dev/testPhotos'
import { testBirthdays } from '../dev/testBirthdays'

export interface WelcomeConfig {
  photoPath: string
  message: string
  authorName: string
}

interface ContentState {
  photos: Photo[]
  yiddishPhrases: YiddishPhrase[]
  birthdays: Birthday[]
  welcomeConfig: WelcomeConfig
  setPhotos: (photos: Photo[]) => void
  setYiddishPhrases: (phrases: YiddishPhrase[]) => void
  setBirthdays: (birthdays: Birthday[]) => void
  setWelcomeConfig: (config: WelcomeConfig) => void
}

export const useContentStore = create<ContentState>()((set) => ({
  photos: import.meta.env.DEV ? testPhotos : [],
  yiddishPhrases: yiddishData,
  birthdays: import.meta.env.DEV ? testBirthdays : [],
  welcomeConfig: { photoPath: '', message: '', authorName: '' },
  setPhotos: (photos) => set({ photos }),
  setYiddishPhrases: (phrases) => set({ yiddishPhrases: phrases }),
  setBirthdays: (birthdays) => set({ birthdays }),
  setWelcomeConfig: (config) => set({ welcomeConfig: config }),
}))
