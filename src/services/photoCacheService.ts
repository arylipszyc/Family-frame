import { Filesystem, Directory } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import type { Photo } from '../types/Photo'

const PHOTOS_DIR       = 'photos'
const CACHE_INDEX_KEY  = 'photoCacheIndex'

// In-memory index — rebuilt on initialize(), never stale after startup
const cacheIndex = new Map<string, Photo>()

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result === 'string') resolve(result.split(',')[1])  // strip data:...;base64, prefix
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function persistIndex(): Promise<void> {
  await Preferences.set({
    key:   CACHE_INDEX_KEY,
    value: JSON.stringify(Array.from(cacheIndex.values())),
  })
}

export const photoCacheService = {

  /** Load index from Preferences into memory. Call once on app startup. */
  async initialize(): Promise<void> {
    cacheIndex.clear()
    try {
      const { value } = await Preferences.get({ key: CACHE_INDEX_KEY })
      if (!value) return
      const entries = JSON.parse(value) as Photo[]
      for (const entry of entries) {
        cacheIndex.set(entry.id, entry)
      }
    } catch {
      // Corrupted index — start fresh with empty map
    }
  },

  /** Save a photo blob to filesystem and update the cache index. */
  async savePhoto(id: string, blob: Blob): Promise<void> {
    const base64Data = await blobToBase64(blob)
    const path = `${PHOTOS_DIR}/${id}.jpg`

    await Filesystem.writeFile({
      path,
      data:      base64Data,
      directory: Directory.Data,
      recursive: true,
    })

    cacheIndex.set(id, {
      id,
      localPath: path,
      syncedAt:  new Date().toISOString(),
    })
    await persistIndex()
  },

  /**
   * Return all photos whose file actually exists on disk.
   * localPath is replaced with the platform URI for use as img src.
   * Las llamadas al bridge (stat/getUri) van en paralelo — en serie eran
   * 2×N roundtrips en el critical path del boot.
   */
  async getAllCachedPhotos(): Promise<Photo[]> {
    const resolved = await Promise.all(
      Array.from(cacheIndex.values()).map(async (photo) => {
        try {
          await Filesystem.stat({ path: photo.localPath, directory: Directory.Data })
          const { uri } = await Filesystem.getUri({ path: photo.localPath, directory: Directory.Data })
          return { ...photo, localPath: uri }
        } catch {
          return null  // File missing — skip without error
        }
      })
    )
    return resolved.filter((p): p is Photo => p !== null)
  },

  /** Check membership in the in-memory index only — no filesystem access. */
  hasPhoto(id: string): boolean {
    return cacheIndex.has(id)
  },

  /** IDs actualmente cacheados — para reconciliar contra la lista de Drive. */
  getCachedIds(): string[] {
    return Array.from(cacheIndex.keys())
  },

  /** Delete the photo file from disk and remove it from the index. */
  async deletePhoto(id: string): Promise<void> {
    const photo = cacheIndex.get(id)
    if (!photo) return
    try {
      await Filesystem.deleteFile({ path: photo.localPath, directory: Directory.Data })
    } catch {
      // Archivo ya inexistente en disco — igual removemos la entrada del índice
    }
    cacheIndex.delete(id)
    await persistIndex()
  },
}
