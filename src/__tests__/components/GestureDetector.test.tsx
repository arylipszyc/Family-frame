import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { GestureDetector } from '../../components/GestureDetector'

beforeEach(() => {
  cleanup()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function tapN(element: Element, n: number) {
  for (let i = 0; i < n; i++) {
    fireEvent.pointerDown(element)
  }
}

describe('GestureDetector', () => {
  it('llama onGestureDetected con exactamente 5 taps rápidos', () => {
    const handler = vi.fn()
    const { container } = render(<GestureDetector onGestureDetected={handler} />)
    const zone = container.firstChild as Element

    tapN(zone, 5)

    expect(handler).toHaveBeenCalledOnce()
  })

  it('no llama onGestureDetected con solo 4 taps', () => {
    const handler = vi.fn()
    const { container } = render(<GestureDetector onGestureDetected={handler} />)
    const zone = container.firstChild as Element

    tapN(zone, 4)

    expect(handler).not.toHaveBeenCalled()
  })

  it('no llama onGestureDetected cuando los 5 taps exceden la ventana de 3 segundos', () => {
    const handler = vi.fn()
    const { container } = render(<GestureDetector onGestureDetected={handler} />)
    const zone = container.firstChild as Element

    // 4 taps rápidos
    tapN(zone, 4)

    // Avanzar 3.1 segundos — los taps anteriores quedan fuera de la ventana
    vi.advanceTimersByTime(3100)

    // 1 tap más — solo hay 1 tap dentro de la ventana
    fireEvent.pointerDown(zone)

    expect(handler).not.toHaveBeenCalled()
  })

  it('resetea el acumulador después de disparar el gesto', () => {
    const handler = vi.fn()
    const { container } = render(<GestureDetector onGestureDetected={handler} />)
    const zone = container.firstChild as Element

    // Primer gesto
    tapN(zone, 5)
    expect(handler).toHaveBeenCalledOnce()

    // Segundo gesto — necesita otros 5 taps
    tapN(zone, 4)
    expect(handler).toHaveBeenCalledOnce() // sigue en 1

    fireEvent.pointerDown(zone)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('el elemento es aria-hidden y no tiene contenido visible', () => {
    const { container } = render(<GestureDetector onGestureDetected={vi.fn()} />)
    const zone = container.firstChild as Element

    expect(zone.getAttribute('aria-hidden')).toBe('true')
    expect(zone.textContent).toBe('')
  })
})
