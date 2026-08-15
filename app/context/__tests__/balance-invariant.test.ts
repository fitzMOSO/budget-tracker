import { describe, it, expect } from 'vitest'
import { budgetReducer, seedState } from '../BudgetContext'
import { computeBalances, isPaidBill } from '../../utils/balances'
import { buildBillExpense } from '../../utils/bill-payment'
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

    it('income add/update/delete leaves openingBalance untouched', () => {
        let s = base()
        s = budgetReducer(s, { type: 'ADD_INCOME', payload: { id: 'i1', description: 'Pay', amount: 500, date: '2026-08-01', categoryId: 'c1', accountId: 'a1' } })
        expect(computeBalances(s).a1).toBe(1500)
        s = budgetReducer(s, { type: 'UPDATE_INCOME', payload: { id: 'i1', description: 'Pay', amount: 800, date: '2026-08-01', categoryId: 'c1', accountId: 'a1' } })
        expect(computeBalances(s).a1).toBe(1800)
        s = budgetReducer(s, { type: 'DELETE_INCOME', payload: 'i1' })
        expect(computeBalances(s).a1).toBe(1000)
        expect(s.accounts[0].openingBalance).toBe(1000)
    })

    it('paying and unpaying a bill moves money only through the linked expense', () => {
        let s = base()
        s = budgetReducer(s, { type: 'ADD_BILL', payload: { id: 'b1', description: 'Rent', amount: 300, dueDate: '2026-08-05' } })
        const payment = { billId: 'b1', expense: buildBillExpense(s.bills[0], 'a1', { id: 'e1', date: '2026-08-05' }) }

        s = budgetReducer(s, { type: 'PAY_BILL', payload: payment })
        // The bill itself never moves money; the expense it created does.
        expect(computeBalances(s).a1).toBe(700)
        expect(isPaidBill(s, 'b1')).toBe(true)

        s = budgetReducer(s, { type: 'UNPAY_BILL', payload: 'b1' })
        expect(computeBalances(s).a1).toBe(1000)

        s = budgetReducer(s, { type: 'PAY_BILL', payload: payment })
        s = budgetReducer(s, { type: 'DELETE_BILL', payload: 'b1' })
        expect(computeBalances(s).a1).toBe(1000)
        expect(s.accounts[0].openingBalance).toBe(1000)
    })

    it('savings contributions move money only through the derived model', () => {
        let s = base()
        s.accounts = [
            { id: 'a1', name: 'Cash', type: 'cash', openingBalance: 1000 },
            { id: 'a2', name: 'Savings', type: 'bank', openingBalance: 0 },
        ]
        s = budgetReducer(s, { type: 'ADD_SAVINGS_GOAL', payload: { id: 'g1', name: 'Fund', targetAmount: 5000, currentAmount: 0, linkedAccountId: 'a2' } })
        s = budgetReducer(s, { type: 'ADD_SAVINGS_CONTRIBUTION', payload: { id: 'sc1', savingsGoalId: 'g1', amount: 200, date: '2026-08-01', fromAccountId: 'a1' } })

        const afterAdd = computeBalances(s)
        expect(afterAdd.a1).toBe(800)
        expect(afterAdd.a2).toBe(200)

        s = budgetReducer(s, { type: 'UPDATE_SAVINGS_CONTRIBUTION', payload: { id: 'sc1', savingsGoalId: 'g1', amount: 500, date: '2026-08-01', fromAccountId: 'a1' } })
        const afterUpdate = computeBalances(s)
        expect(afterUpdate.a1).toBe(500)
        expect(afterUpdate.a2).toBe(500)

        s = budgetReducer(s, { type: 'DELETE_SAVINGS_CONTRIBUTION', payload: 'sc1' })
        const afterDelete = computeBalances(s)
        expect(afterDelete.a1).toBe(1000)
        expect(afterDelete.a2).toBe(0)
        expect(s.accounts.map((a) => a.openingBalance)).toEqual([1000, 0])
    })

    it('UPDATE_ACCOUNT stores the edited openingBalance verbatim', () => {
        let s = base()
        s = budgetReducer(s, { type: 'ADD_EXPENSE', payload: { id: 'e1', description: 'Food', amount: 250, date: '2026-08-01', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' } })
        s = budgetReducer(s, { type: 'UPDATE_ACCOUNT', payload: { id: 'a1', name: 'Cash', type: 'cash', openingBalance: 2000 } })

        expect(s.accounts[0].openingBalance).toBe(2000)
        expect(computeBalances(s).a1).toBe(1750)
    })
})
