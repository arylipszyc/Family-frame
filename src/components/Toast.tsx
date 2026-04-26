import type { CSSProperties } from 'react'

interface ToastProps {
  message: string
  color: string
  visible: boolean
}

const containerStyle: CSSProperties = {
  position: 'fixed',
  bottom: '40px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 300,
  pointerEvents: 'none',
  transition: 'opacity 0.2s ease',
}

export function Toast({ message, color, visible }: ToastProps) {
  return (
    <div
      style={{ ...containerStyle, opacity: visible ? 1 : 0 }}
      data-testid="toast"
    >
      <div
        style={{
          backgroundColor: color,
          color: '#F5F0E8',
          fontFamily: "'Inter', sans-serif",
          fontSize: '16px',
          fontWeight: 500,
          padding: '12px 24px',
          borderRadius: '8px',
          whiteSpace: 'nowrap',
        }}
      >
        {message}
      </div>
    </div>
  )
}
