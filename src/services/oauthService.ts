import { SocialLogin } from '@capgo/capacitor-social-login'
import { Preferences } from '@capacitor/preferences'

const OAUTH_REFRESH_TOKEN_KEY = 'oauthRefreshToken'
const OAUTH_EMAIL_KEY         = 'oauthEmail'
const GOOGLE_TOKEN_URL        = 'https://oauth2.googleapis.com/token'
const PHOTOS_SCOPE            = 'https://www.googleapis.com/auth/photoslibrary.readonly'

interface TokenData {
  accessToken: string
  expiresAt:   number   // unix timestamp ms
}

let currentToken: TokenData | null = null
let pluginInitialized = false

async function initializePlugin(): Promise<void> {
  if (pluginInitialized) return
  await SocialLogin.initialize({
    google: {
      webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string,
      mode: 'offline',
    },
  })
  pluginInitialized = true
}

export const oauthService = {

  async isAuthenticated(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: OAUTH_REFRESH_TOKEN_KEY })
      return !!value
    } catch {
      return false
    }
  },

  /**
   * Trigger Google OAuth consent. Exchanges serverAuthCode for refresh + access tokens.
   * Stores the refresh token in Preferences.
   * Throws on any failure — caller should display appropriate UI feedback.
   */
  async login(): Promise<void> {
    await initializePlugin()

    const result = await SocialLogin.login({
      provider: 'google',
      options: { scopes: [PHOTOS_SCOPE] },
    })

    const response = result.result
    if (response.responseType !== 'offline') {
      throw new Error('Expected offline OAuth response with serverAuthCode')
    }

    const { serverAuthCode } = response

    // Exchange serverAuthCode for refresh + access tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code:          serverAuthCode,
        client_id:     import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string,
        redirect_uri:  '',
        grant_type:    'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`OAuth token exchange failed: ${tokenResponse.status}`)
    }

    const data = await tokenResponse.json() as {
      access_token:  string
      refresh_token: string
      expires_in:    number
    }

    await Preferences.set({ key: OAUTH_REFRESH_TOKEN_KEY, value: data.refresh_token })

    // Persist email if available (non-critical — display only; auth succeeded regardless)
    try {
      const profile = (result.result as { profile?: { email?: string } }).profile
      const email = profile?.email ?? null
      if (email) {
        await Preferences.set({ key: OAUTH_EMAIL_KEY, value: email })
      }
    } catch {
      // Email is display-only — auth succeeded even if this fails
    }

    currentToken = {
      accessToken: data.access_token,
      expiresAt:   Date.now() + (data.expires_in - 60) * 1000,   // 60s safety buffer
    }
  },

  /**
   * Return a valid access token. Refreshes automatically if expired.
   * Throws if not authenticated or if refresh fails — callers must handle silently.
   */
  async getToken(): Promise<string> {
    // Use in-memory token if still valid
    if (currentToken && Date.now() < currentToken.expiresAt) {
      return currentToken.accessToken
    }

    const { value: refreshToken } = await Preferences.get({ key: OAUTH_REFRESH_TOKEN_KEY })
    if (!refreshToken) throw new Error('Not authenticated — no refresh token stored')

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        refresh_token: refreshToken,
        client_id:     import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string,
        grant_type:    'refresh_token',
      }),
    })

    if (!response.ok) throw new Error(`Token refresh failed: ${response.status}`)

    const data = await response.json() as { access_token: string; expires_in: number }

    currentToken = {
      accessToken: data.access_token,
      expiresAt:   Date.now() + (data.expires_in - 60) * 1000,
    }

    return currentToken.accessToken
  },

  /** Return the stored email, or null if not available. */
  async getEmail(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: OAUTH_EMAIL_KEY })
      return value ?? null
    } catch {
      return null
    }
  },

  /** Remove stored credentials. Used from AdminScreen. */
  async clearAuth(): Promise<void> {
    await Preferences.remove({ key: OAUTH_REFRESH_TOKEN_KEY })
    await Preferences.remove({ key: OAUTH_EMAIL_KEY })
    currentToken = null
  },
}
