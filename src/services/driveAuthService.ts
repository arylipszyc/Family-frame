import { Preferences } from '@capacitor/preferences'
import { SignJWT, importPKCS8 } from 'jose'

const SA_JSON_KEY      = 'googleServiceAccountJson'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DRIVE_SCOPE      = 'https://www.googleapis.com/auth/drive.readonly'
const TOKEN_TTL_MS     = 50 * 60 * 1000   // 50min — Google tokens last 60min, buffer 10min

interface ServiceAccount {
  client_email: string
  private_key:  string
}

interface CachedToken {
  accessToken: string
  expiresAt:   number   // unix ms
}

let cachedToken: CachedToken | null = null

async function loadServiceAccount(): Promise<ServiceAccount> {
  const { value } = await Preferences.get({ key: SA_JSON_KEY })
  if (!value) throw new Error('Service Account not configured')
  const parsed = JSON.parse(value) as ServiceAccount
  return parsed
}

async function mintAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const privateKey = await importPKCS8(sa.private_key, 'RS256')

  const jwt = await new SignJWT({ scope: DRIVE_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience(GOOGLE_TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey)

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })

  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    throw new Error(`Google token endpoint failed: ${response.status} ${errBody}`)
  }

  const data = await response.json() as { access_token: string }
  return data.access_token
}

export const driveAuthService = {

  async isAuthenticated(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: SA_JSON_KEY })
      return !!value
    } catch {
      return false
    }
  },

  async getAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
      return cachedToken.accessToken
    }

    const sa = await loadServiceAccount()
    const accessToken = await mintAccessToken(sa)

    cachedToken = {
      accessToken,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    }
    return accessToken
  },

  async clearAuth(): Promise<void> {
    await Preferences.remove({ key: SA_JSON_KEY })
    cachedToken = null
  },

  /** Test-only: reset in-memory cache between tests. */
  _resetCache(): void {
    cachedToken = null
  },
}
