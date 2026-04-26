import { useEffect } from 'react'
import { Network } from '@capacitor/network'
import { oauthService } from '../services/oauthService'
import { photoSyncService } from '../services/photoSyncService'
import { useSyncStore } from '../stores/syncStore'

/**
 * Registers the network listener once and triggers photo sync automatically
 * when WiFi becomes available. Called from App.tsx — runs for the app's lifetime.
 */
export function useSync(): void {
  const setIsOnline = useSyncStore((state) => state.setIsOnline)

  useEffect(() => {
    let removeListener: (() => void) | null = null

    async function startNetworkSync(): Promise<void> {
      // Snapshot current connectivity
      const status = await Network.getStatus()
      setIsOnline(status.connected)

      // Register listener once — no duplicates across restarts
      const handle = await Network.addListener('networkStatusChange', async (networkStatus) => {
        setIsOnline(networkStatus.connected)

        if (!networkStatus.connected) return

        // Guard against concurrent syncs
        const { syncStatus } = useSyncStore.getState()
        if (syncStatus === 'syncing') return

        const isAuth = await oauthService.isAuthenticated()
        if (isAuth) photoSyncService.sync()   // fire-and-forget
      })

      removeListener = () => handle.remove()

      // Immediate sync on boot if already connected
      if (status.connected) {
        const isAuth = await oauthService.isAuthenticated()
        if (isAuth) photoSyncService.sync()   // fire-and-forget
      }
    }

    startNetworkSync()

    return () => { removeListener?.() }
  }, [setIsOnline])
}
