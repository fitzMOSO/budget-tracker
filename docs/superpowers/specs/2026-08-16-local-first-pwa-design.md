# Budget Tracker — Local-First PWA Repositioning

**Date:** 2026-08-16
**Status:** Approved design, pending implementation plan

## Problem

The repository currently tells three abandoned stories at once:

1. **A disabled MSSQL backend.** `app/lib/db.ts`, `app/lib/queries.ts`, and
   `database/schema.sql` exist, but the entire API surface was renamed to
   `app/_api_disabled/` to satisfy `output: 'export'`. It cannot run.
2. **An abandoned Capacitor native app.** `CAPACITOR_SETUP.md` and
   `DEPLOY_MOBILE_STORES.md` promise store deployments that are not happening.
   `android/`, `ios/`, and `capacitor.config.ts` are all gitignored.
3. **An unused Redux installation.** `redux`, `react-redux`, and `reselect` are
   dependencies; the app runs entirely on React Context
   (`app/context/BudgetContext.tsx`).

Underneath these is a working, genuinely local-first application: all data lives
in `localStorage`, and every route is statically exportable. The PWA layer that
should be its headline feature is instead its weakest part — hand-rolled, with a
broken update path and install logic duplicated three times.

This design commits the project to a single identity: **a local-first, installable,
fully offline budget tracker**, and rebuilds the PWA layer to match.

## Goals

- The repository tells one coherent story with no disabled or vestigial subsystems.
- The app is installable and fully usable with no network connection.
- Service worker updates apply reliably and predictably.
- A reviewer landing on the live demo sees populated, realistic data immediately.

## Non-Goals

- No cloud sync, accounts, or multi-device support.
- No migration off `output: 'export'`.
- No visual redesign of existing screens.
- No broad SweetAlert2 removal beyond the update prompt.

## Section 1 — Deletions

### Backend layer

Delete `app/_api_disabled/`, `app/lib/db.ts`, `app/lib/queries.ts`, and
`database/`. Remove the `mssql` dependency and `@types/mssql` if present.

Verify before deleting that no live module imports from `app/lib/db.ts` or
`app/lib/queries.ts`. Expected result: only `_api_disabled` routes reference them.

### Capacitor

Delete `capacitor.config.ts`, `android/`, `ios/`, `CAPACITOR_SETUP.md`, and
`DEPLOY_MOBILE_STORES.md`. Remove `@capacitor/core`, `@capacitor/android`,
`@capacitor/ios`, and `@capacitor/cli` from `package.json`, along with all six
`cap:*` scripts. Remove the now-stale `capacitor.config.json` / `capacitor.config.ts`
entries from `.gitignore`.

### Unused state libraries

Remove `redux`, `react-redux`, and `reselect`. Confirm zero imports first.

### Dead PWA code

Delete:

- `app/components/InstallPrompt.tsx` (imported nowhere)
- `app/components/WidgetHelper.tsx` (stub returning `null`, imported nowhere)
- `app/install/page.tsx` (links to store builds no longer shipped)
- `public/widget.html`
- `app/api/widget-data/route.ts`

Remove from `public/manifest.json`: the `widgets` block and the `share_target`
entry, which targets a `/share` route that does not exist.

Remove from `app/settings/page.tsx`: the "Install App" card (lines 424–480) and
its handlers (lines 42–96), including `handleResetInstallPrompt`, which clears a
`pwa-prompt-dismissed` key that nothing in the repository ever writes.

### What stays, and why

`output: 'export'` remains. Its original justification was Capacitor's
`webDir: 'out'`; its new justification is that a local-first app with no server
state genuinely is a static site. The configuration is unchanged; only the
reasoning is.

### Open item: `scripts/generate-out.js`

This script hand-rolls an export — reading `.next/server/app/*.html`, remapping
`name.html` to `name/index.html`, copying `.next/static`, then overlaying
`public/` — that Next.js produces natively under `output: 'export'`.

During implementation, determine whether `next build` alone now produces a
correct `out/`. If it does, delete `generate-out.js` and simplify `build:web` to
`next build && workbox injectManifest workbox.config.js`. If it does not,
document the specific reason it exists in a comment at the top of the file and
keep it.

Do not assume either outcome. This is a verification step, not a decision.

## Section 2 — PWA architecture

### Manifest

Rewrite `public/manifest.json` with:

- `id`, `name`, `short_name`, `description`
- `start_url: "/"`, `scope: "/"`
- `display: "standalone"`, `display_override: ["standalone", "browser"]`
- `theme_color: "#3b82f6"` (matching the existing viewport theme color in
  `app/layout.tsx`), `background_color`
- `orientation: "portrait"`
- `icons` per below
- `shortcuts` limited to routes that exist: Add Expense and Add Income, both
  targeting `/quick-add` with the appropriate `type` query parameter

The current Settings copy advertises "Transfer Funds" and "View Bills" shortcuts
that were never in the manifest. That copy is deleted along with the card.

### Icons

`public/icons/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, and
`public/favicon.png` are currently all 19,884 bytes — the same source image
renamed. `icon-512.png` is therefore not 512px, which fails install criteria in
some browsers.

Regenerate from a single source image:

- `icon-192.png` — 192×192, purpose `any`
- `icon-512.png` — 512×512, purpose `any`
- `icon-maskable-512.png` — 512×512, purpose `maskable`, with the icon artwork
  inset to roughly 80% to respect the maskable safe zone
- `apple-touch-icon.png` — 180×180

Delete the unused `android-launchericon-*.png` set, which existed for Capacitor.

### Service worker

Source lives at `app/sw.js` and is built to `out/sw.js` by `workbox-cli`'s
`injectManifest` as a post-export step.

Rationale for Workbox CLI over Serwist or hand-rolling: it operates on finished
files on disk, so it is decoupled from Next.js, Turbopack, and the export mode,
and cannot be broken by a framework upgrade. It contributes exactly the one part
that is tedious and error-prone to hand-write — content-hashed precache
revisioning — and nothing else. Serwist's Next integration expects a
`createSerwistRoute` handler, which sits awkwardly under `output: 'export'`.

The service worker will:

- `precacheAndRoute(self.__WB_MANIFEST)` over the full exported shell
- Register a navigation route falling back to the precached `/index.html` for
  uncached navigations
- Call `clientsClaim()`
- Handle a `message` event for `{ type: 'SKIP_WAITING' }` by calling
  `self.skipWaiting()`

That last point is the current implementation's core defect: `sw.js` has no
`message` listener at all, while `ServiceWorkerRegistration.tsx` posts
`SKIP_WAITING` at two call sites. The "Update Now" button is a no-op today, and
because `install` also omits `skipWaiting()`, updates only land after every tab
closes.

There is no runtime API caching, because after Section 1 there are no API routes.

### Build integration

Add `workbox-cli` as a dev dependency and a `workbox.config.js` specifying
`globDirectory: 'out'`, an appropriate `globPatterns`, `swSrc: 'app/sw.js'`, and
`swDest: 'out/sw.js'`. Wire the `injectManifest` invocation into `build:web`
after the export step.

### Headers

`public/_headers` retains `Cache-Control: max-age=0, must-revalidate` for
`/sw.js`. This is the only mechanism available, since `output: 'export'` rules
out `headers()` in `next.config.ts`.

## Section 3 — Install and update UX

### Install

Create `app/hooks/useInstallPrompt.ts` as the single source of truth: it owns the
`beforeinstallprompt` capture, the `appinstalled` listener, standalone-mode
detection via `display-mode`, and iOS detection for the manual-instructions
fallback. It exports the deferred prompt state, an `install()` function, and an
`isInstalled` flag.

`app/components/InstallButton.tsx` is rewritten to consume the hook and remains
the only install entry point, rendered from `app/components/AppLayout.tsx`.

This replaces three divergent implementations and three separate declarations of
the `BeforeInstallPromptEvent` interface.

### Update

Rewrite `app/components/ServiceWorkerRegistration.tsx`:

- Register `/sw.js`, retaining the existing periodic and visibility-change
  update checks
- Detect a waiting worker and surface a non-blocking prompt
- On accept, post `SKIP_WAITING` to the waiting worker
- On `controllerchange`, reload exactly once, guarded by a module-level boolean
  so a failed activation cannot cause a reload loop — the current implementation
  has no such guard

The update prompt is a plain component rather than a SweetAlert2 dialog. Broader
SweetAlert2 removal is out of scope.

### Offline indicator

Add a small component driven by `navigator.onLine` plus `online`/`offline`
listeners. No such indicator exists today, and offline capability is now the
headline feature.

## Section 4 — Demo readiness

### Seed data

Add a "Load demo data" action to Settings, occupying the space vacated by the
removed install card. It populates realistic accounts, categories, budgets, and
a few months of transactions through `BudgetContext`, and asks for confirmation
before overwriting existing data.

### Version

`app/settings/page.tsx` hardcodes `Version: 1.0.0` while `package.json` declares
`0.1.0`. Replace the literal with a value derived from `package.json` at build
time so the two cannot drift.

### README

Rewrite with, in order: a one-line description, a screenshot or GIF, the live
demo link, the local-first pitch (data never leaves the device; works with no
network), and an explicit note that the UI primitives in `app/components/ui/`
are hand-built rather than generated.

## Section 5 — Testing and verification

### Automated

There is currently no test runner in `package.json`. Add Vitest with a `test`
script, and cover:

- The money math in `BudgetContext` — category totals, budget remaining, and
  credit-card balance calculations
- `useInstallPrompt` — that it reports installed state correctly in standalone
  mode and exposes the prompt once `beforeinstallprompt` fires

Broader coverage is a follow-up.

### Manual

- `npm run build:web` completes and `out/sw.js` contains a populated precache
  manifest
- Lighthouse reports the app as installable with no PWA-category failures
- Install the app, disable the network, and exercise every route — dashboard,
  accounts, bills, categories, credit cards, expenses, income, savings,
  settings, quick-add
- Deploy a change and confirm the update prompt appears and applies without a
  reload loop

## Follow-ups (recorded, not in scope)

- Remove SweetAlert2 in favor of in-app components (`swal.ts`, `swal.tsx`,
  `swalImpl.tsx`)
- Broader test coverage beyond money math and the install hook
- Optional cloud sync as a deliberate v2
- Delete `scripts/generate-out.js` if Section 1's verification permits
- Confirm monetary values are stored as integer cents rather than floats; if
  they are floats, migrating is a prerequisite for any serious financial claim
- Review `.github/agents/pwa web developer.agent.md` and
  `.github/copilot-instructions.md`, both of which describe the old PWA and
  Capacitor setup
