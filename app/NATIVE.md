# Galim (גלים) - native apps

Vite + TypeScript (vanilla) web app in `src/`, wrapped with Capacitor 8 into
`ios/` and `android/`. Fully offline: no server, no accounts, no analytics, no
network permission on Android, strict CSP (`default-src 'self'`).

- appId / bundle: `com.binrozenblum.galim`, version 1.0.0 (build 1 / versionCode 1)
- Display name: `גלים` (en: `Galim`), iPhone only, portrait only

## Commands

```
npm run build        # tsc strict + vite build (production, no dev scenes)
npm test             # vitest: dates, stats, gentle notes, vault encryption, backup
npm run check-dist   # fails on any http(s) URL besides the explicit outbound links
./build-ios.sh            # simulator build (no signing)
./build-ios.sh archive    # signed App Store .ipa -> ../release/ios/Galim.ipa (profile "Galim App Store", team 7T58NQ8F9P)
./build-ios.sh upload     # altool upload of that .ipa
./build-android.sh        # signed APK+AAB -> ../release/android/ (needs android/keystore.properties)
```

`android/keystore.properties` (gitignored, see `keystore.properties.example`) points at
`/path/to/keys/galim-release.keystore`.

After `npx cap add ios|android` re-run `python3 scripts/ios-patch.py` /
`python3 scripts/android-patch.py` (Info.plist keys, InfoPlist.strings he/en,
PrivacyInfo.xcprivacy, device family, manifest permissions, backup rules,
signing config). Icons: `node scripts/make-icons.mjs && npx capacitor-assets generate --ios --android`.

## Data and security

- Entries/plan/name: one JSON object, AES-256-GCM (WebCrypto) with a random key kept in
  iOS Keychain (`afterFirstUnlockThisDeviceOnly`, no iCloud sync) / Android Keystore via
  `@aparajita/capacitor-secure-storage`. Ciphertext in two A/B slot files with a sequence
  number (iOS `Library/NoCloud`, Android internal files dir; `allowBackup=false` + data
  extraction rules exclude everything). A crash mid-write can only damage the older slot.
- Non-sensitive settings (onboarded, lock, reminder time) in `@capacitor/preferences`.
- Backup file `.galim`: PBKDF2-SHA256 (310,000 iterations) + AES-GCM, shared via the share sheet.
- Lock: `@aparajita/capacitor-biometric-auth` (device passcode fallback); locks on launch
  and after 60s in background. In-app cover on pause + `@capacitor/privacy-screen`
  (iOS blur in app switcher, Android FLAG_SECURE: screenshots are blocked in production).
- Reminder: `@capacitor/local-notifications`, `on: {hour, minute}`, inexact
  (SCHEDULE_EXACT_ALARM removed from the merged manifest). Permission asked only when turned on.

## QA / store screenshots (dev-scenes builds only)

```
node ../tools/scenesrv.js &          # scene server on :8913
../tools/sim.sh build                # VITE_DEV_SCENES=1 build -> iPhone 17 Pro Max sim (1320x2868)
../tools/sim.sh scene 'seed?lang=he' # demo data (120 days), also 'seed?lang=en'
../tools/sim.sh scene 'tab?t=trends&range=30'   # tabs: today|trends|plan|doctor
../tools/sim.sh scene crisis         # also: note, date, time, backup, restore, wipe1, wipe2, about, settings, lock, onboarding?step=0..3
../tools/sim.sh shot NAME            # -> qa/raw/NAME.png
../tools/sim.sh scene 'eval?code=__qa.pdf(60)'  # writes qa/sample-report.pdf
```

A dev-scenes build auto-seeds demo data on first launch (used on Android, where
screens are navigated with `adb shell input tap`). `npm run build` contains none of it
(`check-dist` verifies).
