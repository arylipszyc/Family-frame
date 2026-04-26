import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockPreferences } = vi.hoisted(() => {
  const store: Record<string, string> = {}

  return {
    mockPreferences: {
      get:    vi.fn().mockImplementation(({ key }: { key: string }) =>
        Promise.resolve({ value: store[key] ?? null })
      ),
      set:    vi.fn().mockImplementation(({ key, value }: { key: string; value: string }) => {
        store[key] = value
        return Promise.resolve()
      }),
      _store: store,
      _clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
    },
  }
})

vi.mock('@capacitor/preferences', () => ({ Preferences: mockPreferences }))

// ── Subject ───────────────────────────────────────────────────────────────────

import { pinService } from '../../services/pinService'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockPreferences._clear()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('pinService.initPin', () => {
  it('hashea el PIN por defecto (1234) cuando no existe hash almacenado', async () => {
    await pinService.initPin()

    expect(mockPreferences.set).toHaveBeenCalledOnce()
    const storedHash = mockPreferences._store['adminPin']
    expect(storedHash).toBeDefined()
    const matches = await bcrypt.compare('1234', storedHash)
    expect(matches).toBe(true)
  })

  it('no sobreescribe el hash si ya existe uno almacenado', async () => {
    const existingHash = await bcrypt.hash('9999', 10)
    mockPreferences._store['adminPin'] = existingHash

    await pinService.initPin()

    expect(mockPreferences.set).not.toHaveBeenCalled()
    expect(mockPreferences._store['adminPin']).toBe(existingHash)
  })
})

describe('pinService.verifyPin', () => {
  it('retorna true cuando el PIN ingresado coincide con el hash almacenado', async () => {
    const hash = await bcrypt.hash('1234', 10)
    mockPreferences._store['adminPin'] = hash

    const result = await pinService.verifyPin('1234')
    expect(result).toBe(true)
  })

  it('retorna false cuando el PIN ingresado no coincide', async () => {
    const hash = await bcrypt.hash('1234', 10)
    mockPreferences._store['adminPin'] = hash

    const result = await pinService.verifyPin('9999')
    expect(result).toBe(false)
  })

  it('retorna false cuando no hay hash almacenado', async () => {
    const result = await pinService.verifyPin('1234')
    expect(result).toBe(false)
  })
})

describe('pinService.setPin', () => {
  it('almacena un nuevo hash que verifica correctamente con el nuevo PIN', async () => {
    await pinService.setPin('5678')

    const storedHash = mockPreferences._store['adminPin']
    expect(storedHash).toBeDefined()
    const matches = await bcrypt.compare('5678', storedHash)
    expect(matches).toBe(true)
  })

  it('el nuevo hash no coincide con un PIN anterior', async () => {
    const oldHash = await bcrypt.hash('1234', 10)
    mockPreferences._store['adminPin'] = oldHash

    await pinService.setPin('5678')

    const storedHash = mockPreferences._store['adminPin']
    const matchesOld = await bcrypt.compare('1234', storedHash)
    expect(matchesOld).toBe(false)
  })
})
