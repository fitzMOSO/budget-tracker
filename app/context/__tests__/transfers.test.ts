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
