import { describe, it, expect } from 'vitest'
import { budgetReducer, seedState } from '../BudgetContext'
import { computeBalances } from '../../utils/balances'
import { checkDelete } from '../../utils/integrity'

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

describe('DELETE_TRANSFER', () => {
    function twoAccounts() {
        const base = seedState()
        base.accounts = [
            { id: 'a1', name: 'Cash', type: 'cash', openingBalance: 1000 },
            { id: 'a2', name: 'Bank', type: 'bank', openingBalance: 0 },
        ]
        return base
    }

    it('reverses the money exactly by removing the record', () => {
        // Deleting the record IS the whole reversal: the balance re-derives.
        // Any arithmetic in the case would be a second reversal.
        let state = twoAccounts()
        state = budgetReducer(state, {
            type: 'TRANSFER_FUNDS',
            payload: { id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 400, date: '2026-08-16' },
        })
        expect(computeBalances(state)).toEqual({ a1: 600, a2: 400 })

        state = budgetReducer(state, { type: 'DELETE_TRANSFER', payload: 't1' })

        expect(state.transfers).toEqual([])
        expect(computeBalances(state)).toEqual({ a1: 1000, a2: 0 })
    })

    it('does not touch the accounts themselves', () => {
        let state = twoAccounts()
        state = budgetReducer(state, {
            type: 'TRANSFER_FUNDS',
            payload: { id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 400, date: '2026-08-16' },
        })
        const before = state.accounts

        state = budgetReducer(state, { type: 'DELETE_TRANSFER', payload: 't1' })

        expect(state.accounts).toEqual(before)
    })

    it('removes only the named transfer', () => {
        let state = twoAccounts()
        for (const id of ['t1', 't2']) {
            state = budgetReducer(state, {
                type: 'TRANSFER_FUNDS',
                payload: { id, fromAccountId: 'a1', toAccountId: 'a2', amount: 100, date: '2026-08-16' },
            })
        }

        state = budgetReducer(state, { type: 'DELETE_TRANSFER', payload: 't1' })

        expect(state.transfers.map((t) => t.id)).toEqual(['t2'])
        expect(computeBalances(state)).toEqual({ a1: 900, a2: 100 })
    })

    it('is a no-op for an id that is not a transfer', () => {
        const state = twoAccounts()
        expect(budgetReducer(state, { type: 'DELETE_TRANSFER', payload: 'nope' })).toEqual(state)
    })

    it('frees BOTH accounts a transfer had made permanently undeletable', () => {
        // The regression this closes: `checkDelete` counts transfers as account
        // references, and before DELETE_TRANSFER existed a single mistyped
        // transfer trapped both of its accounts forever.
        let state = twoAccounts()
        state = budgetReducer(state, {
            type: 'TRANSFER_FUNDS',
            payload: { id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 400, date: '2026-08-16' },
        })
        expect(checkDelete(state, 'account', 'a1').allowed).toBe(false)
        expect(checkDelete(state, 'account', 'a2').allowed).toBe(false)

        state = budgetReducer(state, { type: 'DELETE_TRANSFER', payload: 't1' })

        expect(checkDelete(state, 'account', 'a1').allowed).toBe(true)
        expect(checkDelete(state, 'account', 'a2').allowed).toBe(true)
        state = budgetReducer(state, { type: 'DELETE_ACCOUNT', payload: 'a1' })
        expect(state.accounts.map((a) => a.id)).toEqual(['a2'])
    })

    it('lets a mistyped transfer be corrected by delete-and-re-add', () => {
        // Why there is no UPDATE_TRANSFER: nothing in the state references a
        // transfer id, so this sequence is indistinguishable from an in-place
        // edit, and a second mutation path would be one more place to get the
        // effect signs wrong.
        let state = twoAccounts()
        state = budgetReducer(state, {
            type: 'TRANSFER_FUNDS',
            payload: { id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 4000, date: '2026-08-16' },
        })
        state = budgetReducer(state, { type: 'DELETE_TRANSFER', payload: 't1' })
        state = budgetReducer(state, {
            type: 'TRANSFER_FUNDS',
            payload: { id: 't2', fromAccountId: 'a1', toAccountId: 'a2', amount: 400, date: '2026-08-16' },
        })

        expect(computeBalances(state)).toEqual({ a1: 600, a2: 400 })
    })
})
