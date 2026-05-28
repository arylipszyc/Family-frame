import { useEffect } from 'react'
import { Network } from '@capacitor/network'
import { driveAuthService } from '../services/driveAuthService'
import { driveSyncService } from '../services/driveSyncService'
import { useSyncStore } from '../stores/syncStore'

const DAILY_SYNC_MS = 24 * 60 * 60 * 1000

async function trySync(): Promise<void> {
  const { syncStatus } = useSyncStore.getState()
  if (syncStatus === 'syncing') return
  const isAuth = await driveAuthService.isAuthenticated()
  if (isAuth) driveSyncService.sync()   // fire-and-forget
}

/**
 * Registers the network listener once and triggers photo sync automatically
 * when WiFi becomes available. Called from App.tsx — runs for the app's lifetime.
 */
export function useSync(): void {
  const setIsOnline = useSyncStore((state) => state.setIsOnline)

  useEffect(() => {
    let removeListener: (() => void) | null = null
    let dailyTimer: ReturnType<typeof setInterval> | null = null

    async function startNetworkSync(): Promise<void> {
      const status = await Network.getStatus()
      setIsOnline(status.connected)

      const handle = await Network.addListener('networkStatusChange', async (networkStatus) => {
        setIsOnline(networkStatus.connected)
        if (networkStatus.connected) await trySync()
      })

      removeListener = () => handle.remove()

      if (status.connected) await trySync()

      // Resync 1×/día — detecta fotos borradas/agregadas en Drive aunque la red no haya cambiado
      dailyTimer = setInterval(() => {
        if (useSyncStore.getState().isOnline) void trySync()
      }, DAILY_SYNC_MS)
    }

    startNetworkSync()

    return () => {
      removeListener?.()
      if (dailyTimer) clearInterval(dailyTimer)
    }
  }, [setIsOnline])
}
