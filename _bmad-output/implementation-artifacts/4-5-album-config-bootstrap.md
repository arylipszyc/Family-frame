---
story_id: '4.5'
epic_id: '4'
title: Bootstrap del Album ID de Google Photos vía archivo JSON al boot
status: done
created: '2026-04-26'
completed: '2026-04-26'
author: amelia
coordinator: moishe
---

# Story 4.5 — Album Config Bootstrap

## Contexto

Cierra GAP-1 del sprint status: `photoSyncService` lee `googlePhotosAlbumId` de `@capacitor/preferences` (ver `src/services/photoSyncService.ts:7`), pero hasta ahora ningún flujo lo escribía. Story 5.4 explícitamente excluyó esa UI. Solución acordada con Ary y Moishe: leer una vez al boot un archivo `album-config.json` que Ary deja en la tablet vía USB, persistir el `albumId` en Preferences y borrar el archivo origen para evitar reproceso.

Sin UI, sin permisos runtime, sin cambios al `AndroidManifest.xml`.

## Acceptance Criteria

- **AC1 — Lectura al boot:** En el `Promise.all` de inicialización de `src/App.tsx`, se invoca `albumConfigService.bootstrapFromFile()`. El servicio intenta leer `album-config.json` desde `Directory.External` (`/storage/emulated/0/Android/data/com.familyframe.app/files/album-config.json`). Si el archivo no existe → no-op silencioso, no rompe el boot.

- **AC2 — Parsing y validación:** Si el archivo existe, se parsea como JSON `{ albumId: string }`. Si el JSON es inválido, falta el campo `albumId`, no es string, o es string vacío/whitespace → no-op (no escribe Preferences, no borra archivo). Log informativo.

- **AC3 — Persistencia:** Si la validación pasa, escribe `albumId` en `@capacitor/preferences` con key `googlePhotosAlbumId` — la misma key que `photoSyncService` consume.

- **AC4 — Cleanup:** Tras persistir exitosamente, borra el archivo origen vía `Filesystem.deleteFile`. Si el delete falla, loguea warning pero NO propaga el error — Preferences ya tiene el valor, el sync funciona, el archivo quedará reprocesado en el próximo boot (idempotente: re-escribe el mismo valor).

- **AC5 — Tests:** Tests jsdom mockeando `@capacitor/filesystem` y `@capacitor/preferences`. Cubren los 6 casos: archivo no existe, JSON malformado, falta `albumId`, `albumId` vacío, archivo válido (verifica `Preferences.set` + `Filesystem.deleteFile`), error en delete (verifica que NO rompe).

- **AC6 — Calidad:** `npx tsc --noEmit` y `npx vitest run` ambos verdes. Sin nuevas dependencias npm. Sin cambios a `AndroidManifest.xml`.

## Tasks

- [x] Crear `src/services/albumConfigService.ts` — singleton object con `bootstrapFromFile(): Promise<void>` siguiendo patrón de `storageService.ts`.
- [x] Implementar lectura con `Filesystem.readFile({ path: 'album-config.json', directory: Directory.External, encoding: Encoding.UTF8 })` envuelta en try/catch para "no existe".
- [x] Implementar validación con type guard `isValidConfig(parsed): parsed is { albumId: string }`.
- [x] Implementar persistencia con `Preferences.set({ key: 'googlePhotosAlbumId', value: parsed.albumId })`.
- [x] Implementar cleanup con `Filesystem.deleteFile` envuelto en try/catch que loguea warning.
- [x] Crear `src/__tests__/services/albumConfigService.test.ts` con 6 casos de prueba (cubre AC5).
- [x] Modificar `src/App.tsx` — agregar import + agregar `albumConfigService.bootstrapFromFile()` al `Promise.all` (sin desestructurar el resultado).
- [x] Verificar `npx tsc --noEmit` verde.
- [x] Verificar `npx vitest run` 154/154 verde.

## Dev Notes

### Decisión: Directory.External (sin permisos)

Plan A confirmado por Moishe tras test de campo en hardware (tablet YUSUNOUL Android 14): la carpeta `/storage/emulated/0/Android/data/<appId>/files/` es **visible y escribible vía MTP/USB** desde el PC de Ary. Esto valida el approach sin requerir `MANAGE_EXTERNAL_STORAGE` ni cambios al `AndroidManifest.xml`.

Trade-off rechazado: usar `Directory.ExternalStorage` con path `Download/album-config.json` daría mejor UX (Ary deja el archivo en `Download/`, carpeta familiar) pero requiere `MANAGE_EXTERNAL_STORAGE` runtime, que es intrusivo y agrega un paso al primer boot. Como el bootstrap es operación rara (set-and-forget), la fricción de navegar una vez a la carpeta app-scoped es aceptable.

### Decisión: servicio dedicado

Un servicio `albumConfigService.ts` mantiene el patrón establecido por `storageService.ts`, `photoSyncService.ts`, etc. (singleton object exportado, métodos async). Aunque son ~60 líneas, mantener `App.tsx` solo orquestando es más limpio que inline.

### Idempotencia

Si Filesystem.readFile devuelve un Blob en lugar de string (caso del runtime web/jsdom según versión del plugin), el código maneja ambas formas con `typeof result.data === 'string' ? result.data : await result.data.text()`.

Si `deleteFile` falla pero `Preferences.set` ya corrió, en el próximo boot el archivo se re-procesará y re-escribirá el mismo `albumId` — operación idempotente, sin efecto adverso.

### Instrucciones para Ary (cómo dejar el archivo)

1. Crear archivo de texto `album-config.json` en el PC con contenido:
   ```json
   { "albumId": "<el-album-id-de-google-photos>" }
   ```
2. Conectar la tablet al PC vía USB. Aceptar prompt de "Transferencia de archivos / MTP" en la tablet.
3. En el PC, navegar en el explorador de archivos a:
   `<Tablet>/Android/data/com.familyframe.app/files/`
4. Copiar `album-config.json` ahí.
5. Reiniciar la app (o esperar al próximo boot). El archivo desaparecerá automáticamente — confirmación de que el bootstrap leyó y persistió el valor.
6. Si el archivo NO desaparece, abrir la app, esperar 30s, verificar que aparezcan fotos. Si no, el JSON puede estar mal formado — revisar el contenido y reintentar.

> Nota: el `applicationId` `com.familyframe.app` está confirmado en `android/app/build.gradle:7`. La carpeta `Android/data/com.familyframe.app/files/` solo aparece DESPUÉS de que el APK se instaló y corrió al menos una vez en la tablet.

## File List

**Nuevos:**
- `src/services/albumConfigService.ts`
- `src/__tests__/services/albumConfigService.test.ts`
- `_bmad-output/implementation-artifacts/4-5-album-config-bootstrap.md` (este archivo)

**Modificados:**
- `src/App.tsx` (import + un slot en `Promise.all`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (entry 4.5 + GAP-1 cerrado)

**Sin cambios:**
- `package.json` (sin dependencias nuevas — `@capacitor/filesystem` y `@capacitor/preferences` ya estaban)
- `android/app/src/main/AndroidManifest.xml` (no se requieren permisos runtime)

## Completion Notes

- **Tests:** 154/154 verdes (148 previos + 6 nuevos para `albumConfigService`).
- **TypeScript:** `npx tsc --noEmit` sin errores.
- **Validación end-to-end pendiente en hardware:** dejar `album-config.json` real en la tablet con un albumId real de Google Photos y confirmar que (a) el archivo desaparece tras el boot, (b) el sync trae fotos. Esto se cubre como parte de la validación general de hardware (NS-3/NS-4 en sprint-status).
- **Stderr de tests preexistentes:** `AdminScreen.test.tsx` emite warnings de React `act(...)` no relacionados con esta story — son drift previo, no regresión introducida acá.
