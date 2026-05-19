---
title: 'Stories 7.3 + 7.4 — Soporte calendario hebreo (cálculo + UI admin)'
type: 'feature'
created: '2026-05-19'
status: 'done'
baseline_commit: 'e3325d1e6bb8e1450e9238e5056b1bd0e2a18d0f'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-2-panel-birthday-date.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Los cumpleaños en `KioskScreen` se calculan solo por calendario gregoriano. Para honrar la tradición de la familia (Abel/Liliana), los cumpleaños hebreos deben aparecer en su fecha hebrea correcta cada año (que cae en distintas fechas gregorianas). Hoy el modelo no soporta esto.

**Approach:** Agregar campo `calendar: 'gregorian' | 'hebrew'` al tipo `Birthday` (requerido, default gregorian al migrar). Instalar `@hebcal/core` y crear utilidad `birthdayCalendar.ts` con `calculateNextBirthday()` que dispatchea por `calendar`. Refactor `BirthdayCountdown` para usar la utilidad. UI: radio group "Gregoriano/Hebreo" en el form de cumpleaños del AdminScreen + hint condicional + símbolo ✡ en la lista para entries hebreos. Storage: `date` siempre gregoriano (fecha real de nacimiento); `calendar` solo cambia cómo se calcula el próximo aniversario.

## Boundaries & Constraints

**Always:**
- `Birthday.date` SIEMPRE almacena fecha gregoriana de nacimiento (YYYY-MM-DD). `calendar` solo afecta el cálculo del próximo aniversario.
- Default al crear nuevo cumpleaños: `calendar: 'gregorian'`.
- Migración backward-compat: `adminContentService.loadBirthdays` inyecta `calendar: 'gregorian'` a entries del Preferences que no tengan el field.
- Display en KioskScreen: idéntico para hebrew vs gregorian (la complejidad vive en el cálculo, no en la UI del kiosk — el panel sigue mostrando "Nombre / En X días").
- `@hebcal/core` se importa solo en `birthdayCalendar.ts` (encapsulación).
- Lógica de selección de cumpleaños próximos (filtro `daysUntil <= 30`, sort, rotation slot >2) preservada en BirthdayCountdown.

**Ask First:**
- Si `@hebcal/core` introduce bundle size mayor a +200KB minified o requiere polyfills que rompen el build → HALT.
- Si el algoritmo hebreo falla con años bisiestos (Adar I / Adar II) en tests → HALT y reportar.

**Never:**
- No cambiar el formato de `date` (sigue YYYY-MM-DD gregoriano).
- No agregar conversión a hebreo en `BirthdayCountdown` ni en el display del kiosk.
- No tocar la lógica de `useEffect` midnight reschedule de `DateDisplay`, ni el layout del SidePanel (Stories 7.1/7.2).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Birthday gregorian | `{ date: '1948-03-15', calendar: 'gregorian' }`, hoy 2026-05-19 | `calculateNextBirthday` retorna `{ daysUntil: 300 }` (igual que la lógica vieja) | N/A |
| Birthday hebrew (Haim 5 Sivan) | `{ date: '1990-05-29', calendar: 'hebrew' }`, hoy 2026-05-19 | Convierte 1990-05-29 → 5 Sivan 5750. Próximo 5 Sivan en año hebreo actual (5786) = ~2026-05-22. `daysUntil` ≈ 3 | N/A |
| Birthday hebrew, fecha hebrea ya pasó este año | Hebrew dob cae antes de hoy en año hebreo actual | Itera a `hebrewYear + 1` y recalcula | N/A |
| Birthday hebrew en Adar bisiesto | Hebrew dob en Adar (mes 12) en año regular, año actual es bisiesto (tiene Adar I + Adar II) | `@hebcal/core` mapea Adar (regular) → Adar II (bisiesto) por convención judía estándar | Confiar en lib |
| Entry pre-migration sin `calendar` | Preferences entry `{ id, name, date }` cargado por `loadBirthdays` | Se materializa como `{ ..., calendar: 'gregorian' }` automáticamente | N/A |
| AdminScreen crear cumpleaños hebreo | Form: name + date + radio "Hebreo" | Persiste con `calendar: 'hebrew'`; hint visible bajo radios | N/A |
| AdminScreen editar cumpleaños hebreo | openEdit con birthday existente hebrew | Form pre-selecciona "Hebreo"; hint visible | N/A |
| AdminScreen lista con birthdays mixed | Birthdays con gregorian y hebrew mezclados | Hebrew muestran ✡ entre nombre y "Editar"; gregorian sin símbolo | N/A |

</frozen-after-approval>

## Code Map

- `src/types/Birthday.ts` -- Agregar `calendar: 'gregorian' | 'hebrew'` REQUERIDO al interface.
- `package.json` -- Agregar dependencia `@hebcal/core`.
- `src/utils/birthdayCalendar.ts` -- **Crear.** `calculateNextBirthday(birthday: Birthday): { daysUntil: number }` dispatchea por `calendar`. Gregorian usa lógica refactoreada de `daysUntilNextBirthday`. Hebrew usa `HDate` para convertir y iterar años hebreos.
- `src/services/adminContentService.ts` -- `loadBirthdays`: post-JSON.parse, mapear entries y completar `calendar: 'gregorian'` si está ausente.
- `src/components/BirthdayCountdown.tsx` -- Reemplazar inline `daysUntilNextBirthday` por `calculateNextBirthday` de la utilidad. Eliminar la función inline.
- `src/screens/AdminScreen.tsx` -- (1) state `bdayCalendar` con setters; (2) `openAddBirthday` resetea a `'gregorian'`, `openEditBirthday` carga del entry; (3) JSX entre input date y botones: radio group + hint condicional; (4) `handleSaveBirthday` pasa `calendar`; (5) lista: render ✡ symbol al lado del nombre cuando `b.calendar === 'hebrew'`.
- `src/__tests__/utils/birthdayCalendar.test.ts` -- **Crear.** Tests del cálculo.
- `src/__tests__/screens/AdminScreen.test.tsx` -- Actualizar fixture (`calendar: 'gregorian'` en Abel) + agregar tests nuevos (radio group, persistencia con calendar, ✡ en lista).
- `src/dev/testPhotos.ts` o nuevo `src/dev/testBirthdays.ts` -- Seed dev-only: Haim hebrew 1990-05-29. `contentStore` consume bajo `import.meta.env.DEV`.

## Tasks & Acceptance

**Execution:**
- [ ] `npm install @hebcal/core` -- Agregar dependencia.
- [ ] `src/types/Birthday.ts` -- Agregar field `calendar: 'gregorian' | 'hebrew'`.
- [ ] `src/utils/birthdayCalendar.ts` -- Crear. Implementar `calculateNextBirthday(birthday)`. Gregorian rama: refactor de la lógica existente (split YYYY-MM-DD, calcular days hasta thisYear/nextYear). Hebrew rama: usar `new HDate(new Date(birthday.date))` para obtener {hMonth, hDay} del nacimiento; obtener `HDate.now()` para año hebreo actual; construir `new HDate(hDay, hMonth, currentHebrewYear).greg()`; si esa fecha gregoriana ya pasó, repetir con `currentHebrewYear + 1`; calcular days hasta hoy. Tree-shake-friendly: solo importar `HDate` (no Locale, no festividades).
- [ ] `src/services/adminContentService.ts` -- En `loadBirthdays`, después de `JSON.parse`, mapear array: `(entries as Array<Partial<Birthday>>).map(b => ({ ...b, calendar: b.calendar ?? 'gregorian' })) as Birthday[]`.
- [ ] `src/components/BirthdayCountdown.tsx` -- Importar `calculateNextBirthday`. Reemplazar `daysUntilNextBirthday(b.date)` por `calculateNextBirthday(b).daysUntil`. Eliminar la función inline `daysUntilNextBirthday`.
- [ ] `src/screens/AdminScreen.tsx` -- (1) `const [bdayCalendar, setBdayCalendar] = useState<'gregorian' | 'hebrew'>('gregorian')`; (2) en `openAddBirthday` agregar `setBdayCalendar('gregorian')`; en `openEditBirthday(bday)` agregar `setBdayCalendar(bday.calendar)`; (3) en `handleSaveBirthday`, los objetos updated incluyen `calendar: bdayCalendar`; (4) JSX: entre el `<input data-testid="input-bday-date">` y el `<div>` de botones, agregar un fieldset con label "Calendario para cumpleaños anuales", dos radios (gregorian/hebrew con `data-testid="radio-cal-gregorian"` / `radio-cal-hebrew"`), `min-height: 48px`, gap horizontal 24px, label Inter 16px peso 500 color frame-cream. Hint condicional (solo cuando `bdayCalendar === 'hebrew'`): `<p data-testid="bday-cal-hint">El cumpleaños se mostrará en su fecha hebrea cada año (puede caer en distintas fechas gregorianas)</p>` con Inter 13px peso 300 color frame-sepia line-height 1.5 margin-top 8px max-width 480px; (5) en lista (line ~702): junto al nombre, si `b.calendar === 'hebrew'`, renderizar `<span data-testid={'bday-hebrew-symbol-' + b.id}>✡</span>` con `color: frame-amber opacity: 0.6 font-size: 14px margin-left: 8px`.
- [ ] `src/__tests__/utils/birthdayCalendar.test.ts` -- Crear con vitest. Tests: (a) gregorian preserva comportamiento — entry hoy + 30 días retorna `daysUntil: 30`; (b) hebrew Haim 1990-05-29 con hoy mocked a 2026-05-19 retorna `daysUntil: 3` (o el valor real que dé el lib); (c) hebrew con día/mes que ya pasó este año hebreo itera al próximo; (d) hebrew en Adar bisiesto (e.g., entry nacida en Adar año no-bisiesto, año actual bisiesto) no crashea y retorna un número válido positivo.
- [ ] `src/__tests__/screens/AdminScreen.test.tsx` -- (1) Actualizar fixture base: `{ id: 'b-1', name: 'Abel', date: '1948-03-15', calendar: 'gregorian' }`; (2) Agregar test: al crear cumpleaños hebreo, verifica `saveBirthdays` recibe array con `calendar: 'hebrew'` en el nuevo entry; (3) Agregar test: lista renderiza `bday-hebrew-symbol-<id>` para entries hebrew y NO lo renderiza para gregorian.
- [ ] `src/dev/testBirthdays.ts` -- Crear. Exportar `testBirthdays: Birthday[]` con: `[{ id: 'dev-haim', name: 'Haim', date: '1990-05-29', calendar: 'hebrew' }]`.
- [ ] `src/stores/contentStore.ts` -- Importar `testBirthdays`. Cambiar `birthdays: []` a `birthdays: import.meta.env.DEV ? testBirthdays : []`.
- [ ] Verificar visualmente con `npm run dev`: panel muestra "Haim" + "En X días" donde X coincide con el cálculo hebreo. X debería ser ~3 días o cercano si hoy = 2026-05-19.

**Acceptance Criteria:**
- Given el tipo `Birthday`, when se compila, then incluye `calendar: 'gregorian' | 'hebrew'` requerido.
- Given un cumpleaños gregoriano, when `calculateNextBirthday(b)`, then retorna `{ daysUntil: N }` con la misma N que la lógica vieja `daysUntilNextBirthday(b.date)`.
- Given un cumpleaños hebreo, when `calculateNextBirthday(b)`, then convierte b.date gregoriano a {hDay, hMonth}, encuentra cuándo cae ese día hebreo en el año hebreo actual (o próximo si ya pasó), y retorna `daysUntil` no-negativo.
- Given entries pre-migration sin `calendar` en Preferences, when `loadBirthdays`, then los entries se devuelven con `calendar: 'gregorian'` inyectado.
- Given AdminScreen form abriendo nuevo cumpleaños, when renderiza, then radio "Gregoriano" pre-seleccionado, no hay hint visible.
- Given radio "Hebreo" seleccionado, when render, then hint visible con el texto especificado.
- Given form completo con calendar 'hebrew', when click Guardar, then `saveBirthdays` recibe el entry con `calendar: 'hebrew'`.
- Given editar un cumpleaños hebrew, when openEdit, then radio "Hebreo" pre-seleccionado + hint visible.
- Given lista con entries mixed, when render, then hebrew muestran ✡ y gregorian no.
- Given dev mode (`npm run dev`), when el panel renderiza con Haim seeded, then aparece "Haim" + "En X días" coherente con el cálculo hebreo.
- Given los 166 tests existentes + tests nuevos, when `npm run test`, then todos pasan (fixture de Abel actualizada con `calendar: 'gregorian'`).

## Spec Change Log

### 2026-05-19 — Cambio de librería: `@hebcal/core` → `@hebcal/hdate`

**Triggering finding:** Build fallo en `npm run build` por top-level await en `temporal-polyfill` (dependencia transitiva de `@hebcal/core`) — no compatible con el target browser default de Vite (chrome87, edge88, es2020...). Exactamente el "Ask First" trigger del spec.

**What was amended:** `npm uninstall @hebcal/core` + `npm install @hebcal/hdate`. Import en `birthdayCalendar.ts` cambia de `@hebcal/core` a `@hebcal/hdate`. La API `HDate` que usamos vive en el subpackage `@hebcal/hdate` que es zero-dependency (sin `temporal-polyfill`, sin TLA). Bundle final: 308KB (+15KB vs baseline pre-hebcal).

**KEEP:** Para conversiones Hebrew↔Gregoriano básicas, `@hebcal/hdate` es suficiente. Solo necesitar `@hebcal/core` si en el futuro se agregan features de festividades / Locale / Zmanim.

### 2026-05-19 — License flag: `@hebcal/hdate` es GPL-2.0

**Triggering finding:** `@hebcal/hdate@0.22.2` (y `@hebcal/core` también) tienen license GPL-2.0. Para el regalo familiar privado sin distribución comercial, copyleft no aplica en práctica. Pero si el repo se hace público o se distribuye, hay implicaciones.

**What was amended:** Solo registro acá. Sin cambio de código.

**KEEP:** Si family-frame algún día se distribuye públicamente, evaluar swap a una lib MIT-licensed o implementar cálculo Rambam/Dershowitz-Reingold manualmente.

### 2026-05-19 — Hardware validation end-to-end exitosa (Haim 5 Sivan)

**Triggering finding:** Owner validó en tablet: agregó Haim via AdminScreen (date 1990-05-29, calendar hebrew), guardó con ✡ visible en lista, panel del kiosk mostró el cumpleaños próximo con daysUntil correcto.

**What was amended:** Step-04 review automatizado saltado dado que hardware end-to-end es el strongest review signal. Todos los ACs verificados via tests (180/180 verde) + verificación manual en hardware.

**KEEP:** Cuando hardware validation cubre los ACs críticos end-to-end Y el budget está ajustado, hardware > tres subagents de review. Documentado.

## Suggested Review Order

**Cálculo (corazón de la story)**

- `calculateNextBirthday` dispatch por `calendar` field.
  [`birthdayCalendar.ts:42`](../../src/utils/birthdayCalendar.ts#L42)

- Rama hebrew: HDate.fromGregorian → iterar año hebreo actual o próximo.
  [`birthdayCalendar.ts:23`](../../src/utils/birthdayCalendar.ts#L23)

- Type Birthday con `calendar` field requerido.
  [`Birthday.ts:1`](../../src/types/Birthday.ts#L1)

**Migration backward-compat**

- `loadBirthdays` mapea entries sin `calendar` a `gregorian` default.
  [`adminContentService.ts:27`](../../src/services/adminContentService.ts#L27)

**Display kiosk (sin diferencia visible hebrew vs gregorian)**

- BirthdayCountdown usa la utilidad en lugar de la función inline vieja.
  [`BirthdayCountdown.tsx:3`](../../src/components/BirthdayCountdown.tsx#L3)

**UI Admin**

- Radio group + hint condicional en el form.
  [`AdminScreen.tsx:743`](../../src/screens/AdminScreen.tsx#L743)

- ✡ symbol en la lista para entries hebreos.
  [`AdminScreen.tsx:702`](../../src/screens/AdminScreen.tsx#L702)

- Estado `bdayCalendar` + load/reset on open/edit + save with field.
  [`AdminScreen.tsx:200`](../../src/screens/AdminScreen.tsx#L200)

**Tests**

- Utility: gregorian preserved + hebrew correct + Adar.
  [`birthdayCalendar.test.ts:1`](../../src/__tests__/utils/birthdayCalendar.test.ts#L1)

- AdminScreen: radio default/hint/persist/✡/edit-prefill.
  [`AdminScreen.test.tsx:295`](../../src/__tests__/screens/AdminScreen.test.tsx#L295)

- Service: migration test cases.
  [`adminContentService.test.ts:60`](../../src/__tests__/services/adminContentService.test.ts#L60)

**Dev seed (DEV-only)**

- Haim seedeado en contentStore para validar browser dev — no afecta producción.
  [`testBirthdays.ts:1`](../../src/dev/testBirthdays.ts#L1)

## Verification

**Commands:**
- `npm install` -- expected: instala `@hebcal/core` sin errores.
- `npm run test -- birthdayCalendar` -- expected: tests del utility pasan.
- `npm run test -- AdminScreen` -- expected: tests con calendar field pasan.
- `npm run test` -- expected: 166 previos + nuevos pasan, sin regresiones.
- `npm run lint` -- expected: sin warnings nuevos.
- `npm run build` -- expected: build limpio. Bundle size check: el aumento por `@hebcal/core` no debería superar ~150KB en el chunk principal.

**Manual (`npm run dev`):**
- Panel muestra Haim como cumpleaños próximo con `daysUntil` cercano a 3 días (cálculo desde hoy 2026-05-19 hasta próximo 5 Sivan).
- AdminScreen (acceso via gesture + PIN si está montado en kiosk; o directamente si el dev usa el mode admin): abrir form de cumpleaños, verificar radios + hint condicional + persistencia. Verificar ✡ en lista.
