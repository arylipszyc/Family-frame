#!/usr/bin/env bash
# ============================================================
# family-frame — Build y firma del APK release para sideload
# ============================================================
#
# REQUISITOS:
#   - Node.js, npm
#   - Android SDK con Build Tools (apksigner disponible en PATH)
#   - Java JDK 17+ (para Gradle)
#   - adb (para instalación en tablet)
#
# USO (primera vez):
#   1. Generar keystore (solo se hace una vez; guardar en lugar seguro):
#      keytool -genkey -v \
#        -keystore family-frame-keystore.jks \
#        -alias family-frame \
#        -keyalg RSA -keysize 2048 -validity 10000
#
#   2. Exportar variables de entorno:
#      export KEYSTORE_PATH="/ruta/a/family-frame-keystore.jks"
#      export KEY_ALIAS="family-frame"
#
#   3. Ejecutar este script:
#      bash scripts/build-release.sh
#
#   4. Instalar en tablet (con USB conectado, depuración USB habilitada):
#      adb install app-release.apk
#
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
UNSIGNED_APK="$PROJECT_ROOT/android/app/build/outputs/apk/release/app-release-unsigned.apk"
SIGNED_APK="$PROJECT_ROOT/app-release.apk"

echo ""
echo "=== family-frame: Build release APK ==="
echo ""

# ── 1. Web build ───────────────────────────────────────────
echo "→ [1/3] npm run build + cap sync android..."
cd "$PROJECT_ROOT"
npm run build
npx cap sync android
echo "    ✓ Web build y cap sync completados"

# ── 2. Gradle assembleRelease ──────────────────────────────
echo "→ [2/3] ./gradlew assembleRelease..."
cd "$PROJECT_ROOT/android"
./gradlew assembleRelease
echo "    ✓ APK generado: $UNSIGNED_APK"

# ── 3. Firma con apksigner ─────────────────────────────────
echo "→ [3/3] Firmando APK..."

if [ -z "${KEYSTORE_PATH:-}" ]; then
  echo ""
  echo "ERROR: Variable KEYSTORE_PATH no definida."
  echo "Exportá la ruta al keystore antes de correr este script:"
  echo "  export KEYSTORE_PATH=\"/ruta/a/family-frame-keystore.jks\""
  exit 1
fi

if [ ! -f "$KEYSTORE_PATH" ]; then
  echo ""
  echo "ERROR: Keystore no encontrado: $KEYSTORE_PATH"
  echo "Verificá que la ruta sea correcta o generá uno nuevo con keytool."
  exit 1
fi

if [ -z "${KEY_ALIAS:-}" ]; then
  echo ""
  echo "ERROR: Variable KEY_ALIAS no definida."
  echo "Exportá el alias del keystore antes de correr este script:"
  echo "  export KEY_ALIAS=\"family-frame\""
  exit 1
fi

if [ ! -f "$UNSIGNED_APK" ]; then
  echo ""
  echo "ERROR: APK no generado en la ruta esperada:"
  echo "  $UNSIGNED_APK"
  echo "Verificá que './gradlew assembleRelease' completó correctamente."
  exit 1
fi

apksigner sign \
  --ks "$KEYSTORE_PATH" \
  --ks-key-alias "$KEY_ALIAS" \
  --out "$SIGNED_APK" \
  "$UNSIGNED_APK"

echo "    ✓ APK firmado: $SIGNED_APK"

# ── Verificación ───────────────────────────────────────────
echo ""
echo "=== Verificando firma ==="
apksigner verify --verbose "$SIGNED_APK" | head -5

echo ""
echo "=== Build completo ==="
echo ""
echo "APK listo para instalar:"
echo "  $SIGNED_APK"
echo ""
echo "Para instalar en tablet (USB + depuración habilitada):"
echo "  adb install \"$SIGNED_APK\""
echo ""
echo "Si ya hay una versión instalada, usar -r para reinstalar:"
echo "  adb install -r \"$SIGNED_APK\""
echo ""
echo "Después de instalar, seleccionar la app como launcher por defecto:"
echo "  Settings → Apps → Default apps → Home app → FamilyFrame"
echo ""
