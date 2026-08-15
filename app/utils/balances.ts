// app/utils/balances.ts
import type {
    AppState, Income, Expense, Transfer,
    SavingsContribution, SavingsGoal, CreditCardStatement,
} from '../types'

/** A single movement of money into (positive) or out of (negative) one account. */
export type BalanceEffect = { accountId: string; delta: number }

export function effectsOfIncome(income: Income): BalanceEffect[] {
    return income.accountId ? [{ accountId: income.accountId, delta: income.amount }] : []
}

export function effectsOfExpense(expense: Expense): BalanceEffect[] {
    return expense.accountId ? [{ accountId: expense.accountId, delta: -expense.amount }] : []
}

export function effectsOfTransfer(transfer: Transfer): BalanceEffect[] {
    return [
        { accountId: transfer.fromAccountId, delta: -transfer.amount },
        { accountId: transfer.toAccountId, delta: transfer.amount },
    ]
}

export function effectsOfContribution(
    contribution: SavingsContribution,
    goalsById: Map<string, SavingsGoal>,
): BalanceEffect[] {
    const linkedAccountId = goalsById.get(contribution.savingsGoalId)?.linkedAccountId
    const from = contribution.fromAccountId
    // Same account on both sides is a no-op, not two cancelling effects.
    if (from && linkedAccountId && from === linkedAccountId) return []

    const effects: BalanceEffect[] = []
    if (from) effects.push({ accountId: from, delta: -contribution.amount })
    if (linkedAccountId) effects.push({ accountId: linkedAccountId, delta: contribution.amount })
    return effects
}

export function effectsOfStatement(statement: CreditCardStatement): BalanceEffect[] {
    if (!statement.paidFromAccountId || !statement.amountPaid) return []
    return [{ accountId: statement.paidFromAccountId, delta: -statement.amountPaid }]
}

export function allEffects(state: AppState): BalanceEffect[] {
    const goalsById = new Map(state.savingsGoals.map((g) => [g.id, g]))
    return [
        ...state.incomes.flatMap(effectsOfIncome),
        ...state.expenses.flatMap(effectsOfExpense),
        ...state.transfers.flatMap(effectsOfTransfer),
        ...state.savingsContributions.flatMap((c) => effectsOfContribution(c, goalsById)),
        ...state.creditCardStatements.flatMap(effectsOfStatement),
    ]
}

export function computeBalances(state: AppState): Record<string, number> {
    const balances: Record<string, number> = {}
    for (const account of state.accounts) balances[account.id] = account.openingBalance

    for (const effect of allEffects(state)) {
        // Orphaned references contribute nothing rather than resurrecting an account.
        if (effect.accountId in balances) balances[effect.accountId] += effect.delta
    }
    return balances
}

export function balanceOf(state: AppState, accountId: string): number {
    return computeBalances(state)[accountId] ?? 0
}
