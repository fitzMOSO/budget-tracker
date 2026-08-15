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
