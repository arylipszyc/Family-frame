import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'

interface PinEntryProps {
  visible: boolean
  shaking: boolean
  resetKey: number
  onPinComplete: (pin: string) => void
}

const MAX_DIGITS = 4

// Inyectar keyframe de shake una sola vez
let shakeStyleInjected = false
function injectShakeStyle() {
  if (shakeStyleInjected) return
  shakeStyleInjected = true
  const style = document.createElement('style')
  style.textContent = `
    @keyframes pin-shake {
      0%, 100% { transform: translateX(0); }
      20%       { transform: translateX(-8px); }
      40%       { transform: translateX(8px); }
      60%       { transform: translateX(-5px); }
      80%       { transform: translateX(5px); }
    }
    .pin-shake {
      animation: pin-shake 0.4s ease;
    }
  `
  document.head.appendChild(style)
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200,
  transition: 'opacity 0.5s ease',
}

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '32px',
}

const dotsContainerStyle: CSSProperties = {
  display: 'flex',
  gap: '20px',
  alignItems: 'center',
  justifyContent: 'center',
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 64px)',
  gap: '12px',
}

// ── Componente ────────────────────────────────────────────────────────────────

export function PinEntry({ visible, shaking, resetKey, onPinComplete }: PinEntryProps) {
  const [digits, setDigits] = useState<string[]>([])

  useEffect(() => {
    injectShakeStyle()
  }, [])

  // Limpiar dígitos al cerrar el modal
  useEffect(() => {
    if (!visible) setDigits([])
  }, [visible])

  // Limpiar dígitos tras cada intento fallido (resetKey se incrementa en KioskScreen)
  useEffect(() => {
    setDigits([])
  }, [resetKey])

  function handleDigit(d: string) {
    if (digits.length >= MAX_DIGITS) return
    const next = [...digits, d]
    setDigits(next)
    if (next.length === MAX_DIGITS) {
      onPinComplete(next.join(''))
    }
  }

  function handleDelete() {
    setDigits((prev) => prev.slice(0, -1))
  }

  // Teclado: [1,2,3], [4,5,6], [7,8,9], [←, 0, (vacío)]
  const keys: Array<{ label: string; action: () => void; disabled?: boolean }> = [
    { label: '1', action: () => handleDigit('1') },
    { label: '2', action: () => handleDigit('2') },
    { label: '3', action: () => handleDigit('3') },
    { label: '4', action: () => handleDigit('4') },
    { label: '5', action: () => handleDigit('5') },
    { label: '6', action: () => handleDigit('6') },
    { label: '7', action: () => handleDigit('7') },
    { label: '8', action: () => handleDigit('8') },
    { label: '9', action: () => handleDigit('9') },
    { label: '←', action: handleDelete },
    { label: '0', action: () => handleDigit('0') },
    { label: '', action: () => {}, disabled: true },
  ]

  return (
    <div
      style={{ ...backdropStyle, opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
      data-testid="pin-entry-backdrop"
    >
      <div style={panelStyle}>
        {/* Puntos de PIN */}
        <div
          className={shaking ? 'pin-shake' : ''}
          style={dotsContainerStyle}
          data-testid="pin-dots"
        >
          {Array.from({ length: MAX_DIGITS }).map((_, i) => (
            <span
              key={i}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: i < digits.length ? '#F5F0E8' : 'transparent',
                border: '2px solid #F5F0E8',
                display: 'inline-block',
              }}
            />
          ))}
        </div>

        {/* Teclado numérico */}
        <div style={gridStyle}>
          {keys.map((key, idx) => (
            <button
              key={idx}
              onClick={key.action}
              disabled={key.disabled}
              data-testid={key.label ? `key-${key.label}` : undefined}
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: key.disabled ? 'transparent' : 'rgba(245,240,232,0.15)',
                border: key.disabled ? 'none' : '1px solid rgba(245,240,232,0.3)',
                borderRadius: '8px',
                color: '#F5F0E8',
                fontFamily: "'Inter', sans-serif",
                fontSize: '22px',
                fontWeight: 300,
                cursor: key.disabled ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                touchAction: 'manipulation',
                visibility: key.disabled ? 'hidden' : 'visible',
              }}
            >
              {key.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
