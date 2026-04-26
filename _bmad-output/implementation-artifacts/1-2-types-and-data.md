# Story 1.2: Tipos TypeScript y datos iniciales

Status: done

## Story

Como desarrollador,
quiero los tipos TypeScript definidos y los archivos de datos iniciales creados,
para que todas las stories siguientes tengan un contrato tipado estable.

## Acceptance Criteria

**AC1 — Tipos TypeScript en `src/types/`:**
- `Photo.ts` define `{ id: string, localPath: string, syncedAt: string }`
- `YiddishPhrase.ts` define `{ yiddish: string, transliteration: string, spanish: string }`
- `Birthday.ts` define `{ id: string, name: string, date: string }` (date en `YYYY-MM-DD`)
- `AppMode.ts` define `type AppMode = 'welcome' | 'kiosk' | 'admin'`

**AC2 — Datos iniciales en `src/data/`:**
- `yiddish.json` contiene al menos 30 frases con estructura `{ yiddish, transliteration, spanish }` — auténticas, no placeholders
- `birthdays.default.json` contiene `[]` (array vacío como estructura base)

**AC3 — TypeScript limpio:**
- `npx tsc --noEmit` sin errores tras agregar todos los archivos

## Tasks / Subtasks

- [x] Task 1 — Crear tipos TypeScript en `src/types/` (AC: 1)
  - [x] 1.1 Crear `src/types/Photo.ts`
  - [x] 1.2 Crear `src/types/YiddishPhrase.ts`
  - [x] 1.3 Crear `src/types/Birthday.ts`
  - [x] 1.4 Crear `src/types/AppMode.ts`

- [x] Task 2 — Crear datos iniciales en `src/data/` (AC: 2)
  - [x] 2.1 Crear `src/data/yiddish.json` — 32 frases auténticas ashkenazi
  - [x] 2.2 Crear `src/data/birthdays.default.json` con `[]`

- [x] Task 3 — Validar TypeScript (AC: 3)
  - [x] 3.1 `npx tsc --noEmit` ✅ sin errores. `npm run build` ✅

## Dev Notes

### Contratos de tipos — exactos, sin variaciones

Seguir exactamente las definiciones del epic. Estos tipos son el contrato que usan todos los stores y servicios en stories posteriores.

```typescript
// Photo.ts
export interface Photo {
  id: string
  localPath: string
  syncedAt: string
}

// YiddishPhrase.ts
export interface YiddishPhrase {
  yiddish: string
  transliteration: string
  spanish: string
}

// Birthday.ts
export interface Birthday {
  id: string
  name: string
  date: string  // formato YYYY-MM-DD, ej: "1945-03-15"
}

// AppMode.ts
export type AppMode = 'welcome' | 'kiosk' | 'admin'
```

**Importante:** Exportar como `interface` para Photo, YiddishPhrase, Birthday y como `type` para AppMode. Usar `export` nombrado, no `export default`.

---

### yiddish.json — frases auténticas

Estructura de cada entrada:
```json
{ "yiddish": "...", "transliteration": "...", "spanish": "..." }
```

- Mínimo 30 frases
- Frases reales del Yiddish (proverbios, dichos, frases cotidianas)
- Transliteración fonética en letras latinas
- Traducción al español (no inglés)
- Variedad temática: familia, sabiduría, humor, vida cotidiana
- No inventar — frases auténticas de la tradición ashkenazi

Ejemplos de categorías a incluir:
- Proverbios de familia y hogar
- Dichos de sabiduría práctica
- Expresiones cotidianas
- Humor judío ashkenazi
- Frases sobre la vida, el tiempo, la memoria

---

### Patrones de naming (Architecture enforcement)

- Tipos TypeScript: `PascalCase` sin prefijos (NO `IPhoto`, NO `TAppMode`)
- Archivos de tipos: `PascalCase.ts` (ej: `Photo.ts`)
- Archivos de datos: `camelCase.json` (ej: `yiddish.json`)
- Export nombrado siempre: `export interface Photo`, `export type AppMode`

---

### Learnings de Story 1.1

- Proyecto en `C:/dev/bmad-workspace/family-frame/`
- TypeScript strict mode activo — todos los campos requeridos deben estar presentes
- `npx tsc --noEmit` verifica solo los archivos bajo `src/` (tsconfig.app.json)
- No crear exports default — solo exports nombrados
- Las carpetas `src/types/` y `src/data/` ya existen con `.gitkeep`; crear archivos directamente, no eliminar `.gitkeep` explícitamente (git lo ignora cuando hay otros archivos)

---

### Scope: qué NO entra en esta story

- NO crear stores Zustand (Story 1.3/1.4)
- NO crear servicios (Stories 2+)
- NO importar estos tipos en App.tsx ni en ningún componente todavía
- NO crear hooks
- Los tipos son solo definiciones — ninguna lógica

### References

- [Source: epics.md#Story 1.2] — Acceptance Criteria y definiciones de tipos
- [Source: architecture.md#Data Architecture] — `yiddish.json` estructura: `{ yiddish, transliteration, spanish }`
- [Source: architecture.md#Naming Patterns] — Convenciones de naming

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_ninguno — implementación directa sin obstáculos_

### Completion Notes List

- ✅ AC1: 4 tipos creados con exports nombrados. `Photo`, `YiddishPhrase`, `Birthday` como `interface`; `AppMode` como `type`.
- ✅ AC2: `yiddish.json` con 32 frases auténticas ashkenazi (proverbios, dichos de familia, sabiduría, humor). Todos los campos `yiddish`+`transliteration`+`spanish` presentes. `birthdays.default.json` = `[]`.
- ✅ AC3: `npx tsc --noEmit` limpio. `npm run build` ✅ (29 módulos, sin errores).

### File List

- `src/types/Photo.ts`
- `src/types/YiddishPhrase.ts`
- `src/types/Birthday.ts`
- `src/types/AppMode.ts`
- `src/data/yiddish.json`
- `src/data/birthdays.default.json`

## Code Review Record

### Review Summary

**2 patches applied, 4 deferred, 6 dismissed.**
`npx tsc --noEmit` ✅ clean after patches.

### Patches Applied

1. **`tsconfig.app.json` — add `resolveJsonModule: true`**
   - Without this flag TypeScript errors on JSON imports (`import data from './yiddish.json'`). Added under Bundler mode options.

2. **`src/data/yiddish.json` entry 20 — Cyrillic `н` → Latin `n`**
   - `"farteylн"` contained Cyrillic U+043D (н) as final character. Fixed to `"farteyn"` (all Latin).

### Deferred Items

- `src/types/index.ts` barrel export — good DX, not in AC; defer to later story
- `Photo.localPath` Capacitor path convention clarification — filesystem service scope (Story 2.x)
- Unvalidated date strings in `Birthday.date` — runtime validation is Story 2.x+ scope
- `Birthday.id` generation strategy — store/service concern, not types
- `AppMode` persistence contract — Story 1.4 (adminStore) scope

### Dismissed Findings

- `syncedAt: string` vs Date — spec explicitly defines `string`; ISO 8601 strings are idiomatic for serializable types
- No `id` on YiddishPhrase — spec contract; static data, array index is sufficient
- AppMode missing null/undefined state — undefined-for-not-loaded handled at store layer (Story 1.4)
- `birthdays.default.json` schema concern — AC2 explicitly requires `[]`
- YiddishPhrase no id for deduplication — static data; yiddish field is unique key
- Photo.syncedAt temporal semantics — string format is by spec
