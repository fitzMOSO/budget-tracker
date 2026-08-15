# Derived Account Balances & Referential Integrity — Design

**Date:** 2026-08-16
**Status:** approved (pending implementation plan)
**Scope:** root causes **A** (balance ownership) and **B** (referential integrity) from the 2026-08-16 flow audit. Root cause **D** (persistence safety) ships first as a separate change. **C** (date/timezone), **E** (validation), **F** (per-screen derived totals) get their own specs later.

## Problem

`Account.balance` is a stored running total maintained by hand in **17 write sites** across 37 reducer cases in `app/context/BudgetContext.tsx`. Every mutation must remember to apply *and* reverse it; the sites disagree. Confirmed consequences:

- Paying a categorized bill debits the account twice — `PAY_BILL` deducts, then `bills/page.tsx:167-180` calls `addExpense`, which deducts again.
- Credit-card payments never debit any account — `UPDATE_STATEMENT` is a pure list swap despite the UI collecting `paidFromAccountId`.
- Editing a paid bill's amount, then unpaying, refunds the *new* amount — money created from nothing.
- Deleting a savings goal orphans its contributions; deleting an orphan then refunds the source while the destination keeps the credit — money created from nothing.
- Savings goals linked to an account drift, because only some mutations re-sync `currentAmount`.

The unifying cause: **a stored aggregate that must be reversed by hand in many places.**

A second, load-bearing discovery: **there is no `Transfer` entity.** `TRANSFER_FUNDS` mutates two balances and stores no record of itself. Its only persistent trace is the savings contributions it fabricates for linked goals; if neither account is linked to a goal, a transfer leaves zero evidence. Derived balances are impossible until this is recorded.

## Decision

Stop storing the balance. Derive it.

### The effect model

One pure function is the architecture:

```ts
type BalanceEffect = { accountId: string; delta: number }

function effectsOf(record: BalanceAffectingRecord): BalanceEffect[]
```

One clause per record type:

| Record | Effects |
|---|---|
| Income | `+amount` → `accountId` |
| Expense | `−amount` → `accountId` |
| Transfer | `−amount` → `fromAccountId`, `+amount` → `toAccountId` |
| Savings contribution | `−amount` → `fromAccountId`, `+amount` → goal's `linkedAccountId` (when set and different) |
| Credit-card statement | `−amountPaid` → `paidFromAccountId` |

Balance becomes a single reduction:

```ts
balanceOf(account) = account.openingBalance
                   + Σ effectsOf(r).filter(e => e.accountId === account.id).delta
```

Memoized over the record collections. No reducer case writes `accounts` again. `UPDATE_ACCOUNT_BALANCE` and the apply/reverse arithmetic at all 17 sites are **deleted**.

A savings goal's `currentAmount` for a linked account is derived by the same rule, removing the sync-drift class.

### Why this over a centralized applier

A centralized `applyEffects` helper would concentrate the arithmetic but preserve the *concept* of reversal, so a future action that forgets to declare its effects reintroduces the bug. Deriving makes the class unrepresentable: each record contributes exactly once by construction, and there is no reversal to forget. It also defuses the orphan money-minting bug for free — an orphaned record simply stops contributing.

### Required new records

The model only holds if every movement is a record.

1. **`Transfer`** becomes a first-class entity:
   ```ts
   interface Transfer {
     id: string
     fromAccountId: string
     toAccountId: string
     amount: number
     date: string      // YYYY-MM-DD
     notes?: string
   }
   ```
   Transfers stop fabricating savings contributions. A linked goal's progress already follows its account's derived balance, so the fabrication was double-counting (audit #13).

2. **`Expense.billId?: string`** links a payment to its bill. **A bill never moves money; paying a bill creates the expense, and the expense is the movement.** `Bill.isPaid` becomes derived — "a linked expense exists". Unpaying deletes that expense.

   This collapses the double-debit at the model level and removes the dashboard-vs-bills-page divergence, because only one payment path remains.

## Migration

Constraint: **assume real data exists; migrate it; never destroy it.**

1. **Back up first.** Copy the pre-migration blob to `budget-tracker-data.v1-backup`. Never overwritten.
2. **Introduce `schemaVersion`** on the persisted state plus a migration runner keyed off it. This also fixes the audit's finding that an older stored shape crashes at render instead of migrating.
3. **Seed opening balances** so nothing visibly changes:
   ```
   openingBalance = currentBalance − Σ effectsOf(existing records)
   ```
   Every displayed balance is identical immediately after migration.
4. **Backfill** `Bill.isPaid` → a linked `Expense` with `billId` where a paid bill has `paidFromAccountId`, deduplicating against any auto-created expense already present (match on amount + date + accountId + `Auto-created from bill payment` note).

### Accepted trade-off

Seeding from `currentBalance` **preserves balances that are currently wrong** (e.g. from past double-debits) by folding the error into `openingBalance`. The alternative — seeding from zero — would be more truthful but silently restates history, and the correct value is unknowable from stored data.

Mitigation: `openingBalance` is a **visible, editable field** on the account form, so a wrong number is correctable rather than mysterious.

**Unrecoverable:** past transfers left no record and cannot be reconstructed. They are absorbed into `openingBalance`. Stated here so it is not discovered later as a bug.

## Referential integrity

Deriving balances removes the *money* consequence of orphans. What remains is making deletes do what the UI already promises. One declarative table, enforced **in the reducer** so no caller can bypass it:

| Parent | Children | On delete |
|---|---|---|
| Credit card | statements | cascade — the dialog already promises this |
| Savings goal | contributions | cascade — ditto |
| Account | incomes, expenses, transfers, contributions | block if referenced |
| Category | expenses, incomes, bills | block if referenced |

Bills are deliberately absent from the account row: once a bill no longer moves money, `Bill.paidFromAccountId` is redundant with the linked expense's `accountId` and is dropped during migration. An account referenced only by a bill payment is therefore protected via that expense.

Category **blocks** rather than reassigning: there is no real "Uncategorized" record today, only a display fallback, and blocking is consistent with how accounts already behave. This also fixes the dangling-`categoryId` bug where the edit form silently re-saves a dead id.

A blocked delete returns a typed error the UI surfaces — not a silent no-op.

## Testing

The invariant the design buys:

> An account's balance changes **only** when a record referencing it is added, edited, or removed.

- **Property test:** apply arbitrary sequences of add/update/delete operations; assert `balance == openingBalance + Σ effectsOf(records)` after each. Double-debit and missing-reversal fail this automatically, including for operations not yet written.
- **Unit test per `effectsOf` clause.**
- **Regression tests** pinning each confirmed audit bug: bill double-debit, credit-card payment not debiting, orphan-contribution minting, paid-bill-edit refund inflation.
- **Migration tests:** a v1 blob yields byte-identical balances; the backup key is written; a corrupt blob never produces empty persisted state.
- **Integrity tests:** each cascade and each block, asserted at the reducer.
- The existing 39 tests stay green.

## Out of scope

Deferred to their own specs, with the audit findings they cover:

- **C — dates/timezone:** recurring-bill duplication (local date serialized via `toISOString`), wrong-month filing, Excel UTC-vs-local drift.
- **E — validation:** negative/zero amounts accepted on full pages but rejected in quick paths; quick paths skipping auto-bill creation.
- **F — per-screen derived totals:** three different "total expenses", three credit-card debt figures, utilization never derived from statements.
- Money stored as floats rather than integer minor units (carried over from the local-first PWA spec).

## Dependencies

**D (persistence safety) ships first**, as a separate change: a failed `JSON.parse` currently writes empty state over the damaged blob, and `RESET_STATE` leaves the app with zero categories and accounts permanently. The migration runner in this spec assumes that load path is already safe.
