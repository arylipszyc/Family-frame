import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockPreferences, mockSocialLogin, mockFetch } = vi.hoisted(() => ({
  mockPreferences: {
    get:    vi.fn().mockResolvedValue({ value: null }),
    set:    vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
  mockSocialLogin: {
    initialize: vi.fn().mockResolvedValue(undefined),
    login:      vi.fn(),
  },
  mockFetch: vi.fn(),
}))

vi.mock('@capacitor/preferences', () => ({ Preferences: mockPreferences }))
vi.mock('@capgo/capacitor-social-login', () => ({ SocialLogin: mockSocialLogin }))

// Replace global fetch
vi.stubGlobal('fetch', mockFetch)

// Stub env vars used in oauthService
vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', 'test-client-id.apps.googleusercontent.com')
vi.stubEnv('VITE_GOOGLE_CLIENT_SECRET', 'test-client-secret')

// ── Subject ───────────────────────────────────────────────────────────────────

import { oauthService } from '../../services/oauthService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockOfflineLoginResponse(serverAuthCode: string) {
  mockSocialLogin.login.mockResolvedValueOnce({
    result: { responseType: 'offline', serverAuthCode },
  })
}

function mockTokenExchangeResponse(
  access_token = 'test-access-token',
  refresh_token = 'test-refresh-token',
  expires_in = 3600
) {
  mockFetch.mockResolvedValueOnce({
    ok:   true,
    json: vi.fn().mockResolvedValue({ access_token, refresh_token, expires_in }),
  })
}

function mockRefreshResponse(access_token = 'refreshed-access-token', expires_in = 3600) {
  mockFetch.mockResolvedValueOnce({
    ok:   true,
    json: vi.fn().mockResolvedValue({ access_token, expires_in }),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('oauthService', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset in-memory currentToken (module singleton) between tests
    await oauthService.clearAuth()
    vi.clearAllMocks()  // clear calls recorded by clearAuth itself
  })

  // ── isAuthenticated ───────────────────────────────────────────────────────

  describe('isAuthenticated', () => {
    it('returns false when no refresh token is stored', async () => {
      mockPreferences.get.mockResolvedValueOnce({ value: null })
      expect(await oauthService.isAuthenticated()).toBe(false)
    })

    it('returns true when a refresh token is stored', async () => {
      mockPreferences.get.mockResolvedValueOnce({ value: 'stored-refresh-token' })
      expect(await oauthService.isAuthenticated()).toBe(true)
    })

    it('returns false when Preferences.get throws', async () => {
      mockPreferences.get.mockRejectedValueOnce(new Error('storage error'))
      expect(await oauthService.isAuthenticated()).toBe(false)
    })
  })

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('exchanges serverAuthCode and stores the refresh token', async () => {
      mockOfflineLoginResponse('test-server-auth-code')
      mockTokenExchangeResponse()

      await oauthService.login()

      expect(mockPreferences.set).toHaveBeenCalledWith({
        key:   'oauthRefreshToken',
        value: 'test-refresh-token',
      })
    })

    it('calls the Google token endpoint with correct params', async () => {
      mockOfflineLoginResponse('my-server-code')
      mockTokenExchangeResponse()

      await oauthService.login()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('throws when token exchange returns non-ok status', async () => {
      mockOfflineLoginResponse('bad-code')
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400 })

      await expect(oauthService.login()).rejects.toThrow('OAuth token exchange failed')
    })

    it('throws when plugin returns online response instead of offline', async () => {
      mockSocialLogin.login.mockResolvedValueOnce({
        result: { responseType: 'online', accessToken: { token: 'tok' }, idToken: null, profile: {} },
      })

      await expect(oauthService.login()).rejects.toThrow('Expected offline OAuth response')
    })
  })

  // ── getToken ─────────────────────────────────────────────────────────────

  describe('getToken', () => {
    it('throws when not authenticated (no refresh token stored)', async () => {
      mockPreferences.get.mockResolvedValueOnce({ value: null })

      await expect(oauthService.getToken()).rejects.toThrow('Not authenticated')
    })

    it('refreshes token using stored refresh token when no in-memory token', async () => {
      mockPreferences.get.mockResolvedValueOnce({ value: 'stored-refresh-token' })
      mockRefreshResponse('new-access-token')

      const token = await oauthService.getToken()

      expect(token).toBe('new-access-token')
    })

    it('throws when refresh request returns non-ok status', async () => {
      mockPreferences.get.mockResolvedValueOnce({ value: 'stored-refresh-token' })
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })

      await expect(oauthService.getToken()).rejects.toThrow('Token refresh failed')
    })
  })

  // ── clearAuth ─────────────────────────────────────────────────────────────

  describe('clearAuth', () => {
    it('removes the refresh token from Preferences', async () => {
      await oauthService.clearAuth()

      expect(mockPreferences.remove).toHaveBeenCalledWith({ key: 'oauthRefreshToken' })
    })
  })
})
