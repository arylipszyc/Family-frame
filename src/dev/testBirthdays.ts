import type { Birthday } from '../types/Birthday'

// Dev-only seed para validar cálculo hebreo en browser. Owner cambia post-validación.
// 1990-05-29 ≈ 5 Sivan 5750 → próximo 5 Sivan 5786 cae cerca del 2026-05-22.
export const testBirthdays: Birthday[] = [
  { id: 'dev-haim', name: 'Haim', date: '1990-05-29', calendar: 'hebrew' },
]
