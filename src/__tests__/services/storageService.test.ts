import { describe, it, expect, vi, beforeEach } from 'vitest'
import { storageService } from '../../services/storageService'
import type { WelcomeConfig } from '../../stores/contentStore'

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ value: null }),
  },
}))

// Import after mock so Vitest replaces the module
import { Preferences } from '@capacitor/preferences'

const mockConfig: WelcomeConfig = {
  photoPath:  '/photos/familia.jpg',
  message:    'Feliz 50 aniversario',
  authorName: 'Sus hijos',
}

describe('storageService', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── saveWelcomeConfig ────────────────────────────────────────────────────

  describe('saveWelcomeConfig', () => {
    it('calls Preferences.set with correct key and serialized value', async () => {
      await storageService.saveWelcomeConfig(mockConfig)

      expect(Preferences.set).toHaveBeenCalledOnce()
      expect(Preferences.set).toHaveBeenCalledWith({
        key:   'welcomeConfig',
        value: JSON.stringify(mockConfig),
      })
    })
  })

  // ── loadWelcomeConfig ────────────────────────────────────────────────────

  describe('loadWelcomeConfig', () => {
    it('returns parsed config when data exists', async () => {
      vi.mocked(Preferences.get).mockResolvedValueOnce({
        value: JSON.stringify(mockConfig),
      })

      const result = await storageService.loadWelcomeConfig()

      expect(result).toEqual(mockConfig)
    })

    it('returns null when no data is stored', async () => {
      vi.mocked(Preferences.get).mockResolvedValueOnce({ value: null })

      const result = await storageService.loadWelcomeConfig()

      expect(result).toBeNull()
    })

    it('returns null on malformed JSON', async () => {
      vi.mocked(Preferences.get).mockResolvedValueOnce({ value: 'not-json{' })

      const result = await storageService.loadWelcomeConfig()

      expect(result).toBeNull()
    })

    it('returns null when Preferences.get throws', async () => {
      vi.mocked(Preferences.get).mockRejectedValueOnce(new Error('storage unavailable'))

      const result = await storageService.loadWelcomeConfig()

      expect(result).toBeNull()
    })
  })
})
