import { useState, useRef, useCallback, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useContentStore } from '../stores/contentStore'
import { useDisplayStore } from '../stores/displayStore'
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

// Container extendido 3px más allá del viewport — previene borde negro en shifts ±2px.
// Gradiente warm-dark unificado en el root: PhotoZone y SidePanel heredan sin línea divisoria.
const rootContainerStyle: CSSProperties = {
  position: 'fixed',
  top: '-3px',
  right: '-3px',
  bottom: '-3px',
  left: '-3px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'row',
  background: '#000000',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
}

const photoZoneStyle: CSSProperties = {
  width: '78%',
  height: '100%',
  position: 'relative',
}

// Layout vertical del SidePanel (orden de arriba a abajo): date → clock → birthday.
// Heights aproximados — total ~1080 con flex absorbiendo slack.
const sidePanelStyle: CSSProperties = {
  width: '22%',
  height: '100%',
  padding: '60px 32px 60px 32px',
  display: 'flex',
  flexDirection: 'column',
  gap: '40px',
  boxSizing: 'border-box',
  overflow: 'hidden',
}

const dateZoneStyle: CSSProperties = {
  height: '120px',
  flexShrink: 0,
}

const birthdayZoneStyle: CSSProperties = {
  flexGrow: 1,
  flexShrink: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

// Linen paper overlay — tinta uniforme cream sobre PhotoZone + SidePanel.
// Live a nivel root entre las zonas y los overlays exteriores (NightMode/Gesture/Pin).
// Tinta photoZone (foto + YiddishPhrase) y sidePanel (clock/birthday/date zones)
// porque ambas zonas vienen antes en DOM. El tint sobre los textos del panel es
// 6% cream → cambio sub-perceptual; aceptado en Story 7.2 (ver Spec Change Log).
const linenOverlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'rgba(245, 235, 210, 0.06)',
  pointerEvents: 'none',
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
  const photoRotationInterval = useSettingsStore((s) => s.photoRotationInterval)

  const [shiftX, setShiftX] = useState(0)
  const [shiftY, setShiftY] = useState(0)
  const [showPin, setShowPin] = useState(false)
  const [pinShaking, setPinShaking] = useState(false)
  const [pinResetKey, setPinResetKey] = useState(0)
  const pinAttemptsRef = useRef(0)

  useEffect(() => {
    void CapacitorAndroidKiosk.enterKioskMode({ restoreAfterReboot: true, relaunch: true }).catch(() => {
      // Silencioso en web/browser — el plugin solo funciona en Android nativo
    })
  }, [])

  useInterval(() => {
    setShiftX(randomShift())
    setShiftY(randomShift())
  }, PIXEL_SHIFT_INTERVAL_MS)

  const handleGestureDetected = useCallback(() => {
    pinAttemptsRef.current = 0
    setShowPin(true)
  }, [])

  const handlePinComplete = useCallback(async (pin: string) => {
    try {
      const correct = await pinService.verifyPin(pin)

      if (correct) {
        setShowPin(false)
        setTimeout(() => {
          setMode('admin')
        }, 500)
        return
      }

      const nextAttempts = pinAttemptsRef.current + 1
      pinAttemptsRef.current = nextAttempts

      if (nextAttempts >= 3) {
        setShowPin(false)
        pinAttemptsRef.current = 0
        return
      }

      setPinShaking(true)
      setPinResetKey(k => k + 1)
      setTimeout(() => setPinShaking(false), 450)
    } catch {
      setShowPin(false)
    }
  }, [setMode])

  return (
    <div style={{ ...rootContainerStyle, transform: `translate(${shiftX}px, ${shiftY}px)` }}>
      <div style={photoZoneStyle}>
        <PhotoSlide photos={photos} intervalMs={photoRotationInterval} />
        <YiddishPhrase phrases={yiddishPhrases} />
      </div>
      <div style={sidePanelStyle}>
        <div style={dateZoneStyle}>
          <DateDisplay />
        </div>
        <div style={birthdayZoneStyle}>
          <BirthdayCountdown birthdays={birthdays} />
        </div>
      </div>
      <div style={linenOverlayStyle} />
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
