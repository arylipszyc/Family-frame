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
import { folderConfigService } from '../../services/folderConfigService'

describe('folderConfigService.bootstrapFromFile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('no-op when drive-folder-config.json does not exist', async () => {
    vi.mocked(Filesystem.readFile).mockRejectedValueOnce(new Error('File does not exist'))

    await folderConfigService.bootstrapFromFile()

    expect(Preferences.set).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('no-op when JSON is malformed', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({ data: '{not-json' })

    await folderConfigService.bootstrapFromFile()

    expect(Preferences.set).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('no-op when folderId field is missing', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({ data: JSON.stringify({ foo: 'bar' }) })

    await folderConfigService.bootstrapFromFile()

    expect(Preferences.set).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('no-op when folderId is whitespace', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({ data: JSON.stringify({ folderId: '   ' }) })

    await folderConfigService.bootstrapFromFile()

    expect(Preferences.set).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('persists folderId to Preferences and deletes file when valid', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({
      data: JSON.stringify({ folderId: '1nG1xCgiqWfJjXX4ZMHxjOsUGCIhsen32' }),
    })

    await folderConfigService.bootstrapFromFile()

    expect(Preferences.set).toHaveBeenCalledOnce()
    expect(Preferences.set).toHaveBeenCalledWith({
      key:   'googleDriveFolderId',
      value: '1nG1xCgiqWfJjXX4ZMHxjOsUGCIhsen32',
    })
    expect(Filesystem.deleteFile).toHaveBeenCalledWith({
      path:      'drive-folder-config.json',
      directory: 'EXTERNAL',
    })
  })

  it('does not throw when deleteFile fails after successful persist', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({
      data: JSON.stringify({ folderId: 'abc' }),
    })
    vi.mocked(Filesystem.deleteFile).mockRejectedValueOnce(new Error('Permission denied'))

    await expect(folderConfigService.bootstrapFromFile()).resolves.toBeUndefined()

    expect(Preferences.set).toHaveBeenCalledOnce()
  })
})
