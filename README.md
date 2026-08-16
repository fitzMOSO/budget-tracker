# Kaching

A local-first personal finance app built around the 50/30/20 budgeting rule. It installs like a native app, works completely offline, and never sends your financial data anywhere — everything lives in your own browser.

> **Try it without typing anything:** open **Settings → Demo Data → Load demo data** to fill the app with a realistic sample month.

<!-- TODO: replace with a screen recording of the dashboard + offline mode -->

> **Portfolio demo, not open source.** The code is readable as a work sample and
> clonable to run the demo locally; it is not offered for reuse. See [LICENSE](LICENSE).

## Why local-first

Budgeting data is about as personal as it gets. Most trackers answer that by asking you to trust a server; this one answers it by not having one.

Every byte lives in `localStorage` under a single key. There is no account, no sync, no telemetry, and no backend to breach — which also means the whole app is a pile of static files, so a service worker can precache all of it and the app keeps working with the network switched off.

The trade-off is deliberate and worth stating plainly: **your data is tied to one browser on one device.** Settings → Data Management exports a JSON backup and re-imports it, which is how you move between devices.

## Features

- **50/30/20 budgeting** — income split across essentials, non-essentials, and savings, with progress against each bucket
- **Accounts** — cash, bank, and e-wallet balances with transfers between them; every balance is derived from the records, never stored
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

Full detail, with exact pins, in [STACK.md](STACK.md).

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

## How balances work

**An account balance is derived, never stored.**

```
balance(account) = account.openingBalance + Σ effects of every record referencing it
```

`openingBalance` is a real, user-editable field — the money that was in the account before the app knew about it. Everything after that is the sum of records: incomes credit, expenses debit, transfers debit one account and credit the other, savings contributions move money out of the funding account, and a credit-card statement debits the account that paid it. There is no `account.balance` field to disagree with the records, so a balance cannot drift from the transactions that produced it.

The consequences worth knowing:

- **A bill never moves money.** Paying a bill creates a linked expense (`Expense.billId`), and that expense *is* the payment. Whether a bill is paid is derived from whether such an expense exists — there is no stored `isPaid`.
- **Savings-goal progress is derived too.** A goal linked to an account reports that account's balance; an unlinked goal reports the sum of its own contributions.
- **Deletes.** Deleting a credit card or a savings goal cascades to its statements or contributions. Deleting an account or a category is *blocked* while records still reference it, and the app tells you how many and why. Deleting any single record — including a transfer — reverses its effect exactly, because the balance is recomputed from what remains.

### The migration, and what it cannot recover

Existing data is migrated once, on load, from the old stored-balance model. Before anything is changed, a one-time backup is written to `budget-tracker-data.v1-backup` and **never overwritten** — that is the escape hatch if the migration got something wrong.

The migration seeds each account with:

```
openingBalance = oldStoredBalance − Σ effects of existing records
```

so the number on screen the day after the migration is the same as the day before. Read that formula carefully, because it has a deliberate consequence:

- **Balances that were already wrong stay wrong**, with the error folded silently into `openingBalance`. If your old stored balance had drifted from your transactions — which is exactly the bug this model removes — the drift is now part of your opening balance. It is correctable: edit the account and set `openingBalance` to what it should be. The alternative, seeding from zero, would be more truthful but would silently restate your history, and the correct value is simply unknowable from the stored data.
- **Past transfers are unrecoverable.** The old code moved money between accounts without writing a record, so those transfers left no trace at all. They cannot be reconstructed and are absorbed into `openingBalance` along with everything else.

### Known migration caveat

Bills used to store their own payment fields, so the migration has to turn each paid bill into the expense that represents its payment — without duplicating an expense the app already auto-created for it. It matches on amount + date + `accountId` + the note `Auto-created from bill payment`.

That heuristic is exact for untouched data and misses in two cases:

- **An edited paid bill.** If you changed a paid bill's `paidDate` or its notes, the match fails and the migration adds a second, `mig-`-prefixed expense next to the original. This **inflates expense reports** but **not balances** — the opening-balance formula above subtracts every effect, including the duplicate's, so the account balance is still exact.
- **A bill paid with no category.** It gains an uncategorised `mig-` expense, because the money did move and an expense is the only place to record that.

Both are inherent to reconstructing a record that was never written down. Neither can make a balance wrong.

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
- Balances are reconstructed from records, so anything that was never recorded cannot be reconstructed. Pre-migration transfers were never written down and are folded into `openingBalance`, as is any drift your old stored balance already had. See [How balances work](#how-balances-work); both are fixed by editing the account's opening balance.

## License

**Portfolio demo, not open source.** The code is published so it can be read as a
work sample, and cloned to run the demo locally. It is not offered for reuse.
See [LICENSE](LICENSE).

(This section previously said "MIT" while no LICENSE file existed — the claim was
never backed by anything in the repository.)
