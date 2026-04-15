---
stepsCompleted: ['step-01', 'step-02', 'step-03', 'step-04']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# family-frame - Epic Breakdown

## Overview

Este documento descompone los requisitos del PRD, la Arquitectura y el Diseño UX de **family-frame** en epics e historias implementables por el agente de desarrollo.

---

## Requirements Inventory

### Functional Requirements

**Experiencia de Primer Encendido:**
- FR1: El sistema puede detectar si es la primera vez que se ejecuta y mostrar la pantalla de bienvenida antes que cualquier otro contenido
- FR2: El administrador puede configurar la foto y el texto del mensaje de primer encendido
- FR3: El sistema puede marcar el primer encendido como completado para no volver a mostrarlo
- FR4: El administrador puede resetear el estado del primer encendido desde la pantalla admin

**Visualización de Contenido:**
- FR5: El sistema puede mostrar fotos familiares en rotación automática y continua
- FR6: El sistema puede mostrar una frase en Yiddish diferente cada día
- FR7: El sistema puede mostrar la fecha del día actual
- FR8: El sistema puede mostrar los cumpleaños próximos con indicación de cuántos días faltan
- FR9: El sistema puede mostrar múltiples cumpleaños próximos simultáneamente
- FR10: El sistema puede operar en modo pantalla completa sin elementos del sistema operativo visibles

**Gestión de Fotos:**
- FR11: El sistema puede sincronizar fotos desde un álbum compartido de Google Photos
- FR12: El sistema puede cachear fotos localmente para operar sin conexión
- FR13: El sistema puede detectar fotos nuevas en el álbum y agregarlas al caché automáticamente al reconectar WiFi
- FR14: Los usuarios activos pueden agregar fotos al álbum compartido desde sus propios dispositivos (Google Photos nativo)

**Gestión de Contenido — Admin:**
- FR15: El administrador puede acceder a la pantalla admin mediante gesto oculto protegido con PIN
- FR16: El administrador puede agregar, editar y eliminar frases del banco Yiddish
- FR17: El administrador puede agregar, editar y eliminar fechas de cumpleaños con nombres asociados
- FR18: El administrador puede editar el texto y foto del mensaje de primer encendido
- FR19: El administrador puede forzar sincronización manual de fotos desde Google Photos
- FR20: El administrador puede reiniciar la aplicación desde la pantalla admin

**Modo Kiosk y Operación Autónoma:**
- FR21: El sistema puede iniciarse automáticamente al encender el dispositivo
- FR22: El sistema puede prevenir que usuarios pasivos salgan de la aplicación accidentalmente
- FR23: El sistema puede mantener la pantalla encendida de forma continua
- FR24: El sistema puede recuperar su estado normal tras un reinicio sin configuración adicional
- FR25: El sistema puede operar completamente offline usando contenido cacheado

**Sincronización y Conectividad:**
- FR26: El sistema puede autenticarse con Google Photos usando OAuth y mantener el token activo entre reinicios
- FR27: El sistema puede detectar restauración de conexión WiFi e iniciar sincronización automáticamente
- FR28: El sistema puede continuar operando normalmente sin conexión a internet

---

### NonFunctional Requirements

**Rendimiento:**
- NFR1: Las transiciones entre fotos son fluidas y sin lag visible
- NFR2: El sistema carga y muestra contenido cacheado en menos de 5 segundos tras reinicio
- NFR3: La sincronización con Google Photos no interrumpe ni degrada la experiencia visual

**Confiabilidad:**
- NFR4: Operación autónoma mínima de 6 meses sin intervención técnica
- NFR5: Ante corte de WiFi, el sistema opera con contenido cacheado indefinidamente
- NFR6: Reinicio por desenchufar/enchufar restaura funcionamiento normal en menos de 60 segundos

**Accesibilidad:**
- NFR7: Tamaño mínimo de texto 24px — legible para adultos mayores (~70-80 años)
- NFR8: Alto contraste en todos los elementos de texto — ratio mínimo 4.5:1 (WCAG AA)
- NFR9: Las frases en Yiddish se muestran con transliteración o traducción al español

**Seguridad:**
- NFR10: La pantalla admin requiere PIN — protege contra acceso accidental o no autorizado
- NFR11: El token OAuth de Google Photos se almacena de forma segura (Android Keystore)

**Integración:**
- NFR12: La integración con Google Photos funciona con cuentas Google Workspace
- NFR13: Ante fallo de la API de Google Photos, el sistema usa el caché local sin mostrar errores al usuario final

---

### Additional Requirements

*(Requisitos técnicos extraídos de Arquitectura que impactan la implementación)*

- **AR1:** El proyecto debe inicializarse con el stack Vite + React + TypeScript + Capacitor v8 — es la Story 1.1 del Epic 1
- **AR2:** Los Zustand stores deben definirse antes de implementar cualquier screen: `displayStore`, `contentStore`, `syncStore`, `adminStore`, `firstBootStore`
- **AR3:** OAuth de Google Photos a través de `@codetrix-studio/capacitor-google-auth` — evita restricciones de WebView OAuth de Google (política 2021)
- **AR4:** Token OAuth persistido en `@capacitor/preferences` con Android Keystore (encrypted) — debe sobrevivir reinicios
- **AR5:** Distribución via sideload APK firmado con keystore privado de Ary (no Play Store)
- **AR6:** `@capgo/capacitor-android-kiosk` para kiosk mode nativo + Screen Pinning Android
- **AR7:** `@capacitor/network` para detección de conectividad — un único listener global centralizado en `syncStore`
- **AR8:** `@capacitor/filesystem` para caché de fotos en directorio `DATA` — sobrevive reinicios
- **AR9:** Estructura `yiddish.json`: array de objetos `{ yiddish: string, transliteration: string, spanish: string }`
- **AR10:** `PHOTO_ROTATION_INTERVAL` default 30000ms — almacenado en `@capacitor/preferences`, configurable desde AdminScreen
- **AR11:** Deduplicación en sync usando `mediaItem.id` de Google Photos como identificador único; índice local `{ id, localPath, syncedAt }`
- **AR12:** `BootReceiver.kt` para `BOOT_COMPLETED` → auto-start de la app
- **AR13:** `MainActivity.kt` para `WAKE_LOCK` y activación de kiosk mode via plugin Capacitor
- **AR14:** PIN almacenado como hash bcrypt (bcryptjs) — nunca en plaintext
- **AR15:** Errores nunca visibles en `KioskScreen` ni `WelcomeScreen` — capturados en servicios, logueados, fallback a caché

---

### UX Design Requirements

*(Requisitos específicos de la especificación UX — cada uno genera work implementable)*

- **UX-DR1:** Implementar design tokens en `tailwind.config.ts`: paleta "Hogar cálido" — `frame-cream #F5F0E8`, `frame-amber #C8956C`, `frame-sepia #8B6F5E`, `frame-charcoal #2C2420`, `frame-night #1A1210`, `frame-overlay rgba(28,18,12,0.72)`, `frame-paper rgba(245,235,210,0.06)`
- **UX-DR2:** Implementar sistema tipográfico: Playfair Display (serif, Google Fonts) para Yiddish y welcome titles; Inter (sans-serif, Google Fonts) para fecha, cumpleaños y admin. Preload en `index.html` con `font-display: swap`
- **UX-DR3:** Escala tipográfica kiosk con `clamp()`: `kiosk-date` clamp(22px,2.5vw,32px), `kiosk-birthday` clamp(28px,3vw,42px), `kiosk-yiddish` clamp(40px,4vw,64px), `kiosk-transliteration` 24px, `welcome-title` 64px, `welcome-message` 28px, `welcome-prompt` 22px
- **UX-DR4:** `PhotoSlide` con paper overlay CSS (`filter: saturate(0.85) sepia(0.08)`) + PNG linen texture 5-8% opacity. Crossfade 2-3s entre fotos via dos capas `opacity` superpuestas. Si `src` falla: mantener foto anterior sin mostrar roto
- **UX-DR5:** `WelcomeScreen` dirección W2 (Dramático): foto full-bleed, fade-in desde negro 3s al montar, mensaje personal fade-in 1s tras 2s de foto visible, gradiente inferior `linear-gradient(transparent → rgba(10,5,2,0.85))`, prompt "Tocar para ver las fotos" aparece tras 8s (22px Inter 300), toque en cualquier parte → crossfade 3s a KioskScreen. Sin timeout automático. **La WelcomeScreen aparece en CADA BOOT** (simplificación arquitectónica del UX spec — se elimina lógica one-shot)
- **UX-DR6:** `KioskScreen` dirección D3 (Mural): texto flotado directamente sobre la foto sin panel ni InfoBand. `YiddishPhrase` en esquina inferior izquierda (`bottom: 2.5vh; left: 2.5vw`), `DateDisplay` en esquina superior derecha (`top: 2.5vh; right: 2.5vw`), `BirthdayCountdown` en esquina inferior derecha (`bottom: 2.5vh; right: 2.5vw`). Todos con `position: absolute`
- **UX-DR7:** `GestureDetector`: zona sensible 64×64px en esquina inferior izquierda, 5 taps en menos de 3s, sin feedback visual, llama `onAdminGesture()` al completar. Estado local con `useRef`
- **UX-DR8:** `PinEntry`: modal centrado con backdrop `rgba(0,0,0,0.85)`, teclado numérico virtual de 10 dígitos (no teclado del sistema), indicador `● ● ● ●`, 3 intentos fallidos → cierra modal sin mensaje. Touch targets mínimo 64×64px por tecla
- **UX-DR9:** `AdminScreen` con 6 secciones scrollables: Bienvenida (welcome config foto + mensaje), Frases Yiddish (CRUD con yiddish + transliteración + español), Cumpleaños (CRUD nombre + fecha), Fotos (sync status + forzar sync + ver fotos cacheadas), Configuración (intervalo rotación + horario night mode + cambio PIN), Sistema (reiniciar app + logs básicos + estado OAuth). Header fijo con "← Volver al frame". Toast `frame-amber` 2s tras guardar
- **UX-DR10:** Night mode: fade gradual 60s `linear` entre 15% y 100% brillo vía `@capacitor-community/screen-brightness`. 22:00 → dim, 07:00 → normal. Overlay CSS adicional `rgba(20,10,5,0.3)` de noche. Clase `.night-mode` en root. Horario configurable desde AdminScreen
- **UX-DR11:** Text-shadow multicapa en todos los textos sobre foto: `0 2px 16px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5)`. Gradiente radial sutil en esquinas de texto como protección D3
- **UX-DR12:** Sistema de transiciones universal crossfade: ninguna transición instantánea. WelcomeScreen→KioskScreen 3s, KioskScreen→modal PIN 0.3s, PIN→Admin 0.5s, Admin→KioskScreen 2s, night mode 60s linear
- **UX-DR13:** Sistema de feedback AdminScreen: toast amber 2s para acciones guardadas, toast "X fotos nuevas sincronizadas" 3s, toast sepia 4s para errores de red, shake sutil en puntos del PIN incorrecto, border amber en campos vacíos al intentar guardar
- **UX-DR14:** Estado vacío KioskScreen: fondo `frame-night` + texto "Preparando tus fotos..." en `frame-cream/60`. Sin spinner ni íconos de error. Desaparece al tener fotos disponibles
- **UX-DR15:** Pixel shifting (prevención de burn-in): mover composición KioskScreen 1-2px aleatoriamente cada pocos minutos. Imperceptible a 2-4 metros de distancia
- **UX-DR16:** KioskScreen: `user-select: none`, `-webkit-tap-highlight-color: transparent` en todos los componentes. Viewport meta `maximum-scale=1.0, user-scalable=no`. `AndroidManifest` con `screenOrientation="landscape"`
- **UX-DR17:** `BirthdayCountdown`: próximos 1-2 cumpleaños. Si cumpleaños es hoy: `"🎂 Hoy: cumpleaños de [Nombre]"` con amber highlight. Oculto si no hay cumpleaños en los próximos 30 días. Si hay más de 2, rotan con el ciclo de fotos
- **UX-DR18:** Placeholder cálido para WelcomeScreen cuando no hay imagen configurada: `public/welcome-placeholder.jpg` incluido en el proyecto

---

### FR Coverage Map

- FR1: Epic 3 — WelcomeScreen aparece en cada boot (flag eliminado por UX spec)
- FR2: Epic 3/5 — configurar foto y mensaje: WelcomeScreen (E3) + AdminScreen (E5)
- FR3: Epic 3 — comportamiento WelcomeScreen one-shot → en cada boot (redefinido)
- FR4: Epic 5 — reset de welcome config desde AdminScreen
- FR5: Epic 2 — rotación de fotos en KioskScreen
- FR6: Epic 2 — frase Yiddish del día (banco local)
- FR7: Epic 2 — DateDisplay con fecha del día
- FR8: Epic 2 — BirthdayCountdown con días restantes
- FR9: Epic 2 — hasta 2 cumpleaños simultáneos con rotación
- FR10: Epic 2/6 — pantalla completa en display loop (E2), kiosk mode nativo (E6)
- FR11: Epic 4 — sync desde álbum compartido Google Photos
- FR12: Epic 4 — caché local via @capacitor/filesystem
- FR13: Epic 4 — detección de fotos nuevas al reconectar WiFi
- FR14: Epic 4 — Google Photos nativo (sin app adicional para hermanos)
- FR15: Epic 5 — gesto 5 taps + modal PIN → AdminScreen
- FR16: Epic 5 — CRUD banco Yiddish (yiddish + transliteración + español)
- FR17: Epic 5 — CRUD lista de cumpleaños con nombres
- FR18: Epic 5 — editar foto y mensaje de WelcomeScreen desde admin
- FR19: Epic 5 — forzar sync manual Google Photos desde admin
- FR20: Epic 5 — reiniciar app desde admin
- FR21: Epic 6 — BOOT_COMPLETED → auto-start via BootReceiver.kt
- FR22: Epic 6 — Screen Pinning + kiosk plugin para prevenir salida accidental
- FR23: Epic 6 — WAKE_LOCK en MainActivity.kt
- FR24: Epic 6 — recovery stateless desde reinicio en < 60s
- FR25: Epic 4 — operación offline con caché local
- FR26: Epic 4 — OAuth Google Photos con @codetrix-studio/capacitor-google-auth
- FR27: Epic 4 — listener de conectividad WiFi en syncStore
- FR28: Epic 4 — offline-first: caché siempre disponible sin red

---

## Epic List

### Epic 1: Proyecto inicializado y design system listo
El stack Vite + React + TypeScript + Capacitor v8 está configurado, los tipos TypeScript y Zustand stores definidos, y el sistema visual implementado (tokens de color, tipografía, escala kiosk). Todo el proyecto puede compilar y ejecutarse. Es la base que habilita todos los demás epics.
**FRs cubiertos:** Base técnica (AR1, AR2, UX-DR1, UX-DR2, UX-DR3)
**Resultado:** `npm run dev` funciona, Tailwind con paleta cálida, fuentes Playfair + Inter cargadas, estructura de carpetas y stores vacíos en su lugar.

---

### Epic 2: El marco muestra fotos y contenido
Abel y Liliana pueden ver el marco en funcionamiento: fotos rotando con paper overlay y crossfade suave, frase en Yiddish del día con transliteración, fecha del día, y cumpleaños próximos. Todo con la dirección visual D3 (Mural) y la escala tipográfica diseñada para lectura a 2-4 metros. Night mode automático. Pixel shifting anti burn-in.
**FRs cubiertos:** FR5, FR6, FR7, FR8, FR9, FR10
**NFRs cubiertos:** NFR1, NFR7, NFR8, NFR9
**UX cubierto:** UX-DR4 a UX-DR17 (excepto los de WelcomeScreen y AdminScreen)
**Resultado:** Experiencia visual completa funcional con fotos de prueba locales.

---

### Epic 3: El momento del primer encendido
Al enchufar el marco (en cada boot), Abel y Liliana ven la foto de sus hijos con el mensaje personal antes de pasar a las fotos familiares. La WelcomeScreen W2 (Dramático) aparece siempre al arrancar: fade-in desde negro, mensaje personal, prompt suave a los 8s, transición al KioskScreen con toque.
**FRs cubiertos:** FR1, FR2, FR3, FR4 (redefinidos: WelcomeScreen en cada boot)
**UX cubierto:** UX-DR5, UX-DR12
**Resultado:** Flujo WelcomeScreen → toque → KioskScreen completo y emotivo.

---

### Epic 4: Las fotos de la familia se sincronizan solas
Cuando un hermano sube una foto a Google Photos, aparece en el marco sin que nadie haga nada. OAuth configurado y persistente, sync automático al detectar WiFi, deduplicación por ID, caché local para operación offline indefinida. Todos los errores de API silenciosos.
**FRs cubiertos:** FR11, FR12, FR13, FR14, FR25, FR26, FR27, FR28
**NFRs cubiertos:** NFR3, NFR5, NFR11, NFR12, NFR13
**Resultado:** OAuth funcionando, sync automático verificado, modo offline confirmado.

---

### Epic 5: Ary puede gestionar el marco
Ary puede acceder al panel admin mediante el gesto oculto + PIN, y gestionar todo el contenido: foto y mensaje de bienvenida, banco de frases Yiddish, lista de cumpleaños, sync manual, intervalo de rotación, horario de night mode, y cambio de PIN. Feedback claro en cada acción.
**FRs cubiertos:** FR15, FR16, FR17, FR18, FR19, FR20
**NFRs cubiertos:** NFR10
**UX cubierto:** UX-DR7, UX-DR8, UX-DR9, UX-DR13
**Resultado:** AdminScreen completo y funcional con las 6 secciones.

---

### Epic 6: El marco funciona solo durante 6 meses
El marco arranca automáticamente al enchufarlo, no se puede salir accidentalmente, la pantalla nunca se apaga, y el producto se distribuye como APK firmado instalable. Autonomía total — sin intervención técnica de Ary.
**FRs cubiertos:** FR21, FR22, FR23, FR24
**NFRs cubiertos:** NFR4, NFR6
**Resultado:** APK firmado instalable en tablet YUSUNOUL 14", BOOT_COMPLETED + WAKE_LOCK + Screen Pinning funcionando.

---

## Epic 1: Proyecto inicializado y design system listo

El stack Vite + React + TypeScript + Capacitor v8 está configurado, los tipos TypeScript y Zustand stores definidos, y el sistema visual implementado (tokens de color, tipografía, escala kiosk). Todo el proyecto puede compilar y ejecutarse. Es la base que habilita todos los demás epics.

### Story 1.1: Inicialización del stack tecnológico completo

Como desarrollador,
quiero el proyecto inicializado con Vite + React + TypeScript + Capacitor v8 y todos los plugins instalados,
para tener una base funcional sin fricción de configuración.

**Acceptance Criteria:**

**Given** un directorio vacío de proyecto
**When** se ejecutan los comandos de inicialización de Architecture
**Then** `npm run build` compila sin errores
**And** `npm run dev` levanta el servidor de desarrollo en el browser

**Given** el proyecto inicializado
**When** se verifica la estructura de carpetas
**Then** existen `src/screens/`, `src/components/`, `src/stores/`, `src/services/`, `src/hooks/`, `src/data/`, `src/types/`, `src/utils/`, `src/__tests__/`
**And** `capacitor.config.ts` tiene appId `com.familyframe.app` y webDir `dist`
**And** el directorio `android/` fue generado por Capacitor

**Given** el proyecto inicializado
**When** se verifica `package.json`
**Then** están instalados: `@capacitor/core`, `@capacitor/cli`, `@capgo/capacitor-android-kiosk`, `@capacitor/network`, `@capacitor/preferences`, `@capacitor/filesystem`, `@codetrix-studio/capacitor-google-auth`, `zustand`, `bcryptjs`
**And** en devDependencies: `tailwindcss`, `postcss`, `autoprefixer`, `@types/bcryptjs`

---

### Story 1.2: Tipos TypeScript y datos iniciales

Como desarrollador,
quiero los tipos TypeScript definidos y los archivos de datos iniciales creados,
para que todas las stories siguientes tengan un contrato tipado estable.

**Acceptance Criteria:**

**Given** la estructura de carpetas creada
**When** se revisa `src/types/`
**Then** `Photo.ts` define `{ id: string, localPath: string, syncedAt: string }`
**And** `YiddishPhrase.ts` define `{ yiddish: string, transliteration: string, spanish: string }`
**And** `Birthday.ts` define `{ id: string, name: string, date: string }` (date en `YYYY-MM-DD`)
**And** `AppMode.ts` define `type AppMode = 'welcome' | 'kiosk' | 'admin'`

**Given** los tipos definidos
**When** se revisa `src/data/yiddish.json`
**Then** contiene al menos 30 frases con estructura `{ yiddish, transliteration, spanish }` — auténticas, no placeholders

**Given** los tipos definidos
**When** se revisa `src/data/birthdays.default.json`
**Then** contiene un array vacío `[]` como estructura base

**Given** todos los archivos de tipos y datos
**When** se ejecuta `npx tsc --noEmit`
**Then** TypeScript no reporta errores

---

### Story 1.3: Design system — tokens de color y tipografía en Tailwind

Como desarrollador,
quiero los tokens del design system configurados en Tailwind y las fuentes cargadas en `index.html`,
para que todos los componentes visuales se construyan con la paleta cálida y la escala kiosk desde el inicio.

**Acceptance Criteria:**

**Given** el proyecto inicializado
**When** se revisa `tailwind.config.ts`
**Then** están definidos los colores: `frame-cream: '#F5F0E8'`, `frame-amber: '#C8956C'`, `frame-sepia: '#8B6F5E'`, `frame-charcoal: '#2C2420'`, `frame-night: '#1A1210'`
**And** `frame-overlay` es `rgba(28, 18, 12, 0.72)` y `frame-paper` es `rgba(245, 235, 210, 0.06)`
**And** están definidas las font families `kiosk-serif: ['Playfair Display', 'serif']` y `kiosk-sans: ['Inter', 'sans-serif']`

**Given** los tokens configurados
**When** se revisa `index.html`
**Then** hay preload de Playfair Display e Inter desde Google Fonts con `font-display: swap`
**And** el viewport meta incluye `maximum-scale=1.0, user-scalable=no`

**Given** el design system configurado
**When** se ejecuta `npm run build`
**Then** las clases `text-frame-cream`, `bg-frame-night`, `font-kiosk-serif` están disponibles y compilan sin errores

---

### Story 1.4: Zustand stores con estado inicial

Como desarrollador,
quiero los Zustand stores definidos con sus tipos y estado inicial,
para que screens y componentes tengan una interfaz de estado estable desde la primera story de implementación.

**Acceptance Criteria:**

**Given** los tipos TypeScript definidos
**When** se revisa `src/stores/displayStore.ts`
**Then** exporta `useDisplayStore` con `{ mode: AppMode, currentPhotoIndex: number }` inicializado con `mode: 'welcome'`
**And** expone `setMode(mode: AppMode)` y `setCurrentPhotoIndex(index: number)`

**Given** los tipos TypeScript definidos
**When** se revisa `src/stores/contentStore.ts`
**Then** exporta `useContentStore` con `{ photos: Photo[], yiddishPhrases: YiddishPhrase[], birthdays: Birthday[], welcomeConfig: { photoPath: string, message: string, authorName: string } }`
**And** `yiddishPhrases` se inicializa con el contenido importado de `yiddish.json`

**Given** los tipos TypeScript definidos
**When** se revisa `src/stores/syncStore.ts`
**Then** exporta `useSyncStore` con `{ isOnline: boolean, lastSync: string | null, syncStatus: 'idle' | 'syncing' | 'error' }`

**Given** los tipos TypeScript definidos
**When** se revisa `src/stores/adminStore.ts`
**Then** exporta `useAdminStore` con `{ isAuthenticated: boolean }` inicializado en `false`
**And** expone `setAuthenticated(value: boolean)`

**Given** todos los stores definidos
**When** se ejecuta `npx tsc --noEmit`
**Then** TypeScript no reporta errores en ningún store

---

## Epic 2: El marco muestra fotos y contenido

Abel y Liliana pueden ver el marco en funcionamiento: fotos rotando con paper overlay y crossfade suave, frase en Yiddish del día con transliteración, fecha del día, y cumpleaños próximos. Todo con la dirección visual D3 (Mural) y la escala tipográfica diseñada para lectura a 2-4 metros. Night mode automático. Pixel shifting anti burn-in.

### Story 2.1: PhotoSlide — rotación de fotos con paper overlay y crossfade

Como usuario pasivo (Abel o Liliana),
quiero ver fotos familiares rotando suavemente en pantalla completa con una estética cálida y orgánica,
para que el marco se sienta como un cuadro familiar, no como una pantalla tecnológica.

**Acceptance Criteria:**

**Given** el KioskScreen activo con al menos 2 fotos en `contentStore.photos`
**When** transcurren 30 segundos (intervalo por defecto)
**Then** la foto siguiente aparece mediante crossfade de 2-3 segundos `ease-in-out` usando dos capas `opacity` superpuestas
**And** la transición no es instantánea ni un slide — solo crossfade

**Given** una foto cargada en `PhotoSlide`
**When** se renderiza el componente
**Then** la foto tiene `filter: saturate(0.85) sepia(0.08)` aplicado via CSS
**And** hay un overlay PNG de textura linen a 5-8% de opacidad sobre la foto
**And** la foto ocupa `position: fixed; inset: 0` — sin márgenes ni bordes visibles

**Given** una foto cuyo `src` falla al cargar
**When** ocurre el error de carga
**Then** se mantiene la foto anterior visible sin mostrar imagen rota ni placeholder de error

**Given** el KioskScreen activo
**When** hay solo 1 foto disponible
**Then** esa foto se muestra continuamente sin intentar crossfade a nada

**Given** el KioskScreen activo
**When** no hay fotos en el store
**Then** se muestra fondo `frame-night` con texto `"Preparando tus fotos..."` en `frame-cream` a 60% de opacidad — sin spinner ni ícono de error

**Given** el KioskScreen activo
**When** el usuario toca la pantalla fuera de la zona admin
**Then** no hay ningún feedback visual (`-webkit-tap-highlight-color: transparent`, `user-select: none`)

---

### Story 2.2: YiddishPhrase — frase del día con transliteración

Como usuario pasivo (Abel o Liliana),
quiero ver una frase en Yiddish diferente cada día con su transliteración fonética y traducción,
para que el marco hable en el idioma de mis raíces y me conecte con mi historia cultural.

**Acceptance Criteria:**

**Given** el banco de frases Yiddish cargado en `contentStore.yiddishPhrases`
**When** se renderiza `YiddishPhrase`
**Then** se muestra la frase correspondiente a `dayOfYear % phrases.length` — determinista por fecha local
**And** la frase cambia exactamente una vez por día (a medianoche local), sin intervención manual

**Given** una frase renderizada
**When** se visualiza en KioskScreen
**Then** el texto Yiddish es `clamp(40px, 4vw, 64px) Playfair Display 400`
**And** la transliteración/traducción es `24px Inter 300` con `opacity: 0.85`
**And** el componente está posicionado `position: absolute; bottom: 2.5vh; left: 2.5vw`

**Given** texto sobre una foto de fondo
**When** se renderiza `YiddishPhrase`
**Then** tiene `text-shadow: 0 2px 16px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5)` en todos los textos
**And** hay un gradiente radial muy sutil en la esquina inferior izquierda como protección D3

**Given** el banco de frases
**When** se verifica en `src/data/yiddish.json`
**Then** cada entrada tiene los tres campos: `yiddish`, `transliteration`, `spanish` — ninguno vacío

---

### Story 2.3: DateDisplay y BirthdayCountdown

Como usuario pasivo (Abel o Liliana),
quiero ver la fecha del día y los cumpleaños próximos en el marco,
para estar orientado en el tiempo y sentir anticipación por los momentos familiares que se acercan.

**Acceptance Criteria:**

**Given** el KioskScreen activo
**When** se renderiza `DateDisplay`
**Then** muestra la fecha en formato largo y cálido: `"Martes, 12 de Mayo de 2026"` con locale `es-AR`
**And** el tamaño es `clamp(22px, 2.5vw, 32px) Inter 300` con `opacity: 0.7`
**And** está posicionado `position: absolute; top: 2.5vh; right: 2.5vw`
**And** se actualiza automáticamente a medianoche sin recarga

**Given** una lista de cumpleaños en `contentStore.birthdays`
**When** se renderiza `BirthdayCountdown`
**Then** muestra los próximos 1-2 cumpleaños con formato `"En X días: cumpleaños de [Nombre]"`
**And** el tamaño es `clamp(28px, 3vw, 42px) Inter 500`
**And** está posicionado `position: absolute; bottom: 2.5vh; right: 2.5vw`

**Given** un cumpleaños que es hoy
**When** se renderiza `BirthdayCountdown`
**Then** muestra `"🎂 Hoy: cumpleaños de [Nombre]"` con el nombre en color `frame-amber`

**Given** que no hay cumpleaños en los próximos 30 días
**When** se renderiza `BirthdayCountdown`
**Then** el componente no se muestra — no ocupa espacio ni deja vacío visible

**Given** más de 2 cumpleaños próximos
**When** transcurre el ciclo de rotación de fotos
**Then** el tercer y siguientes cumpleaños rotan en el lugar del segundo con cada cambio de foto

**Given** texto de cumpleaños sobre foto
**When** se renderiza
**Then** tiene `text-shadow` multicapa idéntico al de `YiddishPhrase` para garantizar legibilidad

---

### Story 2.4: Night mode automático

Como usuario pasivo (Abel o Liliana),
quiero que el marco se atenúe gradualmente de noche y vuelva a la luminosidad normal de día,
para que no moleste en condiciones de poca luz y el marco respire con el ritmo del hogar.

**Acceptance Criteria:**

**Given** el KioskScreen activo
**When** el reloj local llega a las 22:00
**Then** la pantalla hace fade gradual de 60 segundos `linear` hasta 15% de brillo vía `@capacitor-community/screen-brightness`
**And** se aplica la clase `.night-mode` al root con overlay CSS `rgba(20, 10, 5, 0.3)` adicional

**Given** el KioskScreen en night mode
**When** el reloj local llega a las 07:00
**Then** la pantalla hace fade gradual de 60 segundos `linear` de vuelta al 100% de brillo
**And** se remueve la clase `.night-mode` del root

**Given** la app iniciando
**When** la hora actual ya es entre 22:00 y 07:00
**Then** el night mode se activa inmediatamente sin animación — estado correcto desde el inicio

**Given** el night mode activo
**When** se verifica el contraste de los textos
**Then** los ratios WCAG AA (≥ 4.5:1) se mantienen — el overlay no compromete la legibilidad

---

### Story 2.5: Pixel shifting y App.tsx con routing condicional

Como desarrollador,
quiero que `App.tsx` implemente el routing condicional por modo y que el KioskScreen tenga pixel shifting activo,
para completar el KioskScreen y prevenir burn-in en una pantalla encendida 24/7.

**Acceptance Criteria:**

**Given** la app iniciando
**When** `displayStore.mode` es `'welcome'`
**Then** `App.tsx` renderiza `WelcomeScreen` (placeholder hasta Epic 3)

**Given** la app con `displayStore.mode` en `'kiosk'`
**When** se renderiza `App.tsx`
**Then** renderiza `KioskScreen` con todos sus componentes: `PhotoSlide`, `YiddishPhrase`, `DateDisplay`, `BirthdayCountdown`, `GestureDetector` (placeholder hasta Epic 5)

**Given** la app con `displayStore.mode` en `'admin'`
**When** se renderiza `App.tsx`
**Then** renderiza `AdminScreen` (placeholder hasta Epic 5)

**Given** el KioskScreen activo
**When** transcurren 3 minutos
**Then** toda la composición del KioskScreen se desplaza 1-2px en dirección aleatoria
**And** el desplazamiento es imperceptible a 2-4 metros de distancia
**And** el desplazamiento nunca expone borde negro de pantalla

**Given** el KioskScreen activo
**When** se verifica en Chrome DevTools a resolución 1920×1200 landscape
**Then** todos los elementos tienen las posiciones y tamaños correctos sin overflow ni clipping

---

## Epic 3: El momento del primer encendido

Al enchufar el marco (en cada boot), Abel y Liliana ven la foto de sus hijos con el mensaje personal antes de pasar a las fotos familiares. La WelcomeScreen W2 (Dramático) aparece siempre al arrancar: fade-in desde negro, mensaje personal, prompt suave a los 8s, transición al KioskScreen con toque.

### Story 3.1: WelcomeScreen — experiencia visual completa del primer encendido

Como usuario pasivo (Abel o Liliana),
quiero que al enchufar el marco aparezca la foto de mis hijos con un mensaje personal escrito para mí,
para que el primer momento del regalo sea completamente emocional, sin necesidad de que nadie explique nada.

**Acceptance Criteria:**

**Given** la app iniciando con `displayStore.mode` en `'welcome'`
**When** se monta `WelcomeScreen`
**Then** la pantalla comienza en negro absoluto (`background: #1A1210`) y la foto de bienvenida hace fade-in de 3 segundos `ease-in`
**And** la foto ocupa `position: fixed; inset: 0` — full-bleed sin márgenes

**Given** la foto visible durante 2 segundos
**When** transcurren esos 2 segundos
**Then** el mensaje personal aparece con fade-in de 1 segundo sobre la mitad inferior de la pantalla
**And** hay un gradiente `linear-gradient(to bottom, transparent, rgba(10,5,2,0.85))` que garantiza contraste del texto sobre cualquier foto

**Given** el mensaje personal visible
**When** el texto es renderizado
**Then** el título (si existe) es `64px Playfair Display 700` en `frame-cream`
**And** el mensaje es `28px Inter 400` con `line-height: 1.7` en `frame-cream`
**And** ambos textos tienen `text-shadow` multicapa para legibilidad garantizada

**Given** la foto y el mensaje visibles durante 8 segundos
**When** transcurren esos 8 segundos desde que apareció el mensaje
**Then** aparece el prompt `"Tocar para ver las fotos"` con fade-in suave — `22px Inter 300` en `frame-amber` a 60% de opacidad

**Given** el prompt visible
**When** el usuario toca cualquier parte de la pantalla
**Then** toda la `WelcomeScreen` hace crossfade de 3 segundos `ease-in-out` hacia `KioskScreen`
**And** `displayStore.setMode('kiosk')` es llamado al iniciar la transición

**Given** la `WelcomeScreen` activa
**When** el usuario no toca la pantalla
**Then** la pantalla permanece indefinidamente — sin timeout automático, sin redirección forzada

**Given** `welcomeConfig.photoPath` no tiene imagen configurada
**When** se monta `WelcomeScreen`
**Then** se usa `public/welcome-placeholder.jpg` como fallback visible y cálido

---

### Story 3.2: Persistencia de la configuración de bienvenida

Como administrador (Ary),
quiero que la foto y el mensaje de bienvenida persistan entre reinicios del dispositivo,
para que el marco siempre muestre el contenido correcto al encender, sin necesidad de reconfigurarlo.

**Acceptance Criteria:**

**Given** `welcomeConfig` en `contentStore` con foto y mensaje configurados
**When** se llama a `storageService.saveWelcomeConfig(config)`
**Then** los datos son guardados en `@capacitor/preferences` con key `welcomeConfig`
**And** el objeto almacenado contiene `{ photoPath: string, message: string, authorName: string }`

**Given** la app iniciando tras un reinicio
**When** se monta `App.tsx`
**Then** `storageService.loadWelcomeConfig()` es llamado antes de renderizar `WelcomeScreen`
**And** `contentStore.welcomeConfig` se hidrata con los datos persistidos
**And** si no hay datos guardados, se usa el estado inicial con `welcome-placeholder.jpg`

**Given** un `photoPath` guardado que apunta a un archivo en `@capacitor/filesystem`
**When** `WelcomeScreen` intenta cargar la imagen
**Then** la imagen se carga correctamente desde el filesystem local
**And** si el archivo no existe (dispositivo nuevo o reset), se usa `welcome-placeholder.jpg` sin error visible

**Given** la persistencia funcionando
**When** se ejecutan los tests unitarios de `storageService`
**Then** `saveWelcomeConfig` y `loadWelcomeConfig` están cubiertos con casos happy path y fallback

---

## Epic 4: Las fotos de la familia se sincronizan solas

Cuando un hermano sube una foto a Google Photos, aparece en el marco sin que nadie haga nada. OAuth configurado y persistente, sync automático al detectar WiFi, deduplicación por ID, caché local para operación offline indefinida. Todos los errores de API silenciosos.

### Story 4.1: Caché local de fotos en filesystem

Como sistema,
quiero almacenar y recuperar fotos en el filesystem local del dispositivo,
para que el marco opere con contenido disponible offline, independientemente de la conectividad.

**Acceptance Criteria:**

**Given** un array de fotos descargadas
**When** se llama a `photoCacheService.savePhoto(id, blob)`
**Then** la foto se guarda en `@capacitor/filesystem` directorio `DATA` con path `photos/{id}.jpg`
**And** el índice de caché `{ id, localPath, syncedAt }` se actualiza en `@capacitor/preferences` con key `photoCacheIndex`

**Given** el índice de caché con fotos guardadas
**When** se llama a `photoCacheService.getAllCachedPhotos()`
**Then** retorna el array de `Photo[]` con paths locales válidos
**And** solo incluye fotos cuyo archivo físico existe en el filesystem

**Given** un ID de foto ya en el índice
**When** se llama a `photoCacheService.hasPhoto(id)`
**Then** retorna `true` sin acceder al filesystem — solo consulta el índice en memoria

**Given** el caché con fotos disponibles
**When** la app inicia (con o sin WiFi)
**Then** `contentStore.photos` se hidrata desde el caché local antes de intentar cualquier sync
**And** el KioskScreen muestra fotos cacheadas en menos de 5 segundos tras el inicio (NFR2)

**Given** los tests unitarios de `photoCacheService`
**When** se ejecutan
**Then** cubren: guardar foto nueva, detectar foto existente, recuperar índice completo, y manejar filesystem vacío

---

### Story 4.2: Autenticación OAuth con Google Photos

Como administrador (Ary),
quiero autenticarme con Google Photos una sola vez durante el setup,
para que el marco pueda sincronizar fotos automáticamente durante 6 meses sin intervención.

**Acceptance Criteria:**

**Given** la app en AdminScreen con sección Fotos
**When** Ary toca "Conectar Google Photos"
**Then** se abre el flujo OAuth de `@codetrix-studio/capacitor-google-auth` con scope `photoslibrary.readonly`
**And** el flujo es compatible con cuentas Google Workspace (NFR12)

**Given** autenticación exitosa
**When** se completa el flujo OAuth
**Then** el refresh token se persiste en `@capacitor/preferences` con key `oauthRefreshToken` (encrypted vía Android Keystore) (NFR11)
**And** `oauthService.isAuthenticated()` retorna `true`
**And** AdminScreen muestra el estado como "Conectado" con la cuenta autenticada

**Given** un refresh token guardado
**When** el access token expira y `oauthService.getToken()` es llamado
**Then** el token se renueva automáticamente usando el refresh token — sin intervención de Ary
**And** el proceso es completamente silencioso para el usuario pasivo

**Given** fallo en la renovación del token (token revocado, cuenta desconectada)
**When** `oauthService.getToken()` falla
**Then** el error se loguea internamente
**And** el KioskScreen continúa con el caché local sin mostrar ningún error visible (NFR13)
**And** AdminScreen muestra el estado como "Desconectado — reconectar necesario"

**Given** los tests unitarios de `oauthService`
**When** se ejecutan
**Then** cubren: token válido, refresh exitoso, y fallo de refresh con fallback

---

### Story 4.3: Sincronización de fotos desde álbum compartido

Como sistema,
quiero sincronizar fotos nuevas del álbum compartido de Google Photos al caché local,
para que las fotos que suben los hermanos aparezcan en el marco automáticamente.

**Acceptance Criteria:**

**Given** `oauthService.isAuthenticated()` retorna `true`
**When** se llama a `photoSyncService.sync()`
**Then** se consulta la Google Photos API con scope `photoslibrary.readonly` via `@capacitor/http`
**And** solo se descargan fotos cuyo `mediaItem.id` no está en el índice de caché local (deduplicación)
**And** las fotos nuevas se guardan via `photoCacheService.savePhoto()`
**And** `contentStore.photos` se actualiza con las fotos nuevas al finalizar

**Given** fotos nuevas descargadas exitosamente
**When** se completa el sync
**Then** `syncStore.lastSync` se actualiza con el timestamp ISO 8601 actual
**And** `syncStore.syncStatus` vuelve a `'idle'`
**And** el KioskScreen incorpora las fotos nuevas en la rotación sin interrumpir la foto actual (NFR3)

**Given** error en la API de Google Photos (timeout, 5xx, rate limit)
**When** `photoSyncService.sync()` falla
**Then** el error se loguea internamente
**And** `syncStore.syncStatus` vuelve a `'idle'`
**And** el KioskScreen continúa con el caché existente sin ningún mensaje visible (NFR13)

**Given** los tests unitarios de `photoSyncService`
**When** se ejecutan
**Then** cubren: sync con fotos nuevas, sync sin fotos nuevas (nada cambia), y fallo de API con fallback

---

### Story 4.4: Detección de conectividad y sync automático

Como sistema,
quiero detectar cuando el WiFi se restaura e iniciar sync automáticamente,
para que las fotos nuevas aparezcan sin que nadie tenga que hacer nada.

**Acceptance Criteria:**

**Given** la app activa con WiFi desconectado
**When** el WiFi se reconecta
**Then** `syncStore` detecta el cambio via el listener único de `@capacitor/network`
**And** `photoSyncService.sync()` se inicia automáticamente dentro de los 30 segundos siguientes

**Given** la app iniciando con WiFi disponible
**When** se monta `App.tsx`
**Then** se registra el listener de red una única vez (no duplicados aunque la app haya reiniciado)
**And** se inicia un sync inicial si `oauthService.isAuthenticated()` retorna `true`

**Given** un sync ya en progreso (`syncStore.syncStatus === 'syncing'`)
**When** se detecta otra reconexión de WiFi
**Then** no se inicia un segundo sync concurrente — se ignora la señal hasta que el actual termine

**Given** la app sin WiFi (modo offline)
**When** se verifica el comportamiento del KioskScreen
**Then** el marco opera normalmente con el caché local sin degradación visible (NFR5, FR28)
**And** no hay ningún indicador de estado de red visible en la pantalla

**Given** los tests del hook `useSync`
**When** se ejecutan
**Then** cubren: reconexión dispara sync, sync en progreso no se duplica, y modo offline sin errores visibles

---

## Epic 5: Ary puede gestionar el marco

Ary puede acceder al panel admin mediante el gesto oculto + PIN, y gestionar todo el contenido: foto y mensaje de bienvenida, banco de frases Yiddish (con importación masiva por JSON), lista de cumpleaños, sync manual, intervalo de rotación, horario de night mode, y cambio de PIN.

### Story 5.1: Gesto oculto y autenticación PIN

Como administrador (Ary),
quiero activar el panel admin con un gesto secreto seguido de un PIN,
para que Abel y Liliana nunca accedan accidentalmente a la configuración, pero yo pueda hacerlo rápido cuando lo necesito.

**Acceptance Criteria:**

**Given** el KioskScreen activo
**When** Ary da 5 taps consecutivos en la esquina inferior izquierda en menos de 3 segundos
**Then** `GestureDetector` detecta el gesto y muestra el modal `PinEntry`
**And** no hay ningún feedback visual durante la detección — el gesto es completamente secreto

**Given** el modal `PinEntry` visible
**When** se renderiza
**Then** hay un teclado numérico virtual de 10 dígitos (no usa el teclado del sistema)
**And** los dígitos ingresados se muestran como `● ● ● ●` — nunca en texto visible
**And** cada tecla tiene touch target mínimo de 64×64px
**And** el backdrop es `rgba(0,0,0,0.85)` — el KioskScreen permanece detrás pero oscurecido

**Given** el PIN ingresado correctamente
**When** se confirma la entrada
**Then** el modal hace crossfade de 0.5 segundos hacia `AdminScreen`
**And** `adminStore.setAuthenticated(true)` es llamado
**And** `displayStore.setMode('admin')` es llamado

**Given** el PIN ingresado incorrectamente
**When** se confirma la entrada
**Then** los puntos del PIN hacen un shake sutil (animación CSS) sin mensaje de texto
**And** el campo se limpia para reintento

**Given** 3 intentos fallidos consecutivos
**When** se produce el tercer fallo
**Then** el modal se cierra silenciosamente — sin mensaje de error, sin indicación
**And** `adminStore.isAuthenticated` permanece en `false`
**And** el KioskScreen vuelve al estado normal

**Given** el PIN almacenado en `@capacitor/preferences`
**When** se verifica la implementación
**Then** el PIN está almacenado como hash bcrypt — nunca como texto plano (NFR10)
**And** el PIN por defecto inicial (configurable) está hasheado desde el primer inicio

---

### Story 5.2: AdminScreen — estructura, navegación y CRUD de Yiddish y Cumpleaños

Como administrador (Ary),
quiero una pantalla de administración con secciones claras para gestionar el contenido del marco, incluyendo importación masiva de frases Yiddish,
para poder editar contenido sin necesitar documentación ni tener que escribir cada frase en el tablet.

**Acceptance Criteria:**

**Given** `adminStore.isAuthenticated` es `true`
**When** se renderiza `AdminScreen`
**Then** hay un header fijo con botón `"← Volver al frame"` siempre visible
**And** el contenido es scrollable verticalmente con secciones claramente delimitadas
**And** toda la tipografía es Inter en tamaños normales — optimizada para sostener la tablet en mano

**Given** el botón `"← Volver al frame"`
**When** Ary lo toca
**Then** hay crossfade de 2 segundos hacia `KioskScreen`
**And** `adminStore.setAuthenticated(false)` y `displayStore.setMode('kiosk')` son llamados

**Given** la sección "Frases Yiddish" en AdminScreen
**When** Ary visualiza la lista
**Then** ve todas las frases del banco con botones `Editar` y `Eliminar` inline por ítem
**And** hay un formulario expandible in-place para agregar nueva frase con campos: Yiddish, Transliteración, Español
**And** hay una sección "Importar frases" con un `<textarea>` para pegar un JSON array

**Given** Ary guarda una frase nueva o editada individualmente
**When** toca "Guardar"
**Then** la frase se persiste en `@capacitor/preferences` key `yiddishPhrases`
**And** `contentStore.yiddishPhrases` se actualiza inmediatamente
**And** aparece toast `"Guardado ✓"` en `frame-amber` durante 2 segundos

**Given** Ary pega un JSON array en el área de importación con formato `[{ "yiddish": "...", "transliteration": "...", "spanish": "..." }]`
**When** toca "Importar"
**Then** el JSON es validado — cada entrada debe tener los tres campos no vacíos
**And** las frases válidas se fusionan con el banco existente (merge, no reemplazo — sin duplicados)
**And** `contentStore.yiddishPhrases` y `@capacitor/preferences` se actualizan
**And** aparece toast `"X frases importadas"` en `frame-amber` con el conteo de frases nuevas

**Given** el JSON pegado tiene formato inválido o entradas con campos faltantes
**When** Ary toca "Importar"
**Then** aparece toast `"Formato inválido — revisá el JSON"` en `frame-sepia`
**And** no se modifica el banco existente

**Given** Ary toca "Eliminar" en una frase
**When** confirma la eliminación en el diálogo simple
**Then** la frase se elimina del store y de `@capacitor/preferences`
**And** aparece toast de confirmación

**Given** la sección "Cumpleaños" en AdminScreen
**When** Ary gestiona la lista
**Then** puede agregar, editar y eliminar entradas con campos: Nombre y Fecha (`YYYY-MM-DD`)
**And** los cambios persisten en `@capacitor/preferences` key `birthdays`
**And** `contentStore.birthdays` se actualiza inmediatamente
**And** cada acción exitosa muestra toast `frame-amber` de 2 segundos

**Given** Ary intenta guardar con un campo obligatorio vacío
**When** toca "Guardar"
**Then** el campo vacío recibe `border: 1px solid frame-amber` como señal visual
**And** no se guarda nada hasta que todos los campos estén completos

---

### Story 5.3: AdminScreen — gestión de bienvenida y configuración del sistema

Como administrador (Ary),
quiero poder editar la foto y mensaje de bienvenida, y ajustar parámetros del sistema desde el admin,
para tener control completo del marco sin visitar el código.

**Acceptance Criteria:**

**Given** la sección "Bienvenida" en AdminScreen
**When** Ary edita el mensaje
**Then** puede escribir un texto libre en un `<textarea>` con `min-height: 100px`
**And** puede seleccionar una nueva foto de bienvenida desde el filesystem del dispositivo
**And** al guardar, `contentStore.welcomeConfig` y `@capacitor/preferences` key `welcomeConfig` se actualizan
**And** el cambio se refleja en la próxima vez que aparezca `WelcomeScreen`

**Given** la sección "Configuración" en AdminScreen
**When** Ary ajusta el intervalo de rotación
**Then** puede ingresar un valor en segundos (mínimo 10, máximo 300)
**And** el valor se guarda en `@capacitor/preferences` key `photoRotationInterval` en milisegundos
**And** `KioskScreen` usa el nuevo intervalo a partir del siguiente cambio de foto

**Given** la sección "Configuración"
**When** Ary ajusta el horario de night mode
**Then** puede editar la hora de inicio (default 22:00) y fin (default 07:00) en formato HH:MM
**And** los valores se persisten en `@capacitor/preferences` keys `nightModeStart` y `nightModeEnd`

**Given** la sección "Configuración"
**When** Ary cambia el PIN
**Then** debe ingresar el PIN actual para confirmar identidad
**And** el nuevo PIN es hasheado con bcrypt antes de guardarse
**And** si el PIN actual es incorrecto, no se permite el cambio y aparece toast de error en `frame-sepia`

**Given** la sección "Sistema" en AdminScreen
**When** Ary toca "Reiniciar app"
**Then** aparece un diálogo de confirmación simple
**And** al confirmar, la app se reinicia via Capacitor App plugin

---

### Story 5.4: AdminScreen — fotos: sync manual y estado OAuth

Como administrador (Ary),
quiero ver el estado de sincronización de fotos y poder forzar un sync manual desde el admin,
para verificar que las fotos de los hermanos están llegando y resolver problemas de conectividad.

**Acceptance Criteria:**

**Given** la sección "Fotos" en AdminScreen
**When** Ary la visualiza
**Then** ve el estado OAuth: "Conectado como [cuenta]" o "Desconectado — reconectar necesario"
**And** ve la fecha y hora del último sync exitoso (`syncStore.lastSync`)
**And** ve el número de fotos en caché local (`contentStore.photos.length`)

**Given** el estado OAuth como "Desconectado"
**When** Ary toca "Conectar Google Photos"
**Then** se inicia el flujo OAuth de `oauthService` (Story 4.2)
**And** al completarse exitosamente, el estado se actualiza a "Conectado"

**Given** `oauthService.isAuthenticated()` es `true`
**When** Ary toca "Forzar sincronización"
**Then** el botón muestra `"Sincronizando..."` con spinner sutil mientras dura el sync
**And** el resto de AdminScreen permanece usable durante el sync
**And** al completar con fotos nuevas: toast `"X fotos nuevas sincronizadas"` en `frame-amber` (3 segundos)
**And** al completar sin cambios: toast `"Sin fotos nuevas"` en `frame-amber` (2 segundos)
**And** si hay error de red: toast `"Sin conexión — usando caché"` en `frame-sepia` (4 segundos)

**Given** `oauthService.isAuthenticated()` es `false`
**When** Ary intenta forzar sync
**Then** el botón está deshabilitado con texto `"Conectar Google Photos primero"`

---

## Epic 6: El marco funciona solo durante 6 meses

El marco arranca automáticamente al enchufarlo, no se puede salir accidentalmente, la pantalla nunca se apaga, y el producto se distribuye como APK firmado instalable. Autonomía total — sin intervención técnica de Ary.

### Story 6.1: Auto-start al encender — BootReceiver

Como sistema,
quiero que la app se inicie automáticamente cuando el dispositivo se enciende,
para que Abel y Liliana solo tengan que enchufar el marco sin necesidad de tocar nada.

**Acceptance Criteria:**

**Given** el dispositivo Android apagado
**When** Abel lo enchufa y Android completa el boot
**Then** el sistema emite `BOOT_COMPLETED` broadcast y `BootReceiver.kt` lo captura
**And** la app `family-frame` se lanza automáticamente sin intervención del usuario

**Given** `BootReceiver.kt` implementado
**When** se revisa `AndroidManifest.xml`
**Then** está declarado el receiver con `android.intent.action.BOOT_COMPLETED`
**And** el permiso `RECEIVE_BOOT_COMPLETED` está declarado

**Given** la app iniciando por BOOT_COMPLETED
**When** se monta `App.tsx`
**Then** el flujo es idéntico al inicio manual — `WelcomeScreen` → toque → `KioskScreen`
**And** el tiempo total desde enchufe hasta `WelcomeScreen` visible es menor a 60 segundos (NFR6)

---

### Story 6.2: Pantalla siempre encendida — WAKE_LOCK

Como sistema,
quiero que la pantalla permanezca encendida de forma continua,
para que el marco esté siempre visible sin que nadie tenga que reactivarlo.

**Acceptance Criteria:**

**Given** la app activa en `KioskScreen`
**When** transcurren los timeouts de pantalla del sistema Android
**Then** la pantalla permanece encendida — el `WAKE_LOCK` de `MainActivity.kt` lo previene

**Given** `MainActivity.kt` implementado
**When** se revisa el código
**Then** adquiere `PowerManager.SCREEN_BRIGHT_WAKE_LOCK` en `onCreate`
**And** el permiso `WAKE_LOCK` está declarado en `AndroidManifest.xml`

**Given** el WAKE_LOCK activo
**When** la app entra en background (si ocurre accidentalmente)
**Then** el WAKE_LOCK se mantiene hasta que la app vuelve al foreground
**And** la app vuelve al foreground automáticamente

---

### Story 6.3: Modo kiosk — prevención de salida accidental

Como usuario pasivo (Abel o Liliana),
quiero que sea imposible salir accidentalmente de la aplicación,
para que el marco siempre muestre las fotos sin que nadie tenga que "arreglarlo".

**Acceptance Criteria:**

**Given** la app activa en `KioskScreen`
**When** Abel presiona el botón Home del sistema Android
**Then** `@capgo/capacitor-android-kiosk` previene la salida y la app permanece en pantalla completa

**Given** la app en kiosk mode
**When** Abel presiona el botón Back del sistema Android
**Then** la acción es interceptada y no ocurre navegación ni cierre de app

**Given** la app en kiosk mode
**When** Abel presiona el botón Recents (apps recientes)
**Then** la acción es ignorada — la app no se minimiza

**Given** el kiosk mode configurado
**When** se revisa `AndroidManifest.xml`
**Then** la activity tiene `android:screenOrientation="landscape"` declarado
**And** el viewport meta en `index.html` incluye `maximum-scale=1.0, user-scalable=no`

**Given** Ary necesita salir del kiosk mode para mantenimiento
**When** accede a `AdminScreen` via gesto + PIN
**Then** el kiosk mode puede suspenderse temporalmente desde la sección "Sistema"
**And** al volver al frame se reactiva automáticamente

---

### Story 6.4: Build y distribución — APK firmado para sideload

Como administrador (Ary),
quiero poder compilar y firmar el APK para instalarlo en la tablet via sideload,
para entregar el marco funcionando el 12 de mayo sin depender de Play Store.

**Acceptance Criteria:**

**Given** el proyecto completo con todos los epics implementados
**When** Ary ejecuta `npm run build && npx cap sync android`
**Then** el build web compila sin errores y se sincroniza a la capa Android

**Given** el proyecto sincronizado
**When** Ary ejecuta `cd android && ./gradlew assembleRelease`
**Then** se genera `app-release-unsigned.apk` en `android/app/build/outputs/apk/release/`

**Given** un keystore privado generado por Ary
**When** se firma el APK con `apksigner`
**Then** se genera `app-release.apk` firmado e instalable

**Given** el APK firmado
**When** Ary ejecuta `adb install app-release.apk` con la tablet conectada por USB
**Then** la app se instala correctamente en Android 14
**And** la app aparece como launcher por defecto tras el boot

**Given** el APK instalado
**When** Ary reinicia la tablet desenchufando y volviendo a enchufar
**Then** la app arranca sola, muestra `WelcomeScreen` y pasa a `KioskScreen` en menos de 60 segundos (NFR6)
**And** todos los datos persistidos (fotos cacheadas, frases Yiddish, cumpleaños, welcomeConfig) sobreviven el reinicio

