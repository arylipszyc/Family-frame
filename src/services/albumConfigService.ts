import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'

const CONFIG_FILE   = 'album-config.json'
const ALBUM_ID_KEY  = 'googlePhotosAlbumId'

interface AlbumConfigFile {
  albumId: string
}

function isValidConfig(parsed: unknown): parsed is AlbumConfigFile {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'albumId' in parsed &&
    typeof (parsed as { albumId: unknown }).albumId === 'string' &&
    (parsed as { albumId: string }).albumId.trim().length > 0
  )
}

export const albumConfigService = {
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
      // File not present — expected case, no-op
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.info('[albumConfigService] album-config.json malformed, ignoring')
      return
    }

    if (!isValidConfig(parsed)) {
      console.info('[albumConfigService] album-config.json missing/invalid albumId, ignoring')
      return
    }

    await Preferences.set({ key: ALBUM_ID_KEY, value: parsed.albumId })

    try {
      await Filesystem.deleteFile({ path: CONFIG_FILE, directory: Directory.External })
    } catch (err) {
      console.warn('[albumConfigService] failed to delete album-config.json after bootstrap:', err)
    }
  },
}
