import type { AppState } from '../types'

/**
 * The one definition of "can this be deleted". Both the reducer and the UI read
 * it, so the UI can never call a delete safe that the reducer will refuse.
 */
export type DeleteCheck = { allowed: true } | { allowed: false; reason: string; count: number }

/** Counts records that would be orphaned by deleting this entity. */
function referenceCount(state: AppState, entity: 'account' | 'category', id: string): number {
    if (entity === 'account') {
        // Bills are deliberately absent: a bill no longer moves money, so the
        // account that paid one lives on the linked expense, counted above.
        return (
            state.incomes.filter((r) => r.accountId === id).length +
            state.expenses.filter((r) => r.accountId === id).length +
            state.transfers.filter((r) => r.fromAccountId === id || r.toAccountId === id).length +
            state.savingsContributions.filter((r) => r.fromAccountId === id).length +
            state.creditCardStatements.filter((r) => r.paidFromAccountId === id).length +
            state.savingsGoals.filter((g) => g.linkedAccountId === id).length
        )
    }
    return (
        state.expenses.filter((r) => r.categoryId === id).length +
        state.incomes.filter((r) => r.categoryId === id).length +
        state.bills.filter((r) => r.categoryId === id).length
    )
}

export function checkDelete(state: AppState, entity: 'account' | 'category', id: string): DeleteCheck {
    const count = referenceCount(state, entity, id)
    if (count === 0) return { allowed: true }
    return {
        allowed: false,
        count,
        reason: `${count} record${count === 1 ? '' : 's'} still reference this ${entity}. Reassign or delete them first.`,
    }
}

export function cascadeDelete(state: AppState, entity: 'creditCard' | 'savingsGoal', id: string): AppState {
    if (entity === 'creditCard') {
        return {
            ...state,
            creditCards: state.creditCards.filter((c) => c.id !== id),
            creditCardStatements: state.creditCardStatements.filter((s) => s.creditCardId !== id),
        }
    }
    return {
        ...state,
        savingsGoals: state.savingsGoals.filter((g) => g.id !== id),
        savingsContributions: state.savingsContributions.filter((c) => c.savingsGoalId !== id),
    }
}
