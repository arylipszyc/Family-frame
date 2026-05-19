---
title: 'Story 7.1 — KioskScreen layout split 78/22 con backdrop cálido'
type: 'refactor'
created: '2026-05-19'
status: 'done'
baseline_commit: '378d978221471d4064c7eb8caed9d744e439a887'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `KioskScreen` muestra fotos full-bleed sobre negro plano. En verticales/cuadradas las bandas de `object-fit: contain` leen como hueco vacío y rompen la sensación de cuadro enmarcado. La transición single-phase deja ambas fotos visibles cuando los aspect ratios difieren — defecto que empeora al cambiar el backdrop a no-negro.

**Approach:** Partir `KioskScreen` en `PhotoZone` (78%) + `SidePanel` (22%) con gradiente warm-dark compartido heredado del root. Reescribir el crossfade de `PhotoSlide` en máquina **3-fase**: fade-out 1250ms → **hold 300ms** (solo passe-partout visible — el momento perceptual que vende el rediseño) → fade-in 1250ms. SidePanel vacío hasta Story 7.2.

## Boundaries & Constraints

**Always:**
- Cero crop: `object-fit: contain`, paper overlay, filtros y precarga del bottom layer preservados.
- Pixel shift `±1-2px/3min` al root container (foto + panel derivan juntos).
- Gradiente `linear-gradient(to bottom, #1A1210, #1F1813)` solo en root; PhotoZone/SidePanel heredan sin `backgroundColor` propio.
- YiddishPhrase DENTRO del PhotoZone (coordenadas absolutas relativas al PhotoZone — misma esquina visual).
- NightModeOverlay, GestureDetector, PinEntry, BirthdayCountdown, DateDisplay como hermanos al nivel root.
- Total transición = **2800ms (1250 + 300 + 1250)**.
- Empty state colapsa el split: mensaje centrado full-width sobre gradiente (no dentro del PhotoZone 78%).
- **Cambio de comportamiento documentado:** `getNextIdx(incoming, errored)` ahora se llama al cierre del fade-in (no al inicio). Si `errored` se actualiza durante la transición — onError en bottom — se usa el set más nuevo. Intencional.

**Ask First:**
- Si un AC fuerza tocar `BirthdayCountdown`/`DateDisplay` → HALT (pertenecen a Story 7.2).

**Never:**
- No tocar componentes/tipos/calendar de Stories 7.2–7.4.
- No cambiar la lógica de `getNextIdx`/`errored`/precarga (solo cambia *cuándo* se llama `getNextIdx`).
- No agregar tokens de color ni deps npm.
- No reservar zona reloj.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|---|---|---|---|
| 4 aspect ratios en PhotoZone 1498×1080 | 1.78 / 1.33 / 1.0 / 0.56 | Foto se ajusta a la dimensión limitante; bandas warm-dark restantes (~118/29/209/445px) leen como passe-partout | N/A |
| Transición entre aspect ratios distintos | photos[cur]≠aspect photos[next] | Fase 1 (0-1250ms): top 1→0, bottom 0. Hold (1250-1550ms): ambas 0 — solo gradiente. Fase 3 (1550-2800ms): bottom 0→1, top 0 | Unmount/photos cambia/photos vacío → limpiar todos los timeouts |
| Empty state | photos.length === 0 | Mensaje centrado full-width sobre gradiente (split colapsa) | N/A |
| Error en imagen | onError dispara | `errored` Set se actualiza; `getNextIdx` al final del fade-in salta a la siguiente | Preservado |
| `advance()` reentrante | advance durante phase ≠ idle | No-op (guard ref síncrono + state) | Preservado |
| Unmount mid-transición | KioskScreen unmounta entre 0-2800ms | Todos los timeouts limpiados, sin setState post-unmount | N/A |

</frozen-after-approval>

## Code Map

- `src/screens/KioskScreen.tsx` -- Root con gradiente + flex-row + pixel shift. PhotoSlide + YiddishPhrase dentro de PhotoZone (78%). SidePanel (22%) vacío. Otros overlays al nivel root.
- `src/components/PhotoSlide.tsx` -- `position: fixed` → `absolute; inset: 0`, sin `backgroundColor`. Máquina 3-fase con state `phase` + `phaseRef` síncrono. Empty state centrado al viewport.
- `src/__tests__/components/PhotoSlide.test.tsx` -- **Crear.**

## Tasks & Acceptance

**Execution:**
- [x] `src/components/PhotoSlide.tsx` -- Container y empty state pasan a `position: absolute; inset: 0`, sin `backgroundColor`. Mover `WebkitTapHighlightColor`/`userSelect` al root de KioskScreen.
- [x] `src/components/PhotoSlide.tsx` -- `type Phase = 'idle' | 'fade-out' | 'hold' | 'fade-in'`. Mantener **dos guards en paralelo**: state `phase` (render) y `phaseRef` (síncrono, fuente de verdad para guard). `advance()` (solo si `phaseRef.current === 'idle'` y `photos.length >= 2`): set guards a `'fade-out'`, cadena de timeouts: 1250ms → `'hold'`, +300ms → `'fade-in'`, +1250ms → swap atómico (`setCurIdx(incoming)`, `setNextIdx(getNextIdx(incoming, errored))`, guards a `'idle'`). Limpiar todos los timeouts en: unmount, antes de re-advance, y cuando `photos` cambia identidad o length.
- [x] `src/components/PhotoSlide.tsx` -- Opacidades: top = `phase === 'idle' ? 1 : 0`, bottom = `phase === 'fade-in' ? 1 : 0`. Para evitar fade invertido en el swap, deshabilitar transition por un frame en el tick del swap (transition `'none'` condicional) o forzar remount con `key` prop. **Resto del tiempo, `transition: opacity 1250ms ease-in-out` aplicada siempre a ambas capas** (no condicional por fase).
- [x] `src/screens/KioskScreen.tsx` -- `rootContainerStyle`: agregar `display: 'flex'`, `flexDirection: 'row'`, `background: 'linear-gradient(to bottom, #1A1210, #1F1813)'`, `WebkitTapHighlightColor: 'transparent'`, `userSelect: 'none'`; conservar `inset: -3px`, `overflow: hidden`, pixel shift transform.
- [x] `src/screens/KioskScreen.tsx` -- `<div style={photoZoneStyle}>` (78%, `position: 'relative'`) envolviendo PhotoSlide + YiddishPhrase. `<div style={sidePanelStyle}>` (22%) vacío. Otros overlays como hermanos del flex root.
- [x] `src/__tests__/components/PhotoSlide.test.tsx` -- Crear con fake timers. Tests:
  - **(a) Fade-out (AC de Sally):** en t=0 con phase='fade-out', `getComputedStyle(bottomImg).opacity === '0'` Y top tiene transition activa hacia 0. En t=1249ms, bottom sigue en 0.
  - **(b) Hold visible:** en t=1400ms (mid-hold), top opacity 0 Y bottom opacity 0.
  - **(c) Swap atómico:** post-2800ms, en la misma observación: `top.src === incoming.src` Y `top.opacity === '1'` Y `bottom.opacity === '0'`.
  - **(d) Guard fotos<2:** `advance()` es no-op (phase queda 'idle', no se programan timers).
  - **(e) Cleanup unmount:** monta, dispara advance, unmount en t=500ms, avanza timers — no warnings de React, no setState post-unmount.
  - **(f) Reentrancia:** durante fade-out, `advance()` otra vez → phase no cambia, no se programa segundo set de timers.
- [ ] (pending Ary visual review) `npm run dev`: 4 aspect ratios + transición vertical↔horizontal con hold perceptible + empty state centrado + sin hairline en frontera 78/22 (acercar la cara).

**Acceptance Criteria:**
- Given `KioskScreen`, when renderiza, then root con flex-row + gradiente, PhotoZone (78%) + SidePanel (22%) heredan el gradiente sin línea divisoria visible (sin hairline al acercar la cara a la frontera).
- Given el pixel shift, when pasan 3min, then `translate(±1-2px)` aplica al root, foto + panel derivan juntos.
- Given `PhotoSlide` dentro del PhotoZone, when monta, then `position: absolute; inset: 0`, mantiene contain + overlay + filtros, sin `backgroundColor` propio.
- Given una transición entre aspect ratios distintos, when corre la máquina 3-fase, then las tres fases ocurren en los rangos del I/O matrix; **nunca** ambas capas parcialmente visibles a la vez; el hold es perceptible.
- Given el final del fade-in (t=2800ms), when swap, then índices y opacidades resetean atómicamente en el mismo tick — sin frame intermedio con curIdx nuevo + opacity 0.
- Given `advance()` reentrante, when phase ≠ idle, then no-op (verificado por `phaseRef` síncrono).
- Given `photos.length === 0`, when renderiza, then mensaje centrado full-width sobre gradiente (split colapsa).
- Given KioskScreen unmount mid-transición, when timers disparan, then sin warnings de React ni setState post-unmount.
- Given YiddishPhrase, NightModeOverlay, GestureDetector, PinEntry, BirthdayCountdown, DateDisplay, when activos, then comportamiento intacto (Yiddish en misma esquina visual dentro del PhotoZone; otros como overlay full-screen).
- Given los 159 tests existentes, when `npm run test`, then todos pasan; PhotoSlide.test.tsx agrega sin romper.

## Spec Change Log

### 2026-05-19 — Owner-approved deviation: `objectPosition: 'left center'`

**Triggering finding:** Acceptance auditor (step-04 review) flagged that `objectPosition: 'left center'` was added to `imgBaseStyle` in PhotoSlide. The Epic 7 context spec describes bands "laterales" (plural, both sides) implying symmetric/centered passe-partout — Sally's UX design intent.

**What was amended:** Added this Spec Change Log entry. Code remains with `objectPosition: 'left center'`.

**Known-bad state avoided:** Silent UX drift. The deviation is now traced.

**Owner rationale (Ary, 2026-05-19):** Tested centered on desktop monitor first ("queda mucho mejor" cuando se aplicó left-aligned). Final visual judgment deferred to tablet hardware validation. If on the tablet the symmetric passe-partout reads better, revert is 1 line: remove `objectPosition` from `imgBaseStyle`.

**KEEP:** Owner override of UX-designer decision is allowed when the design intent isn't explicit in the frozen block. Sally's intent ("laterales" → symmetric) lived in the Epic 7 context doc, not in the frozen-after-approval block. Future story owners can override similarly if traced via this log.

**Pending action:** Surface deviation to Sally retrospectively when she next audits Epic 7.

### 2026-05-19 — Hardware-validation fix: linen overlay movido al root (cubre ambas zonas)

**Triggering finding:** Validación visual en hardware (tablet) reveló cambio de color visible en la frontera 78/22 — PhotoZone se veía más cream/clara que SidePanel. Causa: el paper overlay linen 6% estaba aplicado dentro del PhotoSlide (solo tinta PhotoZone), no en SidePanel. Sally explícitamente pidió `paper texture overlay (consistente con la foto zone)` para ambas zonas — me lo pasé por alto.

**What was amended:** El overlay se removió del PhotoSlide y se agregó como `<div style={linenOverlayStyle}>` al root del KioskScreen, entre `sidePanel` y los text overlays. Sin zIndex explícito → orden DOM determina stacking. Tinta PhotoZone + SidePanel uniformemente. DateDisplay / BirthdayCountdown (renderizados después en DOM) no se tintan.

**Known-bad state avoided:** Línea divisoria visible entre PhotoZone y SidePanel cuando la foto deja banda warm-dark a la derecha.

**KEEP:** Cualquier overlay decorativo que deba aplicarse a TODO el frame debe estar a nivel root del KioskScreen, no dentro de PhotoSlide. Si Story 7.2+ agregan overlays similares (texturas, gradientes adicionales), aplicar el mismo patrón.

### 2026-05-19 — Owner-driven UX pivot post-hardware: gradient → pure black

**Triggering finding:** Validación visual en hardware (tablet montada para el contexto regalo). Ary observó que el gradiente warm-dark `#1A1210 → #1F1813` no se "mimetiza" con el bezel negro de la tablet ni con el marco de madera que lo rodea — el warm-dark stand-out como "shadow of the tablet" en vez de "extensión del marco". El mat negro clásico de fotografía + el bezel negro real crean continuidad visual mejor.

**What was amended:** El `background` del `rootContainerStyle` pasó de `linear-gradient(to bottom, #1A1210, #1F1813)` a `'#000000'` (negro puro). Linen overlay 6% sigue activo encima — aporta textura sutil sin agregar warmth perceptible.

**Known-bad state avoided:** Discontinuidad visual entre el contenido del kiosk y el contexto físico del marco. El "passe-partout cálido" que Sally diseñó era válido en abstracto pero no funcionó en el contexto físico real (marco madera + tablet bezel).

**Owner rationale (Ary, 2026-05-19, post-hardware):** "Que sea todo más negro, así las franjas se mimetizan con el borde del tablet."

**KEEP:** Cuando una decisión de UX descansa sobre un contexto físico (display específico, montaje, iluminación), la validación en hardware es autoritativa sobre el spec abstracto. Sally diseñó sin acceso al frame real; Ary ajustó con el frame en mano. Si futuras decisiones de color enfrentan tensión similar (Story 7.5 reloj, ornamentos), priorizar tablet visual sobre browser/spec.

**Pending action:** Surface deviation a Sally retrospectivamente. El epic context y el UX spec siguen documentando los colores originales — actualizar si Sally aprueba el cambio.

### 2026-05-19 — Out-of-scope addition: dev-only `testPhotos` seed in contentStore

**Triggering finding:** Acceptance auditor flagged `src/dev/testPhotos.ts` + `contentStore` modification + `.gitignore` change as unscoped (not in the spec).

**What was amended:** Added this Spec Change Log entry to trace the addition.

**Known-bad state avoided:** Unscoped infrastructure addition without record.

**Owner rationale (Ary, 2026-05-19):** Required for visual manual review step in the spec (`npm run dev` validation of 4 aspect ratios). In dev mode (`import.meta.env.DEV === true`), `contentStore.photos` seeds from 15 Drive photos copied to `public/test-photos/`. Production unaffected (`import.meta.env.DEV` is statically replaced with `false` in `vite build`; testPhotos.ts tree-shaken).

**KEEP:** Dev-only seed pattern is acceptable for visual validation of UI changes when the production data source (Drive sync) doesn't work in browser dev. Constraint: must be DEV-guarded and tree-shake-friendly.

## Verification

**Commands:** `npm run test -- PhotoSlide`, `npm run test`, `npm run lint`, `npm run build`.

**Manual (`npm run dev`):**
- 4 aspect ratios: bandas warm-dark como passe-partout en cada uno.
- Transición vertical↔horizontal: nunca dos fotos a la vez; hold de ~300ms perceptible (el ojo registra "passe-partout completo" entre fotos).
- Frontera 78/22: acercar la cara, gradiente continuo, sin hairline.
- Empty state: mensaje centrado al viewport completo.
- YiddishPhrase visible en esquina inferior izquierda sobre la foto.

## Suggested Review Order

**State machine — corazón de la story (PhotoSlide refactor)**

- Máquina 3-fase con `phaseRef` síncrono + cadena de 3 timeouts; final hace swap atómico.
  [`PhotoSlide.tsx:80`](../../src/components/PhotoSlide.tsx#L80)

- Schedule helper guarda IDs en `timeoutsRef` para cleanup centralizado.
  [`PhotoSlide.tsx:70`](../../src/components/PhotoSlide.tsx#L70)

- Reset effect en `[photos]` limpia timeouts + phase cuando array cambia identidad/length.
  [`PhotoSlide.tsx:52`](../../src/components/PhotoSlide.tsx#L52)

- Opacidades derivadas de phase; transition siempre activa; `key` fuerza remount en swap.
  [`PhotoSlide.tsx:127`](../../src/components/PhotoSlide.tsx#L127)

- `imgBaseStyle` con `object-fit: contain` + `object-position: left center` (ver Spec Change Log).
  [`PhotoSlide.tsx:189`](../../src/components/PhotoSlide.tsx#L189)

- Empty state escapa a viewport con `position: fixed` para centrar full-width.
  [`PhotoSlide.tsx:171`](../../src/components/PhotoSlide.tsx#L171)

**Layout shell (KioskScreen split)**

- Root flex-row + gradiente warm-dark heredado por ambas zonas.
  [`KioskScreen.tsx:22`](../../src/screens/KioskScreen.tsx#L22)

- PhotoZone (78%, position:relative) envuelve PhotoSlide + YiddishPhrase; SidePanel (22%) vacío.
  [`KioskScreen.tsx:121`](../../src/screens/KioskScreen.tsx#L121)

**Dev infrastructure (no afecta producción)**

- `contentStore` seedeado con `testPhotos` solo cuando `import.meta.env.DEV` (tree-shaken en build).
  [`contentStore.ts:26`](../../src/stores/contentStore.ts#L26)

- 15 fotos de Drive copiadas a `public/test-photos/` (gitignored).
  [`testPhotos.ts:1`](../../src/dev/testPhotos.ts#L1)

**Tests**

- 6 tests cubriendo: fade-out bottom=0, hold ambas=0, swap atómico, guard <2 fotos, cleanup unmount, reentrancia.
  [`PhotoSlide.test.tsx:35`](../../src/__tests__/components/PhotoSlide.test.tsx#L35)
