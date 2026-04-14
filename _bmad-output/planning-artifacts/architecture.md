---
stepsCompleted: ['step-01-init', 'step-02-context', 'step-03-starter']
inputDocuments: ['_bmad-output/planning-artifacts/prd.md']
workflowType: 'architecture'
project_name: 'family-frame'
user_name: 'Ary'
date: '2026-04-14'
---

# Architecture Decision Document

_Este documento se construye de forma colaborativa a través de descubrimiento paso a paso. Las secciones se agregan a medida que trabajamos juntos en cada decisión arquitectónica._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (28 FRs):**

| Categoría | FRs | Implicancia Arquitectónica |
|-----------|-----|---------------------------|
| Primer Encendido | FR1–FR4 | Estado one-shot persistente; flag must survive reboot |
| Visualización de Contenido | FR5–FR10 | Rendering loop continuo; fuentes desde caché local |
| Gestión de Fotos | FR11–FR14 | Sync service + caché local; offline-first |
| Admin | FR15–FR20 | UI oculta detrás de gesto + PIN; acceso privilegiado |
| Kiosk y Autonomía | FR21–FR25 | BOOT_COMPLETED, WAKE_LOCK, Screen Pinning |
| Sincronización | FR26–FR28 | OAuth persistente, network listener, auto-sync |

**Non-Functional Requirements (13 NFRs):**

- **Rendimiento:** Transiciones fluidas, inicio <5s desde caché, sync en background sin afectar UI
- **Confiabilidad:** 6 meses de operación autónoma, offline indefinido, reinicio <60s
- **Accesibilidad:** Texto mínimo 24px, contraste WCAG AA (4.5:1), transliteración Yiddish
- **Seguridad:** Admin PIN, OAuth token en Android Keystore
- **Integración:** Compatible con Google Workspace, fallos de API silenciosos

**Scale & Complexity:**

- Dominio primario: Android Mobile App (WebView empaquetada como APK)
- Complejidad: Media — greenfield, dispositivo único, sin multi-tenancy
- Componentes arquitectónicos estimados: ~6 (Kiosk Layer, Display Engine, Photo Cache, Sync Service, Admin UI, State/Persistence)

### Technical Constraints & Dependencies

- **Plataforma:** Android (API level compatible con tablet YUSUNOUL 14" / Android 14)
- **Empaquetado:** WebView dentro de APK nativo — desarrollo web + distribución Android
- **Integración única:** Google Photos API — lectura únicamente desde álbum compartido
- **Autenticación:** OAuth 2.0 con Google — token persistente en Android Keystore
- **Updates:** Manuales — sin mecanismo de OTA

### Cross-Cutting Concerns Identificados

1. **Persistencia de estado** — First-boot flag, OAuth token y caché de fotos deben sobrevivir reinicios
2. **Offline-first** — Toda la experiencia visible funciona sin red; la red es solo para enriquecer el caché
3. **Kiosk enforcement** — Prevenir salida accidental en todas las rutas del sistema Android
4. **Degradación silenciosa** — Errores de API, red y sistema nunca se muestran al usuario final
5. **Admin isolation** — La pantalla de administración es un modo separado, no parte del flujo normal

## Starter Template Evaluation

### Primary Technology Domain

Android Mobile App (WebView empaquetada como APK) — stack en dos capas:
capa web renderizada en WebView + wrapper nativo Android via Capacitor.

### Starter Options Considered

| Opción | Pros | Contras |
|--------|------|---------|
| Capacitor + React + TS | Ecosistema amplio, soporte Google APIs, activo 2025 | Más setup inicial que un starter all-in-one |
| Capacitor + Vue 3 + TS | Sintaxis más simple | Menos ejemplos de integraciones con Google |
| Tauri v2 (mobile) | APKs más livianos | Requiere Rust, menos maduro para mobile |
| Cordova | Conocido | Legacy, mantenimiento decreciente |

### Stack Seleccionado: Vite + React + TypeScript + Capacitor v8

**Rationale:** React + TypeScript ofrece el mejor ecosistema para integraciones con Google APIs, manejo de estado de contenido multimedia y transiciones de UI. Capacitor v8 es el wrapper WebView más activo en 2025, con plugins nativos mantenidos para kiosk mode, storage y network detection.

**Comandos de inicialización:**

```bash
# 1. Crear app web base
npm create vite@latest family-frame -- --template react-ts
cd family-frame

# 2. Agregar Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init "Family Frame" com.familyframe.app --web-dir dist
npx cap add android

# 3. Plugins nativos necesarios
npm install @capgo/capacitor-android-kiosk \
            @capacitor/network \
            @capacitor/preferences \
            @capacitor/filesystem
```

**Decisiones Arquitectónicas que establece este starter:**

**Lenguaje & Runtime:**
TypeScript estricto sobre React 18 — tipado end-to-end desde UI hasta APIs nativas.

**Build Tooling:**
Vite — build ultra-rápido, hot reload en dev, output optimizado para WebView.

**Styling Solution:**
Tailwind CSS — alto contraste, tipografía grande, dark mode nativo.

**Testing Framework:**
Vitest (incluido en Vite ecosystem) para lógica de negocio; tests de integración manual en dispositivo real.

**Code Organization:**
```
src/
  components/     # UI display components (PhotoSlide, YiddishPhrase, Birthday)
  screens/        # Vistas principales (KioskScreen, AdminScreen, WelcomeScreen)
  services/       # Google Photos sync, OAuth, caché
  hooks/          # Estado reactivo (usePhotos, useSync, useFirstBoot)
  data/           # Banco Yiddish local, cumpleaños
  utils/          # Helpers de fecha, contraste, etc.
```

**Native Android Layer (Capacitor):**
```
android/app/src/main/  # Kotlin shell — BOOT_COMPLETED, WAKE_LOCK, Keystore
capacitor.config.ts    # Configuración del bridge WebView ↔ Android
```

**Nota:** La inicialización del proyecto con estos comandos debe ser la primera story de implementación.
