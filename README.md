# Budget Tracker

A local-first personal finance app built around the 50/30/20 budgeting rule. It installs like a native app, works completely offline, and never sends your financial data anywhere — everything lives in your own browser.

> **Try it without typing anything:** open **Settings → Demo Data → Load demo data** to fill the app with a realistic sample month.

<!-- TODO: replace with a screen recording of the dashboard + offline mode -->

## Why local-first

Budgeting data is about as personal as it gets. Most trackers answer that by asking you to trust a server; this one answers it by not having one.

Every byte lives in `localStorage` under a single key. There is no account, no sync, no telemetry, and no backend to breach — which also means the whole app is a pile of static files, so a service worker can precache all of it and the app keeps working with the network switched off.

The trade-off is deliberate and worth stating plainly: **your data is tied to one browser on one device.** Settings → Data Management exports a JSON backup and re-imports it, which is how you move between devices.

## Features

- **50/30/20 budgeting** — income split across essentials, non-essentials, and savings, with progress against each bucket
- **Accounts** — cash, bank, and e-wallet balances with transfers between them
- **Income & expenses** — categorised, account-attributed, with recurring entries
- **Bills** — due dates, paid/unpaid state, recurring bills
- **Credit cards** — statements with partial and full payment tracking
- **Savings goals** — targets, deadlines, and contributions
- **Excel export** — a multi-sheet analytics report
- **Installable PWA** — full offline use, an install prompt, and an update flow

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, `output: 'export'`) |
| UI | React 19, Tailwind CSS v4, Recharts, lucide-react |
| Language | TypeScript (strict) |
| State | React Context + `useReducer`, persisted to `localStorage` |
| Offline | Custom service worker, precache manifest via `workbox-cli` |
| Tests | Vitest + Testing Library (jsdom) |
| Hosting | Netlify (static) |

No backend, no database, no state-management library.

## Getting started

```bash
npm install
npm run dev            # http://localhost:3000
```

```bash
npm test               # unit tests
npm run lint
npm run build:web      # static export + service worker
```

### Trying the offline behaviour

The service worker is only present in a production build, so `npm run dev` won't show it:

```bash
npm run build:web
npx serve out
```

Load the page once, then tick **Offline** in DevTools → Network and navigate around. Every route keeps working, and an "Offline" banner confirms your data is safe on the device.

## How the PWA works

`npm run build:web` runs two steps: `next build` produces the static export, then `workbox injectManifest` stamps a content-hashed list of every asset into [`app/sw.js`](app/sw.js) and writes the result to `out/sw.js`.

A few decisions worth knowing if you're reading the source:

- **The worker imports nothing.** `injectManifest` substitutes the `self.__WB_MANIFEST` token but does not bundle, so the worker uses plain Service Worker APIs rather than Workbox's runtime helpers.
- **The cache name is derived from the manifest hash**, so any content change produces a new cache and the old one is deleted on activate. No manual version bumping.
- **Precache keys are extensionless URLs**, not the flat `expenses.html` filenames Next emits. Static hosts 301 `/expenses.html` to `/expenses`, and caching a redirected response makes the browser refuse to serve it for a navigation. See [`workbox.config.js`](workbox.config.js).
- **`/sw.js` is served with `max-age=0`** via [`public/_headers`](public/_headers), so clients are never pinned to a stale worker.
- **Updates are opt-in.** A new worker waits; the app shows a dismissible prompt, and only on "Update" does it post `SKIP_WAITING` and reload exactly once.

## Project structure

```
app/
  components/     UI, dashboard widgets, PWA affordances
  context/        BudgetContext — reducer, persistence, all mutations
  hooks/          useInstallPrompt
  utils/          budget maths, Excel export, demo data
  types/          shared domain types
  sw.js           service worker source (not a route)
  <route>/        one folder per page
public/
  _headers        Netlify cache headers
  manifest.json   web app manifest
workbox.config.js precache manifest generation
```

## Known limitations

Stated rather than hidden:

- Money is stored as JavaScript `number`, so long chains of arithmetic can drift by fractions of a cent. Migrating to integer minor units is the right fix and is not yet done.
- Data lives in one browser profile. Use export/import to move it.
- Multi-currency is a display setting; there is no conversion.

## License

MIT
