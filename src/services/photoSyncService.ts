import { Preferences } from '@capacitor/preferences'
import { oauthService } from './oauthService'
import { photoCacheService } from './photoCacheService'
import { useContentStore } from '../stores/contentStore'
import { useSyncStore } from '../stores/syncStore'

const ALBUM_ID_KEY = 'googlePhotosAlbumId'
const PHOTOS_API   = 'https://photoslibrary.googleapis.com/v1'

interface MediaItem {
  id:       string
  baseUrl:  string
  mimeType: string
}

interface AlbumSearchResponse {
  mediaItems?:   MediaItem[]
  nextPageToken?: string
}

async function fetchNewMediaItems(token: string, albumId: string): Promise<MediaItem[]> {
  const newItems: MediaItem[] = []
  let pageToken: string | undefined

  do {
    const response = await fetch(`${PHOTOS_API}/mediaItems:search`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        albumId,
        pageSize: 100,
        ...(pageToken ? { pageToken } : {}),
      }),
    })

    if (!response.ok) throw new Error(`Google Photos API error: ${response.status}`)

    const data = await response.json() as AlbumSearchResponse

    for (const item of data.mediaItems ?? []) {
      if (!photoCacheService.hasPhoto(item.id)) {
        newItems.push(item)
      }
    }

    pageToken = data.nextPageToken
  } while (pageToken)

  return newItems
}

export const photoSyncService = {

  async sync(): Promise<number> {
    const syncStore    = useSyncStore.getState()
    const contentStore = useContentStore.getState()

    syncStore.setSyncStatus('syncing')

    try {
      const token = await oauthService.getToken()

      const { value: albumId } = await Preferences.get({ key: ALBUM_ID_KEY })
      if (!albumId) {
        // Album not configured — nothing to sync yet
        syncStore.setSyncStatus('idle')
        return 0
      }

      const newItems = await fetchNewMediaItems(token, albumId)

      if (newItems.length > 0) {
        // Download and cache each new photo
        for (const item of newItems) {
          const blob = await fetch(`${item.baseUrl}=d`).then((r) => r.blob())
          await photoCacheService.savePhoto(item.id, blob)
        }

        // Refresh contentStore with the updated cache
        const allPhotos = await photoCacheService.getAllCachedPhotos()
        contentStore.setPhotos(allPhotos)
      }

      syncStore.setLastSync(new Date().toISOString())
      syncStore.setSyncStatus('idle')
      return newItems.length
    } catch (err) {
      console.error('[photoSyncService] sync failed:', err)
      syncStore.setSyncStatus('error')
      throw err
    }
  },
}
