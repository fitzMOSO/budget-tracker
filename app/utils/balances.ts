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

/**
 * The primitive every other balance reader is built on.
 *
 * A Map has no prototype chain, so account ids that collide with Object.prototype
 * keys (e.g. 'constructor', '__proto__', 'toString') can't be mistaken for real
 * accounts — and, just as importantly, a MISS on such an id stays a miss instead
 * of returning `Object.prototype.constructor`.
 */
export function computeBalanceMap(state: AppState): Map<string, number> {
    const balances = new Map<string, number>()
    for (const account of state.accounts) balances.set(account.id, account.openingBalance)

    for (const effect of allEffects(state)) {
        // Orphaned references contribute nothing rather than resurrecting an account.
        const current = balances.get(effect.accountId)
        if (current !== undefined) balances.set(effect.accountId, current + effect.delta)
    }
    return balances
}

export function computeBalances(state: AppState): Record<string, number> {
    return Object.fromEntries(computeBalanceMap(state))
}

/**
 * Reads through the Map, never through the record. `computeBalances(state)[id]
 * ?? 0` looks equivalent but is not: for an unknown id of `'constructor'` or
 * `'toString'` the bracket lookup finds an INHERITED member of Object.prototype,
 * so `?? 0` never fires and this returns a function where a peso amount was
 * expected. `IMPORT_DATA` ingests externally controlled account ids, so those
 * keys are reachable from a hand-edited backup.
 */
export function balanceOf(state: AppState, accountId: string): number {
    return computeBalanceMap(state).get(accountId) ?? 0
}

/**
 * How much a savings goal has actually accumulated. Derived, never stored.
 *
 * A goal linked to an account IS that account — its progress is the account's
 * derived balance, so it cannot drift from it. An unlinked goal has no account
 * to point at, so its progress is the sum of its own contributions, which is the
 * only record of that money in the state.
 *
 * `SavingsGoal.currentAmount` is deliberately not read: it was a stored copy of
 * this number, and the app had two places that rewrote it from whatever balance
 * was on screen at the time.
 */
export function goalProgress(state: AppState, goal: SavingsGoal): number {
    // Via balanceOf, so a linked account that has been deleted (or whose id is
    // an Object.prototype key) reports 0 rather than a phantom number.
    if (goal.linkedAccountId) return balanceOf(state, goal.linkedAccountId)
    return state.savingsContributions
        .filter((c) => c.savingsGoalId === goal.id)
        .reduce((sum, c) => sum + c.amount, 0)
}

/**
 * How much is saved across ALL goals — which is NOT `Σ goalProgress(goal)`.
 *
 * Two goals may link to the same account ("emergency fund" and "new laptop",
 * both funded out of the one savings account). That account holds one pile of
 * money; counting it once per goal reports a total the user does not have. Each
 * linked account therefore contributes exactly once, no matter how many goals
 * point at it. Unlinked goals are disjoint by construction — a contribution
 * names exactly one goal — so they simply add up.
 *
 * Every screen that shows a savings total must call this rather than reducing
 * over `goalProgress` itself; that reduction was the double-count.
 */
export function totalGoalProgress(state: AppState): number {
    const countedAccounts = new Set<string>()
    let total = 0

    for (const goal of state.savingsGoals) {
        if (goal.linkedAccountId) {
            if (countedAccounts.has(goal.linkedAccountId)) continue
            countedAccounts.add(goal.linkedAccountId)
        }
        total += goalProgress(state, goal)
    }
    return total
}

/**
 * The expense a bill payment created, if any. A bill never moves money itself;
 * the linked expense IS the movement, so it also carries when the bill was paid
 * (`date`) and which account it was paid from (`accountId`).
 */
export function linkedBillExpense(state: AppState, billId: string): Expense | undefined {
    return state.expenses.find((e) => e.billId === billId)
}

/**
 * "Paid" is derived, never stored: a bill is paid exactly when a linked expense
 * exists. A stored flag alongside the link would be a second source of truth for
 * one fact, which is how the old code could unpay a bill and mint money.
 */
export function isPaidBill(state: AppState, billId: string): boolean {
    return state.expenses.some((e) => e.billId === billId)
}
