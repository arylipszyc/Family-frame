import { useEffect } from 'react'
import { Network } from '@capacitor/network'
import { driveAuthService } from '../services/driveAuthService'
import { driveSyncService } from '../services/driveSyncService'
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
      const status = await Network.getStatus()
      setIsOnline(status.connected)

      const handle = await Network.addListener('networkStatusChange', async (networkStatus) => {
        setIsOnline(networkStatus.connected)

        if (!networkStatus.connected) return

        const { syncStatus } = useSyncStore.getState()
        if (syncStatus === 'syncing') return

        const isAuth = await driveAuthService.isAuthenticated()
        if (isAuth) driveSyncService.sync()   // fire-and-forget
      })

      removeListener = () => handle.remove()

      if (status.connected) {
        const isAuth = await driveAuthService.isAuthenticated()
        if (isAuth) driveSyncService.sync()   // fire-and-forget
      }
    }

    startNetworkSync()

    return () => { removeListener?.() }
  }, [setIsOnline])
}
