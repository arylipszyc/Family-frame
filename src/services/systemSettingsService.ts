import { Preferences } from '@capacitor/preferences'

const KEYS = {
  rotationInterval: 'photoRotationInterval',
  nightStart:       'nightModeStart',
  nightEnd:         'nightModeEnd',
} as const

export const systemSettingsService = {
  // ── photoRotationInterval (ms) ────────────────────────────────────────────

  async savePhotoRotationInterval(ms: number): Promise<void> {
    await Preferences.set({ key: KEYS.rotationInterval, value: String(ms) })
  },

  async loadPhotoRotationInterval(): Promise<number | null> {
    try {
      const { value } = await Preferences.get({ key: KEYS.rotationInterval })
      if (!value) return null
      const n = parseInt(value, 10)
      if (isNaN(n)) return null
      // P5: clamp al rango válido [10 s, 300 s] en ms para evitar setInterval con 0 o negativo
      return Math.min(300_000, Math.max(10_000, n))
    } catch {
      return null
    }
  },

  // ── nightModeStart (HH:MM) ────────────────────────────────────────────────

  async saveNightModeStart(t: string): Promise<void> {
    await Preferences.set({ key: KEYS.nightStart, value: t })
  },

  async loadNightModeStart(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: KEYS.nightStart })
      return value ?? null
    } catch {
      return null
    }
  },

  // ── nightModeEnd (HH:MM) ──────────────────────────────────────────────────

  async saveNightModeEnd(t: string): Promise<void> {
    await Preferences.set({ key: KEYS.nightEnd, value: t })
  },

  async loadNightModeEnd(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: KEYS.nightEnd })
      return value ?? null
    } catch {
      return null
    }
  },
}
