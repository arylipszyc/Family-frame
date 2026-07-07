import { Preferences } from '@capacitor/preferences'
import { driveAuthService } from './driveAuthService'
import { photoCacheService } from './photoCacheService'
import { useContentStore } from '../stores/contentStore'
import { useSyncStore } from '../stores/syncStore'

const FOLDER_ID_KEY  = 'googleDriveFolderId'
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
// Capacitor bridge serializes file content as base64 JSON to native; ~127MB binary OOMs the JVM (256MB heap).
const MAX_FILE_BYTES = 20 * 1024 * 1024
// Pool acotado: acelera el sync inicial ~4x manteniendo a lo sumo 4 blobs
// (max 80MB) en memoria a la vez.
const CONCURRENT_DOWNLOADS = 4

interface DriveFile {
  id:           string
  name:         string
  mimeType:     string
  modifiedTime: string
  size?:        string
}

interface DriveListResponse {
  files?:        DriveFile[]
  nextPageToken?: string
}

async function listFolderImages(token: string, folderId: string): Promise<DriveFile[]> {
  const all: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q:        `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
      fields:   'files(id,name,mimeType,modifiedTime,size),nextPageToken',
      pageSize: '100',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const response = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) throw new Error(`Drive list error: ${response.status}`)

    const data = await response.json() as DriveListResponse
    if (data.files) all.push(...data.files)
    pageToken = data.nextPageToken
  } while (pageToken)

  return all
}

async function downloadFile(token: string, fileId: string): Promise<Blob> {
  const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`Drive download error for ${fileId}: ${response.status}`)
  return response.blob()
}

export const driveSyncService = {

  async sync(): Promise<number> {
    const syncStore    = useSyncStore.getState()
    const contentStore = useContentStore.getState()

    syncStore.setSyncStatus('syncing')

    try {
      const { value: folderId } = await Preferences.get({ key: FOLDER_ID_KEY })
      if (!folderId) {
        syncStore.setSyncStatus('idle')
        return 0
      }

      const token = await driveAuthService.getAccessToken()

      const allFiles = await listFolderImages(token, folderId)
      const newFiles = allFiles
        .filter((f) => !photoCacheService.hasPhoto(f.id))
        .filter((f) => {
          const bytes = f.size ? parseInt(f.size, 10) : 0
          if (bytes > MAX_FILE_BYTES) {
            console.warn(`[driveSyncService] skipping ${f.name} (${bytes} bytes > ${MAX_FILE_BYTES}); Capacitor bridge would OOM`)
            return false
          }
          return true
        })

      // Reconciliar: fotos que ya no están en la carpeta de Drive se eliminan
      // del caché local — sin esto el disco crece sin límite y las fotos
      // sacadas de la carpeta siguen rotando para siempre.
      const driveIds = new Set(allFiles.map((f) => f.id))
      const removedIds = photoCacheService.getCachedIds().filter((id) => !driveIds.has(id))
      for (const id of removedIds) {
        await photoCacheService.deletePhoto(id)
      }

      if (newFiles.length > 0) {
        let nextIdx = 0
        let failed = false
        const downloadWorker = async (): Promise<void> => {
          while (!failed && nextIdx < newFiles.length) {
            const file = newFiles[nextIdx++]
            try {
              const blob = await downloadFile(token, file.id)
              await photoCacheService.savePhoto(file.id, blob)
            } catch (err) {
              failed = true  // frena los demás workers en su próxima iteración
              throw err
            }
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(CONCURRENT_DOWNLOADS, newFiles.length) }, downloadWorker)
        )
      }

      if (newFiles.length > 0 || removedIds.length > 0) {
        const allPhotos = await photoCacheService.getAllCachedPhotos()
        contentStore.setPhotos(allPhotos)
      }

      syncStore.setLastSync(new Date().toISOString())
      syncStore.setSyncStatus('idle')
      return newFiles.length
    } catch (err) {
      console.error('[driveSyncService] sync failed:', err)
      syncStore.setSyncStatus('error')
      throw err
    }
  },
}
