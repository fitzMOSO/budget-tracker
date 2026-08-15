import { describe, it, expect } from 'vitest'
import { budgetReducer, seedState } from '../BudgetContext'
import { computeBalances } from '../../utils/balances'

describe('credit card statement payment', () => {
    it('debits the paying account', () => {
        const s = seedState()
        s.accounts = [{ id: 'a1', name: 'Bank', type: 'bank', openingBalance: 50000 }]
        s.creditCards = [{ id: 'cc1', bank: 'BPI', cardType: 'Visa' }]
        s.creditCardStatements = [{ id: 'st1', creditCardId: 'cc1', statementBalance: 20000, amountPaid: 0, dueDate: '2026-08-25', status: 'pending' }]

        const next = budgetReducer(s, {
            type: 'UPDATE_STATEMENT',
            payload: { ...s.creditCardStatements[0], amountPaid: 20000, status: 'paid', paidFromAccountId: 'a1', paidDate: '2026-08-16' },
        })

        // Regression: previously 50000 — the payment never left the account.
        expect(computeBalances(next).a1).toBe(30000)
    })

    it('reverses when the payment is undone', () => {
        const s = seedState()
        s.accounts = [{ id: 'a1', name: 'Bank', type: 'bank', openingBalance: 50000 }]
        s.creditCards = [{ id: 'cc1', bank: 'BPI', cardType: 'Visa' }]
        s.creditCardStatements = [{ id: 'st1', creditCardId: 'cc1', statementBalance: 20000, amountPaid: 20000, dueDate: '2026-08-25', status: 'paid', paidFromAccountId: 'a1' }]

        const next = budgetReducer(s, {
            type: 'UPDATE_STATEMENT',
            payload: { ...s.creditCardStatements[0], amountPaid: 0, status: 'pending', paidFromAccountId: undefined },
        })

        expect(computeBalances(next).a1).toBe(50000)
    })
})
