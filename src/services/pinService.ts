import { Preferences } from '@capacitor/preferences'
import bcrypt from 'bcryptjs'

const PIN_KEY = 'adminPin'
const DEFAULT_PIN = '1234'
const SALT_ROUNDS = 10

export const pinService = {
  async initPin(): Promise<void> {
    const { value } = await Preferences.get({ key: PIN_KEY })
    if (!value) {
      const hash = await bcrypt.hash(DEFAULT_PIN, SALT_ROUNDS)
      await Preferences.set({ key: PIN_KEY, value: hash })
    }
  },

  async verifyPin(entered: string): Promise<boolean> {
    const { value } = await Preferences.get({ key: PIN_KEY })
    if (!value) return false
    return bcrypt.compare(entered, value)
  },

  async setPin(newPin: string): Promise<void> {
    const hash = await bcrypt.hash(newPin, SALT_ROUNDS)
    await Preferences.set({ key: PIN_KEY, value: hash })
  },
}
