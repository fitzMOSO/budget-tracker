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

    it('strips the stored payment fields off every bill', () => {
        const withBill = {
            ...v1Blob,
            accounts: [{ id: 'a1', name: 'Cash', type: 'cash', balance: 500 }],
            bills: [{ id: 'b1', description: 'Rent', amount: 200, dueDate: '2026-08-05', isPaid: true, paidDate: '2026-08-05', paidFromAccountId: 'a1', categoryId: 'c1' }],
        }
        const migrated = migrate(withBill)

        // Keeping these alongside the expense link would restore the two
        // sources of truth this refactor exists to remove.
        expect(migrated.bills[0]).not.toHaveProperty('isPaid')
        expect(migrated.bills[0]).not.toHaveProperty('paidDate')
        expect(migrated.bills[0]).not.toHaveProperty('paidFromAccountId')
    })

    it('links, but never re-debits, a bill paid on the current schema', () => {
        // A bill paid before isPaid became derived: the payment expense already
        // exists, so migrating must attach billId and leave the balance alone.
        const currentBlob = {
            ...v1Blob,
            schemaVersion: CURRENT_SCHEMA_VERSION,
            accounts: [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 1000 }],
            incomes: [],
            transfers: [],
            bills: [{ id: 'b1', description: 'Rent', amount: 200, dueDate: '2026-08-05', isPaid: true, paidDate: '2026-08-05', paidFromAccountId: 'a1', categoryId: 'c1' }],
            expenses: [{ id: 'e9', description: 'Rent', amount: 200, date: '2026-08-05', categoryId: 'c1', accountId: 'a1', expenseType: 'essential', notes: 'Auto-created from bill payment' }],
        }
        const migrated = migrate(currentBlob)

        expect(migrated.expenses).toHaveLength(1)
        expect(migrated.expenses[0].billId).toBe('b1')
        expect(computeBalances(migrated)).toEqual({ a1: 800 })
    })

    it('adds no expense for a current-schema bill flagged paid with nothing to link', () => {
        // Such a bill never moved money, so inventing an expense now would
        // silently debit the account for a payment that never happened.
        const currentBlob = {
            ...v1Blob,
            schemaVersion: CURRENT_SCHEMA_VERSION,
            accounts: [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 1000 }],
            incomes: [],
            expenses: [],
            transfers: [],
            bills: [{ id: 'b1', description: 'Rent', amount: 200, dueDate: '2026-08-05', isPaid: true, categoryId: 'c1' }],
        }
        const migrated = migrate(currentBlob)

        expect(migrated.expenses).toHaveLength(0)
        expect(computeBalances(migrated)).toEqual({ a1: 1000 })
    })

    it('throws rather than returning empty state for unusable input', () => {
        expect(() => migrate(null)).toThrow()
        expect(() => migrate({ nonsense: true })).toThrow()
    })

    it('repairs a blob that is recognisably this app\'s data but missing accounts', () => {
        const { accounts, ...withoutAccounts } = v1Blob
        const migrated = migrate(withoutAccounts as unknown)
        expect(migrated.accounts.length).toBeGreaterThan(0)
        expect(migrated.accounts.every((a) => typeof a.openingBalance === 'number')).toBe(true)
    })

    it('repairs a blob that is recognisably this app\'s data but missing categories', () => {
        const { categories, ...withoutCategories } = v1Blob
        const migrated = migrate(withoutCategories as unknown)
        expect(migrated.categories.length).toBeGreaterThan(0)
    })

    it('repairs a blob that is recognisably this app\'s data but missing settings', () => {
        const { settings, ...withoutSettings } = v1Blob
        const migrated = migrate(withoutSettings as unknown)
        expect(migrated.settings).toBeDefined()
        expect(migrated.settings.currencySymbol).toBeDefined()
    })

    it('links each of two identical paid bills to a distinct expense, never overwriting an already-claimed one', () => {
        // Same recurring bill settled twice in one sitting: same amount, same
        // account, same paid date -> the heuristic match is ambiguous between
        // the two auto-created expenses unless already-linked ones are excluded.
        const withDuplicateBills = {
            ...v1Blob,
            accounts: [{ id: 'a1', name: 'Cash', type: 'cash', balance: 5000 }],
            bills: [
                { id: 'b1', description: 'Rent', amount: 2840, dueDate: '2026-07-05', isPaid: true, paidDate: '2026-08-05', paidFromAccountId: 'a1', categoryId: 'c1' },
                { id: 'b2', description: 'Rent', amount: 2840, dueDate: '2026-08-05', isPaid: true, paidDate: '2026-08-05', paidFromAccountId: 'a1', categoryId: 'c1' },
            ],
            expenses: [
                { id: 'e9', description: 'Rent', amount: 2840, date: '2026-08-05', categoryId: 'c1', accountId: 'a1', expenseType: 'essential', notes: 'Auto-created from bill payment' },
                { id: 'e10', description: 'Rent', amount: 2840, date: '2026-08-05', categoryId: 'c1', accountId: 'a1', expenseType: 'essential', notes: 'Auto-created from bill payment' },
            ],
        }

        const migrated = migrate(withDuplicateBills)

        const linkedToB1 = migrated.expenses.filter((e) => e.billId === 'b1')
        const linkedToB2 = migrated.expenses.filter((e) => e.billId === 'b2')
        expect(linkedToB1).toHaveLength(1)
        expect(linkedToB2).toHaveLength(1)
        expect(linkedToB1[0].id).not.toBe(linkedToB2[0].id)
        // Both original expenses got claimed — neither was left unlinked, and
        // no synthetic third expense was created for the "duplicate" bill.
        expect(migrated.expenses.filter((e) => e.id === 'e9' || e.id === 'e10')).toHaveLength(2)
        expect(migrated.expenses.filter((e) => e.id.startsWith('mig-'))).toHaveLength(0)
    })
})

describe('account ids that collide with Object.prototype', () => {
    // migrate() is the one function that parses untrusted persisted data, and
    // it used to accumulate effects into a plain object keyed by account id.
    // `sums['constructor']` then resolved to Object.prototype.constructor, so
    // `?? 0` never fired and `balance - sums[id]` was NaN even with no effects
    // at all; `sums['__proto__'] = n` was discarded outright. A NaN
    // openingBalance serialises to null and is unrecoverable.
    const prototypeKeys = ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'] as const

    it.each(prototypeKeys)('derives a finite opening balance for an account id of %s', (id) => {
        const blob = {
            ...v1Blob,
            accounts: [{ id, name: 'Cash', type: 'cash', balance: 1000 }],
            incomes: [],
            expenses: [],
        }
        const migrated = migrate(blob)

        expect(migrated.accounts).toHaveLength(1)
        expect(Number.isFinite(migrated.accounts[0].openingBalance)).toBe(true)
        expect(migrated.accounts[0].openingBalance).toBe(1000)
        expect(computeBalances(migrated)[id]).toBe(1000)
    })

    it('subtracts real effects from a prototype-key account rather than a prototype member', () => {
        const blob = {
            ...v1Blob,
            accounts: [{ id: 'constructor', name: 'Cash', type: 'cash', balance: 700 }],
            incomes: [{ id: 'i1', description: 'Pay', amount: 1000, date: '2026-08-01', categoryId: 'c1', accountId: 'constructor' }],
            expenses: [{ id: 'e1', description: 'Food', amount: 300, date: '2026-08-02', categoryId: 'c1', accountId: 'constructor', expenseType: 'essential' }],
        }
        const migrated = migrate(blob)

        // 700 displayed = opening + 1000 - 300  =>  opening = 0, still 700 today.
        expect(migrated.accounts[0].openingBalance).toBe(0)
        expect(computeBalances(migrated).constructor).toBe(700)
    })
})

describe('a blob that carries no schemaVersion', () => {
    // Backups exported before the version was stamped into the envelope have to
    // be recognised by shape. Guessing wrong in the v1 direction subtracts every
    // effect out of an opening balance that was never a live balance.
    it('treats accounts carrying `balance` as v1 and derives opening balances', () => {
        const migrated = migrate(v1Blob)
        expect(migrated.accounts[0].openingBalance).toBe(0)
        expect(computeBalances(migrated)).toEqual({ a1: 700 })
    })

    it('treats accounts carrying `openingBalance` as current and leaves them alone', () => {
        const v2Shaped = {
            ...v1Blob,
            accounts: [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 0 }],
        }
        const migrated = migrate(v2Shaped)

        expect(migrated.accounts[0].openingBalance).toBe(0)
        expect(computeBalances(migrated)).toEqual({ a1: 700 })
    })
})

describe('migrate with seedMissingDefaults disabled', () => {
    // What IMPORT_DATA uses: a restore MERGES into a state that already has
    // accounts and categories, so seeding here would inject phantom accounts.
    it('adds no default accounts or categories', () => {
        const migrated = migrate({ expenses: [] }, { seedMissingDefaults: false })
        expect(migrated.accounts).toEqual([])
        expect(migrated.categories).toEqual([])
    })

    it('still repairs the record shapes it is given', () => {
        const migrated = migrate(
            { accounts: [{ id: 'a1', name: 'Cash', type: 'cash', balance: 700 }], incomes: [], expenses: [] },
            { seedMissingDefaults: false },
        )
        expect(migrated.accounts[0].openingBalance).toBe(700)
    })
})
