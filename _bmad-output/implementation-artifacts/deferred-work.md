# Deferred Work

## Deferred from: code review de 6-3-kiosk-mode (2026-04-15)

- **Race condition: kioskEnabled default=true antes de isInKioskMode() resuelva** — AdminScreen inicializa kioskEnabled=true síncronamente, luego async `isInKioskMode()` corrige el valor. Ventana teórica donde el botón incorrecto se muestra. En práctica inocuo: AdminScreen requiere gesture+PIN (varios segundos). Scope: hardening si se agrega loading state en Epic futuro.
- **Promise.all atomicity en config save** — Pre-existente de Story 5.3. Si una de las 3 saves falla, las otras ya completaron pero el store no se actualiza; inconsistencia transitoria entre preferences y store. Scope: refactor con rollback explícito en Epic futuro.
- **Double-fire potencial en handleBack** — Pre-existente de Epic 5. El guard `if (exiting) return` previene el primer dispatch, pero el setTimeout ya está en flight si el segundo click llega en los 2s de fade. Impacto negligible en kiosk. Scope: cosmético.

## Deferred from: code review de 5-1-gesture-pin-auth (2026-04-15)

- **`shakeStyleInjected` singleton de módulo** — Flag `let` a nivel de módulo; test order-dependiente; sensible a HMR en dev. Fix: mover la inyección a un `useEffect` con ref de guard o usar CSS-in-JS/Tailwind. Scope: refactor menor en cualquier epic.
- **`setPin` sin validación de entrada** — No valida longitud mínima, solo dígitos, ni entropía. Fix: agregar validación en la UI de cambio de PIN (Story 5.3). Scope: Story 5.3.
- **Hash bcrypt de 4 dígitos brute-forceable offline** — Solo 10k posibilidades; un device rooteado puede atacarlo offline. Aceptable para kiosk familiar. Scope: si se requiere mayor seguridad, considerar PIN de 6 dígitos en configuración inicial.
- **Lockout sin cooldown persistente** — 3 intentos fallidos cierran el modal, pero el gesto puede re-triggerearse inmediatamente. No hay penalización temporal ni contador persistente entre sesiones. Scope: Epic 6 hardening si se requiere.
- **`setTimeout` para store updates post-fade** — Riesgo teórico de update en componente desmontado si KioskScreen se desmonta en los 500ms de fade. En la práctica no ocurre. Fix: cancelar con `useRef`/`useEffect` cleanup. Scope: Epic 6 hardening.
- **DEFAULT_PIN '1234' hardcodeado en source** — Visible en el repo; Ary debe cambiar el PIN en el setup inicial desde AdminScreen. Aceptable como comportamiento "cambiar en primer uso". Scope: documentar en onboarding del dispositivo.
- **`key={idx}` en array `keys` de PinEntry** — Array siempre tiene 12 ítems; sin impacto funcional. Si cambia la forma del array, React reutilizará DOM incorrecto. Fix: usar labels únicos como keys. Scope: cosmético.

## Deferred from: code review de 2-5-pixel-shift-routing (2026-04-15)

- **Magic number `3` en bleed desconectado del shift máximo** — `rootContainerStyle` usa `-3px` y `randomShift()` retorna máximo `±2`, pero no hay relación forzada entre ellos. Si el shift máximo cambia, el bleed no se actualiza automáticamente. Fix: derivar el bleed de una constante compartida. Scope: Epic 6 hardening.
- **`randomShift()` puede retornar mismo valor en ticks consecutivos** — 25% de probabilidad de no cambiar posición en un ciclo de 3 minutos. Burn-in protection subóptima en esa instancia. Fix: excluir el valor anterior en el próximo draw. Scope: Epic 6 hardening.
- **`inset: -3px` bleed potencialmente insuficiente en DPR no-entero** — En tabletas Android con DPR 1.5x, el shift de 2 CSS px = 3 px físicos y el bleed de 3 CSS px = 4.5 px físicos; margen de 1.5 px físico que el rounding podría consumir. Fix: aumentar bleed a `-6px` para mayor seguridad. Scope: testing en dispositivo real.

## Deferred from: code review de 2-4-night-mode (2026-04-15)

- **Timer drift acumulativo en NightModeOverlay** — `scheduleNext()` se basa en `new Date()` en cada callback; latencia de ejecución acumula drift. En uptime largo, el night mode puede activarse minutos tarde. Fix: anclar a próxima hora exacta en cada callback. Scope: Epic 6 hardening.
- **Race inicial state vs useEffect en NightModeOverlay** — `useState` y `trySetBrightness` en useEffect llaman `new Date()` en momentos distintos (microsegundos de delta). Negligible en práctica. Fix cosmético diferido.

## Deferred from: code review de 2-3-date-birthday (2026-04-15)

- **`daysUntilNextBirthday` no valida formato de `Birthday.date`** — Datos malformados producen `NaN` silencioso, la entrada se descarta sin error. Fix: validar formato en admin CRUD (Epic 5) o en `storageService` al persistir.
- **`rotationSlot` crece sin bound en KioskScreen** — Overflow teórico en ~1900 años; el salto al cambiar el array de birthdays puede repetir/saltar entradas. Impacto negligible para kiosk familiar. Fix cosmético diferido.
- **DST en `daysUntilNextBirthday`** — `Math.round(diffMs / 86_400_000)` puede producir off-by-one en días de cambio de horario. Fix: usar `utils/dateUtils.ts` con cálculo basado en componentes de fecha local. Scope: cuando exista ese util.

## Deferred from: code review de 2-2-yiddish-phrase (2026-04-15)

- **`getDayOfYear` no es DST-aware** — `diffMs / 86400000` puede retornar el mismo índice dos días consecutivos en el día de spring-forward. Impacto: la misma frase Yiddish aparece dos veces seguidas una vez al año. Fix: usar cálculo basado en componentes de fecha local (`getDate()`, `getMonth()`). Scope: `utils/dateUtils.ts` cuando exista (Story 2.3+).
- **Long `setTimeout` en dispositivo dormido** — Un timeout de horas puede ser throttleado/dropped por el OS si la app está backgrounded. Mitigado por WAKE_LOCK (Epic 6) y `visibilitychange` event. Scope: Epic 6 hardening.

## Deferred from: code review de 1-1-stack-init (2026-04-15)

- **Sin CSP en index.html** — Agregar `<meta http-equiv="Content-Security-Policy">` cuando se integren recursos externos (Google Fonts, Photos API). No urgente en stories que solo usan assets locales.
- **vite.config.ts sin server.allowedHosts** — Considerar para CI/CD o entornos de dev compartidos. No afecta runtime en tablet.
- **android:allowBackup="true" en AndroidManifest** — Cambiar a `false` con reglas explícitas. Scope: Story 6 (hardening kiosk nativo). Un kiosk app con PIN y fotos privadas no debería permitir ADB backup.
- **Sin flags lock-task en AndroidManifest** — `RECEIVE_BOOT_COMPLETED`, `lockTaskMode`, intent filter `CATEGORY_HOME`. Scope: Epic 6 (kiosk mode nativo). Sin esto el plugin @capgo/capacitor-android-kiosk no puede activar kiosk mode real.
- **minifyEnabled false en release buildType** — Habilitar con ProGuard rules para WebView. Scope: Story 6. APK release expone lógica en texto plano sin minification.
