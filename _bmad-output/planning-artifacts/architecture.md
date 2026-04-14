---
stepsCompleted: ['step-01-init', 'step-02-context', 'step-03-starter', 'step-04-decisions', 'step-05-patterns', 'step-06-structure', 'step-07-validation', 'step-08-complete']
lastStep: 8
status: 'complete'
completedAt: '2026-04-14'
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

## Core Architectural Decisions

### Decision Priority Analysis

**Decisiones Críticas (Bloquean implementación):**
- Persistencia local: @capacitor/preferences + @capacitor/filesystem
- OAuth Google Photos: @codetrix-studio/capacitor-google-auth
- State management: Zustand
- Distribución: Sideload APK

**Decisiones Importantes (Forma la arquitectura):**
- Loop de display: rendering loop gestionado por Zustand + React intervals
- Admin routing: conditional rendering (sin React Router — app de pantalla única)
- Error handling: silencioso hacia el usuario final, logging interno

**Decisiones Diferidas (Post-MVP):**
- Canal de mensajes familiares (Fase 2)
- OTA updates / Play Store (si escala a más dispositivos)

---

### Data Architecture

**Persistencia local — @capacitor/preferences + @capacitor/filesystem**

| Dato | Almacenamiento | Notas |
|------|---------------|-------|
| First-boot flag | `@capacitor/preferences` | Boolean, key: `firstBootCompleted` |
| OAuth refresh token | `@capacitor/preferences` + Android Keystore | Sensible — usar encrypted storage |
| Banco Yiddish | `@capacitor/preferences` | JSON array bundleado, editable desde admin |
| Lista de cumpleaños | `@capacitor/preferences` | JSON array con nombre + fecha |
| PIN de admin | `@capacitor/preferences` | Hash bcrypt — nunca en plaintext |
| Fotos cacheadas | `@capacitor/filesystem` | Directory: `DATA` — sobrevive reinicios |
| Metadata de fotos | `@capacitor/preferences` | JSON array con IDs y timestamps de sync |

**Rationale:** SQLite sería sobrediseño para este volumen (~100 fotos, ~50 frases, ~20 cumpleaños). La combinación preferences + filesystem cubre todos los casos sin dependencias adicionales.

---

### Authentication & Security

**Google Photos OAuth — @codetrix-studio/capacitor-google-auth**

- Maneja el refresh token automáticamente — crítico para 6 meses de operación autónoma
- Compatible con cuentas Google Workspace
- Evita que Google bloquee el flow por WebView embebido (política restrictiva desde 2021)
- Setup: una sola autenticación en el setup inicial por Ary; token persiste en Android Keystore

**Admin PIN:**
- Hash con bcrypt (bcryptjs, ~60 líneas, sin backend)
- Gesto oculto: 5 taps en esquina inferior izquierda + ingreso de PIN
- PIN configurable desde la misma pantalla admin

---

### API & Communication

**Google Photos API — llamadas directas desde JS vía Capacitor HTTP plugin**

- `@capacitor/http` para requests autenticados
- Scope requerido: `photoslibrary.readonly` — solo lectura del álbum compartido
- Strategy de sync: polling cada X minutos cuando hay WiFi (configurable desde admin)
- Ante fallo de API: continuar con caché local, sin mensajes de error visibles

---

### Frontend Architecture

**State Management — Zustand**

Stores separados por dominio:
```
useDisplayStore    — foto actual, índice, modo (kiosk/welcome/admin)
useContentStore    — fotos cacheadas, frases Yiddish, cumpleaños
useSyncStore       — estado de sync, última sync, conectividad
useAdminStore      — estado admin, PIN verification
useFirstBootStore  — flag first-boot, mensaje y foto de bienvenida
```

**Routing — Conditional rendering (sin React Router)**
La app es pantalla única. El estado `mode` en `useDisplayStore` determina qué renderizar:
- `'welcome'` → WelcomeScreen (first-boot, one-shot)
- `'kiosk'` → KioskScreen (loop normal)
- `'admin'` → AdminScreen (detrás de gesto + PIN)

**Display Loop:**
- `useInterval` hook con duración configurable (default: 30s por foto)
- Pre-carga de fotos siguientes para transiciones fluidas
- Frase Yiddish: cambia una vez por día (basado en fecha local)
- Cumpleaños: calculado en tiempo real desde lista local

---

### Infrastructure & Deployment

**Build & Distribución — Sideload APK**

```bash
# Build web
npm run build

# Sync a Android
npx cap sync android

# Build APK (desde Android Studio o CLI)
cd android && ./gradlew assembleRelease
```

- APK firmado localmente por Ary con keystore privado
- Instalación via ADB: `adb install app-release.apk`
- O via archivo: copiar APK a tablet + instalar manualmente
- Updates: manuales — Ary visita el dispositivo

**No se requiere:** Play Store, CI/CD, servidor backend, base de datos remota.

---

### Decision Impact Analysis

**Secuencia de implementación sugerida:**
1. Setup del proyecto (Vite + React + Capacitor)
2. KioskScreen base con loop de fotos desde assets locales
3. First-boot flow (WelcomeScreen + flag persistence)
4. Google Photos OAuth + sync inicial
5. Caché de fotos + modo offline
6. Frases Yiddish + cumpleaños
7. AdminScreen (gesto + PIN + CRUD de contenido)
8. Kiosk mode nativo (Screen Pinning + BOOT_COMPLETED + WAKE_LOCK)
9. Testing en dispositivo real + ajustes

**Dependencias entre decisiones:**
- Zustand stores deben definirse antes de implementar cualquier screen
- OAuth debe funcionar antes de implementar sync de fotos
- Filesystem cache debe estar operativo antes de poder testear modo offline

## Implementation Patterns & Consistency Rules

### Áreas de Conflicto Potencial Identificadas: 5

### Naming Patterns

**Archivos:**
- Componentes React: `PascalCase.tsx` (ej: `PhotoSlide.tsx`, `KioskScreen.tsx`)
- Hooks custom: `use` + `camelCase` (ej: `usePhotos.ts`, `useFirstBoot.ts`)
- Servicios: `camelCase` + sufijo `Service` (ej: `photoSyncService.ts`)
- Stores Zustand: `camelCase` + sufijo `Store` (ej: `displayStore.ts`)
- Constantes: `UPPER_SNAKE_CASE` (ej: `PHOTO_ROTATION_INTERVAL`)
- Tipos TypeScript: `PascalCase` sin prefijos (ej: `type Photo`, `type Birthday`)

### Structure Patterns

```
src/
  components/   # Reutilizables, sin acceso directo a stores
  screens/      # Pantallas completas, consumen stores via hooks
  stores/       # Un archivo por dominio de estado
  services/     # Lógica sin estado (sync, OAuth, caché)
  hooks/        # Combinan stores + servicios
  data/         # JSON estáticos (yiddish.json, etc.)
  types/        # Tipos compartidos
  utils/        # Funciones puras
  __tests__/    # Tests co-locados *.test.ts
```

### Communication Patterns

- Zustand updates: inmutables con spread `set(state => ({ ...state, field: value }))`
- Acceso a stores: solo desde screens y hooks — nunca desde components puros
- Capacitor bridge: siempre `async/await` + `try/catch` en capa de servicios

### Error Handling Patterns

Regla central: **errores nunca visibles en KioskScreen ni WelcomeScreen.**

| Capa | Comportamiento |
|------|---------------|
| Service | `try/catch` → log → retorna `null` o fallback |
| Store | Maneja `null`, actualiza estado de error interno |
| KioskScreen | Si hay error → continúa con caché, sin mensaje |
| AdminScreen | Única pantalla donde se muestran errores (solo a Ary) |

- Prohibido: `alert()`, `toast()`, cualquier overlay de error en modo kiosk
- Logging: `console.error()` en desarrollo; silencioso en producción

### Offline-First Patterns

- Leer siempre del caché primero, red después
- `SyncService` es el único responsable de escribir al caché de fotos
- Network listening: centralizado en `useSyncStore` — un solo listener global
- Fechas en storage: siempre ISO 8601 (`YYYY-MM-DD`) — nunca timestamps numéricos

### Enforcement — Todo agente de IA DEBE:

1. Seguir la estructura de carpetas definida sin crear nuevas carpetas de primer nivel
2. Manejar errores en la capa de servicios — nunca propagar excepciones a screens
3. Usar Zustand stores para estado compartido — prohibido prop drilling entre screens
4. Nombrar archivos según las convenciones de naming definidas arriba
5. Testear lógica de negocio en services y hooks — no en componentes visuales

## Project Structure & Boundaries

### Complete Project Directory Structure

```
family-frame/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── capacitor.config.ts             # Bridge WebView ↔ Android
├── index.html
├── .env.example
├── .gitignore
│
├── src/
│   ├── main.tsx                    # Entry point React
│   ├── App.tsx                     # Root — conditional render por mode
│   │
│   ├── screens/
│   │   ├── KioskScreen.tsx         # FR5-FR10: display loop principal
│   │   ├── WelcomeScreen.tsx       # FR1-FR3: experiencia primer encendido
│   │   └── AdminScreen.tsx         # FR15-FR20: panel de administración
│   │
│   ├── components/
│   │   ├── PhotoSlide.tsx          # FR5: foto con transición
│   │   ├── YiddishPhrase.tsx       # FR6: frase del día + transliteración
│   │   ├── DateDisplay.tsx         # FR7: fecha del día
│   │   ├── BirthdayCountdown.tsx   # FR8-FR9: días hasta cumpleaños
│   │   ├── GestureDetector.tsx     # FR15: 5 taps en esquina → admin
│   │   └── PinEntry.tsx            # FR15: ingreso PIN
│   │
│   ├── stores/
│   │   ├── displayStore.ts         # modo (kiosk/welcome/admin), foto actual
│   │   ├── contentStore.ts         # fotos cacheadas, frases, cumpleaños
│   │   ├── syncStore.ts            # estado sync, conectividad WiFi
│   │   ├── firstBootStore.ts       # flag first-boot, foto/msg bienvenida
│   │   └── adminStore.ts           # verificación PIN, estado admin
│   │
│   ├── services/
│   │   ├── photoSyncService.ts     # FR11-FR13, FR27: sync Google Photos
│   │   ├── photoCacheService.ts    # FR12, FR25: caché filesystem local
│   │   ├── oauthService.ts         # FR26: OAuth Google, refresh token
│   │   └── storageService.ts       # wrapper @capacitor/preferences
│   │
│   ├── hooks/
│   │   ├── useFirstBoot.ts         # FR1-FR4: lógica one-shot
│   │   ├── usePhotos.ts            # FR5, FR11-FR13: fotos + rotación
│   │   ├── useSync.ts              # FR27-FR28: sync automático por WiFi
│   │   ├── useAdmin.ts             # FR15: gesto + PIN
│   │   └── useInterval.ts          # helper para display loop
│   │
│   ├── data/
│   │   ├── yiddish.json            # FR6: banco frases Yiddish (bundleado)
│   │   └── birthdays.default.json  # FR8: estructura vacía por defecto
│   │
│   ├── types/
│   │   ├── Photo.ts
│   │   ├── YiddishPhrase.ts
│   │   ├── Birthday.ts
│   │   └── AppMode.ts              # 'kiosk' | 'welcome' | 'admin'
│   │
│   ├── utils/
│   │   ├── dateUtils.ts            # días hasta cumpleaños, formato fecha
│   │   ├── hashUtils.ts            # bcrypt PIN
│   │   └── contrastUtils.ts        # verificación WCAG contraste
│   │
│   └── __tests__/
│       ├── services/
│       │   ├── photoSyncService.test.ts
│       │   └── photoCacheService.test.ts
│       ├── hooks/
│       │   ├── useFirstBoot.test.ts
│       │   └── usePhotos.test.ts
│       └── utils/
│           └── dateUtils.test.ts
│
├── android/                        # Generado por Capacitor
│   └── app/src/main/
│       └── java/com/familyframe/app/
│           ├── MainActivity.kt     # FR23: WAKE_LOCK, entry point Android
│           └── BootReceiver.kt     # FR21: BOOT_COMPLETED → auto-start
│
├── dist/                           # Build output (gitignored)
└── public/
    └── welcome-placeholder.jpg     # FR2: foto bienvenida default
```

### Architectural Boundaries

**Integración externa — Google Photos API:**
- Único punto de entrada: `oauthService.ts` (token) + `photoSyncService.ts` (lectura álbum)
- Nunca se llama a Google Photos API desde componentes, stores ni hooks directamente
- Scope requerido: `photoslibrary.readonly`

**Capa nativa Android (Capacitor bridge):**
- `BootReceiver.kt` → dispara app al encender (FR21)
- `MainActivity.kt` → activa WAKE_LOCK (FR23) + configura kiosk mode vía plugin
- Todo lo demás vive en WebView — mínima superficie nativa

**Boundaries de estado:**
- `displayStore` → controla qué se muestra en pantalla (modo + foto activa)
- `contentStore` → fuente de verdad del contenido (fotos, frases, cumpleaños)
- `syncStore` → único consumidor de @capacitor/network — un solo listener global
- `adminStore` → estado de admin aislado — no comparte estado con displayStore

### Requirements to Structure Mapping

| FR Categoría | Archivos principales |
|---|---|
| Primer Encendido (FR1-FR4) | `screens/WelcomeScreen.tsx`, `stores/firstBootStore.ts`, `hooks/useFirstBoot.ts` |
| Visualización (FR5-FR10) | `screens/KioskScreen.tsx`, `components/PhotoSlide.tsx`, `components/YiddishPhrase.tsx`, `components/BirthdayCountdown.tsx`, `components/DateDisplay.tsx` |
| Gestión de Fotos (FR11-FR14) | `services/photoSyncService.ts`, `services/photoCacheService.ts`, `stores/contentStore.ts` |
| Admin (FR15-FR20) | `screens/AdminScreen.tsx`, `components/GestureDetector.tsx`, `components/PinEntry.tsx`, `stores/adminStore.ts` |
| Kiosk y Autonomía (FR21-FR25) | `android/.../BootReceiver.kt`, `android/.../MainActivity.kt`, `stores/displayStore.ts` |
| Sincronización (FR26-FR28) | `services/oauthService.ts`, `services/photoSyncService.ts`, `stores/syncStore.ts`, `hooks/useSync.ts` |

### Data Flow

```
App start
  → firstBootStore.checkFlag()
  → false → WelcomeScreen (one-shot, marca flag al salir)
  → true  → KioskScreen

KioskScreen
  → contentStore (fotos cacheadas) → PhotoSlide (rotación por useInterval)
  → contentStore (frases/cumpleaños) → YiddishPhrase, BirthdayCountdown
  → GestureDetector detecta 5 taps → adminStore.verifyPin() → AdminScreen

syncStore
  → escucha @capacitor/network (un único listener)
  → WiFi disponible → photoSyncService.sync()
    → oauthService.getToken()
    → llama Google Photos API
    → photoCacheService.save(photos)
    → contentStore.setPhotos(photos)
```

## Architecture Validation Results

### Coherence Validation ✅

Todas las decisiones tecnológicas son compatibles. Capacitor v8 + Vite + React + Zustand + Tailwind forman un stack coherente sin conflictos de versiones conocidos al 2025-04.

### Requirements Coverage ✅

Los 28 FRs y 13 NFRs están cubiertos por componentes arquitectónicos específicos. Ver tabla de mapeo en "Project Structure & Boundaries".

### Gap Analysis — 3 gaps menores resueltos

**Gap 1 — Estructura yiddish.json:**
```json
[{ "yiddish": "string", "transliteration": "string", "spanish": "string" }]
```
Cada entrada tiene texto en Yiddish, transliteración fonética y traducción al español (NFR9).

**Gap 2 — PHOTO_ROTATION_INTERVAL:**
Valor por defecto: `30000` ms (30 segundos). Configurable desde AdminScreen.
Almacenado en `@capacitor/preferences` con key `photoRotationInterval`.

**Gap 3 — Deduplicación en sync:**
`photoSyncService` usa `mediaItem.id` de Google Photos API como identificador único.
El caché local almacena un índice `{ id, localPath, syncedAt }` en `@capacitor/preferences`.
En cada sync: se descargan solo los IDs no presentes en el índice local.

### Architecture Completeness Checklist

- [x] Contexto y escala del proyecto analizados
- [x] Stack tecnológico definido con versiones
- [x] Decisiones críticas documentadas con rationale
- [x] Patrones de implementación especificados
- [x] Estructura de proyecto completa y trazable a FRs
- [x] Boundaries e integración mapeados
- [x] Data flow documentado
- [x] Gaps identificados y resueltos

### Architecture Readiness Assessment

**Estado:** LISTO PARA IMPLEMENTACIÓN

**Confianza:** Alta — stack probado, requisitos completamente cubiertos, patrones claros.

**Fortalezas clave:**
- Offline-first garantiza operación autónoma de 6 meses sin intervención
- Stack WebView permite desarrollo web con distribución Android sin Play Store
- Diseño stateless permite recuperación completa desde reinicio en <60s
- Un único punto de integración externa (Google Photos) minimiza superficie de fallo

**Para fases futuras:**
- Canal de mensajes (Fase 2) puede agregarse como nuevo store + screen sin romper arquitectura actual
- Si escala a múltiples dispositivos: considerar Play Store (internal track) y backend de configuración remota

### Implementation Handoff

**Primera story de implementación:**

```bash
npm create vite@latest family-frame -- --template react-ts
cd family-frame
npm install @capacitor/core @capacitor/cli
npx cap init "Family Frame" com.familyframe.app --web-dir dist
npx cap add android
npm install @capgo/capacitor-android-kiosk @capacitor/network @capacitor/preferences @capacitor/filesystem @codetrix-studio/capacitor-google-auth zustand bcryptjs
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Guía para agentes de IA:**
- Seguir estructura de carpetas definida en "Project Structure"
- Aplicar todos los patrones de naming, error handling y offline-first
- No llamar Google Photos API fuera de `oauthService` y `photoSyncService`
- Errores nunca visibles en KioskScreen ni WelcomeScreen
