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
import { saConfigService } from '../../services/saConfigService'

const validSA = {
  type:           'service_account',
  project_id:     'family-frame-496520',
  private_key_id: 'abc123',
  private_key:    '-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n',
  client_email:   'family-frame-photos@family-frame-496520.iam.gserviceaccount.com',
}

describe('saConfigService.bootstrapFromFile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('no-op when sa-config.json does not exist', async () => {
    vi.mocked(Filesystem.readFile).mockRejectedValueOnce(new Error('File does not exist'))

    await saConfigService.bootstrapFromFile()

    expect(Preferences.set).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('no-op when JSON is malformed', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({ data: '{not-json' })

    await saConfigService.bootstrapFromFile()

    expect(Preferences.set).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('no-op when type is not service_account', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({
      data: JSON.stringify({ ...validSA, type: 'user' }),
    })

    await saConfigService.bootstrapFromFile()

    expect(Preferences.set).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('no-op when required fields are missing', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({
      data: JSON.stringify({ type: 'service_account' }),
    })

    await saConfigService.bootstrapFromFile()

    expect(Preferences.set).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('persists full JSON string and deletes file when valid', async () => {
    const raw = JSON.stringify(validSA)
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({ data: raw })

    await saConfigService.bootstrapFromFile()

    expect(Preferences.set).toHaveBeenCalledOnce()
    expect(Preferences.set).toHaveBeenCalledWith({
      key:   'googleServiceAccountJson',
      value: raw,
    })
    expect(Filesystem.deleteFile).toHaveBeenCalledWith({
      path:      'sa-config.json',
      directory: 'EXTERNAL',
    })
  })

  it('does not throw when deleteFile fails after successful persist', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({ data: JSON.stringify(validSA) })
    vi.mocked(Filesystem.deleteFile).mockRejectedValueOnce(new Error('Permission denied'))

    await expect(saConfigService.bootstrapFromFile()).resolves.toBeUndefined()

    expect(Preferences.set).toHaveBeenCalledOnce()
  })
})
