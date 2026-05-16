import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'

const CONFIG_FILE   = 'drive-folder-config.json'
const FOLDER_ID_KEY = 'googleDriveFolderId'

interface FolderConfigFile {
  folderId: string
}

function isValidConfig(parsed: unknown): parsed is FolderConfigFile {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'folderId' in parsed &&
    typeof (parsed as { folderId: unknown }).folderId === 'string' &&
    (parsed as { folderId: string }).folderId.trim().length > 0
  )
}

export const folderConfigService = {
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
      console.info('[folderConfigService] drive-folder-config.json malformed, ignoring')
      return
    }

    if (!isValidConfig(parsed)) {
      console.info('[folderConfigService] drive-folder-config.json missing/invalid folderId, ignoring')
      return
    }

    await Preferences.set({ key: FOLDER_ID_KEY, value: parsed.folderId })

    try {
      await Filesystem.deleteFile({ path: CONFIG_FILE, directory: Directory.External })
    } catch (err) {
      console.warn('[folderConfigService] failed to delete drive-folder-config.json after bootstrap:', err)
    }
  },
}
