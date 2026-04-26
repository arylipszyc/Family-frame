import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'

function formatDate(date: Date): string {
  const raw = date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function DateDisplay() {
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    function scheduleNext() {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      timeout = setTimeout(() => {
        setToday(new Date())
        scheduleNext()
      }, midnight.getTime() - now.getTime())
    }

    scheduleNext()
    return () => clearTimeout(timeout)
  }, [])

  return <p style={dateStyle}>{formatDate(today)}</p>
}

const dateStyle: CSSProperties = {
  position: 'absolute',
  top: '2.5vh',
  right: '2.5vw',
  fontFamily: "'Inter', sans-serif",
  fontSize: 'clamp(22px, 2.5vw, 32px)',
  fontWeight: 300,
  lineHeight: 1.4,
  color: '#F5F0E8',
  opacity: 0.7,
  textShadow: '0 1px 8px rgba(0,0,0,0.6)',
  textAlign: 'right',
  margin: 0,
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
}
