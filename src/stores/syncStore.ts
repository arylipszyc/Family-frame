import { create } from 'zustand'

type SyncStatus = 'idle' | 'syncing' | 'error'

interface SyncState {
  isOnline: boolean
  lastSync: string | null
  syncStatus: SyncStatus
  setIsOnline: (isOnline: boolean) => void
  setLastSync: (lastSync: string | null) => void
  setSyncStatus: (status: SyncStatus) => void
}

export const useSyncStore = create<SyncState>()((set) => ({
  isOnline: false,
  lastSync: null,
  syncStatus: 'idle',
  setIsOnline: (isOnline) => set({ isOnline }),
  setLastSync: (lastSync) => set({ lastSync }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
}))
