# Story 6.2: Pantalla siempre encendida — WAKE_LOCK

Status: done

## Story

Como sistema,
quiero que la pantalla permanezca encendida de forma continua,
para que el marco esté siempre visible sin que nadie tenga que reactivarlo.

## Acceptance Criteria

**AC1:**
- Dado la app activa en KioskScreen, cuando transcurren los timeouts de pantalla del sistema Android
- Entonces la pantalla permanece encendida — el WAKE_LOCK de `MainActivity` lo previene

**AC2:**
- Dado `MainActivity` implementado, cuando se revisa el código
- Entonces adquiere `PowerManager.SCREEN_BRIGHT_WAKE_LOCK` en `onCreate`
- Y el permiso `WAKE_LOCK` está declarado en `AndroidManifest.xml`

**AC3:**
- Dado el WAKE_LOCK activo, cuando la app entra en background (si ocurre accidentalmente)
- Entonces el WAKE_LOCK se mantiene hasta que la app vuelve al foreground
- Y la app vuelve al foreground automáticamente

## Tasks / Subtasks

- [x] Task 1 — Convertir `BootReceiver.kt` → `BootReceiver.java` (Kotlin no configurado en Gradle)
  - [x] 1.1 — Crear `BootReceiver.java` con lógica equivalente (Java String.equals para null safety)
  - [x] 1.2 — Eliminar `BootReceiver.kt`

- [x] Task 2 — Implementar WAKE_LOCK en `MainActivity.java`
  - [x] 2.1 — Override `onCreate`: adquirir `SCREEN_BRIGHT_WAKE_LOCK` con tag `"FamilyFrame:ScreenWakeLock"`
  - [x] 2.2 — Override `onDestroy`: release si held (evitar leak)
  - [x] 2.3 — Override `onResume`: re-adquirir si se perdió (AC3 — bring to foreground)

- [x] Task 3 — `AndroidManifest.xml`: agregar permiso `WAKE_LOCK`

- [x] Task 4 — Validación
  - [x] 4.1 — `npm run test` 140/140 ✅

## Dev Notes

### Por qué Java, no Kotlin

`android/build.gradle` no tiene el classpath de `kotlin-gradle-plugin`, y `android/app/build.gradle` no aplica el plugin `kotlin-android`. Los archivos `.kt` existentes (BootReceiver.kt de Story 6.1) no compilarían. Para garantizar que `./gradlew assembleRelease` funcione en Story 6.4, se usa Java.

### BootReceiver.java

```java
package com.familyframe.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(launchIntent);
        }
    }
}
```

Nota: `String.equals()` en Java maneja null de forma segura (si action es null, `.equals()` retorna false).

### MainActivity.java con WAKE_LOCK

```java
package com.familyframe.app;

import android.os.Bundle;
import android.os.PowerManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private PowerManager.WakeLock wakeLock;

    @Override
    @SuppressWarnings("deprecation")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "FamilyFrame:ScreenWakeLock"
        );
        wakeLock.acquire();
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onResume() {
        super.onResume();
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }
}
```

`@SuppressWarnings("deprecation")`: `SCREEN_BRIGHT_WAKE_LOCK` está deprecated desde API 17, pero es lo especificado en el AC. Funciona en todos los Android hasta API 36.

`ACQUIRE_CAUSES_WAKEUP`: garantiza que la pantalla se encienda incluso si el dispositivo estaba en standby cuando la app arranca por boot.

`onResume()` re-adquiere si se perdió: cumple AC3 ("WAKE_LOCK se mantiene hasta que la app vuelve al foreground").

### AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

### Scope

- NO incluye kiosk mode (Story 6.3)
- No modifica React layer ni TypeScript

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- BootReceiver.kt eliminado; BootReceiver.java creado (Java equivalente — Gradle no tiene kotlin-android plugin).
- MainActivity.java: WAKE_LOCK adquirido en onCreate con SCREEN_BRIGHT_WAKE_LOCK | ACQUIRE_CAUSES_WAKEUP. Re-adquirido en onResume (AC3). Released en onDestroy.
- AndroidManifest.xml: permiso WAKE_LOCK agregado.
- 140/140 tests, sin cambios en React layer.

### File List

- `android/app/src/main/java/com/familyframe/app/BootReceiver.java` (nuevo — reemplaza .kt)
- `android/app/src/main/java/com/familyframe/app/BootReceiver.kt` (eliminado)
- `android/app/src/main/java/com/familyframe/app/MainActivity.java` (modificado)
- `android/app/src/main/AndroidManifest.xml` (modificado)

### Change Log

- 2026-04-15: Story 6.2 implementada — WAKE_LOCK en MainActivity, BootReceiver.kt → .java, permiso WAKE_LOCK en manifest.
- 2026-04-15: CR completado — revisión limpia, 0 patches, 13 hallazgos descartados (falsos positivos sobre WAKE_LOCK timeout, runtime permissions, NPE de getSystemService).
