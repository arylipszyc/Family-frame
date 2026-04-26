import type { CSSProperties } from 'react'
import type { Birthday } from '../types/Birthday'

interface BirthdayCountdownProps {
  birthdays: Birthday[]
  rotationSlot: number
}

interface UpcomingBirthday extends Birthday {
  daysUntil: number
}

function daysUntilNextBirthday(birthdayDate: string): number {
  const [, month, day] = birthdayDate.split('-').map(Number)
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const thisYear = new Date(now.getFullYear(), month - 1, day)
  const diffThis = Math.round((thisYear.getTime() - todayMidnight.getTime()) / 86_400_000)
  if (diffThis >= 0) return diffThis

  const nextYear = new Date(now.getFullYear() + 1, month - 1, day)
  return Math.round((nextYear.getTime() - todayMidnight.getTime()) / 86_400_000)
}

function BirthdayLine({ entry }: { entry: UpcomingBirthday }) {
  if (entry.daysUntil === 0) {
    return (
      <p style={birthdayStyle}>
        {'🎂 Hoy: cumpleaños de '}
        <span style={{ color: '#C8956C' }}>{entry.name}</span>
      </p>
    )
  }
  const days = entry.daysUntil
  return (
    <p style={birthdayStyle}>
      {`En ${days} día${days === 1 ? '' : 's'}: cumpleaños de ${entry.name}`}
    </p>
  )
}

export function BirthdayCountdown({ birthdays, rotationSlot }: BirthdayCountdownProps) {
  const upcoming: UpcomingBirthday[] = birthdays
    .map(b => ({ ...b, daysUntil: daysUntilNextBirthday(b.date) }))
    .filter(b => b.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  if (upcoming.length === 0) return null

  const slot1 = upcoming[0]
  let slot2: UpcomingBirthday | undefined

  if (upcoming.length === 2) {
    slot2 = upcoming[1]
  } else if (upcoming.length > 2) {
    const extraCount = upcoming.length - 1
    slot2 = upcoming[1 + (rotationSlot % extraCount)]
  }

  return (
    <div style={containerStyle}>
      <BirthdayLine entry={slot1} />
      {slot2 !== undefined && <BirthdayLine entry={slot2} />}
    </div>
  )
}

const containerStyle: CSSProperties = {
  position: 'absolute',
  bottom: '2.5vh',
  right: '2.5vw',
  textAlign: 'right',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
}

const birthdayStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 'clamp(28px, 3vw, 42px)',
  fontWeight: 500,
  lineHeight: 1.3,
  color: '#F5F0E8',
  textShadow: '0 2px 16px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5)',
  margin: 0,
  marginBottom: '6px',
}
