import { describe, it, expect, vi, beforeEach } from 'vitest'

const store: Record<string, string> = {}

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn(({ key, value }: { key: string; value: string }) => {
      store[key] = value
      return Promise.resolve()
    }),
    get: vi.fn(({ key }: { key: string }) =>
      Promise.resolve({ value: store[key] ?? null })
    ),
  },
}))

import { systemSettingsService } from '../../services/systemSettingsService'

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k])
  vi.clearAllMocks()
})

describe('systemSettingsService — photoRotationInterval', () => {
  it('guarda y carga el intervalo en ms', async () => {
    await systemSettingsService.savePhotoRotationInterval(60_000)
    const result = await systemSettingsService.loadPhotoRotationInterval()
    expect(result).toBe(60_000)
  })

  it('retorna null si no hay valor guardado', async () => {
    const result = await systemSettingsService.loadPhotoRotationInterval()
    expect(result).toBeNull()
  })
})

describe('systemSettingsService — nightModeStart', () => {
  it('guarda y carga nightModeStart', async () => {
    await systemSettingsService.saveNightModeStart('21:00')
    const result = await systemSettingsService.loadNightModeStart()
    expect(result).toBe('21:00')
  })

  it('retorna null si no hay valor guardado', async () => {
    const result = await systemSettingsService.loadNightModeStart()
    expect(result).toBeNull()
  })
})

describe('systemSettingsService — nightModeEnd', () => {
  it('guarda y carga nightModeEnd', async () => {
    await systemSettingsService.saveNightModeEnd('08:00')
    const result = await systemSettingsService.loadNightModeEnd()
    expect(result).toBe('08:00')
  })

  it('retorna null si no hay valor guardado', async () => {
    const result = await systemSettingsService.loadNightModeEnd()
    expect(result).toBeNull()
  })
})

describe('systemSettingsService — errores', () => {
  it('loadPhotoRotationInterval retorna null ante fallo de Preferences', async () => {
    const { Preferences } = await import('@capacitor/preferences')
    vi.mocked(Preferences.get).mockRejectedValueOnce(new Error('storage error'))
    const result = await systemSettingsService.loadPhotoRotationInterval()
    expect(result).toBeNull()
  })

  it('loadNightModeStart retorna null ante fallo de Preferences', async () => {
    const { Preferences } = await import('@capacitor/preferences')
    vi.mocked(Preferences.get).mockRejectedValueOnce(new Error('storage error'))
    const result = await systemSettingsService.loadNightModeStart()
    expect(result).toBeNull()
  })
})

describe('systemSettingsService — clamp (P5)', () => {
  it('clampea valores menores a 10 000 ms al mínimo', async () => {
    store['photoRotationInterval'] = '0'
    const result = await systemSettingsService.loadPhotoRotationInterval()
    expect(result).toBe(10_000)
  })

  it('clampea valores mayores a 86 400 000 ms (1 día) al máximo', async () => {
    store['photoRotationInterval'] = '99999999999'
    const result = await systemSettingsService.loadPhotoRotationInterval()
    expect(result).toBe(86_400_000)
  })

  it('preserva valores grandes dentro del rango admin (ej. 1 hora)', async () => {
    store['photoRotationInterval'] = '3600000'
    const result = await systemSettingsService.loadPhotoRotationInterval()
    expect(result).toBe(3_600_000)
  })

  it('retorna el valor sin modificar si está dentro del rango', async () => {
    store['photoRotationInterval'] = '60000'
    const result = await systemSettingsService.loadPhotoRotationInterval()
    expect(result).toBe(60_000)
  })
})
