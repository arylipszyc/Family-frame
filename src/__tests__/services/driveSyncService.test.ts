import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFetch, mockPreferences, mockDriveAuth, mockPhotoCache } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockPreferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
  },
  mockDriveAuth: {
    getAccessToken: vi.fn().mockResolvedValue('test-token'),
  },
  mockPhotoCache: {
    hasPhoto:           vi.fn().mockReturnValue(false),
    savePhoto:          vi.fn().mockResolvedValue(undefined),
    getAllCachedPhotos: vi.fn().mockResolvedValue([]),
  },
}))

vi.stubGlobal('fetch', mockFetch)
vi.mock('@capacitor/preferences',          () => ({ Preferences:      mockPreferences }))
vi.mock('../../services/driveAuthService', () => ({ driveAuthService: mockDriveAuth }))
vi.mock('../../services/photoCacheService',() => ({ photoCacheService: mockPhotoCache }))

import { driveSyncService } from '../../services/driveSyncService'
import { useSyncStore }     from '../../stores/syncStore'
import { useContentStore }  from '../../stores/contentStore'

function mockListResponse(files: Array<{ id: string; name?: string; size?: string }>, nextPageToken?: string) {
  mockFetch.mockResolvedValueOnce({
    ok:   true,
    json: vi.fn().mockResolvedValue({
      files: files.map((f) => ({
        id:           f.id,
        name:         f.name ?? `${f.id}.jpg`,
        mimeType:     'image/jpeg',
        modifiedTime: '2026-05-16T10:00:00Z',
        ...(f.size !== undefined ? { size: f.size } : {}),
      })),
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

describe('driveSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSyncStore.setState({ syncStatus: 'idle', lastSync: null, isOnline: false })
    useContentStore.setState({
      photos: [],
      yiddishPhrases: [],
      birthdays: [],
      welcomeConfig: { photoPath: '', message: '', authorName: '' },
    })
    mockPreferences.get.mockResolvedValue({ value: 'folder-abc-123' })
    mockDriveAuth.getAccessToken.mockResolvedValue('valid-token')
    mockPhotoCache.hasPhoto.mockReturnValue(false)
  })

  it('returns early with 0 when folderId is not configured', async () => {
    mockPreferences.get.mockResolvedValueOnce({ value: null })

    const count = await driveSyncService.sync()

    expect(count).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockDriveAuth.getAccessToken).not.toHaveBeenCalled()
    expect(useSyncStore.getState().syncStatus).toBe('idle')
  })

  it('downloads and caches new files, updates contentStore, returns count', async () => {
    mockListResponse([{ id: 'file-1' }, { id: 'file-2' }])
    mockDownload()
    mockDownload()
    const updatedPhotos = [
      { id: 'file-1', localPath: 'file:///photos/file-1.jpg', syncedAt: '' },
      { id: 'file-2', localPath: 'file:///photos/file-2.jpg', syncedAt: '' },
    ]
    mockPhotoCache.getAllCachedPhotos.mockResolvedValueOnce(updatedPhotos)

    const count = await driveSyncService.sync()

    expect(count).toBe(2)
    expect(mockPhotoCache.savePhoto).toHaveBeenCalledTimes(2)
    expect(mockPhotoCache.savePhoto).toHaveBeenCalledWith('file-1', expect.any(Blob))
    expect(mockPhotoCache.savePhoto).toHaveBeenCalledWith('file-2', expect.any(Blob))
    expect(useContentStore.getState().photos).toEqual(updatedPhotos)
    expect(useSyncStore.getState().lastSync).not.toBeNull()
    expect(useSyncStore.getState().syncStatus).toBe('idle')
  })

  it('issues Drive list call with folderId and image mimeType filter', async () => {
    mockListResponse([])

    await driveSyncService.sync()

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('https://www.googleapis.com/drive/v3/files?')
    // Decode query string and inspect the `q` parameter directly (URLSearchParams encodes spaces as +)
    const q = new URLSearchParams(url.split('?')[1]).get('q')
    expect(q).toBe("'folder-abc-123' in parents and mimeType contains 'image/' and trashed=false")
    const opts = mockFetch.mock.calls[0][1]
    expect(opts.headers.Authorization).toBe('Bearer valid-token')
  })

  it('paginates with nextPageToken until exhausted', async () => {
    mockListResponse([{ id: 'file-1' }], 'token-page-2')
    mockListResponse([{ id: 'file-2' }])
    mockDownload()
    mockDownload()
    mockPhotoCache.getAllCachedPhotos.mockResolvedValueOnce([])

    const count = await driveSyncService.sync()

    expect(count).toBe(2)
    // 2 list calls + 2 download calls
    expect(mockFetch).toHaveBeenCalledTimes(4)
    const secondListUrl = mockFetch.mock.calls[1][0] as string
    expect(secondListUrl).toContain('pageToken=token-page-2')
  })

  it('skips already-cached files', async () => {
    mockPhotoCache.hasPhoto.mockImplementation((id: string) => id === 'file-old')
    mockListResponse([{ id: 'file-old' }, { id: 'file-new' }])
    mockDownload()
    mockPhotoCache.getAllCachedPhotos.mockResolvedValueOnce([])

    const count = await driveSyncService.sync()

    expect(count).toBe(1)
    expect(mockPhotoCache.savePhoto).toHaveBeenCalledOnce()
    expect(mockPhotoCache.savePhoto).toHaveBeenCalledWith('file-new', expect.any(Blob))
  })

  it('skips files larger than 20MB with a console warning (Capacitor bridge OOM guard)', async () => {
    const TWENTY_MB = 20 * 1024 * 1024
    mockListResponse([
      { id: 'small',  name: 'small.jpg',  size: String(5 * 1024 * 1024) },
      { id: 'big',    name: 'huge.jpg',   size: String(TWENTY_MB + 1) },
      { id: 'nosize', name: 'nosize.jpg' },
    ])
    mockDownload()
    mockDownload()
    mockPhotoCache.getAllCachedPhotos.mockResolvedValueOnce([])
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const count = await driveSyncService.sync()

    expect(count).toBe(2)
    expect(mockPhotoCache.savePhoto).toHaveBeenCalledTimes(2)
    expect(mockPhotoCache.savePhoto).toHaveBeenCalledWith('small',  expect.any(Blob))
    expect(mockPhotoCache.savePhoto).toHaveBeenCalledWith('nosize', expect.any(Blob))
    expect(mockPhotoCache.savePhoto).not.toHaveBeenCalledWith('big', expect.any(Blob))
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('huge.jpg'))
    warnSpy.mockRestore()
  })

  it('does nothing when no new files, returns 0', async () => {
    mockPhotoCache.hasPhoto.mockReturnValue(true)
    mockListResponse([{ id: 'file-old' }])

    const count = await driveSyncService.sync()

    expect(count).toBe(0)
    expect(mockPhotoCache.savePhoto).not.toHaveBeenCalled()
    expect(mockPhotoCache.getAllCachedPhotos).not.toHaveBeenCalled()
    expect(useSyncStore.getState().syncStatus).toBe('idle')
  })

  it('sets syncStatus to error and re-throws on list API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(driveSyncService.sync()).rejects.toThrow()

    expect(useSyncStore.getState().syncStatus).toBe('error')
    consoleSpy.mockRestore()
  })

  it('sets syncStatus to error and re-throws on getAccessToken failure', async () => {
    mockDriveAuth.getAccessToken.mockRejectedValueOnce(new Error('Not authenticated'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(driveSyncService.sync()).rejects.toThrow()

    expect(useSyncStore.getState().syncStatus).toBe('error')
    expect(mockFetch).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('sets syncStatus to error and re-throws on download failure', async () => {
    mockListResponse([{ id: 'file-1' }])
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(driveSyncService.sync()).rejects.toThrow()

    expect(useSyncStore.getState().syncStatus).toBe('error')
    consoleSpy.mockRestore()
  })
})
