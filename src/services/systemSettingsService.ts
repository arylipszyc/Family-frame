import { Preferences } from '@capacitor/preferences'
import type { YiddishScript } from '../stores/settingsStore'

const KEYS = {
  rotationInterval: 'photoRotationInterval',
  nightStart:       'nightModeStart',
  nightEnd:         'nightModeEnd',
  yiddishScript:    'yiddishScript',
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
      // Clamp al rango válido del admin [10 s, 86400 s = 1 día] en ms — evita
      // setInterval con 0/negativo y mantiene consistencia con la validación de AdminScreen.
      return Math.min(86_400_000, Math.max(10_000, n))
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

  // ── yiddishScript ('hebrew' | 'phonetic') ─────────────────────────────────

  async saveYiddishScript(s: YiddishScript): Promise<void> {
    await Preferences.set({ key: KEYS.yiddishScript, value: s })
  },

  async loadYiddishScript(): Promise<YiddishScript | null> {
    try {
      const { value } = await Preferences.get({ key: KEYS.yiddishScript })
      if (value === 'hebrew' || value === 'phonetic') return value
      return null
    } catch {
      return null
    }
  },
}
