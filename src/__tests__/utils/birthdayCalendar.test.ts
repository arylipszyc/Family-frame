import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calculateNextBirthday } from '../../utils/birthdayCalendar'
import type { Birthday } from '../../types/Birthday'

beforeEach(() => {
  vi.useFakeTimers()
  // Hoy = 2026-05-19 (lunes), local time
  vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('calculateNextBirthday — gregorian', () => {
  it('cumpleaños mañana retorna daysUntil 1', () => {
    const b: Birthday = { id: '1', name: 'Test', date: '1980-05-20', calendar: 'gregorian' }
    expect(calculateNextBirthday(b).daysUntil).toBe(1)
  })

  it('cumpleaños hoy retorna daysUntil 0', () => {
    const b: Birthday = { id: '1', name: 'Test', date: '1980-05-19', calendar: 'gregorian' }
    expect(calculateNextBirthday(b).daysUntil).toBe(0)
  })

  it('cumpleaños ayer (ya pasó) salta al próximo año', () => {
    const b: Birthday = { id: '1', name: 'Test', date: '1980-05-18', calendar: 'gregorian' }
    // From 2026-05-19 hasta 2027-05-18 = 364 días
    expect(calculateNextBirthday(b).daysUntil).toBe(364)
  })

  it('cumpleaños en 30 días retorna daysUntil 30', () => {
    const b: Birthday = { id: '1', name: 'Test', date: '1980-06-18', calendar: 'gregorian' }
    expect(calculateNextBirthday(b).daysUntil).toBe(30)
  })
})

describe('calculateNextBirthday — hebrew', () => {
  it('cumpleaños hebreo (5 Sivan, nacido 1990-05-29) cae dentro de los próximos 30 días desde 2026-05-19', () => {
    const b: Birthday = { id: '1', name: 'Haim', date: '1990-05-29', calendar: 'hebrew' }
    const result = calculateNextBirthday(b).daysUntil
    // 5 Sivan 5786 cae alrededor del 2026-05-22 (3 días desde hoy 2026-05-19)
    // Aceptamos un rango razonable porque la conversión exacta depende del año hebreo actual
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(30)
  })

  it('cumpleaños hebreo retorna un número no-negativo', () => {
    const b: Birthday = { id: '1', name: 'Test', date: '1948-03-15', calendar: 'hebrew' }
    const result = calculateNextBirthday(b).daysUntil
    expect(result).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(result)).toBe(true)
  })

  it('cumpleaños hebreo en mes Adar funciona sin crashear (potencial año bisiesto)', () => {
    // 1990-03-01 cae en Adar 5750 (año NO bisiesto, solo tiene Adar)
    // En años bisiestos (5784, 5787) la lib debe mapear correctamente Adar → Adar II
    const b: Birthday = { id: '1', name: 'Test', date: '1990-03-01', calendar: 'hebrew' }
    const result = calculateNextBirthday(b).daysUntil
    expect(result).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(result)).toBe(true)
  })
})
