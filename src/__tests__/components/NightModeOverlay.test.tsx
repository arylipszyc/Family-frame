import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { NightModeOverlay } from '../../components/NightModeOverlay'
import { useSettingsStore } from '../../stores/settingsStore'

function setClock(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  vi.setSystemTime(new Date(2026, 6, 6, h, m, 0, 0))
}

describe('NightModeOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useSettingsStore.setState({ nightModeStart: '22:00', nightModeEnd: '07:00' })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('está activo de noche con la config default (23:00, 22:00–07:00)', () => {
    setClock('23:00')
    const { getByTestId } = render(<NightModeOverlay />)
    expect(getByTestId('night-mode-overlay').style.opacity).toBe('1')
  })

  it('está inactivo de día con la config default (12:00)', () => {
    setClock('12:00')
    const { getByTestId } = render(<NightModeOverlay />)
    expect(getByTestId('night-mode-overlay').style.opacity).toBe('0')
  })

  it('respeta el horario configurado en settings (20:30–06:00 → activo a las 21:00)', () => {
    useSettingsStore.setState({ nightModeStart: '20:30', nightModeEnd: '06:00' })
    setClock('21:00')
    const { getByTestId } = render(<NightModeOverlay />)
    expect(getByTestId('night-mode-overlay').style.opacity).toBe('1')
  })

  it('reacciona cuando el admin cambia el horario en runtime', () => {
    setClock('21:00')  // fuera del rango default 22:00–07:00
    const { getByTestId } = render(<NightModeOverlay />)
    expect(getByTestId('night-mode-overlay').style.opacity).toBe('0')

    act(() => {
      useSettingsStore.setState({ nightModeStart: '20:00' })
    })
    expect(getByTestId('night-mode-overlay').style.opacity).toBe('1')
  })

  it('se activa solo al cruzar el umbral de inicio', () => {
    setClock('21:59')
    const { getByTestId } = render(<NightModeOverlay />)
    expect(getByTestId('night-mode-overlay').style.opacity).toBe('0')

    act(() => {
      setClock('22:00')
      vi.advanceTimersByTime(60_000)  // dispara el timer del umbral (1 min)
    })
    expect(getByTestId('night-mode-overlay').style.opacity).toBe('1')
  })

  it('maneja rangos que no cruzan medianoche (01:00–05:00)', () => {
    useSettingsStore.setState({ nightModeStart: '01:00', nightModeEnd: '05:00' })
    setClock('03:00')
    const { getByTestId } = render(<NightModeOverlay />)
    expect(getByTestId('night-mode-overlay').style.opacity).toBe('1')
  })

  it('cae al default 22:00–07:00 si el valor persistido está malformado', () => {
    useSettingsStore.setState({ nightModeStart: 'garbage', nightModeEnd: '' })
    setClock('23:00')
    const { getByTestId } = render(<NightModeOverlay />)
    expect(getByTestId('night-mode-overlay').style.opacity).toBe('1')
  })
})
