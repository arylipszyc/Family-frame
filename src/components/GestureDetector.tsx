import { useRef } from 'react'
import type { CSSProperties } from 'react'

interface GestureDetectorProps {
  onGestureDetected: () => void
}

const TAP_REQUIRED = 5
const TAP_WINDOW_MS = 3000

// Zona táctil invisible, bottom-left, 120×120px
const zoneStyle: CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  width: '120px',
  height: '120px',
  background: 'transparent',
  zIndex: 100,
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'none',
}

export function GestureDetector({ onGestureDetected }: GestureDetectorProps) {
  const tapsRef = useRef<number[]>([])

  function handleTap() {
    const now = Date.now()
    // Descartar taps fuera de la ventana de 3 segundos
    tapsRef.current = tapsRef.current.filter((t) => now - t < TAP_WINDOW_MS)
    tapsRef.current.push(now)

    if (tapsRef.current.length >= TAP_REQUIRED) {
      tapsRef.current = []
      onGestureDetected()
    }
  }

  return (
    <div
      style={zoneStyle}
      onPointerDown={handleTap}
      aria-hidden="true"
    />
  )
}
