# Story 5.1: Gesto oculto y autenticación PIN

Status: done

## Story

Como administrador (Ary),
quiero activar el panel admin con un gesto secreto seguido de un PIN,
para que Abel y Liliana nunca accedan accidentalmente a la configuración, pero yo pueda hacerlo rápido cuando lo necesito.

## Acceptance Criteria

**AC1 — Detección de gesto:**
- Dado el KioskScreen activo, cuando Ary da 5 taps consecutivos en la esquina inferior izquierda en menos de 3 segundos, entonces `GestureDetector` detecta el gesto y muestra el modal `PinEntry`
- No hay ningún feedback visual durante la detección — el gesto es completamente secreto

**AC2 — Renderizado del modal PinEntry:**
- Hay un teclado numérico virtual de 10 dígitos (no usa el teclado del sistema)
- Los dígitos ingresados se muestran como `● ● ● ●` — nunca en texto visible
- Cada tecla tiene touch target mínimo de 64×64px
- El backdrop es `rgba(0,0,0,0.85)` — el KioskScreen permanece detrás pero oscurecido

**AC3 — PIN correcto:**
- El modal hace crossfade de 0.5 segundos hacia `AdminScreen`
- `adminStore.setAuthenticated(true)` es llamado
- `displayStore.setMode('admin')` es llamado

**AC4 — PIN incorrecto:**
- Los puntos del PIN hacen un shake sutil (animación CSS) sin mensaje de texto
- El campo se limpia para reintento

**AC5 — 3 intentos fallidos:**
- El modal se cierra silenciosamente — sin mensaje de error, sin indicación
- `adminStore.isAuthenticated` permanece en `false`
- El KioskScreen vuelve al estado normal

**AC6 — Almacenamiento seguro del PIN:**
- El PIN está almacenado como hash bcrypt — nunca como texto plano (NFR10)
- El PIN por defecto inicial es '1234', hasheado desde el primer inicio
- Clave en `@capacitor/preferences`: `adminPin`

## Tasks / Subtasks

- [x] Task 1 — `pinService.ts`: init, verify y setPin con bcryptjs
  - [x] 1.1 — `initPin()`: si no existe hash en preferences, guardar hash de '1234'
  - [x] 1.2 — `verifyPin(entered: string): Promise<boolean>`: comparar con hash almacenado
  - [x] 1.3 — `setPin(newPin: string): Promise<void>`: guardar nuevo hash
  - [x] 1.4 — Tests: initPin (primera vez y ya existente), verifyPin (correcto, incorrecto), setPin — 7 tests ✅

- [x] Task 2 — `GestureDetector.tsx`: zona invisible de tap en esquina inferior izquierda
  - [x] 2.1 — Zona táctil 120×120px, `position: fixed; bottom: 0; left: 0`, completamente invisible
  - [x] 2.2 — Acumular timestamps de taps; si 5 taps en <3s → llamar `onGestureDetected()`
  - [x] 2.3 — Reset del acumulador si pasa >3s desde el primer tap
  - [x] 2.4 — Tests: 5 taps rápidos → dispara; 5 taps lentos → no dispara; 4 taps → no dispara — 5 tests ✅

- [x] Task 3 — `PinEntry.tsx`: modal de entrada de PIN con teclado virtual
  - [x] 3.1 — Backdrop `rgba(0,0,0,0.85)` con `position: fixed; inset: 0`
  - [x] 3.2 — Teclado numérico 3×4; touch target 64×64px
  - [x] 3.3 — Mostrar dígitos ingresados como puntos (`●`); máximo 4 dígitos; botón de borrar último
  - [x] 3.4 — Al completar 4 dígitos → llamar `onPinComplete(pin: string)`
  - [x] 3.5 — Prop `shaking: boolean` → aplica clase CSS `pin-shake` al contenedor de puntos
  - [x] 3.6 — Prop `visible: boolean` → controla opacity + transición 0.5s
  - [x] 3.7 — Tests: render, ingreso de dígitos, callback al 4to dígito, prop shaking, borrar — 10 tests ✅

- [x] Task 4 — Integración en KioskScreen + lógica de autenticación
  - [x] 4.1 — Agregar `<GestureDetector>` como hijo de KioskScreen
  - [x] 4.2 — Estado en KioskScreen: `showPin`, `pinShaking`, `pinAttempts`
  - [x] 4.3 — `onGestureDetected`: llamar `pinService.initPin()` → mostrar modal
  - [x] 4.4 — `onPinComplete`: verificar con `pinService.verifyPin()`; correcto → fade + setMode; incorrecto → shake + 3 intentos → cerrar silencioso

- [x] Task 5 — Validación final: `npx tsc --noEmit` ✅ y `npm run test` ✅ — 64/64 tests

### Review Findings

- [x] [Review][Patch] Stale closure en `handlePinComplete` — reemplazado `useState` por `useRef` para `pinAttempts`; eliminada dependencia del closure [KioskScreen.tsx:75-85]
- [x] [Review][Patch] Dígitos no se limpian tras PIN incorrecto — agregada prop `resetKey` a PinEntry; KioskScreen incrementa `pinResetKey` tras cada intento fallido [PinEntry.tsx:76-78]
- [x] [Review][Patch] Shake en el 3er intento falla AC5 — `setPinShaking` solo se llama si `nextAttempts < 3`; lockout cierra silenciosamente sin animación [KioskScreen.tsx:73-84]
- [x] [Review][Patch] `initPin()` llamado con gesto, no al arranque — movido a `App.tsx` Promise.all en el init; siempre se ejecuta en el primer inicio [App.tsx]
- [x] [Review][Patch] Sin manejo de error en `Preferences` API — agregado try-catch en `handleGestureDetected` y `handlePinComplete`; fallo cierra modal silenciosamente [KioskScreen.tsx:53-70]
- [x] [Review][Defer] `shakeStyleInjected` es singleton de módulo — orden-dependiente en tests y sensible a HMR; aceptable en producción [PinEntry.tsx:13] — deferred, impacto bajo
- [x] [Review][Defer] `setPin` sin validación de entrada — longitud/formato no chequeados; corresponde a Story 5.3 donde se implementa la UI de cambio de PIN [pinService.ts:22] — deferred, fuera de scope 5.1
- [x] [Review][Defer] Hash bcrypt de PIN de 4 dígitos brute-forceable offline — 10k posibilidades; riesgo aceptable para kiosk familiar en dispositivo no-rooteado [pinService.ts] — deferred, riesgo aceptable
- [x] [Review][Defer] Lockout sin cooldown persistente — gesture re-triggereable inmediatamente; 3 intentos reinician sin penalización temporal [KioskScreen.tsx] — deferred, MVP familiar
- [x] [Review][Defer] `setTimeout` para store updates post-fade — riesgo teórico de update en componente desmontado; KioskScreen raramente desmonta [KioskScreen.tsx:64-68] — deferred, teórico
- [x] [Review][Defer] DEFAULT_PIN '1234' hardcodeado en source — conocido, equivale a "cambiar en setup inicial" como cualquier dispositivo [pinService.ts:5] — deferred, aceptable MVP
- [x] [Review][Defer] `key={idx}` en array `keys` de PinEntry — array siempre 12 ítems fijos; sin impacto funcional [PinEntry.tsx] — deferred, sin impacto

## Dev Notes

### Estado actual del proyecto

- `src/screens/AdminScreen.tsx` — placeholder existente, se muestra cuando `displayStore.mode === 'admin'`
- `src/stores/adminStore.ts` — `isAuthenticated: boolean`, `setAuthenticated(value: boolean)` disponibles
- `src/stores/displayStore.ts` — `mode: AppMode`, `setMode(mode)` disponible
- `src/screens/KioskScreen.tsx` — tiene comentario `{/* Story 5.x: <GestureDetector /> */}` para reemplazar
- `bcryptjs` — ya instalado con tipos incluidos (`umd/index.d.ts`)

### Dependencias a NO instalar

No se requieren nuevas dependencias — `bcryptjs` ya está en package.json.

### Implementación sugerida — pinService.ts

```typescript
import { Preferences } from '@capacitor/preferences'
import bcrypt from 'bcryptjs'

const PIN_KEY = 'adminPin'
const DEFAULT_PIN = '1234'
const SALT_ROUNDS = 10

export const pinService = {
  async initPin(): Promise<void> {
    const { value } = await Preferences.get({ key: PIN_KEY })
    if (!value) {
      const hash = await bcrypt.hash(DEFAULT_PIN, SALT_ROUNDS)
      await Preferences.set({ key: PIN_KEY, value: hash })
    }
  },

  async verifyPin(entered: string): Promise<boolean> {
    const { value } = await Preferences.get({ key: PIN_KEY })
    if (!value) return false
    return bcrypt.compare(entered, value)
  },

  async setPin(newPin: string): Promise<void> {
    const hash = await bcrypt.hash(newPin, SALT_ROUNDS)
    await Preferences.set({ key: PIN_KEY, value: hash })
  },
}
```

### Implementación sugerida — GestureDetector.tsx

```typescript
// Zona invisible — 120×120px, fixed, bottom-left
// Acumula timestamps; si 5 en <3000ms → onGestureDetected()
// Sin feedback visual en ningún momento
```

### Implementación sugerida — PinEntry.tsx

```typescript
// Layout: backdrop fijo + panel centrado
// Teclado 3×4: filas [1,2,3], [4,5,6], [7,8,9], [←,0,✓]
// ✓ no existe como tecla — el submit es automático al 4to dígito
// ← borra el último dígito
// Animación shake: @keyframes shake con transform translateX
// Transición de visibilidad: opacity 0→1 en 0s al mount, 1→0 en 0.5s al dismiss
```

### Animación shake

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-8px); }
  40%       { transform: translateX(8px); }
  60%       { transform: translateX(-5px); }
  80%       { transform: translateX(5px); }
}
```

Inyectar con `<style>` tag o con `document.head` en el componente.

### Reglas arquitectónicas

- `GestureDetector` no tiene estado de autenticación — solo detecta el gesto y llama callback
- `PinEntry` no llama directamente a stores — recibe props y llama callbacks
- La lógica de autenticación (intentos, timeouts, setMode) vive en `KioskScreen`
- `pinService` es un singleton objeto (igual que `storageService`, `oauthService`)
- TypeScript strict: no `any`, no `as` casts

### Scope — qué NO entra

- NO implementar GestureDetector para otras pantallas que no sean KioskScreen
- NO implementar UI de cambio de PIN (eso es Story 5.3)
- NO agregar timeout de sesión admin (no requerido en MVP)

### Referencias

- [Source: epics.md#Story 5.1] — ACs
- [Source: architecture.md#Admin PIN] — bcryptjs, preferences key
- [Source: architecture.md#useAdminStore] — estado admin

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_ninguno_

### Completion Notes List

- `pinService.ts`: singleton con initPin/verifyPin/setPin usando bcryptjs + @capacitor/preferences key `adminPin`. PIN default '1234'.
- `GestureDetector.tsx`: zona invisible 120×120px bottom-left; acumula timestamps con filtro de ventana 3s; sin feedback visual.
- `PinEntry.tsx`: modal backdrop rgba(0,0,0,0.85); teclado 3×4 64×64px; puntos ●; animación shake via @keyframes inyectado una vez; visibility controlada por opacity + pointer-events.
- `KioskScreen.tsx`: integra GestureDetector + PinEntry; lógica de intentos (máx 3); fade-out 0.5s antes de setMode('admin').
- 64/64 tests pasando. TypeScript sin errores.

### File List

- `src/services/pinService.ts` (nuevo)
- `src/components/GestureDetector.tsx` (nuevo)
- `src/components/PinEntry.tsx` (nuevo)
- `src/screens/KioskScreen.tsx` (modificado)
- `src/__tests__/services/pinService.test.ts` (nuevo)
- `src/__tests__/components/GestureDetector.test.tsx` (nuevo)
- `src/__tests__/components/PinEntry.test.tsx` (nuevo)
- `src/App.tsx` (modificado — initPin en init)

### Change Log

- 2026-04-15: Story 5.1 implementada — pinService, GestureDetector, PinEntry + integración en KioskScreen. 22 tests nuevos (64 total).
