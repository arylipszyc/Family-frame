import { describe, it, expect, vi, beforeEach } from 'vitest'
import { storageService } from '../../services/storageService'
import type { WelcomeConfig } from '../../stores/contentStore'

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ value: null }),
  },
}))

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    stat:      vi.fn().mockResolvedValue({}),
    getUri:    vi.fn().mockResolvedValue({ uri: 'file:///data/welcome/photo.jpg' }),
  },
  Directory: { Data: 'DATA' },
}))

// Import after mock so Vitest replaces the module
import { Preferences } from '@capacitor/preferences'
import { Filesystem } from '@capacitor/filesystem'

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

  // ── saveWelcomePhoto ───────────────────────────────────────────────────────

  describe('saveWelcomePhoto', () => {
    it('writes the blob to Filesystem and returns the disk path', async () => {
      const blob = new Blob(['img'], { type: 'image/jpeg' })

      const path = await storageService.saveWelcomePhoto(blob)

      expect(path).toBe('welcome/photo.jpg')
      expect(Filesystem.writeFile).toHaveBeenCalledOnce()
      const call = vi.mocked(Filesystem.writeFile).mock.calls[0][0]
      expect(call.path).toBe('welcome/photo.jpg')
      expect(call.directory).toBe('DATA')
      expect(call.recursive).toBe(true)
      expect(typeof call.data).toBe('string')
    })

    it('does NOT enforce a size limit (foto > 1 MB se acepta)', async () => {
      const bigBlob = new Blob(['x'.repeat(2_000_000)], { type: 'image/jpeg' })

      await expect(storageService.saveWelcomePhoto(bigBlob)).resolves.toBe('welcome/photo.jpg')
    })

    it('propaga el error si Filesystem.writeFile falla', async () => {
      vi.mocked(Filesystem.writeFile).mockRejectedValueOnce(new Error('disk full'))
      const blob = new Blob(['img'], { type: 'image/jpeg' })

      await expect(storageService.saveWelcomePhoto(blob)).rejects.toThrow('disk full')
    })
  })

  // ── getWelcomePhotoUri ─────────────────────────────────────────────────────

  describe('getWelcomePhotoUri', () => {
    it('resuelve el path a la URI de la plataforma cuando el archivo existe', async () => {
      const uri = await storageService.getWelcomePhotoUri('welcome/photo.jpg')

      expect(uri).toBe('file:///data/welcome/photo.jpg')
      expect(Filesystem.stat).toHaveBeenCalledWith({ path: 'welcome/photo.jpg', directory: 'DATA' })
    })

    it('returns null cuando el archivo no existe en disco', async () => {
      vi.mocked(Filesystem.stat).mockRejectedValueOnce(new Error('File does not exist'))

      const uri = await storageService.getWelcomePhotoUri('welcome/photo.jpg')

      expect(uri).toBeNull()
    })
  })
})
