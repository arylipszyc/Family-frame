import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'

const { mockNetwork, mockDriveAuth, mockDriveSync } = vi.hoisted(() => {
  const callbacks: Array<(status: { connected: boolean }) => void> = []

  return {
    mockNetwork: {
      getStatus:   vi.fn().mockResolvedValue({ connected: false }),
      addListener: vi.fn().mockImplementation(
        (_event: string, cb: (s: { connected: boolean }) => void) => {
          callbacks.push(cb)
          return Promise.resolve({ remove: vi.fn() })
        }
      ),
      _trigger:    (status: { connected: boolean }) => callbacks.forEach((cb) => cb(status)),
      _clear:      () => { callbacks.length = 0 },
    },
    mockDriveAuth: {
      isAuthenticated: vi.fn().mockResolvedValue(false),
    },
    mockDriveSync: {
      sync: vi.fn().mockResolvedValue(undefined),
    },
  }
})

vi.mock('@capacitor/network',                () => ({ Network: mockNetwork }))
vi.mock('../../services/driveAuthService',   () => ({ driveAuthService: mockDriveAuth }))
vi.mock('../../services/driveSyncService',   () => ({ driveSyncService: mockDriveSync }))

import { useSync }      from '../../hooks/useSync'
import { useSyncStore } from '../../stores/syncStore'

beforeEach(() => {
  vi.clearAllMocks()
  mockNetwork._clear()
  useSyncStore.setState({ syncStatus: 'idle', lastSync: null, isOnline: false })
  mockNetwork.getStatus.mockResolvedValue({ connected: false })
  mockDriveAuth.isAuthenticated.mockResolvedValue(false)
})

afterEach(() => {
  cleanup()
})

describe('useSync', () => {
  it('reflects initial online status on mount (connected)', async () => {
    mockNetwork.getStatus.mockResolvedValue({ connected: true })

    renderHook(() => useSync())

    await waitFor(() => {
      expect(useSyncStore.getState().isOnline).toBe(true)
    })
  })

  it('reflects initial offline status on mount', async () => {
    mockNetwork.getStatus.mockResolvedValue({ connected: false })

    renderHook(() => useSync())

    await waitFor(() => {
      expect(mockNetwork.addListener).toHaveBeenCalled()
    })

    expect(useSyncStore.getState().isOnline).toBe(false)
  })

  it('registers the network listener on mount', async () => {
    renderHook(() => useSync())

    await waitFor(() => {
      expect(mockNetwork.addListener).toHaveBeenCalledWith(
        'networkStatusChange',
        expect.any(Function)
      )
    })
  })

  it('triggers sync when WiFi reconnects and SA is configured', async () => {
    mockDriveAuth.isAuthenticated.mockResolvedValue(true)

    renderHook(() => useSync())

    await waitFor(() => expect(mockNetwork.addListener).toHaveBeenCalled())

    mockNetwork._trigger({ connected: true })

    await waitFor(() => expect(mockDriveSync.sync).toHaveBeenCalledOnce())
    expect(useSyncStore.getState().isOnline).toBe(true)
  })

  it('does not sync on WiFi reconnect when SA is not configured', async () => {
    mockDriveAuth.isAuthenticated.mockResolvedValue(false)

    renderHook(() => useSync())

    await waitFor(() => expect(mockNetwork.addListener).toHaveBeenCalled())

    mockNetwork._trigger({ connected: true })

    await waitFor(() => expect(useSyncStore.getState().isOnline).toBe(true))

    expect(mockDriveSync.sync).not.toHaveBeenCalled()
  })

  it('does not start a second sync when one is already in progress', async () => {
    mockDriveAuth.isAuthenticated.mockResolvedValue(true)
    useSyncStore.setState({ syncStatus: 'syncing', lastSync: null, isOnline: false })

    renderHook(() => useSync())

    await waitFor(() => expect(mockNetwork.addListener).toHaveBeenCalled())

    mockNetwork._trigger({ connected: true })

    await waitFor(() => expect(useSyncStore.getState().isOnline).toBe(true))

    expect(mockDriveSync.sync).not.toHaveBeenCalled()
  })

  it('triggers initial sync on boot if already connected and SA configured', async () => {
    mockNetwork.getStatus.mockResolvedValue({ connected: true })
    mockDriveAuth.isAuthenticated.mockResolvedValue(true)

    renderHook(() => useSync())

    await waitFor(() => expect(mockDriveSync.sync).toHaveBeenCalledOnce())
  })

  it('does not sync on boot when already connected but SA not configured', async () => {
    mockNetwork.getStatus.mockResolvedValue({ connected: true })
    mockDriveAuth.isAuthenticated.mockResolvedValue(false)

    renderHook(() => useSync())

    await waitFor(() => expect(mockNetwork.addListener).toHaveBeenCalled())

    await new Promise((r) => setTimeout(r, 30))

    expect(mockDriveSync.sync).not.toHaveBeenCalled()
  })
})
