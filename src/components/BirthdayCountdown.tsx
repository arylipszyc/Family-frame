import type { CSSProperties } from 'react'
import type { Birthday } from '../types/Birthday'
import { calculateNextBirthday } from '../utils/birthdayCalendar'

interface BirthdayCountdownProps {
  birthdays: Birthday[]
}

interface UpcomingBirthday extends Birthday {
  daysUntil: number
}

function BirthdayRow({ entry }: { entry: UpcomingBirthday }) {
  const days = entry.daysUntil
  const daysLabel = days === 0
    ? '🎂 Hoy'
    : `${days} día${days === 1 ? '' : 's'}`

  return (
    <div style={rowStyle}>
      <p style={nameStyle}>{entry.name}</p>
      <p style={daysStyle}>{daysLabel}</p>
    </div>
  )
}

export function BirthdayCountdown({ birthdays }: BirthdayCountdownProps) {
  const upcoming: UpcomingBirthday[] = birthdays
    .map(b => ({ ...b, daysUntil: calculateNextBirthday(b).daysUntil }))
    .filter(b => b.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  if (upcoming.length === 0) return null

  return (
    <div style={containerStyle}>
      <p style={titleStyle}>Próximos cumpleaños</p>
      {upcoming.map((entry, idx) => (
        <div key={entry.id} style={{ display: 'contents' }}>
          {idx > 0 && <div style={dividerStyle} />}
          <BirthdayRow entry={entry} />
        </div>
      ))}
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
  fontSize: '32px',
  fontWeight: 400,
  lineHeight: 1.2,
  color: '#F5F0E8',
  opacity: 0.5,
  letterSpacing: '0.5px',
  margin: 0,
  marginBottom: '8px',
}

const rowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
}

const nameStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '47px',
  fontWeight: 500,
  lineHeight: 1.2,
  color: '#C8956C',
  margin: 0,
}

const daysStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '38px',
  fontWeight: 300,
  lineHeight: 1.2,
  color: '#F5F0E8',
  opacity: 0.85,
  margin: 0,
}

const dividerStyle: CSSProperties = {
  height: '1px',
  backgroundColor: '#C8956C',
  opacity: 0.2,
  margin: '8px 0',
}
