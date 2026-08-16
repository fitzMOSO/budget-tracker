// app/utils/__tests__/goal-progress.test.ts
//
// A savings goal's progress is DERIVED, never stored. A linked goal reads the
// derived balance of its account; an unlinked goal sums its own contributions.
// The stored `SavingsGoal.currentAmount` was a second copy of that number, and
// a second copy is a copy that drifts: editing a goal used to overwrite it from
// whatever balance happened to be on screen.
import { describe, it, expect } from 'vitest'
import { goalProgress, totalGoalProgress } from '../balances'
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

    it('ignores the stored currentAmount entirely', () => {
        // The drift this removes: Task 5 deleted the re-sync blocks, so a stored
        // currentAmount has been going stale ever since. It must not be read.
        const s = seedState()
        s.accounts = [{ id: 'a2', name: 'Savings', type: 'bank', openingBalance: 5000 }]
        s.savingsGoals = [
            { id: 'g1', name: 'Linked', targetAmount: 10000, currentAmount: 999999, linkedAccountId: 'a2' },
            { id: 'g2', name: 'Unlinked', targetAmount: 10000, currentAmount: 999999 },
        ]

        expect(goalProgress(s, s.savingsGoals[0])).toBe(5000)
        expect(goalProgress(s, s.savingsGoals[1])).toBe(0)
    })

    it('moves with the records that move the linked account', () => {
        const s = seedState()
        s.accounts = [{ id: 'a2', name: 'Savings', type: 'bank', openingBalance: 5000 }]
        s.savingsGoals = [{ id: 'g1', name: 'Fund', targetAmount: 10000, currentAmount: 0, linkedAccountId: 'a2' }]
        s.incomes = [{ id: 'i1', description: 'Pay', amount: 1200, date: '2026-08-01', categoryId: 'c1', accountId: 'a2' }]
        s.expenses = [{ id: 'e1', description: 'Fees', amount: 200, date: '2026-08-02', categoryId: 'c1', accountId: 'a2', expenseType: 'essential' }]

        expect(goalProgress(s, s.savingsGoals[0])).toBe(6000)
    })

    it('reports zero for a goal linked to an account that no longer exists', () => {
        // Not NaN, and not a resurrected phantom account.
        const s = seedState()
        s.accounts = []
        s.savingsGoals = [{ id: 'g1', name: 'Fund', targetAmount: 10000, currentAmount: 0, linkedAccountId: 'gone' }]

        expect(goalProgress(s, s.savingsGoals[0])).toBe(0)
    })

    it('does not resolve a linked account id that is an Object.prototype key', () => {
        const s = seedState()
        s.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 100 }]
        s.savingsGoals = [{ id: 'g1', name: 'Trap', targetAmount: 10, currentAmount: 0, linkedAccountId: 'constructor' }]

        expect(goalProgress(s, s.savingsGoals[0])).toBe(0)
    })
})

// "Total saved" is not Σ goalProgress. Two goals can point at the SAME account —
// "Emergency fund" and "New laptop" both funded out of the one savings account is
// an ordinary way to use the feature — and that account's balance is one pile of
// money, not two. Summing per goal counted it twice and reported a total the user
// does not have. Every screen showing a total must go through this function.
describe('totalGoalProgress', () => {
    it('counts an account shared by two goals only once', () => {
        const s = seedState()
        s.accounts = [{ id: 'a2', name: 'Savings', type: 'bank', openingBalance: 5000 }]
        s.savingsGoals = [
            { id: 'g1', name: 'Emergency', targetAmount: 10000, currentAmount: 0, linkedAccountId: 'a2' },
            { id: 'g2', name: 'Laptop', targetAmount: 40000, currentAmount: 0, linkedAccountId: 'a2' },
        ]

        expect(goalProgress(s, s.savingsGoals[0])).toBe(5000)
        expect(goalProgress(s, s.savingsGoals[1])).toBe(5000)
        // The pile is 5000, not 10000.
        expect(totalGoalProgress(s)).toBe(5000)
    })

    it('adds up distinct accounts and unlinked goals', () => {
        const s = seedState()
        s.accounts = [
            { id: 'a2', name: 'Savings', type: 'bank', openingBalance: 5000 },
            { id: 'a3', name: 'Wallet', type: 'e-wallet', openingBalance: 700 },
        ]
        s.savingsGoals = [
            { id: 'g1', name: 'Emergency', targetAmount: 10000, currentAmount: 0, linkedAccountId: 'a2' },
            { id: 'g2', name: 'Trip', targetAmount: 2000, currentAmount: 0, linkedAccountId: 'a3' },
            { id: 'g3', name: 'Gifts', targetAmount: 1000, currentAmount: 0 },
        ]
        s.savingsContributions = [{ id: 'sc1', savingsGoalId: 'g3', amount: 300, date: '2026-08-01' }]

        expect(totalGoalProgress(s)).toBe(6000)
    })

    it('is zero when there are no goals', () => {
        const s = seedState()
        s.savingsGoals = []

        expect(totalGoalProgress(s)).toBe(0)
    })
})
