import { describe, it, expect, vi, beforeEach } from 'vitest'

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

import { adminContentService } from '../../services/adminContentService'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockPreferences._clear()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('adminContentService — yiddishPhrases', () => {
  it('guarda y recupera frases Yiddish correctamente', async () => {
    const phrases = [
      { yiddish: 'שלום', transliteration: 'Shalom', spanish: 'Paz' },
      { yiddish: 'לעבן', transliteration: 'Lebn', spanish: 'Vida' },
    ]
    await adminContentService.saveYiddishPhrases(phrases)
    const loaded = await adminContentService.loadYiddishPhrases()
    expect(loaded).toEqual(phrases)
  })

  it('retorna null cuando no hay frases almacenadas', async () => {
    const loaded = await adminContentService.loadYiddishPhrases()
    expect(loaded).toBeNull()
  })

  it('retorna null cuando el valor almacenado no es JSON válido', async () => {
    mockPreferences._store['yiddishPhrases'] = 'not-json'
    const loaded = await adminContentService.loadYiddishPhrases()
    expect(loaded).toBeNull()
  })
})

describe('adminContentService — birthdays', () => {
  it('guarda y recupera cumpleaños correctamente', async () => {
    const birthdays = [
      { id: 'abc-1', name: 'Abel', date: '1948-03-15' },
      { id: 'abc-2', name: 'Liliana', date: '1950-07-22' },
    ]
    await adminContentService.saveBirthdays(birthdays)
    const loaded = await adminContentService.loadBirthdays()
    expect(loaded).toEqual(birthdays)
  })

  it('retorna null cuando no hay cumpleaños almacenados', async () => {
    const loaded = await adminContentService.loadBirthdays()
    expect(loaded).toBeNull()
  })

  it('retorna null cuando el valor almacenado no es JSON válido', async () => {
    mockPreferences._store['birthdays'] = '{invalid}'
    const loaded = await adminContentService.loadBirthdays()
    expect(loaded).toBeNull()
  })
})
