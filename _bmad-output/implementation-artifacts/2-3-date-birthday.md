# Story 2.3: DateDisplay y BirthdayCountdown

Status: done

## Story

Como usuario pasivo (Abel o Liliana),
quiero ver la fecha del día y los cumpleaños próximos en el marco,
para estar orientado en el tiempo y sentir anticipación por los momentos familiares que se acercan.

## Acceptance Criteria

**AC1 — DateDisplay — formato y posición:**
- Muestra la fecha en formato largo: `"Martes, 12 de Mayo de 2026"` con locale `es-AR`
- Capitalización: primera letra del día en mayúscula (nativo de `toLocaleDateString`)
- Tamaño: `clamp(22px, 2.5vw, 32px) Inter 300` con `opacity: 0.7`
- Posicionado `position: absolute; top: 2.5vh; right: 2.5vw; text-align: right`
- `text-shadow` mínimo para legibilidad: `0 1px 8px rgba(0,0,0,0.6)`

**AC2 — DateDisplay — actualización a medianoche:**
- La fecha se actualiza automáticamente a `00:00:00` local sin recarga de página
- El timeout de medianoche se cancela correctamente en cleanup (sin memory leaks)
- Patrón idéntico al de `YiddishPhrase`: callback recursivo con deps `[]`

**AC3 — BirthdayCountdown — formato y posición:**
- Posicionado `position: absolute; bottom: 2.5vh; right: 2.5vw; text-align: right`
- Tamaño: `clamp(28px, 3vw, 42px) Inter 500`
- `text-shadow` multicapa idéntico al de `YiddishPhrase`: `0 2px 16px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5)`
- Formato normal: `"En X días: cumpleaños de [Nombre]"`
- Formato hoy: `"🎂 Hoy: cumpleaños de [Nombre]"` — `[Nombre]` en color `#C8956C` (`frame-amber`)

**AC4 — BirthdayCountdown — ventana de 30 días:**
- Muestra solo los cumpleaños con ≤ 30 días hasta su próxima ocurrencia (este o el próximo año)
- Si no hay cumpleaños en los próximos 30 días: el componente retorna `null` — sin espacio ni placeholder

**AC5 — BirthdayCountdown — rotación de 3+ cumpleaños:**
- Se muestran máximo 2 entradas visibles simultáneamente
- Si hay más de 2 próximos: el slot 2 rota entre el 2°, 3°, etc. con cada cambio de foto (cada 30s)
- `rotationSlot` es un prop entero que KioskScreen incrementa cada 30s
- Slot 2 = `upcomingBirthdays[1 + (rotationSlot % (upcomingBirthdays.length - 1))]` cuando `upcomingBirthdays.length > 2`

**AC6 — Sin feedback táctil:**
- `WebkitTapHighlightColor: 'transparent'` y `userSelect: 'none'` en ambos componentes

## Tasks / Subtasks

- [x] Task 1 — Crear `src/components/DateDisplay.tsx` con formato es-AR, midnight update, posicionamiento
- [x] Task 2 — Crear `src/components/BirthdayCountdown.tsx` con lógica de días, formato, rotación y estado vacío
- [x] Task 3 — Actualizar `src/screens/KioskScreen.tsx` — agregar `rotationSlot` state + `useInterval`, leer `contentStore.birthdays`, pasar props a los dos nuevos componentes
- [x] Task 4 — Validar: `npx tsc --noEmit` ✅ y `npm run build` ✅

## Dev Notes

### Estado actual del proyecto

- `src/components/YiddishPhrase.tsx` — midnight update con callback recursivo + deps `[]` (patrón a replicar)
- `src/components/PhotoSlide.tsx` — gestiona su propio índice de foto internamente; no expone el índice al exterior
- `src/screens/KioskScreen.tsx` — renderiza `PhotoSlide` + `YiddishPhrase`. Leer `yiddishPhrases` ya está. Tiene `rootStyle` como constante de módulo
- `src/stores/contentStore.ts` — `useContentStore` tiene `birthdays: Birthday[]` (arranca `[]`, sin datos reales hasta Epic 5)
- `src/stores/displayStore.ts` — tiene `currentPhotoIndex: number` pero **PhotoSlide no lo actualiza** (PhotoSlide gestiona su índice internamente)
- `src/types/Birthday.ts` — `{ id: string, name: string, date: string }` donde `date = "YYYY-MM-DD"` (año de nacimiento)
- `src/hooks/useInterval.ts` — disponible para el `rotationSlot` en KioskScreen
- Tailwind tokens: `text-kiosk-date` (`clamp(22px, 2.5vw, 32px)`), `text-kiosk-birthday` (`clamp(28px, 3vw, 42px)`)

---

### Implementación — `DateDisplay.tsx`

**Props:** ninguno — gestiona su propia fecha interna.

```typescript
export function DateDisplay() {
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    function scheduleNext() {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      timeout = setTimeout(() => {
        setToday(new Date())
        scheduleNext()
      }, midnight.getTime() - now.getTime())
    }
    scheduleNext()
    return () => clearTimeout(timeout)
  }, [])

  const formatted = today.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  // Capitalizar primera letra
  const display = formatted.charAt(0).toUpperCase() + formatted.slice(1)

  return <p style={dateStyle}>{display}</p>
}
```

**Estilo:**
```typescript
const dateStyle: CSSProperties = {
  position: 'absolute',
  top: '2.5vh',
  right: '2.5vw',
  fontFamily: "'Inter', sans-serif",
  fontSize: 'clamp(22px, 2.5vw, 32px)',
  fontWeight: 300,
  lineHeight: 1.4,
  color: '#F5F0E8',     // frame-cream
  opacity: 0.7,
  textShadow: '0 1px 8px rgba(0,0,0,0.6)',
  textAlign: 'right',
  margin: 0,
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
}
```

---

### Implementación — `BirthdayCountdown.tsx`

**Props:**
```typescript
interface BirthdayCountdownProps {
  birthdays: Birthday[]       // lista completa del store
  rotationSlot: number        // incrementado por KioskScreen cada 30s
}
```

**Cálculo de días hasta próximo cumpleaños:**
```typescript
function daysUntilNextBirthday(birthdayDate: string): number {
  const [, month, day] = birthdayDate.split('-').map(Number)
  const today = new Date()
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // Intento este año
  const thisYear = new Date(today.getFullYear(), month - 1, day)
  const diffThis = Math.round((thisYear.getTime() - todayMidnight.getTime()) / 86_400_000)
  if (diffThis >= 0) return diffThis

  // Ya pasó este año → próximo año
  const nextYear = new Date(today.getFullYear() + 1, month - 1, day)
  return Math.round((nextYear.getTime() - todayMidnight.getTime()) / 86_400_000)
}
```

**Selección de los 2 cumpleaños a mostrar:**
```typescript
export function BirthdayCountdown({ birthdays, rotationSlot }: BirthdayCountdownProps) {
  // 1. Calcular días y filtrar a ≤30
  const upcoming = birthdays
    .map(b => ({ ...b, daysUntil: daysUntilNextBirthday(b.date) }))
    .filter(b => b.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  if (upcoming.length === 0) return null

  // 2. Seleccionar los 2 slots a mostrar
  const slot1 = upcoming[0]
  let slot2: typeof upcoming[0] | undefined
  if (upcoming.length === 2) {
    slot2 = upcoming[1]
  } else if (upcoming.length > 2) {
    // Rotar: índices 1, 2, 3... del array
    const extraCount = upcoming.length - 1
    slot2 = upcoming[1 + (rotationSlot % extraCount)]
  }

  return (
    <div style={containerStyle}>
      <BirthdayLine entry={slot1} />
      {slot2 && <BirthdayLine entry={slot2} />}
    </div>
  )
}
```

**Componente auxiliar `BirthdayLine` (interno, no exportado):**
```typescript
function BirthdayLine({ entry }: { entry: { name: string; daysUntil: number } }) {
  if (entry.daysUntil === 0) {
    return (
      <p style={birthdayStyle}>
        {'🎂 Hoy: cumpleaños de '}
        <span style={{ color: '#C8956C' }}>{entry.name}</span>
      </p>
    )
  }
  return (
    <p style={birthdayStyle}>
      {`En ${entry.daysUntil} día${entry.daysUntil === 1 ? '' : 's'}: cumpleaños de ${entry.name}`}
    </p>
  )
}
```

**Estilos:**
```typescript
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
```

---

### Implementación — `KioskScreen.tsx` (actualizar)

KioskScreen gestiona el `rotationSlot` con `useInterval` (mismo intervalo que el crossfade de fotos: 30s):

```typescript
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useContentStore } from '../stores/contentStore'
import { useInterval } from '../hooks/useInterval'
import { PhotoSlide } from '../components/PhotoSlide'
import { YiddishPhrase } from '../components/YiddishPhrase'
import { DateDisplay } from '../components/DateDisplay'
import { BirthdayCountdown } from '../components/BirthdayCountdown'

const rootStyle: CSSProperties = { position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }
const PHOTO_INTERVAL_MS = 30_000

export function KioskScreen() {
  const photos = useContentStore((state) => state.photos)
  const yiddishPhrases = useContentStore((state) => state.yiddishPhrases)
  const birthdays = useContentStore((state) => state.birthdays)
  const [rotationSlot, setRotationSlot] = useState(0)

  useInterval(() => setRotationSlot(s => s + 1), PHOTO_INTERVAL_MS)

  return (
    <div style={rootStyle}>
      <PhotoSlide photos={photos} />
      <YiddishPhrase phrases={yiddishPhrases} />
      <DateDisplay />
      <BirthdayCountdown birthdays={birthdays} rotationSlot={rotationSlot} />
      {/* Story 2.4: night mode overlay */}
      {/* Story 5.x: <GestureDetector /> */}
    </div>
  )
}
```

**Por qué `rotationSlot` en KioskScreen en lugar de `displayStore.currentPhotoIndex`:**
`PhotoSlide` gestiona su índice internamente y no actualiza `displayStore` (es un componente puro). La alternativa de actualizar `displayStore` desde `PhotoSlide` violaría la regla de que los componentes no acceden a stores. Usar un `useInterval` independiente en KioskScreen con el mismo período (30s) logra rotación en sincronía sin acoplar la arquitectura.

---

### Reglas arquitectónicas (enforcement)

- `DateDisplay` y `BirthdayCountdown` son componentes puros — **no** acceden a stores
- Solo `KioskScreen` lee `contentStore.birthdays` y pasa como prop
- `daysUntilNextBirthday` es una función pura en `BirthdayCountdown.tsx` (no requiere utilidad separada — una sola función, sin extraer a `utils/`)
- La singularidad/pluralidad "día/días" se maneja inline — no extraer a helper
- El `BirthdayLine` interno no se exporta — uso exclusivo de `BirthdayCountdown`
- TypeScript strict: no `as` casts; `Birthday` type importado de `../types/Birthday`

---

### Scope — qué NO entra en esta story

- NO crear `utils/dateUtils.ts` (la función de días va inline en el componente)
- NO usar `displayStore.currentPhotoIndex` (PhotoSlide no lo actualiza aún)
- NO crear gradiente para `BirthdayCountdown` (UX spec no especifica uno en esquina inferior derecha)
- NO implementar night mode (Story 2.4)
- NO implementar admin CRUD de cumpleaños (Story 5.x)

---

### Learnings de Stories anteriores

- Exports nombrados: `export function DateDisplay`, `export function BirthdayCountdown`
- `npx tsc --noEmit` verifica `src/` completo
- Zustand selector pattern: `useContentStore((state) => state.birthdays)` — no desestructurar
- Inline styles para `text-shadow`, `clamp()`, propiedades no soportadas por Tailwind v3
- `useEffect` cleanup obligatorio para `setTimeout` — patrón recursivo con deps `[]`
- `useInterval` disponible en `src/hooks/useInterval.ts` — delay `null` pausa el intervalo

---

### Referencias

- [Source: epics.md#Story 2.3] — ACs completos
- [Source: ux-design-specification.md#BirthdayCountdown] — formato, posicionamiento, text-shadow
- [Source: ux-design-specification.md#DateDisplay] — formato es-AR, opacity, posición
- [Source: ux-design-specification.md#Chosen Direction D3] — texto flotado sobre foto
- [Source: architecture.md#Frontend Architecture] — components sin stores, screens como consumidores
- [Source: 2-2-yiddish-phrase.md#Dev Notes] — patrón midnight update con callback recursivo

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_ninguno — implementación directa sin obstáculos_

### Completion Notes List

- ✅ AC1: `toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })` + capitalización de primera letra. `clamp(22px, 2.5vw, 32px) Inter 300 opacity 0.7`. Posición `top: 2.5vh; right: 2.5vw`. `text-shadow: 0 1px 8px rgba(0,0,0,0.6)`.
- ✅ AC2: `useEffect` con callback recursivo, deps `[]`, cleanup `clearTimeout`. Mismo patrón que `YiddishPhrase`.
- ✅ AC3: Container `bottom: 2.5vh; right: 2.5vw; text-align: right`. `clamp(28px, 3vw, 42px) Inter 500`. `text-shadow` multicapa. Formato "En X días/Hoy" con nombre en `#C8956C` (`frame-amber`).
- ✅ AC4: `filter(b => b.daysUntil <= 30)` + `if (upcoming.length === 0) return null`.
- ✅ AC5: `slot2 = upcoming[1 + (rotationSlot % extraCount)]` cuando `upcoming.length > 2`. `rotationSlot` incrementado cada 30s en `KioskScreen` vía `useInterval`.
- ✅ AC6: `WebkitTapHighlightColor: 'transparent'` y `userSelect: 'none'` en ambos componentes.
- `npx tsc --noEmit` ✅ · `npm run build` ✅ (40 módulos).

### File List

- `src/components/DateDisplay.tsx` (nuevo)
- `src/components/BirthdayCountdown.tsx` (nuevo)
- `src/screens/KioskScreen.tsx` (modificado)
