import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { PinEntry } from '../../components/PinEntry'

beforeEach(() => {
  cleanup()
})

describe('PinEntry — renderizado', () => {
  it('muestra el backdrop cuando visible=true', () => {
    const { getByTestId } = render(
      <PinEntry visible={true} shaking={false} resetKey={0} onPinComplete={vi.fn()} />
    )
    const backdrop = getByTestId('pin-entry-backdrop')
    expect(backdrop).toBeDefined()
    expect((backdrop as HTMLElement).style.opacity).toBe('1')
  })

  it('oculta el backdrop (opacity=0) cuando visible=false', () => {
    const { getByTestId } = render(
      <PinEntry visible={false} shaking={false} resetKey={0} onPinComplete={vi.fn()} />
    )
    const backdrop = getByTestId('pin-entry-backdrop')
    expect((backdrop as HTMLElement).style.opacity).toBe('0')
  })

  it('renderiza 10 teclas numéricas (0–9)', () => {
    const { getByTestId } = render(
      <PinEntry visible={true} shaking={false} resetKey={0} onPinComplete={vi.fn()} />
    )
    for (let i = 0; i <= 9; i++) {
      expect(getByTestId(`key-${i}`)).toBeDefined()
    }
  })

  it('renderiza la tecla de borrar (←)', () => {
    const { getByTestId } = render(
      <PinEntry visible={true} shaking={false} resetKey={0} onPinComplete={vi.fn()} />
    )
    expect(getByTestId('key-←')).toBeDefined()
  })
})

describe('PinEntry — ingreso de dígitos', () => {
  it('llama onPinComplete con los 4 dígitos ingresados', () => {
    const handler = vi.fn()
    const { getByTestId } = render(
      <PinEntry visible={true} shaking={false} resetKey={0} onPinComplete={handler} />
    )

    fireEvent.click(getByTestId('key-1'))
    fireEvent.click(getByTestId('key-2'))
    fireEvent.click(getByTestId('key-3'))
    fireEvent.click(getByTestId('key-4'))

    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith('1234')
  })

  it('no llama onPinComplete con menos de 4 dígitos', () => {
    const handler = vi.fn()
    const { getByTestId } = render(
      <PinEntry visible={true} shaking={false} resetKey={0} onPinComplete={handler} />
    )

    fireEvent.click(getByTestId('key-5'))
    fireEvent.click(getByTestId('key-6'))
    fireEvent.click(getByTestId('key-7'))

    expect(handler).not.toHaveBeenCalled()
  })

  it('borrar elimina el último dígito ingresado', () => {
    const handler = vi.fn()
    const { getByTestId } = render(
      <PinEntry visible={true} shaking={false} resetKey={0} onPinComplete={handler} />
    )

    fireEvent.click(getByTestId('key-1'))
    fireEvent.click(getByTestId('key-2'))
    fireEvent.click(getByTestId('key-←'))  // borra el 2
    fireEvent.click(getByTestId('key-3'))
    fireEvent.click(getByTestId('key-4'))

    // Solo 3 dígitos acumulados aún (1, 3, 4) — necesita uno más
    expect(handler).not.toHaveBeenCalled()

    fireEvent.click(getByTestId('key-5'))
    expect(handler).toHaveBeenCalledWith('1345')
  })

  it('no acepta más de 4 dígitos', () => {
    const handler = vi.fn()
    const { getByTestId } = render(
      <PinEntry visible={true} shaking={false} resetKey={0} onPinComplete={handler} />
    )

    // 5 clicks
    for (const k of ['1','2','3','4','5']) {
      fireEvent.click(getByTestId(`key-${k}`))
    }

    // onPinComplete se llama solo al 4to dígito
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith('1234')
  })
})

describe('PinEntry — resetKey', () => {
  it('limpia los dígitos cuando resetKey cambia', async () => {
    const handler = vi.fn()
    const { getByTestId, rerender } = render(
      <PinEntry visible={true} shaking={false} resetKey={0} onPinComplete={handler} />
    )

    fireEvent.click(getByTestId('key-1'))
    fireEvent.click(getByTestId('key-2'))

    // Cambiar resetKey — simula intento fallido
    rerender(<PinEntry visible={true} shaking={false} resetKey={1} onPinComplete={handler} />)

    // Ahora ingresar 4 dígitos desde cero
    fireEvent.click(getByTestId('key-3'))
    fireEvent.click(getByTestId('key-4'))
    fireEvent.click(getByTestId('key-5'))
    fireEvent.click(getByTestId('key-6'))

    expect(handler).toHaveBeenCalledWith('3456')
  })
})

describe('PinEntry — prop shaking', () => {
  it('aplica clase pin-shake en el contenedor de puntos cuando shaking=true', () => {
    const { getByTestId } = render(
      <PinEntry visible={true} shaking={true} resetKey={0} onPinComplete={vi.fn()} />
    )
    const dots = getByTestId('pin-dots')
    expect(dots.className).toContain('pin-shake')
  })

  it('no aplica clase pin-shake cuando shaking=false', () => {
    const { getByTestId } = render(
      <PinEntry visible={true} shaking={false} resetKey={0} onPinComplete={vi.fn()} />
    )
    const dots = getByTestId('pin-dots')
    expect(dots.className).not.toContain('pin-shake')
  })
})
