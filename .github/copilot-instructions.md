<!-- Copilot instructions for the Budget-Tracker repository -->

Purpose
-------
- Help AI coding agents become productive quickly in this repo by summarizing architecture, developer workflows, and project-specific patterns.

High-level architecture
-----------------------
- **Local-first, no backend.** There is no server, no database, and no API. All state lives in the browser's `localStorage` under the single key `budget-tracker-data`. Any change that adds a fetch to a server contradicts the architecture — raise it explicitly rather than implementing it.
- Frontend: Next.js 16 (App Router, `app/` directory), React 19, TypeScript strict, Tailwind CSS v4. One folder per route under `app/`; shared UI in `app/components/`.
- State: `app/context/BudgetContext.tsx` — a `useReducer` store that owns every mutation and persists to `localStorage`. Add features by adding actions there, not by introducing another state library.
- Static export: `next.config.ts` sets `output: 'export'`, so there are no runtime server components, no route handlers, no middleware, and `headers()` is unavailable. Cache headers go in `public/_headers`.
- PWA: `app/sw.js` is the service worker **source** (not a route). `workbox.config.js` drives `workbox-cli injectManifest`, which stamps a content-hashed precache manifest into it and writes `out/sw.js`.

Developer workflows & important commands
--------------------------------------
- `npm run dev` — Next.js dev server (http://localhost:3000). The service worker is **not** active here; use a production build to test offline behaviour.
- `npm run build:web` — `next build` followed by `workbox injectManifest`. This is the deploy command; plain `npm run build` skips the service worker and produces an `out/` that cannot work offline.
- `npx serve out` — serve the built output to test install/offline/update flows.
- `npm test` / `npm run test:watch` — Vitest + Testing Library (jsdom).
- `npm run lint` — ESLint via `eslint.config.mjs`.

The derived-balance model (read this before touching money)
----------------------------------------------------------
- **Account balances are DERIVED** — `openingBalance + Σ effectsOf(records)`. Never write `account.balance`; there is no such field. `openingBalance` is a plain user-editable seed, not a running total: only the account-editing actions may change it.
- **No reducer case may write an account balance.** If a change seems to need one, the change is wrong.
- **Every money movement must be a record.** Adding a new kind of movement means adding an `effectsOf` clause in `app/utils/balances.ts` and nothing else. Deleting a record reverses it exactly, for free — a delete case that also does arithmetic reverses it twice.
- **A bill does not move money.** Paying one creates an `Expense` carrying `billId`; `isPaid` is derived from that expense existing (`utils/balances.ts#isPaidBill`). There is no stored `isPaid`, `paidDate` or `paidFromAccountId` on a `Bill`.
- **Savings-goal progress is derived** by `utils/balances.ts#goalProgress`: the linked account's balance, or Σ contributions when unlinked. `SavingsGoal.currentAmount` is a migration remnant that nothing reads — do not start reading or writing it.
- **Deletes go through `app/utils/integrity.ts`** — cascade for credit cards and savings goals, block for accounts and categories. A blocked delete returns a typed `DeleteCheck` with a reason; surface it rather than reporting a false success.
- `app/utils/balances.ts` imports only from `../types`. Importing `BudgetContext` from it creates a cycle.
- Read balances through `balanceOf`/`computeBalanceMap`, not `computeBalances(state)[id] ?? 0`: for an unknown id of `'constructor'`/`'toString'` the bracket lookup resolves through `Object.prototype` and returns a function. Import data makes those ids reachable.
- `app/context/__tests__/balance-property.test.ts` enforces all of the above as properties, so a new reducer case is covered without a new test. It does **not** check effect signs — those are pinned by `app/utils/__tests__/balances.test.ts`.
- Migration lives in `app/utils/migrations.ts` and is pure; `BudgetContext` owns the I/O, including the one-time `budget-tracker-data.v1-backup`. Its ordering (bills backfilled before opening balances are derived) is load-bearing — see the file header.

Project-specific conventions & patterns
-------------------------------------
- **Money is a plain `number`.** Known limitation, documented in the README. Don't silently change the representation; it would need a migration for existing `localStorage` data.
- **Savings figures come from `savingsContributions`, not expenses.** `calculateBudgetSummary` in `app/utils/index.ts` derives `savingsActual` only from contributions, so an expense tagged `expenseType: 'savings'` counts toward no bucket at all. This is existing behaviour, pinned by tests.
- **`IMPORT_DATA` appends, it does not replace.** To replace state, dispatch a reset first — see `handleLoadDemoData` in `app/settings/page.tsx`.
- **The service worker must not import anything.** `injectManifest` substitutes the `self.__WB_MANIFEST` token without bundling, so `import`/`require` in `app/sw.js` will break at runtime.
- **Precache keys are extensionless URLs.** Static hosts 301 `/expenses.html` to `/expenses`, and caching a redirected response makes the browser refuse to serve it for a navigation. `workbox.config.js` rewrites the flat export filenames accordingly.
- Browser state (connectivity, display-mode) is read via `useSyncExternalStore`, not copied into React state from an effect.
- Dialogs use the helpers in `app/utils/swal.ts` rather than SweetAlert2 directly.

Files to inspect first (quick tour)
---------------------------------
- `README.md` — architecture rationale and known limitations.
- `app/context/BudgetContext.tsx` — the reducer; the centre of the app.
- `app/types/index.ts` — every domain type and the defaults.
- `app/utils/index.ts` — budget maths, including `calculateBudgetSummary`.
- `app/sw.js` + `workbox.config.js` — offline behaviour.
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — the design and implementation record for the local-first repositioning, including recorded deviations and why they were made.

Notes for contributors / AI agents
---------------------------------
- Prefer small, focused changes. Preserve App Router conventions.
- There are no secrets in this repo and no environment variables to configure. If a change appears to need either, that is a signal it conflicts with the local-first design.
- Verify PWA changes with `npm run build:web && npx serve out`, then load once and navigate with DevTools set to Offline.
