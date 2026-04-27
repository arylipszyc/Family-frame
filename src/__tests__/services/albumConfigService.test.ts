import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    readFile:   vi.fn(),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  },
  Directory: { External: 'EXTERNAL' },
  Encoding:  { UTF8: 'utf8' },
}))

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ value: null }),
  },
}))

import { Filesystem } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import { albumConfigService } from '../../services/albumConfigService'

describe('albumConfigService.bootstrapFromFile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('no-op when album-config.json does not exist', async () => {
    vi.mocked(Filesystem.readFile).mockRejectedValueOnce(new Error('File does not exist'))

    await albumConfigService.bootstrapFromFile()

    expect(Preferences.set).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('no-op when JSON is malformed', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({ data: '{not-json' })

    await albumConfigService.bootstrapFromFile()

    expect(Preferences.set).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('no-op when albumId field is missing', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({ data: JSON.stringify({ foo: 'bar' }) })

    await albumConfigService.bootstrapFromFile()

    expect(Preferences.set).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('no-op when albumId is empty string', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({ data: JSON.stringify({ albumId: '   ' }) })

    await albumConfigService.bootstrapFromFile()

    expect(Preferences.set).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('persists albumId to Preferences and deletes file when valid', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({
      data: JSON.stringify({ albumId: 'ABC123xyz' }),
    })

    await albumConfigService.bootstrapFromFile()

    expect(Preferences.set).toHaveBeenCalledOnce()
    expect(Preferences.set).toHaveBeenCalledWith({
      key:   'googlePhotosAlbumId',
      value: 'ABC123xyz',
    })
    expect(Filesystem.deleteFile).toHaveBeenCalledOnce()
    expect(Filesystem.deleteFile).toHaveBeenCalledWith({
      path:      'album-config.json',
      directory: 'EXTERNAL',
    })
  })

  it('does not throw when deleteFile fails after successful persist', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({
      data: JSON.stringify({ albumId: 'ABC123xyz' }),
    })
    vi.mocked(Filesystem.deleteFile).mockRejectedValueOnce(new Error('Permission denied'))

    await expect(albumConfigService.bootstrapFromFile()).resolves.toBeUndefined()

    expect(Preferences.set).toHaveBeenCalledOnce()
  })
})
