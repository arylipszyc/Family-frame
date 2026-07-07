import { Filesystem, Directory } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import type { WelcomeConfig } from '../stores/contentStore'
import { blobToBase64 } from '../utils/blobToBase64'

const WELCOME_CONFIG_KEY = 'welcomeConfig'
const WELCOME_PHOTO_PATH  = 'welcome/photo.jpg'

export const storageService = {
  async saveWelcomeConfig(config: WelcomeConfig): Promise<void> {
    await Preferences.set({
      key:   WELCOME_CONFIG_KEY,
      value: JSON.stringify(config),
    })
  },

  async loadWelcomeConfig(): Promise<WelcomeConfig | null> {
    try {
      const { value } = await Preferences.get({ key: WELCOME_CONFIG_KEY })
      if (!value) return null
      return JSON.parse(value) as WelcomeConfig
    } catch {
      return null
    }
  },

  /**
   * Persist the welcome photo blob to disk and return its path.
   * Solo el path va a Preferences (vía saveWelcomeConfig) — el contenido vive
   * en Filesystem, evitando el OOM del bridge que limitaba la foto a 1 MB (GAP-6).
   */
  async saveWelcomePhoto(blob: Blob): Promise<string> {
    const base64Data = await blobToBase64(blob)
    await Filesystem.writeFile({
      path:      WELCOME_PHOTO_PATH,
      data:      base64Data,
      directory: Directory.Data,
      recursive: true,
    })
    return WELCOME_PHOTO_PATH
  },

  /**
   * Resolve a disk-relative welcome photo path to a display-ready src
   * (getUri + convertFileSrc, igual que PhotoSlide.toDisplayUrl).
   * Returns null si el archivo no existe en disco.
   */
  async getWelcomePhotoUri(path: string): Promise<string | null> {
    try {
      await Filesystem.stat({ path, directory: Directory.Data })
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Data })
      const cap = (window as Window & { Capacitor?: { convertFileSrc: (p: string) => string } }).Capacitor
      return cap?.convertFileSrc ? cap.convertFileSrc(uri) : uri
    } catch {
      return null
    }
  },
}
