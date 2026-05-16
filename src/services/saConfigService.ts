import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'

const CONFIG_FILE = 'sa-config.json'
const SA_JSON_KEY = 'googleServiceAccountJson'

interface ServiceAccountJson {
  type:            string
  private_key:     string
  client_email:    string
  private_key_id:  string
}

function isValidSAJson(parsed: unknown): parsed is ServiceAccountJson {
  if (typeof parsed !== 'object' || parsed === null) return false
  const o = parsed as Record<string, unknown>
  return (
    o.type === 'service_account' &&
    typeof o.private_key    === 'string' && o.private_key.trim().length    > 0 &&
    typeof o.client_email   === 'string' && o.client_email.trim().length   > 0 &&
    typeof o.private_key_id === 'string' && o.private_key_id.trim().length > 0
  )
}

export const saConfigService = {
  async bootstrapFromFile(): Promise<void> {
    let raw: string
    try {
      const result = await Filesystem.readFile({
        path:      CONFIG_FILE,
        directory: Directory.External,
        encoding:  Encoding.UTF8,
      })
      raw = typeof result.data === 'string' ? result.data : await result.data.text()
    } catch {
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.info('[saConfigService] sa-config.json malformed, ignoring')
      return
    }

    if (!isValidSAJson(parsed)) {
      console.info('[saConfigService] sa-config.json missing required SA fields, ignoring')
      return
    }

    await Preferences.set({ key: SA_JSON_KEY, value: raw })

    try {
      await Filesystem.deleteFile({ path: CONFIG_FILE, directory: Directory.External })
    } catch (err) {
      console.warn('[saConfigService] failed to delete sa-config.json after bootstrap:', err)
    }
  },
}
