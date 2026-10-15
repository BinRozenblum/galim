#!/bin/bash
# Galim simulator QA helper (iOS).
#   tools/sim.sh build            dev-scenes build -> install -> launch on the iPhone 17 Pro Max sim
#   tools/sim.sh scene 'tab?t=trends&lang=he'   send a scene (needs: node tools/scenesrv.js &)
#   tools/sim.sh shot NAME        screenshot to $SHOTS (default $(cd "$(dirname "$0")/.." && pwd)/qa/raw)
#   tools/sim.sh logs             print eval output
set -e
DEV=${GALIM_SIM:-8FA96572-9008-4271-81F6-63DF9B75DE01}
SHOTS=${SHOTS:-$(cd "$(dirname "$0")/.." && pwd)/qa/raw}
mkdir -p "$SHOTS"
cd "$(dirname "$0")/../app"
case $1 in
build)
  npm run build:scenes >/dev/null
  npx cap copy ios >/dev/null
  cd ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination "id=$DEV" -derivedDataPath build-sim build -quiet 2>&1 | grep -E "error|BUILD" | head -5 || true
  xcrun simctl boot $DEV 2>/dev/null || true
  xcrun simctl install $DEV build-sim/Build/Products/Debug-iphonesimulator/App.app
  xcrun simctl terminate $DEV com.binrozenblum.galim 2>/dev/null || true
  xcrun simctl launch $DEV com.binrozenblum.galim >/dev/null
  echo launched;;
launch) xcrun simctl terminate $DEV com.binrozenblum.galim 2>/dev/null || true; xcrun simctl launch $DEV com.binrozenblum.galim >/dev/null; echo launched;;
scene) curl -s "http://localhost:8913/set?c=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$2")"; echo;;
shot) xcrun simctl io $DEV screenshot "$SHOTS/$2.png" >/dev/null 2>&1; echo "$SHOTS/$2.png";;
logs) curl -s http://localhost:8913/logs; echo;;
esac
