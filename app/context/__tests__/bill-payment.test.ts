import { describe, it, expect } from 'vitest'
import { budgetReducer, seedState } from '../BudgetContext'
import { computeBalances, isPaidBill, linkedBillExpense } from '../../utils/balances'
import { buildBillExpense } from '../../utils/bill-payment'
import type { AppState, Bill } from '../../types'

function withBill(overrides: Partial<Bill> = {}): AppState {
    const s = seedState()
    s.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 10000 }]
    s.bills = [{ id: 'b1', description: 'Electric', amount: 2000, dueDate: '2026-08-20', categoryId: 'c1', ...overrides }]
    return s
}

function pay(state: AppState, billId = 'b1', accountId = 'a1'): AppState {
    const bill = state.bills.find((b) => b.id === billId)!
    return budgetReducer(state, {
        type: 'PAY_BILL',
        payload: { billId, expense: buildBillExpense(bill, accountId, { id: 'e1', date: '2026-08-16' }) },
    })
}

describe('paying a bill', () => {
    it('debits the account exactly once', () => {
        const s = pay(withBill())

        // Regression: this was 6000 because PAY_BILL and ADD_EXPENSE both deducted.
        expect(computeBalances(s).a1).toBe(8000)
        expect(s.expenses).toHaveLength(1)
    })

    it('derives isPaid from the linked expense, storing no flag', () => {
        const s = pay(withBill())

        expect(isPaidBill(s, 'b1')).toBe(true)
        expect(s.bills[0]).not.toHaveProperty('isPaid')
        expect(linkedBillExpense(s, 'b1')?.id).toBe('e1')
    })

    it('moves money for an uncategorised bill too', () => {
        // Regression: the bills page skipped addExpense entirely when the bill
        // had no categoryId, so paying it moved no money at all.
        const s = pay(withBill({ categoryId: undefined }))

        expect(computeBalances(s).a1).toBe(8000)
        expect(s.expenses[0].categoryId).toBe('')
    })

    it('cannot be paid twice', () => {
        let s = pay(withBill())
        s = budgetReducer(s, {
            type: 'PAY_BILL',
            payload: { billId: 'b1', expense: buildBillExpense(s.bills[0], 'a1', { id: 'e2', date: '2026-08-17' }) },
        })

        expect(s.expenses).toHaveLength(1)
        expect(computeBalances(s).a1).toBe(8000)
    })

    it('unpaying removes the linked expense and restores the balance', () => {
        let s = pay(withBill())
        s = budgetReducer(s, { type: 'UNPAY_BILL', payload: 'b1' })

        expect(computeBalances(s).a1).toBe(10000)
        expect(s.expenses).toHaveLength(0)
        expect(isPaidBill(s, 'b1')).toBe(false)
    })

    it('editing the amount after paying cannot inflate the refund', () => {
        let s = pay(withBill())
        s = budgetReducer(s, { type: 'UPDATE_BILL', payload: { ...s.bills[0], amount: 6000 } })
        s = budgetReducer(s, { type: 'UNPAY_BILL', payload: 'b1' })

        // Regression: previously refunded the NEW amount, minting 4000.
        expect(computeBalances(s).a1).toBe(10000)
    })

    it('deleting a paid bill takes its expense with it', () => {
        let s = pay(withBill())
        s = budgetReducer(s, { type: 'DELETE_BILL', payload: 'b1' })

        expect(s.bills).toHaveLength(0)
        expect(s.expenses).toHaveLength(0)
        expect(computeBalances(s).a1).toBe(10000)
    })

    it('leaves unrelated expenses alone when unpaying', () => {
        let s = pay(withBill())
        s = budgetReducer(s, {
            type: 'ADD_EXPENSE',
            payload: { id: 'e9', description: 'Coffee', amount: 100, date: '2026-08-16', categoryId: 'c1', accountId: 'a1', expenseType: 'non-essential' },
        })
        s = budgetReducer(s, { type: 'UNPAY_BILL', payload: 'b1' })

        expect(s.expenses.map((e) => e.id)).toEqual(['e9'])
        expect(computeBalances(s).a1).toBe(9900)
    })
})

describe('buildBillExpense', () => {
    it('is the single shape every payment path produces', () => {
        const bill: Bill = { id: 'b1', description: 'Electric', amount: 2000, dueDate: '2026-08-20', categoryId: 'c1' }
        const expense = buildBillExpense(bill, 'a1', { id: 'e1', date: '2026-08-16' })

        expect(expense).toEqual({
            id: 'e1',
            description: 'Electric',
            amount: 2000,
            date: '2026-08-16',
            categoryId: 'c1',
            accountId: 'a1',
            expenseType: 'essential',
            billId: 'b1',
            notes: 'Auto-created from bill payment',
        })
    })
})
