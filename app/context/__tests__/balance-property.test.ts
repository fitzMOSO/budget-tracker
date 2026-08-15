// app/context/__tests__/balance-property.test.ts
//
// The invariant that makes the derived-balance refactor self-enforcing:
//
//     balance(account) === account.openingBalance + Σ effectsOf(records)
//
// and, equivalently, an account's balance moves ONLY when a record referencing
// it is added, edited or removed. Every assertion below is a property of the
// state, so it applies to reducer cases nobody has written yet: a future case
// that debits an account twice, forgets to reverse a delete, or reintroduces a
// stored running total fails here without anyone adding a test.
import { describe, it, expect } from 'vitest'
import { budgetReducer, seedState, type Action } from '../BudgetContext'
import { computeBalances, allEffects } from '../../utils/balances'
import { buildBillExpense } from '../../utils/bill-payment'
import type { AppState, Expense, Income } from '../../types'

// ---------------------------------------------------------------------------
// The oracle
// ---------------------------------------------------------------------------

/**
 * Independent restatement of the balance formula.
 *
 * It accumulates into a `Map`, never into an object, and it tests membership
 * with `Map.get(...) !== undefined`, never with `in` or a bracket lookup. That
 * is not a style preference: an object oracle written as
 * `if (e.accountId in expected) expected[e.accountId] += e.delta` silently
 * accepts `'constructor'`, `'toString'` and `'__proto__'` — they are inherited
 * from Object.prototype — and evaluates `Object + (-50)` to NaN or invents a
 * phantom account. `IMPORT_DATA` ingests arbitrary user JSON, so account ids
 * are externally controlled and those keys are reachable in production. An
 * oracle with that bug would agree with a buggy implementation instead of
 * catching it.
 */
function expectedBalances(state: AppState): Record<string, number> {
    const expected = new Map<string, number>()
    for (const account of state.accounts) expected.set(account.id, account.openingBalance)

    for (const effect of allEffects(state)) {
        const current = expected.get(effect.accountId)
        // An effect pointing at no account contributes nothing; it must never
        // create a key.
        if (current === undefined) continue
        expected.set(effect.accountId, current + effect.delta)
    }
    return Object.fromEntries(expected)
}

/** Every property that must hold of any state the reducer can produce. */
function assertInvariant(state: AppState, where: string) {
    const derived = computeBalances(state)

    expect(derived, `${where}: derived balances disagree with openingBalance + Σ effects`)
        .toEqual(expectedBalances(state))

    const accountIds = new Set(state.accounts.map((a) => a.id))
    for (const [id, value] of Object.entries(derived)) {
        // A phantom key is exactly what the prototype-chain bug produces.
        expect(accountIds.has(id), `${where}: balance reported for unknown account ${JSON.stringify(id)}`).toBe(true)
        expect(Number.isFinite(value), `${where}: balance for ${JSON.stringify(id)} is not a finite number (${value})`).toBe(true)
    }
    expect(Object.keys(derived).length, `${where}: balance map size drifted from the account list`).toBe(accountIds.size)

    for (const account of state.accounts) {
        // The old stored running total. If it ever comes back, it comes back here.
        expect(account, `${where}: account ${account.id} carries a stored balance`).not.toHaveProperty('balance')
    }
}

/**
 * `openingBalance` is the only number on an account, and it is user data: it is
 * a seed, not a running total. Only the actions that edit accounts wholesale
 * may touch it. Any transaction action that changes it has turned it back into
 * the running total this refactor removed.
 */
const ACTIONS_ALLOWED_TO_TOUCH_ACCOUNTS = new Set<Action['type']>([
    'ADD_ACCOUNT',
    'UPDATE_ACCOUNT',
    'DELETE_ACCOUNT',
    'IMPORT_DATA',
    'LOAD_STATE',
    'RESET_STATE',
])

function assertOpeningBalancesStable(before: AppState, after: AppState, action: Action, where: string) {
    if (ACTIONS_ALLOWED_TO_TOUCH_ACCOUNTS.has(action.type)) return
    const summarise = (s: AppState) => s.accounts.map((a) => `${a.id}=${a.openingBalance}`).join(',')
    expect(summarise(after), `${where}: ${action.type} moved a stored account balance`).toBe(summarise(before))
}

// ---------------------------------------------------------------------------
// Deterministic generator
// ---------------------------------------------------------------------------

/**
 * mulberry32. `fast-check` is not a dependency and adding one for this would
 * buy shrinking at the cost of a suite whose failures depend on a random seed
 * chosen at run time. A fixed seed list is fully reproducible: a failure names
 * the seed and the step, and re-running reproduces it byte for byte.
 */
function makeRng(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function pick<T>(rng: () => number, xs: readonly T[]): T {
    return xs[Math.floor(rng() * xs.length)]
}

/** Integers only: floating-point cents would test IEEE754, not the reducer. */
function money(rng: () => number): number {
    return Math.floor(rng() * 2000) + 1
}

function day(rng: () => number): string {
    return `2026-08-${String(Math.floor(rng() * 28) + 1).padStart(2, '0')}`
}

/**
 * Account ids that are NOT accounts. `valueOf` and `hasOwnProperty` are the
 * trap: an orphaned effect naming one of them must be dropped, not resolved
 * through Object.prototype.
 */
const ORPHAN_ACCOUNT_IDS = ['ghost-account', 'valueOf', 'hasOwnProperty'] as const

/** May legitimately be undefined — `accountId` is optional on incomes/expenses. */
function accountRef(rng: () => number, state: AppState): string | undefined {
    const options: (string | undefined)[] = [
        ...state.accounts.map((a) => a.id),
        ...ORPHAN_ACCOUNT_IDS,
        undefined,
    ]
    return pick(rng, options)
}

function realAccountRef(rng: () => number, state: AppState): string {
    const options = [...state.accounts.map((a) => a.id), ...ORPHAN_ACCOUNT_IDS]
    return pick(rng, options)
}

/** An existing record id when there is one, otherwise a miss (a reducer no-op). */
function existingId<T extends { id: string }>(rng: () => number, xs: readonly T[], step: number): string {
    if (xs.length === 0 || rng() < 0.1) return `absent-${step}`
    return pick(rng, xs).id
}

type Factory = (rng: () => number, state: AppState, step: number) => Action

const FACTORIES: Factory[] = [
    // Income
    (rng, state, step) => ({
        type: 'ADD_INCOME',
        payload: { id: `i${step}`, description: 'Pay', amount: money(rng), date: day(rng), categoryId: 'c1', accountId: accountRef(rng, state) },
    }),
    (rng, state, step) => ({
        type: 'UPDATE_INCOME',
        payload: { id: existingId(rng, state.incomes, step), description: 'Pay (edited)', amount: money(rng), date: day(rng), categoryId: 'c1', accountId: accountRef(rng, state) },
    }),
    (rng, state, step) => ({ type: 'DELETE_INCOME', payload: existingId(rng, state.incomes, step) }),

    // Expenses
    (rng, state, step) => ({
        type: 'ADD_EXPENSE',
        payload: { id: `e${step}`, description: 'Food', amount: money(rng), date: day(rng), categoryId: 'c1', accountId: accountRef(rng, state), expenseType: 'essential' },
    }),
    (rng, state, step) => ({
        type: 'UPDATE_EXPENSE',
        payload: { id: existingId(rng, state.expenses, step), description: 'Food (edited)', amount: money(rng), date: day(rng), categoryId: 'c1', accountId: accountRef(rng, state), expenseType: 'non-essential' },
    }),
    (rng, state, step) => ({ type: 'DELETE_EXPENSE', payload: existingId(rng, state.expenses, step) }),

    // Transfers
    (rng, state, step) => ({
        type: 'TRANSFER_FUNDS',
        payload: { id: `t${step}`, fromAccountId: realAccountRef(rng, state), toAccountId: realAccountRef(rng, state), amount: money(rng), date: day(rng) },
    }),
    (rng, state, step) => ({ type: 'DELETE_TRANSFER', payload: existingId(rng, state.transfers, step) }),

    // Savings goals and contributions
    (rng, state, step) => ({
        type: 'ADD_SAVINGS_GOAL',
        payload: { id: `g${step}`, name: 'Goal', targetAmount: 50000, currentAmount: 0, linkedAccountId: accountRef(rng, state) },
    }),
    (rng, state, step) => ({
        type: 'UPDATE_SAVINGS_GOAL',
        payload: { id: existingId(rng, state.savingsGoals, step), name: 'Goal (edited)', targetAmount: 60000, currentAmount: 0, linkedAccountId: accountRef(rng, state) },
    }),
    (rng, state, step) => ({ type: 'DELETE_SAVINGS_GOAL', payload: existingId(rng, state.savingsGoals, step) }),
    (rng, state, step) => ({
        type: 'ADD_SAVINGS_CONTRIBUTION',
        payload: { id: `sc${step}`, savingsGoalId: existingId(rng, state.savingsGoals, step), amount: money(rng), date: day(rng), fromAccountId: accountRef(rng, state) },
    }),
    (rng, state, step) => ({
        type: 'UPDATE_SAVINGS_CONTRIBUTION',
        payload: { id: existingId(rng, state.savingsContributions, step), savingsGoalId: existingId(rng, state.savingsGoals, step), amount: money(rng), date: day(rng), fromAccountId: accountRef(rng, state) },
    }),
    (rng, state, step) => ({ type: 'DELETE_SAVINGS_CONTRIBUTION', payload: existingId(rng, state.savingsContributions, step) }),

    // Credit cards and statements
    (rng, state, step) => ({ type: 'ADD_CREDIT_CARD', payload: { id: `cc${step}`, bank: 'Bank', cardType: 'visa' } }),
    (rng, state, step) => ({ type: 'DELETE_CREDIT_CARD', payload: existingId(rng, state.creditCards, step) }),
    (rng, state, step) => ({
        type: 'ADD_STATEMENT',
        payload: { id: `st${step}`, creditCardId: existingId(rng, state.creditCards, step), statementBalance: money(rng), amountPaid: money(rng), dueDate: day(rng), status: 'partial', paidFromAccountId: accountRef(rng, state) },
    }),
    (rng, state, step) => ({
        type: 'UPDATE_STATEMENT',
        payload: { id: existingId(rng, state.creditCardStatements, step), creditCardId: existingId(rng, state.creditCards, step), statementBalance: money(rng), amountPaid: money(rng), dueDate: day(rng), status: 'paid', paidFromAccountId: accountRef(rng, state) },
    }),
    (rng, state, step) => ({ type: 'DELETE_STATEMENT', payload: existingId(rng, state.creditCardStatements, step) }),

    // Bills — pay/unpay is the add/remove of the linked expense
    (rng, state, step) => ({
        type: 'ADD_BILL',
        payload: { id: `b${step}`, description: 'Rent', amount: money(rng), dueDate: day(rng), categoryId: 'c1', isRecurring: rng() < 0.5 },
    }),
    (rng, state, step) => ({
        type: 'UPDATE_BILL',
        payload: { id: existingId(rng, state.bills, step), description: 'Rent (edited)', amount: money(rng), dueDate: day(rng), categoryId: 'c1', isRecurring: false },
    }),
    (rng, state, step) => ({ type: 'DELETE_BILL', payload: existingId(rng, state.bills, step) }),
    (rng, state, step) => {
        const billId = existingId(rng, state.bills, step)
        const bill = state.bills.find((b) => b.id === billId)
            ?? { id: billId, description: 'Phantom', amount: money(rng), dueDate: day(rng) }
        return {
            type: 'PAY_BILL',
            payload: { billId, expense: buildBillExpense(bill, realAccountRef(rng, state), { id: `be${step}`, date: day(rng) }) },
        }
    },
    (rng, state, step) => ({ type: 'UNPAY_BILL', payload: existingId(rng, state.bills, step) }),
    (rng) => ({ type: 'GENERATE_RECURRING_BILLS', payload: { month: Math.floor(rng() * 12) + 1, year: 2026 } }),

    // Accounts
    (rng, _state, step) => ({ type: 'ADD_ACCOUNT', payload: { id: `acc-${step}`, name: 'New', type: 'bank', openingBalance: money(rng) } }),
    (rng, state, step) => {
        const account = state.accounts.length ? pick(rng, state.accounts) : undefined
        return {
            type: 'UPDATE_ACCOUNT',
            payload: { id: account?.id ?? `absent-${step}`, name: account?.name ?? 'Absent', type: account?.type ?? 'other', openingBalance: money(rng) },
        }
    },
    (rng, state, step) => ({ type: 'DELETE_ACCOUNT', payload: existingId(rng, state.accounts, step) }),

    // Categories (delete is blocked while referenced)
    (rng, state, step) => ({ type: 'DELETE_CATEGORY', payload: existingId(rng, state.categories, step) }),

    // Import: the one action that ingests externally controlled ids.
    (rng, state, step) => ({
        type: 'IMPORT_DATA',
        payload: {
            incomes: [
                { id: `imp-i${step}`, description: 'Imported', amount: money(rng), date: day(rng), categoryId: 'c1', accountId: pick(rng, ORPHAN_ACCOUNT_IDS) } as Income,
            ],
            expenses: [
                { id: `imp-e${step}`, description: 'Imported', amount: money(rng), date: day(rng), categoryId: 'c1', accountId: accountRef(rng, state), expenseType: 'essential' } as Expense,
            ],
        },
    }),

    // Balance-irrelevant noise: these must not move a single peso.
    (rng) => ({ type: 'SET_MONTHLY_BUDGET', payload: { id: 'mb1', month: Math.floor(rng() * 12) + 1, year: 2026, totalIncome: money(rng), essentialsPercentage: 50, nonEssentialsPercentage: 30, savingsPercentage: 20 } }),
    () => ({ type: 'UPDATE_SETTINGS', payload: { theme: 'dark' } }),
]

/**
 * Accounts whose ids collide with `Object.prototype` keys are in the base state
 * on purpose: they are the ids that a prototype-chain bug resolves as inherited
 * members. `IMPORT_DATA` makes them reachable from a hand-edited backup file.
 */
function baseState(): AppState {
    const state = seedState()
    state.categories = [
        { id: 'c1', name: 'General', type: 'expense', color: '#000000' },
        { id: 'c2', name: 'Salary', type: 'income', color: '#22c55e' },
    ]
    state.accounts = [
        { id: 'a1', name: 'Cash', type: 'cash', openingBalance: 10000 },
        { id: 'a2', name: 'Bank', type: 'bank', openingBalance: 2000 },
        { id: 'constructor', name: 'Prototype trap', type: 'other', openingBalance: 500 },
        { id: '__proto__', name: 'Prototype trap 2', type: 'other', openingBalance: -250 },
        { id: 'toString', name: 'Prototype trap 3', type: 'other', openingBalance: 0 },
    ]
    state.savingsGoals = [
        { id: 'g1', name: 'Fund', targetAmount: 50000, currentAmount: 0, linkedAccountId: 'a2' },
        { id: 'g2', name: 'Trap fund', targetAmount: 1000, currentAmount: 0, linkedAccountId: '__proto__' },
        { id: 'g3', name: 'Unlinked', targetAmount: 1000, currentAmount: 0 },
    ]
    state.creditCards = [{ id: 'cc1', bank: 'Bank', cardType: 'visa' }]
    return state
}

/**
 * The subset of factories that only ever ADD a record the drain test can later
 * remove, selected by the action they emit rather than by index so reordering
 * `FACTORIES` cannot silently change what the drain test exercises.
 */
const DRAINABLE_ADD_TYPES = new Set<Action['type']>([
    'ADD_INCOME', 'ADD_EXPENSE', 'ADD_SAVINGS_CONTRIBUTION', 'ADD_STATEMENT', 'ADD_BILL', 'PAY_BILL',
    'TRANSFER_FUNDS',
])
const ADDITIVE_FACTORIES: Factory[] = FACTORIES.filter(
    (factory) => DRAINABLE_ADD_TYPES.has(factory(makeRng(1), baseState(), 0).type),
)

const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2718, 3141, 4242, 9001]
const OPS_PER_SEED = 60

// ---------------------------------------------------------------------------
// The properties
// ---------------------------------------------------------------------------

describe('balance invariant holds across arbitrary operation sequences', () => {
    it('holds after every prefix of the worked example', () => {
        let state = baseState()
        const operations: Action[] = [
            { type: 'ADD_INCOME', payload: { id: 'i1', description: 'Pay', amount: 5000, date: '2026-08-01', categoryId: 'c1', accountId: 'a1' } },
            { type: 'ADD_EXPENSE', payload: { id: 'e1', description: 'Food', amount: 300, date: '2026-08-02', categoryId: 'c1', accountId: 'a1', expenseType: 'essential' } },
            { type: 'UPDATE_EXPENSE', payload: { id: 'e1', description: 'Food', amount: 450, date: '2026-08-02', categoryId: 'c1', accountId: 'a2', expenseType: 'essential' } },
            { type: 'TRANSFER_FUNDS', payload: { id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 1000, date: '2026-08-03' } },
            { type: 'ADD_SAVINGS_CONTRIBUTION', payload: { id: 'sc1', savingsGoalId: 'g1', amount: 200, date: '2026-08-04', fromAccountId: 'a1' } },
            { type: 'DELETE_EXPENSE', payload: 'e1' },
            { type: 'DELETE_SAVINGS_CONTRIBUTION', payload: 'sc1' },
            { type: 'DELETE_INCOME', payload: 'i1' },
        ]

        assertInvariant(state, 'worked example: initial')
        operations.forEach((op, i) => {
            const before = state
            state = budgetReducer(state, op)
            assertInvariant(state, `worked example step ${i} (${op.type})`)
            assertOpeningBalancesStable(before, state, op, `worked example step ${i}`)
        })

        // The sequence deliberately leaves `t1` in place, so a1/a2 still carry
        // its 1000. The other five operations reversed themselves exactly, and
        // the untouched trap accounts prove nothing leaked sideways.
        // Built from entries, not a literal: `{ __proto__: -250 }` is the
        // prototype-setter syntax and would silently produce no such key.
        expect(computeBalances(state)).toEqual(Object.fromEntries([
            ['a1', 9000], ['a2', 3000], ['constructor', 500], ['__proto__', -250], ['toString', 0],
        ]))
        expect(state.transfers).toHaveLength(1)
    })

    it('holds after every step of every seeded random sequence', () => {
        for (const seed of SEEDS) {
            const rng = makeRng(seed)
            let state = baseState()
            assertInvariant(state, `seed ${seed}: initial`)

            for (let step = 0; step < OPS_PER_SEED; step++) {
                const action = FACTORIES[Math.floor(rng() * FACTORIES.length)](rng, state, step)
                const before = state
                state = budgetReducer(state, action)
                assertInvariant(state, `seed ${seed} step ${step} (${action.type})`)
                assertOpeningBalancesStable(before, state, action, `seed ${seed} step ${step}`)
            }
        }
    })

    it('tracks accounts whose ids are Object.prototype keys, exactly', () => {
        let state = baseState()
        state = budgetReducer(state, { type: 'ADD_INCOME', payload: { id: 'i1', description: 'Pay', amount: 1000, date: '2026-08-01', categoryId: 'c2', accountId: 'constructor' } })
        state = budgetReducer(state, { type: 'ADD_EXPENSE', payload: { id: 'e1', description: 'Food', amount: 50, date: '2026-08-02', categoryId: 'c1', accountId: '__proto__', expenseType: 'essential' } })
        state = budgetReducer(state, { type: 'TRANSFER_FUNDS', payload: { id: 't1', fromAccountId: 'toString', toAccountId: 'constructor', amount: 75, date: '2026-08-03' } })

        assertInvariant(state, 'prototype-key accounts')
        const balances = computeBalances(state)
        expect(balances.constructor).toBe(1575)
        expect(balances['__proto__']).toBe(-300)
        expect(balances.toString).toBe(-75)
    })

    it('drops effects that name a prototype key which is not an account', () => {
        let state = baseState()
        state.accounts = [{ id: 'a1', name: 'Cash', type: 'cash', openingBalance: 1000 }]
        // Exactly the shape a hand-edited backup can carry.
        state = budgetReducer(state, {
            type: 'IMPORT_DATA',
            payload: {
                expenses: [
                    { id: 'x1', description: 'Orphan', amount: 50, date: '2026-08-01', categoryId: 'c1', accountId: 'constructor', expenseType: 'essential' },
                    { id: 'x2', description: 'Orphan', amount: 50, date: '2026-08-01', categoryId: 'c1', accountId: '__proto__', expenseType: 'essential' },
                    { id: 'x3', description: 'Orphan', amount: 50, date: '2026-08-01', categoryId: 'c1', accountId: 'toString', expenseType: 'essential' },
                ],
            },
        })

        assertInvariant(state, 'orphaned prototype-key effects')
        expect(computeBalances(state)).toEqual({ a1: 1000 })
    })

    it('returns to the opening balances once every record is removed', () => {
        expect(ADDITIVE_FACTORIES, 'the drain corpus lost a record type').toHaveLength(DRAINABLE_ADD_TYPES.size)
        for (const seed of SEEDS) {
            const rng = makeRng(seed)
            let state = baseState()
            const opening = Object.fromEntries(new Map(state.accounts.map((a) => [a.id, a.openingBalance])))

            for (let step = 0; step < 40; step++) {
                state = budgetReducer(state, pick(rng, ADDITIVE_FACTORIES)(rng, state, step))
                assertInvariant(state, `drain seed ${seed} fill step ${step}`)
            }

            for (const income of [...state.incomes]) state = budgetReducer(state, { type: 'DELETE_INCOME', payload: income.id })
            for (const expense of [...state.expenses]) state = budgetReducer(state, { type: 'DELETE_EXPENSE', payload: expense.id })
            for (const contribution of [...state.savingsContributions]) state = budgetReducer(state, { type: 'DELETE_SAVINGS_CONTRIBUTION', payload: contribution.id })
            for (const statement of [...state.creditCardStatements]) state = budgetReducer(state, { type: 'DELETE_STATEMENT', payload: statement.id })
            for (const transfer of [...state.transfers]) state = budgetReducer(state, { type: 'DELETE_TRANSFER', payload: transfer.id })

            assertInvariant(state, `drain seed ${seed}: drained`)
            expect(allEffects(state), `drain seed ${seed}: records still moving money`).toEqual([])
            expect(computeBalances(state), `drain seed ${seed}: balances did not return to opening`).toEqual(opening)
            // The accounts themselves were never rewritten on the way there.
            expect(state.accounts.map((a) => a.openingBalance)).toEqual(baseState().accounts.map((a) => a.openingBalance))
        }
    })
})
