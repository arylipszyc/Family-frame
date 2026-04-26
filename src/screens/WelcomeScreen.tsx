import { useState, useEffect, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { useContentStore } from '../stores/contentStore'
import { useDisplayStore } from '../stores/displayStore'

// Timing constants (ms)
const PHOTO_FADE_MS   = 3_000   // photo fade-in
const PHOTO_HOLD_MS   = 2_000   // hold before message appears
const MESSAGE_FADE_MS = 1_000   // message + gradient fade-in
const PROMPT_DELAY_MS = 8_000   // delay after message starts → prompt
const EXIT_FADE_MS    = 3_000   // crossfade to KioskScreen

const FALLBACK_PHOTO = '/welcome-placeholder.jpg'

const TEXT_SHADOW =
  '0 2px 4px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)'

export function WelcomeScreen() {
  const welcomeConfig = useContentStore((state) => state.welcomeConfig)
  const setMode       = useDisplayStore((state) => state.setMode)

  const [photoVisible,   setPhotoVisible]   = useState(false)
  const [messageVisible, setMessageVisible] = useState(false)
  const [promptVisible,  setPromptVisible]  = useState(false)
  const [exiting,        setExiting]        = useState(false)
  const [imgSrc,         setImgSrc]         = useState(
    welcomeConfig.photoPath || FALLBACK_PHOTO
  )

  // Orchestrate the three-phase reveal on mount
  useEffect(() => {
    setPhotoVisible(true)

    const messageTimer = setTimeout(
      () => setMessageVisible(true),
      PHOTO_FADE_MS + PHOTO_HOLD_MS           // t = 5 000 ms
    )

    const promptTimer = setTimeout(
      () => setPromptVisible(true),
      PHOTO_FADE_MS + PHOTO_HOLD_MS + PROMPT_DELAY_MS // t = 13 000 ms
    )

    return () => {
      clearTimeout(messageTimer)
      clearTimeout(promptTimer)
    }
  }, [])

  const handleTouch = useCallback(() => {
    if (exiting) return
    setExiting(true)
    setTimeout(() => setMode('kiosk'), EXIT_FADE_MS)
  }, [exiting, setMode])

  return (
    <div
      style={containerStyle(exiting)}
      onClick={handleTouch}
    >
      {/* Full-bleed photo */}
      <img
        src={imgSrc}
        onError={() => setImgSrc(FALLBACK_PHOTO)}
        alt=""
        draggable={false}
        style={photoStyle(photoVisible)}
      />

      {/* Bottom gradient — fades in with message */}
      <div style={gradientStyle(messageVisible)} />

      {/* Personal message block */}
      <div style={messageBlockStyle(messageVisible)}>
        {welcomeConfig.authorName && (
          <p style={titleStyle}>{welcomeConfig.authorName}</p>
        )}
        {welcomeConfig.message && (
          <p style={messageTextStyle}>{welcomeConfig.message}</p>
        )}
      </div>

      {/* Tap prompt */}
      <p style={promptStyle(promptVisible)}>Tocar para ver las fotos</p>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function containerStyle(exiting: boolean): CSSProperties {
  return {
    position:   'fixed',
    inset:      0,
    backgroundColor: '#1A1210',
    opacity:    exiting ? 0 : 1,
    transition: exiting ? `opacity ${EXIT_FADE_MS}ms ease-in-out` : 'none',
    cursor:     'pointer',
    userSelect: 'none',
  }
}

function photoStyle(visible: boolean): CSSProperties {
  return {
    position:   'fixed',
    inset:      0,
    width:      '100%',
    height:     '100%',
    objectFit:  'cover',
    opacity:    visible ? 1 : 0,
    transition: `opacity ${PHOTO_FADE_MS}ms ease-in`,
  }
}

function gradientStyle(visible: boolean): CSSProperties {
  return {
    position:   'fixed',
    left:       0,
    right:      0,
    bottom:     0,
    height:     '60%',
    background: 'linear-gradient(to bottom, transparent, rgba(10,5,2,0.85))',
    opacity:    visible ? 1 : 0,
    transition: `opacity ${MESSAGE_FADE_MS}ms ease-in-out`,
    pointerEvents: 'none',
  }
}

function messageBlockStyle(visible: boolean): CSSProperties {
  return {
    position:   'fixed',
    bottom:     '12%',
    left:       0,
    right:      0,
    padding:    '0 10%',
    opacity:    visible ? 1 : 0,
    transition: `opacity ${MESSAGE_FADE_MS}ms ease-in-out`,
    pointerEvents: 'none',
  }
}

const titleStyle: CSSProperties = {
  fontFamily:  "'Playfair Display', serif",
  fontSize:    '64px',
  fontWeight:  700,
  color:       '#F5F0E8',
  lineHeight:  1.1,
  margin:      '0 0 16px 0',
  textShadow:  TEXT_SHADOW,
}

const messageTextStyle: CSSProperties = {
  fontFamily:  "'Inter', sans-serif",
  fontSize:    '28px',
  fontWeight:  400,
  color:       '#F5F0E8',
  lineHeight:  1.7,
  margin:      0,
  textShadow:  TEXT_SHADOW,
}

function promptStyle(visible: boolean): CSSProperties {
  return {
    position:      'fixed',
    bottom:        '4%',
    left:          0,
    right:         0,
    textAlign:     'center',
    fontFamily:    "'Inter', sans-serif",
    fontSize:      '22px',
    fontWeight:    300,
    color:         '#C8956C',
    opacity:       visible ? 0.6 : 0,
    transition:    'opacity 1000ms ease-in-out',
    margin:        0,
    pointerEvents: 'none',
  }
}
