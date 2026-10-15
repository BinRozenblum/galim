#!/bin/bash
# Build a signed Android release APK + AAB for Galim.
# Re-runnable: safe to run again after code or asset changes.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# --- toolchain ---------------------------------------------------------
# Capacitor 8's Android core requires JDK 21 (javac source/target 21).
# Installed via `brew install openjdk@21` (kept unlinked globally - only
# referenced here so the rest of the system keeps using JDK 17).
export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
export PATH="$JAVA_HOME/bin:$PATH"

export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

VERSION=$(grep -o 'versionName "[^"]*"' android/app/build.gradle | cut -d'"' -f2)
BUILD_TOOLS_VERSION="35.0.0"
BUILD_TOOLS="$ANDROID_HOME/build-tools/$BUILD_TOOLS_VERSION"

echo "== 1/5 npm run build (web assets) =="
npm run build && npm test && node scripts/check-dist.mjs

echo "== 2/5 cap sync android =="
npx cap sync android

echo "== 3/5 gradle assembleRelease + bundleRelease =="
cd android
if [ ! -f keystore.properties ]; then
  echo "ERROR: android/keystore.properties not found - signing config missing." >&2
  echo "Expected keystore at /path/to/keys/galim-release.keystore (see app/NATIVE.md)." >&2
  exit 1
fi
./gradlew --console=plain clean assembleRelease bundleRelease
cd "$APP_DIR"

echo "== 4/5 copy outputs =="
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/release/android"
mkdir -p "$OUT_DIR"
cp "android/app/build/outputs/apk/release/app-release.apk" "$OUT_DIR/galim-$VERSION.apk"
cp "android/app/build/outputs/bundle/release/app-release.aab" "$OUT_DIR/galim-$VERSION.aab"

echo "== 5/5 verify signing =="
"$BUILD_TOOLS/apksigner" verify --print-certs "$OUT_DIR/galim-$VERSION.apk"

echo
echo "Done. Outputs:"
echo "  $OUT_DIR/galim-$VERSION.apk"
echo "  $OUT_DIR/galim-$VERSION.aab"
