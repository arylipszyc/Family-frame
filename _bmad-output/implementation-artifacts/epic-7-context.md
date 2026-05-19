# Epic 7 Context: Rediseño visual del kiosk (NS-8)

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Rediseñar el `KioskScreen` para que se sienta como un cuadro enmarcado en lugar de un layout "de developer". La validación en hardware mostró que el layout actual (texto flotando sobre foto full-bleed con `object-fit: contain` sobre fondo negro) deja bandas negras visibles en fotos verticales y se lee como hueco vacío. El epic introduce un split 78/22 (foto izquierda, panel derecha) con backdrop cálido compartido para que las bandas se lean como passe-partout, migra cumpleaños y fecha al panel, agrega soporte de calendario hebreo, y deja una zona reservada para un reloj cuya decisión está diferida. Deadline duro: 2026-05-25 (regalo).

## Stories

- Story 7.1: KioskScreen — layout split 78/22 con backdrop cálido
- Story 7.2: BirthdayCountdown y DateDisplay — migración al panel
- Story 7.3: Soporte calendario hebreo para cumpleaños
- Story 7.4: AdminScreen — toggle calendario gregoriano/hebreo
- Story 7.5 (diferida): Reloj en el panel

## Requirements & Constraints

- **Cero crop de fotos.** `object-fit: contain` se conserva en `PhotoSlide`. Las bandas que aparecen cuando la foto no llena la zona son intencionales y deben leerse como passe-partout, no como negro.
- **Resolución target:** 1920×1080 landscape, tablet 14". Las proporciones 78/22 deben ser robustas a variaciones tipo 1920×1200.
- **Lectura a 2-3 metros** sin esfuerzo para cumpleaños y fecha. Sin overflow horizontal en el panel (358px content width).
- **Backward compatibility:** entries de cumpleaños existentes en `@capacitor/preferences` sin campo `calendar` deben migrar a `calendar: 'gregorian'` automáticamente al cargar (sin prompt al usuario).
- **WelcomeScreen no se toca.** Solo se rediseña `KioskScreen` y `AdminScreen` (form de cumpleaños).
- **Comportamientos preservados:** pixel shifting, paper overlay (`saturate 0.85 brightness 0.95 sepia 0.08` + linen 6%), `NightModeOverlay`, `GestureDetector` (esquina inferior izquierda 64×64), lógica existente de selección/rotación de cumpleaños (`daysUntil <= 30`, sort, rotación si >2), actualización de `DateDisplay` a medianoche.
- **Validación en hardware obligatoria** post-implementación: foto 16:9, 4:3, 1:1 y 9:16 deben verse correctamente; transición foto↔panel invisible; cumpleaños hebreo con fecha correcta.

## Technical Decisions

- **Gradiente warm-dark compartido:** `linear-gradient(to bottom, #1A1210, #1F1813)` aplicado al **container raíz** que envuelve `PhotoZone` + `SidePanel`. Ambas zonas heredan el gradiente y **no** definen `backgroundColor` propio — la transición entre ellas es invisible (sin línea divisoria).
- **Layout shell:** root `position: fixed; inset: -3px; display: flex; flex-direction: row; overflow: hidden`. PhotoZone `width: 78%; position: relative`. SidePanel `width: 22%; padding: 80px 32px 68px 32px; display: flex; flex-direction: column`.
- **Pixel shift se mueve al container raíz** (no a `PhotoSlide` individualmente), para que foto y panel deriven juntos y se prevenga burn-in en ambos.
- **PhotoSlide:** cambia de `position: fixed; inset: 0; backgroundColor: '#1A1210'` a `position: absolute; inset: 0`, sin `backgroundColor` propio. `object-fit: contain`, filtros y precarga del próximo `<img>` se conservan.
- **Máquina de transición fade-through-passe-partout:** dos fases secuenciales de 1250ms (total 2500ms). Fase 1: top fade out 1→0 con bottom en 0. Fase 2: bottom fade in 0→1. **Nunca** ambas capas visibles a la vez. En el instante entre fases solo se ve el gradiente warm-dark. Swap atómico de índices al final del fade-in. Reemplaza el reveal-by-fade actual que mostraba ambas fotos solapadas en transiciones entre aspect ratios distintos.
- **YiddishPhrase queda DENTRO del PhotoZone** como overlay sobre la foto. Sin cambios funcionales: `position: absolute; bottom: 2.5vh; left: 2.5vw` (coordenadas ahora relativas al PhotoZone, no al viewport), Playfair Display `clamp(40px, 4vw, 64px)`, gradiente radial protector y text-shadow multicapa intactos.
- **Modelo de datos `Birthday`:** se agrega `calendar: 'gregorian' | 'hebrew'`. La `date` sigue siendo siempre **gregoriana** (fecha real de nacimiento); `calendar` solo cambia **cómo se calcula el próximo cumpleaños anual**.
- **Librería de cálculo hebreo:** `@hebcal/core` (MIT, ~80KB, sin deps nativas). Se aísla en una nueva utilidad `src/utils/birthdayCalendar.ts` con `calculateNextBirthday(birthday)` que importa `@hebcal/core` solo en la rama hebrea (tree-shake-friendly). Para `gregorian`, delega a la lógica existente `daysUntilNextBirthday` sin cambios.
- **Algoritmo hebreo:** convertir `date` gregoriana → `{hMonth, hDay}` con `HDate.fromGregorian`; convertir `{hMonth, hDay, currentHebrewYear}` → gregoriana; si ya pasó, repetir con `currentHebrewYear + 1`; retornar `{ daysUntil }`. Debe atravesar correctamente años bisiestos hebreos (Adar I / Adar II).
- **Tipografía del panel — tamaños fijos en px** (sin `clamp`, sin `text-shadow`): el ancho del panel es conocido (422px). Se elimina `position: absolute` y `text-align: right` en `BirthdayCountdown` y `DateDisplay` — pasan a ser children normales del flex-column del SidePanel.
- **Color tokens:** se reutiliza la paleta existente (`frame-cream`, `frame-amber #C8956C`, `frame-sepia`, `frame-charcoal`, `frame-night`, `frame-paper`). No se crean tokens nuevos para NS-8 base.

## UX & Interaction Patterns

- **Composición vertical del panel (1080px alto):** padding-top 80 → zona reloj reservada 320 (vacía hasta decidir A/B/C) → gap 56 → zona cumpleaños 380 → gap 56 → zona fecha 120 → padding-bottom 68.
- **Cumpleaños — formato multilinea de 3 niveles** (jerarquía: magnitud temporal → contexto → protagonista):
  - L1 `"En X días"` o `"🎂 Hoy"` — Inter 32px peso 300, color `#F5F0E8`
  - L2 `"cumpleaños de"` — Inter 24px peso 300, color `#F5F0E8` opacity 0.75
  - L3 nombre — Inter 40px peso 500, color `frame-amber` (#C8956C)
  - Gap vertical ~24px entre las dos entradas si hay 2.
- **DateDisplay:** Inter 24px peso 300, color `#F5F0E8` opacity 0.7, `text-align: left`, multilinea permitida (sin `white-space: nowrap`) — la fecha completa en español puede ser larga ("Miércoles, 24 de diciembre de 2026").
- **Bandas warm-dark por aspect ratio:** 16:9 → ~118px arriba/abajo; 4:3 → ~29px laterales (casi fill); 1:1 → ~209px laterales; 9:16 → ~445px laterales (efecto retrato enmarcado).
- **AdminScreen — radio group calendario:** entre input Fecha y botones Guardar/Cancelar. `display: flex; gap: 24px; align-items: center`. Cada radio con `min-height: 48px` (táctil). Label Inter 16px peso 500 `frame-cream`. Default `Gregoriano`. Hint condicional (solo si `hebrew`): Inter 13px peso 300 `frame-sepia`, line-height 1.5, `max-width: 480px`, texto "El cumpleaños se mostrará en su fecha hebrea cada año (puede caer en distintas fechas gregorianas)".
- **AdminScreen — indicador hebreo en la lista:** símbolo `✡` (U+2721) entre el nombre y el botón Editar, `color: frame-amber; opacity: 0.6; font-size: 14px; margin-left: 8px`. Cumpleaños gregorianos NO muestran ningún símbolo (gregoriano = ausencia de marcador).
- **KioskScreen — display del cumpleaños hebreo:** sin diferencia visual respecto del gregoriano. La complejidad vive en el cálculo, no en la UI.

## Cross-Story Dependencies

- **7.1 es prerequisito visual** de 7.2 (el `SidePanel` debe existir antes de migrar `BirthdayCountdown` y `DateDisplay`).
- **7.3 es prerequisito de 7.4** (el campo `calendar` en el tipo `Birthday` y la utilidad `birthdayCalendar.ts` deben existir antes de exponer el toggle en `AdminScreen`).
- **7.2 y 7.3 son independientes** entre sí y pueden hacerse en paralelo después de 7.1.
- **7.5 está diferida:** owner revisa el frame con 7.1–7.4 implementadas y elige A (sin reloj — cumpleaños crece a 540px, fecha a 160px), B (digital `HH:MM` Inter 96px) o C (análogo SVG Ø280px, sin segundero, update cada 30s). No bloquea entrega del 2026-05-25.
- **Migración de datos:** `adminContentService.loadBirthdays` debe inyectar `calendar: 'gregorian'` a entries pre-existentes antes de que cualquier consumidor (KioskScreen, AdminScreen, utilidad de cálculo) los lea.
