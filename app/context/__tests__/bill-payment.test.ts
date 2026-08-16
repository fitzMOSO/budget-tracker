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

    it('deleting a paid bill keeps the expense, which is the real transaction', () => {
        let s = pay(withBill())
        s = budgetReducer(s, { type: 'DELETE_BILL', payload: 'b1' })

        // A bill is a schedule annotation on a movement that really happened.
        // Deleting the annotation must not un-spend the money.
        expect(s.bills).toHaveLength(0)
        expect(s.expenses).toHaveLength(1)
        expect(s.expenses[0].billId).toBeUndefined()
        expect(computeBalances(s).a1).toBe(8000)
    })

    it('deleting a bill keeps an expense the user entered themselves', () => {
        // The expenses page stamps billId on the user's OWN expense when its
        // category is a bill category. Deleting the bill must not delete it.
        let s = withBill()
        s = budgetReducer(s, {
            type: 'ADD_EXPENSE',
            payload: { id: 'e5', description: 'Electric', amount: 2000, date: '2026-08-16', categoryId: 'c1', accountId: 'a1', expenseType: 'essential', billId: 'b1' },
        })
        s = budgetReducer(s, { type: 'DELETE_BILL', payload: 'b1' })

        expect(s.expenses.map((e) => e.id)).toEqual(['e5'])
        expect(s.expenses[0].billId).toBeUndefined()
        expect(computeBalances(s).a1).toBe(8000)
    })

    it('stopping a recurring bill keeps the expenses of the future bills it drops', () => {
        // The UI lets you navigate to a future month and pay a generated bill.
        // Turning recurring off deletes those future bills — taking the payment
        // with them would un-spend money the user never asked to touch.
        const nextYear = new Date().getFullYear() + 1
        let s = withBill({ id: 'src', description: 'Rent', isRecurring: true })
        s = budgetReducer(s, {
            type: 'ADD_BILL',
            payload: { id: 'gen', description: 'Rent', amount: 2000, dueDate: `${nextYear}-06-05`, recurringSourceId: 'src', categoryId: 'c1' },
        })
        s = pay(s, 'gen')
        expect(computeBalances(s).a1).toBe(8000)

        s = budgetReducer(s, { type: 'UPDATE_BILL', payload: { ...s.bills[0], isRecurring: false } })

        expect(s.bills.map((b) => b.id)).toEqual(['src'])
        expect(s.expenses).toHaveLength(1)
        expect(s.expenses[0].billId).toBeUndefined()
        expect(computeBalances(s).a1).toBe(8000)
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

describe('importing a pre-Task-6 backup', () => {
    // Exactly what settings.tsx hands to importData: the `data` object of a
    // backup exported before isPaid became derived.
    const legacyBackup = {
        accounts: [{ id: 'a1', name: 'Cash', type: 'cash' as const, openingBalance: 10000 }],
        bills: [
            { id: 'b1', description: 'Electric', amount: 2000, dueDate: '2026-08-20', isPaid: true, paidDate: '2026-08-16', paidFromAccountId: 'a1', categoryId: 'c1' },
            { id: 'b2', description: 'Water', amount: 500, dueDate: '2026-08-25', isPaid: false, categoryId: 'c1' },
        ],
        expenses: [
            { id: 'e1', description: 'Electric', amount: 2000, date: '2026-08-16', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' as const, notes: 'Auto-created from bill payment' },
        ],
    }

    function imported() {
        const s = seedState()
        s.accounts = []
        return budgetReducer(s, { type: 'IMPORT_DATA', payload: legacyBackup })
    }

    it('relinks the paid bill to the expense its payment created', () => {
        const s = imported()

        // Without this, the bill restores as UNPAID next to its own expense —
        // and paying it again debits the account a second time.
        expect(isPaidBill(s, 'b1')).toBe(true)
        expect(s.expenses).toHaveLength(1)
        expect(s.expenses[0].id).toBe('e1')
        expect(computeBalances(s).a1).toBe(8000)
    })

    it('strips the stored payment fields off imported bills', () => {
        const s = imported()

        expect(s.bills[0]).not.toHaveProperty('isPaid')
        expect(s.bills[0]).not.toHaveProperty('paidDate')
        expect(s.bills[0]).not.toHaveProperty('paidFromAccountId')
        expect(isPaidBill(s, 'b2')).toBe(false)
    })

    it('invents no expense for a paid bill with nothing to link', () => {
        const s = seedState()
        s.accounts = []
        const result = budgetReducer(s, {
            type: 'IMPORT_DATA',
            payload: { ...legacyBackup, expenses: [] },
        })

        // That money never moved, so creating an expense now would debit the
        // account for a payment that never happened.
        expect(result.expenses).toHaveLength(0)
        expect(computeBalances(result).a1).toBe(10000)
    })

    it('never claims an expense that was already in the app', () => {
        // The import appends to existing data; a bill from the backup must not
        // adopt an unrelated expense the user already had.
        let s = seedState()
        s.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 10000 }]
        s = budgetReducer(s, {
            type: 'ADD_EXPENSE',
            payload: { id: 'mine', description: 'Electric', amount: 2000, date: '2026-08-16', categoryId: 'c1', accountId: 'a1', expenseType: 'essential', notes: 'Auto-created from bill payment' },
        })
        s = budgetReducer(s, { type: 'IMPORT_DATA', payload: { ...legacyBackup, accounts: [], expenses: [] } })

        expect(s.expenses.find((e) => e.id === 'mine')?.billId).toBeUndefined()
        expect(isPaidBill(s, 'b1')).toBe(false)
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
