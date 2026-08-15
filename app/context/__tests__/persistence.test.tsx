import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BudgetProvider, useBudget, budgetReducer, seedState } from '../BudgetContext'

const STORAGE_KEY = 'budget-tracker-data'

function Probe() {
    const { state } = useBudget()
    return (
        <div>
            <span data-testid="categories">{state.categories.length}</span>
            <span data-testid="accounts">{state.accounts.length}</span>
        </div>
    )
}

describe('persistence safety', () => {
    beforeEach(() => localStorage.clear())

    it('does not overwrite unparseable stored data', async () => {
        const corrupt = '{"categories":[{"id":"a"' // truncated JSON
        localStorage.setItem(STORAGE_KEY, corrupt)

        render(<BudgetProvider><Probe /></BudgetProvider>)
        await waitFor(() => expect(screen.getByTestId('categories')).toBeInTheDocument())

        // The damaged blob must still be there for manual recovery.
        expect(localStorage.getItem(STORAGE_KEY)).toBe(corrupt)
    })

    it('seeds default categories and accounts on first run', async () => {
        render(<BudgetProvider><Probe /></BudgetProvider>)
        await waitFor(() => {
            expect(Number(screen.getByTestId('categories').textContent)).toBeGreaterThan(0)
            expect(Number(screen.getByTestId('accounts').textContent)).toBeGreaterThan(0)
        })
    })

    it('RESET_STATE re-seeds defaults rather than emptying the app', () => {
        const populated = seedState()
        const reset = budgetReducer(populated, { type: 'RESET_STATE' })

        expect(reset.categories.length).toBeGreaterThan(0)
        expect(reset.accounts.length).toBeGreaterThan(0)
        expect(reset.expenses).toEqual([])
        expect(reset.incomes).toEqual([])
    })
})
