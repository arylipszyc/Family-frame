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

## Deferred from: code review de 7-1-kiosk-layout-split (2026-05-19)

- **Indices `curIdx`/`nextIdx` no se resetean cuando `photos` cambia identidad/length** — El `[photos]` effect limpia timeouts y resetea `phase`, pero los índices quedan al valor previo. Si Drive sync acorta el array a longitud menor que `curIdx`, el clamp en render (`Math.min(curIdx, photos.length - 1)`) protege el render — no crashea. Riesgo teórico: tras un sync que reordena fotos (no solo agrega), el usuario ve un "jump" a una foto distinta de la esperada. En práctica Drive sync solo agrega/quita, no reordena. Fix: agregar `setCurIdx(prev => Math.min(prev, photos.length - 1))` y similar para `nextIdx` en el effect. Scope: si se reportan jumps en hardware.
- **onError mid-transición causa unmount abrupto** — Si una `<img>` falla durante fade-out/fade-in, el `errored` Set se actualiza, el render condicional `!currentErrored && <img>` desmonta inmediatamente. Resultado visual: foto desaparece abruptamente sin fade. Pre-existente del PhotoSlide original; el cambio a máquina 3-fase no lo introdujo. Fix: capturar el error pero diferir el unmount hasta el final de la fase actual. Scope: si fotos corruptas son frecuentes en Drive sync.
- **Key-based remount fuerza re-decode de imágenes en cada swap** — `key={top-${safeCurrentIdx}}` y `key={bottom-${safeNextIdx}}` causan que React desmonte/remontoe los `<img>` en cada swap. En cache primaria del browser es instantáneo; en tablet de bajo consumo con imágenes >5MB puede haber flash si decode no terminó. Validar en hardware. Fix alternativo (si flash visible): usar `useLayoutEffect` para deshabilitar transition por 1 frame en el swap en lugar de key remount. Scope: validación visual en tablet.
- **onError handlers leen ref en vez de índice rendered** — `setErrored(prev => new Set([...prev, nextIdxRef.current]))`. Si el error llega tarde (después de un swap), el ref apunta a un índice distinto del que falló. Pre-existente del PhotoSlide original. Fix: capturar `safeNextIdx` en closure local. Scope: si se observan blacklists incorrectos.
- **React Strict Mode double-invocation del `[photos]` effect** — En dev con strict mode, el effect dispara 2 veces al montar. Cleanup intermedio limpia timeouts que el primer mount no programó (no-op). Inocuo en producción. Scope: refactor menor.
- **Test (f) `setTimeoutSpy.mock.calls.length` es frágil a internals del scheduler** — El test cuenta setTimeouts globalmente; un cambio en React/Vitest internals podría romperlo sin que haya regresión en PhotoSlide. Fix: mockear `schedule()` directamente o capturar IDs del componente. Scope: cuando se actualice major version de Vitest/React.
- **`public/test-photos/` no se popula automáticamente para nuevos devs** — La carpeta está gitignored. Un dev fresco hace clone, corre `npm run dev`, ve 15 broken images. No hay README ni script de bootstrap. Fix: README en `src/dev/testPhotos.ts` con instrucciones, o script `scripts/seed-test-photos.sh`. Scope: si Epic 7 crece y otros devs se suman.
- **photos.length === 1 renderiza la misma imagen dos veces** — Con 1 foto, `curIdx=0, nextIdx=0`, ambas capas renderizan `photos[0]` (diferentes `key`s pero misma `src`). Doble decode/network. Pre-existente. Fix trivial: condicionar bottom layer a `safeNextIdx !== safeCurrentIdx`. Scope: cosmético.

## Deferred from: code review de 7-2-panel-birthday-date (2026-05-19)

- **Nombres largos en BirthdayCountdown silently clipped** — `line3Style` 40px peso 500 sobre 358px content-width: nombres ~10 chars caben en 1 línea (40px). Nombres más largos wrappean a 2 líneas (96px). 2 entradas con line3 wrappeado = 446px → excede 380px birthday zone → `overflow: hidden` clipa la última línea. Fix: o reducir font-size de line3 cuando wrappea, o reducir line3 max-width con ellipsis, o capear el nombre con `text-overflow`. Scope: si reportan nombres cortados en uso real.
- **Content alignment con 0 o 1 birthday deja gap visible** — Si `upcoming.length === 0`, birthday zone está vacía 380px → date queda muy abajo del clock zone, con 380+56=436px de aire visible. Si `upcoming.length === 1`, ~150px de contenido al tope + 230px vacíos. Sally diseñó zona reservada para estabilidad de layout, pero el efecto visual con poca data puede leer raro. Fix: `justify-content: center` en BirthdayCountdown containerStyle, o repensar el modelo "zona reservada". Scope: owner valida en hardware con datos reales.
- **dateZoneStyle no tiene overflow:hidden** — Si en futuro una locale o font fallback produce 4+ líneas en DateDisplay (>120px), overflowea silenciosamente y empuja al panel a salirse. Defensive: agregar `overflow: hidden` a `dateZoneStyle`. Scope: cosmético.
- **`BirthdayCountdown.containerStyle.height: 100%`** — Sin un `justify-content` o `flex: 1` en los children, height 100% no afecta el layout (entradas se apilan al tope, espacio sobrante queda abajo). Si la intención era distribuir las 2 entradas en el espacio (space-between/around), falta el `justify-content`. Si no, el `height: 100%` se puede eliminar. Scope: cleanup post-hardware validation.
- **boxSizing solo en sidePanelStyle** — `photoZoneStyle` no tiene `boxSizing: border-box`. Si futuras stories agregan padding al PhotoZone (e.g. mat interno alrededor de la foto), el 78%+22% split se rompe (PhotoZone calcularía width 78% + padding adicional). Fix preventivo: agregar `boxSizing: 'border-box'` a `photoZoneStyle`. Scope: latente.
- **WebkitTapHighlightColor en componentes individuales removido** — root tiene `WebkitTapHighlightColor: 'transparent'` pero esta property NO se hereda en CSS. Los componentes individuales (BirthdayCountdown, DateDisplay) la habían explicitada antes; ahora la perdieron. En kiosk con touch deshabilitado por modo kiosk de Capacitor, no debería afectar. Scope: si en tablet aparecen flashes táctiles al tocar texto.

## Deferred from: amplía rango intervalo de rotación (2026-05-19)

- **Selector con unidades en lugar de input segundos crudos** — Owner expandió el rango a 86400s (1 día) para casos de uso largos. Pero "86400" es opaco. UX mejor: selector tipo "30 segundos / 1 minuto / 5 minutos / 15 minutos / 1 hora / 6 horas / 1 día" o un input con unidad seleccionable (slider + unidad). Owner anotó "después hacemos algo más lindo" — diferido a post-regalo. Scope: AdminScreen sección Sistema, ~30 líneas.
