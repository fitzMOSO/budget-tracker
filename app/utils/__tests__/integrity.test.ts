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

    it('leaves another goal contributions alone', () => {
        const s = seedState()
        s.savingsGoals = [
            { id: 'g1', name: 'Fund', targetAmount: 100, currentAmount: 0 },
            { id: 'g2', name: 'Other', targetAmount: 100, currentAmount: 0 },
        ]
        s.savingsContributions = [
            { id: 'sc1', savingsGoalId: 'g1', amount: 50, date: '2026-08-01' },
            { id: 'sc2', savingsGoalId: 'g2', amount: 20, date: '2026-08-01' },
        ]

        const next = budgetReducer(s, { type: 'DELETE_SAVINGS_GOAL', payload: 'g1' })
        expect(next.savingsGoals.map((g) => g.id)).toEqual(['g2'])
        expect(next.savingsContributions.map((c) => c.id)).toEqual(['sc2'])
    })

    it('cascadeDelete is the same function the reducer uses', () => {
        const s = seedState()
        s.creditCards = [{ id: 'cc1', bank: 'BPI', cardType: 'Visa' }]
        s.creditCardStatements = [{ id: 'st1', creditCardId: 'cc1', statementBalance: 100, amountPaid: 0, dueDate: '2026-08-25', status: 'pending' }]

        expect(budgetReducer(s, { type: 'DELETE_CREDIT_CARD', payload: 'cc1' })).toEqual(
            cascadeDelete(s, 'creditCard', 'cc1'),
        )
    })
})

describe('referenced-by coverage', () => {
    const base = () => {
        const s = seedState()
        s.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 0 }]
        return s
    }

    it('counts a transfer that only leaves the account', () => {
        const s = base()
        s.transfers = [{ id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 10, date: '2026-08-01' }]
        const result = checkDelete(s, 'account', 'a1')
        expect(result.allowed).toBe(false)
        if (!result.allowed) expect(result.count).toBe(1)
    })

    it('counts a transfer that only arrives at the account', () => {
        const s = base()
        s.transfers = [{ id: 't1', fromAccountId: 'a2', toAccountId: 'a1', amount: 10, date: '2026-08-01' }]
        expect(checkDelete(s, 'account', 'a1').allowed).toBe(false)
    })

    it('counts incomes, contributions, statement payments and linked goals', () => {
        const s = base()
        s.incomes = [{ id: 'i1', description: 'Pay', amount: 100, date: '2026-08-01', categoryId: 'c1', accountId: 'a1' }]
        s.savingsContributions = [{ id: 'sc1', savingsGoalId: 'g1', amount: 5, date: '2026-08-01', fromAccountId: 'a1' }]
        s.creditCardStatements = [{ id: 'st1', creditCardId: 'cc1', statementBalance: 10, amountPaid: 10, dueDate: '2026-08-25', status: 'paid', paidFromAccountId: 'a1' }]
        s.savingsGoals = [{ id: 'g1', name: 'Fund', targetAmount: 10, currentAmount: 0, linkedAccountId: 'a1' }]

        const result = checkDelete(s, 'account', 'a1')
        expect(result.allowed).toBe(false)
        if (!result.allowed) expect(result.count).toBe(4)
    })

    it('does not count a bill directly — only its linked expense protects the account', () => {
        const s = base()
        s.bills = [{ id: 'b1', description: 'Internet', amount: 50, dueDate: '2026-08-10', categoryId: 'c1' }]
        expect(checkDelete(s, 'account', 'a1').allowed).toBe(true)

        s.expenses = [{ id: 'e1', description: 'Internet', amount: 50, date: '2026-08-10', categoryId: 'c1', accountId: 'a1', expenseType: 'essential', billId: 'b1' }]
        expect(checkDelete(s, 'account', 'a1').allowed).toBe(false)
    })

    it('counts incomes and bills against a category', () => {
        const s = seedState()
        s.incomes = [{ id: 'i1', description: 'Pay', amount: 100, date: '2026-08-01', categoryId: 'c1' }]
        s.bills = [{ id: 'b1', description: 'Internet', amount: 50, dueDate: '2026-08-10', categoryId: 'c1' }]
        const result = checkDelete(s, 'category', 'c1')
        expect(result.allowed).toBe(false)
        if (!result.allowed) expect(result.count).toBe(2)
    })

    it('explains itself with a typed reason', () => {
        const s = base()
        s.transfers = [{ id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 10, date: '2026-08-01' }]
        const result = checkDelete(s, 'account', 'a1')
        if (result.allowed) throw new Error('expected the delete to be blocked')
        expect(result.reason).toContain('1 record')
        expect(result.reason).toContain('account')
    })
})

describe('the reducer enforces the block, not just the UI', () => {
    it('refuses to delete a referenced account', () => {
        const s = seedState()
        s.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 0 }]
        s.transfers = [{ id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 10, date: '2026-08-01' }]

        const next = budgetReducer(s, { type: 'DELETE_ACCOUNT', payload: 'a1' })
        expect(next.accounts.map((a) => a.id)).toEqual(['a1'])
    })

    it('deletes an unreferenced account', () => {
        const s = seedState()
        s.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 0 }]

        const next = budgetReducer(s, { type: 'DELETE_ACCOUNT', payload: 'a1' })
        expect(next.accounts).toEqual([])
    })

    it('refuses to delete a referenced category and keeps an unreferenced one deletable', () => {
        const s = seedState()
        s.categories = [
            { id: 'c1', name: 'Food', type: 'expense', color: '#000' },
            { id: 'c2', name: 'Unused', type: 'expense', color: '#111' },
        ]
        s.expenses = [{ id: 'e1', description: 'Food', amount: 10, date: '2026-08-01', categoryId: 'c1', expenseType: 'essential' }]

        expect(budgetReducer(s, { type: 'DELETE_CATEGORY', payload: 'c1' }).categories.map((c) => c.id)).toEqual(['c1', 'c2'])
        expect(budgetReducer(s, { type: 'DELETE_CATEGORY', payload: 'c2' }).categories.map((c) => c.id)).toEqual(['c1'])
    })
})
