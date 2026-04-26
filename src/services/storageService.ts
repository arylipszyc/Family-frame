import { Preferences } from '@capacitor/preferences'
import type { WelcomeConfig } from '../stores/contentStore'

const WELCOME_CONFIG_KEY = 'welcomeConfig'

export const storageService = {
  async saveWelcomeConfig(config: WelcomeConfig): Promise<void> {
    await Preferences.set({
      key:   WELCOME_CONFIG_KEY,
      value: JSON.stringify(config),
    })
  },

  async loadWelcomeConfig(): Promise<WelcomeConfig | null> {
    try {
      const { value } = await Preferences.get({ key: WELCOME_CONFIG_KEY })
      if (!value) return null
      return JSON.parse(value) as WelcomeConfig
    } catch {
      return null
    }
  },
}
