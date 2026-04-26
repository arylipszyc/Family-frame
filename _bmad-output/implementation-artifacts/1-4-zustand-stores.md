# Story 1.4: Zustand stores con estado inicial

Status: done

## Story

Como desarrollador,
quiero los Zustand stores definidos con sus tipos y estado inicial,
para que screens y componentes tengan una interfaz de estado estable desde la primera story de implementación.

## Acceptance Criteria

**AC1 — `src/stores/displayStore.ts`:**
- Exporta `useDisplayStore` con estado `{ mode: AppMode, currentPhotoIndex: number }`
- Estado inicial: `mode: 'welcome'`, `currentPhotoIndex: 0`
- Expone `setMode(mode: AppMode)` y `setCurrentPhotoIndex(index: number)`

**AC2 — `src/stores/contentStore.ts`:**
- Exporta `useContentStore` con estado `{ photos: Photo[], yiddishPhrases: YiddishPhrase[], birthdays: Birthday[], welcomeConfig: { photoPath: string, message: string, authorName: string } }`
- `yiddishPhrases` inicializado con el contenido importado de `../data/yiddish.json`
- `photos` y `birthdays` inicializados como `[]`
- `welcomeConfig` con valores por defecto vacíos (`photoPath: ''`, `message: ''`, `authorName: ''`)

**AC3 — `src/stores/syncStore.ts`:**
- Exporta `useSyncStore` con estado `{ isOnline: boolean, lastSync: string | null, syncStatus: 'idle' | 'syncing' | 'error' }`
- Estado inicial: `isOnline: false`, `lastSync: null`, `syncStatus: 'idle'`

**AC4 — `src/stores/adminStore.ts`:**
- Exporta `useAdminStore` con estado `{ isAuthenticated: boolean }`
- Estado inicial: `isAuthenticated: false`
- Expone `setAuthenticated(value: boolean)`

**AC5 — TypeScript limpio:**
- `npx tsc --noEmit` sin errores tras agregar todos los stores

## Tasks / Subtasks

- [x] Task 1 — Crear `src/stores/displayStore.ts` (AC: 1)
- [x] Task 2 — Crear `src/stores/contentStore.ts` (AC: 2)
- [x] Task 3 — Crear `src/stores/syncStore.ts` (AC: 3)
- [x] Task 4 — Crear `src/stores/adminStore.ts` (AC: 4)
- [x] Task 5 — Validar TypeScript (AC: 5)
  - [x] 5.1 `npx tsc --noEmit` ✅ sin errores
  - [x] 5.2 `npm run build` ✅ sin errores

## Dev Notes

### Estado actual del proyecto

- `src/stores/` existe con `.gitkeep` — crear archivos directamente
- `src/types/` contiene: `AppMode.ts`, `Photo.ts`, `YiddishPhrase.ts`, `Birthday.ts` (Story 1.2)
- `src/data/yiddish.json` tiene 32 frases auténticas (Story 1.2)
- `tsconfig.app.json` tiene `"resolveJsonModule": true` (patch Story 1.2) — los imports de JSON funcionan
- Zustand v5 instalado (`zustand: ^5.0.12` en package.json)

---

### Implementación exacta — API de Zustand v5

**Import correcto para v5:**
```typescript
import { create } from 'zustand'
```
En Zustand v5 es named export, no default. `import create from 'zustand'` es Zustand v4 y falla.

**Patrón TypeScript con v5** — usar curried form para inferencia correcta:
```typescript
export const useDisplayStore = create<DisplayState>()((set) => ({
  // estado inicial + acciones
}))
```

**Patrón de updates** (definido en architecture.md):
```typescript
// Simple:
set({ mode })
// Complejo con spread:
set(state => ({ ...state, nestedField: { ...state.nestedField, key: value } }))
```

---

### Implementación exacta — displayStore.ts

```typescript
import { create } from 'zustand'
import type { AppMode } from '../types/AppMode'

interface DisplayState {
  mode: AppMode
  currentPhotoIndex: number
  setMode: (mode: AppMode) => void
  setCurrentPhotoIndex: (index: number) => void
}

export const useDisplayStore = create<DisplayState>()((set) => ({
  mode: 'welcome',
  currentPhotoIndex: 0,
  setMode: (mode) => set({ mode }),
  setCurrentPhotoIndex: (index) => set({ currentPhotoIndex: index }),
}))
```

---

### Implementación exacta — contentStore.ts

```typescript
import { create } from 'zustand'
import type { Photo } from '../types/Photo'
import type { YiddishPhrase } from '../types/YiddishPhrase'
import type { Birthday } from '../types/Birthday'
import yiddishData from '../data/yiddish.json'

interface WelcomeConfig {
  photoPath: string
  message: string
  authorName: string
}

interface ContentState {
  photos: Photo[]
  yiddishPhrases: YiddishPhrase[]
  birthdays: Birthday[]
  welcomeConfig: WelcomeConfig
  setPhotos: (photos: Photo[]) => void
  setYiddishPhrases: (phrases: YiddishPhrase[]) => void
  setBirthdays: (birthdays: Birthday[]) => void
  setWelcomeConfig: (config: WelcomeConfig) => void
}

export const useContentStore = create<ContentState>()((set) => ({
  photos: [],
  yiddishPhrases: yiddishData as YiddishPhrase[],
  birthdays: [],
  welcomeConfig: { photoPath: '', message: '', authorName: '' },
  setPhotos: (photos) => set({ photos }),
  setYiddishPhrases: (phrases) => set({ yiddishPhrases: phrases }),
  setBirthdays: (birthdays) => set({ birthdays }),
  setWelcomeConfig: (config) => set({ welcomeConfig: config }),
}))
```

**Nota sobre `yiddishData as YiddishPhrase[]`:** TypeScript infiere el JSON como `{ yiddish: string, transliteration: string, spanish: string }[]` que es estructuralmente compatible con `YiddishPhrase[]`. El cast es necesario porque TypeScript infiere el tipo exacto de los literales del JSON, no el tipo declarado. Alternativamente se puede usar `satisfies YiddishPhrase[]` para verificación más estricta, pero `as` es suficiente aquí dado que la estructura es idéntica.

---

### Implementación exacta — syncStore.ts

```typescript
import { create } from 'zustand'

type SyncStatus = 'idle' | 'syncing' | 'error'

interface SyncState {
  isOnline: boolean
  lastSync: string | null
  syncStatus: SyncStatus
  setIsOnline: (isOnline: boolean) => void
  setLastSync: (lastSync: string | null) => void
  setSyncStatus: (status: SyncStatus) => void
}

export const useSyncStore = create<SyncState>()((set) => ({
  isOnline: false,
  lastSync: null,
  syncStatus: 'idle',
  setIsOnline: (isOnline) => set({ isOnline }),
  setLastSync: (lastSync) => set({ lastSync }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
}))
```

---

### Implementación exacta — adminStore.ts

```typescript
import { create } from 'zustand'

interface AdminState {
  isAuthenticated: boolean
  setAuthenticated: (value: boolean) => void
}

export const useAdminStore = create<AdminState>()((set) => ({
  isAuthenticated: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
}))
```

---

### Setters adicionales (contentStore y syncStore)

Los ACs de contentStore y syncStore solo verifican la forma del estado. Los setters (`setPhotos`, `setBirthdays`, etc.) **no están en los ACs** pero son necesarios para que las stories 2+ puedan actualizar el estado. Se incluyen por ser el mínimo viable para que los stores sean funcionales.

Regla: no agregar lógica compleja, solo setters planos que sobrescriben el campo.

---

### Scope: qué NO entra en esta story

- NO crear `firstBootStore.ts` — está en la arquitectura pero no tiene story asignada todavía
- NO importar los stores en `App.tsx` ni en ningún componente todavía
- NO crear hooks (`usePhotos`, `useFirstBoot`, etc.) — son Stories 2.x
- NO agregar persistencia con `@capacitor/preferences` — es lógica de servicios
- NO escribir tests de integración con stores — lógica de negocio viene en Stories 2+
- Los stores son solo definiciones con estado inicial y setters planos

---

### Naming conventions (architecture enforcement)

- Archivos: `camelCase` + sufijo `Store` (`displayStore.ts`, `contentStore.ts`)
- Hook exports: `use` + `PascalCase` + `Store` (`useDisplayStore`)
- Interfaces de estado: `PascalCase` + `State` (`DisplayState`, `ContentState`)
- Export nombrado: `export const useDisplayStore = create<...>()(...)`
- NO export default en ningún store

---

### Learnings de Stories anteriores

- Proyecto en `C:/dev/bmad-workspace/family-frame/`
- TypeScript strict mode activo — todos los campos del estado deben tener tipos explícitos
- `npx tsc --noEmit` verifica archivos bajo `src/` (tsconfig.app.json)
- `resolveJsonModule: true` en tsconfig.app.json — imports de `.json` funcionan correctamente
- Exports nombrados siempre, no default exports
- Carpeta `src/stores/` ya existe con `.gitkeep` — crear archivos directamente

---

### Referencias

- [Source: epics.md#Story 1.4] — ACs completos y definiciones de estado
- [Source: architecture.md#Frontend Architecture] — stores por dominio, patrón Zustand, naming
- [Source: architecture.md#Communication Patterns] — patrón de updates inmutables con spread

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_ninguno — implementación directa sin obstáculos_

### Completion Notes List

- ✅ AC1: `displayStore.ts` — `useDisplayStore` con `mode: 'welcome'`, `currentPhotoIndex: 0`, `setMode`, `setCurrentPhotoIndex`.
- ✅ AC2: `contentStore.ts` — `useContentStore` con `photos: []`, `yiddishPhrases` inicializado desde `yiddish.json` (32 frases), `birthdays: []`, `welcomeConfig` vacío. Setters planos para todas las propiedades.
- ✅ AC3: `syncStore.ts` — `useSyncStore` con `isOnline: false`, `lastSync: null`, `syncStatus: 'idle'`. Setters planos.
- ✅ AC4: `adminStore.ts` — `useAdminStore` con `isAuthenticated: false`, `setAuthenticated`.
- ✅ AC5: `npx tsc --noEmit` ✅ · `npm run build` ✅ (29 módulos, sin errores).

### File List

- `src/stores/displayStore.ts`
- `src/stores/contentStore.ts`
- `src/stores/syncStore.ts`
- `src/stores/adminStore.ts`

## Code Review Record

### Review Summary

**1 patch aplicado · 6 deferred · 11 dismissed.**
`npx tsc --noEmit` ✅ clean después del patch.

### Patch Aplicado

1. **`contentStore.ts` — remover `as YiddishPhrase[]` cast inseguro**
   - `yiddishData as YiddishPhrase[]` suprimía validación compile-time. La estructura JSON es estructuralmente idéntica a `YiddishPhrase[]` — la asignación directa permite que TypeScript valide schema mismatches reales en el futuro.

### Deferred Items

- State ephemeral (sin persistencia) — por scope Story 1.4; viene en servicios (@capacitor/preferences)
- `currentPhotoIndex` sin bounds-check — responsabilidad del consumidor en Story 2.x
- Sin middleware persist/devtools — explícitamente fuera de scope
- `setAuthenticated` sin logout side-effects — Story 5.x AdminScreen
- Sin `App.addListener('appStateChange')` — scope `useSync` hook Story 2.x
- `welcomeConfig.photoPath` sin validación URI Capacitor — capa de servicios
- `AppMode 'admin'` + `isAuthenticated` sin coupling enforced — UI enforcement Story 5.x

### Dismissed Findings (11)

- `isOnline: false` init: patrón correcto Capacitor (actualizar vía plugin)
- `lastSync: string | null`: por spec AC3
- `syncStatus` union sin 'success': por spec AC3
- `welcomeConfig.photoPath: ''` sentinel: inicial vacío por spec
- `syncStatus: 'error'` sin error details: por spec
- `firstBootStore` ausente: explícitamente out of scope
- bcryptjs/social-login: preexistente Story 1.1
- `setYiddishPhrases` setter: válido para admin edit (architecture)
- `capacitor.config.ts` androidScheme: preexistente
- AC5 no verificable: ya verificado en implementación
- `AppMode`/`isAuthenticated` coupling: por diseño Zustand (no cross-store invariants)
