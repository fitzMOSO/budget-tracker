# Capacitor Setup (Budget Tracker)

This project includes Capacitor configuration to create native Android and iOS projects.

Overview
- Capacitor config: `capacitor.config.ts` (webDir: `out`).
- Native projects added: `android/` and `ios/` folders (created by `npx cap add`).

Options

1) Static-build (recommended when app is fully static)
- Convert the app to a static export (`out`) and point Capacitor to `webDir: 'out'`.
- Next.js: set `output: 'export'` in `next.config.ts` and ensure all routes/pages are exportable (no server-side API routes).
- Commands:

```bash
# build and export static files
npm run build:web
# sync assets into native projects
npx cap sync
# open Android Studio
npx cap open android
# (on macOS) open Xcode
npx cap open ios
```

Note: This project currently uses Next.js API routes (`/app/api/*`) which prevent a full static export. If you need native apps but rely on those API routes, use option 2.

2) Remote-hosted web (recommended if you have server/API or don't want to change Next.js routes)
- Deploy the web app to a hosting provider (Vercel, Netlify, or your own server).
- Configure Capacitor to load the remote URL by setting `CAPACITOR_SERVER_URL` (see `capacitor.config.ts` comments).
- Example (dev):

```bash
# Build and deploy your web app, or run your dev server and expose it on the network
npm run dev
# Set the environment variable and open the native project
# For Android emulator, use 10.0.2.2 to reach host machine from emulator
export CAPACITOR_SERVER_URL=http://10.0.2.2:3000
npx cap sync
npx cap open android
```

3) Hybrid: Static pages + remote API
- You can export static frontend and keep API hosted remotely. Point the front-end to the remote API endpoints.

Platform notes
- Android: supported on Windows. You need Android Studio + SDK, Java JDK. After `npx cap open android` build and run from Android Studio.
- iOS: requires macOS + Xcode. You can still have `ios/` generated on Windows, but building requires macOS.

What I already did
- Added `capacitor.config.ts` and helpful comments
- Added helper npm scripts in `package.json`:
  - `npm run build:web` (build + export)
  - `npm run cap:init` (initialization helper)
  - `npm run cap:add:android` / `npm run cap:add:ios`
  - `npm run cap:sync`, `npm run cap:open:android`, `npm run cap:open:ios`
- Installed Capacitor CLI and platform packages and added both `android/` and `ios/` native projects.

Next steps I can take for you
- If you want a remote-hosting workflow, I can add a small script to set `CAPACITOR_SERVER_URL` from `.env` and update docs.
- If you want the app fully static, I can help migrate API routes to client-side or implement a small local API shim to enable `next export`.

Tell me which option you prefer and I will continue with the exact automation steps.