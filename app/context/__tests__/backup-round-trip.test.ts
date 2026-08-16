// app/context/__tests__/backup-round-trip.test.ts
//
// Why this file exists.
//
// The JSON backup is the only copy of a user's data that leaves the device, and
// the binding constraint is "never destroy user data". A backup that
// omits a collection does not merely lose history in the derived-balance model:
// balances ARE the records, so a dropped transfer MOVES MONEY BACK, silently
// and permanently, on the one operation the user performs precisely because
// they are afraid of losing data.
//
// So these tests round-trip through the real export builder and the real
// IMPORT_DATA reducer, and assert on derived balances and record counts.
import { describe, it, expect } from 'vitest'
import { budgetReducer, seedState } from '../BudgetContext'
import { computeBalances } from '../../utils/balances'
import { buildBackup } from '../../utils/backup'
import type { AppState } from '../../types'

/** A state with nothing seeded, so an import's own records are the whole story. */
function emptyState(): AppState {
    return { ...seedState(), categories: [], accounts: [] }
}

/** Income 1 000 into Checking, then 400 moved to Savings: 600 / 400. */
function stateWithTransfer(): AppState {
    return {
        ...emptyState(),
        categories: [{ id: 'c1', name: 'Salary', type: 'income', color: '#000' }],
        accounts: [
            { id: 'a1', name: 'Checking', type: 'bank', openingBalance: 0 },
            { id: 'a2', name: 'Savings', type: 'bank', openingBalance: 0 },
        ],
        incomes: [{ id: 'i1', description: 'Pay', amount: 1000, date: '2026-08-01', categoryId: 'c1', accountId: 'a1' }],
        transfers: [{ id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 400, date: '2026-08-02' }],
    }
}

/** Export -> JSON -> import, exactly as Settings does it. */
function restore(state: AppState, into: AppState = emptyState()): AppState {
    const envelope = JSON.parse(JSON.stringify(buildBackup(state)))
    return budgetReducer(into, { type: 'IMPORT_DATA', payload: envelope.data })
}

describe('backup round-trip', () => {
    it('does not move money back by dropping transfers', () => {
        const before = stateWithTransfer()
        expect(computeBalances(before)).toEqual({ a1: 600, a2: 400 })

        const after = restore(before)

        expect(computeBalances(after), 'the backup moved money').toEqual({ a1: 600, a2: 400 })
        expect(after.transfers, 'the transfer record is gone').toHaveLength(1)
    })

    it('restores every collection the app can hold', () => {
        const before: AppState = {
            ...stateWithTransfer(),
            expenses: [{ id: 'e1', description: 'Food', amount: 100, date: '2026-08-03', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' }],
            bills: [{ id: 'b1', description: 'Rent', amount: 50, dueDate: '2026-08-10', categoryId: 'c1' }],
            creditCards: [{ id: 'cc1', bank: 'Bank', cardType: 'Visa' }],
            creditCardStatements: [{ id: 's1', creditCardId: 'cc1', statementBalance: 200, amountPaid: 0, dueDate: '2026-08-20', status: 'pending' }],
            savingsGoals: [{ id: 'g1', name: 'Fund', targetAmount: 1000, currentAmount: 0 }],
            savingsContributions: [{ id: 'sc1', savingsGoalId: 'g1', amount: 25, date: '2026-08-04', fromAccountId: 'a1' }],
            monthlyBudgets: [{ id: 'mb1', month: 8, year: 2026, totalIncome: 1000, essentialsPercentage: 50, nonEssentialsPercentage: 30, savingsPercentage: 20 }],
        }

        const after = restore(before)

        for (const key of Object.keys(before) as (keyof AppState)[]) {
            if (!Array.isArray(before[key])) continue
            expect(
                (after[key] as unknown[]).length,
                `the backup lost every record in "${key}"`,
            ).toBe((before[key] as unknown[]).length)
        }
        expect(computeBalances(after)).toEqual({ a1: 475, a2: 400 })
    })
})

describe('restoring a backup exported by a pre-branch build', () => {
    // Accounts still carry a stored `balance` and no `openingBalance`; bills
    // still carry `isPaid`. Nothing stamps a schema version into these files,
    // so the import has to recognise the shape.
    const preBranchData = {
        categories: [{ id: 'c1', name: 'Salary', type: 'income', color: '#000' }],
        accounts: [{ id: 'a1', name: 'Checking', type: 'bank', balance: 700 }],
        incomes: [{ id: 'i1', description: 'Pay', amount: 1000, date: '2026-08-01', categoryId: 'c1', accountId: 'a1' }],
        expenses: [{ id: 'e1', description: 'Food', amount: 300, date: '2026-08-02', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' }],
        bills: [],
        creditCards: [],
        creditCardStatements: [],
        savingsGoals: [],
        savingsContributions: [],
        monthlyBudgets: [],
    }

    it('shows the balance the old build showed, not 0 and not NaN', () => {
        const after = budgetReducer(emptyState(), {
            type: 'IMPORT_DATA',
            payload: preBranchData as unknown as Partial<AppState>,
        })

        const balances = computeBalances(after)
        expect(Number.isFinite(balances.a1), `a1 derived ${balances.a1}`).toBe(true)
        expect(balances.a1).toBe(700)
    })

    it('leaves no account without an openingBalance', () => {
        const after = budgetReducer(emptyState(), {
            type: 'IMPORT_DATA',
            payload: preBranchData as unknown as Partial<AppState>,
        })

        for (const account of after.accounts) {
            expect(typeof account.openingBalance, `${account.id} has no opening balance`).toBe('number')
        }
    })
})
