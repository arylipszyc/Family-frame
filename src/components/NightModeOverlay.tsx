import { useState, useEffect } from 'react'

const NIGHT_START_HOUR = 22
const NIGHT_END_HOUR = 7

function isNightTime(date: Date): boolean {
  const h = date.getHours()
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR
}

function msUntilNextThreshold(now: Date): number {
  const h = now.getHours()
  const target = new Date(now)

  if (h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR) {
    // De noche → próximo umbral: 07:00
    if (h >= NIGHT_START_HOUR) {
      target.setDate(target.getDate() + 1)
    }
    target.setHours(NIGHT_END_HOUR, 0, 0, 0)
  } else {
    // De día → próximo umbral: 22:00
    target.setHours(NIGHT_START_HOUR, 0, 0, 0)
  }

  // Floor en 1ms: evita delay negativo si el reloj fue ajustado (NTP, DST, suspensión)
  return Math.max(1, target.getTime() - now.getTime())
}

async function trySetBrightness(value: number): Promise<void> {
  try {
    // Accede al registro de plugins de Capacitor sin static import
    // No-op en browser/dev o si el plugin @capacitor-community/screen-brightness no está instalado
    const plugins = (window as Window & {
      Capacitor?: { Plugins?: Record<string, { setBrightness?: (o: { brightness: number }) => Promise<void> }> }
    }).Capacitor?.Plugins
    const plugin = plugins?.['ScreenBrightness']
    if (plugin?.setBrightness) {
      await plugin.setBrightness({ brightness: value })
    }
  } catch {
    // Error nativo — silencioso
  }
}

export function NightModeOverlay() {
  const [isNight, setIsNight] = useState(() => isNightTime(new Date()))
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    // Brillo inicial sin animación
    void trySetBrightness(isNightTime(new Date()) ? 0.15 : 1.0)

    // Habilitar transición CSS después del primer render (AC3: sin animación al montar)
    const enableTimer = setTimeout(() => setAnimate(true), 100)

    let timeout: ReturnType<typeof setTimeout>

    function scheduleNext() {
      timeout = setTimeout(() => {
        const night = isNightTime(new Date())
        setIsNight(night)
        void trySetBrightness(night ? 0.15 : 1.0)
        scheduleNext()
      }, msUntilNextThreshold(new Date()))
    }

    scheduleNext()

    return () => {
      clearTimeout(enableTimer)
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: 'rgba(20, 10, 5, 0.3)',
        opacity: isNight ? 1 : 0,
        transition: animate ? 'opacity 60s linear' : 'none',
        pointerEvents: 'none',
        zIndex: 10,
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    />
  )
}
