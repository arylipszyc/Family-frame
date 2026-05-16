---
story_id: '4.6'
epic_id: '4'
title: Reescritura de sync de fotos — Google Drive API + Service Account (reemplaza Photos API + OAuth user)
status: done
created: '2026-05-16'
completed: '2026-05-16'
author: amelia
coordinator: moishe
---

# Story 4.6 — Drive + Service Account rewrite

## Contexto

Google deprecó el scope `photoslibrary.readonly` el 31-mar-2025. La cadena OAuth user + Google Photos API que existía en el código (stories 4.2 + 4.3) ya no puede funcionar: la sesión hardware del 16-may del 2026 dejó que el flujo OAuth completa, pero cualquier llamada subsiguiente a la Photos Library API devuelve `PERMISSION_DENIED: insufficient scopes`.

Decisión tomada con Moishe (ver `_bmad-output/coordination/amelia-x-moishe-drive-sa-rewrite-2026-05-16.md`):

- **Fuente de fotos:** Google Drive (folder compartida con un Service Account).
- **Auth:** Service Account JWT RS256 firmado en cliente con `jose` → access token Google. Sin OAuth user, sin refresh token que expire en 7 días, sin client secret embedded.
- **SA bootstrap:** mismo patrón que Story 4.5 — Ary copia `sa-config.json` por USB a `Directory.External`, la app lo persiste en `@capacitor/preferences` al boot y borra el archivo origen. Cero secretos en el bundle.
- **Folder config:** `albumConfigService` renombrado a `folderConfigService`, ahora lee `drive-folder-config.json` con shape `{ folderId }` → Preferences key `googleDriveFolderId`.

Esta story también cubre cleanup obligatorio: dependencia `@capgo/capacitor-social-login` removida, `MainActivity.java` revertida, `.env.example` actualizada, e instrumentation temporal de diagnóstico OAuth eliminada.

## Acceptance Criteria

- **AC1 — Tests verdes:** `npx vitest run` 159/159, `npx tsc --noEmit` clean. Cobertura jsdom para los 4 servicios nuevos/reescritos (saConfigService, folderConfigService, driveAuthService, driveSyncService) + tests existentes adaptados (useSync, AdminScreen Fotos).
- **AC2 — Cleanup completo:**
  - `@capgo/capacitor-social-login` removido de `package.json` y `package-lock.json`, no aparece en `npx cap sync android` plugin list.
  - `src/services/oauthService.ts` y su test eliminados.
  - `src/services/photoSyncService.ts` y su test eliminados (reemplazados por `driveSyncService`).
  - `src/services/albumConfigService.ts` y su test eliminados (renombrados a `folderConfigService`).
  - `android/app/src/main/java/com/familyframe/app/MainActivity.java` revertida — sin `implements ModifiedMainActivityForSocialLoginPlugin`, sin `onActivityResult`, sin imports `ee.forgr.capacitor.social.login.*`. Mantiene WakeLock intacto.
  - `.env.example` reescrita — sin `VITE_GOOGLE_*` vars.
  - `AdminScreen.tsx`: removidos `oauthService` import, state `isOAuthAuthenticated`/`connectedEmail`, `handleConnectOAuth`, instrumentation temporal con `showToast` de errores OAuth.
- **AC3 — Build APK:** `npm run build` + `npx cap sync android` + `./gradlew assembleRelease` exitosos. APK unsigned generado en `android/app/build/outputs/apk/release/app-release-unsigned.apk` (3.4 MB). Firma final (`apksigner sign`) requiere password interactivo y se completa en sesión hardware de Ary cuando él corre el script — pasos validados sin la firma final.
- **AC4 — Bootstrap end-to-end documentado:**
  - Ary copia **dos archivos** por MTP a `/storage/emulated/0/Android/data/com.familyframe.app/files/`:
    1. `sa-config.json` — el JSON descargado de GCP para la SA `family-frame-photos@family-frame-496520.iam.gserviceaccount.com`.
    2. `drive-folder-config.json` con contenido `{ "folderId": "1nG1xCgiqWfJjXX4ZMHxjOsUGCIhsen32" }`.
  - Primer boot lee ambos, persiste en Preferences (`googleServiceAccountJson` + `googleDriveFolderId`), borra archivos origen.
  - Sync funciona sin más intervención. Validación end-to-end en hardware queda a cargo de Moishe + Ary.
- **AC5 — Story file:** este archivo.
- **AC6 — Sprint-status:** Epic 4 reorganizado — stories 4.2 y 4.3 marcadas deprecadas formalmente, story 4.6 incorporada, story 4.5 mantiene patrón pero con servicio renombrado.

## Tasks

- [x] Quitar dep `@capgo/capacitor-social-login`, agregar `jose` (`npm uninstall ... && npm install jose`).
- [x] Revertir `MainActivity.java` a versión pre-SocialLogin (solo WakeLock).
- [x] Reescribir `.env.example` indicando que el nuevo flujo no usa env vars.
- [x] Eliminar `src/services/oauthService.ts` y su test.
- [x] Crear `src/services/saConfigService.ts` (analogue de `albumConfigService`, valida shape SA JSON, persiste como string en Preferences `googleServiceAccountJson`).
- [x] Crear `src/__tests__/services/saConfigService.test.ts` con 6 casos.
- [x] Renombrar `albumConfigService` → `folderConfigService` (file + key + JSON shape: `{ folderId }`, Preferences key `googleDriveFolderId`, archivo `drive-folder-config.json`).
- [x] Crear `src/__tests__/services/folderConfigService.test.ts` con 6 casos.
- [x] Crear `src/services/driveAuthService.ts` (`isAuthenticated`, `getAccessToken` con cache 50min + JWT RS256 firmado con `jose.SignJWT` + `importPKCS8`, `clearAuth`).
- [x] Crear `src/__tests__/services/driveAuthService.test.ts` con 8 casos mockeando `jose` y `fetch`.
- [x] Crear `src/services/driveSyncService.ts` (lista Drive folder con `mimeType contains 'image/'`, descarga con `alt=media`, paginación, integración con `photoCacheService`/`contentStore`/`syncStore`).
- [x] Crear `src/__tests__/services/driveSyncService.test.ts` con 9 casos.
- [x] Eliminar `src/services/photoSyncService.ts` y su test.
- [x] Actualizar `src/hooks/useSync.ts` para importar `driveAuthService`/`driveSyncService`.
- [x] Actualizar `src/__tests__/hooks/useSync.test.ts` con mocks nuevos.
- [x] Actualizar `src/App.tsx` — agregar `folderConfigService.bootstrapFromFile()` (rename) + `saConfigService.bootstrapFromFile()` en `Promise.all` de boot.
- [x] Reescribir sección Fotos en `src/screens/AdminScreen.tsx` — state `isSAConfigured: boolean | null`, display SA configurado / no configurado / loading, botón "Forzar sincronización" deshabilitado si `!isSAConfigured`.
- [x] Reescribir tests de sección Fotos en `src/__tests__/screens/AdminScreen.test.tsx` (7 casos).
- [x] Verificar `npx tsc --noEmit` clean.
- [x] Verificar `npx vitest run` 159/159 verde.
- [x] Correr `npm run build` + `npx cap sync android` — sync confirma 4 plugins Capacitor (sin social-login).
- [x] Correr `./gradlew assembleRelease` con `JAVA_HOME` = Android Studio JBR 21 — BUILD SUCCESSFUL, APK unsigned generado.

## Dev Notes

### Decisión: renombrar `albumConfigService` → `folderConfigService`

Moishe dejó la decisión abierta: mantener el nombre viejo "menos invasivo" o renombrar. Renombré porque dejar "album" en el nombre cuando ya no hay album en ningún lado iba a confundir a cualquier futuro lector. Git rename detection preserva history.

### Decisión: cache TTL de 50 min en `driveAuthService`

Google access tokens duran 3600s (60 min). Cachear 50 min deja buffer de 10 min — más agresivo que los 60s del OAuth viejo, pero acá no hay refresh token de larga vida que renovar: cada miss firma JWT nuevo y obtiene token nuevo en una sola llamada al endpoint OAuth. Trade-off: más cache hits, refresco más simple.

### Decisión: persistir SA JSON como string completo

`driveAuthService.getAccessToken()` re-parsea el JSON cada vez que se necesita firmar — eso ocurre cada ~50 min, no es hot path. Alternativa rechazada: parsear al bootstrap y guardar `client_email` + `private_key` en keys separadas. La forma elegida mantiene el JSON intacto (más fácil rotar — Ary genera nuevo JSON en GCP y reemplaza el archivo).

### Decisión: en `driveSyncService.sync()`, chequear `folderId` antes que el token

Si la folder no está configurada, no tiene sentido firmar JWT ni pegarle al token endpoint. Optimización barata sobre el flujo viejo. Mantiene la señal pública `sync(): Promise<number>` idéntica a `photoSyncService` para que `useSync` y `AdminScreen` no requieran cambios estructurales en sus handlers.

### Bootstrap en hardware — instrucciones para Ary

1. Conectar tablet por USB. Aceptar "Transferencia de archivos / MTP".
2. En PC, navegar a `<Tablet>/Android/data/com.familyframe.app/files/`.
3. Copiar dos archivos ahí:
   - `sa-config.json` — el JSON descargado desde GCP IAM → Service Accounts → `family-frame-photos@family-frame-496520.iam.gserviceaccount.com` → Keys → Add Key → JSON. (Si ya está bajado, está en `H:\My Drive\family-frame\family-frame-sa.json`).
   - `drive-folder-config.json` con contenido literal:
     ```json
     { "folderId": "1nG1xCgiqWfJjXX4ZMHxjOsUGCIhsen32" }
     ```
4. Reiniciar la app. Ambos archivos desaparecen al primer boot → confirmación de bootstrap exitoso.
5. Abrir Admin → sección Fotos → debe mostrar "SA configurado ✓". Botón "Forzar sincronización" se habilita.
6. Tocar el botón. Sync corre. "X fotos nuevas sincronizadas" o "Sin fotos nuevas" según el estado del folder Drive (`family-frame-fotos` compartido con la SA).

### Riesgo conocido: blast radius del SA

El JSON da acceso de **Viewer** a `family-frame-fotos` solamente (scope `drive.readonly` + permiso Viewer en la folder específica). Si alguien extrae el APK + accede a `Directory.External` (que igualmente quedaría vacío post-bootstrap) o exfiltra Preferences, accede solo a esa carpeta. Mitigación: NO embeber en bundle (cumplido), persistir en Preferences sandbox. Rotación: si la tablet se compromete, GCP IAM → revoke key + generar JSON nuevo + repetir bootstrap.

### Refresh token no aplica

A diferencia del OAuth user, el SA no tiene refresh token. Cada hora (50 min en práctica por TTL del cache) se firma JWT nuevo. Cero riesgo de "expira en 7 días" característico del OAuth en Testing mode.

### Build APK — firma interactiva

`gradle assembleRelease` corre OK con `JAVA_HOME` = Android Studio JBR 21. El paso final de `apksigner sign` requiere password interactivo del keystore — bash tool no puede pasar password por stdin sin TTY, pero Ary tiene la sesión interactiva y este flujo es idéntico a NS-3 (2026-04-27). El APK firmado se generará la primera vez que Ary corra:

```bash
export KEYSTORE_PATH="H:/My Drive/family-frame/family-frame-keystore.jks"
export KEY_ALIAS="family-frame"
bash scripts/build-release.sh
```

Y tipea el password del keystore cuando aparezca el prompt.

### Sobre warnings `act(...)` en tests

`AdminScreen.test.tsx` emite warnings de React `act(...)` no relacionados con esta story — son drift previo documentado en story 4.5 completion notes. No es regresión introducida acá. Todos los 159 tests pasan.

## File List

**Nuevos:**
- `src/services/saConfigService.ts`
- `src/services/folderConfigService.ts` (rename efectivo de `albumConfigService.ts`)
- `src/services/driveAuthService.ts`
- `src/services/driveSyncService.ts` (rewrite efectivo de `photoSyncService.ts`)
- `src/__tests__/services/saConfigService.test.ts`
- `src/__tests__/services/folderConfigService.test.ts`
- `src/__tests__/services/driveAuthService.test.ts`
- `src/__tests__/services/driveSyncService.test.ts`
- `_bmad-output/implementation-artifacts/4-6-drive-sa-rewrite.md` (este archivo)

**Modificados:**
- `package.json` (- `@capgo/capacitor-social-login`, + `jose`)
- `package-lock.json`
- `android/app/src/main/java/com/familyframe/app/MainActivity.java` (revert pre-SocialLogin)
- `.env.example` (sin env vars OAuth)
- `src/App.tsx` (import + bootstrap de saConfigService y folderConfigService)
- `src/hooks/useSync.ts` (driveAuth + driveSync imports)
- `src/screens/AdminScreen.tsx` (sección Fotos rewrite)
- `src/__tests__/hooks/useSync.test.ts`
- `src/__tests__/screens/AdminScreen.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (Epic 4 reorg + story 4.6)
- `_bmad-output/coordination/amelia-x-moishe-drive-sa-rewrite-2026-05-16.md` (entry de cierre)

**Eliminados:**
- `src/services/oauthService.ts`
- `src/services/photoSyncService.ts`
- `src/services/albumConfigService.ts`
- `src/__tests__/services/oauthService.test.ts`
- `src/__tests__/services/photoSyncService.test.ts`
- `src/__tests__/services/albumConfigService.test.ts`

## Completion Notes

- **Tests:** 159/159 verdes (148 originales – 1 obsoleto + 22 nuevos para 4 servicios reescritos + 7 reescritos para AdminScreen Fotos).
- **TypeScript:** `npx tsc --noEmit` sin errores.
- **Web build + cap sync:** OK. Plugin list nativos = 4 (filesystem, network, preferences, kiosk).
- **Gradle assembleRelease:** OK. APK unsigned `app-release-unsigned.apk` (3.4 MB) generado.
- **Firma final pendiente:** requiere password interactivo del keystore. Ary completa en sesión hardware.
- **Validación end-to-end pendiente:** Moishe + Ary deben copiar `sa-config.json` + `drive-folder-config.json` a la tablet, verificar bootstrap, y disparar primer sync real contra `family-frame-fotos` folder.
