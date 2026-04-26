# Story 2.4: Night mode automático

Status: done

## Story

Como usuario pasivo (Abel o Liliana),
quiero que el marco se atenúe gradualmente de noche y vuelva a la luminosidad normal de día,
para que no moleste en condiciones de poca luz y el marco respire con el ritmo del hogar.

## Acceptance Criteria

**AC1 — Fade a noche (22:00):**
- Al llegar a las 22:00 locales: overlay CSS `rgba(20, 10, 5, 0.3)` hace fade-in en 60 segundos `linear`
- Simultáneamente: se intenta reducir el brillo de pantalla a 15% via `trySetBrightness(0.15)` (sin-op si plugin no disponible)

**AC2 — Fade a día (07:00):**
- Al llegar a las 07:00 locales: el overlay hace fade-out en 60 segundos `linear`
- Simultáneamente: se intenta restaurar el brillo a 100% via `trySetBrightness(1.0)`

**AC3 — Estado inicial correcto:**
- Al montar, si la hora actual está entre 22:00 y 07:00: el overlay aparece **sin animación** (opacity: 1 inmediato)
- Si la hora está entre 07:00 y 22:00: el overlay está oculto (opacity: 0)

**AC4 — El overlay no bloquea interacción:**
- `pointer-events: none` en el overlay — no intercepta taps ni gestos del GestureDetector futuro

**AC5 — Sin feedback táctil visible:**
- `WebkitTapHighlightColor: 'transparent'` y `userSelect: 'none'` en el overlay

## Tasks / Subtasks

- [x] Task 1 — Crear `src/components/NightModeOverlay.tsx` con overlay CSS, timing logic, y abstracción de brillo
- [x] Task 2 — Actualizar `src/screens/KioskScreen.tsx` para renderizar `<NightModeOverlay />`
- [x] Task 3 — Validar: `npx tsc --noEmit` ✅ y `npm run build` ✅

## Dev Notes

### Estado actual del proyecto

- `src/screens/KioskScreen.tsx` — renderiza PhotoSlide, YiddishPhrase, DateDisplay, BirthdayCountdown. Tiene comentario `{/* Story 2.4: night mode overlay */}` a reemplazar
- Patrón de timeout recursivo establecido en YiddishPhrase y DateDisplay — reutilizar aquí
- `@capacitor-community/screen-brightness` **NO instalado** — usar abstracción no-op por ahora

---

### Implementación — `NightModeOverlay.tsx`

**Lógica de horario:**
```typescript
const NIGHT_START_HOUR = 22   // 22:00 local
const NIGHT_END_HOUR = 7      // 07:00 local

function isNightTime(date: Date): boolean {
  const h = date.getHours()
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR
}

// Ms hasta el próximo umbral (22:00 o 07:00) desde `now`
function msUntilNextThreshold(now: Date): number {
  const h = now.getHours()
  const m = now.getMinutes()
  const s = now.getSeconds()
  const ms = now.getMilliseconds()

  if (h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR) {
    // Estamos de noche → próximo umbral es las 07:00
    const target = new Date(now)
    if (h >= NIGHT_START_HOUR) {
      // Es después de las 22 → 07:00 es mañana
      target.setDate(target.getDate() + 1)
    }
    target.setHours(NIGHT_END_HOUR, 0, 0, 0)
    return target.getTime() - now.getTime()
  } else {
    // Estamos de día → próximo umbral es las 22:00
    const target = new Date(now)
    target.setHours(NIGHT_START_HOUR, 0, 0, 0)
    return target.getTime() - now.getTime()
  }
}
```

**Abstracción de brillo (no-op si plugin no instalado):**
```typescript
async function trySetBrightness(value: number): Promise<void> {
  try {
    // Lazy-import evita error en browser/dev mode
    const { ScreenBrightness } = await import('@capacitor-community/screen-brightness')
    await ScreenBrightness.setBrightness({ brightness: value })
  } catch {
    // Plugin no disponible o error nativo — silencioso
  }
}
```

**Nota:** `@capacitor-community/screen-brightness` no está en package.json. El `import()` dinámico falla silenciosamente en dev y en builds donde el plugin no está instalado. Cuando se instale (`npm install @capacitor-community/screen-brightness`), funcionará sin cambios de código.

**Componente:**
```typescript
export function NightModeOverlay() {
  const [isNight, setIsNight] = useState(() => isNightTime(new Date()))
  const [animate, setAnimate] = useState(false)  // false en mount = sin transición

  useEffect(() => {
    // Aplicar brillo inicial sin animación
    void trySetBrightness(isNightTime(new Date()) ? 0.15 : 1.0)

    // Habilitar animaciones a partir del segundo render
    const enableTimer = setTimeout(() => setAnimate(true), 100)

    let timeout: ReturnType<typeof setTimeout>
    function scheduleNext() {
      timeout = setTimeout(() => {
        const night = isNightTime(new Date())
        setIsNight(night)
        void trySetBrightness(night ? 0.15 : 1.0)
        scheduleNext()
      }, msUntilNextThreshold(new Date()))
    }
    scheduleNext()

    return () => {
      clearTimeout(enableTimer)
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0, left: 0,
        backgroundColor: 'rgba(20, 10, 5, 0.3)',
        opacity: isNight ? 1 : 0,
        transition: animate ? 'opacity 60s linear' : 'none',
        pointerEvents: 'none',
        zIndex: 10,
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    />
  )
}
```

**Por qué `animate` flag:** En el mount inicial el componente debe reflejar el estado de noche/día **sin animación** (AC3). Si usamos transition desde el inicio, al montar en modo noche haría un fade-in de 60s en lugar de aparecer inmediatamente. El flag `animate` se habilita con un pequeño delay (100ms post-mount) para que el primer render no anime pero los cambios de estado posteriores sí lo hagan.

---

### Implementación — `KioskScreen.tsx` (actualizar)

Agregar `<NightModeOverlay />` y remover el comentario `{/* Story 2.4: night mode overlay */}`:

```typescript
import { NightModeOverlay } from '../components/NightModeOverlay'

// En el return:
<div style={rootStyle}>
  <PhotoSlide photos={photos} />
  <YiddishPhrase phrases={yiddishPhrases} />
  <DateDisplay />
  <BirthdayCountdown birthdays={birthdays} rotationSlot={rotationSlot} />
  <NightModeOverlay />
  {/* Story 5.x: <GestureDetector /> */}
</div>
```

---

### Reglas arquitectónicas

- `NightModeOverlay` es componente autocontenido — no recibe props, no accede a stores
- `trySetBrightness` es función módulo-local, no exportada
- El `import()` dinámico de `@capacitor-community/screen-brightness` garantiza que la app no rompa si el módulo no existe
- TypeScript: el `catch` sin variable (`catch {`) es válido en TS 4+ — compatible con nuestro config strict

---

### Scope — qué NO entra

- NO instalar `@capacitor-community/screen-brightness` en esta story (se puede hacer independientemente)
- NO configurar horario desde Admin (Story 5.x)
- NO pixel shifting (Story 2.5)

---

### Referencias

- [Source: epics.md#Story 2.4] — ACs
- [Source: ux-design-specification.md#Customization Strategy] — overlay rgba(20,10,5,0.3), brightness plugin
- [Source: ux-design-specification.md#Animation Timing] — 60s linear para night mode dimming
- [Source: 2-2-yiddish-phrase.md] — patrón timeout recursivo

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Build fallo inicial: dynamic `import('@capacitor-community/screen-brightness')` no resuelto por Rollup. Fix: reemplazado por acceso via `window.Capacitor.Plugins` registry — sin static import, sin dependencia en el módulo.

### Completion Notes List

- ✅ AC1: Overlay `rgba(20,10,5,0.3)` con `transition: opacity 60s linear` al activarse a las 22:00. `trySetBrightness(0.15)` via Capacitor plugin registry.
- ✅ AC2: Fade-out 60s a las 07:00. `trySetBrightness(1.0)`.
- ✅ AC3: `useState(() => isNightTime(new Date()))` — estado inicial sin animación. Flag `animate` habilitado 100ms post-mount vía `setTimeout`.
- ✅ AC4: `pointerEvents: 'none'`.
- ✅ AC5: `WebkitTapHighlightColor: 'transparent'`, `userSelect: 'none'`.
- `trySetBrightness` usa `window.Capacitor.Plugins.ScreenBrightness` — no-op en browser. Compatible sin instalar `@capacitor-community/screen-brightness`.
- `npx tsc --noEmit` ✅ · `npm run build` ✅ (41 módulos).

### File List

- `src/components/NightModeOverlay.tsx` (nuevo)
- `src/screens/KioskScreen.tsx` (modificado)
