---
thread_id: amelia-x-moishe-2026-04-26
participants: [amelia, moishe]
topic: Mini-story — bootstrap del Album ID de Google Photos vía archivo JSON al boot
last_turn_by: moishe
awaiting: none
status: closed
---

# Coordinación Amelia ↔ Moishe — Album Config Bootstrap (2026-04-26)

## Propósito

Cerrar el gap operativo que impide que Epic 4 (sync de fotos) funcione end-to-end: hoy `photoSyncService` lee `googlePhotosAlbumId` de Preferences pero **nadie lo escribe**. La AdminScreen explícitamente excluyó esa UI (Story 5.4 scope). Resolución acordada con Ary: leer una vez al boot un archivo `album-config.json` que él deja en la tablet vía USB, lo persistir en Preferences y borrar el archivo. Sin UI, ~20 líneas de código + 1 test.

## Protocolo

Este archivo sigue el protocolo en `c:/dev/bmad-workspace/_bmad/docs/coordination-protocol.md`.
Reglas clave: append-only · leer todo posterior a tu última entrada antes de responder · no meter artefactos finales acá (la story va a `_bmad-output/implementation-artifacts/`) · actualizar `last_turn_by` y `awaiting` en frontmatter al escribir.

## Estado actual acordado

- **Stack:** Vite + React 19 + TS strict + Tailwind v3 + Capacitor v8. Plugins ya instalados: `@capacitor/preferences`, `@capacitor/filesystem`, `@capacitor/network`. Ver `package.json`.
- **Test framework:** Vitest + jsdom. Patrón de mocks en `src/__tests__/services/*.test.ts`.
- **Sprint status:** 17 stories formales DONE + 6 stories backfill pendientes (Epics 3 y 4 implementados sin story file). Ver `_bmad-output/implementation-artifacts/sprint-status.yaml` — GAP-1 es lo que esta tarea cierra.
- **Naming patterns:** services = `camelCase + Service`, archivo `camelCase.ts`. Tipos = `PascalCase` sin prefijos. Stores = `camelCase + Store`. Ver `_bmad-output/planning-artifacts/architecture.md`.
- **Repo:** `arylipszyc/Family-frame` en GitHub. Branch `main`, último commit `ac02b3f`.
- **Tablet llegó 25-abr.** Validación en hardware pendiente — pero esta tarea NO necesita hardware para implementar (sí para validar end-to-end después).
- **Tests al 100%:** 148/148. Mantener.

## Thread

### [Moishe → Amelia, 2026-04-26 14:30]

Hola Amelia. Te paso una mini-story chiquita y autocontenida.

**Lo que hay que hacer:**

Crear el bootstrap de `googlePhotosAlbumId` desde un archivo JSON que el usuario (Ary) deja en la tablet vía cable USB. Una vez leído, se persiste en Preferences y el archivo origen se borra para que no se reprocese en el próximo boot.

**Acceptance Criteria propuestos:**

- **AC1 — Lectura al boot:** Al arranque de la app (en `App.tsx`, junto al resto de la inicialización en `Promise.all`), se intenta leer un archivo `album-config.json` desde `Directory.External` (que en Android mapea a `/sdcard/Download/` aprox). Si no existe → no-op silencioso, log opcional con `console.info`.

- **AC2 — Parsing y validación:** Si el archivo existe, se parsea como `{ albumId: string }`. Si el JSON es inválido o el campo `albumId` falta o no es string no-vacío → no-op silencioso (no escribir Preferences, no borrar archivo). El usuario lo intentará de nuevo.

- **AC3 — Persistencia:** Si el JSON es válido, guardar `albumId` en `@capacitor/preferences` con key `googlePhotosAlbumId` (la key que `photoSyncService` ya lee — verificar en `src/services/photoSyncService.ts:7`).

- **AC4 — Cleanup:** Después de persistir exitosamente, borrar el archivo origen vía `Filesystem.deleteFile`. Si la borrada falla, log warning pero no romper el boot — Preferences ya tiene el valor.

- **AC5 — Tests:** Tests jsdom mockeando `@capacitor/filesystem` y `@capacitor/preferences`. Cubrir: archivo no existe, archivo malformado, archivo válido (verifica que escribe Preferences y llama a deleteFile), error en deleteFile (verifica que NO rompe el boot).

- **AC6 — TypeScript:** `npx tsc --noEmit` y `npm run test` ambos pasan al 100% sin nuevos warnings. No nuevas dependencias npm.

**Decisiones a vos (las paso porque sos quien implementa):**

1. **¿Servicio dedicado o lógica inline en App.tsx?** Mi preferencia es `src/services/albumConfigService.ts` con un único método `bootstrapFromFile(): Promise<void>`. Mantiene el patrón de que App.tsx solo orquesta. Pero si sentís que es over-engineering para 20 líneas, contraproponé.

2. **`Directory.External` vs alternativas.** En Capacitor v8, `Directory.External` apunta a `/storage/emulated/0/Android/data/<appId>/files/` por defecto, NO a `/sdcard/Download/`. Para que Ary pueda dejar el archivo desde su PC sin meterse en carpetas de app específicas, probablemente queramos `Directory.ExternalStorage` o leer de `/storage/emulated/0/Download/album-config.json` con path absoluto. Investigá qué Directory + path da el resultado que Ary pueda dejar el archivo en `Download/` con un drag-and-drop USB normal. Si requiere `READ_EXTERNAL_STORAGE` permission runtime, levantá la pregunta antes de implementar — eso afecta AndroidManifest.xml y agrega un paso al primer boot.

3. **Story numbering.** Te sugiero `4-5-album-config-bootstrap.md` (extiende Epic 4 que ya tiene 4.1-4.4 en código sin documentar). Pero si preferís otro número, decímelo.

**Fuentes a leer (en este orden):**

- `_bmad-output/implementation-artifacts/sprint-status.yaml` — GAP-1, contexto del por qué de esta tarea
- `src/services/photoSyncService.ts` — la key `googlePhotosAlbumId` que tu código tiene que escribir (línea 7)
- `src/App.tsx` — ver el `Promise.all` de inicialización donde mete tu nueva carga
- `src/services/storageService.ts` — patrón de servicio (singleton object, métodos async)
- `src/__tests__/services/storageService.test.ts` — patrón de tests con mocks de Preferences
- `_bmad-output/planning-artifacts/architecture.md` (sección "Frontend Architecture" + "Naming Patterns")

**Entregable esperado:**

1. Story file en `_bmad-output/implementation-artifacts/4-5-album-config-bootstrap.md` con ACs finales (vos podés ajustar mis propuestos), Tasks, Dev Notes, File List, Completion Notes.
2. Código implementado: `src/services/albumConfigService.ts` (o decisión justificada de inline).
3. Test: `src/__tests__/services/albumConfigService.test.ts` (o donde corresponda).
4. Modificación: `src/App.tsx` para llamar al bootstrap.
5. AndroidManifest.xml si requiere permiso de lectura externa (analizar).
6. Actualizar `sprint-status.yaml` (sección `epics.epic_4.stories` + cerrar GAP-1).

**Cuándo respondés:**

Antes de implementar, contestá las 3 decisiones (servicio vs inline, Directory + path, story numbering). Si encontrás algo que no cierra (permiso runtime molesto, API rara, etc.), levantá la pregunta acá. Si todo cierra, podés ir directo a implementar y al cerrar me avisás con el resumen + paths del File List.

— Moishe

---

_(próximas entradas van debajo de esta línea)_

### [Amelia → Moishe, 2026-04-26]

Leí todo. Respondo las 3 decisiones y levanto un punto sobre permisos antes de implementar.

**1. Servicio dedicado vs inline → servicio dedicado.**

`src/services/albumConfigService.ts` con `bootstrapFromFile(): Promise<void>`. Coherente con `storageService` y `photoSyncService` (singleton object, métodos async). 20 líneas en un servicio testeable son más limpias que 20 líneas inline en `App.tsx` que rompen el patrón de "App.tsx solo orquesta".

**2. Directory + path → `Directory.External` (app-scoped, sin permisos).**

Investigado. En Capacitor v8 Android:
- `Directory.External` → `/storage/emulated/0/Android/data/<appId>/files/` — **sin permisos runtime, accesible vía USB MTP**.
- `Directory.Documents` → también app-scoped en Android moderno (mismo trade-off de navegación, no gana nada).
- `Directory.ExternalStorage` con `Download/album-config.json` → requiere `MANAGE_EXTERNAL_STORAGE` (no `READ_EXTERNAL_STORAGE` — eso quedó deprecated en Android 11+ para esos paths). Es un permiso intrusivo ("All files access"), molesta a Ary en el primer boot con un setting de Android aparte.

**Mi recomendación: `Directory.External`.** Zero permisos, zero cambios al `AndroidManifest.xml`, zero pasos extra al primer boot. Trade-off: Ary tiene que navegar una vez vía USB a `Android/data/com.familyframe.app/files/` y dejar ahí `album-config.json`. Es una operación rara (set-and-forget) — el costo de UX es bajo comparado con prender permisos globales.

Si vos preferís `Download/` por simplicidad de UX para Ary y aceptás el permission prompt → cambio a `Directory.ExternalStorage` + `MANAGE_EXTERNAL_STORAGE`. Pero por defecto voy con External.

**Confirmación pedida — appId.** Verifico el `applicationId` real en `android/app/build.gradle` antes de documentarlo en la story (es lo que aparece en el path `/Android/data/<appId>/`). Si no es `com.familyframe.app` lo corrijo.

**3. Story numbering → `4-5-album-config-bootstrap.md`.** ✅ De acuerdo.

**Plan de implementación una vez confirmes:**

1. Crear `src/services/albumConfigService.ts` con `bootstrapFromFile()`:
   - `Filesystem.readFile({ path: 'album-config.json', directory: Directory.External, encoding: Encoding.UTF8 })`
   - try/catch para "no existe" → no-op silencioso
   - parse + validar `{ albumId: string }` no-vacío → si inválido no-op
   - `Preferences.set({ key: 'googlePhotosAlbumId', value: albumId })`
   - `Filesystem.deleteFile(...)` con try/catch que loguea warning pero no rompe
2. Test `src/__tests__/services/albumConfigService.test.ts` cubriendo los 5 casos del AC5.
3. Modificar `App.tsx` — agregar `albumConfigService.bootstrapFromFile()` al `Promise.all` (sin desestructurar resultado, ignora el slot).
4. Crear story file `_bmad-output/implementation-artifacts/4-5-album-config-bootstrap.md` con ACs finales, Tasks, Dev Notes (incluye instrucciones de USB para Ary), File List, Completion Notes.
5. Actualizar `sprint-status.yaml` — agregar `epic_4.stories[4.5]` y cerrar GAP-1.
6. Verificar `npx tsc --noEmit` y `npm run test` 100% verdes.

**No agrego dependencias npm.** `@capacitor/filesystem` ya está en `package.json:17`.

Si confirmás (y/o cambiás algo), arranco. Si querés que vaya directo (carta blanca), dejame el OK y lo cierro de una.

— Amelia

---

### [Moishe → Amelia, 2026-04-26 14:55]

Pausa breve antes de implementar. Surgió un riesgo que no flagueé en el briefing: en **Android 11+ Google restringió el acceso vía MTP/USB a `Android/data/<appId>/files/`**. Algunos vendors de tablet permiten leer/escribir ahí desde el PC, otros la dejan read-only, otros la hacen invisible. La tablet del proyecto es YUSUNOUL Android 14 — desconocido qué hace.

Si implementás Plan A (`Directory.External`) y resulta que la carpeta es invisible vía MTP en YUSUNOUL → el bootstrap es inútil y rehacés.

Ary va a hacer un test de campo (5 min): conectar la tablet al PC vía USB y verificar si puede ver y escribir en `Android/data/<algún-appId-existente>/files/` (no podemos usar `com.familyframe.app` porque el APK aún no está instalado — usamos cualquier app pre-existente como referencia).

Esperá el resultado del test. Te aviso acá:

- **Si ve y puede escribir** → vamos Plan A (`Directory.External`), arrancás como propusiste.
- **Si la carpeta es invisible o read-only** → pivot a Plan B (`MANAGE_EXTERNAL_STORAGE` + `/sdcard/Download/album-config.json`). Te paso ACs ajustados.

Mientras tanto stand by — no tires código. ETA: dentro de la sesión, espero.

— Moishe

---

### [Moishe → Amelia, 2026-04-26 15:25]

Test confirmado en hardware. La tablet YUSUNOUL Android 14 expone `/storage/emulated/0/Android/data/<appId>/files/` vía MTP **lectura y escritura** desde el PC de Ary. Probó copiar y borrar un archivo dentro de `Android/data/com.android.chrome/files/` sin error.

**Plan A confirmado. Carta blanca para implementar como propusiste.**

Quick recap de lo acordado:
- Servicio dedicado `src/services/albumConfigService.ts` con `bootstrapFromFile()`
- `Directory.External` + `path: 'album-config.json'` (sin permisos, sin manifest)
- Story `4-5-album-config-bootstrap.md`
- AC1-AC6 como están en mi briefing inicial — podés ajustar wording si querés

**Recordatorio de Dev Notes para Ary:** en la story incluí instrucciones claras para él de cómo dejar el archivo en la tablet (path exacto `<Tablet>/Android/data/com.familyframe.app/files/album-config.json` vía MTP, una vez instalado el APK). Verificá el `applicationId` real en `android/app/build.gradle` antes de hardcodearlo en docs.

Cuando cierres, me avisás con resumen + paths del File List + estado de tests. Dejame también un comentario sobre cómo modificaste `sprint-status.yaml` (qué entry agregaste y dónde marcaste GAP-1 como cerrado) para que pueda hacer audit rápido.

Adelante.

— Moishe

---

### [Amelia → Moishe, 2026-04-26 — CIERRE]

Implementado y verificado. Confirmé `applicationId = com.familyframe.app` en `android/app/build.gradle:7` antes de hardcodearlo en docs.

**File List:**

Nuevos:
- `src/services/albumConfigService.ts` — singleton con `bootstrapFromFile(): Promise<void>`. Read → parse → validate → Preferences.set → deleteFile. Cada paso failsafe.
- `src/__tests__/services/albumConfigService.test.ts` — 6 tests cubriendo AC5: archivo no existe, JSON malformado, falta `albumId`, `albumId` whitespace, happy path (verifica `Preferences.set` + `Filesystem.deleteFile`), `deleteFile` falla (verifica que NO rompe).
- `_bmad-output/implementation-artifacts/4-5-album-config-bootstrap.md` — story con AC1-AC6, Tasks marcados [x], Dev Notes con instrucciones MTP para Ary, File List, Completion Notes.

Modificados:
- `src/App.tsx` — agregué import + un slot al `Promise.all` de inicialización (`albumConfigService.bootstrapFromFile()`). No desestructurado: usa el slot vacío como los demás side-effect-only.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — ver sección audit abajo.

Sin cambios: `package.json` (cero deps nuevas), `AndroidManifest.xml` (cero permisos nuevos — Plan A confirmado).

**Tests:** `npx vitest run` → **154/154 verde** (148 previos + 6 nuevos).
**TypeCheck:** `npx tsc --noEmit` → limpio, sin warnings nuevos.

**Audit de cambios a `sprint-status.yaml` (para que revises rápido):**

1. `summary.total_stories`: 23 → **24**.
2. `summary.done`: 17 → **18**.
3. `epics.epic_4.note`: agregué mención a Story 4.5 cerrando GAP-1.
4. `epics.epic_4.stories`: agregué entry `{ id: '4.5', file: 4-5-album-config-bootstrap.md, status: done, note: '...' }`.
5. `tests.count`: 148 → **154**.
6. `risks_and_gaps[GAP-1].severity`: `high` → **`closed`**, agregué campo `resolution` con fecha y referencia a Story 4.5. Removí el campo `options` (ya no aplica). Quedaría más limpio mover GAP-1 a una sección `resolved_gaps` aparte si querés más adelante — no lo hice porque sale del scope.
7. `next_steps.recommended_order[NS-2]`: agregué campo `status: done` con comentario de fecha.

**Validación end-to-end pendiente en hardware:** Ary necesita dejar el `album-config.json` real con un albumId real de Google Photos en la tablet (instrucciones detalladas en Dev Notes de la story) y verificar que (a) el archivo desaparece tras el primer boot, (b) el sync trae fotos. Esto cae bajo NS-3/NS-4 del sprint plan.

**Notas menores:**
- En tests usé `result.data` como string directamente (lo que devuelve el plugin con `Encoding.UTF8`). El servicio igualmente tolera Blob vía `await result.data.text()` si el runtime nativo cambia el comportamiento — defensivo pero barato.
- Stderr ruidoso en `AdminScreen.test.tsx` con warnings de React `act(...)` — preexistente, no es regresión mía.

GAP-1 cerrado. Listo para que avances con NS-3 (build APK firmado + sideload) o lo que sigas priorizando.

— Amelia

---

### [Moishe → Amelia, 2026-04-26 22:25 — ACEPTACIÓN]

Audit pasó:
- 3 archivos nuevos presentes (servicio + test + story)
- `App.tsx:48` llama `albumConfigService.bootstrapFromFile()`
- `applicationId = com.familyframe.app` confirmado
- `npx vitest run` → 154/154 verde
- `sprint-status.yaml` consistente (24 total, 18 done, GAP-1 closed, NS-2 done, tests 154)
- Sin deps nuevas, sin cambios a AndroidManifest
- Coord file y archivos de Amelia van al commit; `.claude/settings.local.json` queda fuera (config local de sesión, no de proyecto)

Aceptado y cerrado. Buen trabajo, sin retoques.

— Moishe
