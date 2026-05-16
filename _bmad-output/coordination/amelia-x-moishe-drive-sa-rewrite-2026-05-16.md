---
thread_id: amelia-x-moishe-drive-sa-rewrite-2026-05-16
participants: [amelia, moishe]
topic: Reescribir sync de fotos de Google Photos API → Google Drive API con Service Account
last_turn_by: amelia
awaiting: moishe
status: implementation_complete_pending_hardware_validation
---

# Coordinación Amelia ↔ Moishe — Drive + SA rewrite (2026-05-16)

## Propósito

Reescribir la cadena de OAuth + Google Photos API por Service Account + Google Drive API. Google deprecó `photoslibrary.readonly` el 31-mar-2025 — el flujo actual no puede funcionar. La sesión de hoy 16-may agotó las opciones de Photos API en hardware real (Photos Library API devuelve `PERMISSION_DENIED: insufficient scopes` en runtime).

## Protocolo

Este archivo sigue el protocolo en `c:/dev/bmad-workspace/_bmad/docs/coordination-protocol.md`.
Reglas clave: append-only · leer todo posterior a tu última entrada antes de responder · no meter artefactos finales acá (van a `planning-artifacts/` / `implementation-artifacts/`) · actualizar `last_turn_by` y `awaiting` en frontmatter al escribir.

## Estado actual acordado

### Decisión arquitectónica

- **Fuente de fotos:** Google Drive (carpeta compartida con el SA), reemplazando Google Photos API.
- **Auth:** Service Account JSON + JWT RS256 → access token de Google (sin OAuth user, sin refresh token expirable).
- **SA storage:** NO embeber el JSON en el bundle. Bootstrap al boot desde `Directory.External` (MTP push), persistir en `@capacitor/preferences`, borrar archivo origen. Mismo patrón que `albumConfigService.bootstrapFromFile()` (Story 4.5).
- **Lib JWT:** `jose` (npm). Browser/WebView native via Web Crypto API. Sin Node deps. Tree-shakeable. Verificado por Moishe en spike técnico.

### Datos operativos confirmados

- **GCP project:** `family-frame-496520` (cuenta personal `arylip@gmail.com`, NO workspace).
- **Service Account email:** `family-frame-photos@family-frame-496520.iam.gserviceaccount.com`
- **SA JSON local (no commitear):** `H:\My Drive\family-frame\family-frame-sa.json`
- **Drive folder Ary:** `family-frame-fotos` en `arylip@gmail.com` Drive.
  - **folderId:** `1nG1xCgiqWfJjXX4ZMHxjOsUGCIhsen32`
  - Compartida con el SA email como Viewer.
  - Tiene fotos de prueba.
- **Drive API habilitada** en el GCP project.
- **applicationId Android:** `com.familyframe.app` (sin cambio).
- **Deadline:** 2026-05-19 (3 días, ajustado por Ary el 11-may).

### Cleanup obligatorio (parte del scope)

Hoy se hicieron cambios para validar Photos API que ahora son código muerto. Tienen que desaparecer:

1. **Dependencia:** quitar `@capgo/capacitor-social-login` del `package.json` + `package-lock.json` + `cap sync`.
2. **`android/app/src/main/java/com/familyframe/app/MainActivity.java`:** revertir a la versión pre-SocialLogin. Solo dejar imports y métodos del WakeLock. Sacar `implements ModifiedMainActivityForSocialLoginPlugin`, `onActivityResult`, `IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin`, e imports de `ee.forgr.capacitor.social.login.*`. Mantener el patch Windows del `build-release.sh` (no relacionado).
3. **`src/services/oauthService.ts`:** eliminar.
4. **`src/__tests__/services/oauthService.test.ts`** (si existe): eliminar.
5. **`.env.example`:** sacar `VITE_GOOGLE_WEB_CLIENT_ID` y `VITE_GOOGLE_CLIENT_SECRET`. El nuevo flujo no usa env vars.
6. **`.env`** (gitignored, ya en disk de Ary): se vacía solo, no requiere acción en repo.
7. **`src/screens/AdminScreen.tsx` sección Fotos:**
   - Quitar: imports de `oauthService`, state `isOAuthAuthenticated` + `connectedEmail`, `handleConnectOAuth`, botón "Conectar Google Photos" (y deshabilitado), display de email conectado.
   - Quitar: `useEffect` de mount que checa auth + email.
   - Mantener: estado de sync (`lastSync`, `photos.length`), botón "Forzar sincronización", display de SA configurado / no configurado.
   - **Revertir instrumentation temporal** del 16-may: el `catch (err) { console.error('[OAuth] login failed:', err); showToast(\`OAuth: ${err...}\`, SEPIA, 8000) }` lo agregué para diagnóstico y ahora es código muerto. El handler entero se va.
8. **Tests:** actualizar todos los tests que mockean `oauthService` o `photoSyncService` con la API vieja. `AdminScreen.test.tsx` sección Fotos necesita rewrite completo.
9. **Sprint-status.yaml:** actualizar Epic 4 — stories 4.1-4.4 quedan deprecadas formalmente (drift documental ahora corregido por reescritura). Story 4.5 (album-config bootstrap) se mantiene como patrón pero el servicio se renombra.

## Spec técnica de los servicios nuevos

### `src/services/saConfigService.ts` (nuevo)

Análogo a `albumConfigService.ts`. Singleton object exportado.

- `bootstrapFromFile(): Promise<void>`: lee `sa-config.json` desde `Directory.External` (path `/storage/emulated/0/Android/data/com.familyframe.app/files/sa-config.json`). Validá que sea un JSON de SA Google (campos `type`, `private_key`, `client_email`, `private_key_id` mínimos). Si OK, persistilo como string completo en `@capacitor/preferences` key `googleServiceAccountJson`. Borrá el archivo origen.
- Mismo manejo de errores que `albumConfigService`: no-op silencioso si no existe, log + no-op si JSON inválido.
- Llamarse al boot en `App.tsx` (al lado del `albumConfigService.bootstrapFromFile()`).
- Tests jsdom equivalentes a `albumConfigService.test.ts`.

### `src/services/folderConfigService.ts` (rename de `albumConfigService.ts`)

Renombrar y adaptar: lee `drive-folder-config.json` con shape `{ folderId: string }`. Persiste en Preferences key `googleDriveFolderId`. Mantiene exactamente el mismo patrón de bootstrap + cleanup + idempotencia.

Podés mantener `albumConfigService.ts` como nombre del archivo si te resulta menos invasivo refactor — lo crítico es que la key de Preferences sea `googleDriveFolderId` y la shape del JSON sea `{ folderId }`. Decisión tuya.

### `src/services/driveAuthService.ts` (nuevo)

Reemplaza `oauthService.ts` conceptualmente.

API:
- `isAuthenticated(): Promise<boolean>` — checá si `googleServiceAccountJson` está en Preferences.
- `getAccessToken(): Promise<string>` — devolvé un access token de Google válido. Cache in-memory con TTL ~50min (token Google dura 60min, dejar buffer). Si no hay cache válido:
  1. Leer SA JSON de Preferences. Si no existe, throw.
  2. Parse JSON, extraer `client_email` y `private_key` (PEM).
  3. Construir JWT con claims: `iss=client_email`, `scope=https://www.googleapis.com/auth/drive.readonly`, `aud=https://oauth2.googleapis.com/token`, `iat=<now>`, `exp=<now+3600>`.
  4. Firmar con `jose.SignJWT` + `jose.importPKCS8(private_key, 'RS256')`.
  5. POST a `https://oauth2.googleapis.com/token` con body `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<JWT>` (URLSearchParams).
  6. Cache + return `access_token`.
- `clearAuth(): Promise<void>` — quitá `googleServiceAccountJson` y reseteá cache (igual que `clearAuth` original).

### `src/services/driveSyncService.ts` (rename / rewrite de `photoSyncService.ts`)

Mantener mismas señales públicas para minimizar impacto en consumers (`useSync.ts` hook, AdminScreen `handleForceSync`):

- `sync(): Promise<number>` — devuelve count de fotos nuevas. Re-throw on error. Set syncStatus `syncing` → `idle` o `error`.

Implementación:
1. Token de `driveAuthService.getAccessToken()`.
2. `folderId` de Preferences (`googleDriveFolderId`). Si no está, return 0 (igual que original con `albumId`).
3. Listar archivos del folder:
   ```
   GET https://www.googleapis.com/drive/v3/files
     ?q='<folderId>' in parents and mimeType contains 'image/' and trashed=false
     &fields=files(id,name,mimeType,modifiedTime)
     &pageSize=100
   ```
   Authorization: `Bearer <token>`. Paginar con `nextPageToken` si hay.
4. Filtrar los que no estén en `photoCacheService.hasPhoto(id)`.
5. Para cada uno:
   ```
   GET https://www.googleapis.com/drive/v3/files/<fileId>?alt=media
   ```
   Authorization: `Bearer <token>`. Descargar como blob. Guardar via `photoCacheService.savePhoto(id, blob)`.
6. Refrescar `contentStore.setPhotos(await photoCacheService.getAllCachedPhotos())`.
7. `syncStore.setLastSync(new Date().toISOString())`.

### `src/screens/AdminScreen.tsx` sección Fotos (rewrite)

Después del cleanup descrito arriba:
- State: `isSyncing` (mantener), `isSAConfigured` (nuevo — `boolean | null` mientras cargás de Preferences).
- `useEffect` mount: `driveAuthService.isAuthenticated()` → `setIsSAConfigured(...)`.
- Display: "SA configurado ✓" / "SA no configurado — copiá `sa-config.json` por USB" / loading.
- Display: fotos en caché (`contentStore.photos.length`) + último sync (mantener).
- Botón "Forzar sincronización" deshabilitado si `!isSAConfigured || isSyncing`.
- Toast: mantener el patrón actual de `showToast` con `duration`.

### `package.json`

- Agregar dep: `jose` (latest v5).
- Quitar dep: `@capgo/capacitor-social-login`.
- `npm install` + `npx cap sync android` para actualizar plugins.

### Tests

Cada servicio nuevo necesita su test jsdom. Patrón ya establecido (`albumConfigService.test.ts` es buena referencia). Mockear:
- `@capacitor/preferences` y `@capacitor/filesystem` igual que antes.
- `jose` (para `driveAuthService` testear sin crypto real — mockear `importPKCS8` y `SignJWT`).
- `fetch` global para token endpoint y Drive API.

Verde: `npx vitest run` + `npx tsc --noEmit` ambos sin errores.

## Criterios de aceptación (Definition of Done)

1. **Tests:** `npx vitest run` verde. `npx tsc --noEmit` clean.
2. **Cleanup completo:** `@capgo/capacitor-social-login` no aparece en `package.json` ni en código. `oauthService.ts` eliminado. `MainActivity.java` revertida. `.env.example` actualizado. Instrumentation temporal de Moishe revertida.
3. **Build APK:** `bash scripts/build-release.sh` (con `KEYSTORE_PATH` + `KEY_ALIAS` exportados) produce `app-release.apk` sin errores.
4. **Bootstrap funcional en hardware:** documentado en File List que el flujo es: Ary copia `sa-config.json` + `drive-folder-config.json` via MTP a `/Android/data/com.familyframe.app/files/` → primer boot lee ambos, persiste en Preferences, borra archivos. Validación end-to-end queda a cargo de Moishe + Ary en sesión hardware.
5. **Story file:** `_bmad-output/implementation-artifacts/4-drive-sa-rewrite.md` (epic 4, número libre) con story completa al estilo de las anteriores. Status: `done` al cerrar.
6. **Sprint-status.yaml:** actualizado — Epic 4 reorganizado con stories deprecadas marcadas explícitamente y la nueva story incorporada.

## Riesgo conocido y mitigación

- **Blast radius del SA:** el JSON da acceso de Viewer a `family-frame-fotos`. Si alguien extrae el APK + `Directory.External`, accede solo a esa carpeta. Mitigación: NO embeber en bundle, persistir solo en Preferences (sandbox app). Documentar en la story que el SA puede rotarse en GCP si la tablet se compromete (revoke key + emitir nueva).
- **Refresh token de SA:** no existe — cada hora se firma JWT nuevo y se obtiene access token nuevo. No hay riesgo de "expira en 7 días" como en OAuth user en Testing.
- **Carpeta `Android/data/com.familyframe.app/files/` solo existe DESPUÉS de que el APK se instaló y corrió al menos una vez** (igual que en Story 4.5 — caveat ya documentado).

## Deadline

**2026-05-19** (3 días). Si encontrás algo que te demore más de 2h sobre el plan, **dejá entry en este thread con bloqueo y status, no consumas tiempo en debug solo**.

---

## Thread

### [Moishe → Amelia, 2026-05-16 ~15:30]

Briefing arriba. Trabajo en branch `main` (Ary opera directo sin feature branches en family-frame). Antes de empezar, leé:

- `_bmad-output/implementation-artifacts/4-5-album-config-bootstrap.md` — patrón canónico de bootstrap-from-file que vas a replicar para `saConfigService`.
- `src/services/photoCacheService.ts` — API de caché que se mantiene sin cambios.
- `src/hooks/useSync.ts` — consumer de `sync()` que tiene que seguir compilando.

Si surge duda sobre shape de respuestas Drive API o claims JWT, prefiero que respondas acá antes de inventar — el setup en GCP ya está hecho y puedo verificar contra un endpoint real.

---

_(próximas entradas van debajo de esta línea)_

### [Amelia → Moishe, 2026-05-16 ~17:30]

Implementación completa. Story file: `_bmad-output/implementation-artifacts/4-6-drive-sa-rewrite.md`. Sprint-status actualizado (Epic 4 reorganizado — 4.2 y 4.3 deprecadas formalmente, 4.6 incorporada, 4.5 mantiene patrón con servicio renombrado).

**Estado de los AC:**

- **AC1 (tests):** ✅ `npx tsc --noEmit` clean. `npx vitest run` 159/159 verde. Cobertura para los 4 servicios nuevos/reescritos (saConfigService 6 casos, folderConfigService 6 casos, driveAuthService 8 casos, driveSyncService 9 casos) + useSync + AdminScreen Fotos reescritos.
- **AC2 (cleanup):** ✅ `@capgo/capacitor-social-login` removido de `package.json`/`package-lock.json`/native plugins (`cap sync` confirma 4 plugins). `oauthService.ts`/`photoSyncService.ts`/`albumConfigService.ts` + sus tests eliminados. `MainActivity.java` revertida (solo WakeLock). `.env.example` reescrita. Instrumentation temporal removida.
- **AC3 (build APK):** ⚠️ parcial. `npm run build` + `cap sync` + `gradle assembleRelease` OK (con `JAVA_HOME = Android Studio JBR 21`). APK unsigned generado en `android/app/build/outputs/apk/release/app-release-unsigned.apk` (3.4 MB). El paso final de `apksigner sign` requiere password interactivo del keystore — bash tool no puede pasar password por stdin. **Necesito que Ary corra `bash scripts/build-release.sh` con `KEYSTORE_PATH`+`KEY_ALIAS` exportados, en sesión interactiva, para tipear el password una vez** (idéntico a NS-3 del 2026-04-27).
- **AC4 (bootstrap docs):** ✅ documentado en story Dev Notes — Ary copia dos archivos por MTP: `sa-config.json` (descargado de GCP) + `drive-folder-config.json` con `{ "folderId": "1nG1xCgiqWfJjXX4ZMHxjOsUGCIhsen32" }`. Validación end-to-end queda a tu cargo + Ary.
- **AC5 (story file):** ✅ creada.
- **AC6 (sprint-status):** ✅ actualizado.

**Cosa a destacar para Ary:**

Los nombres de archivos JSON en la tablet son **dos archivos distintos**, no uno solo:
- `sa-config.json` — JSON completo de la Service Account (varios KB, contiene `private_key`, `client_email`, etc.)
- `drive-folder-config.json` — un solo campo: `{ "folderId": "1nG1xCgiqWfJjXX4ZMHxjOsUGCIhsen32" }`

Ambos van a `/storage/emulated/0/Android/data/com.familyframe.app/files/`. Al primer boot ambos desaparecen automáticamente. Si NO desaparecen, el JSON puede estar mal formado o el SA JSON puede no tener todos los campos requeridos (`type=service_account` + `private_key` + `client_email` + `private_key_id`).

**Decisión que tomé sin consultar (avisame si querés revertir):**

Renombré `albumConfigService` → `folderConfigService` (file + tests). Vos dejaste la decisión abierta. Renombré porque mantener "album" en el nombre cuando no hay album en ningún lado iba a confundir cualquier futuro lector. Git rename detection preserva history.

**No-blockers que encontré pero no rompieron flujo:**

- Warnings `act(...)` en `AdminScreen.test.tsx` son drift previo (documentado en story 4.5 completion notes), no regresión introducida por 4.6.
- Vuln npm "1 high severity" (informe de `npm install`) es preexistente, no relacionado con jose.

**Próximo paso (NS-4-bis en sprint-status):**

1. Ary firma el APK con keystore (build script + password interactivo).
2. Sideload en tablet con `adb install -r app-release.apk`.
3. Copia los dos archivos JSON por MTP.
4. Verifica que desaparecen al primer boot, AdminScreen → Fotos → "SA configurado ✓".
5. Forzar sync → ver que las fotos prueba de `family-frame-fotos` aparecen.

Te dejo el thread abierto — `last_turn_by: amelia`, `awaiting: moishe`. Si algo falla en hardware, lo retomamos acá.

— Amelia
