# Derived Account Balances & Referential Integrity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Account.balance` a derived value computed from the records that move money, so double-debit and missing-reversal bugs become structurally impossible.

**Architecture:** One pure function `effectsOf(record) => BalanceEffect[]` declares how each record moves money. `computeBalances(state)` folds `openingBalance + Σ effects` for every account. All 17 hand-written balance mutations in the reducer are deleted. Two records become load-bearing: a first-class `Transfer` entity (transfers currently persist nothing), and `Expense.billId` (a bill stops moving money; the expense it creates is the movement).

**Tech Stack:** Next.js 16.1.4 (App Router, `output: 'export'`), React 19.2.3, TypeScript 5 strict, Vitest 4 + jsdom + Testing Library, `uuid` v4, localStorage as the only datastore.

**Spec:** `docs/superpowers/specs/2026-08-16-derived-account-balances-design.md`

## Global Constraints

- **Never destroy user data.** Real data is assumed to exist. Migration writes a backup to `budget-tracker-data.v1-backup` before any transformation, and never overwrites that key.
- **Balances must be byte-identical immediately after migration.** `openingBalance = currentBalance − Σ effectsOf(existing records)`, computed *after* the bill→expense backfill.
- Storage key stays `budget-tracker-data`. New field `schemaVersion` on the persisted object. `CURRENT_SCHEMA_VERSION = 2`.
- Money remains a JS `number` (float). Migrating to integer minor units is explicitly out of scope.
- No reducer case may write `state.accounts[].balance` after Task 5. The property test in Task 9 enforces this.
- Existing suite is **39 tests**; it stays green at every commit.
- `app/sw.js` must not `import` anything (workbox `injectManifest` substitutes but does not bundle). Untouched by this plan, listed so nobody "helpfully" refactors it.
- Branch: `fix/data-integrity`. An uncommitted service-worker dev fix (`app/components/ServiceWorkerRegistration.tsx` + `app/components/__tests__/ServiceWorkerRegistration.test.tsx`) is in the working tree — commit it separately before starting Task 1 so it does not get entangled in these diffs.

## File Structure

| File | Responsibility |
|---|---|
| `app/types/index.ts` | Add `Transfer`, `Account.openingBalance`, `Expense.billId`, `AppState.transfers`, `AppState.schemaVersion`. Drop `Bill.paidFromAccountId` (Task 6). |
| `app/utils/balances.ts` *(new)* | `BalanceEffect`, per-record `effectsOf*`, `allEffects`, `computeBalances`, `balanceOf`. Pure; no React, no storage. |
| `app/utils/migrations.ts` *(new)* | `CURRENT_SCHEMA_VERSION`, `migrate(raw)`, `backupKeyFor`. Pure transformation; caller does the I/O. |
| `app/utils/integrity.ts` *(new)* | `RELATIONSHIPS` table, `checkDelete(state, entity, id)`, `cascadeDelete(state, entity, id)`. |
| `app/context/BudgetContext.tsx` | Load/save safety, seed extraction, reducer cases lose all balance arithmetic, expose `balances` + `balanceOf`. |
| `app/utils/index.ts` | `calculateBudgetSummary` unchanged in this plan; goal progress switches to derived balances (Task 10). |

---

### Task 1: Persistence safety (root cause D)

Lands first: the migration runner in Task 4 assumes a load path that cannot wipe data.

**Files:**
- Modify: `app/context/BudgetContext.tsx:104-105` (`RESET_STATE`), `app/context/BudgetContext.tsx:944-987` (load/save effects)
- Test: `app/context/__tests__/persistence.test.tsx` *(new)*

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `seedState(): AppState` — exported from `BudgetContext.tsx`, returns `initialState` plus freshly-id'd default categories and accounts. Task 4 reuses it.

- [ ] **Step 1: Write the failing tests**

```tsx
// app/context/__tests__/persistence.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BudgetProvider, useBudget } from '../BudgetContext'

const STORAGE_KEY = 'budget-tracker-data'

function Probe() {
    const { state } = useBudget()
    return (
        <div>
            <span data-testid="categories">{state.categories.length}</span>
            <span data-testid="accounts">{state.accounts.length}</span>
        </div>
    )
}

describe('persistence safety', () => {
    beforeEach(() => localStorage.clear())

    it('does not overwrite unparseable stored data', async () => {
        const corrupt = '{"categories":[{"id":"a"' // truncated JSON
        localStorage.setItem(STORAGE_KEY, corrupt)

        render(<BudgetProvider><Probe /></BudgetProvider>)
        await waitFor(() => expect(screen.getByTestId('categories')).toBeInTheDocument())

        // The damaged blob must still be there for manual recovery.
        expect(localStorage.getItem(STORAGE_KEY)).toBe(corrupt)
    })

    it('seeds default categories and accounts on first run', async () => {
        render(<BudgetProvider><Probe /></BudgetProvider>)
        await waitFor(() => {
            expect(Number(screen.getByTestId('categories').textContent)).toBeGreaterThan(0)
            expect(Number(screen.getByTestId('accounts').textContent)).toBeGreaterThan(0)
        })
    })
})
```

And a pure-reducer test for reset, in the same file:

```tsx
import { budgetReducer, seedState } from '../BudgetContext'

it('RESET_STATE re-seeds defaults rather than emptying the app', () => {
    const populated = seedState()
    const reset = budgetReducer(populated, { type: 'RESET_STATE' })

    expect(reset.categories.length).toBeGreaterThan(0)
    expect(reset.accounts.length).toBeGreaterThan(0)
    expect(reset.expenses).toEqual([])
    expect(reset.incomes).toEqual([])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/context/__tests__/persistence.test.tsx`
Expected: FAIL — `budgetReducer` and `seedState` are not exported, and the corrupt-data test fails because the save effect overwrites the blob with empty state.

- [ ] **Step 3: Extract the seed helper and export the reducer**

In `app/context/BudgetContext.tsx`, add above the reducer:

```ts
export function seedState(): AppState {
    return {
        ...initialState,
        categories: [
            ...defaultIncomeCategories.map((c) => ({ ...c, id: uuidv4() })),
            ...defaultExpenseCategories.map((c) => ({ ...c, id: uuidv4() })),
        ],
        accounts: defaultAccounts.map((a) => ({ ...a, id: uuidv4() })),
    }
}
```

Change `function budgetReducer(` to `export function budgetReducer(`.

- [ ] **Step 4: Make RESET_STATE re-seed**

Replace `app/context/BudgetContext.tsx:104-105`:

```ts
        case 'RESET_STATE':
            return { ...seedState(), settings: state.settings }
```

Settings are preserved deliberately: currency choice is a preference, not data.

- [ ] **Step 5: Stop the save effect from clobbering unreadable data**

Add a ref beside the other provider state:

```ts
const loadFailedRef = useRef(false)
```

In the load effect's `catch`, replace the bare `console.error` with:

```ts
        } catch (error) {
            console.error('Error loading state from localStorage:', error)
            loadFailedRef.current = true
        } finally {
```

Then guard the save effect:

```ts
    useEffect(() => {
        if (loadFailedRef.current) return // never overwrite data we could not read
        if (isInitialized && !isLoading) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
            } catch (error) {
                console.error('Error saving state to localStorage:', error)
            }
        }
    }, [state, isLoading, isInitialized])
```

Replace the first-run `else` branch body with `dispatch({ type: 'LOAD_STATE', payload: seedState() })` so there is one seeding path.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run app/context/__tests__/persistence.test.tsx` → PASS (3 tests)
Run: `npm test` → PASS (42 tests)

- [ ] **Step 7: Commit**

```bash
git add app/context/BudgetContext.tsx app/context/__tests__/persistence.test.tsx
git commit -m "fix: stop corrupt storage wiping data and reset bricking the app"
```

---

### Task 2: The effect model

Pure functions only. Nothing is wired up yet, so this task cannot break the running app.

**Files:**
- Create: `app/utils/balances.ts`
- Modify: `app/types/index.ts` (add `Transfer`, `Account.openingBalance`, `AppState.transfers`)
- Test: `app/utils/__tests__/balances.test.ts` *(new)*

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type BalanceEffect = { accountId: string; delta: number }`
  - `effectsOfIncome(income: Income): BalanceEffect[]`
  - `effectsOfExpense(expense: Expense): BalanceEffect[]`
  - `effectsOfTransfer(transfer: Transfer): BalanceEffect[]`
  - `effectsOfContribution(c: SavingsContribution, goalsById: Map<string, SavingsGoal>): BalanceEffect[]`
  - `effectsOfStatement(s: CreditCardStatement): BalanceEffect[]`
  - `allEffects(state: AppState): BalanceEffect[]`
  - `computeBalances(state: AppState): Record<string, number>`
  - `balanceOf(state: AppState, accountId: string): number`

- [ ] **Step 1: Add the types**

In `app/types/index.ts`, add `openingBalance` to `Account` and a `Transfer` interface:

```ts
export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'e-wallet' | 'other';
  /** Seed value; the live balance is derived, never stored. */
  openingBalance: number;
  color?: string;
  isDefault?: boolean;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
}
```

Remove `balance: number` from `Account`. Add to `AppState`:

```ts
  transfers: Transfer[];
  schemaVersion: number;
```

Update `DEFAULT_ACCOUNTS` entries from `balance: 0` to `openingBalance: 0`.

- [ ] **Step 2: Write the failing test**

```ts
// app/utils/__tests__/balances.test.ts
import { describe, it, expect } from 'vitest'
import { effectsOfIncome, effectsOfExpense, effectsOfTransfer, effectsOfContribution, effectsOfStatement, computeBalances } from '../balances'
import type { AppState, SavingsGoal } from '../../types'

const emptyState = (): AppState => ({
    categories: [], accounts: [], incomes: [], expenses: [], bills: [],
    creditCards: [], creditCardStatements: [], savingsGoals: [],
    savingsContributions: [], monthlyBudgets: [], transfers: [],
    schemaVersion: 2,
    settings: { currency: 'PHP', currencySymbol: '₱', defaultEssentialsPercentage: 50, defaultNonEssentialsPercentage: 30, defaultSavingsPercentage: 20, theme: 'light' },
})

describe('effectsOf', () => {
    it('credits the account for income', () => {
        expect(effectsOfIncome({ id: 'i1', description: 'Pay', amount: 1000, date: '2026-08-01', categoryId: 'c1', accountId: 'a1' }))
            .toEqual([{ accountId: 'a1', delta: 1000 }])
    })

    it('debits the account for an expense', () => {
        expect(effectsOfExpense({ id: 'e1', description: 'Food', amount: 250, date: '2026-08-01', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' }))
            .toEqual([{ accountId: 'a1', delta: -250 }])
    })

    it('produces no effect when a record has no account', () => {
        expect(effectsOfExpense({ id: 'e1', description: 'Food', amount: 250, date: '2026-08-01', categoryId: 'c1', expenseType: 'essential' }))
            .toEqual([])
    })

    it('moves money both ways for a transfer', () => {
        expect(effectsOfTransfer({ id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 500, date: '2026-08-01' }))
            .toEqual([{ accountId: 'a1', delta: -500 }, { accountId: 'a2', delta: 500 }])
    })

    it('debits source and credits the linked account for a contribution', () => {
        const goals = new Map<string, SavingsGoal>([['g1', { id: 'g1', name: 'Fund', targetAmount: 10000, currentAmount: 0, linkedAccountId: 'a2' }]])
        expect(effectsOfContribution({ id: 'sc1', savingsGoalId: 'g1', amount: 300, date: '2026-08-01', fromAccountId: 'a1' }, goals))
            .toEqual([{ accountId: 'a1', delta: -300 }, { accountId: 'a2', delta: 300 }])
    })

    it('nets to nothing when source and linked account are the same', () => {
        const goals = new Map<string, SavingsGoal>([['g1', { id: 'g1', name: 'Fund', targetAmount: 10000, currentAmount: 0, linkedAccountId: 'a1' }]])
        expect(effectsOfContribution({ id: 'sc1', savingsGoalId: 'g1', amount: 300, date: '2026-08-01', fromAccountId: 'a1' }, goals))
            .toEqual([])
    })

    it('debits the paying account for a credit-card payment', () => {
        expect(effectsOfStatement({ id: 's1', creditCardId: 'cc1', statementBalance: 5000, amountPaid: 2000, dueDate: '2026-08-20', status: 'partial', paidFromAccountId: 'a1' }))
            .toEqual([{ accountId: 'a1', delta: -2000 }])
    })
})

describe('computeBalances', () => {
    it('is openingBalance plus the sum of effects', () => {
        const state = emptyState()
        state.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 1000 }]
        state.incomes = [{ id: 'i1', description: 'Pay', amount: 500, date: '2026-08-01', categoryId: 'c1', accountId: 'a1' }]
        state.expenses = [{ id: 'e1', description: 'Food', amount: 200, date: '2026-08-02', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' }]

        expect(computeBalances(state)).toEqual({ a1: 1300 })
    })

    it('ignores effects pointing at accounts that no longer exist', () => {
        const state = emptyState()
        state.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 100 }]
        state.expenses = [{ id: 'e1', description: 'Ghost', amount: 999, date: '2026-08-01', categoryId: 'c1', accountId: 'deleted', expenseType: 'essential' }]

        expect(computeBalances(state)).toEqual({ a1: 100 })
    })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run app/utils/__tests__/balances.test.ts`
Expected: FAIL — `Failed to resolve import "../balances"`.

- [ ] **Step 4: Implement**

```ts
// app/utils/balances.ts
import type {
    AppState, Income, Expense, Transfer,
    SavingsContribution, SavingsGoal, CreditCardStatement,
} from '../types'

/** A single movement of money into (positive) or out of (negative) one account. */
export type BalanceEffect = { accountId: string; delta: number }

export function effectsOfIncome(income: Income): BalanceEffect[] {
    return income.accountId ? [{ accountId: income.accountId, delta: income.amount }] : []
}

export function effectsOfExpense(expense: Expense): BalanceEffect[] {
    return expense.accountId ? [{ accountId: expense.accountId, delta: -expense.amount }] : []
}

export function effectsOfTransfer(transfer: Transfer): BalanceEffect[] {
    return [
        { accountId: transfer.fromAccountId, delta: -transfer.amount },
        { accountId: transfer.toAccountId, delta: transfer.amount },
    ]
}

export function effectsOfContribution(
    contribution: SavingsContribution,
    goalsById: Map<string, SavingsGoal>,
): BalanceEffect[] {
    const linkedAccountId = goalsById.get(contribution.savingsGoalId)?.linkedAccountId
    const from = contribution.fromAccountId
    // Same account on both sides is a no-op, not two cancelling effects.
    if (from && linkedAccountId && from === linkedAccountId) return []

    const effects: BalanceEffect[] = []
    if (from) effects.push({ accountId: from, delta: -contribution.amount })
    if (linkedAccountId) effects.push({ accountId: linkedAccountId, delta: contribution.amount })
    return effects
}

export function effectsOfStatement(statement: CreditCardStatement): BalanceEffect[] {
    if (!statement.paidFromAccountId || !statement.amountPaid) return []
    return [{ accountId: statement.paidFromAccountId, delta: -statement.amountPaid }]
}

export function allEffects(state: AppState): BalanceEffect[] {
    const goalsById = new Map(state.savingsGoals.map((g) => [g.id, g]))
    return [
        ...state.incomes.flatMap(effectsOfIncome),
        ...state.expenses.flatMap(effectsOfExpense),
        ...state.transfers.flatMap(effectsOfTransfer),
        ...state.savingsContributions.flatMap((c) => effectsOfContribution(c, goalsById)),
        ...state.creditCardStatements.flatMap(effectsOfStatement),
    ]
}

export function computeBalances(state: AppState): Record<string, number> {
    const balances: Record<string, number> = {}
    for (const account of state.accounts) balances[account.id] = account.openingBalance

    for (const effect of allEffects(state)) {
        // Orphaned references contribute nothing rather than resurrecting an account.
        if (effect.accountId in balances) balances[effect.accountId] += effect.delta
    }
    return balances
}

export function balanceOf(state: AppState, accountId: string): number {
    return computeBalances(state)[accountId] ?? 0
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run app/utils/__tests__/balances.test.ts` → PASS (8 tests)

Note: `npm test` will now show TypeScript errors elsewhere because `Account.balance` is gone. That is expected and is resolved in Task 5. Do not "fix" it by re-adding the field.

- [ ] **Step 6: Commit**

```bash
git add app/utils/balances.ts app/utils/__tests__/balances.test.ts app/types/index.ts
git commit -m "feat: add pure balance effect model"
```

---

### Task 3: First-class Transfer entity

**Files:**
- Modify: `app/context/BudgetContext.tsx:176-218` (`TRANSFER_FUNDS`)
- Test: `app/context/__tests__/transfers.test.ts` *(new)*

**Interfaces:**
- Consumes: `Transfer` from Task 2.
- Produces: reducer action `{ type: 'TRANSFER_FUNDS'; payload: Transfer }` — payload is now the complete record including `id` and `date`; the caller generates them.

- [ ] **Step 1: Write the failing test**

```ts
// app/context/__tests__/transfers.test.ts
import { describe, it, expect } from 'vitest'
import { budgetReducer, seedState } from '../BudgetContext'
import { computeBalances } from '../../utils/balances'

describe('TRANSFER_FUNDS', () => {
    it('records the transfer and moves money via derived balances', () => {
        const base = seedState()
        base.accounts = [
            { id: 'a1', name: 'Cash', type: 'cash', openingBalance: 1000 },
            { id: 'a2', name: 'Bank', type: 'bank', openingBalance: 0 },
        ]

        const next = budgetReducer(base, {
            type: 'TRANSFER_FUNDS',
            payload: { id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 400, date: '2026-08-16' },
        })

        expect(next.transfers).toHaveLength(1)
        expect(computeBalances(next)).toEqual({ a1: 600, a2: 400 })
    })

    it('does not fabricate savings contributions for linked goals', () => {
        const base = seedState()
        base.accounts = [
            { id: 'a1', name: 'Cash', type: 'cash', openingBalance: 1000 },
            { id: 'a2', name: 'Savings', type: 'bank', openingBalance: 0 },
        ]
        base.savingsGoals = [
            { id: 'g1', name: 'Fund A', targetAmount: 5000, currentAmount: 0, linkedAccountId: 'a2' },
            { id: 'g2', name: 'Fund B', targetAmount: 5000, currentAmount: 0, linkedAccountId: 'a2' },
        ]

        const next = budgetReducer(base, {
            type: 'TRANSFER_FUNDS',
            payload: { id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 400, date: '2026-08-16' },
        })

        // Previously this produced one contribution per linked goal, double counting.
        expect(next.savingsContributions).toEqual([])
        expect(computeBalances(next)).toEqual({ a1: 600, a2: 400 })
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/context/__tests__/transfers.test.ts`
Expected: FAIL — `next.transfers` is undefined; contributions array has 2 entries.

- [ ] **Step 3: Replace the reducer case**

Delete `app/context/BudgetContext.tsx:176-218` entirely and replace with:

```ts
        case 'TRANSFER_FUNDS':
            return { ...state, transfers: [...state.transfers, action.payload] }
```

Update the action union to `| { type: 'TRANSFER_FUNDS'; payload: Transfer }`, and update the provider's `transferFunds` callback to build the record:

```ts
    const transferFunds = useCallback((transfer: Omit<Transfer, 'id'>) => {
        dispatch({ type: 'TRANSFER_FUNDS', payload: { ...transfer, id: uuidv4() } })
    }, [])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/context/__tests__/transfers.test.ts` → PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/context/BudgetContext.tsx app/context/__tests__/transfers.test.ts
git commit -m "feat: record transfers as first-class entities"
```

---

### Task 4: Migration runner with backup

**Files:**
- Create: `app/utils/migrations.ts`
- Modify: `app/context/BudgetContext.tsx` load effect
- Test: `app/utils/__tests__/migrations.test.ts` *(new)*

**Interfaces:**
- Consumes: `computeBalances`, `allEffects` (Task 2); `seedState` (Task 1).
- Produces:
  - `CURRENT_SCHEMA_VERSION = 2`
  - `V1_BACKUP_KEY = 'budget-tracker-data.v1-backup'`
  - `migrate(raw: unknown): AppState` — throws `MigrationError` on unusable input.

**Ordering note (the subtle part):** the bill→expense backfill must run **before** opening balances are computed, otherwise the backfilled expenses' effects are not accounted for and every migrated balance is wrong by the sum of paid bills.

- [ ] **Step 1: Write the failing test**

```ts
// app/utils/__tests__/migrations.test.ts
import { describe, it, expect } from 'vitest'
import { migrate, CURRENT_SCHEMA_VERSION } from '../migrations'
import { computeBalances } from '../balances'

const v1Blob = {
    categories: [{ id: 'c1', name: 'Rent', type: 'expense', color: '#000' }],
    accounts: [{ id: 'a1', name: 'Cash', type: 'cash', balance: 700 }],
    incomes: [{ id: 'i1', description: 'Pay', amount: 1000, date: '2026-08-01', categoryId: 'c1', accountId: 'a1' }],
    expenses: [{ id: 'e1', description: 'Food', amount: 300, date: '2026-08-02', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' }],
    bills: [], creditCards: [], creditCardStatements: [],
    savingsGoals: [], savingsContributions: [], monthlyBudgets: [],
    settings: { currency: 'PHP', currencySymbol: '₱', defaultEssentialsPercentage: 50, defaultNonEssentialsPercentage: 30, defaultSavingsPercentage: 20, theme: 'light' },
}

describe('migrate v1 -> v2', () => {
    it('preserves the displayed balance exactly', () => {
        const migrated = migrate(v1Blob)
        expect(computeBalances(migrated)).toEqual({ a1: 700 })
    })

    it('derives openingBalance as balance minus existing effects', () => {
        const migrated = migrate(v1Blob)
        // 700 displayed = opening + 1000 - 300  =>  opening = 0
        expect(migrated.accounts[0].openingBalance).toBe(0)
    })

    it('stamps the schema version and adds the transfers array', () => {
        const migrated = migrate(v1Blob)
        expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
        expect(migrated.transfers).toEqual([])
    })

    it('is idempotent — migrating an already-migrated state changes nothing', () => {
        const once = migrate(v1Blob)
        expect(migrate(once)).toEqual(once)
    })

    it('backfills a paid bill into a linked expense and still preserves the balance', () => {
        const withBill = {
            ...v1Blob,
            accounts: [{ id: 'a1', name: 'Cash', type: 'cash', balance: 500 }],
            bills: [{ id: 'b1', description: 'Rent', amount: 200, dueDate: '2026-08-05', isPaid: true, paidDate: '2026-08-05', paidFromAccountId: 'a1', categoryId: 'c1' }],
        }
        const migrated = migrate(withBill)

        const linked = migrated.expenses.find((e) => e.billId === 'b1')
        expect(linked).toBeDefined()
        expect(linked!.amount).toBe(200)
        expect(computeBalances(migrated)).toEqual({ a1: 500 })
    })

    it('does not duplicate an auto-created expense that already exists', () => {
        const withBoth = {
            ...v1Blob,
            accounts: [{ id: 'a1', name: 'Cash', type: 'cash', balance: 500 }],
            bills: [{ id: 'b1', description: 'Rent', amount: 200, dueDate: '2026-08-05', isPaid: true, paidDate: '2026-08-05', paidFromAccountId: 'a1', categoryId: 'c1' }],
            expenses: [{ id: 'e9', description: 'Rent', amount: 200, date: '2026-08-05', categoryId: 'c1', accountId: 'a1', expenseType: 'essential', notes: 'Auto-created from bill payment' }],
        }
        const migrated = migrate(withBoth)
        expect(migrated.expenses.filter((e) => e.billId === 'b1')).toHaveLength(1)
    })

    it('throws rather than returning empty state for unusable input', () => {
        expect(() => migrate(null)).toThrow()
        expect(() => migrate({ nonsense: true })).toThrow()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/utils/__tests__/migrations.test.ts`
Expected: FAIL — `Failed to resolve import "../migrations"`.

- [ ] **Step 3: Implement**

```ts
// app/utils/migrations.ts
import type { AppState, Expense } from '../types'
import { allEffects } from './balances'

export const CURRENT_SCHEMA_VERSION = 2
export const V1_BACKUP_KEY = 'budget-tracker-data.v1-backup'

export class MigrationError extends Error {}

type LegacyAccount = { id: string; name: string; type: string; balance?: number; openingBalance?: number; color?: string; isDefault?: boolean }

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Missing collections are normal for blobs written by older builds. */
function withDefaults(raw: Record<string, unknown>): AppState {
    if (!Array.isArray(raw.accounts) || !Array.isArray(raw.categories)) {
        throw new MigrationError('Stored data has no recognisable accounts or categories')
    }
    return {
        categories: (raw.categories as AppState['categories']) ?? [],
        accounts: [] as AppState['accounts'], // filled in below
        incomes: (raw.incomes as AppState['incomes']) ?? [],
        expenses: (raw.expenses as AppState['expenses']) ?? [],
        bills: (raw.bills as AppState['bills']) ?? [],
        creditCards: (raw.creditCards as AppState['creditCards']) ?? [],
        creditCardStatements: (raw.creditCardStatements as AppState['creditCardStatements']) ?? [],
        savingsGoals: (raw.savingsGoals as AppState['savingsGoals']) ?? [],
        savingsContributions: (raw.savingsContributions as AppState['savingsContributions']) ?? [],
        monthlyBudgets: (raw.monthlyBudgets as AppState['monthlyBudgets']) ?? [],
        transfers: (raw.transfers as AppState['transfers']) ?? [],
        schemaVersion: CURRENT_SCHEMA_VERSION,
        settings: raw.settings as AppState['settings'],
    }
}

export function migrate(raw: unknown): AppState {
    if (!isPlainObject(raw)) throw new MigrationError('Stored data is not an object')

    const legacyAccounts = raw.accounts as LegacyAccount[] | undefined
    const state = withDefaults(raw)

    if (raw.schemaVersion === CURRENT_SCHEMA_VERSION) {
        return { ...state, accounts: raw.accounts as AppState['accounts'] }
    }

    // 1. Backfill paid bills into linked expenses FIRST, so their effects are
    //    included when opening balances are derived below.
    const backfilled: Expense[] = []
    for (const bill of state.bills) {
        if (!bill.isPaid) continue
        const already = state.expenses.find(
            (e) => e.billId === bill.id ||
                (e.amount === bill.amount &&
                 e.accountId === bill.paidFromAccountId &&
                 e.date === (bill.paidDate ?? bill.dueDate) &&
                 e.notes === 'Auto-created from bill payment'),
        )
        if (already) {
            already.billId = bill.id
            continue
        }
        backfilled.push({
            id: `mig-${bill.id}`,
            description: bill.description,
            amount: bill.amount,
            date: bill.paidDate ?? bill.dueDate,
            categoryId: bill.categoryId ?? '',
            accountId: bill.paidFromAccountId,
            expenseType: 'essential',
            billId: bill.id,
            notes: 'Migrated from bill payment',
        })
    }
    state.expenses = [...state.expenses, ...backfilled]

    // 2. Derive opening balances so today's displayed numbers do not move.
    const probe: AppState = { ...state, accounts: (legacyAccounts ?? []).map((a) => ({ ...a, openingBalance: 0 })) as AppState['accounts'] }
    const sums: Record<string, number> = {}
    for (const effect of allEffects(probe)) {
        sums[effect.accountId] = (sums[effect.accountId] ?? 0) + effect.delta
    }

    state.accounts = (legacyAccounts ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type as AppState['accounts'][number]['type'],
        openingBalance: (a.balance ?? a.openingBalance ?? 0) - (sums[a.id] ?? 0),
        color: a.color,
        isDefault: a.isDefault,
    }))

    return state
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/utils/__tests__/migrations.test.ts` → PASS (7 tests)

- [ ] **Step 5: Wire it into the load effect, backing up first**

Replace the body of the load effect's `if (stored)` branch in `app/context/BudgetContext.tsx`:

```ts
            if (stored) {
                const parsed = JSON.parse(stored)
                if (parsed?.schemaVersion !== CURRENT_SCHEMA_VERSION) {
                    // One-time, never overwritten: the escape hatch if migration is wrong.
                    if (!localStorage.getItem(V1_BACKUP_KEY)) {
                        localStorage.setItem(V1_BACKUP_KEY, stored)
                    }
                }
                dispatch({ type: 'LOAD_STATE', payload: migrate(parsed) })
            } else {
```

`migrate` throwing is caught by the existing `catch`, which now sets `loadFailedRef` (Task 1) and therefore leaves the stored blob untouched.

- [ ] **Step 6: Run the full suite**

Run: `npm test` → all green.

- [ ] **Step 7: Commit**

```bash
git add app/utils/migrations.ts app/utils/__tests__/migrations.test.ts app/context/BudgetContext.tsx
git commit -m "feat: migrate stored state to derived balances with a backup"
```

---

### Task 5: Delete every balance mutation

The core of the refactor. After this task the reducer never writes a balance.

**Files:**
- Modify: `app/context/BudgetContext.tsx` — cases at lines 129-175 (`UPDATE_ACCOUNT`, `UPDATE_ACCOUNT_BALANCE`), 223-388 (income/expense CRUD), 662-845 (savings contributions)
- Modify: consumers reading `account.balance` — `app/accounts/page.tsx`, `app/quick-add/page.tsx`, `app/components/QuickActions.tsx`, `app/utils/swal.tsx` (payment dialog), `app/utils/excel.ts`
- Test: `app/context/__tests__/balance-invariant.test.ts` *(new)*

**Interfaces:**
- Consumes: `computeBalances` (Task 2).
- Produces: context value gains `balances: Record<string, number>` and `balanceOf(accountId: string): number`.

- [ ] **Step 1: Write the failing test**

```ts
// app/context/__tests__/balance-invariant.test.ts
import { describe, it, expect } from 'vitest'
import { budgetReducer, seedState } from '../BudgetContext'
import { computeBalances } from '../../utils/balances'
import type { AppState } from '../../types'

function base(): AppState {
    const s = seedState()
    s.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 1000 }]
    return s
}

describe('balance invariant', () => {
    it('adding then deleting an expense returns to the starting balance', () => {
        let s = base()
        s = budgetReducer(s, { type: 'ADD_EXPENSE', payload: { id: 'e1', description: 'Food', amount: 250, date: '2026-08-01', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' } })
        expect(computeBalances(s).a1).toBe(750)

        s = budgetReducer(s, { type: 'DELETE_EXPENSE', payload: 'e1' })
        expect(computeBalances(s).a1).toBe(1000)
    })

    it('editing an expense amount nets out exactly once', () => {
        let s = base()
        s = budgetReducer(s, { type: 'ADD_EXPENSE', payload: { id: 'e1', description: 'Food', amount: 250, date: '2026-08-01', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' } })
        s = budgetReducer(s, { type: 'UPDATE_EXPENSE', payload: { id: 'e1', description: 'Food', amount: 400, date: '2026-08-01', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' } })
        expect(computeBalances(s).a1).toBe(600)
    })

    it('no reducer case stores a balance field on an account', () => {
        let s = base()
        s = budgetReducer(s, { type: 'ADD_INCOME', payload: { id: 'i1', description: 'Pay', amount: 500, date: '2026-08-01', categoryId: 'c1', accountId: 'a1' } })
        expect(s.accounts[0]).not.toHaveProperty('balance')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/context/__tests__/balance-invariant.test.ts`
Expected: FAIL — the reducer still writes `balance`, so `toHaveProperty('balance')` fires and the arithmetic double-applies.

- [ ] **Step 3: Strip the arithmetic**

For each of `ADD_INCOME`, `UPDATE_INCOME`, `DELETE_INCOME`, `ADD_EXPENSE`, `UPDATE_EXPENSE`, `DELETE_EXPENSE`, `ADD_SAVINGS_CONTRIBUTION`, `UPDATE_SAVINGS_CONTRIBUTION`, `DELETE_SAVINGS_CONTRIBUTION`: remove every `accounts:` key and every `savingsGoals:` re-sync block from the returned object. Each case becomes a plain list operation. For example `ADD_EXPENSE` collapses to:

```ts
        case 'ADD_EXPENSE':
            return { ...state, expenses: [...state.expenses, action.payload] }
```

Delete the `UPDATE_ACCOUNT_BALANCE` case and its action-union member entirely. In `UPDATE_ACCOUNT`, drop the balance-preservation logic — the payload now carries `openingBalance` and is stored verbatim.

- [ ] **Step 4: Expose derived balances from the provider**

```ts
    const balances = useMemo(() => computeBalances(state), [state])
    const balanceOf = useCallback((accountId: string) => balances[accountId] ?? 0, [balances])
```

Add `balances` and `balanceOf` to the context value and its type.

- [ ] **Step 5: Update consumers**

Replace every `account.balance` read with `balances[account.id]`. The sites are `app/accounts/page.tsx`, `app/quick-add/page.tsx` (sufficient-funds check), `app/components/QuickActions.tsx` (same), `app/utils/swal.tsx` (payment dialog account list) and `app/utils/excel.ts` (account sheet). Find them with:

```bash
grep -rn "\.balance" app --include=*.ts --include=*.tsx | grep -v __tests__
```

`excel.ts` receives plain state, so pass `computeBalances(state)` into it rather than reaching for a hook.

- [ ] **Step 6: Run tests and typecheck**

Run: `npx vitest run app/context/__tests__/balance-invariant.test.ts` → PASS (3 tests)
Run: `npm test` → all green
Run: `npx tsc --noEmit` → no errors (this is the real gate for this task)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: derive account balances instead of storing them"
```

---

### Task 6: A bill stops moving money

**Files:**
- Modify: `app/types/index.ts` (`Expense.billId`, drop `Bill.paidFromAccountId`), `app/context/BudgetContext.tsx:433-493` (`DELETE_BILL`, `PAY_BILL`, `UNPAY_BILL`), `app/bills/page.tsx:160-185`, `app/page.tsx:104-109`
- Test: `app/context/__tests__/bill-payment.test.ts` *(new)*

**Interfaces:**
- Consumes: `computeBalances` (Task 2).
- Produces: `PAY_BILL` payload becomes `{ billId: string; expense: Expense }`. `isPaidBill(state, billId): boolean` exported from `app/utils/balances.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// app/context/__tests__/bill-payment.test.ts
import { describe, it, expect } from 'vitest'
import { budgetReducer, seedState } from '../BudgetContext'
import { computeBalances } from '../../utils/balances'

function withBill() {
    const s = seedState()
    s.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 10000 }]
    s.bills = [{ id: 'b1', description: 'Electric', amount: 2000, dueDate: '2026-08-20', isPaid: false, categoryId: 'c1' }]
    return s
}

describe('paying a bill', () => {
    it('debits the account exactly once', () => {
        const s = budgetReducer(withBill(), {
            type: 'PAY_BILL',
            payload: {
                billId: 'b1',
                expense: { id: 'e1', description: 'Electric', amount: 2000, date: '2026-08-16', categoryId: 'c1', accountId: 'a1', expenseType: 'essential', billId: 'b1' },
            },
        })
        // Regression: this was 6000 because PAY_BILL and ADD_EXPENSE both deducted.
        expect(computeBalances(s).a1).toBe(8000)
        expect(s.expenses).toHaveLength(1)
    })

    it('unpaying removes the linked expense and restores the balance', () => {
        let s = budgetReducer(withBill(), {
            type: 'PAY_BILL',
            payload: {
                billId: 'b1',
                expense: { id: 'e1', description: 'Electric', amount: 2000, date: '2026-08-16', categoryId: 'c1', accountId: 'a1', expenseType: 'essential', billId: 'b1' },
            },
        })
        s = budgetReducer(s, { type: 'UNPAY_BILL', payload: 'b1' })

        expect(computeBalances(s).a1).toBe(10000)
        expect(s.expenses).toHaveLength(0)
    })

    it('editing the amount after paying cannot inflate the refund', () => {
        let s = budgetReducer(withBill(), {
            type: 'PAY_BILL',
            payload: {
                billId: 'b1',
                expense: { id: 'e1', description: 'Electric', amount: 2000, date: '2026-08-16', categoryId: 'c1', accountId: 'a1', expenseType: 'essential', billId: 'b1' },
            },
        })
        s = budgetReducer(s, { type: 'UPDATE_BILL', payload: { ...s.bills[0], amount: 6000 } })
        s = budgetReducer(s, { type: 'UNPAY_BILL', payload: 'b1' })

        // Regression: previously refunded the NEW amount, minting 4000.
        expect(computeBalances(s).a1).toBe(10000)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/context/__tests__/bill-payment.test.ts`
Expected: FAIL — the payload shape is not understood and `isPaid` handling is unchanged.

- [ ] **Step 3: Add the link field and rewrite the cases**

In `app/types/index.ts`, add `billId?: string;` to `Expense` and remove `paidFromAccountId` from `Bill`.

```ts
        case 'PAY_BILL':
            return {
                ...state,
                bills: state.bills.map((b) =>
                    b.id === action.payload.billId
                        ? { ...b, isPaid: true, paidDate: action.payload.expense.date }
                        : b,
                ),
                expenses: [...state.expenses, action.payload.expense],
            }

        case 'UNPAY_BILL':
            return {
                ...state,
                bills: state.bills.map((b) =>
                    b.id === action.payload ? { ...b, isPaid: false, paidDate: undefined } : b,
                ),
                expenses: state.expenses.filter((e) => e.billId !== action.payload),
            }

        case 'DELETE_BILL':
            return {
                ...state,
                bills: state.bills.filter((b) => b.id !== action.payload),
                expenses: state.expenses.filter((e) => e.billId !== action.payload),
            }
```

- [ ] **Step 4: Collapse the two payment paths in the UI**

In `app/bills/page.tsx:166-182`, delete the separate `addExpense(...)` call — `payBill` now carries the expense:

```tsx
            if (result) {
                payBill(bill.id, {
                    id: uuidv4(),
                    description: bill.description,
                    amount: bill.amount,
                    date: getTodayISO(),
                    categoryId: bill.categoryId ?? '',
                    accountId: result.accountId,
                    expenseType: 'essential',
                    billId: bill.id,
                    notes: 'Auto-created from bill payment',
                })
                showSuccess('Bill paid successfully!')
            }
```

In `app/page.tsx:104-109`, the dashboard must use this same handler rather than passing `payBill` raw — extract the handler above into `app/utils/bill-payment.ts` as `buildBillExpense(bill, accountId): Expense` and call it from both pages so a third path cannot diverge.

- [ ] **Step 5: Run tests**

Run: `npx vitest run app/context/__tests__/bill-payment.test.ts` → PASS (3 tests)
Run: `npm test` → all green
Run: `npx tsc --noEmit` → no errors

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: bill payment creates one expense and debits once"
```

---

### Task 7: Credit-card payments move money

**Files:**
- Modify: `app/credit-cards/page.tsx:303-327`, `app/components/dashboard/CreditCardSummary.tsx:67-88`
- Test: `app/context/__tests__/statement-payment.test.ts` *(new)*

**Interfaces:**
- Consumes: `effectsOfStatement` (Task 2) — already implemented, so this task is wiring plus validation.

- [ ] **Step 1: Write the failing test**

```ts
// app/context/__tests__/statement-payment.test.ts
import { describe, it, expect } from 'vitest'
import { budgetReducer, seedState } from '../BudgetContext'
import { computeBalances } from '../../utils/balances'

describe('credit card statement payment', () => {
    it('debits the paying account', () => {
        const s = seedState()
        s.accounts = [{ id: 'a1', name: 'Bank', type: 'bank', openingBalance: 50000 }]
        s.creditCards = [{ id: 'cc1', bank: 'BPI', cardType: 'Visa' }]
        s.creditCardStatements = [{ id: 'st1', creditCardId: 'cc1', statementBalance: 20000, amountPaid: 0, dueDate: '2026-08-25', status: 'pending' }]

        const next = budgetReducer(s, {
            type: 'UPDATE_STATEMENT',
            payload: { ...s.creditCardStatements[0], amountPaid: 20000, status: 'paid', paidFromAccountId: 'a1', paidDate: '2026-08-16' },
        })

        // Regression: previously 50000 — the payment never left the account.
        expect(computeBalances(next).a1).toBe(30000)
    })

    it('reverses when the payment is undone', () => {
        const s = seedState()
        s.accounts = [{ id: 'a1', name: 'Bank', type: 'bank', openingBalance: 50000 }]
        s.creditCards = [{ id: 'cc1', bank: 'BPI', cardType: 'Visa' }]
        s.creditCardStatements = [{ id: 'st1', creditCardId: 'cc1', statementBalance: 20000, amountPaid: 20000, dueDate: '2026-08-25', status: 'paid', paidFromAccountId: 'a1' }]

        const next = budgetReducer(s, {
            type: 'UPDATE_STATEMENT',
            payload: { ...s.creditCardStatements[0], amountPaid: 0, status: 'pending', paidFromAccountId: undefined },
        })

        expect(computeBalances(next).a1).toBe(50000)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/context/__tests__/statement-payment.test.ts`
Expected: FAIL on the first test — balance stays 50000.

- [ ] **Step 3: Implement**

No reducer change is needed — `UPDATE_STATEMENT` already stores the record and `effectsOfStatement` already declares the movement, so the test passes once `allEffects` includes statements. Verify that it does; if the test still fails, the omission is in `allEffects` in `app/utils/balances.ts`.

Add the guard the credit-cards page is missing (the dashboard twin already has one), in `app/credit-cards/page.tsx` before dispatching:

```tsx
        const payment = parseFloat(paymentAmount)
        if (!Number.isFinite(payment) || payment <= 0) {
            showError('Enter a payment amount greater than zero.')
            return
        }
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run app/context/__tests__/statement-payment.test.ts` → PASS (2 tests)
Run: `npm test` → all green

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: credit card payments debit the paying account"
```

---

### Task 8: Referential integrity

**Files:**
- Create: `app/utils/integrity.ts`
- Modify: `app/context/BudgetContext.tsx` (`DELETE_ACCOUNT`, `DELETE_CATEGORY`, `DELETE_CREDIT_CARD`, `DELETE_SAVINGS_GOAL`)
- Test: `app/utils/__tests__/integrity.test.ts` *(new)*

**Interfaces:**
- Produces:
  - `type DeleteCheck = { allowed: true } | { allowed: false; reason: string; count: number }`
  - `checkDelete(state: AppState, entity: 'account' | 'category', id: string): DeleteCheck`
  - `cascadeDelete(state: AppState, entity: 'creditCard' | 'savingsGoal', id: string): AppState`

- [ ] **Step 1: Write the failing test**

```ts
// app/utils/__tests__/integrity.test.ts
import { describe, it, expect } from 'vitest'
import { checkDelete, cascadeDelete } from '../integrity'
import { budgetReducer, seedState } from '../../context/BudgetContext'

describe('checkDelete', () => {
    it('blocks deleting an account that records reference', () => {
        const s = seedState()
        s.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 0 }]
        s.expenses = [{ id: 'e1', description: 'Food', amount: 10, date: '2026-08-01', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' }]

        const result = checkDelete(s, 'account', 'a1')
        expect(result.allowed).toBe(false)
        if (!result.allowed) expect(result.count).toBe(1)
    })

    it('allows deleting an unreferenced account', () => {
        const s = seedState()
        s.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 0 }]
        expect(checkDelete(s, 'account', 'a1').allowed).toBe(true)
    })

    it('blocks deleting a category in use', () => {
        const s = seedState()
        s.expenses = [{ id: 'e1', description: 'Food', amount: 10, date: '2026-08-01', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' }]
        expect(checkDelete(s, 'category', 'c1').allowed).toBe(false)
    })
})

describe('cascade', () => {
    it('deleting a credit card removes its statements', () => {
        const s = seedState()
        s.creditCards = [{ id: 'cc1', bank: 'BPI', cardType: 'Visa' }]
        s.creditCardStatements = [{ id: 'st1', creditCardId: 'cc1', statementBalance: 100, amountPaid: 0, dueDate: '2026-08-25', status: 'pending' }]

        const next = budgetReducer(s, { type: 'DELETE_CREDIT_CARD', payload: 'cc1' })
        expect(next.creditCardStatements).toEqual([])
    })

    it('deleting a savings goal removes its contributions', () => {
        const s = seedState()
        s.savingsGoals = [{ id: 'g1', name: 'Fund', targetAmount: 100, currentAmount: 0 }]
        s.savingsContributions = [{ id: 'sc1', savingsGoalId: 'g1', amount: 50, date: '2026-08-01', fromAccountId: 'a1' }]

        const next = budgetReducer(s, { type: 'DELETE_SAVINGS_GOAL', payload: 'g1' })
        expect(next.savingsContributions).toEqual([])
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/utils/__tests__/integrity.test.ts`
Expected: FAIL — `Failed to resolve import "../integrity"`.

- [ ] **Step 3: Implement**

```ts
// app/utils/integrity.ts
import type { AppState } from '../types'

export type DeleteCheck = { allowed: true } | { allowed: false; reason: string; count: number }

/** Counts records that would be orphaned by deleting this entity. */
function referenceCount(state: AppState, entity: 'account' | 'category', id: string): number {
    if (entity === 'account') {
        return (
            state.incomes.filter((r) => r.accountId === id).length +
            state.expenses.filter((r) => r.accountId === id).length +
            state.transfers.filter((r) => r.fromAccountId === id || r.toAccountId === id).length +
            state.savingsContributions.filter((r) => r.fromAccountId === id).length +
            state.creditCardStatements.filter((r) => r.paidFromAccountId === id).length +
            state.savingsGoals.filter((g) => g.linkedAccountId === id).length
        )
    }
    return (
        state.expenses.filter((r) => r.categoryId === id).length +
        state.incomes.filter((r) => r.categoryId === id).length +
        state.bills.filter((r) => r.categoryId === id).length
    )
}

export function checkDelete(state: AppState, entity: 'account' | 'category', id: string): DeleteCheck {
    const count = referenceCount(state, entity, id)
    if (count === 0) return { allowed: true }
    return {
        allowed: false,
        count,
        reason: `${count} record${count === 1 ? '' : 's'} still reference this ${entity}. Reassign or delete them first.`,
    }
}

export function cascadeDelete(state: AppState, entity: 'creditCard' | 'savingsGoal', id: string): AppState {
    if (entity === 'creditCard') {
        return {
            ...state,
            creditCards: state.creditCards.filter((c) => c.id !== id),
            creditCardStatements: state.creditCardStatements.filter((s) => s.creditCardId !== id),
        }
    }
    return {
        ...state,
        savingsGoals: state.savingsGoals.filter((g) => g.id !== id),
        savingsContributions: state.savingsContributions.filter((c) => c.savingsGoalId !== id),
    }
}
```

Wire the reducer cases:

```ts
        case 'DELETE_CREDIT_CARD':
            return cascadeDelete(state, 'creditCard', action.payload)

        case 'DELETE_SAVINGS_GOAL':
            return cascadeDelete(state, 'savingsGoal', action.payload)

        case 'DELETE_ACCOUNT':
            return checkDelete(state, 'account', action.payload).allowed
                ? { ...state, accounts: state.accounts.filter((a) => a.id !== action.payload) }
                : state

        case 'DELETE_CATEGORY':
            return checkDelete(state, 'category', action.payload).allowed
                ? { ...state, categories: state.categories.filter((c) => c.id !== action.payload) }
                : state
```

In `app/categories/page.tsx`, call `checkDelete` before dispatching and surface `result.reason` via `showError` so a blocked delete explains itself rather than silently doing nothing.

- [ ] **Step 4: Run tests**

Run: `npx vitest run app/utils/__tests__/integrity.test.ts` → PASS (5 tests)
Run: `npm test` → all green

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: enforce referential integrity in the reducer"
```

---

### Task 9: The invariant property test

This is the task that stops the bug class returning for actions nobody has written yet.

**Files:**
- Test: `app/context/__tests__/balance-property.test.ts` *(new)*

- [ ] **Step 1: Write the test**

```ts
// app/context/__tests__/balance-property.test.ts
import { describe, it, expect } from 'vitest'
import { budgetReducer, seedState } from '../BudgetContext'
import { computeBalances, allEffects } from '../../utils/balances'
import type { AppState, Action } from '../BudgetContext'

/**
 * The invariant the whole design buys:
 *   balance == openingBalance + Σ effectsOf(records)
 * If any future reducer case mutates a balance directly, or applies an
 * effect twice, this fails without anyone having to write a new test.
 */
function assertInvariant(state: AppState) {
    const derived = computeBalances(state)
    const expected: Record<string, number> = {}
    for (const a of state.accounts) expected[a.id] = a.openingBalance
    for (const e of allEffects(state)) {
        if (e.accountId in expected) expected[e.accountId] += e.delta
    }
    expect(derived).toEqual(expected)
    for (const account of state.accounts) {
        expect(account).not.toHaveProperty('balance')
    }
}

const operations: Action[] = [
    { type: 'ADD_INCOME', payload: { id: 'i1', description: 'Pay', amount: 5000, date: '2026-08-01', categoryId: 'c1', accountId: 'a1' } },
    { type: 'ADD_EXPENSE', payload: { id: 'e1', description: 'Food', amount: 300, date: '2026-08-02', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' } },
    { type: 'UPDATE_EXPENSE', payload: { id: 'e1', description: 'Food', amount: 450, date: '2026-08-02', categoryId: 'c1', accountId: 'a2', expenseType: 'essential' } },
    { type: 'TRANSFER_FUNDS', payload: { id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 1000, date: '2026-08-03' } },
    { type: 'ADD_SAVINGS_CONTRIBUTION', payload: { id: 'sc1', savingsGoalId: 'g1', amount: 200, date: '2026-08-04', fromAccountId: 'a1' } },
    { type: 'DELETE_EXPENSE', payload: 'e1' },
    { type: 'DELETE_SAVINGS_CONTRIBUTION', payload: 'sc1' },
    { type: 'DELETE_INCOME', payload: 'i1' },
]

describe('balance invariant holds across operation sequences', () => {
    it('holds after every prefix of the operation list', () => {
        let state = seedState()
        state.accounts = [
            { id: 'a1', name: 'Cash', type: 'cash', openingBalance: 10000 },
            { id: 'a2', name: 'Bank', type: 'bank', openingBalance: 2000 },
        ]
        state.savingsGoals = [{ id: 'g1', name: 'Fund', targetAmount: 50000, currentAmount: 0, linkedAccountId: 'a2' }]

        assertInvariant(state)
        for (const op of operations) {
            state = budgetReducer(state, op)
            assertInvariant(state)
        }
    })

    it('returns to the opening balances once every record is removed', () => {
        let state = seedState()
        state.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 10000 }]

        state = budgetReducer(state, { type: 'ADD_EXPENSE', payload: { id: 'e1', description: 'X', amount: 999, date: '2026-08-01', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' } })
        state = budgetReducer(state, { type: 'DELETE_EXPENSE', payload: 'e1' })

        expect(computeBalances(state).a1).toBe(10000)
    })
})
```

Export the `Action` type from `BudgetContext.tsx` (`export type Action = ...`) so the test can type its operation list.

- [ ] **Step 2: Run it**

Run: `npx vitest run app/context/__tests__/balance-property.test.ts` → PASS (2 tests)

If it fails, a case from Tasks 5–8 still mutates a balance. Fix the case, not the test.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: pin the derived-balance invariant"
```

---

### Task 10: Derive goal progress, and document

**Files:**
- Modify: `app/utils/index.ts` (goal progress), `app/savings/page.tsx:146`, `app/components/dashboard/SavingsGoals.tsx`
- Modify: `README.md`, `.github/copilot-instructions.md`
- Test: `app/utils/__tests__/goal-progress.test.ts` *(new)*

- [ ] **Step 1: Write the failing test**

```ts
// app/utils/__tests__/goal-progress.test.ts
import { describe, it, expect } from 'vitest'
import { goalProgress } from '../index'
import { seedState } from '../../context/BudgetContext'

describe('goalProgress', () => {
    it('follows the linked account balance', () => {
        const s = seedState()
        s.accounts = [{ id: 'a2', name: 'Savings', type: 'bank', openingBalance: 5000 }]
        s.savingsGoals = [{ id: 'g1', name: 'Fund', targetAmount: 10000, currentAmount: 0, linkedAccountId: 'a2' }]

        expect(goalProgress(s, s.savingsGoals[0])).toBe(5000)
    })

    it('sums contributions for an unlinked goal', () => {
        const s = seedState()
        s.savingsGoals = [{ id: 'g1', name: 'Fund', targetAmount: 10000, currentAmount: 0 }]
        s.savingsContributions = [
            { id: 'sc1', savingsGoalId: 'g1', amount: 300, date: '2026-08-01' },
            { id: 'sc2', savingsGoalId: 'g1', amount: 200, date: '2026-08-02' },
        ]

        expect(goalProgress(s, s.savingsGoals[0])).toBe(500)
    })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run app/utils/__tests__/goal-progress.test.ts`
Expected: FAIL — `goalProgress` is not exported.

- [ ] **Step 3: Implement**

```ts
// app/utils/index.ts
import { computeBalances } from './balances'
import type { AppState, SavingsGoal } from '../types'

export function goalProgress(state: AppState, goal: SavingsGoal): number {
    if (goal.linkedAccountId) return computeBalances(state)[goal.linkedAccountId] ?? 0
    return state.savingsContributions
        .filter((c) => c.savingsGoalId === goal.id)
        .reduce((sum, c) => sum + c.amount, 0)
}
```

Replace reads of `goal.currentAmount` in `app/savings/page.tsx` and `app/components/dashboard/SavingsGoals.tsx` with `goalProgress(state, goal)`. Remove the `currentAmount: linkedAccount ? linkedAccount.balance : ...` assignment at `app/savings/page.tsx:146` — progress is no longer stored, so editing a goal can no longer overwrite its history.

Leave `SavingsGoal.currentAmount` in the type as a migration remnant; a follow-up can drop it once no reader remains.

- [ ] **Step 4: Update the docs**

In `.github/copilot-instructions.md`, replace any statement about balances being stored with the new invariants:

- Account balances are **derived** — `openingBalance + Σ effectsOf(records)`. Never write `account.balance`; there is no such field.
- Every money movement must be a **record**. Adding a new one means adding an `effectsOf` clause in `app/utils/balances.ts` and nothing else.
- A bill does not move money. Paying one creates an `Expense` with `billId`; `isPaid` follows that expense.
- Deletes go through `app/utils/integrity.ts` — cascade for credit cards and savings goals, block for accounts and categories.

In `README.md`, add `openingBalance` to the known-limitations note: balances are reconstructed from records, and pre-migration transfers were never recorded so they are folded into the opening balance.

- [ ] **Step 5: Run the full suite and build**

Run: `npm test` → all green
Run: `npx tsc --noEmit` → no errors
Run: `npm run build:web` → clean, service worker written

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: derive savings goal progress and document the invariants"
```

---

## Self-review

**Spec coverage.** Effect model → Task 2. `Transfer` entity → Task 3. `Expense.billId` and bills not moving money → Task 6. Credit-card statement effects → Tasks 2 + 7. Migration with backup, `schemaVersion`, opening-balance seeding, bill backfill → Task 4. Referential integrity table → Task 8. Property test, regression tests, migration tests → Tasks 4, 6, 7, 9. Dependency D → Task 1. Goal-progress derivation → Task 10. No spec section is unimplemented.

**Deliberate ordering.** Task 2 leaves the tree type-broken (`Account.balance` is gone before consumers are updated); Task 5 repairs it. This is called out in Task 2 Step 5 so an executor does not "fix" it by reverting the type change. The alternative — updating consumers in Task 2 — would make a single unreviewable task.

**Known risk.** Task 5 is the largest single task and touches six consumer files. Its real gate is `npx tsc --noEmit`, not the unit tests, because the compiler is what finds every `account.balance` reader.
