# Story 5.3: AdminScreen — Bienvenida, Configuración y Cambio de PIN

Status: done

## Story

Como administrador (Ary),
quiero poder editar la foto y mensaje de bienvenida, ajustar parámetros del sistema y cambiar el PIN desde el admin,
para tener control completo del marco sin visitar el código.

## Acceptance Criteria

**AC1 — Sección "Bienvenida":**
- Campo `authorName` (input text) pre-poblado con valor actual de `contentStore.welcomeConfig.authorName`
- Campo `message` (`<textarea>` con `min-height: 100px`) pre-poblado con valor actual
- Botón "Seleccionar foto" → `<input type="file" accept="image/*">` oculto → lee archivo como data URL via FileReader
- Al guardar: `storageService.saveWelcomeConfig(...)` + `setWelcomeConfig(...)` actualizan store y Preferences
- Toast `"Bienvenida guardada ✓"` en `frame-amber` 2s

**AC2 — Sección "Configuración" — intervalo de rotación:**
- Input numérico para intervalo en **segundos** (mínimo 10, máximo 300); valor mostrado = `settingsStore.photoRotationInterval / 1000`
- Al guardar: persiste en `@capacitor/preferences` key `photoRotationInterval` en **milisegundos** (`valor * 1000`)
- Actualiza `settingsStore.photoRotationInterval` inmediatamente
- `KioskScreen` usa el nuevo intervalo a partir del siguiente ciclo (vía `useInterval` reactivo)
- Validación: fuera de rango → borde amber, no guarda
- Toast `"Configuración guardada ✓"` en `frame-amber`

**AC3 — Sección "Configuración" — night mode:**
- Inputs `nightModeStart` y `nightModeEnd` en formato HH:MM (defaults: "22:00" y "07:00")
- Validación con regex `/^([01][0-9]|2[0-3]):[0-5][0-9]$/` — formato inválido → borde amber, no guarda
- Al guardar: persiste en `@capacitor/preferences` keys `nightModeStart` y `nightModeEnd`
- Actualiza `settingsStore.nightModeStart` y `settingsStore.nightModeEnd` inmediatamente
- Toast `"Configuración guardada ✓"` en `frame-amber`

**AC4 — Sección "Configuración" — cambio de PIN:**
- Tres campos tipo password: PIN actual, PIN nuevo, Confirmar PIN nuevo
- Reglas: PIN actual correcto (via `pinService.verifyPin`), PIN nuevo no vacío, PIN nuevo === confirmar
- Si PIN actual incorrecto → toast `"PIN incorrecto"` en `frame-sepia`, sin cambios
- Si PINes nuevos no coinciden → borde amber en ambos campos, no guarda
- Si todo ok → `pinService.setPin(newPin)`, toast `"PIN cambiado ✓"` en `frame-amber`, limpiar campos
- Campos limpian su borde de error al escribir

**AC5 — Sección "Sistema" — reiniciar app:**
- Botón "Reiniciar app" → `window.confirm('¿Reiniciar la aplicación?')` → si confirma: `window.location.reload()`
- No requiere nuevo paquete npm

## Tasks / Subtasks

- [x] Task 1 — `settingsStore.ts` + `systemSettingsService.ts`
  - [x] 1.1 — `settingsStore`: `photoRotationInterval` (default: 30000), `nightModeStart` (default: "22:00"), `nightModeEnd` (default: "07:00") + setters
  - [x] 1.2 — `systemSettingsService`: save/load para cada clave (`photoRotationInterval`, `nightModeStart`, `nightModeEnd`)
  - [x] 1.3 — Tests: 8 tests ✅

- [x] Task 2 — `KioskScreen.tsx`: usar `settingsStore.photoRotationInterval` dinámicamente
  - [x] 2.1 — Reemplazar `PHOTO_INTERVAL_MS` constante con valor del store
  - [x] 2.2 — Tests: nuevo `KioskScreen.test.tsx` — 3 tests

- [x] Task 3 — `App.tsx`: cargar system settings al inicio
  - [x] 3.1 — Agregar `systemSettingsService.load*()` al Promise.all de init
  - [x] 3.2 — Hidratar settingsStore con valores persistidos

- [x] Task 4 — AdminScreen: Sección "Bienvenida"
  - [x] 4.1 — Formulario inline siempre visible (no expandible): authorName, message, foto
  - [x] 4.2 — File input oculto con ref; botón visible "Seleccionar foto" lo dispara
  - [x] 4.3 — FileReader convierte selección a data URL; guarda en campo `photoPath` local
  - [x] 4.4 — Tests: 5 tests ✅

- [x] Task 5 — AdminScreen: Sección "Configuración" — rotación y night mode
  - [x] 5.1 — Input de intervalo en segundos con validación de rango
  - [x] 5.2 — Inputs HH:MM con validación regex
  - [x] 5.3 — Tests: 6 tests ✅

- [x] Task 6 — AdminScreen: Sección "Configuración" — cambio de PIN
  - [x] 6.1 — Tres campos password; lógica de verificación + cambio
  - [x] 6.2 — Tests: 6 tests ✅

- [x] Task 7 — AdminScreen: Sección "Sistema" — reiniciar app
  - [x] 7.1 — Botón con confirm + reload
  - [x] 7.2 — Tests: 2 tests ✅

- [x] Task 8 — Validación final: `npx tsc --noEmit` ✅ y `npm run test` ✅ — 127/127 tests

## Dev Notes

### Estado actual del proyecto

- `src/screens/AdminScreen.tsx` — tiene secciones "Frases Yiddish" y "Cumpleaños"; agregar nuevas secciones al final del `<div style={contentStyle}>`
- `src/stores/contentStore.ts` — `welcomeConfig: { photoPath, message, authorName }`, `setWelcomeConfig`
- `src/services/storageService.ts` — `saveWelcomeConfig` / `loadWelcomeConfig` ya implementados (key: `welcomeConfig`)
- `src/services/pinService.ts` — `verifyPin(entered): Promise<boolean>`, `setPin(newPin): Promise<void>`
- `src/screens/KioskScreen.tsx` — usa `PHOTO_INTERVAL_MS = 30_000` hard-coded; `useInterval(callback, delay)` es reactivo al cambio de `delay`
- `src/hooks/useInterval.ts` — ya reactivo: cuando `delay` cambia, el intervalo se reinicia
- `src/components/NightModeOverlay.tsx` — usa `NIGHT_START_HOUR = 22` y `NIGHT_END_HOUR = 7` hard-coded; **NO se modifica en esta story** (los valores se persisten pero NightModeOverlay no los consume hasta una story futura)

### Nuevo store: `settingsStore.ts`

```typescript
interface SettingsState {
  photoRotationInterval: number   // ms, default 30_000
  nightModeStart: string          // "HH:MM", default "22:00"
  nightModeEnd: string            // "HH:MM", default "07:00"
  setPhotoRotationInterval: (ms: number) => void
  setNightModeStart: (t: string) => void
  setNightModeEnd: (t: string) => void
}
```

### Nuevo servicio: `systemSettingsService.ts`

```typescript
const KEYS = {
  rotationInterval: 'photoRotationInterval',
  nightStart: 'nightModeStart',
  nightEnd: 'nightModeEnd',
}

// save: guarda el valor como string en Preferences
// load: retorna el valor parseado, o null si no existe
```

### Integración KioskScreen

```typescript
// Antes (hard-coded):
const PHOTO_INTERVAL_MS = 30_000
useInterval(() => setRotationSlot(s => s + 1), PHOTO_INTERVAL_MS)

// Después (reactivo):
const photoRotationInterval = useSettingsStore((s) => s.photoRotationInterval)
useInterval(() => setRotationSlot(s => s + 1), photoRotationInterval)
```

### File picker para foto de bienvenida

```typescript
// En AdminScreen:
const fileInputRef = useRef<HTMLInputElement>(null)

function handlePhotoClick() {
  fileInputRef.current?.click()
}

function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const dataUrl = ev.target?.result as string
    setWelcomePhotoPath(dataUrl)
  }
  reader.readAsDataURL(file)
}
```

**En tests**: mockear FileReader globalmente en el test:
```typescript
vi.stubGlobal('FileReader', class {
  onload: ((e: { target: { result: string } }) => void) | null = null
  readAsDataURL() {
    this.onload?.({ target: { result: 'data:image/jpeg;base64,abc123' } })
  }
})
```

### App restart (AC5)

Usar `window.location.reload()` — no requiere `@capacitor/app`. Funciona en Android WebView.

### Integración App.tsx

```typescript
// En Promise.all, agregar las 3 cargas:
adminContentService.loadYiddishPhrases(),
adminContentService.loadBirthdays(),
systemSettingsService.loadPhotoRotationInterval(),
systemSettingsService.loadNightModeStart(),
systemSettingsService.loadNightModeEnd(),

// En el then:
.then(([config, photos, , phrases, birthdays, rotInt, nightStart, nightEnd]) => {
  if (rotInt !== null)  setPhotoRotationInterval(rotInt)
  if (nightStart)       setNightModeStart(nightStart)
  if (nightEnd)         setNightModeEnd(nightEnd)
})
```

### Diseño de la AdminScreen (secciones nuevas)

```
AdminScreen (contenido scrollable)
├── Sección "Frases Yiddish"     (Story 5.2 — no tocar)
├── Sección "Cumpleaños"         (Story 5.2 — no tocar)
├── Sección "Bienvenida"         (Story 5.3 — nueva)
├── Sección "Configuración"      (Story 5.3 — nueva; incluye intervalo, night mode y PIN)
└── Sección "Sistema"            (Story 5.3 — nueva)
```

### Validaciones

```typescript
// Intervalo (segundos):
const intervalSecs = parseInt(intervalInput, 10)
const validInterval = !isNaN(intervalSecs) && intervalSecs >= 10 && intervalSecs <= 300

// HH:MM:
const HH_MM_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/
const validStart = HH_MM_REGEX.test(nightModeStart)
const validEnd   = HH_MM_REGEX.test(nightModeEnd)
```

### Reglas arquitectónicas

- Sin librerías nuevas — solo React, @capacitor/preferences, stores existentes, FileReader nativo
- TypeScript strict: no `any`, usar `as string` sólo en FileReader result (inevitable)
- AdminScreen es el único consumidor de `systemSettingsService`
- `settingsStore` es el único store para configuración del sistema

### Colores del design system

```
frame-cream:    #F5F0E8
frame-amber:    #C8956C
frame-sepia:    #8B6F5E
frame-charcoal: #2C2420
frame-night:    #1A1210
```

### Scope — qué NO entra en esta story

- NO fotos/OAuth (Story 5.4)
- NO modificar `NightModeOverlay` para leer del store (futura)
- NO confirmación de diálogo custom (usar `window.confirm` nativo)

### Referencias

- [Source: epics.md#Story 5.3] — ACs
- [Source: architecture.md] — stores, services
- [Source: ux-design-specification.md] — colores, tipografía Admin

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_ninguno_

### Completion Notes List

- `settingsStore.ts`: nuevo store Zustand con photoRotationInterval (ms), nightModeStart, nightModeEnd y sus setters.
- `systemSettingsService.ts`: save/load para las 3 claves via @capacitor/preferences; retorna null si no existe.
- `KioskScreen.tsx`: reemplaza constante hard-coded por valor reactivo del settingsStore — intervalo dinámico.
- `App.tsx`: carga las 3 settings al inicio en Promise.all; hidrata settingsStore.
- `AdminScreen.tsx`: 3 secciones nuevas — Bienvenida (autorName + mensaje + foto vía FileReader), Configuración (intervalo rotación + horarios night mode + cambio PIN), Sistema (restart via window.location.reload()).
- App restart usa `window.location.reload()` — sin @capacitor/app (no instalado).
- 127/127 tests. TypeScript sin errores.

### File List

- `src/stores/settingsStore.ts` (nuevo)
- `src/services/systemSettingsService.ts` (nuevo)
- `src/screens/AdminScreen.tsx` (modificado — 3 secciones nuevas)
- `src/screens/KioskScreen.tsx` (modificado — intervalo dinámico)
- `src/App.tsx` (modificado — carga system settings en init)
- `src/__tests__/services/systemSettingsService.test.ts` (nuevo)
- `src/__tests__/screens/KioskScreen.test.tsx` (nuevo)
- `src/__tests__/screens/AdminScreen.test.tsx` (modificado — 20 tests nuevos)

### Change Log

- 2026-04-15: Story 5.3 implementada — settingsStore, systemSettingsService, 3 secciones admin, intervalo dinámico en KioskScreen. 31 tests nuevos (127 total).
- 2026-04-15: CR completado y 7 patches aplicados — 131/131 tests, TypeScript limpio.
