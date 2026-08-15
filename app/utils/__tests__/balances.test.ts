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
