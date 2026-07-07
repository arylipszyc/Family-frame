import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks (factory executes before module resolution) ────────────────

const { mockPreferences, mockFilesystem } = vi.hoisted(() => ({
  mockPreferences: {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ value: null }),
  },
  mockFilesystem: {
    writeFile:  vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    stat:       vi.fn().mockResolvedValue({}),
    getUri:     vi.fn().mockResolvedValue({ uri: 'file:///data/photos/photo1.jpg' }),
  },
}))

vi.mock('@capacitor/preferences', () => ({
  Preferences: mockPreferences,
}))

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: mockFilesystem,
  Directory:  { Data: 'DATA' },
}))

// ── Subject ──────────────────────────────────────────────────────────────────

import { photoCacheService } from '../../services/photoCacheService'

// ── Helper ───────────────────────────────────────────────────────────────────

function makeBlob(content = 'fake-image-data'): Blob {
  return new Blob([content], { type: 'image/jpeg' })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('photoCacheService', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset in-memory index by re-initializing against empty preferences
    mockPreferences.get.mockResolvedValueOnce({ value: null })
    await photoCacheService.initialize()
  })

  // ── initialize ─────────────────────────────────────────────────────────────

  describe('initialize', () => {
    it('loads existing index from Preferences into memory', async () => {
      const stored = [{ id: 'abc', localPath: 'photos/abc.jpg', syncedAt: '2026-04-15T00:00:00.000Z' }]
      mockPreferences.get.mockResolvedValueOnce({ value: JSON.stringify(stored) })

      await photoCacheService.initialize()

      expect(photoCacheService.hasPhoto('abc')).toBe(true)
    })

    it('starts with empty index when preferences has no data', async () => {
      mockPreferences.get.mockResolvedValueOnce({ value: null })
      await photoCacheService.initialize()

      expect(photoCacheService.hasPhoto('any-id')).toBe(false)
    })

    it('recovers from corrupted index without throwing', async () => {
      mockPreferences.get.mockResolvedValueOnce({ value: 'not-valid-json[' })

      await expect(photoCacheService.initialize()).resolves.not.toThrow()
      expect(photoCacheService.hasPhoto('any-id')).toBe(false)
    })
  })

  // ── savePhoto ──────────────────────────────────────────────────────────────

  describe('savePhoto', () => {
    it('writes file to Filesystem with correct path and directory', async () => {
      await photoCacheService.savePhoto('photo1', makeBlob())

      expect(mockFilesystem.writeFile).toHaveBeenCalledOnce()
      const call = mockFilesystem.writeFile.mock.calls[0][0]
      expect(call.path).toBe('photos/photo1.jpg')
      expect(call.directory).toBe('DATA')
      expect(typeof call.data).toBe('string')
    })

    it('persists the updated index to Preferences', async () => {
      await photoCacheService.savePhoto('photo1', makeBlob())

      expect(mockPreferences.set).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'photoCacheIndex' })
      )
      const setCall = mockPreferences.set.mock.calls[0][0]
      const index = JSON.parse(setCall.value)
      expect(index).toHaveLength(1)
      expect(index[0].id).toBe('photo1')
      expect(index[0].localPath).toBe('photos/photo1.jpg')
    })

    it('registers the photo in the in-memory index', async () => {
      expect(photoCacheService.hasPhoto('photo1')).toBe(false)
      await photoCacheService.savePhoto('photo1', makeBlob())
      expect(photoCacheService.hasPhoto('photo1')).toBe(true)
    })
  })

  // ── hasPhoto ───────────────────────────────────────────────────────────────

  describe('hasPhoto', () => {
    it('returns false for an unknown id', () => {
      expect(photoCacheService.hasPhoto('unknown')).toBe(false)
    })

    it('returns true after saving a photo', async () => {
      await photoCacheService.savePhoto('photo2', makeBlob())
      expect(photoCacheService.hasPhoto('photo2')).toBe(true)
    })
  })

  // ── deletePhoto / getCachedIds ─────────────────────────────────────────────

  describe('deletePhoto', () => {
    it('removes file from disk, index and persists the updated index', async () => {
      await photoCacheService.savePhoto('doomed', makeBlob())
      expect(photoCacheService.hasPhoto('doomed')).toBe(true)

      await photoCacheService.deletePhoto('doomed')

      expect(mockFilesystem.deleteFile).toHaveBeenCalledWith({
        path: 'photos/doomed.jpg',
        directory: 'DATA',
      })
      expect(photoCacheService.hasPhoto('doomed')).toBe(false)
      const lastSet = mockPreferences.set.mock.calls[mockPreferences.set.mock.calls.length - 1][0]
      expect(JSON.parse(lastSet.value)).toEqual([])
    })

    it('removes the index entry even if the file is already gone from disk', async () => {
      await photoCacheService.savePhoto('ghost', makeBlob())
      mockFilesystem.deleteFile.mockRejectedValueOnce(new Error('File does not exist'))

      await expect(photoCacheService.deletePhoto('ghost')).resolves.toBeUndefined()

      expect(photoCacheService.hasPhoto('ghost')).toBe(false)
    })

    it('is a no-op for unknown ids', async () => {
      await photoCacheService.deletePhoto('never-existed')
      expect(mockFilesystem.deleteFile).not.toHaveBeenCalled()
      expect(mockPreferences.set).not.toHaveBeenCalled()
    })
  })

  describe('getCachedIds', () => {
    it('returns the ids currently in the index', async () => {
      expect(photoCacheService.getCachedIds()).toEqual([])
      await photoCacheService.savePhoto('a', makeBlob())
      await photoCacheService.savePhoto('b', makeBlob())
      expect(photoCacheService.getCachedIds()).toEqual(['a', 'b'])
    })
  })

  // ── getAllCachedPhotos ─────────────────────────────────────────────────────

  describe('getAllCachedPhotos', () => {
    it('returns empty array when index is empty', async () => {
      const result = await photoCacheService.getAllCachedPhotos()
      expect(result).toEqual([])
    })

    it('returns photos with platform URIs for existing files', async () => {
      await photoCacheService.savePhoto('photo3', makeBlob())

      mockFilesystem.stat.mockResolvedValueOnce({})
      mockFilesystem.getUri.mockResolvedValueOnce({ uri: 'file:///data/photos/photo3.jpg' })

      const result = await photoCacheService.getAllCachedPhotos()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('photo3')
      expect(result[0].localPath).toBe('file:///data/photos/photo3.jpg')
    })

    it('skips photos whose file does not exist on disk', async () => {
      await photoCacheService.savePhoto('missing', makeBlob())

      mockFilesystem.stat.mockRejectedValueOnce(new Error('File does not exist'))

      const result = await photoCacheService.getAllCachedPhotos()

      expect(result).toEqual([])
    })

    it('returns only existing photos when mix of present and missing', async () => {
      await photoCacheService.savePhoto('exists', makeBlob())
      await photoCacheService.savePhoto('missing', makeBlob())

      mockFilesystem.stat
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('not found'))

      mockFilesystem.getUri.mockResolvedValueOnce({ uri: 'file:///data/photos/exists.jpg' })

      const result = await photoCacheService.getAllCachedPhotos()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('exists')
    })
  })
})
