import { Preferences } from '@capacitor/preferences'
import type { YiddishPhrase } from '../types/YiddishPhrase'
import type { Birthday } from '../types/Birthday'

const YIDDISH_KEY  = 'yiddishPhrases'
const BIRTHDAYS_KEY = 'birthdays'

export const adminContentService = {
  async saveYiddishPhrases(phrases: YiddishPhrase[]): Promise<void> {
    await Preferences.set({ key: YIDDISH_KEY, value: JSON.stringify(phrases) })
  },

  async loadYiddishPhrases(): Promise<YiddishPhrase[] | null> {
    try {
      const { value } = await Preferences.get({ key: YIDDISH_KEY })
      if (!value) return null
      return JSON.parse(value) as YiddishPhrase[]
    } catch {
      return null
    }
  },

  async saveBirthdays(birthdays: Birthday[]): Promise<void> {
    await Preferences.set({ key: BIRTHDAYS_KEY, value: JSON.stringify(birthdays) })
  },

  async loadBirthdays(): Promise<Birthday[] | null> {
    try {
      const { value } = await Preferences.get({ key: BIRTHDAYS_KEY })
      if (!value) return null
      const raw = JSON.parse(value) as Array<Partial<Birthday>>
      // Backward-compat: entries persistidos antes del Epic 7 no tienen `calendar`.
      return raw.map(b => ({ ...b, calendar: b.calendar ?? 'gregorian' })) as Birthday[]
    } catch {
      return null
    }
  },
}
