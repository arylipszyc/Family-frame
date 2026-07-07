import { useState, useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

// Fallbacks si el valor persistido está malformado (evita NaN → timer loop)
const DEFAULT_START_MIN = 22 * 60
const DEFAULT_END_MIN   = 7 * 60

function toMinutes(hhmm: string, fallback: number): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm)
  if (!m) return fallback
  return Number(m[1]) * 60 + Number(m[2])
}

function isNightTime(date: Date, startMin: number, endMin: number): boolean {
  const cur = date.getHours() * 60 + date.getMinutes()
  if (startMin === endMin) return false
  return startMin > endMin
    ? cur >= startMin || cur < endMin   // rango que cruza medianoche (ej. 22:00–07:00)
    : cur >= startMin && cur < endMin   // rango dentro del mismo día
}

function msUntilNextThreshold(now: Date, startMin: number, endMin: number): number {
  const targetMin = isNightTime(now, startMin, endMin) ? endMin : startMin
  const target = new Date(now)
  target.setHours(Math.floor(targetMin / 60), targetMin % 60, 0, 0)
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1)

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
  const nightModeStart = useSettingsStore((s) => s.nightModeStart)
  const nightModeEnd   = useSettingsStore((s) => s.nightModeEnd)

  const [isNight, setIsNight] = useState(() => isNightTime(
    new Date(),
    toMinutes(nightModeStart, DEFAULT_START_MIN),
    toMinutes(nightModeEnd, DEFAULT_END_MIN),
  ))
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const startMin = toMinutes(nightModeStart, DEFAULT_START_MIN)
    const endMin   = toMinutes(nightModeEnd, DEFAULT_END_MIN)

    // Estado + brillo inmediatos al montar o al cambiar la config desde el admin
    const night = isNightTime(new Date(), startMin, endMin)
    setIsNight(night)
    void trySetBrightness(night ? 0.15 : 1.0)

    // Habilitar transición CSS después del primer render (AC3: sin animación al montar)
    const enableTimer = setTimeout(() => setAnimate(true), 100)

    let timeout: ReturnType<typeof setTimeout>

    function scheduleNext() {
      timeout = setTimeout(() => {
        const n = isNightTime(new Date(), startMin, endMin)
        setIsNight(n)
        void trySetBrightness(n ? 0.15 : 1.0)
        scheduleNext()
      }, msUntilNextThreshold(new Date(), startMin, endMin))
    }

    scheduleNext()

    return () => {
      clearTimeout(enableTimer)
      clearTimeout(timeout)
    }
  }, [nightModeStart, nightModeEnd])

  return (
    <div
      data-testid="night-mode-overlay"
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
