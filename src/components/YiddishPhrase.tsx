import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import type { YiddishPhrase as YiddishPhraseType } from '../types/YiddishPhrase'
import { useSettingsStore } from '../stores/settingsStore'

interface YiddishPhraseProps {
  phrases: YiddishPhraseType[]
}

function getDayOfYear(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const diffMs = date.getTime() - startOfYear.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function msUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight.getTime() - now.getTime()
}

export function YiddishPhrase({ phrases }: YiddishPhraseProps) {
  const [dayIndex, setDayIndex] = useState(() => getDayOfYear(new Date()))
  const yiddishScript = useSettingsStore((s) => s.yiddishScript)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    function scheduleNext() {
      timeout = setTimeout(() => {
        setDayIndex(getDayOfYear(new Date()))
        scheduleNext()
      }, msUntilMidnight())
    }

    scheduleNext()
    return () => clearTimeout(timeout)
  }, [])

  if (phrases.length === 0) return null

  const phrase = phrases[dayIndex % phrases.length]
  // Fallback a transliteration si modo 'hebrew' pero el campo yiddish está vacío
  // (frases importadas sin completar las letras hebreas todavía).
  const primary = yiddishScript === 'hebrew' && phrase.yiddish.trim() !== ''
    ? phrase.yiddish
    : phrase.transliteration

  return (
    <>
      <div style={gradientStyle} />
      <div style={containerStyle}>
        <p style={yiddishStyle}>{primary}</p>
        <p style={translationStyle}>{phrase.spanish}</p>
      </div>
    </>
  )
}

const gradientStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '40%',
  height: '35%',
  background: 'radial-gradient(ellipse at bottom left, rgba(0,0,0,0.25) 0%, transparent 70%)',
  pointerEvents: 'none',
  zIndex: 4,
}

const containerStyle: CSSProperties = {
  position: 'absolute',
  bottom: '2.5vh',
  left: '2.5vw',
  maxWidth: '60vw',
  zIndex: 5,
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
}

const textShadow = '0 2px 16px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5)'

const yiddishStyle: CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontSize: 'clamp(56px, 5.5vw, 84px)',
  fontWeight: 400,
  lineHeight: 1.2,
  color: '#F5F0E8',
  textShadow,
  margin: 0,
  marginBottom: '12px',
}

const translationStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '40px',
  fontWeight: 300,
  lineHeight: 1.4,
  color: '#F5F0E8',
  opacity: 0.85,
  textShadow,
  margin: 0,
}
