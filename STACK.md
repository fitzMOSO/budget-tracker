# Tech Stack

Kaching — a Next.js budget tracker with **no backend at all**.

That is the defining fact of this stack, not a footnote. There is no `app/api/`
directory, no database client, no auth provider and no server-side rendering at
request time. Everything below exists to produce a folder of static files that
runs entirely in the browser.

## Repository layout

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router — routes, components, context, utils, service worker source |
| `app/context/BudgetContext.tsx` | The entire application state: one reducer, all mutations, localStorage persistence |
| `app/utils/` | Balances, migrations, integrity checks, backup, Excel export, demo data |
| `public/` | Manifest, icons, `_headers`, OG card |
| `workbox.config.js` | Precache manifest injection for the service worker |
| `docs/` | Design and decision notes |

---

## Core

- **Next.js 16.1.4** with the App Router
- **React 19.2.3** + **React DOM 19.2.3**
- **TypeScript ^5** (strict)
- **Tailwind CSS v4** via `@tailwindcss/postcss`

### Static export

`next.config.ts` sets **`output: 'export'`**. Consequences worth knowing before
editing anything:

- `images: { unoptimized: true }` is **required**, not a preference — the Next
  image optimizer needs a server.
- `headers()` in `next.config.ts` **does nothing** under static export. Cache
  headers live in `public/_headers` and `netlify.toml` instead. `/sw.js` in
  particular must be served `max-age=0` or clients get pinned to a stale worker.
- `NEXT_PUBLIC_APP_VERSION` is injected from `package.json`'s `version` field by
  `next.config.ts` — it is not read from a `.env` file.

---

## Libraries

| Package | Version | Used for |
|---|---|---|
| `recharts` | ^3.7.0 | Dashboard charts |
| `date-fns` | ^4.1.0 | Date maths for bills, statements and recurrence |
| `lucide-react` | ^0.563.0 | Icons |
| `sweetalert2` | ^11.26.17 | Confirm modals and toasts |
| `xlsx` | ^0.18.5 | Multi-sheet Excel export |
| `uuid` | ^13.0.0 | Record identifiers |
| `clsx` + `tailwind-merge` | ^2.1.1 / ^3.4.0 | Conditional class composition |

**No state library.** A single `useReducer` in `BudgetContext.tsx` holds
everything and persists to `localStorage`. There is no Redux, Zustand or query
cache, because there is no server to synchronise with.

---

## Persistence

`localStorage`, in one browser profile. Not IndexedDB, not a server.

**Account balances are derived, never stored** — reconstructed from the records
on read. This is the single most important invariant in the codebase and there
are property-based tests guarding it (`app/context/__tests__/balance-invariant`,
`balance-property`). `app/utils/migrations.ts` upgrades older saved shapes
forward, and `app/utils/integrity.ts` checks referential consistency.

---

## PWA

- Service worker **source** is `app/sw.js`; `workbox injectManifest` substitutes
  `self.__WB_MANIFEST` and writes `out/sw.js` during `npm run build:web`.
- The worker **imports nothing** — `injectManifest` substitutes but does not
  bundle, so it uses plain Service Worker APIs, not Workbox runtime helpers.
- The cache name is derived from the manifest hash, so any content change makes a
  new cache and the old one is deleted on activate. No manual version bumping.
- Precache keys are **extensionless URLs**, not the `expenses.html` filenames
  Next emits — static hosts 301 `/expenses.html` → `/expenses`, and a cached
  redirected response is refused for navigations.
- Updates are opt-in: a new worker waits and the app shows a dismissible prompt.

---

## Tooling & tests

- **Vitest 4.1.10** + **jsdom 30** + Testing Library (`react` 16.3.2,
  `jest-dom` 7.0.1, `user-event` 14.6.4). Config in `vitest.config.mts`.
- Substantial suite: service-worker routing, balance invariants and property
  tests, backup round-trips, bill payment, transfers, statement payments,
  migrations, integrity.
- **ESLint 9** flat config (`eslint.config.mjs`) with `eslint-config-next`.

### Scripts

| Script | Does |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` — static export to `out/`, **no service worker** |
| `build:web` | `next build && workbox injectManifest` — the deployable build |
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |

> Deploy with **`build:web`**, not `build`. Plain `build` produces a valid site
> with no service worker, which silently removes offline support — the app's
> whole point — while still deploying green.

---

## Deployment

Netlify, `command = "npm ci && npm run build:web"`, `publish = "out"`.

No functions directory and **no environment variables** — there is nothing
server-side to configure and no secrets to hold. This is why the repository has
no `.env.example`: an empty one would imply configuration that does not exist.
