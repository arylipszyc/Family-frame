# Story 2.1: PhotoSlide — rotación de fotos con paper overlay y crossfade

Status: done

## Story

Como usuario pasivo (Abel o Liliana),
quiero ver fotos familiares rotando suavemente en pantalla completa con una estética cálida y orgánica,
para que el marco se sienta como un cuadro familiar, no como una pantalla tecnológica.

## Acceptance Criteria

**AC1 — Crossfade automático:**
- Con ≥2 fotos en `contentStore.photos`, la foto siguiente aparece cada 30s via crossfade 2-3s `ease-in-out`
- La transición usa dos capas `opacity` superpuestas — no es instantánea ni slide

**AC2 — Paper overlay y filtro:**
- La foto tiene `filter: saturate(0.85) brightness(0.95) sepia(0.08)` via CSS
- Hay un overlay de textura paper/linen a ~6% de opacidad cálida sobre la foto
- La foto ocupa `position: fixed; inset: 0` — pantalla completa sin márgenes

**AC3 — Fallback en error de carga:**
- Si `src` falla, se mantiene la foto anterior — sin imagen rota ni placeholder de error visible

**AC4 — Foto única:**
- Con solo 1 foto, se muestra indefinidamente sin intentar crossfade

**AC5 — Estado vacío:**
- Sin fotos en el store: fondo `frame-night`, texto `"Preparando tus fotos..."` en `frame-cream` a 60% opacidad. Sin spinner ni ícono de error

**AC6 — Sin feedback táctil:**
- Ningún highlight visible al tocar fuera de la zona admin: `-webkit-tap-highlight-color: transparent`, `user-select: none`

## Tasks / Subtasks

- [x] Task 1 — Crear `src/hooks/useInterval.ts` — helper para el loop de rotación
- [x] Task 2 — Crear `src/components/PhotoSlide.tsx` — foto full-screen con filter y linen overlay
- [x] Task 3 — Crear `src/screens/KioskScreen.tsx` — contenedor con loop de rotación
- [x] Task 4 — Actualizar `src/App.tsx` para renderizar KioskScreen según `displayStore.mode`
- [x] Task 5 — Validar: `npx tsc --noEmit` ✅ y `npm run build` ✅

## Dev Notes

### Estado actual del proyecto

- `src/hooks/`, `src/components/`, `src/screens/` existen con `.gitkeep`
- `src/stores/contentStore.ts` — `useContentStore` con `photos: Photo[]`, `yiddishPhrases`, etc.
- `src/stores/displayStore.ts` — `useDisplayStore` con `mode: AppMode`, `setCurrentPhotoIndex`
- `src/types/Photo.ts` — `{ id: string, localPath: string, syncedAt: string }`
- `src/App.tsx` — tiene inline styles placeholder de Story 1.1 (reemplazar)
- Tailwind tokens disponibles: `bg-frame-night`, `text-frame-cream`, `font-kiosk-sans`

---

### Implementación — `useInterval.ts`

Hook estándar para intervalos con React:

```typescript
import { useEffect, useRef } from 'react'

export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
```

- `delay: null` pausa el intervalo — útil para pausar en modo admin
- Patrón estándar Dan Abramov — evita stale closures

---

### Implementación — `PhotoSlide.tsx`

**Técnica crossfade:** dos capas absolutamente posicionadas, alternando cuál está visible:

```typescript
// Estructura conceptual:
// <div> (contenedor fixed inset-0, overflow-hidden)
//   <img layerA /> // opacity: 1 o 0
//   <img layerB /> // opacity: 0 o 1
//   <div paper-overlay /> // frame-paper color, pointer-events: none
// </div>
```

**Props:**
```typescript
interface PhotoSlideProps {
  photos: Photo[]                // array de fotos del store
  intervalMs?: number            // default: 30000 (30s)
}
```

**Crossfade con `localPath`:**
- `Photo.localPath` en desarrollo = string de URL (placeholder). En producción = ruta Capacitor filesystem
- Para desarrollo: las fotos no existen realmente → el empty state manejará esto

**CSS filter exacto** (UX spec toma precedencia sobre epic cuando difieren):
```css
filter: saturate(0.85) brightness(0.95) sepia(0.08)
```

**Linen overlay:** implementado como `<div>` con `backgroundColor: 'rgba(245, 235, 210, 0.06)'` (`frame-paper` token). Esta es la misma capa que el `frame-paper` token definido en tailwind.config.ts. Es equivalente visual a un PNG de textura paper a ~6% opacidad — el PNG puede reemplazarlo más adelante en `public/linen.png` si se quiere textura granulada.

**Fallback de imagen:** usar `onError` en `<img>` para NO actualizar el índice activo si la carga falla.

**Código completo sugerido:**
```typescript
import { useState, useCallback } from 'react'
import { useInterval } from '../hooks/useInterval'
import type { Photo } from '../types/Photo'

const CROSSFADE_DURATION_MS = 2500
const PHOTO_INTERVAL_MS = 30000

interface PhotoSlideProps {
  photos: Photo[]
  intervalMs?: number
}

export function PhotoSlide({ photos, intervalMs = PHOTO_INTERVAL_MS }: PhotoSlideProps) {
  const [activeLayer, setActiveLayer] = useState<0 | 1>(0)
  const [layerSrc, setLayerSrc] = useState<[string, string]>(['', ''])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [errorIndexes, setErrorIndexes] = useState<Set<number>>(new Set())

  // Estado vacío
  if (photos.length === 0) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        backgroundColor: '#1A1210',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}>
        <p style={{ color: '#F5F0E8', opacity: 0.6, fontSize: '24px', fontFamily: 'Inter, sans-serif' }}>
          Preparando tus fotos...
        </p>
      </div>
    )
  }

  // Para 1 sola foto: mostrar sin crossfade
  if (photos.length === 1) {
    return (
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent', userSelect: 'none',
      }}>
        <img
          src={photos[0].localPath}
          style={{ width: '100%', height: '100%', objectFit: 'cover',
                   filter: 'saturate(0.85) brightness(0.95) sepia(0.08)' }}
          alt=""
        />
        <div style={{ position: 'absolute', inset: 0,
                      backgroundColor: 'rgba(245,235,210,0.06)', pointerEvents: 'none' }} />
      </div>
    )
  }

  // ... resto: crossfade logic con useInterval
}
```

**Nota importante:** El componente debe usar `useCallback` + `useInterval` para el avance automático. La lógica de avance salta fotos con error acumulado en `errorIndexes`.

---

### Implementación — `KioskScreen.tsx`

KioskScreen es el contenedor que lee `contentStore.photos` y renderiza `PhotoSlide`. En esta story, KioskScreen = básicamente `PhotoSlide` + las capas de contenido (YiddishPhrase, BirthdayCountdown vendrán en Story 2.2/2.3).

```typescript
import { useContentStore } from '../stores/contentStore'
import { PhotoSlide } from '../components/PhotoSlide'

export function KioskScreen() {
  const photos = useContentStore((state) => state.photos)

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <PhotoSlide photos={photos} />
      {/* Story 2.2: <YiddishPhrase /> */}
      {/* Story 2.3: <DateDisplay /> <BirthdayCountdown /> */}
    </div>
  )
}
```

---

### Implementación — `App.tsx` (actualizar)

Reemplazar el placeholder de Story 1.1 con routing condicional basado en `displayStore.mode`:

```typescript
import { useDisplayStore } from './stores/displayStore'
import { KioskScreen } from './screens/KioskScreen'

function App() {
  const mode = useDisplayStore((state) => state.mode)

  // WelcomeScreen y AdminScreen vendrán en stories posteriores
  // Mientras tanto, KioskScreen es el entry point (mode='welcome' también la muestra)
  return <KioskScreen />
}
```

**Por qué renderizar KioskScreen siempre en esta story:** WelcomeScreen (Story 3.x) y AdminScreen (Story 5.x) no existen aún. El `mode` empieza en `'welcome'` pero KioskScreen es el único renderizable. Este `App.tsx` se refinará en Story 3.1 cuando exista WelcomeScreen.

---

### Foto en desarrollo — empty state esperado

En desarrollo, `contentStore.photos` arranca como `[]` (no hay fotos reales todavía — sync viene en Epic 4). El AC5 (estado vacío) es el comportamiento visible en desarrollo. Esto es correcto.

Para testear el crossfade durante desarrollo, se pueden agregar fotos temporales al store:
```typescript
// En browser console:
window.__zustand_contentStore?.setState({ photos: [
  { id: '1', localPath: 'https://picsum.photos/1920/1080?1', syncedAt: '2026-04-15' },
  { id: '2', localPath: 'https://picsum.photos/1920/1080?2', syncedAt: '2026-04-15' },
]})
```

---

### Reglas arquitectónicas (enforcement)

- `PhotoSlide` es componente puro — recibe props, no accede a stores directamente
- Solo `KioskScreen` (screen) lee del store — pasa los datos como props a componentes
- Errores de carga de imagen: NUNCA propagar al usuario — silenciar completamente
- No usar `alert()`, `toast()`, ni overlays de error visibles en KioskScreen
- Estilos: usar Tailwind classes donde sea posible; inline styles solo para valores dinámicos

---

### Scope — qué NO entra en esta story

- NO crear YiddishPhrase, DateDisplay, BirthdayCountdown (Story 2.2/2.3)
- NO implementar night mode ni pixel shifting (Story 2.4/2.5)
- NO conectar con GestureDetector ni PinEntry (Story 5.x)
- NO implementar lógica de persistencia de foto actual — el índice se resetea en cada restart
- NO crear WelcomeScreen (Story 3.x)
- El crossfade timer NO se pausa en modo admin todavía (viene en Story 5.x)

---

### Learnings de Stories anteriores

- TypeScript strict: todos los campos requeridos, no `as` casts innecesarios
- Exports nombrados: `export function PhotoSlide`, `export function KioskScreen`
- `npx tsc --noEmit` verifica `src/` completo
- Zustand selector pattern: `useContentStore((state) => state.photos)` — no desestructurar el store completo
- Inline styles para valores dinámicos; clases Tailwind para estáticos

---

### Referencias

- [Source: epics.md#Story 2.1] — ACs completos
- [Source: ux-design-specification.md#Customization Strategy] — `filter: saturate(0.85) brightness(0.95) sepia(0.08)`, linen overlay
- [Source: ux-design-specification.md#Color System] — `frame-paper: rgba(245, 235, 210, 0.06)`
- [Source: ux-design-specification.md#Mecánica del loop diario] — crossfade 30s, precarga silenciosa
- [Source: architecture.md#Frontend Architecture] — `PhotoSlide` en components/, `KioskScreen` en screens/, stores solo desde screens

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_ninguno — implementación directa sin obstáculos_

### CR Patches Applied

- **AC3 fix:** Conditional render (`{!currentErrored && <img>}`) — errored imgs are removed from DOM, no broken-image indicator shown. Previous photo remains visible via bottom layer.
- **setTimeout cleanup:** `useEffect(() => () => clearTimeout(timeoutRef.current), [])` — no leaks on unmount.
- **isTransitioning guard:** `if (isTransitioningRef.current) return` at top of `advance` — prevents double-advance and stacked transitions.
- **Stale closure in onError:** `curIdxRef` and `nextIdxRef` used inside `onError` handlers — captures the live index at error time, not the closed-over value.
- **Out-of-bounds on array shrink:** `safeCurrentIdx = Math.min(curIdx, photos.length - 1)` — guards against index exceeding shrunken array.
- **Capacitor.convertFileSrc():** `toDisplayUrl()` helper wraps `localPath` — converts `file://` paths for Capacitor WebView; falls back to raw path in browser/dev mode.

### Completion Notes List

- ✅ AC1: Crossfade 2500ms ease-in-out cada 30s. Dos capas img (top/bottom) alternando opacity. Top se desvanece revelando bottom (foto siguiente). Tras la transición, top toma la nueva foto y bottom precarga la siguiente.
- ✅ AC2: `filter: saturate(0.85) brightness(0.95) sepia(0.08)`. Overlay `rgba(245,235,210,0.06)` (frame-paper token). Layout `position: fixed` top/right/bottom/left: 0.
- ✅ AC3: `onError` en ambas capas agrega el índice a `errored: Set<number>`. `getNextIdx` salta índices en error. La foto anterior permanece visible si la siguiente falla.
- ✅ AC4: `useInterval` recibe `delay: null` cuando `photos.length <= 1` — pausa el intervalo.
- ✅ AC5: `photos.length === 0` renderiza fondo `#1A1210` + "Preparando tus fotos..." en `#F5F0E8` al 60% de opacidad, Inter 300, 24px.
- ✅ AC6: `WebkitTapHighlightColor: 'transparent'` y `userSelect: 'none'` en ambos estados (vacío y con fotos).
- `npx tsc --noEmit` ✅ · `npm run build` ✅ (37 módulos).

### File List

- `src/hooks/useInterval.ts`
- `src/components/PhotoSlide.tsx`
- `src/screens/KioskScreen.tsx`
- `src/App.tsx` (modificado)
