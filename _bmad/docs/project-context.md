---
project_name: family-frame
date: '2026-05-13'
source: migrated from Moishe sanctum BOND.md (sanctum curation 2026-05-13)
---

# Project Context — family-frame

_Operational state del proyecto. Migrado del sanctum de Moishe en la curación del 2026-05-13. Hechos que cambian con el tiempo: stack, repo, deadline, hardware, scope, decisiones operativas con fecha._

## Resumen

Marco digital Android kiosk para regalo 50° aniversario de Abel y Liliana (padres de Ary).

- **Tipo:** Greenfield.
- **Stack:** Vite + React 19 + TS + Tailwind v3 + Capacitor v8 + Android nativo.
- **Workspace:** `family-frame/`
- **BMAD root:** `family-frame/_bmad/`
- **Fase actual:** 4 — Implementación.

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

- **24 stories totales:** 18 done formales + 6 backfill.
- **NS-3 cerrado (2026-04-27):** Setup completo Android Studio + JDK 21 + apksigner.bat patch + keystore en Google Drive. APK firmado, instalado, launcher default OK, kiosk funciona.
- **Story 6.4** era falso-done — `gradle assembleRelease` jamás se había corrido. Re-validado en NS-3.
- **Bug wake-on-boot** detectado (pantalla apagada hasta toque al primer boot) — **aceptado como caveat** por Ary (threshold de pulido para audiencia abuelos / frecuencia primer boot vs uso diario).
- **Próximo bloqueador:** NS-4 (OAuth real + sync real + foto bienvenida).

## Decisiones técnicas relevantes

- **Plan A vs Plan B (almacenamiento):** Plan A (MTP a `Android/data/<appId>/files/` sin permisos extras) sobre Plan B (`MANAGE_EXTERNAL_STORAGE`). Validado empíricamente en hardware el 2026-04-26.
- **GAP-1 cerrado por Story 4.5** (Amelia, bootstrap del Album ID via JSON al boot, 154/154 tests).
- **Toolchain Android:** JDK 21 + apksigner.bat patch (script path con espacios en Windows) + keystore en Google Drive.
