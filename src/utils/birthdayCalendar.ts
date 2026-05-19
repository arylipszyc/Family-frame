import { HDate } from '@hebcal/hdate'
import type { Birthday } from '../types/Birthday'

const MS_PER_DAY = 86_400_000

function todayMidnight(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function calculateGregorian(birthday: Birthday): number {
  const [, month, day] = birthday.date.split('-').map(Number)
  const today = todayMidnight()

  const thisYear = new Date(today.getFullYear(), month - 1, day)
  const diffThis = Math.round((thisYear.getTime() - today.getTime()) / MS_PER_DAY)
  if (diffThis >= 0) return diffThis

  const nextYear = new Date(today.getFullYear() + 1, month - 1, day)
  return Math.round((nextYear.getTime() - today.getTime()) / MS_PER_DAY)
}

function calculateHebrew(birthday: Birthday): number {
  const [year, month, day] = birthday.date.split('-').map(Number)
  // Gregorian birthdate → Hebrew {hMonth, hDay}
  const birthHebrew = new HDate(new Date(year, month - 1, day))
  const hMonth = birthHebrew.getMonth()
  const hDay = birthHebrew.getDate()

  const today = todayMidnight()
  const currentHebrewYear = new HDate(today).getFullYear()

  // Try Hebrew anniversary in current Hebrew year, then next.
  for (let candidateYear = currentHebrewYear; candidateYear <= currentHebrewYear + 1; candidateYear++) {
    const anniversary = new HDate(hDay, hMonth, candidateYear).greg()
    const anniversaryMidnight = new Date(anniversary.getFullYear(), anniversary.getMonth(), anniversary.getDate())
    const diff = Math.round((anniversaryMidnight.getTime() - today.getTime()) / MS_PER_DAY)
    if (diff >= 0) return diff
  }

  // Fallback: shouldn't reach here for valid Hebrew dates.
  return 0
}

export function calculateNextBirthday(birthday: Birthday): { daysUntil: number } {
  if (birthday.calendar === 'hebrew') {
    return { daysUntil: calculateHebrew(birthday) }
  }
  return { daysUntil: calculateGregorian(birthday) }
}
