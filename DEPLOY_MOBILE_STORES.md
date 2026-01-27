# Deploying Budget Tracker to Google Play and Apple App Store

This guide explains the recommended steps to prepare and publish the Capacitor-built Android and iOS apps for the Budget Tracker project.

Quick summary
- Build web assets: `npm run build:web` (produces the `out/` webDir used by Capacitor).
- Sync Capacitor: `npx cap sync` (copies `out/` into native projects)
- Android: open Android Studio `npx cap open android` → build a signed AAB and upload to Play Console.
- iOS (macOS only): open Xcode `npx cap open ios` → Archive and upload to App Store Connect.

Prerequisites
- Google Play Console account (developer account, fee required).
- Apple Developer Program membership (annual fee) and App Store Connect access.
- macOS + Xcode to build and submit iOS apps.
- Android Studio (with JDK and Android SDK) to build Android apps.
- App icons, screenshots, privacy policy URL, app descriptions, and support contact ready.

Before you start
- Ensure `capacitor.config.ts` has `webDir: 'out'` and your appId/bundleId are set.
- Produce web assets and sync:

```bash
npm run build:web
npx cap sync
```

- Make sure `out/` contains `index.html`, `manifest.json`, icons, service worker, and `_headers` (for Netlify).

Android (Google Play) – Recommended: produce an AAB
1. Open Android project in Android Studio:

```bash
npx cap open android
```

2. In Android Studio:
   - Select `Build > Generate Signed Bundle / APK...`.
   - Choose **Android App Bundle (AAB)** (preferred) or APK.
   - Create or use an existing keystore (store password, key alias and password required). Keep the keystore secure; you'll need it for updates.
   - Set versionCode and versionName in `android/app/build.gradle` (or in `app/build.gradle.kts`). Increment `versionCode` for releases.

3. Build the signed AAB and verify on device (use internal testing track):
   - Upload the AAB to the Play Console → Internal testing → Add testers → Publish.

4. Configure Play Store listing:
   - App details (title, short & full description).
   - Provide store listing assets: screenshots for different device types, hi-res icon, feature graphic if required.
   - Set privacy policy URL and contact info.
   - Configure pricing & distribution.

5. Release and monitor:
   - Start with an internal or closed test track.
   - After testing, promote to production.

Notes & tips (Android):
- Use AAB to let Google manage optimized APKs for device configurations.
- If you need deep links or App Links, configure `AndroidManifest.xml` and `assetlinks.json` on your website.
- If you use background sync or native plugins, test thoroughly on devices and emulators.

iOS (App Store) — macOS required
1. Ensure bundle id matches the App ID in Apple Developer portal (set in `capacitor.config.ts`).
2. Sync Capacitor and open Xcode:

```bash
npx cap sync
npx cap open ios
```

3. In Xcode:
   - Select the target, set the version and build number (increment `CFBundleVersion`).
   - Ensure a valid signing team & provisioning profiles (recommended: use automatic signing for App Store builds).
   - Add App Icons and Launch Images in the Assets catalog, and update `Info.plist` if extra permissions are required.

4. Archive & upload:
   - Product → Archive. When archive finishes use the Organizer to `Distribute App` → App Store Connect → Upload.
   - Alternatively export an `.ipa` and upload via Transporter.

5. App Store Connect setup:
   - Create a new app record (if not existing): Bundle ID, SKU, platform.
   - Add privacy policy URL, contact info, and screenshots for required device sizes.
   - Configure App Store metadata and submit for TestFlight internal testing.

6. Submit for review and release after testing.

Notes & tips (iOS):
- iOS review can take longer; use TestFlight for internal/external testing before production.
- Ensure runtime permission descriptions are present in `Info.plist` for any OS-level permissions (camera, photo library, etc.).

Common cross-platform items
- Versioning: keep `versionName` (Android) / `CFBundleShortVersionString` and `CFBundleVersion` (iOS) consistent.
- Environment variables: use `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_ANDROID_URL`, `NEXT_PUBLIC_IOS_URL` in your hosting platform (Netlify) so the web and install pages link to store entries.
- Signing keys: keep Android keystore and Apple distribution certificates securely backed up.
- Test on real devices and use crash reporting tools (Sentry, Firebase Crashlytics) if possible.

Automations & CI
- CI can run `npm ci && npm run build:web && npx cap sync` then archive native projects on runner machines (macOS runner needed for iOS).
- For automated Android builds, use GitHub Actions or other CI to run Gradle and produce signed AABs (store keystore via secrets).

Checklist before publishing
- [ ] `out/` contains the latest web assets and icons
- [ ] App icons and splash screens look correct on devices
- [ ] Keystore/certificates available and configured
- [ ] Privacy policy URL is published and linked
- [ ] Store descriptions, screenshots, and contact info are ready
- [ ] Internal testing track created and verified

Troubleshooting
- Build fails in Android Studio: run `./gradlew clean` and re-sync Gradle.
- iOS signing issues: ensure the Apple Developer membership is active, and reset provisioning profiles if necessary.
- Missing permissions: add human-friendly reasons to `Info.plist` and re-run.

Appendix — Useful commands

```bash
# Build and prepare web assets
npm run build:web

# Sync webDir into native projects
npx cap sync

# Open native projects
npx cap open android
npx cap open ios    # macOS only

# Run TypeScript checks
npx tsc --noEmit

# Rebuild Android in CI (example)
cd android
./gradlew bundleRelease

# Archive iOS from Xcode (use macOS): use Xcode Organizer to Archive & Upload
```

If you want, I can add a sample GitHub Actions workflow to build the Android AAB and optionally upload to Google Play using `fastlane` or the Play Developer API. Which automation would you like next?
