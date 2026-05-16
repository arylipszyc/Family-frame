---
project_name: family-frame
date: '2026-05-16'
source: migrated from Moishe sanctum BOND.md (sanctum curation 2026-05-13), updated 2026-05-16 post Drive+SA rewrite
---

# Project Context — family-frame

_Operational state del proyecto. Migrado del sanctum de Moishe en la curación del 2026-05-13. Hechos que cambian con el tiempo: stack, repo, deadline, hardware, scope, decisiones operativas con fecha._

## Resumen

Marco digital Android kiosk para regalo 50° aniversario de Abel y Liliana (padres de Ary).

- **Tipo:** Greenfield.
- **Stack:** Vite + React 19 + TS + Tailwind v3 + Capacitor v8 + Android nativo + `jose` (JWT RS256 para SA).
- **Workspace:** `family-frame/`
- **BMAD root:** `family-frame/_bmad/`
- **Fase actual:** 4 — Implementación (end-to-end validado en hardware 2026-05-16).

## Repo & GitHub

- **Repo:** `arylipszyc/Family-frame` (GitHub).
- **Cuenta GitHub:** `arylipszyc` (cuenta secundaria de Ary, **NO `arylip`**). Credential manager local debe estar logueado como `arylipszyc` para push.
- Confirmado 2026-04-26 con commit `ac02b3f`.

## Deadline

- **Original:** 2026-05-12.
- **Vigente:** corrido una semana → ~2026-05-19 (movido 2026-05-11 cuando el spike `subagent-embed` avanzó en paralelo).

## Hardware

- **Tablet:** YUSUNOUL Android 14. Llegó 2026-04-25.
- **Test de campo (2026-04-26):** MTP a `Android/data/<appId>/files/` valida RW → habilitó **Plan A** en lugar de `MANAGE_EXTERNAL_STORAGE`. No generalizable a otros vendors (Android 11+ MTP a `Android/data/<appId>/files/` es vendor-dependent).

## Estado Sprint

- **25 stories totales:** 19 done + 4 done_undocumented + 2 deprecadas (4.2 OAuth, 4.3 Photos sync — reemplazadas por 4.6).
- **NS-4-bis cerrado (2026-05-16):** Drive + SA validado end-to-end en hardware. SA configurado ✓, sync trae fotos, rotación con interval configurable.
- **NS-6 stress test arrancado (2026-05-16 ~19:00):** tablet enchufada con kiosk activo + WiFi. Correr hasta 2026-05-19.
- **NS-8 nuevo (post-sesión):** rediseño visual con Sally → Amelia. Pedido por Ary 2026-05-16. Pospuesto para sesión dedicada con cabeza fresca post-stress.
- **Próximo bloqueador del regalo:** GAP-4 (foto + mensaje real de hermanos para WelcomeScreen — no es código, es coordinación).

## Decisiones técnicas relevantes

- **Pivot Photos API → Drive + SA (2026-05-16):** Google deprecó `photoslibrary.readonly` el 31-mar-2025. Solo sobrevive `photoslibrary.readonly.appcreateddata` (no sirve para álbumes de terceros). Picker API no sirve para kiosk. Service Account + Drive es la única opción viable sin verificación de Google (que tomaría semanas). Lib `jose` para JWT RS256 en WebView via Web Crypto API — spike verificado.
- **GCP project en cuenta personal, no workspace:** `family-frame-496520` en `arylip@gmail.com`. Workspace tenía `iam.disableServiceAccountKeyCreation` enforced — bloqueaba creación de SA keys. Proyectos personales NO van en cuenta workspace.
- **Plan A vs Plan B (almacenamiento):** Plan A (MTP a `Android/data/<appId>/files/` sin permisos extras) sobre Plan B (`MANAGE_EXTERNAL_STORAGE`). Validado empíricamente 2026-04-26. Patrón reutilizado para `sa-config.json` + `drive-folder-config.json`.
- **Toolchain Android:** JDK 21 + apksigner.bat patch (script path con espacios en Windows) + keystore en `G:\My Drive\family-frame\family-frame-keystore.jks` (alias `family-frame`, cuenta personal Drive).

## Operacional Google / Drive

- **GCP project:** `family-frame-496520` (cuenta personal `arylip@gmail.com`).
- **Service Account:** `family-frame-photos@family-frame-496520.iam.gserviceaccount.com`
- **SA JSON local:** `G:\My Drive\family-frame\family-frame-sa.json` (gitignored).
- **Drive folder:** `family-frame-fotos` en personal Drive, folderId `1nG1xCgiqWfJjXX4ZMHxjOsUGCIhsen32`, compartida con SA como Viewer.
- **APIs habilitadas:** Google Drive API.
- **Scope:** `https://www.googleapis.com/auth/drive.readonly` (lectura solo de archivos compartidos con el SA — quirúrgico).

## Bugs hardware-discovered 2026-05-16 (fixeados)

- `photoCacheService.savePhoto` no creaba carpeta padre — fix: `recursive: true` en `Filesystem.writeFile`. Story 4.1 done_undocumented, jsdom mock no lo detectaba.
- `KioskScreen` no pasaba `intervalMs` prop a `PhotoSlide` — rotación siempre 30s (default). Fix: pasar `photoRotationInterval` del store.
- `PhotoSlide` `objectFit: 'cover'` → `'contain'` — fotos verticales se cortaban (cabezas).
