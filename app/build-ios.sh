#!/bin/bash
# Build Galim for iOS.
#
#   ./build-ios.sh          - default: builds+boots a Simulator build to verify
#                              the native project compiles (no Apple Developer
#                              account / provisioning needed for this).
#   ./build-ios.sh archive   - Release archive + export a signed, App
#                              Store-ready .ipa (needs the "Galim App Store"
#                              provisioning profile + the Apple Distribution
#                              certificate installed locally).
#   ./build-ios.sh upload    - uploads release/ios/Galim.ipa via altool. Only
#                              works once the app record exists in App Store
#                              Connect (created manually by the account owner
#                              in the web console - the API cannot create it).
#
# Re-runnable.
set -euo pipefail

MODE="${1:-simulator}"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

TEAM_ID="7T58NQ8F9P"
PROFILE_NAME="Galim App Store"
CODE_SIGN_IDENTITY="Apple Distribution"
RELEASE_DIR="$APP_DIR/../release/ios"
IPA_PATH="$RELEASE_DIR/Galim.ipa"

# App Store Connect API (for altool upload)
ASC_KEY_ID="${ASC_KEY_ID:-}"
ASC_ISSUER_ID="${ASC_ISSUER_ID:-}"

if [ "$MODE" = "upload" ]; then
  echo "== Uploading $IPA_PATH via altool =="
  if [ ! -f "$IPA_PATH" ]; then
    echo "No IPA at $IPA_PATH - run './build-ios.sh archive' first." >&2
    exit 1
  fi
  xcrun altool --upload-app \
    -f "$IPA_PATH" \
    -t ios \
    --apiKey "$ASC_KEY_ID" \
    --apiIssuer "$ASC_ISSUER_ID"
  exit 0
fi

echo "== 1/3 npm run build (web assets) + checks =="
npm run build && npm test && node scripts/check-dist.mjs

echo "== 2/3 cap sync ios =="
npx cap sync ios

cd ios/App

if [ "$MODE" = "archive" ]; then
  echo "== 3/3 xcodebuild archive (iphoneos, Release, manual signing) =="
  mkdir -p "$RELEASE_DIR"
  xcodebuild \
    -project App.xcodeproj \
    -scheme App \
    -configuration Release \
    -sdk iphoneos \
    -destination 'generic/platform=iOS' \
    -archivePath build/Galim.xcarchive \
    -derivedDataPath build \
    CODE_SIGN_STYLE=Manual \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    PROVISIONING_PROFILE_SPECIFIER="$PROFILE_NAME" \
    CODE_SIGN_IDENTITY="$CODE_SIGN_IDENTITY" \
    archive

  echo "== export signed .ipa =="
  rm -rf build/export
  xcodebuild -exportArchive \
    -archivePath build/Galim.xcarchive \
    -exportPath build/export \
    -exportOptionsPlist "$APP_DIR/ios/ExportOptions.plist"

  EXPORTED_IPA=$(find build/export -maxdepth 1 -name "*.ipa" | head -1)
  if [ -z "$EXPORTED_IPA" ]; then
    echo "Export did not produce an .ipa - see build/export for logs." >&2
    exit 1
  fi
  cp "$EXPORTED_IPA" "$IPA_PATH"
  echo
  echo "Signed IPA ready: $IPA_PATH"
  exit 0
fi

echo "== 3/3 xcodebuild (iphonesimulator, Release) =="
# Capacitor 8 uses Swift Package Manager for plugins (no CocoaPods), so
# there is no .xcworkspace - build the .xcodeproj directly.
xcodebuild \
  -project App.xcodeproj \
  -scheme App \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build \
  build

echo
echo "Simulator build succeeded. App bundle:"
find build -maxdepth 5 -name "App.app" -path "*iphonesimulator*"
