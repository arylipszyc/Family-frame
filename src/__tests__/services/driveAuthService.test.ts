import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFetch, mockPreferences, mockSignJWT, mockImportPKCS8 } = vi.hoisted(() => {
  const signJWTInstance = {
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuer:          vi.fn().mockReturnThis(),
    setAudience:        vi.fn().mockReturnThis(),
    setIssuedAt:        vi.fn().mockReturnThis(),
    setExpirationTime:  vi.fn().mockReturnThis(),
    sign:               vi.fn().mockResolvedValue('signed.jwt.token'),
  }
  return {
    mockFetch: vi.fn(),
    mockPreferences: {
      get:    vi.fn().mockResolvedValue({ value: null }),
      set:    vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    mockSignJWT:      vi.fn().mockImplementation(() => signJWTInstance),
    mockImportPKCS8:  vi.fn().mockResolvedValue('mock-key'),
  }
})

vi.stubGlobal('fetch', mockFetch)
vi.mock('@capacitor/preferences', () => ({ Preferences: mockPreferences }))
vi.mock('jose', () => ({
  SignJWT:       mockSignJWT,
  importPKCS8:   mockImportPKCS8,
}))

import { driveAuthService } from '../../services/driveAuthService'

const validSA = JSON.stringify({
  type:           'service_account',
  client_email:   'family-frame-photos@family-frame-496520.iam.gserviceaccount.com',
  private_key:    '-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n',
  private_key_id: 'abc123',
})

beforeEach(() => {
  vi.clearAllMocks()
  driveAuthService._resetCache()
})

describe('driveAuthService.isAuthenticated', () => {
  it('returns true when SA JSON is stored', async () => {
    mockPreferences.get.mockResolvedValueOnce({ value: validSA })
    await expect(driveAuthService.isAuthenticated()).resolves.toBe(true)
  })

  it('returns false when SA JSON is not stored', async () => {
    mockPreferences.get.mockResolvedValueOnce({ value: null })
    await expect(driveAuthService.isAuthenticated()).resolves.toBe(false)
  })

  it('returns false when Preferences throws', async () => {
    mockPreferences.get.mockRejectedValueOnce(new Error('boom'))
    await expect(driveAuthService.isAuthenticated()).resolves.toBe(false)
  })
})

describe('driveAuthService.getAccessToken', () => {
  it('throws when SA JSON is not configured', async () => {
    mockPreferences.get.mockResolvedValueOnce({ value: null })
    await expect(driveAuthService.getAccessToken()).rejects.toThrow('Service Account not configured')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('signs JWT and exchanges it for an access token', async () => {
    mockPreferences.get.mockResolvedValueOnce({ value: validSA })
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: vi.fn().mockResolvedValue({ access_token: 'ya29.realtoken' }),
    })

    const token = await driveAuthService.getAccessToken()

    expect(token).toBe('ya29.realtoken')
    expect(mockImportPKCS8).toHaveBeenCalledWith(
      '-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n',
      'RS256'
    )
    expect(mockSignJWT).toHaveBeenCalledWith({ scope: 'https://www.googleapis.com/auth/drive.readonly' })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    )
    // Body is URLSearchParams — verify it contains the JWT assertion
    const bodyArg = mockFetch.mock.calls[0][1].body as URLSearchParams
    expect(bodyArg.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer')
    expect(bodyArg.get('assertion')).toBe('signed.jwt.token')
  })

  it('caches the token across consecutive calls', async () => {
    mockPreferences.get.mockResolvedValue({ value: validSA })
    mockFetch.mockResolvedValue({
      ok:   true,
      json: vi.fn().mockResolvedValue({ access_token: 'cached-token' }),
    })

    const t1 = await driveAuthService.getAccessToken()
    const t2 = await driveAuthService.getAccessToken()

    expect(t1).toBe('cached-token')
    expect(t2).toBe('cached-token')
    expect(mockFetch).toHaveBeenCalledOnce()
    expect(mockPreferences.get).toHaveBeenCalledOnce()
  })

  it('throws when token endpoint returns non-ok', async () => {
    mockPreferences.get.mockResolvedValueOnce({ value: validSA })
    mockFetch.mockResolvedValueOnce({
      ok:     false,
      status: 401,
      text:   vi.fn().mockResolvedValue('invalid_grant'),
    })

    await expect(driveAuthService.getAccessToken()).rejects.toThrow(/401/)
  })
})

describe('driveAuthService.clearAuth', () => {
  it('removes the stored SA JSON and clears cache', async () => {
    mockPreferences.get.mockResolvedValue({ value: validSA })
    mockFetch.mockResolvedValue({
      ok:   true,
      json: vi.fn().mockResolvedValue({ access_token: 'tok' }),
    })
    await driveAuthService.getAccessToken()
    expect(mockFetch).toHaveBeenCalledOnce()

    await driveAuthService.clearAuth()

    expect(mockPreferences.remove).toHaveBeenCalledWith({ key: 'googleServiceAccountJson' })

    // Next call should re-fetch (cache cleared) — set up a fresh fetch + reads SA again
    mockPreferences.get.mockResolvedValueOnce({ value: validSA })
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: vi.fn().mockResolvedValue({ access_token: 'tok2' }),
    })
    const t = await driveAuthService.getAccessToken()
    expect(t).toBe('tok2')
  })
})
