import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BudgetProvider, useBudget } from '../BudgetContext'

// The reducer refuses to pay an already-paid bill (it would debit twice). The
// UI must be able to tell that refusal apart from a real payment, or it reports
// "Bill paid successfully!" for something that did nothing.
function Harness({ results }: { results: boolean[] }) {
    const { state, addBill, payBill } = useBudget()
    const bill = state.bills[0]
    const accountId = state.accounts[0]?.id ?? ''

    return (
        <div>
            <button data-testid="add" onClick={() => addBill({ description: 'Electric', amount: 2000, dueDate: '2026-08-20' })} />
            <button data-testid="pay" onClick={() => bill && results.push(payBill(bill, accountId))} />
            <span data-testid="expenses">{state.expenses.length}</span>
            <span data-testid="bills">{state.bills.length}</span>
        </div>
    )
}

describe('payBill feedback', () => {
    beforeEach(() => localStorage.clear())

    it('reports whether the payment actually happened', async () => {
        const results: boolean[] = []
        render(<BudgetProvider><Harness results={results} /></BudgetProvider>)
        await waitFor(() => expect(Number(screen.getByTestId('bills').textContent)).toBe(0))

        fireEvent.click(screen.getByTestId('add'))
        await waitFor(() => expect(Number(screen.getByTestId('bills').textContent)).toBe(1))

        fireEvent.click(screen.getByTestId('pay'))
        await waitFor(() => expect(Number(screen.getByTestId('expenses').textContent)).toBe(1))

        // Second attempt on the same bill: no expense added, and the caller is
        // told so rather than being left to show a success toast.
        fireEvent.click(screen.getByTestId('pay'))
        await waitFor(() => expect(results).toHaveLength(2))

        expect(results).toEqual([true, false])
        expect(Number(screen.getByTestId('expenses').textContent)).toBe(1)
    })
})
