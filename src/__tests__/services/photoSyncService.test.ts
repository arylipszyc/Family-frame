import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockFetch, mockPreferences, mockOAuth, mockPhotoCache } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockPreferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
  },
  mockOAuth: {
    getToken: vi.fn().mockResolvedValue('test-token'),
  },
  mockPhotoCache: {
    hasPhoto:          vi.fn().mockReturnValue(false),
    savePhoto:         vi.fn().mockResolvedValue(undefined),
    getAllCachedPhotos: vi.fn().mockResolvedValue([]),
  },
}))

vi.stubGlobal('fetch', mockFetch)
vi.mock('@capacitor/preferences', () => ({ Preferences: mockPreferences }))
vi.mock('../../services/oauthService',     () => ({ oauthService:     mockOAuth }))
vi.mock('../../services/photoCacheService', () => ({ photoCacheService: mockPhotoCache }))

// ── Subject + stores ──────────────────────────────────────────────────────────

import { photoSyncService } from '../../services/photoSyncService'
import { useSyncStore }     from '../../stores/syncStore'
import { useContentStore }  from '../../stores/contentStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockAlbumResponse(items: Array<{ id: string; baseUrl: string }>, nextPageToken?: string) {
  mockFetch.mockResolvedValueOnce({
    ok:   true,
    json: vi.fn().mockResolvedValue({
      mediaItems: items.map((i) => ({ ...i, mimeType: 'image/jpeg' })),
      ...(nextPageToken ? { nextPageToken } : {}),
    }),
  })
}

function mockDownload(blob = new Blob(['img'], { type: 'image/jpeg' })) {
  mockFetch.mockResolvedValueOnce({
    ok:   true,
    blob: vi.fn().mockResolvedValue(blob),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('photoSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset stores to known initial state
    useSyncStore.setState({ syncStatus: 'idle', lastSync: null, isOnline: false })
    useContentStore.setState({ photos: [], yiddishPhrases: [], birthdays: [], welcomeConfig: { photoPath: '', message: '', authorName: '' } })
    // Default: album configured
    mockPreferences.get.mockResolvedValue({ value: 'album-id-123' })
    mockOAuth.getToken.mockResolvedValue('valid-token')
  })

  // ── sync with new photos ──────────────────────────────────────────────────

  it('downloads and caches new photos, updates contentStore, returns count', async () => {
    const newItem = { id: 'photo-new', baseUrl: 'https://lh3.example.com/new' }
    mockPhotoCache.hasPhoto.mockReturnValue(false)
    mockAlbumResponse([newItem])
    mockDownload()
    const updatedPhotos = [{ id: 'photo-new', localPath: 'file:///photos/photo-new.jpg', syncedAt: '' }]
    mockPhotoCache.getAllCachedPhotos.mockResolvedValueOnce(updatedPhotos)

    const count = await photoSyncService.sync()

    expect(count).toBe(1)
    expect(mockPhotoCache.savePhoto).toHaveBeenCalledWith('photo-new', expect.any(Blob))
    expect(useContentStore.getState().photos).toEqual(updatedPhotos)
    expect(useSyncStore.getState().lastSync).not.toBeNull()
    expect(useSyncStore.getState().syncStatus).toBe('idle')
  })

  // ── sync with no new photos ───────────────────────────────────────────────

  it('does nothing when all photos are already cached, returns 0', async () => {
    mockPhotoCache.hasPhoto.mockReturnValue(true)   // all photos known
    mockAlbumResponse([{ id: 'photo-old', baseUrl: 'https://lh3.example.com/old' }])

    const count = await photoSyncService.sync()

    expect(count).toBe(0)
    expect(mockPhotoCache.savePhoto).not.toHaveBeenCalled()
    expect(mockPhotoCache.getAllCachedPhotos).not.toHaveBeenCalled()
    expect(useSyncStore.getState().syncStatus).toBe('idle')
  })

  it('skips download when album returns empty list, returns 0', async () => {
    mockAlbumResponse([])

    const count = await photoSyncService.sync()

    expect(count).toBe(0)
    expect(mockPhotoCache.savePhoto).not.toHaveBeenCalled()
    expect(useSyncStore.getState().syncStatus).toBe('idle')
  })

  // ── sync error handling ───────────────────────────────────────────────────

  it('sets syncStatus to error and re-throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(photoSyncService.sync()).rejects.toThrow()

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[photoSyncService]'),
      expect.any(Error)
    )
    expect(useSyncStore.getState().syncStatus).toBe('error')
    consoleSpy.mockRestore()
  })

  it('sets syncStatus to error and re-throws on getToken failure', async () => {
    mockOAuth.getToken.mockRejectedValueOnce(new Error('Not authenticated'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(photoSyncService.sync()).rejects.toThrow()

    expect(useSyncStore.getState().syncStatus).toBe('error')
    expect(mockFetch).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  // ── sets syncStatus to 'syncing' during operation ────────────────────────

  it('returns early with 0 when album ID is not configured', async () => {
    mockPreferences.get.mockResolvedValueOnce({ value: null })

    const count = await photoSyncService.sync()

    expect(count).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
    expect(useSyncStore.getState().syncStatus).toBe('idle')
  })
})
