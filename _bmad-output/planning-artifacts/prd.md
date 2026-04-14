---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
completedAt: '2026-04-12'
inputDocuments: []
workflowType: 'prd'
hardwareReference: 'Tablet Android 14" abierta (YUSUNOUL o similar) + marco de madera artesanal. Descartados: E-ink (deadline), Kodak RCF-1561P (sistema cerrado), Everblog (bloqueado por defecto)'
classification:
  projectType: 'Android Kiosk App (WebView como APK)'
  domain: 'Consumer / Family & Personal'
  complexity: 'medium'
  projectContext: 'greenfield'
---

# Product Requirements Document — family-frame

**Author:** Ary
**Date:** 2026-04-12
**Deadline:** 12 de mayo de 2026

---

## Executive Summary

**family-frame** es una aplicación kiosk para Android que convierte una tablet de 14" en un marco familiar inteligente, diseñado como regalo de 50° aniversario de bodas de Abel y Liliana. Mantiene a los homenajeados emocionalmente conectados con su familia de forma pasiva y continua: fotos familiares sincronizadas automáticamente, frases en Yiddish que cambian diariamente, cuenta regresiva a cumpleaños próximos, y mensajes personales de los hijos.

El primer encendido activa una experiencia emocional única: una foto de los hermanos con un mensaje personal escrito especialmente para la ocasión, que aparece una sola vez antes de entrar al modo normal. Ese es el regalo real.

El producto opera sin interacción de los usuarios finales. El contenido es gestionado por Ary y los hermanos desde sus propios dispositivos.

### Lo que lo hace especial

La mayoría de los marcos digitales muestran fotos. **family-frame** habla. Le dice a Abel y Liliana cada día algo en el idioma de sus raíces, les recuerda que el cumpleaños de un nieto se acerca, y les muestra las caras de las personas que más quieren. No es un electrodoméstico — es un miembro de la familia que siempre está presente.

### Usuarios

- **Usuarios pasivos:** Abel y Liliana — adultos mayores (~70-80 años). UI con fuentes grandes y alto contraste. No interactúan con el dispositivo.
- **Usuarios activos:** Ary y los hermanos — agregan fotos vía álbum compartido de Google Photos, configuran fechas y mensajes en el setup inicial.

### Modelo de contenido

| Contenido | Gestión |
|-----------|---------|
| Fotos | Álbum compartido Google Photos — sync automático por WiFi |
| Frases en Yiddish | Banco local bundleado — rotación diaria |
| Cumpleaños / fechas | Lista local — editable desde pantalla admin |
| Mensaje primer encendido | One-shot, configurable desde admin |

### Plataforma

Tablet Android 14" (YUSUNOUL o similar) con Google Play, montada en marco de madera artesanal. Cuenta Google Workspace de Abel administrada por Ary. Funciona completamente offline — WiFi necesario solo para sincronización de fotos nuevas.

---

## Clasificación del Proyecto

- **Tipo:** Android Kiosk App (WebView empaquetada como APK)
- **Dominio:** Consumer / Personal & Family
- **Complejidad:** Media — greenfield
- **Hardware:** Tablet YUSUNOUL 14" Android 14, Google Workspace, Google Photos API
- **Arquitectura base:** Contenido local + sincronización Google Photos API

---

## Success Criteria

### User Success

- Abel y Liliana ubican el marco en un lugar visible del hogar y lo observan diariamente
- El primer encendido genera una reacción emocional genuina — el mensaje y foto de los hijos impacta en el momento del regalo
- El marco opera de forma completamente autónoma: sin que nadie lo configure, actualice ni intervenga
- Si ocurre un problema, Abel y Liliana pueden resolverlo solos desenchufando y volviendo a enchufar

### Technical Success

- Operación autónoma por 6 meses sin intervención técnica
- Recuperación automática ante caída de WiFi — el marco sigue mostrando contenido cacheado
- Reinicio desde el enchufe restaura el funcionamiento normal sin configuración adicional
- Sincronización de fotos nuevas ocurre automáticamente al reconectar WiFi

### Measurable Outcomes

- Día del aniversario: el marco funciona, el momento emocional del primer encendido ocurre
- Semana 1: fotos, frases en Yiddish y cumpleaños próximos visibles sin intervención
- Mes 6: el marco sigue funcionando sin intervención técnica de Ary

---

## User Journeys

### Journey 1 — Primer encendido (el momento del regalo)

Es el 12 de mayo. Los hijos le dan el paquete a Abel y Liliana. Adentro hay una tablet enmarcada en madera. Ary la enchufa. La pantalla enciende.

Antes de que aparezca cualquier foto, la pantalla muestra una imagen: los hijos juntos, sonriendo. Abajo, un mensaje escrito especialmente para ellos. Liliana toma la mano de Abel. Nadie dice nada por un momento.

Después, el marco pasa solo al modo normal. Las fotos de la familia empiezan a rotar. Aparece una frase en Yiddish. Abajo dice: "En 3 días: cumpleaños de Sofía."

**Capabilities:** Lógica one-shot de primer encendido, pantalla de bienvenida con foto + texto, transición automática al modo normal.

### Journey 2 — Uso cotidiano (6 meses después)

Es un martes. Abel toma el café mirando el marco. La frase de hoy dice algo en Yiddish que le recuerda a su madre. Llama a Ary para contárselo.

Tres días después, el WiFi del edificio se cortó por mantenimiento. El marco sigue mostrando fotos y frases con el caché local. Cuando vuelve el WiFi, sincroniza automáticamente las fotos nuevas que los hijos subieron.

**Capabilities:** Modo offline con caché, sincronización automática al reconectar, rotación de fotos desde Google Photos.

### Journey 3 — Setup inicial (Ary, antes del regalo)

Ary configura la tablet con la cuenta Workspace de su papá. Instala la app. Carga las fotos iniciales al álbum de Google Photos. Escribe el mensaje de primer encendido. Agrega los cumpleaños de la familia. Revisa que todo se vea bien.

Llama a un hermano: "¿Podés subir 5 fotos al álbum?" El hermano lo hace desde su celular en 3 minutos.

El día del aniversario, Ary entrega el marco ya configurado, enchufado y listo.

**Capabilities:** Config inicial (fechas, mensaje, banco Yiddish), álbum Google Photos, modo kiosk auto-start.

### Journey 4 — Problema técnico (Abel)

Un domingo el marco muestra una pantalla negra. Abel lo desenchufa y lo vuelve a enchufar. En 30 segundos vuelve a funcionar normalmente.

**Capabilities:** Auto-inicio al encender, recuperación stateless desde reinicio, sin wizard de configuración post-reinicio.

---

## Requisitos Técnicos de Plataforma

### Arquitectura

- **Tipo:** WebView empaquetada como APK — permite desarrollo web + distribución como app Android
- **Orientación:** Landscape preferida — a confirmar en diseño UX
- **Kiosk mode:** Android Screen Pinning o launcher dedicado
- **Auto-start:** BOOT_COMPLETED broadcast receiver
- **Updates:** Manuales — Ary visita el dispositivo cuando es necesario

### Permisos Android

| Permiso | Motivo |
|---------|--------|
| `INTERNET` | Sync Google Photos |
| `RECEIVE_BOOT_COMPLETED` | Auto-inicio al encender |
| `READ_EXTERNAL_STORAGE` | Acceso a fotos cacheadas |
| `WAKE_LOCK` | Mantener pantalla activa |

### Interfaz de Administración

Accesible mediante gesto oculto (ej: 5 taps en esquina de pantalla) + PIN conocido solo por Ary. Funciones: editar mensaje de primer encendido, gestionar banco Yiddish, gestionar cumpleaños, forzar sync, reiniciar app.

### Consideraciones Clave de Implementación

- Contenido completamente cacheado — opera offline indefinidamente
- Token OAuth Google Photos persistente — debe sobrevivir reinicios (Android Keystore)
- WAKE_LOCK activo — pantalla nunca se apaga durante operación normal
- Sin notificaciones, sonidos ni popups del sistema

---

## Scoping & Roadmap

### MVP — Fase 1 (12 de mayo de 2026)

**Filosofía:** Experience MVP — entregar una experiencia emocional completa el día del aniversario.
**Recursos:** 1 desarrollador, ~3-4 semanas de desarrollo + 1 semana de testing y setup.

**Capacidades esenciales:**
- Pantalla de primer encendido (foto + mensaje, one-shot)
- Rotación de fotos desde álbum Google Photos
- Frases en Yiddish — banco local, rotación diaria
- Cumpleaños próximos en formato simple ("En 5 días: cumpleaños de Sofía")
- Fecha del día
- Modo kiosk con auto-start
- Pantalla admin con PIN
- Funcionamiento offline con caché

### Fase 2 — Post aniversario

- Canal de mensajes familiares: hermanos envían mensajes que aparecen en pantalla
- App o web simple para enviar mensajes desde el celular

### Fase 3 — Visión

- Calendario personal con recordatorios para Abel y Liliana
- Creación de eventos por voz o app simple

### Riesgos y Mitigación

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Token OAuth Google Photos expira | Media | Refresh token persistente; testear antes del regalo |
| Salida accidental del kiosk | Baja | Screen Pinning + botones físicos deshabilitados |
| Deadline incumplible | Media | Prioridad absoluta: primer encendido debe funcionar sí o sí |
| Tablet con specs infladas | Baja | Testear performance en dispositivo real antes de entrega |

---

## Functional Requirements

### Experiencia de Primer Encendido

- **FR1:** El sistema puede detectar si es la primera vez que se ejecuta y mostrar la pantalla de bienvenida antes que cualquier otro contenido
- **FR2:** El administrador puede configurar la foto y el texto del mensaje de primer encendido
- **FR3:** El sistema puede marcar el primer encendido como completado para no volver a mostrarlo
- **FR4:** El administrador puede resetear el estado del primer encendido desde la pantalla admin

### Visualización de Contenido

- **FR5:** El sistema puede mostrar fotos familiares en rotación automática y continua
- **FR6:** El sistema puede mostrar una frase en Yiddish diferente cada día
- **FR7:** El sistema puede mostrar la fecha del día actual
- **FR8:** El sistema puede mostrar los cumpleaños próximos con indicación de cuántos días faltan
- **FR9:** El sistema puede mostrar múltiples cumpleaños próximos simultáneamente
- **FR10:** El sistema puede operar en modo pantalla completa sin elementos del sistema operativo visibles

### Gestión de Fotos

- **FR11:** El sistema puede sincronizar fotos desde un álbum compartido de Google Photos
- **FR12:** El sistema puede cachear fotos localmente para operar sin conexión
- **FR13:** El sistema puede detectar fotos nuevas en el álbum y agregarlas al caché automáticamente al reconectar WiFi
- **FR14:** Los usuarios activos pueden agregar fotos al álbum compartido desde sus propios dispositivos

### Gestión de Contenido — Admin

- **FR15:** El administrador puede acceder a la pantalla admin mediante gesto oculto protegido con PIN
- **FR16:** El administrador puede agregar, editar y eliminar frases del banco Yiddish
- **FR17:** El administrador puede agregar, editar y eliminar fechas de cumpleaños con nombres asociados
- **FR18:** El administrador puede editar el texto y foto del mensaje de primer encendido
- **FR19:** El administrador puede forzar sincronización manual de fotos desde Google Photos
- **FR20:** El administrador puede reiniciar la aplicación desde la pantalla admin

### Modo Kiosk y Operación Autónoma

- **FR21:** El sistema puede iniciarse automáticamente al encender el dispositivo
- **FR22:** El sistema puede prevenir que usuarios pasivos salgan de la aplicación accidentalmente
- **FR23:** El sistema puede mantener la pantalla encendida de forma continua
- **FR24:** El sistema puede recuperar su estado normal tras un reinicio sin configuración adicional
- **FR25:** El sistema puede operar completamente offline usando contenido cacheado

### Sincronización y Conectividad

- **FR26:** El sistema puede autenticarse con Google Photos usando OAuth y mantener el token activo entre reinicios
- **FR27:** El sistema puede detectar restauración de conexión WiFi e iniciar sincronización automáticamente
- **FR28:** El sistema puede continuar operando normalmente sin conexión a internet

---

## Non-Functional Requirements

### Rendimiento

- **NFR1:** Las transiciones entre fotos son fluidas y sin lag visible
- **NFR2:** El sistema carga y muestra contenido cacheado en menos de 5 segundos tras reinicio
- **NFR3:** La sincronización con Google Photos no interrumpe ni degrada la experiencia visual

### Confiabilidad

- **NFR4:** Operación autónoma mínima de 6 meses sin intervención técnica
- **NFR5:** Ante corte de WiFi, el sistema opera con contenido cacheado indefinidamente
- **NFR6:** Reinicio por desenchufar/enchufar restaura funcionamiento normal en menos de 60 segundos

### Accesibilidad

- **NFR7:** Tamaño mínimo de texto 24px — legible para adultos mayores (~70-80 años)
- **NFR8:** Alto contraste en todos los elementos de texto — ratio mínimo 4.5:1 (WCAG AA)
- **NFR9:** Las frases en Yiddish se muestran con transliteración o traducción al español

### Seguridad

- **NFR10:** La pantalla admin requiere PIN — protege contra acceso accidental o no autorizado
- **NFR11:** El token OAuth de Google Photos se almacena de forma segura (Android Keystore)

### Integración

- **NFR12:** La integración con Google Photos funciona con cuentas Google Workspace
- **NFR13:** Ante fallo de la API de Google Photos, el sistema usa el caché local sin mostrar errores al usuario final
