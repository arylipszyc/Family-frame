import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { PhotoSlide } from '../../components/PhotoSlide'
import type { Photo } from '../../types/Photo'

const photos3: Photo[] = [
  { id: '0', localPath: '/photos/a.jpg', syncedAt: '2026-05-19T00:00:00Z' },
  { id: '1', localPath: '/photos/b.jpg', syncedAt: '2026-05-19T00:00:01Z' },
  { id: '2', localPath: '/photos/c.jpg', syncedAt: '2026-05-19T00:00:02Z' },
]

const FADE = 1250
const HOLD = 300
const TOTAL = FADE + HOLD + FADE  // 2800

function getImgs(container: HTMLElement): HTMLImageElement[] {
  return Array.from(container.querySelectorAll('img'))
}

function getTop(container: HTMLElement): HTMLImageElement {
  const imgs = getImgs(container)
  // Top layer has zIndex 2; ensure two imgs and pick the one with higher zIndex.
  expect(imgs.length).toBeGreaterThanOrEqual(2)
  return imgs.find(i => i.style.zIndex === '2') as HTMLImageElement
}

function getBottom(container: HTMLElement): HTMLImageElement {
  const imgs = getImgs(container)
  expect(imgs.length).toBeGreaterThanOrEqual(2)
  return imgs.find(i => i.style.zIndex === '1') as HTMLImageElement
}

beforeEach(() => {
  cleanup()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PhotoSlide — máquina de transición 3-fase', () => {
  it('(a) durante fade-out, el bottom layer permanece en opacity 0 (AC de Sally)', () => {
    const interval = 10_000
    const { container } = render(<PhotoSlide photos={photos3} intervalMs={interval} />)

    // Idle inicial: top opacity 1, bottom 0
    expect(getTop(container).style.opacity).toBe('1')
    expect(getBottom(container).style.opacity).toBe('0')

    // Dispara advance via useInterval
    act(() => {
      vi.advanceTimersByTime(interval)
    })

    // Phase = fade-out → top transicionando hacia 0, bottom debe seguir en 0
    expect(getBottom(container).style.opacity).toBe('0')
    expect(getTop(container).style.opacity).toBe('0')
    expect(getTop(container).style.transition).toContain('opacity')

    // Avanzar a justo antes del hold — bottom debe seguir en 0
    act(() => {
      vi.advanceTimersByTime(FADE - 1)
    })
    expect(getBottom(container).style.opacity).toBe('0')
  })

  it('(b) durante hold, ambas capas están en opacity 0 (solo gradiente visible)', () => {
    const interval = 10_000
    const { container } = render(<PhotoSlide photos={photos3} intervalMs={interval} />)

    act(() => {
      vi.advanceTimersByTime(interval)        // → fade-out starts
      vi.advanceTimersByTime(FADE + 150)       // mid-hold (~150ms into hold)
    })

    expect(getTop(container).style.opacity).toBe('0')
    expect(getBottom(container).style.opacity).toBe('0')
  })

  it('(c) swap atómico al final del fade-in: top muestra incoming src y opacities resetean', () => {
    const interval = 10_000
    const { container } = render(<PhotoSlide photos={photos3} intervalMs={interval} />)

    // Capturar src inicial del top (debería ser photos[0])
    const initialTopSrc = getTop(container).getAttribute('src')
    expect(initialTopSrc).toContain('a.jpg')

    // Disparar transición completa
    act(() => {
      vi.advanceTimersByTime(interval + TOTAL)
    })

    // Post-swap, en la misma observación: top.src=photos[1], top.opacity=1, bottom.opacity=0
    const topAfter = getTop(container)
    const bottomAfter = getBottom(container)
    expect(topAfter.getAttribute('src')).toContain('b.jpg')
    expect(topAfter.style.opacity).toBe('1')
    expect(bottomAfter.style.opacity).toBe('0')
    expect(bottomAfter.getAttribute('src')).toContain('c.jpg')
  })

  it('(d) con photos.length < 2, advance() es no-op (no programa timers)', () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
    const interval = 10_000
    const { container } = render(<PhotoSlide photos={[photos3[0]]} intervalMs={interval} />)

    const baselineCalls = setTimeoutSpy.mock.calls.length

    act(() => {
      vi.advanceTimersByTime(interval * 3)
    })

    // useInterval se programa con delay=null cuando photos.length < 2 → no fire.
    // El estado debe ser idle puro: top opacity 1, sin transición.
    expect(getTop(container).style.opacity).toBe('1')
    expect(getTop(container).getAttribute('src')).toContain('a.jpg')

    // Si advance hubiera disparado, habría programado 3 timeouts de transición.
    expect(setTimeoutSpy.mock.calls.length).toBe(baselineCalls)

    setTimeoutSpy.mockRestore()
  })

  it('(e) cleanup en unmount mid-transición: sin warnings ni setState post-unmount', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const interval = 10_000
    const { unmount } = render(<PhotoSlide photos={photos3} intervalMs={interval} />)

    // Disparar advance, llegar a mid fade-out
    act(() => {
      vi.advanceTimersByTime(interval)
      vi.advanceTimersByTime(500)
    })

    // Unmount mid-transición
    unmount()

    // Avanzar los timers restantes — los setTimeouts pendientes NO deberían disparar setState
    act(() => {
      vi.advanceTimersByTime(TOTAL * 2)
    })

    // No debe haber warnings de React sobre "state update on unmounted component"
    const reactWarnings = errorSpy.mock.calls.filter(call =>
      String(call[0]).includes('unmounted') || String(call[0]).includes('memory leak')
    )
    expect(reactWarnings.length).toBe(0)

    errorSpy.mockRestore()
  })

  it('(f) advance() reentrante durante transición es no-op (guard síncrono)', () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
    // intervalMs corto → useInterval dispara advance múltiples veces durante la transición
    const interval = 200
    render(<PhotoSlide photos={photos3} intervalMs={interval} />)

    const callsAtStart = setTimeoutSpy.mock.calls.length

    // Llegamos a t=interval → primer advance (3 setTimeouts programados)
    act(() => {
      vi.advanceTimersByTime(interval)
    })
    const callsAfterFirstAdvance = setTimeoutSpy.mock.calls.length
    expect(callsAfterFirstAdvance - callsAtStart).toBe(3)

    // Llegamos a t=2*interval, 3*interval... durante la transición. Si el guard funciona,
    // ningún advance adicional programa nuevos setTimeouts (los useInterval fires son no-op).
    act(() => {
      // avanzar hasta justo antes del swap (t = interval + TOTAL - 1)
      vi.advanceTimersByTime(TOTAL - 1)
    })

    // Cada ms que pasa, hay potencial useInterval fire. El guard debe haber rechazado todos.
    // El conteo de setTimeouts debe seguir igual (los 3 originales del primer advance).
    expect(setTimeoutSpy.mock.calls.length).toBe(callsAfterFirstAdvance)

    setTimeoutSpy.mockRestore()
  })
})
