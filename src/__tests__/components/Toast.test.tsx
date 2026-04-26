import { describe, it, expect, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Toast } from '../../components/Toast'

beforeEach(() => cleanup())

describe('Toast', () => {
  it('muestra el mensaje cuando visible=true', () => {
    const { getByTestId } = render(
      <Toast message="Guardado ✓" color="#C8956C" visible={true} />
    )
    expect(getByTestId('toast').style.opacity).toBe('1')
  })

  it('oculta el toast cuando visible=false', () => {
    const { getByTestId } = render(
      <Toast message="Error" color="#8B6F5E" visible={false} />
    )
    expect(getByTestId('toast').style.opacity).toBe('0')
  })

  it('aplica el color de fondo al contenido interno', () => {
    const { getByText } = render(
      <Toast message="Hola" color="#C8956C" visible={true} />
    )
    const inner = getByText('Hola') as HTMLElement
    expect(inner.style.backgroundColor).toBe('rgb(200, 149, 108)')
  })
})
