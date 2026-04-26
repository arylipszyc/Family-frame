import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockNetwork, mockOAuth, mockPhotoSync } = vi.hoisted(() => {
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
    mockOAuth: {
      isAuthenticated: vi.fn().mockResolvedValue(false),
    },
    mockPhotoSync: {
      sync: vi.fn().mockResolvedValue(undefined),
    },
  }
})

vi.mock('@capacitor/network',              () => ({ Network: mockNetwork }))
vi.mock('../../services/oauthService',     () => ({ oauthService:     mockOAuth }))
vi.mock('../../services/photoSyncService', () => ({ photoSyncService: mockPhotoSync }))

// ── Subject ───────────────────────────────────────────────────────────────────

import { useSync }      from '../../hooks/useSync'
import { useSyncStore } from '../../stores/syncStore'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockNetwork._clear()
  useSyncStore.setState({ syncStatus: 'idle', lastSync: null, isOnline: false })
  mockNetwork.getStatus.mockResolvedValue({ connected: false })
  mockOAuth.isAuthenticated.mockResolvedValue(false)
})

afterEach(() => {
  cleanup()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

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

  it('triggers sync when WiFi reconnects and user is authenticated', async () => {
    mockOAuth.isAuthenticated.mockResolvedValue(true)

    renderHook(() => useSync())

    // Wait for listener to be registered
    await waitFor(() => expect(mockNetwork.addListener).toHaveBeenCalled())

    // Simulate WiFi reconnect
    mockNetwork._trigger({ connected: true })

    await waitFor(() => expect(mockPhotoSync.sync).toHaveBeenCalledOnce())
    expect(useSyncStore.getState().isOnline).toBe(true)
  })

  it('does not sync on WiFi reconnect when not authenticated', async () => {
    mockOAuth.isAuthenticated.mockResolvedValue(false)

    renderHook(() => useSync())

    await waitFor(() => expect(mockNetwork.addListener).toHaveBeenCalled())

    mockNetwork._trigger({ connected: true })

    // Give async callbacks time to settle
    await waitFor(() => expect(useSyncStore.getState().isOnline).toBe(true))

    expect(mockPhotoSync.sync).not.toHaveBeenCalled()
  })

  it('does not start a second sync when one is already in progress', async () => {
    mockOAuth.isAuthenticated.mockResolvedValue(true)
    useSyncStore.setState({ syncStatus: 'syncing', lastSync: null, isOnline: false })

    renderHook(() => useSync())

    await waitFor(() => expect(mockNetwork.addListener).toHaveBeenCalled())

    mockNetwork._trigger({ connected: true })

    await waitFor(() => expect(useSyncStore.getState().isOnline).toBe(true))

    expect(mockPhotoSync.sync).not.toHaveBeenCalled()
  })

  it('triggers initial sync on boot if already connected and authenticated', async () => {
    mockNetwork.getStatus.mockResolvedValue({ connected: true })
    mockOAuth.isAuthenticated.mockResolvedValue(true)

    renderHook(() => useSync())

    await waitFor(() => expect(mockPhotoSync.sync).toHaveBeenCalledOnce())
  })

  it('does not sync on boot when already connected but not authenticated', async () => {
    mockNetwork.getStatus.mockResolvedValue({ connected: true })
    mockOAuth.isAuthenticated.mockResolvedValue(false)

    renderHook(() => useSync())

    await waitFor(() => expect(mockNetwork.addListener).toHaveBeenCalled())

    // Extra tick for async auth check to settle
    await new Promise((r) => setTimeout(r, 30))

    expect(mockPhotoSync.sync).not.toHaveBeenCalled()
  })
})
