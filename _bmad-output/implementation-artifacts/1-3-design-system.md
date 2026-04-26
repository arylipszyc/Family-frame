# Story 1.3: Design system — tokens de color y tipografía en Tailwind

Status: done

## Story

Como desarrollador,
quiero los tokens del design system configurados en Tailwind y las fuentes cargadas en `index.html`,
para que todos los componentes visuales se construyan con la paleta cálida y la escala kiosk desde el inicio.

## Acceptance Criteria

**AC1 — Colores y tipografía en `tailwind.config.ts`:**
- Colores sólidos: `frame-cream: '#F5F0E8'`, `frame-amber: '#C8956C'`, `frame-sepia: '#8B6F5E'`, `frame-charcoal: '#2C2420'`, `frame-night: '#1A1210'`
- Colores con opacidad: `frame-overlay: 'rgba(28, 18, 12, 0.72)'`, `frame-paper: 'rgba(245, 235, 210, 0.06)'`
- Font families: `kiosk-serif: ['Playfair Display', 'serif']`, `kiosk-sans: ['Inter', 'sans-serif']`

**AC2 — Fuentes cargadas en `index.html`:**
- Hay preload de Playfair Display e Inter desde Google Fonts con `font-display: swap`
- El viewport meta incluye `maximum-scale=1.0, user-scalable=no`

**AC3 — Build limpio:**
- `npm run build` sin errores
- Las clases `text-frame-cream`, `bg-frame-night`, `font-kiosk-serif` compilan sin errores

## Tasks / Subtasks

- [x] Task 1 — Actualizar `tailwind.config.ts` con tokens del design system (AC: 1)
  - [x] 1.1 Agregar paleta de colores `frame-*` en `theme.extend.colors`
  - [x] 1.2 Agregar font families `kiosk-serif` y `kiosk-sans` en `theme.extend.fontFamily`
  - [x] 1.3 Agregar escala tipográfica kiosk en `theme.extend.fontSize`

- [x] Task 2 — Actualizar `index.html` con Google Fonts (AC: 2)
  - [x] 2.1 Agregar `<link rel="preconnect">` para googleapis y gstatic
  - [x] 2.2 Agregar `<link>` de Google Fonts con Playfair Display + Inter + `display=swap`
  - [x] 2.3 Verificar viewport meta (ya tiene `maximum-scale=1.0, user-scalable=no`) ✅

- [x] Task 3 — Validar build (AC: 3)
  - [x] 3.1 `npm run build` ✅ sin errores

## Dev Notes

### Estado actual del proyecto

- `tailwind.config.ts` ya existe con estructura base (creado en Story 1.1):
  ```typescript
  import type { Config } from 'tailwindcss'
  export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: { extend: {} },
    plugins: [],
  } satisfies Config
  ```
- `index.html` ya tiene `maximum-scale=1.0, user-scalable=no` en el viewport ✅ — no duplicar
- Tailwind versión **3.4.x** (no v4) — la config con `theme.extend` y `satisfies Config` es el patrón correcto para v3

---

### Implementación exacta — `tailwind.config.ts`

Reemplazar el bloque `theme.extend: {}` con el siguiente contenido:

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'frame-cream':    '#F5F0E8',
        'frame-amber':    '#C8956C',
        'frame-sepia':    '#8B6F5E',
        'frame-charcoal': '#2C2420',
        'frame-night':    '#1A1210',
        'frame-overlay':  'rgba(28, 18, 12, 0.72)',
        'frame-paper':    'rgba(245, 235, 210, 0.06)',
      },
      fontFamily: {
        'kiosk-serif': ['Playfair Display', 'serif'],
        'kiosk-sans':  ['Inter', 'sans-serif'],
      },
      fontSize: {
        'kiosk-yiddish':        ['clamp(40px, 4vw, 64px)',    { lineHeight: '1.2' }],
        'kiosk-birthday':       ['clamp(28px, 3vw, 42px)',    { lineHeight: '1.3' }],
        'kiosk-date':           ['clamp(22px, 2.5vw, 32px)',  { lineHeight: '1.4' }],
        'kiosk-transliteration':['24px',                       { lineHeight: '1.5' }],
        'welcome-title':        ['64px',                       { lineHeight: '1.1' }],
        'welcome-message':      ['28px',                       { lineHeight: '1.5' }],
        'welcome-prompt':       ['22px',                       { lineHeight: '1.4' }],
      },
    },
  },
  plugins: [],
} satisfies Config
```

**Por qué `[value, { lineHeight }]`:** Tailwind v3 acepta arrays en `fontSize` — primer elemento el tamaño, segundo las propiedades adicionales como `lineHeight`. Esto genera las clases `text-kiosk-yiddish` etc. con `line-height` correcto automáticamente.

**Por qué `rgba()` como string:** En Tailwind v3, `extend.colors` acepta strings CSS directamente. `frame-overlay` y `frame-paper` NO son compatibles con modificadores de opacidad de Tailwind (como `bg-frame-overlay/50`) pero para este proyecto solo se usan con sus valores fijos — correcto para el uso previsto.

---

### Implementación exacta — `index.html`

Agregar en el `<head>`, **antes** del `</head>`:

```html
<!-- Google Fonts preconnect -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<!-- Playfair Display 400,700 + Inter 300,400,500 -->
<link
  href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500&display=swap"
  rel="stylesheet"
/>
```

**Notas:**
- `preconnect` a `fonts.gstatic.com` con `crossorigin` es el patrón oficial de Google Fonts — mejora rendimiento de carga
- `display=swap` en la URL equivale a `font-display: swap` en el CSS generado por Google
- Pesos elegidos: Playfair 400 (body Yiddish) + 700 (títulos welcome); Inter 300 (fecha/transliteración) + 400 (general) + 500 (cumpleaños emphasis)

**Estado actual del viewport en `index.html`:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```
✅ Ya correcto — no modificar.

---

### Clases generadas — resumen

Tras la implementación, estarán disponibles:

| Token | Clase Tailwind | Uso previsto |
|-------|---------------|--------------|
| `frame-night` | `bg-frame-night` | Background KioskScreen + WelcomeScreen |
| `frame-cream` | `text-frame-cream` | Texto principal KioskScreen |
| `frame-amber` | `text-frame-amber` | Acentos, cumpleaños |
| `frame-sepia` | `text-frame-sepia` | Transliteración, texto secundario |
| `frame-charcoal` | `text-frame-charcoal` | Texto AdminScreen |
| `frame-overlay` | `bg-frame-overlay` | Overlay oscuro sobre fotos |
| `frame-paper` | `bg-frame-paper` | Overlay sutil "papel" sobre fotos |
| `kiosk-serif` | `font-kiosk-serif` | Playfair Display — frases Yiddish, títulos |
| `kiosk-sans` | `font-kiosk-sans` | Inter — fecha, cumpleaños, admin |
| `kiosk-yiddish` | `text-kiosk-yiddish` | Texto Yiddish clamp(40,4vw,64px) |
| `kiosk-birthday` | `text-kiosk-birthday` | Cumpleaños clamp(28,3vw,42px) |
| `kiosk-date` | `text-kiosk-date` | Fecha clamp(22,2.5vw,32px) |
| `kiosk-transliteration` | `text-kiosk-transliteration` | Transliteración 24px |
| `welcome-title` | `text-welcome-title` | Título WelcomeScreen 64px |
| `welcome-message` | `text-welcome-message` | Mensaje bienvenida 28px |
| `welcome-prompt` | `text-welcome-prompt` | Prompt acción 22px |

---

### Scope: qué NO entra en esta story

- NO crear componentes React (Story 2.x)
- NO crear stores Zustand (Story 1.4)
- NO usar los tokens en componentes todavía — solo definirlos
- NO modificar `App.tsx` — sigue con inline styles placeholder de Story 1.1
- NO crear archivos `.css` de Tailwind — el CLI de Tailwind vía PostCSS lo maneja automáticamente
- NO agregar plugins de Tailwind (typography, forms, etc.)

---

### Learnings de Stories anteriores

- Proyecto en `C:/dev/bmad-workspace/family-frame/`
- TypeScript strict mode activo — `tailwind.config.ts` usa `satisfies Config` (no `as Config`)
- `npx tsc --noEmit` verifica solo archivos bajo `src/` — `tailwind.config.ts` es chequeado por `tsconfig.node.json`
- Exports nombrados siempre — no aplica a config files (default export es correcto para Tailwind)
- `src/types/` y `src/data/` ya tienen contenido de Story 1.2
- `resolveJsonModule: true` ya está en `tsconfig.app.json` (patch de Story 1.2)

---

### References

- [Source: epics.md#Story 1.3] — ACs completos
- [Source: epics.md#UX-DR1] — Paleta "Hogar cálido" con todos los valores hex
- [Source: epics.md#UX-DR2] — Fuentes: Playfair Display + Inter
- [Source: epics.md#UX-DR3] — Escala tipográfica con clamp()
- [Source: architecture.md#Frontend Architecture] — Tailwind CSS para high-contrast, tipografía grande

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_ninguno — implementación directa sin obstáculos_

### Completion Notes List

- ✅ AC1: `tailwind.config.ts` actualizado con 7 colores `frame-*` (5 sólidos + 2 rgba), 2 fontFamilies (`kiosk-serif`, `kiosk-sans`) y 7 tokens de fontSize con `clamp()` para escala kiosk.
- ✅ AC2: `index.html` — preconnect a googleapis y gstatic + link Google Fonts con Playfair Display (400,700) + Inter (300,400,500) + `display=swap`. Viewport meta ya tenía `maximum-scale=1.0, user-scalable=no` desde Story 1.1.
- ✅ AC3: `npm run build` ✅ (29 módulos, CSS 4.79 kB). `npx tsc --noEmit` ✅ limpio.
- Nota: Los tokens CSS no aparecen en el bundle aún (Tailwind v3 purga no-usados) — se materializarán cuando los componentes de Story 2.x los referencien.

### File List

- `tailwind.config.ts`
- `index.html`

## Code Review Record

### Review Summary

**0 patches · 2 deferred · 19 dismissed.** Revisión limpia.

### Deferred Items

1. **Google Fonts depende de red — violación offline-first**: En primer boot sin WiFi o tras reboot sin conexión, las fuentes no cargan y fallback serif/sans-serif reemplaza Playfair/Inter. Solución correcta: self-hosting en `public/fonts/`. Scope: Story 6 (autonomía) o hardening pre-APK final.

2. **Tailwind content glob sin `.json`**: Si un componente construye class names dinámicamente desde `yiddish.json` o `birthdays.default.json`, esas clases serán purgadas. Solución: agregar `"./src/**/*.json"` a `content[]` cuando ese patrón se use. Scope: bajo demanda.

### Dismissed Findings (19)

- `rgba()` tokens: por diseño — overlays fija opacidad, base utility genera CSS válido
- Fixed px sizes (welcome-*): por spec UX-DR3
- `maximum-scale=1.0`: kiosk app, intencional
- `lang="es"` + Yiddish: preexistente desde Story 1.1
- Sin darkMode strategy: kiosk siempre oscuro
- Alineación con espacios: estilo intencional
- `plugins: []`: boilerplate estándar
- Sin meta description/favicon: app nativa
- Sin dns-prefetch: Android 14, preconnect suficiente
- CSP para fuentes externas: ya en deferred-work.md Story 1.1
- `clamp()` Android 7: target Android 14
- Sin viewport-fit=cover: tablet sin notch
- AndroidManifest RECEIVE_BOOT_COMPLETED: ya en deferred-work.md
- vite.config.ts sin base './': Capacitor usa capacitor://localhost
- font-display swap layout shift: absorbido por defer Google Fonts
- tailwind.config.ts + jiti: PostCSS plugin maneja .ts sin jiti
- `<link rel="preload">`: AC dice "carga proactiva", no el atributo HTML
- font-display via URL param: patrón oficial Google Fonts v2
- AC3 clases no en bundle: Tailwind v3 purga no-usados, correcto
