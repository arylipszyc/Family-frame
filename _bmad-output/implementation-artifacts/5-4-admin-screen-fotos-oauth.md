# Story 5.4: AdminScreen — Fotos: Sync Manual y Estado OAuth

Status: done

## Story

Como administrador (Ary),
quiero ver el estado de sincronización de fotos y poder forzar un sync manual desde el admin,
para verificar que las fotos de los hermanos están llegando y resolver problemas de conectividad.

## Acceptance Criteria

**AC1 — Sección "Fotos" — estado de sincronización:**
- Muestra estado OAuth: "Conectado como [email]" o "Desconectado — reconectar necesario"
- Muestra fecha/hora del último sync exitoso (`syncStore.lastSync`)
- Muestra número de fotos en caché local (`contentStore.photos.length`)

**AC2 — Botón "Conectar Google Photos" (cuando desconectado):**
- `oauthService.login()` → al completar: estado se actualiza a "Conectado"
- Error → toast de error en `frame-sepia`

**AC3 — Botón "Forzar sincronización" (cuando autenticado):**
- Muestra `"Sincronizando..."` mientras dura el sync
- Resto de AdminScreen permanece usable durante el sync
- Al completar con fotos nuevas: toast `"X fotos nuevas sincronizadas"` en `frame-amber` (3 segundos)
- Al completar sin cambios: toast `"Sin fotos nuevas"` en `frame-amber` (2 segundos)
- Si hay error de red: toast `"Sin conexión — usando caché"` en `frame-sepia` (4 segundos)

**AC4 — Botón deshabilitado si no autenticado:**
- Texto: `"Conectar Google Photos primero"`, `disabled`

## Tasks / Subtasks

- [x] Task 1 — `photoSyncService.ts`: retorna conteo + error status
  - [x] 1.1 — `sync()` retorna `Promise<number>` (conteo de fotos nuevas)
  - [x] 1.2 — On error: `syncStore.setSyncStatus('error')` + re-throw (no silenciar)
  - [x] 1.3 — On success: `syncStore.setSyncStatus('idle')`
  - [x] 1.4 — Actualizar `photoSyncService.test.ts`: tests de error esperan 'error', sync retorna número

- [x] Task 2 — `oauthService.ts`: persistencia de email
  - [x] 2.1 — Agregar `OAUTH_EMAIL_KEY = 'oauthEmail'`
  - [x] 2.2 — En `login()`: extraer email de `result.result.profile?.email` y persistir
  - [x] 2.3 — Agregar `getEmail(): Promise<string | null>`
  - [x] 2.4 — En `clearAuth()`: remover también `oauthEmail`

- [x] Task 3 — `AdminScreen.tsx`: sección "Fotos"
  - [x] 3.1 — Imports: `useEffect`, `oauthService`, `useSyncStore`, `photoSyncService`
  - [x] 3.2 — `showToast` acepta `duration` opcional (default 2000ms)
  - [x] 3.3 — Local state: `isOAuthAuthenticated`, `connectedEmail`, `isSyncing`
  - [x] 3.4 — `useEffect` en mount: verificar auth + email
  - [x] 3.5 — `handleConnectOAuth` + `handleForceSync`
  - [x] 3.6 — Sección "Fotos" en JSX (entre Bienvenida y Configuración)

- [x] Task 4 — Tests
  - [x] 4.1 — Actualizar `AdminScreen.test.tsx`: mocks para oauthService + photoSyncService
  - [x] 4.2 — Tests sección Fotos: 8 tests
  - [x] 4.3 — Validación: `npx tsc --noEmit` + `npm run test` 100% (140/140)

## Dev Notes

### Cambio en `photoSyncService.sync()`

```typescript
// Antes: Promise<void>, silencia errores, siempre sets 'idle'
// Después: Promise<number>, re-throw en error, sets 'error' en catch, 'idle' en success

async sync(): Promise<number> {
  const syncStore    = useSyncStore.getState()
  const contentStore = useContentStore.getState()
  syncStore.setSyncStatus('syncing')
  try {
    const token = await oauthService.getToken()
    const { value: albumId } = await Preferences.get({ key: ALBUM_ID_KEY })
    if (!albumId) {
      syncStore.setSyncStatus('idle')
      return 0
    }
    const newItems = await fetchNewMediaItems(token, albumId)
    if (newItems.length > 0) {
      for (const item of newItems) {
        const blob = await fetch(`${item.baseUrl}=d`).then((r) => r.blob())
        await photoCacheService.savePhoto(item.id, blob)
      }
      const allPhotos = await photoCacheService.getAllCachedPhotos()
      contentStore.setPhotos(allPhotos)
    }
    syncStore.setLastSync(new Date().toISOString())
    syncStore.setSyncStatus('idle')
    return newItems.length
  } catch (err) {
    console.error('[photoSyncService] sync failed:', err)
    syncStore.setSyncStatus('error')
    throw err
  }
}
```

### Cambio en tests de `photoSyncService`

Los 2 tests de error deben:
- Usar `await expect(photoSyncService.sync()).rejects.toThrow()` o `try/catch`
- Verificar `syncStatus === 'error'` (no 'idle')

### Email en `oauthService`

```typescript
// En login(), después de validar offline response:
const profile = (result.result as { profile?: { email?: string } }).profile
const email = profile?.email ?? null
if (email) {
  await Preferences.set({ key: OAUTH_EMAIL_KEY, value: email })
}

// Nuevo método:
async getEmail(): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key: OAUTH_EMAIL_KEY })
    return value ?? null
  } catch {
    return null
  }
}
```

### showToast con duration

```typescript
function showToast(message: string, color: string, duration = 2000) {
  if (toastTimerRef.current)     clearTimeout(toastTimerRef.current)
  if (toastFadeTimerRef.current) clearTimeout(toastFadeTimerRef.current)
  setToastData({ message, color })
  setToastVisible(true)
  toastTimerRef.current = setTimeout(() => {
    setToastVisible(false)
    toastFadeTimerRef.current = setTimeout(() => setToastData(null), 300)
  }, duration)
}
```

### handleForceSync

```typescript
const handleForceSync = useCallback(async () => {
  if (!isOAuthAuthenticated || isSyncing) return
  setIsSyncing(true)
  try {
    const newCount = await photoSyncService.sync()
    if (newCount > 0) {
      showToast(`${newCount} fotos nuevas sincronizadas`, AMBER, 3000)
    } else {
      showToast('Sin fotos nuevas', AMBER, 2000)
    }
  } catch {
    showToast('Sin conexión — usando caché', SEPIA, 4000)
  } finally {
    setIsSyncing(false)
  }
}, [isOAuthAuthenticated, isSyncing])
```

### Scope — qué NO entra

- NO desconectar Google Photos (solo conectar)
- NO gestión de álbum ID
- NO auto-sync periódico

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- `photoSyncService.ts`: `sync()` ahora retorna `Promise<number>` (fotos descargadas), set 'error' on failure, re-throw para que el caller maneje el toast.
- `oauthService.ts`: agrega persistencia de email (`oauthEmail` key), `getEmail()` method, `clearAuth()` limpia ambas keys.
- `AdminScreen.tsx`: imports `useEffect`, `oauthService`, `useSyncStore`, `photoSyncService`; `showToast` acepta duration opcional; nueva sección "Fotos" con OAuth status, photo count, lastSync, conectar y sync buttons.
- `showToast` con duration: 2s por defecto, 3s para fotos nuevas, 4s para error de red.
- 140/140 tests. TypeScript sin errores.

### File List

- `src/services/photoSyncService.ts` (modificado)
- `src/services/oauthService.ts` (modificado)
- `src/screens/AdminScreen.tsx` (modificado — sección Fotos)
- `src/__tests__/services/photoSyncService.test.ts` (modificado)
- `src/__tests__/screens/AdminScreen.test.tsx` (modificado — 8 tests nuevos)

### Change Log

- 2026-04-15: Story 5.4 implementada — sección Fotos en AdminScreen, photoSyncService retorna count + error status, oauthService persiste email. 9 tests nuevos (140 total).
- 2026-04-15: CR completado — 1 patch aplicado: email Preferences.set envuelto en try-catch en oauthService.login() (email es display-only, auth no debe fallar por esto). 140/140 tests, TypeScript limpio.
