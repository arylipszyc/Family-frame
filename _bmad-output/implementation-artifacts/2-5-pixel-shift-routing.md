# Story 2.5: Pixel shifting y App.tsx con routing condicional

Status: done

## Story

Como desarrollador,
quiero que `App.tsx` implemente el routing condicional por modo y que el KioskScreen tenga pixel shifting activo,
para completar el KioskScreen y prevenir burn-in en una pantalla encendida 24/7.

## Acceptance Criteria

**AC1 — App.tsx routing condicional:**
- `mode === 'welcome'` → renderiza `WelcomeScreen` (placeholder: div con texto "WelcomeScreen — Epic 3")
- `mode === 'kiosk'` → renderiza `KioskScreen`
- `mode === 'admin'` → renderiza `AdminScreen` (placeholder: div con texto "AdminScreen — Epic 5")
- `displayStore.mode` arranca en `'welcome'` → por defecto se muestra WelcomeScreen

**AC2 — Pixel shifting cada 3 minutos:**
- Cada 180 segundos, el KioskScreen se desplaza aleatoriamente ±1 o ±2 px en X e Y
- El desplazamiento se aplica via `transform: translate(Xpx, Ypx)` en el root div de KioskScreen
- El desplazamiento inicial es `(0, 0)` — sin shift en el primer render

**AC3 — Sin borde negro expuesto:**
- El root div de KioskScreen usa `inset: -3px` en lugar de `inset: 0` — extiende 3px más allá del viewport en todos los lados
- Con `overflow: hidden`, esto asegura que un shift de ±2px nunca exponga borde negro

**AC4 — `position: fixed` funciona con transform:**
- Aplicar `transform` al root div convierte a KioskScreen en containing block para sus hijos `position: fixed`
- PhotoSlide, NightModeOverlay y otros hijos con `position: fixed; inset: 0` quedan posicionados dentro del contenedor extendido, moviéndose junto con el shift

**AC5 — Placeholders WelcomeScreen y AdminScreen:**
- Ambas pantallas existen como archivos en `src/screens/` con un componente exportado nombrado
- El estilo es `position: fixed; inset: 0; background: #1A1210; display: flex; align-items: center; justify-content: center`
- Texto en `frame-cream` que identifica la pantalla y el epic que la implementará

## Tasks / Subtasks

- [x] Task 1 — Crear `src/screens/WelcomeScreen.tsx` y `src/screens/AdminScreen.tsx` (placeholders)
- [x] Task 2 — Actualizar `src/App.tsx` con routing condicional basado en `displayStore.mode`
- [x] Task 3 — Actualizar `src/screens/KioskScreen.tsx`: `inset: -3px`, pixel shifting con `useInterval(180s)`
- [x] Task 4 — Validar: `npx tsc --noEmit` ✅ y `npm run build` ✅

### Review Findings

- [x] [Review][Defer] Magic number `3` en `rootContainerStyle` desconectado del shift máximo `±2` [KioskScreen.tsx] — deferred, pre-existing design
- [x] [Review][Defer] Estilos duplicados en WelcomeScreen y AdminScreen — deferred, placeholders serán reemplazados en Epics 3 y 5
- [x] [Review][Defer] `randomShift()` puede retornar mismo valor en ticks consecutivos — subóptimo para burn-in pero aceptable; deferred
- [x] [Review][Defer] `inset: -3px` bleed fino en dispositivos con DPR no-entero (ej. 1.5x) — margen teórico ~1.5px físico; deferred testing
- [x] [Review][Defer] Fallthrough implícito a WelcomeScreen para modos desconocidos — comportamiento defensivo aceptable; deferred

## Dev Notes

### Estado actual del proyecto

- `src/App.tsx` — actualmente retorna `<KioskScreen />` siempre. Reemplazar con routing condicional
- `src/stores/displayStore.ts` — `mode: 'welcome'` (valor inicial), `setMode` disponible
- `src/hooks/useInterval.ts` — disponible para el shift timer (delay `null` pausa)
- KioskScreen actualmente tiene `rootStyle = { position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }` — reemplazar con `inset: -3px` y agregar `transform`

---

### Implementación — WelcomeScreen y AdminScreen (placeholders)

```typescript
// src/screens/WelcomeScreen.tsx
import type { CSSProperties } from 'react'

export function WelcomeScreen() {
  return (
    <div style={placeholderStyle}>
      <p style={textStyle}>WelcomeScreen — Epic 3</p>
    </div>
  )
}

// src/screens/AdminScreen.tsx
export function AdminScreen() {
  return (
    <div style={placeholderStyle}>
      <p style={textStyle}>AdminScreen — Epic 5</p>
    </div>
  )
}

const placeholderStyle: CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
  backgroundColor: '#1A1210',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const textStyle: CSSProperties = {
  color: '#F5F0E8', opacity: 0.6,
  fontFamily: "'Inter', sans-serif", fontSize: '24px', fontWeight: 300,
}
```

---

### Implementación — App.tsx (routing condicional)

```typescript
import { useDisplayStore } from './stores/displayStore'
import { KioskScreen } from './screens/KioskScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { AdminScreen } from './screens/AdminScreen'

function App() {
  const mode = useDisplayStore((state) => state.mode)

  if (mode === 'kiosk') return <KioskScreen />
  if (mode === 'admin') return <AdminScreen />
  return <WelcomeScreen />  // 'welcome' y cualquier valor inesperado
}

export default App
```

---

### Implementación — KioskScreen.tsx (pixel shifting)

Función de shift aleatorio:
```typescript
function randomShift(): number {
  const mag = Math.random() < 0.5 ? 1 : 2   // 1 o 2 píxeles
  return Math.random() < 0.5 ? mag : -mag    // positivo o negativo
}
```

Estado y timer:
```typescript
const [shiftX, setShiftX] = useState(0)
const [shiftY, setShiftY] = useState(0)

useInterval(() => {
  setShiftX(randomShift())
  setShiftY(randomShift())
}, 180_000)  // 3 minutos
```

Root style actualizado (reemplazar `rootStyle` constante):
```typescript
const rootContainerStyle: CSSProperties = {
  position: 'fixed',
  top: '-3px', right: '-3px', bottom: '-3px', left: '-3px',
  overflow: 'hidden',
}
```

Y en el return:
```tsx
<div style={{ ...rootContainerStyle, transform: `translate(${shiftX}px, ${shiftY}px)` }}>
```

**Por qué `inset: -3px`:** El shift máximo es ±2px. Con el container extendido 3px más allá del viewport, incluso con shift +2px el borde del container queda 1px fuera del viewport → nunca se ve borde negro.

**Por qué `transform` en el elemento con `inset: -3px`:** CSS transforma crean un nuevo contexto de posicionamiento para hijos `position: fixed`. Los hijos (PhotoSlide, NightModeOverlay) con `position: fixed; inset: 0` quedan anclados al container extendido, no al viewport. Cuando el container se desplaza, todo se mueve junto — incluyendo el linen overlay y el night mode overlay.

**Nota:** El inline style para `transform` es dinámico (depende del estado), por lo que no puede ser una constante de módulo. El resto de propiedades fijas de `rootContainerStyle` sí son constante.

---

### Reglas arquitectónicas

- `App.tsx` solo lee `displayStore.mode` — no accede a `contentStore`
- Los placeholders `WelcomeScreen` y `AdminScreen` no tienen lógica — solo visual de identificación
- El shift aleatorio está en KioskScreen (pantalla) — no en un componente hijo
- TypeScript strict: no `as` casts

---

### Scope — qué NO entra

- NO implementar la WelcomeScreen real (Epic 3)
- NO implementar la AdminScreen real (Epic 5)
- NO implementar transición entre modos (Epic 3)
- NO agregar GestureDetector real (Epic 5)
- NO agregar transición suave al pixel shift (sería perceptible; el cambio debe ser abrupto entre fotos)

---

### Referencias

- [Source: epics.md#Story 2.5] — ACs
- [Source: architecture.md#Frontend Architecture] — routing condicional por mode
- [Source: ux-design-specification.md] — burn-in prevention pattern

## Dev Agent Record

### Agent Model Used

_pendiente_

### Debug Log References

_ninguno_

### Completion Notes List

_pendiente_

### File List

- `src/screens/WelcomeScreen.tsx` (nuevo)
- `src/screens/AdminScreen.tsx` (nuevo)
- `src/App.tsx` (modificado)
- `src/screens/KioskScreen.tsx` (modificado)
