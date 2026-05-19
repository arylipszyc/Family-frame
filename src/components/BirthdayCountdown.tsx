import type { CSSProperties } from 'react'
import type { Birthday } from '../types/Birthday'
import { calculateNextBirthday } from '../utils/birthdayCalendar'

interface BirthdayCountdownProps {
  birthdays: Birthday[]
  rotationSlot: number
}

interface UpcomingBirthday extends Birthday {
  daysUntil: number
}

function BirthdayRow({ entry }: { entry: UpcomingBirthday }) {
  const days = entry.daysUntil
  const daysLabel = days === 0
    ? '🎂 Hoy'
    : `En ${days} día${days === 1 ? '' : 's'}`

  return (
    <div style={rowStyle}>
      <span style={nameStyle}>{entry.name}</span>
      <span style={daysStyle}>{daysLabel}</span>
    </div>
  )
}

export function BirthdayCountdown({ birthdays, rotationSlot }: BirthdayCountdownProps) {
  const upcoming: UpcomingBirthday[] = birthdays
    .map(b => ({ ...b, daysUntil: calculateNextBirthday(b).daysUntil }))
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
      <p style={titleStyle}>Próximos cumpleaños</p>
      <BirthdayRow entry={slot1} />
      {slot2 !== undefined && <BirthdayRow entry={slot2} />}
    </div>
  )
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
}

const titleStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '20px',
  fontWeight: 400,
  lineHeight: 1.2,
  color: '#F5F0E8',
  opacity: 0.5,
  letterSpacing: '0.5px',
  margin: 0,
  marginBottom: '6px',
}

const rowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '16px',
}

const nameStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '32px',
  fontWeight: 500,
  lineHeight: 1.2,
  color: '#C8956C',
}

const daysStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '26px',
  fontWeight: 300,
  lineHeight: 1.2,
  color: '#F5F0E8',
  opacity: 0.85,
  whiteSpace: 'nowrap',
}
