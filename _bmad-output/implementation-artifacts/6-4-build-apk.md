# Story 6.4: Build y distribución — APK firmado para sideload

Status: done

## Story

Como administrador (Ary),
quiero poder compilar y firmar el APK para instalarlo en la tablet via sideload,
para entregar el marco funcionando el 12 de mayo sin depender de Play Store.

## Acceptance Criteria

**AC1:**
- Dado el proyecto completo con todos los epics implementados
- Cuando Ary ejecuta `npm run build && npx cap sync android`
- Entonces el build web compila sin errores y se sincroniza a la capa Android

**AC2:**
- Dado el proyecto sincronizado
- Cuando Ary ejecuta `cd android && ./gradlew assembleRelease`
- Entonces se genera `app-release-unsigned.apk` en `android/app/build/outputs/apk/release/`

**AC3:**
- Dado un keystore privado generado por Ary
- Cuando se firma el APK con `apksigner`
- Entonces se genera `app-release.apk` firmado e instalable

**AC4:**
- Dado el APK firmado
- Cuando Ary ejecuta `adb install app-release.apk` con la tablet conectada por USB
- Entonces la app se instala correctamente en Android 14
- Y la app aparece como launcher por defecto tras el boot

**AC5:**
- Dado el APK instalado
- Cuando Ary reinicia la tablet desenchufando y volviendo a enchufar
- Entonces la app arranca sola, muestra `WelcomeScreen` y pasa a `KioskScreen` en menos de 60 segundos (NFR6)
- Y todos los datos persistidos (fotos cacheadas, frases Yiddish, cumpleaños, welcomeConfig) sobreviven el reinicio

## Tasks / Subtasks

- [x] Task 1 — Fix TypeScript errors que bloquean `npm run build`
  - [x] 1.1 — `Toast.test.tsx`: agregar `beforeEach` al import de vitest
  - [x] 1.2 — `GestureDetector.test.tsx`: agregar `afterEach` al import de vitest

- [x] Task 2 — Verificar `npm run build` pasa sin errores (AC1)

- [x] Task 3 — Crear script de build y firma `scripts/build-release.sh`
  - [x] 3.1 — Pipeline completo: `npm run android` → `gradlew assembleRelease` → `apksigner`
  - [x] 3.2 — Instrucciones para generar keystore (primera vez)
  - [x] 3.3 — Instrucciones para `adb install` (AC3/AC4)

- [x] Task 4 — Validación
  - [x] 4.1 — `npm run test` 148/148 ✅
  - [x] 4.2 — `npm run build` sin errores ✅

## Dev Notes

### TypeScript errors bloqueantes (AC1)

`tsc -b` incluye todos los archivos bajo `src/`, incluyendo los tests. Dos tests usan globals de Vitest sin importarlos explícitamente:

- `Toast.test.tsx:5`: `beforeEach` no importado de vitest
- `GestureDetector.test.tsx:10`: `afterEach` no importado de vitest

Fix mínimo: agregar los identificadores faltantes al import existente de vitest.

### Script de build y firma

AC2: `./gradlew assembleRelease` genera `app-release-unsigned.apk` (sin configuración de signing en Gradle — correcto para sideload manual).

AC3: Firma manual con `apksigner` (parte del Android Build Tools, incluido con Android Studio / SDK).

### Scope

- NO modifica `android/app/build.gradle` para signing config (Ary firma manualmente — sin secrets en el repo)
- `minifyEnabled false` se mantiene (ProGuard/R8 anotado como deferred en Story 1.1)
- AC4/AC5 son verificables solo en dispositivo físico; se documentan como pasos manuales

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- `Toast.test.tsx`: `beforeEach` no estaba importado de vitest — causaba error TS2304 en `tsc -b`. Fix: agregar al import existente.
- `GestureDetector.test.tsx`: `afterEach` no estaba importado de vitest — mismo error. Fix: agregar al import existente.
- `npm run build`: limpio tras los dos fixes — 87 módulos transformados, sin errores TypeScript ni Vite.
- `scripts/build-release.sh`: script bash completo con pipeline `npm run build + cap sync → gradlew assembleRelease → apksigner`. Lee `KEYSTORE_PATH` y `KEY_ALIAS` de variables de entorno (no hay secrets en el repo). Incluye instrucciones de keytool (primera vez), adb install, y selección de launcher.
- 148/148 tests sin regresiones.

### File List

- `src/__tests__/components/Toast.test.tsx` (modificado — beforeEach importado)
- `src/__tests__/components/GestureDetector.test.tsx` (modificado — afterEach importado)
- `scripts/build-release.sh` (nuevo — pipeline build + firma + deploy)

### Change Log

- 2026-04-15: Story 6.4 implementada — fix TS errors bloqueantes en Toast/GestureDetector tests. npm run build ✅. Script build-release.sh creado con pipeline completo.
- 2026-04-15: CR completado — 2 patches aplicados (file existence checks en KEYSTORE_PATH y UNSIGNED_APK), 14 hallazgos descartados (falsos positivos sobre CI/CD, apksigner interactivo, prereq validation en script personal).

### Review Findings

- [x] [Review][Patch] KEYSTORE_PATH sin validación de existencia de archivo [scripts/build-release.sh] — aplicado: agregado `[ ! -f "$KEYSTORE_PATH" ]` con mensaje claro
- [x] [Review][Patch] UNSIGNED_APK sin verificación de existencia antes de firmar [scripts/build-release.sh] — aplicado: agregado `[ ! -f "$UNSIGNED_APK" ]` con mensaje claro
