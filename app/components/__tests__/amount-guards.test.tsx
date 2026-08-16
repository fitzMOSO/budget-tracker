import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BudgetProvider, useBudget } from '../../context/BudgetContext'
import { QuickActions } from '../QuickActions'
import QuickAddPage from '../../quick-add/page'
import { INVALID_AMOUNT_MESSAGE } from '../../utils'

// Why this file exists.
//
// Every one of these forms reads its amount with `parseFloat(<text input>)`. An
// empty or junk field yields `NaN`, and `NaN <= 0` is **false**, so a guard
// spelled `if (amount <= 0)` waves NaN straight through. In the derived-balance
// model that is the worst possible input: the NaN becomes an effect, the effect
// is summed into the account's balance, and from then on the balance is `NaN`
// forever. There is no "correct the amount" recovery, because the record's own
// amount is unreadable — the only fix is to find and delete the record.
//
// So these tests drive the real components, submit with the amount left blank,
// and assert two things: nothing was recorded, and the balance is still a
// number. `Number.isFinite` in the shared guard is what makes that true.

const showError = vi.fn()
const showSuccess = vi.fn()
vi.mock('../../utils/swal', () => ({
    showError: (...args: unknown[]) => showError(...args),
    showSuccess: (...args: unknown[]) => showSuccess(...args),
    showDeleteConfirm: vi.fn(),
    showConfirm: vi.fn(),
}))

const push = vi.fn()
let searchType = 'expense'
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    useSearchParams: () => new URLSearchParams(`type=${searchType}`),
}))

/** Renders what the reducer actually recorded, and every derived balance. */
function Probe() {
    const { state, balanceOf } = useBudget()
    return (
        <div>
            <span data-testid="accounts">{state.accounts.length}</span>
            <span data-testid="records">
                {state.incomes.length + state.expenses.length + state.transfers.length}
            </span>
            <span data-testid="balances">
                {state.accounts.map((a) => String(balanceOf(a.id))).join(',')}
            </span>
        </div>
    )
}

/** Submits the one visible form without filling in the amount. */
function submitBlankForm() {
    const form = document.querySelector('form')
    expect(form, 'expected a form to be on screen').not.toBeNull()
    fireEvent.submit(form!)
}

async function expectRejected() {
    // The load-bearing assertion first: a NaN amount poisons the balance
    // permanently, so this is the failure that matters if the guard regresses.
    await waitFor(() => expect(screen.getByTestId('balances').textContent).not.toMatch(/NaN/))
    expect(screen.getByTestId('records').textContent, 'a blank amount was recorded').toBe('0')
    expect(showError).toHaveBeenCalledWith(INVALID_AMOUNT_MESSAGE)
    expect(showSuccess).not.toHaveBeenCalled()
}

describe('a blank amount never reaches a record', () => {
    beforeEach(() => {
        localStorage.clear()
        showError.mockClear()
        showSuccess.mockClear()
        push.mockClear()
    })

    describe('QuickActions', () => {
        async function openModal(label: string) {
            render(
                <BudgetProvider>
                    <QuickActions />
                    <Probe />
                </BudgetProvider>,
            )
            // The provider seeds default accounts asynchronously; QuickActions
            // renders nothing until they exist.
            await waitFor(() => expect(screen.getByTestId('accounts').textContent).not.toBe('0'))
            fireEvent.click(screen.getByLabelText('Quick Add'))
            fireEvent.click(screen.getByText(label))
        }

        it('rejects a blank income amount', async () => {
            await openModal('Add Income')
            submitBlankForm()
            await expectRejected()
        })

        it('rejects a blank expense amount', async () => {
            await openModal('Add Expense')
            submitBlankForm()
            await expectRejected()
        })

        it('rejects a blank transfer amount', async () => {
            await openModal('Transfer Funds')
            submitBlankForm()
            await expectRejected()
        })
    })

    describe('the Quick Add page', () => {
        async function renderPage(type: string) {
            searchType = type
            render(
                <BudgetProvider>
                    <QuickAddPage />
                    <Probe />
                </BudgetProvider>,
            )
            await waitFor(() => expect(screen.getByTestId('accounts').textContent).not.toBe('0'))
            await waitFor(() => expect(document.querySelector('form')).not.toBeNull())
        }

        it('rejects a blank income amount', async () => {
            await renderPage('income')
            submitBlankForm()
            await expectRejected()
        })

        it('rejects a blank expense amount', async () => {
            await renderPage('expense')
            submitBlankForm()
            await expectRejected()
        })

        it('rejects a blank transfer amount', async () => {
            await renderPage('transfer')
            submitBlankForm()
            await expectRejected()
        })
    })
})
