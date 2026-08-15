// app/utils/migrations.ts
//
// Migrates a raw, untrusted blob loaded from localStorage into the current
// AppState shape. The two things that make this file load-bearing:
//
// 1. Ordering: paid bills are backfilled into linked expenses BEFORE opening
//    balances are derived. Deriving first would silently drop the backfilled
//    expenses' effects from the balance math, and every migrated balance
//    would be wrong by the sum of all paid bills.
// 2. Purity: migrate() never touches localStorage. The caller (BudgetContext)
//    owns all I/O, including the pre-migration backup.
import type { AppState, Category, Account, Expense } from '../types'
import {
    DEFAULT_INCOME_CATEGORIES,
    DEFAULT_EXPENSE_CATEGORIES,
    DEFAULT_ACCOUNTS,
} from '../types'
import { allEffects } from './balances'
import { v4 as uuidv4 } from 'uuid'

export const CURRENT_SCHEMA_VERSION = 2
export const V1_BACKUP_KEY = 'budget-tracker-data.v1-backup'

export class MigrationError extends Error {}

/** Pre-Task-2 account shape: balance was stored, not derived. */
type LegacyAccount = {
    id: string
    name: string
    type: string
    balance?: number
    openingBalance?: number
    color?: string
    isDefault?: boolean
}

/**
 * Pre-Task-6 bill shape. Bill.paidFromAccountId still exists on the live
 * Bill interface as of this task, but Task 6 removes it — typing migration
 * input against a type that is about to change guarantees this file breaks
 * the day that happens. Migration input is the OLD shape by definition, so
 * it gets its own local type, independent of whatever Bill looks like now.
 */
type LegacyBill = {
    id: string
    description: string
    amount: number
    dueDate: string
    isPaid: boolean
    paidDate?: string
    paidFromAccountId?: string
    isRecurring?: boolean
    recurringSourceId?: string
    categoryId?: string
    notes?: string
}

/** The full set of keys that ever appeared on a persisted AppState blob. */
const KNOWN_APP_STATE_KEYS = [
    'categories', 'accounts', 'incomes', 'expenses', 'bills',
    'creditCards', 'creditCardStatements', 'savingsGoals',
    'savingsContributions', 'monthlyBudgets', 'transfers',
    'schemaVersion', 'settings',
] as const

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Recognisable means "this is plausibly a budget-tracker blob", not "this is
 * a complete one". A blob missing `accounts` or `categories` (the pre-Task-4
 * ad-hoc repair branch in BudgetContext's load effect handled exactly this
 * case for `accounts`) is still this app's data — it gets repaired below.
 * An object with none of the known keys at all (e.g. `{ nonsense: true }`)
 * carries no evidence it's ours, so it throws instead of silently becoming
 * an empty/seeded state that could mask real data loss upstream (a bad
 * JSON.parse, a completely different app's data in the same storage, etc).
 */
function isRecognizedBlob(raw: Record<string, unknown>): boolean {
    return KNOWN_APP_STATE_KEYS.some((key) => key in raw)
}

function seedDefaultAccounts(): Account[] {
    return DEFAULT_ACCOUNTS.map((a) => ({ ...a, id: uuidv4() }))
}

function seedDefaultCategories(): Category[] {
    return [
        ...DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, id: uuidv4() })),
        ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, id: uuidv4() })),
    ]
}

/** Backfills paid bills into linked expenses. Pure — returns a new array. */
function backfillBillExpenses(bills: LegacyBill[], expenses: Expense[]): Expense[] {
    let result = expenses
    const additions: Expense[] = []

    for (const bill of bills) {
        if (!bill.isPaid) continue

        const matchIndex = result.findIndex((e) =>
            e.billId === bill.id ||
            (e.amount === bill.amount &&
                e.accountId === bill.paidFromAccountId &&
                e.date === (bill.paidDate ?? bill.dueDate) &&
                e.notes === 'Auto-created from bill payment'),
        )

        if (matchIndex !== -1) {
            result = result.map((e, i) => (i === matchIndex ? { ...e, billId: bill.id } : e))
            continue
        }

        additions.push({
            id: `mig-${bill.id}`,
            description: bill.description,
            amount: bill.amount,
            date: bill.paidDate ?? bill.dueDate,
            categoryId: bill.categoryId ?? '',
            accountId: bill.paidFromAccountId,
            expenseType: 'essential',
            billId: bill.id,
            notes: 'Migrated from bill payment',
        })
    }

    return [...result, ...additions]
}

export function migrate(raw: unknown): AppState {
    if (!isPlainObject(raw)) {
        throw new MigrationError('Stored data is not an object')
    }
    if (!isRecognizedBlob(raw)) {
        throw new MigrationError('Stored data has no recognisable budget-tracker fields')
    }

    const legacyAccounts = raw.accounts as LegacyAccount[] | undefined
    const legacyBills = (raw.bills as LegacyBill[] | undefined) ?? []

    const state: AppState = {
        categories: Array.isArray(raw.categories) ? (raw.categories as Category[]) : seedDefaultCategories(),
        accounts: [], // filled in below, after opening balances (or straight passthrough) are known
        incomes: (raw.incomes as AppState['incomes']) ?? [],
        expenses: (raw.expenses as AppState['expenses']) ?? [],
        bills: (raw.bills as AppState['bills']) ?? [],
        creditCards: (raw.creditCards as AppState['creditCards']) ?? [],
        creditCardStatements: (raw.creditCardStatements as AppState['creditCardStatements']) ?? [],
        savingsGoals: (raw.savingsGoals as AppState['savingsGoals']) ?? [],
        savingsContributions: (raw.savingsContributions as AppState['savingsContributions']) ?? [],
        monthlyBudgets: (raw.monthlyBudgets as AppState['monthlyBudgets']) ?? [],
        transfers: (raw.transfers as AppState['transfers']) ?? [],
        schemaVersion: CURRENT_SCHEMA_VERSION,
        settings: raw.settings as AppState['settings'],
    }

    // Already-migrated data still needs the "missing accounts" repair (the
    // pre-Task-4 ad-hoc branch in the load effect handled this unconditionally,
    // regardless of schema version) but must otherwise pass through unchanged
    // to keep migrate() idempotent.
    if (raw.schemaVersion === CURRENT_SCHEMA_VERSION) {
        state.accounts = Array.isArray(legacyAccounts) && legacyAccounts.length > 0
            ? (legacyAccounts as unknown as Account[])
            : seedDefaultAccounts()
        return state
    }

    // 1. Backfill paid bills into linked expenses FIRST, so their effects are
    //    included when opening balances are derived below.
    state.expenses = backfillBillExpenses(legacyBills, state.expenses)

    // 2. Derive opening balances so today's displayed numbers do not move.
    if (!Array.isArray(legacyAccounts) || legacyAccounts.length === 0) {
        state.accounts = seedDefaultAccounts()
        return state
    }

    const probe: AppState = {
        ...state,
        accounts: legacyAccounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type as Account['type'],
            openingBalance: 0,
            color: a.color,
            isDefault: a.isDefault,
        })),
    }
    const sums: Record<string, number> = {}
    for (const effect of allEffects(probe)) {
        sums[effect.accountId] = (sums[effect.accountId] ?? 0) + effect.delta
    }

    state.accounts = legacyAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type as Account['type'],
        openingBalance: (a.balance ?? a.openingBalance ?? 0) - (sums[a.id] ?? 0),
        color: a.color,
        isDefault: a.isDefault,
    }))

    return state
}
