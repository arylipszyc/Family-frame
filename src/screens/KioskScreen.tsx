import { useState, useRef, useCallback, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useContentStore } from '../stores/contentStore'
import { useDisplayStore } from '../stores/displayStore'
import { useAdminStore } from '../stores/adminStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useInterval } from '../hooks/useInterval'
import { PhotoSlide } from '../components/PhotoSlide'
import { YiddishPhrase } from '../components/YiddishPhrase'
import { DateDisplay } from '../components/DateDisplay'
import { BirthdayCountdown } from '../components/BirthdayCountdown'
import { NightModeOverlay } from '../components/NightModeOverlay'
import { GestureDetector } from '../components/GestureDetector'
import { PinEntry } from '../components/PinEntry'
import { pinService } from '../services/pinService'
import { CapacitorAndroidKiosk } from '@capgo/capacitor-android-kiosk'

const PIXEL_SHIFT_INTERVAL_MS = 180_000  // 3 minutos

// Container extendido 3px más allá del viewport — previene borde negro en shifts ±2px
const rootContainerStyle: CSSProperties = {
  position: 'fixed',
  top: '-3px',
  right: '-3px',
  bottom: '-3px',
  left: '-3px',
  overflow: 'hidden',
}

function randomShift(): number {
  const mag = Math.random() < 0.5 ? 1 : 2
  return Math.random() < 0.5 ? mag : -mag
}

export function KioskScreen() {
  const photos = useContentStore((state) => state.photos)
  const yiddishPhrases = useContentStore((state) => state.yiddishPhrases)
  const birthdays = useContentStore((state) => state.birthdays)
  const setMode = useDisplayStore((state) => state.setMode)
  const setAuthenticated = useAdminStore((state) => state.setAuthenticated)
  const photoRotationInterval = useSettingsStore((s) => s.photoRotationInterval)

  const [rotationSlot, setRotationSlot] = useState(0)
  const [shiftX, setShiftX] = useState(0)
  const [shiftY, setShiftY] = useState(0)
  const [showPin, setShowPin] = useState(false)
  const [pinShaking, setPinShaking] = useState(false)
  const [pinResetKey, setPinResetKey] = useState(0)
  // Ref para evitar stale closure en handlePinComplete (P1)
  const pinAttemptsRef = useRef(0)

  // AC1/AC2/AC3: activar kiosk mode al montar KioskScreen
  useEffect(() => {
    void CapacitorAndroidKiosk.enterKioskMode({ restoreAfterReboot: true, relaunch: true }).catch(() => {
      // Silencioso en web/browser — el plugin solo funciona en Android nativo
    })
  }, [])

  useInterval(() => setRotationSlot(s => s + 1), photoRotationInterval)
  useInterval(() => {
    setShiftX(randomShift())
    setShiftY(randomShift())
  }, PIXEL_SHIFT_INTERVAL_MS)

  const handleGestureDetected = useCallback(async () => {
    try {
      pinAttemptsRef.current = 0
      setShowPin(true)
    } catch {
      // fallo silencioso — preferencias no disponibles
    }
  }, [])

  const handlePinComplete = useCallback(async (pin: string) => {
    try {
      const correct = await pinService.verifyPin(pin)

      if (correct) {
        // Fade out modal (0.5s via opacity transition), luego navegar a admin
        setShowPin(false)
        setTimeout(() => {
          setAuthenticated(true)
          setMode('admin')
        }, 500)
        return
      }

      // PIN incorrecto — incrementar via ref (sin stale closure)
      const nextAttempts = pinAttemptsRef.current + 1
      pinAttemptsRef.current = nextAttempts

      if (nextAttempts >= 3) {
        // 3 intentos fallidos — cerrar silenciosamente, sin shake (AC5)
        setShowPin(false)
        pinAttemptsRef.current = 0
        return
      }

      // Shake solo si no es el intento de lockout (AC4)
      setPinShaking(true)
      setPinResetKey(k => k + 1)
      setTimeout(() => setPinShaking(false), 450)
    } catch {
      // fallo silencioso — cerrar modal si storage no responde
      setShowPin(false)
    }
  }, [setAuthenticated, setMode])

  return (
    <div style={{ ...rootContainerStyle, transform: `translate(${shiftX}px, ${shiftY}px)` }}>
      <PhotoSlide photos={photos} intervalMs={photoRotationInterval} />
      <YiddishPhrase phrases={yiddishPhrases} />
      <DateDisplay />
      <BirthdayCountdown birthdays={birthdays} rotationSlot={rotationSlot} />
      <NightModeOverlay />
      <GestureDetector onGestureDetected={handleGestureDetected} />
      <PinEntry
        visible={showPin}
        shaking={pinShaking}
        resetKey={pinResetKey}
        onPinComplete={handlePinComplete}
      />
    </div>
  )
}
