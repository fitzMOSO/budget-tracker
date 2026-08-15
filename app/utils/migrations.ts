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
import type { AppState, Category, Account, Bill, Expense } from '../types'
import {
    DEFAULT_INCOME_CATEGORIES,
    DEFAULT_EXPENSE_CATEGORIES,
    DEFAULT_ACCOUNTS,
    DEFAULT_SETTINGS,
} from '../types'
import { allEffects } from './balances'
import { BILL_PAYMENT_NOTE } from './bill-payment'
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
 * Pre-Task-6 bill shape: isPaid, paidDate and paidFromAccountId were stored on
 * the bill. They are all derived from the linked expense now and no longer exist
 * on the live Bill interface. Migration input is the OLD shape by definition, so
 * it gets its own local type, independent of whatever Bill looks like today.
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

/** Drops the stored payment fields; "paid" is derived from the linked expense. */
function toBill(bill: LegacyBill): Bill {
    return {
        id: bill.id,
        description: bill.description,
        amount: bill.amount,
        dueDate: bill.dueDate,
        isRecurring: bill.isRecurring,
        recurringSourceId: bill.recurringSourceId,
        categoryId: bill.categoryId,
        notes: bill.notes,
    }
}

/**
 * Backfills paid bills into linked expenses. Pure — returns a new array.
 *
 * `linkOnly` exists for blobs already on the current schema: those bills'
 * payments were recorded as expenses at the time, so attaching billId preserves
 * their paid status, while ADDING an expense would debit the account for money
 * that already left it.
 */
function backfillBillExpenses(bills: LegacyBill[], expenses: Expense[], linkOnly = false): Expense[] {
    let result = expenses
    const additions: Expense[] = []

    for (const bill of bills) {
        if (!bill.isPaid) continue

        const matchIndex = result.findIndex((e) =>
            e.billId === bill.id ||
            (!e.billId &&
                e.amount === bill.amount &&
                e.accountId === bill.paidFromAccountId &&
                e.date === (bill.paidDate ?? bill.dueDate) &&
                e.notes === BILL_PAYMENT_NOTE),
        )

        if (matchIndex !== -1) {
            result = result.map((e, i) => (i === matchIndex ? { ...e, billId: bill.id } : e))
            continue
        }

        if (linkOnly) continue

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

/**
 * Normalises a bills+expenses pair that may predate derived `isPaid` — used by
 * IMPORT_DATA, which otherwise writes a backup straight into state.
 *
 * A backup exported before this change carries `isPaid` on the bill and an
 * unlinked auto-created expense. Imported as-is, every previously paid bill
 * comes back UNPAID next to its own expense, so paying it again debits the
 * account a second time.
 *
 * Deliberately link-only, and deliberately scoped to the imported set: it must
 * not invent an expense for money that never moved, and must not let an imported
 * bill adopt an expense the user already had in the app.
 */
export function relinkImportedBills(
    rawBills: unknown,
    rawExpenses: unknown,
): { bills: Bill[]; expenses: Expense[] } {
    const bills = Array.isArray(rawBills) ? (rawBills as LegacyBill[]) : []
    const expenses = Array.isArray(rawExpenses) ? (rawExpenses as Expense[]) : []
    return {
        bills: bills.map(toBill),
        expenses: backfillBillExpenses(bills, expenses, true),
    }
}

export function migrate(raw: unknown): AppState {
    if (!isPlainObject(raw)) {
        throw new MigrationError('Stored data is not an object')
    }
    if (!isRecognizedBlob(raw)) {
        throw new MigrationError('Stored data has no recognisable budget-tracker fields')
    }

    const legacyAccounts = raw.accounts as LegacyAccount[] | undefined
    const legacyBills = Array.isArray(raw.bills) ? (raw.bills as LegacyBill[]) : []

    const state: AppState = {
        categories: Array.isArray(raw.categories) ? (raw.categories as Category[]) : seedDefaultCategories(),
        accounts: [], // filled in below, after opening balances (or straight passthrough) are known
        incomes: (raw.incomes as AppState['incomes']) ?? [],
        expenses: (raw.expenses as AppState['expenses']) ?? [],
        bills: legacyBills.map(toBill),
        creditCards: (raw.creditCards as AppState['creditCards']) ?? [],
        creditCardStatements: (raw.creditCardStatements as AppState['creditCardStatements']) ?? [],
        savingsGoals: (raw.savingsGoals as AppState['savingsGoals']) ?? [],
        savingsContributions: (raw.savingsContributions as AppState['savingsContributions']) ?? [],
        monthlyBudgets: (raw.monthlyBudgets as AppState['monthlyBudgets']) ?? [],
        transfers: (raw.transfers as AppState['transfers']) ?? [],
        schemaVersion: CURRENT_SCHEMA_VERSION,
        settings: (raw.settings as AppState['settings'] | undefined) ?? DEFAULT_SETTINGS,
    }

    // Already-migrated data still needs the "missing accounts" repair (the
    // pre-Task-4 ad-hoc branch in the load effect handled this unconditionally,
    // regardless of schema version) but must otherwise pass through unchanged
    // to keep migrate() idempotent.
    if (raw.schemaVersion === CURRENT_SCHEMA_VERSION) {
        // Bills on this schema may still carry the old isPaid flag (toBill above
        // stripped it). Re-attach the link to the expense that payment already
        // created so the bill keeps reading as paid; never add a new expense
        // here, which would debit money that has already moved.
        state.expenses = backfillBillExpenses(legacyBills, state.expenses, true)
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
