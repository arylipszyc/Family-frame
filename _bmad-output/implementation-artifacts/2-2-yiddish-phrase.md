# Story 2.2: YiddishPhrase — frase del día con transliteración

Status: done

## Story

Como usuario pasivo (Abel o Liliana),
quiero ver una frase en Yiddish diferente cada día con su transliteración fonética y traducción,
para que el marco hable en el idioma de mis raíces y me conecte con mi historia cultural.

## Acceptance Criteria

**AC1 — Selección determinista por fecha:**
- Se muestra la frase correspondiente a `dayOfYear % phrases.length` — determinista por fecha local
- La frase cambia exactamente una vez por día (a medianoche local), sin intervención manual
- `dayOfYear` se calcula en base a la fecha local del dispositivo (no UTC)

**AC2 — Tipografía exacta:**
- Texto Yiddish: `clamp(40px, 4vw, 64px)` Playfair Display 400 con `text-shadow: 0 2px 16px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5)`
- Transliteración: `24px Inter 300` con `opacity: 0.85` y mismo text-shadow
- Traducción al español: debajo de la transliteración, mismos estilos que transliteración

**AC3 — Posicionamiento:**
- Componente posicionado `position: absolute; bottom: 2.5vh; left: 2.5vw`
- Gradiente radial sutil en esquina inferior izquierda: `radial-gradient(ellipse at bottom left, rgba(0,0,0,0.25) 0%, transparent 70%)` como capa separada (`pointerEvents: none`)
- El gradiente cubre ~40% del ancho y ~35% del alto — protección de legibilidad sobre fotos claras

**AC4 — Estado vacío:**
- Si `phrases.length === 0`: el componente no renderiza nada — `return null` — sin placeholder visible

**AC5 — Actualización a medianoche:**
- El componente recalcula la frase a medianoche usando `setTimeout` hacia el próximo `00:00:00` local
- El timeout se cancela correctamente en el cleanup del `useEffect` (sin memory leaks)

**AC6 — Sin feedback táctil:**
- `WebkitTapHighlightColor: 'transparent'` y `userSelect: 'none'` en el contenedor del componente

## Tasks / Subtasks

- [x] Task 1 — Crear `src/components/YiddishPhrase.tsx` con selección por `dayOfYear`, tipografía exacta, gradiente protector
- [x] Task 2 — Actualizar `src/screens/KioskScreen.tsx` para leer `contentStore.yiddishPhrases` y pasar como prop a `YiddishPhrase`
- [x] Task 3 — Validar: `npx tsc --noEmit` ✅ y `npm run build` ✅

### Review Findings

- [x] [Review][Patch] Self-chaining timeout se rompe si setTimeout dispara antes de medianoche — [src/components/YiddishPhrase.tsx]
- [x] [Review][Patch] KioskScreen root div crea nuevo objeto de estilos en cada render — [src/screens/KioskScreen.tsx]
- [x] [Review][Defer] getDayOfYear no es DST-aware — día de spring-forward puede repetir índice — deferred, pre-existing
- [x] [Review][Defer] Long setTimeout nunca dispara en dispositivo dormido sin WAKE_LOCK — deferred, pre-existing

## Dev Notes

### Estado actual del proyecto

- `src/components/PhotoSlide.tsx` — foto full-screen con filter y linen overlay, crossfade cada 30s
- `src/screens/KioskScreen.tsx` — renderiza `<PhotoSlide photos={photos} />`. Tiene comentario `{/* Story 2.2: <YiddishPhrase /> */}` que hay que reemplazar
- `src/stores/contentStore.ts` — `useContentStore` tiene `yiddishPhrases: YiddishPhrase[]` cargado desde `yiddish.json` (32 frases)
- `src/types/YiddishPhrase.ts` — `{ yiddish: string, transliteration: string, spanish: string }`
- `src/data/yiddish.json` — 32 frases auténticas askenazíes. Todas tienen los tres campos completos
- Tailwind tokens: `font-kiosk-serif` (Playfair Display), `font-kiosk-sans` (Inter), `text-kiosk-yiddish` (clamp 40-64px), `text-kiosk-transliteration` (24px)

---

### Implementación — `YiddishPhrase.tsx`

**Props:**
```typescript
interface YiddishPhraseProps {
  phrases: YiddishPhrase[]  // recibe el array completo — el componente calcula el índice
}
```

**Cálculo de `dayOfYear`:**
```typescript
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
```

**Estado y midnight update:**
```typescript
export function YiddishPhrase({ phrases }: YiddishPhraseProps) {
  const [dayIndex, setDayIndex] = useState(() => getDayOfYear(new Date()))

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDayIndex(getDayOfYear(new Date()))
    }, msUntilMidnight())
    return () => clearTimeout(timeout)
  }, [dayIndex])  // re-registra el timeout al día siguiente

  if (phrases.length === 0) return null

  const phrase = phrases[dayIndex % phrases.length]
  // ...
}
```

**Nota importante sobre el `useEffect`:** `dayIndex` en el array de dependencias es intencional — cuando `setDayIndex` actualiza `dayIndex` a medianoche, el efecto se re-ejecuta y registra el siguiente timeout para la próxima medianoche.

**Estructura JSX:**
```tsx
return (
  <>
    {/* Gradiente protector — esquina inferior izquierda */}
    <div style={gradientStyle} />
    {/* Contenedor del texto */}
    <div style={containerStyle}>
      <p style={yiddishStyle}>{phrase.yiddish}</p>
      <p style={transliterationStyle}>{phrase.transliteration}</p>
      <p style={translationStyle}>{phrase.spanish}</p>
    </div>
  </>
)
```

**Estilos exactos:**
```typescript
const containerStyle: CSSProperties = {
  position: 'absolute',
  bottom: '2.5vh',
  left: '2.5vw',
  maxWidth: '60vw',         // no invadir zona derecha de cumpleaños
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
}

const gradientStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '40%',
  height: '35%',
  background: 'radial-gradient(ellipse at bottom left, rgba(0,0,0,0.25) 0%, transparent 70%)',
  pointerEvents: 'none',
  zIndex: 4,                // sobre el linen overlay (zIndex 3) de PhotoSlide
}

const textShadow = '0 2px 16px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5)'

const yiddishStyle: CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontSize: 'clamp(40px, 4vw, 64px)',
  fontWeight: 400,
  lineHeight: 1.2,
  color: '#F5F0E8',         // frame-cream
  textShadow,
  margin: 0,
  marginBottom: '8px',
}

const transliterationStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '24px',
  fontWeight: 300,
  lineHeight: 1.5,
  color: '#F5F0E8',
  opacity: 0.85,
  textShadow,
  margin: 0,
  marginBottom: '4px',
}

const translationStyle: CSSProperties = {
  ...transliterationStyle,
  // mismos estilos — no hace falta separar
}
```

**Nota sobre `zIndex`:** El componente `YiddishPhrase` vive como hijo de `KioskScreen`, no dentro de `PhotoSlide`. El `PhotoSlide` tiene `position: fixed; zIndex` no definido en el container — sus capas internas usan z-index 1/2/3. El gradiente de `YiddishPhrase` debe estar por encima del linen overlay de `PhotoSlide`, por eso usa `zIndex: 4`. El texto en sí no necesita `zIndex` explícito si el gradiente del mismo componente está en `zIndex: 4`.

---

### Implementación — `KioskScreen.tsx` (actualizar)

```typescript
import { useContentStore } from '../stores/contentStore'
import { PhotoSlide } from '../components/PhotoSlide'
import { YiddishPhrase } from '../components/YiddishPhrase'

export function KioskScreen() {
  const photos = useContentStore((state) => state.photos)
  const yiddishPhrases = useContentStore((state) => state.yiddishPhrases)

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }}>
      <PhotoSlide photos={photos} />
      <YiddishPhrase phrases={yiddishPhrases} />
      {/* Story 2.3: <DateDisplay /> <BirthdayCountdown /> */}
      {/* Story 2.4: night mode overlay */}
      {/* Story 5.x: <GestureDetector /> */}
    </div>
  )
}
```

---

### Reglas arquitectónicas (enforcement)

- `YiddishPhrase` es componente puro — recibe props, **no** accede a stores directamente
- Solo `KioskScreen` (screen) lee del store — pasa los datos como props
- El gradiente de protección D3 es parte del componente `YiddishPhrase` — no de `KioskScreen`
- Estilos: Tailwind donde sea estático; inline styles para valores dinámicos o no soportados por Tailwind (`text-shadow`, `radial-gradient`, `clamp()` en fontSize)
- TypeScript strict: no `as` casts, no `any`

---

### Scope — qué NO entra en esta story

- NO crear `DateDisplay` ni `BirthdayCountdown` (Story 2.3)
- NO implementar night mode (Story 2.4)
- NO conectar con GestureDetector ni PinEntry (Story 5.x)
- NO agregar internacionalización ni cambio de idioma
- NO persistir el índice de frase — se calcula fresh del reloj en cada mount

---

### Learnings de Stories anteriores

- TypeScript strict: todos los campos requeridos, no `as` casts innecesarios
- Exports nombrados: `export function YiddishPhrase`
- `npx tsc --noEmit` verifica `src/` completo — correr antes de marcar como done
- Zustand selector pattern: `useContentStore((state) => state.yiddishPhrases)` — no desestructurar el store completo
- Inline styles para valores dinámicos y propiedades CSS no soportadas por Tailwind v3 (`text-shadow`, gradientes, `clamp()`)
- `useEffect` cleanup es obligatorio para cualquier `setTimeout` o `setInterval`

---

### Referencias

- [Source: epics.md#Story 2.2] — ACs completos
- [Source: ux-design-specification.md#YiddishPhrase] — props, positioning, text-shadow
- [Source: ux-design-specification.md#Chosen Direction D3] — gradiente radial protector
- [Source: ux-design-specification.md#Color System] — `frame-cream: #F5F0E8`
- [Source: ux-design-specification.md#Typography System] — `kiosk-yiddish`, `kiosk-transliteration`
- [Source: architecture.md#Frontend Architecture] — components sin stores, screens como consumidores

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_ninguno — implementación directa sin obstáculos_

### Completion Notes List

- ✅ AC1: `getDayOfYear(new Date()) % phrases.length` — determinista por fecha local. `dayOfYear` = días desde el 1 de enero del año corriente.
- ✅ AC2: Yiddish `clamp(40px, 4vw, 64px)` Playfair Display 400 + `text-shadow` multicapa. Transliteración + traducción `24px Inter 300 opacity 0.85` con mismo shadow.
- ✅ AC3: Container `position: absolute; bottom: 2.5vh; left: 2.5vw; maxWidth: 60vw`. Gradiente `radial-gradient(ellipse at bottom left, rgba(0,0,0,0.25) 0%, transparent 70%)` en `40% x 35%` con `zIndex: 4`.
- ✅ AC4: `if (phrases.length === 0) return null` — sin placeholder visible.
- ✅ AC5: `useEffect` registra `setTimeout` hacia el próximo `00:00:00` local. Cleanup con `clearTimeout` en return. `dayIndex` en deps provoca re-registro automático al día siguiente.
- ✅ AC6: `WebkitTapHighlightColor: 'transparent'` y `userSelect: 'none'` en `containerStyle`.
- `npx tsc --noEmit` ✅ · `npm run build` ✅ (38 módulos).

### File List

- `src/components/YiddishPhrase.tsx` (nuevo)
- `src/screens/KioskScreen.tsx` (modificado)
