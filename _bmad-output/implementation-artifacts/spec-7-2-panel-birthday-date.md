---
title: 'Story 7.2 — BirthdayCountdown y DateDisplay migración al panel'
type: 'refactor'
created: '2026-05-19'
status: 'done'
baseline_commit: '89413d95a37324f2ea7f4db6ea3ea3eafd64eac2'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-1-kiosk-layout-split.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 7.1 dejó el SidePanel vacío y `BirthdayCountdown` + `DateDisplay` siguen renderizados como overlays full-screen sobre el viewport (con `position: absolute`, `textShadow`, font sizes con `clamp`). El SidePanel se ve un rectángulo negro vacío y los textos siguen flotando sobre la foto. Owner pidió rediseño: contenido del panel adentro del panel, fuera de la foto.

**Approach:** Convertir `SidePanel` en un flex-column con `padding: 80px 32px 68px 32px` + `gap: 56px`. Tres zonas: reloj reservada vacía (320px, Story 7.5 diferida), birthday zone (380px), date zone (120px). Reescribir `BirthdayCountdown` con layout multilinea 3-niveles (32 / 24 / 40 px). Reescribir `DateDisplay` plano. Total alto: 80 + 320 + 56 + 380 + 56 + 120 + 68 = 1080.

## Boundaries & Constraints

**Always:**
- Preservar lógica de `BirthdayCountdown`: filtro `daysUntil <= 30`, sort por proximidad, rotación cuando hay >2 cumpleaños próximos.
- Preservar lógica de `DateDisplay`: cálculo `formatDate`, reschedule a medianoche.
- Birthday zone queda **reservada a 380px** aunque `BirthdayCountdown` renderice null (cero cumpleaños próximos) — la fecha NO debe subir.
- Date zone queda reservada a 120px — sin nowrap, multilinea OK para fechas largas tipo "Miércoles, 24 de diciembre de 2026".
- Clock zone queda visualmente vacía (Story 7.5 difiere la decisión A/B/C).
- Layout del KioskScreen del Story 7.1 (split 78/22, root negro puro, linen overlay a nivel root, pixel shift al root, YiddishPhrase dentro del PhotoZone, NightModeOverlay / GestureDetector / PinEntry hermanos del root) **intacto**.

**Ask First:**
- Si los 380px de birthday zone no caben para 2 cumpleaños en formato 3-niveles dentro de los 358px de content-width (panel 422 - padding 32x2) → HALT y reportar.
- Si la fecha en español más larga overflowea horizontalmente con 24px Inter en 358px → HALT y reportar.

**Never:**
- No cambiar el ratio 78/22 — owner valida ratio post-implementación.
- No cambiar la lógica de selección/rotación de birthdays ni el reschedule de DateDisplay.
- No tocar tipos (`Birthday` / `calendar` field es Story 7.3).
- No mover `YiddishPhrase` ni los otros overlays.
- No introducir clamp() ni text-shadow en los nuevos estilos (font sizes fijos en px — el ancho del panel es conocido).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|---|---|---|---|
| Sin cumpleaños próximos | `birthdays` con todos `daysUntil > 30` | Birthday zone se renderiza vacía (height 380 conservado); date zone queda en su posición | N/A |
| 1 cumpleaños próximo | upcoming.length === 1 | Una entrada multilinea 3-niveles en la birthday zone | N/A |
| 2 cumpleaños próximos | upcoming.length === 2 | Dos entradas con gap vertical 24px entre ellas | N/A |
| >2 cumpleaños próximos | upcoming.length > 2 | slot1 = primero, slot2 = rota con `rotationSlot % (length-1)` | N/A (lógica existente) |
| Cumpleaños hoy | `daysUntil === 0` | L1 = "🎂 Hoy", L2 = "cumpleaños de", L3 = nombre | N/A |
| Fecha larga en español | "Miércoles, 24 de diciembre de 2026" | Renderiza multilínea si no entra en 358px width, sin overflow horizontal | N/A |

</frozen-after-approval>

## Code Map

- `src/screens/KioskScreen.tsx` -- `sidePanelStyle` recibe padding + flex-column + gap. Tres zone divs (clock vacía, birthday, date) reemplazan el `<div />` actual. `BirthdayCountdown` y `DateDisplay` se mueven DENTRO del SidePanel (de hermanos del root a children del SidePanel).
- `src/components/BirthdayCountdown.tsx` -- Reescribir `containerStyle` (sin `position: absolute`, sin `textAlign: right`, sin `userSelect`). Reescribir `BirthdayLine` con layout 3-niveles vía `<div>` con 3 `<p>`s (32 / 24 / 40 px). Eliminar el `birthdayStyle` viejo.
- `src/components/DateDisplay.tsx` -- Reescribir `dateStyle` plano (sin `position: absolute`, sin `textShadow`, sin clamp, sin `textAlign: right`, sin `whiteSpace: nowrap`). 24px Inter 300, opacity 0.7, text-align left.

## Tasks & Acceptance

**Execution:**
- [ ] `src/components/BirthdayCountdown.tsx` -- Reescribir `containerStyle` a `{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }`. Reescribir `BirthdayLine` para renderizar tres `<p>` en un wrapper `<div>`: L1 32px Inter 300 `#F5F0E8`, L2 24px Inter 300 `#F5F0E8` opacity 0.75, L3 40px Inter 500 `#C8956C`. Para `daysUntil === 0`: L1 = "🎂 Hoy". Para resto: L1 = `En ${days} día${days === 1 ? '' : 's'}`. L2 fijo "cumpleaños de". L3 = `entry.name`. Eliminar `birthdayStyle` viejo. Conservar la lógica de slots y filtros sin tocar.
- [ ] `src/components/DateDisplay.tsx` -- Reescribir `dateStyle` a `{ fontFamily: "'Inter', sans-serif", fontSize: '24px', fontWeight: 300, lineHeight: 1.4, color: '#F5F0E8', opacity: 0.7, textAlign: 'left', margin: 0 }`. Eliminar `position`, `textShadow`, `clamp`, `whiteSpace: nowrap`, `userSelect`. Conservar `useEffect` de midnight reschedule sin tocar.
- [ ] `src/screens/KioskScreen.tsx` -- `sidePanelStyle` pasa a `{ width: '22%', height: '100%', padding: '80px 32px 68px 32px', display: 'flex', flexDirection: 'column', gap: '56px', boxSizing: 'border-box' }`. Crear `clockZoneStyle` (`height: 320px; flexShrink: 0`), `birthdayZoneStyle` (`height: 380px; flexShrink: 0; overflow: hidden`), `dateZoneStyle` (`height: 120px; flexShrink: 0`).
- [ ] `src/screens/KioskScreen.tsx` -- Reestructurar el JSX: el `<div style={sidePanelStyle}>` ahora envuelve tres zones: `<div style={clockZoneStyle} />` + `<div style={birthdayZoneStyle}><BirthdayCountdown .../></div>` + `<div style={dateZoneStyle}><DateDisplay /></div>`. `BirthdayCountdown` y `DateDisplay` ya NO son hermanos del root flex — viven dentro del SidePanel.

**Acceptance Criteria:**
- Given el `SidePanel` renderizado, when monta, then tiene `padding: 80px 32px 68px 32px`, `display: flex; flex-direction: column`, `gap: 56px` y contiene tres zones en orden: clock (320px vacía), birthday (380px), date (120px), todas con `flex-shrink: 0`.
- Given `BirthdayCountdown` en su zone, when renderiza con upcoming.length >= 1, then es un flex-column interno de altura 100% que muestra hasta 2 entradas con gap vertical 24px.
- Given una entrada de cumpleaños con `daysUntil > 0`, when se renderiza, then se ven tres `<p>`s apilados: "En X día(s)" en Inter 32px peso 300 color `#F5F0E8`, "cumpleaños de" en Inter 24px peso 300 color `#F5F0E8` opacity 0.75, nombre en Inter 40px peso 500 color `#C8956C`.
- Given una entrada con `daysUntil === 0`, when se renderiza, then la L1 es "🎂 Hoy" (mantiene el formato resto idéntico).
- Given `BirthdayCountdown` con cero cumpleaños próximos, when renderiza, then retorna null (igual que antes) y la birthday zone queda visualmente vacía pero conserva 380px de alto — la date zone NO sube.
- Given `DateDisplay` en su zone, when renderiza, then es un `<p>` plano sin `position`, sin `textShadow`, sin `clamp`, sin `nowrap`: Inter 24px peso 300, color `#F5F0E8` opacity 0.7, text-align left, multilínea permitida.
- Given una fecha larga en español ("Miércoles, 24 de diciembre de 2026"), when no entra en una línea dentro de 358px content-width, then se renderiza en 2 líneas sin overflow horizontal.
- Given la lógica existente de `BirthdayCountdown` (filtro `daysUntil <= 30`, sort, rotation slot), when corre, then comportamiento idéntico al actual — solo cambia el render.
- Given la lógica existente de `DateDisplay` (reschedule a medianoche), when llega medianoche, then `setToday` dispara y la fecha actualiza sin cambios funcionales.
- Given los 166 tests existentes, when `npm run test`, then todos pasan sin romper.

## Spec Change Log

### 2026-05-19 — Owner-driven UX pivot post-hardware: tabla en lugar de 3-line multilinea

**Triggering finding:** Validación visual en tablet (post-implementación inicial 7.2). Ary observó que el layout 3-niveles (32 / 24 / 40 px stacked) ocupa ~325px verticales para 2 entradas → demasiado espacio dado el formato del panel.

**Owner request:** "Para ocupar menos espacio, podriamos mostrar los proximos cumpleaños en una tabla. Titulo: Proximos cumpleaños y en cada fila Nombre + 'En X dias'".

**What was amended:** El render de `BirthdayCountdown` cambió de **3-line stacked multilinea** a **tabla compacta**:
- Header: "Próximos cumpleaños" en Inter 20px peso 400, opacity 0.5, letter-spacing 0.5px.
- Cada fila: flex row con `justify-content: space-between`. Nombre izquierda (Inter 32px peso 500 amber). "En X días" o "🎂 Hoy" derecha (Inter 26px peso 300 cream opacity 0.85).
- Gap entre filas: 14px.
- Ocupa ~120px vs ~325px del 3-line — ahorro de ~205px verticales.

**Lógica preservada:** Selección slot1/slot2 con rotación si >2 (sin cambios). Filtro `daysUntil <= 30` sin cambios.

**Deviation de Sally:** El 3-line con hierarchy "magnitud → contexto → protagonista" se reemplaza por tabla utilitaria. La "respiración" contemplativa que Sally diseñó se pierde a cambio de densidad informacional. Decisión owner-driven, post-hardware con contexto físico real (regalo).

**KEEP:**
- Si owner reporta en algún momento futuro que el panel se siente "denso" o "lista de tareas" en vez de "marco contemplativo" → opción de revertir a 3-line es 1 commit revertido. Trazado acá.
- Nombre en amber + days en cream sigue conservando la jerarquía cromática de Sally.
- "🎂 Hoy" preservado como variante para el día del cumpleaños.

**Pending:** Surface deviation a Sally retrospectivamente si audita Epic 7.

**Open items:**
- Zona reservada birthday sigue 380px aunque la tabla ocupa ~120px → ~260px de aire vacío visible. Owner observa pero acepta por ahora. Si en review post-7.5 (reloj) decide reducir la zona, es 1 valor en `birthdayZoneStyle.height`.
- Capacidad actual: 2 filas (slot1 + slot2 con rotación). Si owner quiere más entradas visibles (ej. 4-5), se puede bumpear el límite en el render — el slot logic ya soporta el set completo.

### 2026-05-19 — Side effect del refactor: linen overlay ahora tinta texto del panel

**Triggering finding:** Edge case hunter (step-04) detectó que el linen overlay introducido en Story 7.1 tenía un comentario explícito que decía "DateDisplay / BirthdayCountdown (renderizados después en DOM) no se tintan". En Story 7.1 ambos componentes vivían como hermanos del root, renderizados DESPUÉS del overlay → no tintados. En Story 7.2 los movemos DENTRO del SidePanel, que se renderiza ANTES del linen overlay → el linen ahora los tinta.

**Impact:** El tint es rgba(245, 235, 210, 0.06) — 6% cream. Sobre `#F5F0E8` (texto blanco-cream): cambio sub-perceptual (<5 RGB units por canal). Sobre `#C8956C` (amber del nombre): idem. A 2-3m de distancia en tablet: imperceptible.

**What was amended:** Actualizado el comentario del `linenOverlayStyle` en KioskScreen.tsx para reflejar que el tint ahora aplica a sidePanel content también. No se cambió código funcional. Si en hardware el tint sobre amber resulta visible y molesto, fix futuro: poner linen overlay separado por zona (uno dentro de photoZone, otro dentro de sidePanel pero ANTES del content), o usar dos elementos `<div>` linen-bg con zIndex orquestado.

**KEEP:** Para futuros agregados al SidePanel (Story 7.3/7.4/7.5), todo nuevo contenido del panel hereda el tint linen 6%. Si el ojo entrenado en hardware detecta wash-out sobre amber, escalado a Sally para decisión.

## Verification

**Commands:** `npm run test`, `npm run lint`, `npm run build`, `npx cap sync android`.

**Manual (tablet, post-cap-sync + install via AS):**
- Panel se ve poblado (cumpleaños arriba-medio, fecha abajo) sin que el contenido se monte sobre la foto.
- Cumpleaños se leen a 2-3m: jerarquía clara (días → contexto → nombre amber).
- Fecha en español larga: cabe en 1-2 líneas sin overflow horizontal.
- Zona reloj (top 320px del content area) queda visualmente vacía pero el panel no se ve "raro" por eso — owner decide post-7.4 si poner reloj.
- **Ratio 78/22 reconfirm:** owner valida si el panel a 22% se siente correcto con contenido real, o si querés ajustar.

## Suggested Review Order

**SidePanel layout (corazón de la story)**

- Padding + flex-column + gap + boxSizing + overflow safety net.
  [`KioskScreen.tsx:43`](../../src/screens/KioskScreen.tsx#L43)

- Tres zone constants con flexShrink:0 (clock vacía, birthday, date).
  [`KioskScreen.tsx:54`](../../src/screens/KioskScreen.tsx#L54)

- JSX wrap: SidePanel ahora envuelve los 3 zones + componentes adentro.
  [`KioskScreen.tsx:157`](../../src/screens/KioskScreen.tsx#L157)

- Linen overlay comment actualizado (ahora tinta texto del panel — sub-perceptual).
  [`KioskScreen.tsx:71`](../../src/screens/KioskScreen.tsx#L71)

**BirthdayCountdown — render multilinea 3-niveles**

- BirthdayLine reescrito como 3 `<p>` apilados con tipografía fija.
  [`BirthdayCountdown.tsx:26`](../../src/components/BirthdayCountdown.tsx#L26)

- containerStyle flex-column con gap 24px entre 2 entradas.
  [`BirthdayCountdown.tsx:69`](../../src/components/BirthdayCountdown.tsx#L69)

- Lógica preservada: filter daysUntil<=30, sort, rotation slot >2.
  [`BirthdayCountdown.tsx:44`](../../src/components/BirthdayCountdown.tsx#L44)

**DateDisplay — flat layout**

- dateStyle sin position absolute / textShadow / clamp / nowrap. 24px Inter 300, text-align left.
  [`DateDisplay.tsx:37`](../../src/components/DateDisplay.tsx#L37)

- Reschedule midnight intacto.
  [`DateDisplay.tsx:17`](../../src/components/DateDisplay.tsx#L17)
