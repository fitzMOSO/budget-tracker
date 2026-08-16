// app/context/__tests__/edit-preserves-links.test.ts
//
// Why this file exists.
//
// UPDATE_* replaces a record wholesale, so every field the editing form does
// not carry is silently dropped. That is harmless for a field the form owns
// (clearing "notes" is supposed to clear it) and catastrophic for a STRUCTURAL
// LINK the form has never heard of:
//
//   * Expense.billId is the ONLY record that a bill was paid — `isPaid` is
//     derived from it. Dropping it un-pays the bill AND disarms the double-pay
//     guard, so the next "Pay Now" debits the account a second time for one
//     bill. That is the exact double-debit this branch exists to eliminate.
//   * Bill.recurringSourceId is the ONLY record that a bill was generated from
//     a recurring source. Dropping it makes GENERATE_RECURRING_BILLS stop
//     recognising that this month is already covered, so it generates a
//     duplicate bill — which, once paid, is a second real debit.
//
// The assertions below are therefore about money and records, not about types.
import { describe, it, expect } from 'vitest'
import { budgetReducer, seedState } from '../BudgetContext'
import { computeBalances, isPaidBill } from '../../utils/balances'
import type { AppState, Expense } from '../../types'

/** Checking with 20 000, one unpaid 18 000 rent bill. */
function stateWithRentBill(): AppState {
    const base = seedState()
    return {
        ...base,
        accounts: [{ id: 'a1', name: 'Checking', type: 'bank', openingBalance: 20000 }],
        categories: [{ id: 'c1', name: 'Rent', type: 'expense', color: '#000' }],
        bills: [{ id: 'b1', description: 'Rent', amount: 18000, dueDate: '2026-08-05', categoryId: 'c1' }],
        expenses: [],
    }
}

/** What paying b1 from Checking records — the linked expense IS the payment. */
const rentPayment: Expense = {
    id: 'e1',
    description: 'Rent',
    amount: 18000,
    date: '2026-08-05',
    categoryId: 'c1',
    accountId: 'a1',
    expenseType: 'essential',
    billId: 'b1',
}

describe('editing a bill-linked expense', () => {
    it('does not un-pay the bill and re-open the double debit', () => {
        const paid = budgetReducer(stateWithRentBill(), {
            type: 'PAY_BILL',
            payload: { billId: 'b1', expense: rentPayment },
        })
        expect(computeBalances(paid)).toEqual({ a1: 2000 })
        expect(isPaidBill(paid, 'b1')).toBe(true)

        // Exactly what the expenses form submits: every field it renders, plus
        // the id. It has never heard of billId.
        const edited = budgetReducer(paid, {
            type: 'UPDATE_EXPENSE',
            payload: {
                id: 'e1',
                description: 'Rent (August)', // the user fixed a typo, nothing else
                amount: 18000,
                date: '2026-08-05',
                categoryId: 'c1',
                accountId: 'a1',
                expenseType: 'essential',
                notes: undefined,
            } as Expense,
        })

        expect(edited.expenses[0].description).toBe('Rent (August)')

        // The money assertion first: the bill now reads Pending, the user hits
        // "Pay Now" again, and one 18 000 rent must not cost 36 000.
        const paidAgain = budgetReducer(edited, {
            type: 'PAY_BILL',
            payload: { billId: 'b1', expense: { ...rentPayment, id: 'e2' } },
        })
        expect(computeBalances(paidAgain)).toEqual({ a1: 2000 })
        expect(paidAgain.expenses, 'one rent was recorded twice').toHaveLength(1)
        expect(isPaidBill(edited, 'b1'), 'the bill flipped back to Pending').toBe(true)
    })

    it('still lets DELETE_BILL unlink the expense', () => {
        // Preserving billId must not make the link indelible: deleting the bill
        // keeps the expense (the money really moved) but drops the link.
        const paid = budgetReducer(stateWithRentBill(), {
            type: 'PAY_BILL',
            payload: { billId: 'b1', expense: rentPayment },
        })
        const unlinked = budgetReducer(paid, { type: 'DELETE_BILL', payload: 'b1' })

        expect(unlinked.expenses).toHaveLength(1)
        expect(unlinked.expenses[0].billId).toBeUndefined()
        expect(computeBalances(unlinked)).toEqual({ a1: 2000 })
    })
})

describe('editing a generated recurring bill', () => {
    it('keeps its link to the source, so no duplicate is generated for that month', () => {
        const base = seedState()
        const withBills: AppState = {
            ...base,
            accounts: [{ id: 'a1', name: 'Checking', type: 'bank', openingBalance: 20000 }],
            categories: [{ id: 'c1', name: 'Rent', type: 'expense', color: '#000' }],
            bills: [
                { id: 'src', description: 'Rent', amount: 18000, dueDate: '2026-07-05', isRecurring: true, categoryId: 'c1' },
                { id: 'gen', description: 'Rent', amount: 18000, dueDate: '2026-08-05', isRecurring: false, recurringSourceId: 'src', categoryId: 'c1' },
            ],
        }

        // Exactly what the bills form submits — it renders no recurringSourceId.
        const edited = budgetReducer(withBills, {
            type: 'UPDATE_BILL',
            payload: {
                id: 'gen',
                description: 'Rent',
                amount: 18500, // the landlord raised it
                dueDate: '2026-08-05',
                isRecurring: false,
                categoryId: 'c1',
                notes: undefined,
            },
        })
        expect(edited.bills.find((b) => b.id === 'gen')!.amount).toBe(18500)

        const generated = budgetReducer(edited, {
            type: 'GENERATE_RECURRING_BILLS',
            payload: { month: 8, year: 2026 },
        })
        const augustRents = generated.bills.filter(
            (b) => b.description === 'Rent' && b.dueDate.startsWith('2026-08'),
        )
        expect(augustRents, 'a duplicate August rent was generated').toHaveLength(1)
    })
})
