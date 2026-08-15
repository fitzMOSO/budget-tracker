# Local-First PWA Repositioning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition Budget Tracker as a coherent local-first, installable, fully offline PWA by deleting three abandoned subsystems and rebuilding the service worker, install, and update layers.

**Architecture:** The app is a statically exported Next.js site whose entire data layer is `localStorage` via `BudgetContext`. The service worker precaches the full exported output, so every route works offline. `workbox-cli` generates a content-hashed precache manifest from the finished `out/` directory as a post-build step; the service worker itself is hand-written and consumes that manifest with plain Service Worker APIs — no bundler, no runtime Workbox dependency.

**Tech Stack:** Next.js 16.1.4 (App Router, `output: 'export'`), React 19.2.3, TypeScript 5 (strict), Tailwind CSS v4, `workbox-cli` (dev only), Vitest, Netlify.

**Spec:** `docs/superpowers/specs/2026-08-16-local-first-pwa-design.md`

## Global Constraints

- `output: 'export'` stays. Do not add `headers()`, middleware, or server routes to `next.config.ts` — they are unsupported under static export.
- Cache headers are set only in `public/_headers` (Netlify).
- No new runtime dependencies. `workbox-cli` and Vitest are **devDependencies** only.
- The service worker must not import from any npm package. It runs unbundled.
- Theme color is `#3b82f6` everywhere (`app/layout.tsx` viewport, manifest `theme_color`).
- Currency defaults are `PHP` / `₱` (`DEFAULT_SETTINGS` in `app/types/index.ts`). Seed data must use these.
- Do not change monetary values from `number` to integer cents. That is a recorded follow-up with its own migration and is explicitly out of scope.
- Work happens on branch `feat/local-first-pwa`.

---

### Task 1: Verify and simplify the static export pipeline

`scripts/generate-out.js` hand-rolls an export that Next.js produces natively under `output: 'export'`. It also only reads **top-level** `.html` files from `.next/server/app` and does not recurse, so nested routes may not be exported at all. Every later task depends on `out/` being correct, so this is verified first.

**Files:**
- Possibly delete: `scripts/generate-out.js`
- Modify: `package.json` (the `build:web` script)

- [ ] **Step 1: Establish the current output as a baseline**

```bash
npm run build:web
find out -name "index.html" | sort
```

Record the list. Every route under `app/` (`accounts`, `bills`, `categories`, `credit-cards`, `expenses`, `income`, `savings`, `settings`, `quick-add`) must appear. Note any that are missing.

- [ ] **Step 2: Test whether Next's native export is sufficient**

```bash
rm -rf out .next
npx next build
find out -name "index.html" | sort
```

Under `output: 'export'`, `next build` writes `out/` itself.

- [ ] **Step 3: Decide, based on the two listings**

If native `next build` produces every route (expected), delete the script:

```bash
git rm scripts/generate-out.js
```

and change `build:web` in `package.json` to:

```json
"build:web": "next build",
```

If native output is missing routes that the script produced, keep the script and add this comment at the top of `scripts/generate-out.js`, replacing `<reason>` with the specific observed difference:

```js
// Retained because `next build` with output:'export' does not emit <reason>.
// Verified 2026-08-16. Re-check on each Next.js major upgrade.
```

- [ ] **Step 4: Confirm the app still serves**

```bash
npx serve out
```

Open `http://localhost:3000`, click through every nav item, confirm no 404s. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "build: simplify static export pipeline"
```

---

### Task 2: Remove the disabled backend, Capacitor, and unused state libraries

**Files:**
- Delete: `app/_api_disabled/`, `app/lib/db.ts`, `app/lib/queries.ts`, `database/`, `capacitor.config.ts`, `android/`, `ios/`, `CAPACITOR_SETUP.md`, `DEPLOY_MOBILE_STORES.md`
- Modify: `package.json`, `.gitignore`

- [ ] **Step 1: Prove nothing live imports the backend**

```bash
grep -rn "lib/db\|lib/queries\|from 'mssql'\|require('mssql')" app --include=*.ts --include=*.tsx | grep -v "_api_disabled"
```

Expected: no output. If anything appears outside `_api_disabled`, stop and report it — the deletion is not safe and this plan needs revision.

- [ ] **Step 2: Prove Redux is unused**

```bash
grep -rn "react-redux\|from 'redux'\|reselect" app --include=*.ts --include=*.tsx
```

Expected: no output.

- [ ] **Step 3: Delete the backend and Capacitor files**

```bash
git rm -r --cached android ios 2>/dev/null || true
rm -rf android ios
git rm -r app/_api_disabled database
git rm app/lib/db.ts app/lib/queries.ts CAPACITOR_SETUP.md DEPLOY_MOBILE_STORES.md
rm -f capacitor.config.ts
```

`capacitor.config.ts`, `android/`, and `ios/` are gitignored, so they are removed from disk rather than from the index.

- [ ] **Step 4: Remove the dependencies and scripts**

```bash
npm uninstall mssql @types/mssql redux react-redux reselect @capacitor/core @capacitor/android @capacitor/ios @capacitor/cli
```

Then delete all six `cap:*` entries from the `scripts` block in `package.json`, leaving:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "build:web": "next build",
  "start": "next start",
  "lint": "eslint"
},
```

(If Task 1 kept `generate-out.js`, `build:web` retains `&& node scripts/generate-out.js`.)

- [ ] **Step 5: Clean `.gitignore`**

Remove the now-meaningless `capacitor.config.json`, `capacitor.config.ts`, `/android`, and `/ios` entries.

- [ ] **Step 6: Verify the build still passes**

```bash
npm run lint && npm run build:web
```

Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove disabled MSSQL backend, Capacitor, and unused Redux deps"
```

---

### Task 3: Remove dead PWA code and the Settings install card

**Files:**
- Delete: `app/components/InstallPrompt.tsx`, `app/components/WidgetHelper.tsx`, `app/install/page.tsx`, `public/widget.html`, `app/api/widget-data/route.ts`
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Confirm the orphans are orphaned**

```bash
grep -rn "InstallPrompt\|WidgetHelper\|widget-data\|/install" app --include=*.tsx --include=*.ts
```

Expected: only the files being deleted reference these. `InstallButton` must NOT appear in this output — it is kept and rewritten in Task 7.

- [ ] **Step 2: Delete**

```bash
git rm app/components/InstallPrompt.tsx app/components/WidgetHelper.tsx app/install/page.tsx public/widget.html app/api/widget-data/route.ts
```

Remove the now-empty `app/api/` directory if nothing else remains in it.

- [ ] **Step 3: Strip PWA logic from Settings**

In `app/settings/page.tsx`, delete:
- The `BeforeInstallPromptEvent` interface (lines 12–15)
- The install-related state and effect (lines 38–96), including `handleInstallApp` and `handleResetInstallPrompt`
- The entire "Install App" card (lines 424–480)
- The `Smartphone` and `Download` imports on line 4 if they become unused

Leave the "About" card at lines 405–422 in place; Task 10 edits it.

- [ ] **Step 4: Verify**

```bash
npm run lint && npm run build:web
```

Expected: both succeed with no unused-import warnings.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove dead PWA components and Settings install card"
```

---

### Task 4: Add test infrastructure and money-math tests

There is currently no test runner. This task adds one and covers the calculations that matter most in a finance app.

**Files:**
- Create: `vitest.config.ts`, `app/utils/__tests__/budget-math.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: a working `npm test` command used by Tasks 7 and 9.

- [ ] **Step 1: Install Vitest**

```bash
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 3: Add the test script**

Add to `scripts` in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest",
```

- [ ] **Step 4: Locate the budget summary calculation**

```bash
grep -rn "essentialsBudget\|BudgetSummary\|totalExpenses" app --include=*.ts --include=*.tsx | grep -v test
```

Identify the function that produces a `BudgetSummary` (see `app/types/index.ts:117-127`). If it is defined inline inside `app/context/BudgetContext.tsx` rather than exported, extract it into `app/utils/budget-math.ts` as an exported pure function with this exact signature, and have `BudgetContext` import it:

```ts
import type { Expense, MonthlyBudget, BudgetSummary } from '../types'

export function calculateBudgetSummary(
  totalIncome: number,
  expenses: Expense[],
  budget: Pick<MonthlyBudget, 'essentialsPercentage' | 'nonEssentialsPercentage' | 'savingsPercentage'>
): BudgetSummary
```

Extraction is required — a pure function is what makes this testable, and it is the unit under test below.

- [ ] **Step 5: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { calculateBudgetSummary } from '../budget-math'
import type { Expense } from '../../types'

const expense = (amount: number, expenseType: Expense['expenseType']): Expense => ({
  id: crypto.randomUUID(),
  description: 'test',
  amount,
  date: '2026-08-01',
  categoryId: 'c1',
  expenseType,
})

const rule = {
  essentialsPercentage: 50,
  nonEssentialsPercentage: 30,
  savingsPercentage: 20,
}

describe('calculateBudgetSummary', () => {
  it('splits income by the 50/30/20 rule', () => {
    const s = calculateBudgetSummary(10000, [], rule)
    expect(s.essentialsBudget).toBe(5000)
    expect(s.nonEssentialsBudget).toBe(3000)
    expect(s.savingsBudget).toBe(2000)
  })

  it('sums actuals per expense type', () => {
    const s = calculateBudgetSummary(10000, [
      expense(1200, 'essential'),
      expense(300, 'essential'),
      expense(800, 'non-essential'),
      expense(500, 'savings'),
    ], rule)
    expect(s.essentialsActual).toBe(1500)
    expect(s.nonEssentialsActual).toBe(800)
    expect(s.savingsActual).toBe(500)
    expect(s.totalExpenses).toBe(2800)
    expect(s.remaining).toBe(7200)
  })

  it('handles zero income without producing NaN', () => {
    const s = calculateBudgetSummary(0, [expense(100, 'essential')], rule)
    expect(Number.isNaN(s.remaining)).toBe(false)
    expect(s.remaining).toBe(-100)
  })

  it('accumulates fractional amounts within a cent', () => {
    const s = calculateBudgetSummary(0, [
      expense(0.1, 'essential'),
      expense(0.2, 'essential'),
    ], rule)
    expect(s.essentialsActual).toBeCloseTo(0.3, 2)
  })
})
```

The last test uses `toBeCloseTo` deliberately: amounts are floats today, and an exact `toBe(0.3)` would fail. It documents the known limitation recorded as a follow-up in the spec.

- [ ] **Step 6: Run the tests and confirm they fail**

```bash
npm test
```

Expected: failures referencing a missing module or export.

- [ ] **Step 7: Complete the extraction so the tests pass**

Implement `calculateBudgetSummary` in `app/utils/budget-math.ts`, preserving the existing behaviour from `BudgetContext` exactly. Do not change any arithmetic — this is a move, not a rewrite. If a test fails because existing behaviour genuinely differs, report the difference rather than silently changing the app.

- [ ] **Step 8: Run tests and the build**

```bash
npm test && npm run build:web
```

Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "test: add Vitest and cover budget summary math"
```

---

### Task 5: Regenerate icons and rewrite the manifest

`public/icons/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, and `public/favicon.png` are all 19,884 bytes — the same image renamed. `icon-512.png` is therefore not 512px, which fails install criteria in some browsers.

**Files:**
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, `public/icons/apple-touch-icon.png` (all regenerated)
- Delete: `public/icons/android-launchericon-*.png`
- Modify: `public/manifest.json`, `app/layout.tsx`

- [ ] **Step 1: Confirm the duplicate-icon problem**

```bash
cd public/icons && ls -l && cd ../..
```

Expected: several files sharing an identical byte size.

- [ ] **Step 2: Regenerate at correct sizes**

Choose the largest genuine source image available (check `public/favicon.png` and the `android-launchericon-512-512.png`). Using `sharp-cli`:

```bash
npx sharp-cli -i <source>.png -o public/icons/icon-192.png resize 192 192
npx sharp-cli -i <source>.png -o public/icons/icon-512.png resize 512 512
npx sharp-cli -i <source>.png -o public/icons/apple-touch-icon.png resize 180 180
npx sharp-cli -i <source>.png -o public/icons/icon-maskable-512.png resize 410 410 -- extend --top 51 --bottom 51 --left 51 --right 51 --background "#3b82f6"
```

The maskable icon insets artwork to 80% and pads with the theme color, so Android's circular mask cannot clip it.

- [ ] **Step 3: Verify the dimensions are real**

```bash
npx sharp-cli -i public/icons/icon-512.png metadata
```

Expected: width 512, height 512. Repeat for each. If any still reports the old dimensions, the source image was too small — report this rather than shipping upscaled icons.

- [ ] **Step 4: Delete the Capacitor launcher icons**

```bash
git rm public/icons/android-launchericon-*.png
```

- [ ] **Step 5: Replace `public/manifest.json` entirely**

```json
{
  "id": "/",
  "name": "Budget Tracker",
  "short_name": "Budget",
  "description": "Track income, expenses, bills, savings, and credit cards with the 50/30/20 budgeting method. Works fully offline; your data never leaves your device.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "display_override": ["standalone", "browser"],
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "lang": "en",
  "categories": ["finance", "productivity", "utilities"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    {
      "name": "Add Expense",
      "short_name": "Expense",
      "description": "Quickly add a new expense",
      "url": "/quick-add?type=expense",
      "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" }]
    },
    {
      "name": "Add Income",
      "short_name": "Income",
      "description": "Quickly add a new income",
      "url": "/quick-add?type=income",
      "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" }]
    }
  ]
}
```

This drops `widgets` (Task 3 deleted its data route and template), `share_target` (pointed at a nonexistent `/share`), and `screenshots` (they pointed at icon files, which is invalid — real screenshots can be added later alongside the README GIF).

- [ ] **Step 6: Update icon references in `app/layout.tsx`**

Replace the `icons` block (lines 33–42) with:

```tsx
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
```

and change the mask-icon link on line 58 to reference `/icons/icon-512.png` only if that file is an SVG; since it is a PNG, **delete line 58 entirely** — `mask-icon` requires SVG and is silently ignored for PNG.

- [ ] **Step 7: Verify**

```bash
npm run build:web && npx serve out
```

Load the app, open DevTools → Application → Manifest. Expected: no errors, all three icons resolve, "Installable" with no warnings.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: regenerate PWA icons at real sizes and rewrite manifest"
```

---

### Task 6: Service worker and Workbox build step

**Files:**
- Create: `app/sw.js`, `workbox.config.js`
- Delete: `public/sw.js`
- Modify: `package.json`, `public/_headers`

**Interfaces:**
- Produces: `out/sw.js`, a service worker responding to `{ type: 'SKIP_WAITING' }` messages. Task 8's registration component depends on that message contract.

- [ ] **Step 1: Add workbox-cli**

```bash
npm i -D workbox-cli
```

- [ ] **Step 2: Create `workbox.config.js`**

```js
module.exports = {
  globDirectory: 'out',
  globPatterns: ['**/*.{html,js,css,png,svg,ico,json,woff,woff2}'],
  globIgnores: ['sw.js', '_headers', '**/*.txt'],
  modifyURLPrefix: { '': '/' },
  dontCacheBustURLsMatching: /^\/_next\/static\//,
  swSrc: 'app/sw.js',
  swDest: 'out/sw.js',
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
}
```

`injectManifest` only substitutes the `self.__WB_MANIFEST` token — it does not bundle. That is why `app/sw.js` below imports nothing.

- [ ] **Step 3: Create `app/sw.js`**

```js
/* eslint-disable no-undef */
// Precache manifest injected at build time by workbox-cli. Each entry is
// { url, revision }. workbox-cli only substitutes this token; it does not
// bundle, so this file must not import anything.
const MANIFEST = self.__WB_MANIFEST || []

// Derive a cache name from the manifest contents, so any content change
// produces a new cache and a clean full re-precache.
function hashManifest(entries) {
  const input = entries.map((e) => `${e.url}@${e.revision || ''}`).join('|')
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

const CACHE_PREFIX = 'bt-precache-'
const CACHE_NAME = CACHE_PREFIX + hashManifest(MANIFEST)
const PRECACHE_URLS = MANIFEST.map((e) => e.url)

// Map a navigation request to its precached document.
// Next's native static export writes '/expenses' as '/expenses.html'
// (flat), NOT '/expenses/index.html'. Verified in Task 1.
function documentKeyFor(url) {
  const pathname = new URL(url).pathname
  if (pathname === '/' || pathname === '') return '/index.html'
  if (pathname.endsWith('.html')) return pathname
  return pathname.replace(/\/$/, '') + '.html'
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

// The update flow depends on this listener. Its absence is why the current
// "Update Now" button does nothing.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      caches
        .open(CACHE_NAME)
        .then((cache) =>
          cache
            .match(documentKeyFor(request.url))
            .then((cached) => cached || fetch(request))
            .catch(() => cache.match('/404.html') || cache.match('/index.html'))
        )
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).catch(() => Response.error())
    })
  )
})
```

- [ ] **Step 4: Delete the old service worker**

```bash
git rm public/sw.js
```

It must not live in `public/`, or Task 1's public-copy step (if `generate-out.js` was retained) would overwrite the generated `out/sw.js`.

- [ ] **Step 5: Wire the build step**

Change `build:web` in `package.json` to append the injection:

```json
"build:web": "next build && workbox injectManifest workbox.config.js",
```

If Task 1 retained `generate-out.js`, the order is `next build && node scripts/generate-out.js && workbox injectManifest workbox.config.js` — injection must run last, after `out/` is fully assembled.

- [ ] **Step 6: Confirm `public/_headers` keeps sw.js uncached**

It must contain:

```
/sw.js
  Cache-Control: max-age=0, must-revalidate
```

- [ ] **Step 7: Build and inspect the generated worker**

```bash
npm run build:web
grep -c '"url"' out/sw.js
head -20 out/sw.js
```

Expected: a populated manifest array with dozens of entries, and no remaining `self.__WB_MANIFEST` token.

- [ ] **Step 8: Verify offline behaviour manually**

```bash
npx serve out
```

Load `http://localhost:3000`, confirm in DevTools → Application → Service Workers that it is activated. Then check "Offline" and navigate to every route. Expected: all render from cache.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: rebuild service worker with workbox-generated precache manifest"
```

---

### Task 7: Consolidate install logic behind one hook

**Files:**
- Create: `app/hooks/useInstallPrompt.ts`, `app/hooks/__tests__/useInstallPrompt.test.tsx`
- Modify: `app/components/InstallButton.tsx`

**Interfaces:**
- Consumes: `npm test` from Task 4.
- Produces: `useInstallPrompt(): { canInstall: boolean; isInstalled: boolean; isIOS: boolean; install: () => Promise<'accepted' | 'dismissed' | 'unavailable'> }`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInstallPrompt } from '../useInstallPrompt'

function mockDisplayMode(standalone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(display-mode: standalone)' ? standalone : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })) as unknown as typeof window.matchMedia
}

describe('useInstallPrompt', () => {
  beforeEach(() => mockDisplayMode(false))

  it('reports installed when running standalone', () => {
    mockDisplayMode(true)
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.isInstalled).toBe(true)
    expect(result.current.canInstall).toBe(false)
  })

  it('becomes installable once beforeinstallprompt fires', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.canInstall).toBe(false)

    act(() => {
      const event = new Event('beforeinstallprompt') as Event & {
        prompt: () => Promise<void>
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
      }
      event.prompt = vi.fn().mockResolvedValue(undefined)
      event.userChoice = Promise.resolve({ outcome: 'accepted' as const })
      window.dispatchEvent(event)
    })

    expect(result.current.canInstall).toBe(true)
  })

  it('returns "unavailable" when install is called with no captured prompt', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.install()
    })
    expect(outcome).toBe('unavailable')
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
npm test
```

Expected: FAIL — cannot resolve `../useInstallPrompt`.

- [ ] **Step 3: Create `app/hooks/useInstallPrompt.ts`**

```ts
'use client'

import { useCallback, useEffect, useState } from 'react'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(detectStandalone)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))
    setIsInstalled(detectStandalone())

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstalled(false)
    }

    const onInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferredPrompt) return 'unavailable'
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') setIsInstalled(true)
    return outcome
  }, [deferredPrompt])

  return {
    canInstall: deferredPrompt !== null && !isInstalled,
    isInstalled,
    isIOS,
    install,
  }
}
```

Note the `appinstalled` listener is now removed on unmount — the current `InstallButton` adds it without cleanup, leaking a listener on every remount.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Rewrite `app/components/InstallButton.tsx`**

```tsx
'use client'

import { Download } from 'lucide-react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { showSuccess, showInfo } from '../utils/swal'

export function InstallButton() {
  const { canInstall, isInstalled, isIOS, install } = useInstallPrompt()

  if (isInstalled) return null

  const handleInstall = async () => {
    if (isIOS) {
      showInfo('To install on iOS: tap the Share button in Safari, then "Add to Home Screen".')
      return
    }

    const outcome = await install()
    if (outcome === 'accepted') {
      showSuccess('App installed successfully!')
    } else if (outcome === 'unavailable') {
      showInfo('To install: open the browser menu and choose "Install App" or "Add to Home Screen".')
    }
  }

  if (!canInstall && !isIOS) return null

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md active:scale-95"
      title="Install App"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Install</span>
    </button>
  )
}
```

- [ ] **Step 6: Verify**

```bash
npm test && npm run lint && npm run build:web
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: consolidate install logic into useInstallPrompt hook"
```

---

### Task 8: Rebuild the update flow

**Files:**
- Create: `app/components/UpdatePrompt.tsx`
- Modify: `app/components/ServiceWorkerRegistration.tsx`

**Interfaces:**
- Consumes: the `{ type: 'SKIP_WAITING' }` message contract from Task 6.

- [ ] **Step 1: Create `app/components/UpdatePrompt.tsx`**

```tsx
'use client'

import { RefreshCw } from 'lucide-react'

export function UpdatePrompt({ onUpdate, onDismiss }: { onUpdate: () => void; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-3 z-50"
    >
      <div className="flex items-center gap-2">
        <RefreshCw className="w-5 h-5 shrink-0" />
        <span className="font-medium text-sm">A new version is available.</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onDismiss}
          className="px-2 py-1.5 text-sm rounded hover:bg-blue-700 transition-colors"
        >
          Later
        </button>
        <button
          onClick={onUpdate}
          className="bg-white text-blue-600 px-3 py-1.5 rounded font-semibold text-sm hover:bg-blue-50 transition-colors"
        >
          Update
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace `app/components/ServiceWorkerRegistration.tsx` entirely**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { UpdatePrompt } from './UpdatePrompt'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

export function ServiceWorkerRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const reloadingRef = useRef(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let registration: ServiceWorkerRegistration | undefined
    let intervalId: ReturnType<typeof setInterval> | undefined

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') registration?.update()
    }

    const onControllerChange = () => {
      if (reloadingRef.current) return
      reloadingRef.current = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        registration = reg

        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting)
        }

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(installing)
              setDismissed(false)
            }
          })
        })

        intervalId = setInterval(() => reg.update(), UPDATE_CHECK_INTERVAL_MS)
        document.addEventListener('visibilitychange', onVisibilityChange)
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error)
      })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  if (!waitingWorker || dismissed) return null

  return (
    <UpdatePrompt
      onUpdate={() => waitingWorker.postMessage({ type: 'SKIP_WAITING' })}
      onDismiss={() => setDismissed(true)}
    />
  )
}
```

Three defects from the previous version are fixed here: the reload guard now survives re-renders via a ref (it was a local `let` that reset on every effect run), the interval and listeners are cleaned up, and SweetAlert2 is no longer used for updates.

- [ ] **Step 3: Verify the full update cycle**

```bash
npm run build:web && npx serve out
```

Load the app and let the worker activate. Then, in a second terminal, make a trivial visible change (edit a heading), rebuild, and reload the page once. Expected: the update prompt appears; clicking "Update" reloads exactly once and shows the change. Confirm in the Network tab that no reload loop occurs.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: rebuild service worker update flow with working SKIP_WAITING"
```

---

### Task 9: Offline indicator

**Files:**
- Create: `app/components/OfflineIndicator.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `app/components/OfflineIndicator.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const goOffline = () => setIsOffline(true)
    const goOnline = () => setIsOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 bg-slate-800 text-white text-sm px-4 py-2 flex items-center justify-center gap-2 z-50"
    >
      <WifiOff className="w-4 h-4" />
      <span>Offline — your data is saved on this device.</span>
    </div>
  )
}
```

The copy is deliberate: it reassures rather than warns, because offline is a supported state, not an error.

- [ ] **Step 2: Mount it in `app/layout.tsx`**

Add the import alongside the existing `ServiceWorkerRegistration` import:

```tsx
import { OfflineIndicator } from "./components/OfflineIndicator"
```

and render it in `<body>`:

```tsx
      <body className={`${inter.variable} antialiased font-sans`}>
        <OfflineIndicator />
        <BudgetProvider>{children}</BudgetProvider>
        <ServiceWorkerRegistration />
      </body>
```

- [ ] **Step 3: Verify**

```bash
npm run build:web && npx serve out
```

Toggle DevTools → Network → Offline. Expected: the banner appears and disappears with the toggle.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add offline status indicator"
```

---

### Task 10: Demo seed data and accurate app version

**Files:**
- Create: `app/utils/demo-data.ts`
- Modify: `app/settings/page.tsx`, `next.config.ts`

**Interfaces:**
- Consumes: `importData(data: Partial<AppState>)` from `BudgetContext` (`app/context/BudgetContext.tsx:1146`).
- Produces: `buildDemoData(): Partial<AppState>`

- [ ] **Step 1: Create `app/utils/demo-data.ts`**

```ts
import type { AppState, Account, Category, Expense, Income, SavingsGoal } from '../types'
import { DEFAULT_SETTINGS } from '../types'

function id(prefix: string, n: number) {
  return `demo-${prefix}-${n}`
}

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export function buildDemoData(): Partial<AppState> {
  const accounts: Account[] = [
    { id: id('acct', 1), name: 'Cash', type: 'cash', balance: 4500, color: '#22c55e', isDefault: true },
    { id: id('acct', 2), name: 'BPI Savings', type: 'bank', balance: 68200, color: '#3b82f6' },
    { id: id('acct', 3), name: 'GCash', type: 'e-wallet', balance: 3150, color: '#0070f3' },
  ]

  const categories: Category[] = [
    { id: id('cat', 1), name: 'Salary', type: 'income', color: '#22c55e', isDefault: true },
    { id: id('cat', 2), name: 'Freelance', type: 'income', color: '#8b5cf6' },
    { id: id('cat', 3), name: 'Rent', type: 'expense', color: '#ef4444', isBill: true },
    { id: id('cat', 4), name: 'Groceries', type: 'expense', color: '#84cc16' },
    { id: id('cat', 5), name: 'Transportation', type: 'expense', color: '#06b6d4' },
    { id: id('cat', 6), name: 'Dining Out', type: 'expense', color: '#fb923c' },
    { id: id('cat', 7), name: 'Subscriptions', type: 'expense', color: '#38bdf8' },
    { id: id('cat', 8), name: 'Electricity', type: 'expense', color: '#fbbf24', isBill: true },
  ]

  const incomes: Income[] = [
    { id: id('inc', 1), description: 'Monthly salary', amount: 62000, date: daysAgo(28), categoryId: id('cat', 1), accountId: id('acct', 2), isRecurring: true },
    { id: id('inc', 2), description: 'Monthly salary', amount: 62000, date: daysAgo(3), categoryId: id('cat', 1), accountId: id('acct', 2), isRecurring: true },
    { id: id('inc', 3), description: 'Logo design project', amount: 12500, date: daysAgo(11), categoryId: id('cat', 2), accountId: id('acct', 3) },
  ]

  const expenses: Expense[] = [
    { id: id('exp', 1), description: 'Apartment rent', amount: 18000, date: daysAgo(26), categoryId: id('cat', 3), accountId: id('acct', 2), expenseType: 'essential' },
    { id: id('exp', 2), description: 'Weekly groceries', amount: 3400, date: daysAgo(21), categoryId: id('cat', 4), accountId: id('acct', 1), expenseType: 'essential' },
    { id: id('exp', 3), description: 'Weekly groceries', amount: 2950, date: daysAgo(14), categoryId: id('cat', 4), accountId: id('acct', 1), expenseType: 'essential' },
    { id: id('exp', 4), description: 'Weekly groceries', amount: 3720, date: daysAgo(7), categoryId: id('cat', 4), accountId: id('acct', 1), expenseType: 'essential' },
    { id: id('exp', 5), description: 'Electricity bill', amount: 2840, date: daysAgo(18), categoryId: id('cat', 8), accountId: id('acct', 2), expenseType: 'essential' },
    { id: id('exp', 6), description: 'Grab to office', amount: 890, date: daysAgo(9), categoryId: id('cat', 5), accountId: id('acct', 3), expenseType: 'essential' },
    { id: id('exp', 7), description: 'Dinner with friends', amount: 1650, date: daysAgo(6), categoryId: id('cat', 6), accountId: id('acct', 1), expenseType: 'non-essential' },
    { id: id('exp', 8), description: 'Streaming subscriptions', amount: 749, date: daysAgo(5), categoryId: id('cat', 7), accountId: id('acct', 3), expenseType: 'non-essential' },
    { id: id('exp', 9), description: 'Emergency fund transfer', amount: 10000, date: daysAgo(3), categoryId: id('cat', 4), accountId: id('acct', 2), expenseType: 'savings' },
  ]

  const savingsGoals: SavingsGoal[] = [
    { id: id('goal', 1), name: 'Emergency Fund', targetAmount: 180000, currentAmount: 62000, color: '#22c55e' },
    { id: id('goal', 2), name: 'Japan Trip', targetAmount: 120000, currentAmount: 28500, deadline: '2027-03-01', color: '#3b82f6' },
  ]

  return {
    accounts,
    categories,
    incomes,
    expenses,
    savingsGoals,
    settings: DEFAULT_SETTINGS,
  }
}
```

- [ ] **Step 2: Add the Settings action**

In `app/settings/page.tsx`, add to the existing imports:

```tsx
import { buildDemoData } from '../utils/demo-data'
```

Pull `importData` from the budget context alongside whatever the page already destructures from it. Then add this handler:

```tsx
const handleLoadDemoData = async () => {
    const confirmed = await showConfirm(
        'Load demo data?',
        'This replaces all current data on this device with a realistic sample budget.'
    )
    if (!confirmed) return
    importData(buildDemoData())
    showSuccess('Demo data loaded.')
}
```

Check `app/utils/swal.ts` for the exact confirmation helper's name and signature before writing this; if it differs from `showConfirm`, use the actual export rather than adding a new one.

Render the action in the card that replaces the removed Install card:

```tsx
<Card>
    <div className="p-4">
        <h3 className="font-semibold mb-1">Demo Data</h3>
        <p className="text-sm text-gray-500 mb-3">
            Load a realistic sample budget to explore the app. This replaces your current data.
        </p>
        <Button onClick={handleLoadDemoData}>Load demo data</Button>
    </div>
</Card>
```

- [ ] **Step 3: Fix the hardcoded version**

`app/settings/page.tsx:415` reads `Version: 1.0.0` while `package.json` declares `0.1.0`. Expose the real value at build time by adding to `next.config.ts`:

```ts
import pkg from './package.json' with { type: 'json' }
```

and inside `nextConfig`:

```ts
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
```

Then replace the hardcoded line with:

```tsx
<p>Version: {process.env.NEXT_PUBLIC_APP_VERSION}</p>
```

If the JSON import assertion fails under this TypeScript configuration, fall back to `require('./package.json').version` in `next.config.ts` rather than reintroducing a literal.

- [ ] **Step 4: Verify**

```bash
npm run lint && npm run build:web && npx serve out
```

Open Settings, click "Load demo data", confirm. Expected: the dashboard shows populated charts, budgets, and transactions; the version reads `0.1.0`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add demo seed data and derive app version from package.json"
```

---

### Task 11: README and final verification

**Files:**
- Modify: `README.md`, `.github/copilot-instructions.md`
- Delete: `.github/agents/pwa web developer.agent.md`

- [ ] **Step 1: Capture a demo GIF**

Record a short screen capture: open the app, load demo data, install it, go offline, navigate a few routes. Save as `docs/demo.gif`.

- [ ] **Step 2: Rewrite `README.md`**

Structure, in this order:

1. One-line description: "A local-first budget tracker that installs like a native app and works with no network. Your data never leaves your device."
2. `![Budget Tracker](docs/demo.gif)`
3. Live demo link
4. **Features** — 50/30/20 budgeting, accounts, bills, credit cards, savings goals, Excel export
5. **Local-first** — all data in `localStorage`; no account, no server, no tracking; full offline support via a precached service worker
6. **Built with** — Next.js 16 (static export), React 19, TypeScript, Tailwind CSS v4, and **hand-built UI primitives in `app/components/ui/`** rather than a component library
7. **Getting started** — `npm install`, `npm run dev`, `npm test`, `npm run build:web`
8. **Architecture notes** — brief description of the service worker and the Workbox-generated precache manifest

Remove any references to Capacitor, mobile store deployment, or MSSQL.

- [ ] **Step 3: Update the stale agent docs**

```bash
git rm ".github/agents/pwa web developer.agent.md"
```

Edit `.github/copilot-instructions.md:12` to describe the current setup: a local-first static-export PWA with a hand-written service worker built by `workbox-cli`. Remove the Capacitor mention.

- [ ] **Step 4: Full verification pass**

```bash
npm test && npm run lint && npm run build:web && npx serve out
```

Then, in the browser:

- Lighthouse → run with the PWA category. Expected: installable, no PWA failures.
- Install the app from the header button.
- In the installed window, disable the network and visit every route: dashboard, accounts, bills, categories, credit cards, expenses, income, savings, settings, quick-add. Expected: all render.
- Confirm the offline banner appears while offline.
- Confirm both manifest shortcuts (Add Expense, Add Income) launch `/quick-add` with the correct type.

- [ ] **Step 5: Confirm the deletions actually landed**

```bash
grep -rni "capacitor\|mssql\|redux" --include=*.ts --include=*.tsx --include=*.json --include=*.md . \
  | grep -v node_modules | grep -v package-lock.json | grep -v docs/superpowers
```

Expected: no output. Any hit is a leftover reference to a deleted subsystem.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: rewrite README for local-first PWA positioning"
```

---

## Self-Review Notes

Spec coverage check against `2026-08-16-local-first-pwa-design.md`:

| Spec section | Task |
|---|---|
| §1 Deletions — backend | Task 2 |
| §1 Deletions — Capacitor | Task 2 |
| §1 Deletions — Redux | Task 2 |
| §1 Deletions — dead PWA code | Task 3 |
| §1 Deletions — Settings card | Task 3 |
| §1 Open item — `generate-out.js` | Task 1 |
| §2 Manifest | Task 5 |
| §2 Icons | Task 5 |
| §2 Service worker | Task 6 |
| §2 Build integration | Task 6 |
| §2 Headers | Task 6, Step 6 |
| §3 Install hook + button | Task 7 |
| §3 Update flow | Task 8 |
| §3 Offline indicator | Task 9 |
| §4 Seed data | Task 10 |
| §4 Version | Task 10 |
| §4 README | Task 11 |
| §5 Automated tests | Tasks 4, 7 |
| §5 Manual verification | Task 11 |

## Amendment — 2026-08-16, after Task 1

Task 1 resolved its open item: `next build` under `output: 'export'` produces
every route natively, plus `404.html` and RSC `.txt` payloads that
`scripts/generate-out.js` dropped. The script was deleted (commit `98a0d00`).

Consequence for Task 6, applied above: native export emits routes **flat**
(`/expenses.html`), not as directory indexes (`/expenses/index.html`). Three
edits followed — `documentKeyFor` now appends `.html`, the offline navigation
fallback prefers the now-existing `/404.html`, and `globIgnores` excludes
`**/*.txt` so per-route RSC payloads stay out of the precache.

Had this gone unnoticed, every navigation would have missed the precache and
fallen through to the network — the build would still pass, and offline support
would silently not work.

## Amendment — 2026-08-16, during Task 6

The Task 1 amendment above concluded that `documentKeyFor` should append
`.html`, mapping `/expenses` to the flat precache entry `/expenses.html`. That
conclusion was right about the *filenames* and wrong about the *URLs*, and it is
now reversed.

Verification against a real static server showed both `serve` and Netlify's
Pretty URLs answer `/expenses.html` with a **301 to `/expenses`**. Precaching the
`.html` form would therefore have stored a response with `redirected: true`, and
serving such a response for a navigation request throws:

> The FetchEvent resulted in a network error response: a redirected response was
> used for a request whose redirect mode is not "follow".

This is the failure Workbox ships `copyRedirectedCacheableResponsesPlugin` to
work around. It would have broken **every** offline navigation while leaving the
build, the injected manifest, and the URL count all looking healthy.

Three edits followed:

1. `workbox.config.js` gained a `manifestTransforms` entry rewriting
   `index.html` → `/` and `foo.html` → `/foo`, so precache keys are the URLs the
   hosts actually serve. (The option is `manifestTransforms` — plural and
   array-valued; the singular form fails validation.)
2. `documentKeyFor` simplified accordingly — a navigation's pathname now *is* its
   precache key, needing only trailing-slash and stray-`.html` normalisation. It
   is pinned by `app/__tests__/sw-routing.test.ts`, which evaluates the function
   out of the real `app/sw.js` source rather than a copy of it.
3. `404.html` was dropped from the precache and the offline fallback is now `/`.
   `/404` is not guaranteed to resolve on every static host, and one failing URL
   rejects the whole `cache.addAll` and aborts the install.

Verified by fetching all 67 precache URLs with `redirect: 'manual'`: all 200, no
redirects, so the install cannot cache a redirected response.

**Deviation from the spec, recorded here rather than silently applied:** the spec's §2 implies the service worker would call Workbox runtime helpers such as `precacheAndRoute`. It cannot — `workbox-cli injectManifest` performs token substitution without bundling, so the worker must not import npm packages. Task 6 therefore consumes the generated manifest array using plain Service Worker APIs. The division of labour the spec argued for is unchanged: Workbox generates content-hashed revisions, and nothing else.
