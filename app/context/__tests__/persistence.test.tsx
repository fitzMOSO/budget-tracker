import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BudgetProvider, useBudget, budgetReducer, seedState } from '../BudgetContext'
import { V1_BACKUP_KEY } from '../../utils/migrations'

const STORAGE_KEY = 'budget-tracker-data'

const v1Blob = {
    categories: [{ id: 'c1', name: 'Rent', type: 'expense', color: '#000' }],
    accounts: [{ id: 'a1', name: 'Cash', type: 'cash', balance: 700 }],
    incomes: [{ id: 'i1', description: 'Pay', amount: 1000, date: '2026-08-01', categoryId: 'c1', accountId: 'a1' }],
    expenses: [{ id: 'e1', description: 'Food', amount: 300, date: '2026-08-02', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' }],
    bills: [], creditCards: [], creditCardStatements: [],
    savingsGoals: [], savingsContributions: [], monthlyBudgets: [],
    settings: { currency: 'PHP', currencySymbol: '₱', defaultEssentialsPercentage: 50, defaultNonEssentialsPercentage: 30, defaultSavingsPercentage: 20, theme: 'light' },
}

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

    it('backs up a pre-migration v1 blob byte-identically before migrating', async () => {
        const raw = JSON.stringify(v1Blob)
        localStorage.setItem(STORAGE_KEY, raw)

        render(<BudgetProvider><Probe /></BudgetProvider>)
        await waitFor(() => {
            expect(Number(screen.getByTestId('accounts').textContent)).toBeGreaterThan(0)
        })

        // Byte-identical to the exact original string, not a deep-equal of a
        // reparsed object — the backup exists to let a human diff/restore the
        // untouched original, so re-serializing it would defeat the point.
        expect(localStorage.getItem(V1_BACKUP_KEY)).toBe(raw)
    })

    it('does not overwrite an existing backup on a second load', async () => {
        const firstRaw = JSON.stringify(v1Blob)
        const preExistingBackup = '{"already":"backed up"}'
        localStorage.setItem(STORAGE_KEY, firstRaw)
        localStorage.setItem(V1_BACKUP_KEY, preExistingBackup)

        render(<BudgetProvider><Probe /></BudgetProvider>)
        await waitFor(() => {
            expect(Number(screen.getByTestId('accounts').textContent)).toBeGreaterThan(0)
        })

        expect(localStorage.getItem(V1_BACKUP_KEY)).toBe(preExistingBackup)
    })

    it('leaves budget-tracker-data intact when migrate throws a MigrationError (distinct from a JSON.parse failure)', async () => {
        // Valid JSON, but recognisably not this app's data -> migrate() throws
        // MigrationError, as opposed to the truncated-JSON case above which
        // fails inside JSON.parse before migrate() ever runs.
        const unusable = JSON.stringify({ nonsense: true })
        localStorage.setItem(STORAGE_KEY, unusable)

        render(<BudgetProvider><Probe /></BudgetProvider>)
        await waitFor(() => expect(screen.getByTestId('categories')).toBeInTheDocument())

        expect(localStorage.getItem(STORAGE_KEY)).toBe(unusable)
    })
})
