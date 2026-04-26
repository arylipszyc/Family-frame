# Story 5.2: AdminScreen — estructura, navegación y CRUD de Yiddish y Cumpleaños

Status: done

## Story

Como administrador (Ary),
quiero una pantalla de administración con secciones claras para gestionar el contenido del marco, incluyendo importación masiva de frases Yiddish,
para poder editar contenido sin necesitar documentación ni tener que escribir cada frase en el tablet.

## Acceptance Criteria

**AC1 — Estructura de AdminScreen:**
- Header fijo con botón `"← Volver al frame"` siempre visible
- Contenido scrollable verticalmente con secciones claramente delimitadas
- Toda la tipografía es Inter en tamaños normales (≥16px)

**AC2 — Navegación de regreso:**
- Al tocar "← Volver al frame" → crossfade de 2 segundos hacia KioskScreen
- `adminStore.setAuthenticated(false)` y `displayStore.setMode('kiosk')` son llamados

**AC3 — Sección "Frases Yiddish" — visualización:**
- Lista de frases con botones `Editar` y `Eliminar` inline por ítem
- Formulario expandible in-place para agregar nueva frase (campos: Yiddish, Transliteración, Español)
- Sección "Importar frases" con `<textarea>` para pegar JSON array

**AC4 — Guardar/editar frase individual:**
- Persiste en `@capacitor/preferences` key `yiddishPhrases`
- Actualiza `contentStore.yiddishPhrases` inmediatamente
- Toast `"Guardado ✓"` en `frame-amber` (#C8956C) durante 2 segundos

**AC5 — Importar JSON de frases Yiddish:**
- Formato: `[{ "yiddish": "...", "transliteration": "...", "spanish": "..." }]`
- Merge con banco existente (no reemplazo, sin duplicados exactos)
- Toast `"X frases importadas"` en `frame-amber` con conteo de frases nuevas
- JSON inválido o campos faltantes → toast `"Formato inválido — revisá el JSON"` en `frame-sepia` (#8B6F5E), sin modificar el banco

**AC6 — Eliminar frase:**
- Confirmar en diálogo simple nativo (`window.confirm`)
- Eliminar del store y de `@capacitor/preferences`
- Toast de confirmación en `frame-amber`

**AC7 — Sección "Cumpleaños":**
- Agregar, editar y eliminar entradas con campos: Nombre y Fecha (`YYYY-MM-DD`)
- Persiste en `@capacitor/preferences` key `birthdays`
- Actualiza `contentStore.birthdays` inmediatamente
- Cada acción exitosa → toast `frame-amber` de 2 segundos

**AC8 — Validación de campos vacíos:**
- Campo vacío al guardar → `border: 2px solid #C8956C` como señal visual
- No se guarda hasta que todos los campos estén completos

## Tasks / Subtasks

- [x] Task 1 — `adminContentService.ts`: CRUD de Yiddish y Cumpleaños en Preferences
  - [x] 1.1 — `saveYiddishPhrases` / `loadYiddishPhrases` (key: `yiddishPhrases`)
  - [x] 1.2 — `saveBirthdays` / `loadBirthdays` (key: `birthdays`)
  - [x] 1.3 — Tests: 6 tests ✅

- [x] Task 2 — `Toast.tsx`: componente de notificación flotante — 3 tests ✅

- [x] Task 3 — `AdminScreen.tsx`: estructura, header y navegación de regreso — tests ✅

- [x] Task 4 — Sección "Frases Yiddish": lista + formulario add/edit — tests ✅

- [x] Task 5 — Sección "Importar frases Yiddish" (JSON bulk import) — tests ✅

- [x] Task 6 — Sección "Cumpleaños": CRUD completo — tests ✅

- [x] Task 7 — Cargar yiddishPhrases y birthdays al inicio en App.tsx ✅

- [x] Task 8 — Validación final: `npx tsc --noEmit` ✅ y `npm run test` ✅ — 95/95 tests

## Dev Notes

### Estado actual del proyecto

- `src/screens/AdminScreen.tsx` — placeholder existente; será completamente reemplazado
- `src/stores/contentStore.ts` — `yiddishPhrases` (default: yiddish.json), `birthdays` (default: []), setters disponibles
- `src/stores/adminStore.ts` — `isAuthenticated`, `setAuthenticated(false)`
- `src/stores/displayStore.ts` — `setMode('kiosk')`
- `src/types/YiddishPhrase.ts` — `{ yiddish, transliteration, spanish }` — sin id, usar índice para edición
- `src/types/Birthday.ts` — `{ id: string, name: string, date: string }` — id ya existe

### Colores del design system

```
frame-cream:    #F5F0E8
frame-amber:    #C8956C
frame-sepia:    #8B6F5E
frame-charcoal: #2C2420
frame-night:    #1A1210
```

### Arquitectura del AdminScreen

```
AdminScreen (position: fixed; inset: 0; background: #1A1210)
├── Header (position: sticky; top: 0; background: #2C2420; padding: 16px 24px; zIndex: 10)
│   └── Button "← Volver al frame" (color: #F5F0E8; font: Inter 18px)
└── Content (overflow-y: auto; height: calc(100vh - 56px); padding: 24px)
    ├── Section "Frases Yiddish"
    └── Section "Cumpleaños"
```

### Crossfade de salida

```typescript
// Fade: opacity 0 en 2s, luego cambiar modo
setExiting(true)  // estado local que aplica opacity 0 + transition 2s
setTimeout(() => {
  setAuthenticated(false)
  setMode('kiosk')
}, 2000)
```

### Toast

Notificación simple, no hay librería externa. Estado local en AdminScreen:
```typescript
const [toast, setToast] = useState<{ message: string; color: string } | null>(null)

function showToast(message: string, color: string) {
  setToast({ message, color })
  setTimeout(() => setToast(null), 2000)
}
```

### Deduplicación para import de Yiddish

```typescript
function isDuplicate(phrase: YiddishPhrase, existing: YiddishPhrase[]): boolean {
  return existing.some(
    (e) => e.yiddish === phrase.yiddish &&
           e.transliteration === phrase.transliteration &&
           e.spanish === phrase.spanish
  )
}
```

### Reglas arquitectónicas

- `AdminScreen` es el único consumidor de `adminContentService`
- Sin librerías nuevas: solo React, @capacitor/preferences, stores existentes
- TypeScript strict: no `any`, no `as` casts (excepto JSON.parse donde es inevitable)
- `crypto.randomUUID()` disponible en Android WebView moderno — usar para Birthday IDs

### Scope — qué NO entra en esta story

- NO bienvenida, configuración, ni cambio de PIN (Story 5.3)
- NO sección de Fotos/OAuth (Story 5.4)
- NO confirmación de diálogo custom (usar `window.confirm` nativo)

### Referencias

- [Source: epics.md#Story 5.2] — ACs
- [Source: architecture.md#useContentStore] — stores
- [Source: ux-design-specification.md] — colores, tipografía Admin

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_ninguno_

### Completion Notes List

- `adminContentService.ts`: singleton con save/load para yiddishPhrases y birthdays vía @capacitor/preferences.
- `Toast.tsx`: componente visual fixed bottom-center; visible/hidden por prop opacity.
- `AdminScreen.tsx`: reemplaza placeholder; header sticky + contenido scrollable; CRUD completo Yiddish (con import JSON + dedup) y Cumpleaños (con UUID); validación de campos vacíos con borde amber; crossfade 2s al salir.
- `App.tsx`: carga yiddishPhrases y birthdays desde Preferences al arranque.
- 95/95 tests. TypeScript sin errores.

### File List

- `src/services/adminContentService.ts` (nuevo)
- `src/components/Toast.tsx` (nuevo)
- `src/screens/AdminScreen.tsx` (modificado — reemplaza placeholder)
- `src/App.tsx` (modificado — carga Yiddish y Birthdays en init)
- `src/__tests__/services/adminContentService.test.ts` (nuevo)
- `src/__tests__/components/Toast.test.tsx` (nuevo)
- `src/__tests__/screens/AdminScreen.test.tsx` (nuevo)

### Change Log

- 2026-04-15: Story 5.2 implementada — adminContentService, Toast, AdminScreen real con CRUD Yiddish+Birthdays. 30 tests nuevos (95 total).
- 2026-04-15: CR completado y 9 patches aplicados — 96/96 tests, TypeScript limpio.

## Code Review Record

### Revisores

- **Blind Hunter** — 12 findings (4 Med, 1 High implicado via Edge)
- **Edge Case Hunter** — 15 findings
- **Acceptance Auditor** — 9 findings (AC violations directas)

### Patches a aplicar

| # | Severidad | Finding | Fix |
|---|-----------|---------|-----|
| P1 | High | Toast timer acumula: múltiples saves rápidos dejan timers huérfanos | `useRef` para `toastTimerRef`; `clearTimeout` antes de cada `showToast` |
| P2 | High | `handleBack` doble-fire: click múltiple inicia múltiples fade+setMode | Guard `if (exiting) return` al inicio de `handleBack` |
| P3 | High | `key={idx}` en lista Yiddish: React reusa DOM incorrectamente en delete/re-add | Key content-based: `key={phrase.yiddish + '-' + idx}` |
| P4 | High | Promise.all sin `.catch()`: fallos de save son silenciosos | `.catch(() => showToast('Error al guardar', SEPIA))` en todas las ops async |
| P5 | High | Fecha birthday sin validación de formato: cualquier string no-vacío pasa | Validar con `/^\d{4}-\d{2}-\d{2}$/` antes de guardar |
| P6 | AC1 | Botones Editar/Eliminar en 14px — viola spec ≥16px | `actionBtnStyle.fontSize = '16px'` |
| P7 | AC8 | Borde de error persiste aunque el usuario corrija el campo | `onChange` handler que limpia el estado de error del campo editado |
| P8 | AC5 | Textarea no se limpia cuando todas las frases importadas son duplicados | `setImportText('')` en el path de cero-frases-nuevas |
| P9 | AC4/AC7 | Toast se desmonta instantáneamente (hard unmount) sin fade-out | Renderizar `<Toast>` siempre; controlar visibilidad sólo via prop `visible` |

### Decisión requerida — AC2 Crossfade real

La implementación actual hace **fade-out de AdminScreen** (opacity 0 en 2s) y luego cambia el modo — KioskScreen aparece instantáneamente al final. Un crossfade verdadero requeriría montar ambas pantallas simultáneamente durante la transición (KioskScreen con opacity 0→1 mientras AdminScreen hace 1→0). Esto implica cambios en App.tsx para renderizar ambas durante la transición.

**Opciones:**
- **A) Dejar como está** — es un fade-out limpio, no un crossfade técnico. Impacto visual: negro 2s → KioskScreen. Ningún cambio adicional.
- **B) Crossfade real** — App.tsx renderiza ambas screens durante transición; AdminScreen pasa señal de exiting; complejidad moderada.
