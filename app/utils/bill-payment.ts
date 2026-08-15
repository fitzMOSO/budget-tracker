// app/utils/bill-payment.ts
//
// The single place a bill payment is turned into money movement. A bill never
// moves money; paying one creates an expense, and the expense IS the movement.
// Every caller (bills page, dashboard, reducer tests) builds the expense here so
// a second, subtly different payment path cannot appear.
import type { Bill, Expense } from '../types'
import { getTodayISO } from './index'
import { v4 as uuidv4 } from 'uuid'

/** Marks an expense the app created on the user's behalf when a bill was paid. */
export const BILL_PAYMENT_NOTE = 'Auto-created from bill payment'

export function buildBillExpense(
    bill: Bill,
    accountId: string,
    // Overrides exist so tests (and any future backdated payment UI) can be
    // deterministic; production callers pass neither.
    overrides: { id?: string; date?: string } = {},
): Expense {
    return {
        id: overrides.id ?? uuidv4(),
        description: bill.description,
        amount: bill.amount,
        date: overrides.date ?? getTodayISO(),
        // An uncategorised bill still moves money. The old bills page skipped
        // creating the expense entirely when categoryId was missing, so paying
        // such a bill debited nothing.
        categoryId: bill.categoryId ?? '',
        accountId,
        expenseType: 'essential',
        billId: bill.id,
        notes: BILL_PAYMENT_NOTE,
    }
}
