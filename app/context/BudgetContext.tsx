'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type {
    AppState,
    Category,
    Account,
    Income,
    Expense,
    Bill,
    CreditCard,
    CreditCardStatement,
    SavingsGoal,
    SavingsContribution,
    MonthlyBudget,
    AppSettings,
    DEFAULT_INCOME_CATEGORIES,
    DEFAULT_EXPENSE_CATEGORIES,
    DEFAULT_SETTINGS,
} from '../types'
import {
    DEFAULT_INCOME_CATEGORIES as defaultIncomeCategories,
    DEFAULT_EXPENSE_CATEGORIES as defaultExpenseCategories,
    DEFAULT_SETTINGS as defaultSettings,
    DEFAULT_ACCOUNTS as defaultAccounts,
} from '../types'

const STORAGE_KEY = 'budget-tracker-data'

// Initial state
const initialState: AppState = {
    categories: [],
    accounts: [],
    incomes: [],
    expenses: [],
    bills: [],
    creditCards: [],
    creditCardStatements: [],
    savingsGoals: [],
    savingsContributions: [],
    monthlyBudgets: [],
    transfers: [],
    schemaVersion: 2,
    settings: defaultSettings,
}

// Action types
type Action =
    | { type: 'LOAD_STATE'; payload: AppState }
    | { type: 'RESET_STATE' }
    // Categories
    | { type: 'ADD_CATEGORY'; payload: Category }
    | { type: 'UPDATE_CATEGORY'; payload: Category }
    | { type: 'DELETE_CATEGORY'; payload: string }
    // Accounts
    | { type: 'ADD_ACCOUNT'; payload: Account }
    | { type: 'UPDATE_ACCOUNT'; payload: Account }
    | { type: 'DELETE_ACCOUNT'; payload: string }
    | { type: 'UPDATE_ACCOUNT_BALANCE'; payload: { id: string; amount: number; operation: 'add' | 'subtract' } }
    | { type: 'TRANSFER_FUNDS'; payload: { fromAccountId: string; toAccountId: string; amount: number } }
    // Income
    | { type: 'ADD_INCOME'; payload: Income }
    | { type: 'UPDATE_INCOME'; payload: Income }
    | { type: 'DELETE_INCOME'; payload: string }
    // Expenses
    | { type: 'ADD_EXPENSE'; payload: Expense }
    | { type: 'UPDATE_EXPENSE'; payload: Expense }
    | { type: 'DELETE_EXPENSE'; payload: string }
    // Bills
    | { type: 'ADD_BILL'; payload: Bill }
    | { type: 'UPDATE_BILL'; payload: Bill }
    | { type: 'DELETE_BILL'; payload: string }
    | { type: 'PAY_BILL'; payload: { id: string; paidDate: string; accountId: string } }
    | { type: 'UNPAY_BILL'; payload: string }
    | { type: 'GENERATE_RECURRING_BILLS'; payload: { month: number; year: number } }
    // Credit Cards
    | { type: 'ADD_CREDIT_CARD'; payload: CreditCard }
    | { type: 'UPDATE_CREDIT_CARD'; payload: CreditCard }
    | { type: 'DELETE_CREDIT_CARD'; payload: string }
    // Credit Card Statements
    | { type: 'ADD_STATEMENT'; payload: CreditCardStatement }
    | { type: 'UPDATE_STATEMENT'; payload: CreditCardStatement }
    | { type: 'DELETE_STATEMENT'; payload: string }
    // Savings Goals
    | { type: 'ADD_SAVINGS_GOAL'; payload: SavingsGoal }
    | { type: 'UPDATE_SAVINGS_GOAL'; payload: SavingsGoal }
    | { type: 'DELETE_SAVINGS_GOAL'; payload: string }
    // Savings Contributions
    | { type: 'ADD_SAVINGS_CONTRIBUTION'; payload: SavingsContribution }
    | { type: 'UPDATE_SAVINGS_CONTRIBUTION'; payload: SavingsContribution }
    | { type: 'DELETE_SAVINGS_CONTRIBUTION'; payload: string }
    // Monthly Budget
    | { type: 'SET_MONTHLY_BUDGET'; payload: MonthlyBudget }
    // Settings
    | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
    // Import
    | { type: 'IMPORT_DATA'; payload: Partial<AppState> }

export function seedState(): AppState {
    return {
        ...initialState,
        categories: [
            ...defaultIncomeCategories.map((c) => ({ ...c, id: uuidv4() })),
            ...defaultExpenseCategories.map((c) => ({ ...c, id: uuidv4() })),
        ],
        accounts: defaultAccounts.map((a) => ({ ...a, id: uuidv4() })),
    }
}

// Reducer
export function budgetReducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'LOAD_STATE':
            return action.payload

        case 'RESET_STATE':
            return { ...seedState(), settings: state.settings }

        // Categories
        case 'ADD_CATEGORY':
            return { ...state, categories: [...state.categories, action.payload] }

        case 'UPDATE_CATEGORY':
            return {
                ...state,
                categories: state.categories.map((c) =>
                    c.id === action.payload.id ? action.payload : c
                ),
            }

        case 'DELETE_CATEGORY':
            return {
                ...state,
                categories: state.categories.filter((c) => c.id !== action.payload),
            }

        // Accounts
        case 'ADD_ACCOUNT':
            return { ...state, accounts: [...state.accounts, action.payload] }

        case 'UPDATE_ACCOUNT':
            {
                const updatedAccounts = state.accounts.map((a) =>
                    a.id === action.payload.id ? action.payload : a
                )
                const syncedGoals = state.savingsGoals.map((g) => {
                    if (!g.linkedAccountId) return g
                    const linkedAccount = updatedAccounts.find((a) => a.id === g.linkedAccountId)
                    return linkedAccount ? { ...g, currentAmount: linkedAccount.balance } : g
                })
                return {
                    ...state,
                    accounts: updatedAccounts,
                    savingsGoals: syncedGoals,
                }
            }

        case 'DELETE_ACCOUNT':
            return {
                ...state,
                accounts: state.accounts.filter((a) => a.id !== action.payload),
            }

        case 'UPDATE_ACCOUNT_BALANCE':
            {
                const updatedAccounts = state.accounts.map((a) =>
                    a.id === action.payload.id
                        ? {
                            ...a,
                            balance: action.payload.operation === 'add'
                                ? a.balance + action.payload.amount
                                : a.balance - action.payload.amount
                        }
                        : a
                )
                const syncedGoals = state.savingsGoals.map((g) => {
                    if (!g.linkedAccountId) return g
                    const linkedAccount = updatedAccounts.find((a) => a.id === g.linkedAccountId)
                    return linkedAccount ? { ...g, currentAmount: linkedAccount.balance } : g
                })
                return {
                    ...state,
                    accounts: updatedAccounts,
                    savingsGoals: syncedGoals,
                }
            }

        case 'TRANSFER_FUNDS':
            {
                const linkedGoals = state.savingsGoals.filter(
                    (g) => g.linkedAccountId === action.payload.toAccountId
                )
                const linkedSourceGoals = state.savingsGoals.filter(
                    (g) => g.linkedAccountId === action.payload.fromAccountId
                )
                const updatedAccounts = state.accounts.map((a) => {
                    if (a.id === action.payload.fromAccountId) {
                        return { ...a, balance: a.balance - action.payload.amount }
                    }
                    if (a.id === action.payload.toAccountId) {
                        return { ...a, balance: a.balance + action.payload.amount }
                    }
                    return a
                })
                const syncedGoals = state.savingsGoals.map((g) => {
                    if (!g.linkedAccountId) return g
                    const linkedAccount = updatedAccounts.find((a) => a.id === g.linkedAccountId)
                    return linkedAccount ? { ...g, currentAmount: linkedAccount.balance } : g
                })
                const transferContributions: SavingsContribution[] = linkedGoals.map((goal) => ({
                    id: uuidv4(),
                    savingsGoalId: goal.id,
                    amount: action.payload.amount,
                    date: new Date().toISOString().slice(0, 10),
                    fromAccountId: action.payload.fromAccountId,
                    notes: 'Transfer to linked savings account',
                }))
                const transferOutContributions: SavingsContribution[] = linkedSourceGoals.map((goal) => ({
                    id: uuidv4(),
                    savingsGoalId: goal.id,
                    amount: -action.payload.amount,
                    date: new Date().toISOString().slice(0, 10),
                    fromAccountId: action.payload.fromAccountId,
                    notes: 'Transfer out of linked savings account',
                }))
                return {
                    ...state,
                    accounts: updatedAccounts,
                    savingsGoals: syncedGoals,
                    savingsContributions: [...state.savingsContributions, ...transferContributions, ...transferOutContributions],
                }
            }

        // Income
        case 'ADD_INCOME': {
            const income = action.payload
            // If accountId is provided, add the amount to the account balance
            if (income.accountId) {
                return {
                    ...state,
                    incomes: [...state.incomes, income],
                    accounts: state.accounts.map((a) =>
                        a.id === income.accountId
                            ? { ...a, balance: a.balance + income.amount }
                            : a
                    ),
                }
            }
            return { ...state, incomes: [...state.incomes, income] }
        }

        case 'UPDATE_INCOME': {
            const updatedIncome = action.payload
            const oldIncome = state.incomes.find((i) => i.id === updatedIncome.id)

            if (!oldIncome) {
                return {
                    ...state,
                    incomes: state.incomes.map((i) =>
                        i.id === updatedIncome.id ? updatedIncome : i
                    ),
                }
            }

            // Calculate account balance adjustments
            let updatedAccounts = [...state.accounts]

            // If old income had an account, deduct the old amount
            if (oldIncome.accountId) {
                updatedAccounts = updatedAccounts.map((a) =>
                    a.id === oldIncome.accountId
                        ? { ...a, balance: a.balance - oldIncome.amount }
                        : a
                )
            }

            // If new income has an account, add the new amount
            if (updatedIncome.accountId) {
                updatedAccounts = updatedAccounts.map((a) =>
                    a.id === updatedIncome.accountId
                        ? { ...a, balance: a.balance + updatedIncome.amount }
                        : a
                )
            }

            return {
                ...state,
                incomes: state.incomes.map((i) =>
                    i.id === updatedIncome.id ? updatedIncome : i
                ),
                accounts: updatedAccounts,
            }
        }

        case 'DELETE_INCOME': {
            const incomeToDelete = state.incomes.find((i) => i.id === action.payload)

            // If income had an account, deduct the amount back
            if (incomeToDelete?.accountId) {
                return {
                    ...state,
                    incomes: state.incomes.filter((i) => i.id !== action.payload),
                    accounts: state.accounts.map((a) =>
                        a.id === incomeToDelete.accountId
                            ? { ...a, balance: a.balance - incomeToDelete.amount }
                            : a
                    ),
                }
            }

            return {
                ...state,
                incomes: state.incomes.filter((i) => i.id !== action.payload),
            }
        }

        // Expenses
        case 'ADD_EXPENSE': {
            const expense = action.payload
            // If accountId is provided, deduct the amount from the account balance
            if (expense.accountId) {
                return {
                    ...state,
                    expenses: [...state.expenses, expense],
                    accounts: state.accounts.map((a) =>
                        a.id === expense.accountId
                            ? { ...a, balance: a.balance - expense.amount }
                            : a
                    ),
                }
            }
            return { ...state, expenses: [...state.expenses, expense] }
        }

        case 'UPDATE_EXPENSE': {
            const updatedExpense = action.payload
            const oldExpense = state.expenses.find((e) => e.id === updatedExpense.id)

            if (!oldExpense) {
                return {
                    ...state,
                    expenses: state.expenses.map((e) =>
                        e.id === updatedExpense.id ? updatedExpense : e
                    ),
                }
            }

            // Calculate account balance adjustments
            let updatedAccounts = [...state.accounts]

            // If old expense had an account, refund the old amount
            if (oldExpense.accountId) {
                updatedAccounts = updatedAccounts.map((a) =>
                    a.id === oldExpense.accountId
                        ? { ...a, balance: a.balance + oldExpense.amount }
                        : a
                )
            }

            // If new expense has an account, deduct the new amount
            if (updatedExpense.accountId) {
                updatedAccounts = updatedAccounts.map((a) =>
                    a.id === updatedExpense.accountId
                        ? { ...a, balance: a.balance - updatedExpense.amount }
                        : a
                )
            }

            return {
                ...state,
                expenses: state.expenses.map((e) =>
                    e.id === updatedExpense.id ? updatedExpense : e
                ),
                accounts: updatedAccounts,
            }
        }

        case 'DELETE_EXPENSE': {
            const expenseToDelete = state.expenses.find((e) => e.id === action.payload)

            // If expense had an account, refund the amount
            if (expenseToDelete?.accountId) {
                return {
                    ...state,
                    expenses: state.expenses.filter((e) => e.id !== action.payload),
                    accounts: state.accounts.map((a) =>
                        a.id === expenseToDelete.accountId
                            ? { ...a, balance: a.balance + expenseToDelete.amount }
                            : a
                    ),
                }
            }

            return {
                ...state,
                expenses: state.expenses.filter((e) => e.id !== action.payload),
            }
        }

        // Bills
        case 'ADD_BILL':
            return { ...state, bills: [...state.bills, action.payload] }

        case 'UPDATE_BILL': {
            const updatedBill = action.payload
            const existingBill = state.bills.find((b) => b.id === updatedBill.id)

            // If recurring was turned OFF, only delete FUTURE generated bills (keep current and past)
            if (existingBill?.isRecurring && !updatedBill.isRecurring) {
                const today = new Date()
                const currentMonth = today.getMonth()
                const currentYear = today.getFullYear()

                return {
                    ...state,
                    bills: state.bills
                        .filter((b) => {
                            // Keep bills that are NOT generated from this source
                            if (b.recurringSourceId !== updatedBill.id) return true

                            // For generated bills, keep if they're in current month or earlier
                            const billDate = new Date(b.dueDate)
                            const billMonth = billDate.getMonth()
                            const billYear = billDate.getFullYear()

                            // Keep if bill is in past or current month
                            if (billYear < currentYear) return true
                            if (billYear === currentYear && billMonth <= currentMonth) return true

                            // Delete future bills
                            return false
                        })
                        .map((b) => (b.id === updatedBill.id ? updatedBill : b)), // Update the source bill
                }
            }

            return {
                ...state,
                bills: state.bills.map((b) =>
                    b.id === updatedBill.id ? updatedBill : b
                ),
            }
        }

        case 'DELETE_BILL': {
            const billToDelete = state.bills.find((b) => b.id === action.payload)
            const refundAccountId = billToDelete?.isPaid ? billToDelete.paidFromAccountId : undefined

            return {
                ...state,
                bills: state.bills.filter((b) => b.id !== action.payload),
                // Refund bill amount if it was paid
                accounts: refundAccountId && billToDelete
                    ? state.accounts.map((acc) =>
                        acc.id === refundAccountId
                            ? { ...acc, balance: acc.balance + billToDelete.amount }
                            : acc
                    )
                    : state.accounts,
            }
        }

        case 'PAY_BILL': {
            const billToPay = state.bills.find((b) => b.id === action.payload.id)
            const payAccountId = action.payload.accountId

            return {
                ...state,
                bills: state.bills.map((b) =>
                    b.id === action.payload.id
                        ? { ...b, isPaid: true, paidDate: action.payload.paidDate, paidFromAccountId: action.payload.accountId }
                        : b
                ),
                // Deduct bill amount from the paying account
                accounts: payAccountId && billToPay
                    ? state.accounts.map((acc) =>
                        acc.id === payAccountId
                            ? { ...acc, balance: acc.balance - billToPay.amount }
                            : acc
                    )
                    : state.accounts,
            }
        }

        case 'UNPAY_BILL': {
            const billToUnpay = state.bills.find((b) => b.id === action.payload)
            const refundAccountId = billToUnpay?.paidFromAccountId

            return {
                ...state,
                bills: state.bills.map((b) =>
                    b.id === action.payload
                        ? { ...b, isPaid: false, paidDate: undefined, paidFromAccountId: undefined }
                        : b
                ),
                // Refund bill amount back to the account it was paid from
                accounts: refundAccountId && billToUnpay
                    ? state.accounts.map((acc) =>
                        acc.id === refundAccountId
                            ? { ...acc, balance: acc.balance + billToUnpay.amount }
                            : acc
                    )
                    : state.accounts,
            }
        }

        case 'GENERATE_RECURRING_BILLS': {
            const { month, year } = action.payload
            // Only use ORIGINAL recurring bills as sources (not generated copies)
            const recurringBills = state.bills.filter((b) => b.isRecurring && !b.recurringSourceId)
            const newBills: Bill[] = []

            // Get current date for rolling window calculation
            const today = new Date()
            const currentMonth = today.getMonth() + 1
            const currentYear = today.getFullYear()

            // Calculate max allowed month (current month + 1 = next month only)
            let maxMonth = currentMonth + 1
            let maxYear = currentYear
            if (maxMonth > 12) {
                maxMonth = 1
                maxYear = currentYear + 1
            }

            // Generate bills for requested month AND next month (rolling window)
            const monthsToGenerate = [
                { month, year },
                { month: month === 12 ? 1 : month + 1, year: month === 12 ? year + 1 : year }
            ]

            for (const bill of recurringBills) {
                // Parse the original bill's due date to get the day
                const originalDate = new Date(bill.dueDate)
                const originalMonth = originalDate.getMonth() + 1
                const originalYear = originalDate.getFullYear()
                const dayOfMonth = originalDate.getDate()

                for (const target of monthsToGenerate) {
                    // Only generate bills for months AFTER the original bill date (forward only)
                    if (target.year < originalYear || (target.year === originalYear && target.month <= originalMonth)) {
                        continue
                    }

                    // Only generate up to next month from TODAY (rolling window)
                    // This prevents generating bills far into the future
                    if (target.year > maxYear || (target.year === maxYear && target.month > maxMonth)) {
                        continue
                    }

                    // Create the target date for the requested month
                    // Handle months with fewer days (e.g., Feb 28/29)
                    const lastDayOfTargetMonth = new Date(target.year, target.month, 0).getDate()
                    const targetDay = Math.min(dayOfMonth, lastDayOfTargetMonth)
                    const targetDate = new Date(target.year, target.month - 1, targetDay)
                    const targetDateISO = targetDate.toISOString().split('T')[0]

                    // Check if a bill for this recurring source already exists in this month
                    const existingBill = state.bills.find((b) => {
                        const billDate = new Date(b.dueDate)
                        return (
                            b.recurringSourceId === bill.id &&
                            billDate.getMonth() === target.month - 1 &&
                            billDate.getFullYear() === target.year
                        )
                    })

                    // Also check newBills to avoid duplicates within same dispatch
                    const alreadyInNewBills = newBills.some((b) => {
                        const billDate = new Date(b.dueDate)
                        return (
                            b.recurringSourceId === bill.id &&
                            billDate.getMonth() === target.month - 1 &&
                            billDate.getFullYear() === target.year
                        )
                    })

                    // Only create a new bill if one doesn't already exist for this month
                    if (!existingBill && !alreadyInNewBills) {
                        newBills.push({
                            id: uuidv4(),
                            description: bill.description,
                            amount: bill.amount,
                            dueDate: targetDateISO,
                            isPaid: false,
                            isRecurring: false, // Generated bills are NOT recurring sources
                            recurringSourceId: bill.id,
                            categoryId: bill.categoryId,
                            notes: bill.notes,
                        })
                    }
                }
            }

            if (newBills.length === 0) {
                return state
            }

            return {
                ...state,
                bills: [...state.bills, ...newBills],
            }
        }

        // Credit Cards
        case 'ADD_CREDIT_CARD':
            return { ...state, creditCards: [...state.creditCards, action.payload] }

        case 'UPDATE_CREDIT_CARD':
            return {
                ...state,
                creditCards: state.creditCards.map((c) =>
                    c.id === action.payload.id ? action.payload : c
                ),
            }

        case 'DELETE_CREDIT_CARD':
            return {
                ...state,
                creditCards: state.creditCards.filter((c) => c.id !== action.payload),
            }

        // Credit Card Statements
        case 'ADD_STATEMENT': {
            return {
                ...state,
                creditCardStatements: [...state.creditCardStatements, action.payload],
            }
        }

        case 'UPDATE_STATEMENT': {
            const updatedStatements = state.creditCardStatements.map((s) =>
                s.id === action.payload.id ? action.payload : s
            )
            return {
                ...state,
                creditCardStatements: updatedStatements,
            }
        }

        case 'DELETE_STATEMENT':
            return {
                ...state,
                creditCardStatements: state.creditCardStatements.filter((s) => s.id !== action.payload),
            }

        // Savings Goals
        case 'ADD_SAVINGS_GOAL':
            return { ...state, savingsGoals: [...state.savingsGoals, action.payload] }

        case 'UPDATE_SAVINGS_GOAL':
            {
                const updatedGoals = state.savingsGoals.map((g) =>
                    g.id === action.payload.id ? action.payload : g
                )
                const syncedGoals = updatedGoals.map((g) => {
                    if (!g.linkedAccountId) return g
                    const linkedAccount = state.accounts.find((a) => a.id === g.linkedAccountId)
                    return linkedAccount ? { ...g, currentAmount: linkedAccount.balance } : g
                })
                return {
                    ...state,
                    savingsGoals: syncedGoals,
                }
            }

        case 'DELETE_SAVINGS_GOAL':
            return {
                ...state,
                savingsGoals: state.savingsGoals.filter((g) => g.id !== action.payload),
            }

        // Savings Contributions
        case 'ADD_SAVINGS_CONTRIBUTION': {
            const contribution = action.payload
            const fromAccountId = contribution.fromAccountId
            const goal = state.savingsGoals.find((g) => g.id === contribution.savingsGoalId)
            const linkedAccountId = goal?.linkedAccountId

            let updatedAccounts = state.accounts

            if (fromAccountId && fromAccountId !== linkedAccountId) {
                updatedAccounts = updatedAccounts.map((acc) =>
                    acc.id === fromAccountId
                        ? { ...acc, balance: acc.balance - contribution.amount }
                        : acc
                )
            }

            if (linkedAccountId && linkedAccountId !== fromAccountId) {
                updatedAccounts = updatedAccounts.map((acc) =>
                    acc.id === linkedAccountId
                        ? { ...acc, balance: acc.balance + contribution.amount }
                        : acc
                )
            }

            const updatedGoals = state.savingsGoals.map((g) =>
                g.id === contribution.savingsGoalId && !g.linkedAccountId
                    ? { ...g, currentAmount: g.currentAmount + contribution.amount }
                    : g
            )

            const syncedGoals = updatedGoals.map((g) => {
                if (!g.linkedAccountId) return g
                const linkedAccount = updatedAccounts.find((a) => a.id === g.linkedAccountId)
                return linkedAccount ? { ...g, currentAmount: linkedAccount.balance } : g
            })

            return {
                ...state,
                savingsContributions: [...state.savingsContributions, contribution],
                // Deduct contribution amount from the source account
                accounts: updatedAccounts,
                savingsGoals: syncedGoals,
            }
        }

        case 'UPDATE_SAVINGS_CONTRIBUTION': {
            const updatedContribution = action.payload
            const oldContribution = state.savingsContributions.find((c) => c.id === updatedContribution.id)
            const oldAccountId = oldContribution?.fromAccountId
            const newAccountId = updatedContribution.fromAccountId
            const oldGoal = oldContribution
                ? state.savingsGoals.find((g) => g.id === oldContribution.savingsGoalId)
                : undefined
            const newGoal = state.savingsGoals.find((g) => g.id === updatedContribution.savingsGoalId)
            const oldLinkedAccountId = oldGoal?.linkedAccountId
            const newLinkedAccountId = newGoal?.linkedAccountId

            let updatedAccounts = state.accounts

            // Refund the old account if it had one
            if (oldAccountId && oldContribution && oldAccountId !== oldLinkedAccountId) {
                updatedAccounts = updatedAccounts.map((acc) =>
                    acc.id === oldAccountId
                        ? { ...acc, balance: acc.balance + oldContribution.amount }
                        : acc
                )
            }

            // Remove from old linked account if applicable
            if (oldLinkedAccountId && oldContribution && oldLinkedAccountId !== oldAccountId) {
                updatedAccounts = updatedAccounts.map((acc) =>
                    acc.id === oldLinkedAccountId
                        ? { ...acc, balance: acc.balance - oldContribution.amount }
                        : acc
                )
            }

            // Deduct from the new account if specified
            if (newAccountId && newAccountId !== newLinkedAccountId) {
                updatedAccounts = updatedAccounts.map((acc) =>
                    acc.id === newAccountId
                        ? { ...acc, balance: acc.balance - updatedContribution.amount }
                        : acc
                )
            }

            // Add to new linked account if applicable
            if (newLinkedAccountId && newLinkedAccountId !== newAccountId) {
                updatedAccounts = updatedAccounts.map((acc) =>
                    acc.id === newLinkedAccountId
                        ? { ...acc, balance: acc.balance + updatedContribution.amount }
                        : acc
                )
            }

            // Update savings goals amounts (only for unlinked goals)
            let updatedGoals = state.savingsGoals
            if (oldContribution) {
                if (oldContribution.savingsGoalId !== updatedContribution.savingsGoalId) {
                    updatedGoals = state.savingsGoals.map((g) => {
                        if (g.id === oldContribution.savingsGoalId && !g.linkedAccountId) {
                            return { ...g, currentAmount: g.currentAmount - oldContribution.amount }
                        }
                        if (g.id === updatedContribution.savingsGoalId && !g.linkedAccountId) {
                            return { ...g, currentAmount: g.currentAmount + updatedContribution.amount }
                        }
                        return g
                    })
                } else {
                    const diff = updatedContribution.amount - oldContribution.amount
                    updatedGoals = state.savingsGoals.map((g) =>
                        g.id === updatedContribution.savingsGoalId && !g.linkedAccountId
                            ? { ...g, currentAmount: g.currentAmount + diff }
                            : g
                    )
                }
            }

            const syncedGoals = updatedGoals.map((g) => {
                if (!g.linkedAccountId) return g
                const linkedAccount = updatedAccounts.find((a) => a.id === g.linkedAccountId)
                return linkedAccount ? { ...g, currentAmount: linkedAccount.balance } : g
            })

            return {
                ...state,
                savingsContributions: state.savingsContributions.map((c) =>
                    c.id === updatedContribution.id ? updatedContribution : c
                ),
                accounts: updatedAccounts,
                savingsGoals: syncedGoals,
            }
        }

        case 'DELETE_SAVINGS_CONTRIBUTION': {
            const contributionToDelete = state.savingsContributions.find((c) => c.id === action.payload)
            const refundAccountId = contributionToDelete?.fromAccountId
            const goal = contributionToDelete
                ? state.savingsGoals.find((g) => g.id === contributionToDelete.savingsGoalId)
                : undefined
            const linkedAccountId = goal?.linkedAccountId

            let updatedAccounts = state.accounts

            if (refundAccountId && contributionToDelete && refundAccountId !== linkedAccountId) {
                updatedAccounts = updatedAccounts.map((acc) =>
                    acc.id === refundAccountId
                        ? { ...acc, balance: acc.balance + contributionToDelete.amount }
                        : acc
                )
            }

            if (linkedAccountId && contributionToDelete && linkedAccountId !== refundAccountId) {
                updatedAccounts = updatedAccounts.map((acc) =>
                    acc.id === linkedAccountId
                        ? { ...acc, balance: acc.balance - contributionToDelete.amount }
                        : acc
                )
            }

            const updatedGoalsAfterDelete = contributionToDelete
                ? state.savingsGoals.map((g) =>
                    g.id === contributionToDelete.savingsGoalId && !g.linkedAccountId
                        ? { ...g, currentAmount: g.currentAmount - contributionToDelete.amount }
                        : g
                )
                : state.savingsGoals

            const syncedGoals = updatedGoalsAfterDelete.map((g) => {
                if (!g.linkedAccountId) return g
                const linkedAccount = updatedAccounts.find((a) => a.id === g.linkedAccountId)
                return linkedAccount ? { ...g, currentAmount: linkedAccount.balance } : g
            })

            return {
                ...state,
                savingsContributions: state.savingsContributions.filter((c) => c.id !== action.payload),
                // Refund contribution amount back to the source account
                accounts: updatedAccounts,
                savingsGoals: syncedGoals,
            }
        }

        // Monthly Budget
        case 'SET_MONTHLY_BUDGET':
            return {
                ...state,
                monthlyBudgets: [...state.monthlyBudgets.filter((b) => b.id !== action.payload.id), action.payload],
            }

        // Settings
        case 'UPDATE_SETTINGS':
            return {
                ...state,
                settings: { ...state.settings, ...action.payload },
            }

        // Import
        case 'IMPORT_DATA': {
            const newState = { ...state }
            if (action.payload.categories) newState.categories = [...state.categories, ...action.payload.categories]
            if (action.payload.accounts) newState.accounts = [...state.accounts, ...action.payload.accounts]
            if (action.payload.incomes) newState.incomes = [...state.incomes, ...action.payload.incomes]
            if (action.payload.expenses) newState.expenses = [...state.expenses, ...action.payload.expenses]
            if (action.payload.bills) newState.bills = [...state.bills, ...action.payload.bills]
            if (action.payload.creditCards) newState.creditCards = [...state.creditCards, ...action.payload.creditCards]
            if (action.payload.creditCardStatements)
                newState.creditCardStatements = [...state.creditCardStatements, ...action.payload.creditCardStatements]
            if (action.payload.savingsGoals) newState.savingsGoals = [...state.savingsGoals, ...action.payload.savingsGoals]
            if (action.payload.savingsContributions)
                newState.savingsContributions = [...state.savingsContributions, ...action.payload.savingsContributions]
            return newState
        }

        default:
            return state
    }
}

type BudgetContextType = {
    state: AppState
    isLoading: boolean
    // Categories
    addCategory: (category: Omit<Category, 'id'>) => void
    updateCategory: (category: Category) => void
    deleteCategory: (id: string) => void
    getCategoryById: (id: string) => Category | undefined
    // Accounts
    addAccount: (account: Omit<Account, 'id'>) => void
    updateAccount: (account: Account) => void
    deleteAccount: (id: string) => void
    updateAccountBalance: (id: string, amount: number, operation: 'add' | 'subtract') => void
    transferFunds: (fromAccountId: string, toAccountId: string, amount: number) => void
    // Income
    addIncome: (income: Omit<Income, 'id'>) => void
    updateIncome: (income: Income) => void
    deleteIncome: (id: string) => void
    // Expenses
    addExpense: (expense: Omit<Expense, 'id'>) => void
    updateExpense: (expense: Expense) => void
    deleteExpense: (id: string) => void
    // Bills
    addBill: (bill: Omit<Bill, 'id'>) => void
    updateBill: (bill: Bill) => void
    deleteBill: (id: string) => void
    payBill: (id: string, paidDate: string, accountId: string) => void
    unpayBill: (id: string) => void
    generateRecurringBills: (month: number, year: number) => void
    // Credit Cards
    addCreditCard: (card: Omit<CreditCard, 'id'>) => void
    updateCreditCard: (card: CreditCard) => void
    deleteCreditCard: (id: string) => void
    // Credit Card Statements
    addStatement: (statement: Omit<CreditCardStatement, 'id'>) => void
    updateStatement: (statement: CreditCardStatement) => void
    deleteStatement: (id: string) => void
    // Savings Goals
    addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => void
    updateSavingsGoal: (goal: SavingsGoal) => void
    deleteSavingsGoal: (id: string) => void
    // Savings Contributions
    addSavingsContribution: (contribution: Omit<SavingsContribution, 'id'>) => void
    updateSavingsContribution: (contribution: SavingsContribution) => void
    deleteSavingsContribution: (id: string) => void
    // Monthly Budget
    setMonthlyBudget: (budget: MonthlyBudget) => void
    // Settings
    updateSettings: (settings: Partial<AppSettings>) => void
    // Data
    resetData: () => void
    importData: (data: Partial<AppState>) => void
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

// Provider
export function BudgetProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(budgetReducer, initialState)
    const [isLoading, setIsLoading] = React.useState(true)
    const [isInitialized, setIsInitialized] = React.useState(false)
    const loadFailedRef = useRef(false)

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            console.log('Loading from localStorage:', stored ? 'Data found' : 'No data found')
            if (stored) {
                const parsedState = JSON.parse(stored) as AppState
                // Ensure accounts array exists (migration for existing users)
                if (!parsedState.accounts) {
                    parsedState.accounts = defaultAccounts.map(a => ({ ...a, id: uuidv4() }))
                }
                dispatch({ type: 'LOAD_STATE', payload: parsedState })
                console.log('Loaded state with', parsedState.incomes?.length || 0, 'incomes')
            } else {
                // Initialize with default categories and accounts
                dispatch({ type: 'LOAD_STATE', payload: seedState() })
                console.log('Initialized with default categories and accounts')
            }
        } catch (error) {
            console.error('Error loading state from localStorage:', error)
            loadFailedRef.current = true
        } finally {
            setIsLoading(false)
            setIsInitialized(true)
        }
    }, [])

    // Save to localStorage on state change - only after initialization
    useEffect(() => {
        if (loadFailedRef.current) return // never overwrite data we could not read
        if (isInitialized && !isLoading) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
                console.log('Saved to localStorage:', state.incomes?.length || 0, 'incomes')
            } catch (error) {
                console.error('Error saving state to localStorage:', error)
            }
        }
    }, [state, isLoading, isInitialized])

    // Category functions
    const addCategory = useCallback((category: Omit<Category, 'id'>) => {
        dispatch({ type: 'ADD_CATEGORY', payload: { ...category, id: uuidv4() } })
    }, [])

    const updateCategory = useCallback((category: Category) => {
        dispatch({ type: 'UPDATE_CATEGORY', payload: category })
    }, [])

    const deleteCategory = useCallback((id: string) => {
        dispatch({ type: 'DELETE_CATEGORY', payload: id })
    }, [])

    const getCategoryById = useCallback(
        (id: string) => state.categories.find((c) => c.id === id),
        [state.categories]
    )

    // Account functions
    const addAccount = useCallback((account: Omit<Account, 'id'>) => {
        dispatch({ type: 'ADD_ACCOUNT', payload: { ...account, id: uuidv4() } })
    }, [])

    const updateAccount = useCallback((account: Account) => {
        dispatch({ type: 'UPDATE_ACCOUNT', payload: account })
    }, [])

    const deleteAccount = useCallback((id: string) => {
        dispatch({ type: 'DELETE_ACCOUNT', payload: id })
    }, [])

    const updateAccountBalance = useCallback((id: string, amount: number, operation: 'add' | 'subtract') => {
        dispatch({ type: 'UPDATE_ACCOUNT_BALANCE', payload: { id, amount, operation } })
    }, [])

    const transferFunds = useCallback((fromAccountId: string, toAccountId: string, amount: number) => {
        dispatch({ type: 'TRANSFER_FUNDS', payload: { fromAccountId, toAccountId, amount } })
    }, [])

    // Income functions
    const addIncome = useCallback((income: Omit<Income, 'id'>) => {
        dispatch({ type: 'ADD_INCOME', payload: { ...income, id: uuidv4() } })
    }, [])

    const updateIncome = useCallback((income: Income) => {
        dispatch({ type: 'UPDATE_INCOME', payload: income })
    }, [])

    const deleteIncome = useCallback((id: string) => {
        dispatch({ type: 'DELETE_INCOME', payload: id })
    }, [])

    // Expense functions
    const addExpense = useCallback((expense: Omit<Expense, 'id'>) => {
        dispatch({ type: 'ADD_EXPENSE', payload: { ...expense, id: uuidv4() } })
    }, [])

    const updateExpense = useCallback((expense: Expense) => {
        dispatch({ type: 'UPDATE_EXPENSE', payload: expense })
    }, [])

    const deleteExpense = useCallback((id: string) => {
        dispatch({ type: 'DELETE_EXPENSE', payload: id })
    }, [])

    // Bill functions
    const addBill = useCallback((bill: Omit<Bill, 'id'>) => {
        dispatch({ type: 'ADD_BILL', payload: { ...bill, id: uuidv4() } })
    }, [])

    const updateBill = useCallback((bill: Bill) => {
        dispatch({ type: 'UPDATE_BILL', payload: bill })
    }, [])

    const deleteBill = useCallback((id: string) => {
        dispatch({ type: 'DELETE_BILL', payload: id })
    }, [])

    const payBill = useCallback((id: string, paidDate: string, accountId: string) => {
        dispatch({ type: 'PAY_BILL', payload: { id, paidDate, accountId } })
    }, [])

    const unpayBill = useCallback((id: string) => {
        dispatch({ type: 'UNPAY_BILL', payload: id })
    }, [])

    const generateRecurringBills = useCallback((month: number, year: number) => {
        dispatch({ type: 'GENERATE_RECURRING_BILLS', payload: { month, year } })
    }, [])

    // Credit Card functions
    const addCreditCard = useCallback((card: Omit<CreditCard, 'id'>) => {
        dispatch({ type: 'ADD_CREDIT_CARD', payload: { ...card, id: uuidv4() } })
    }, [])

    const updateCreditCard = useCallback((card: CreditCard) => {
        dispatch({ type: 'UPDATE_CREDIT_CARD', payload: card })
    }, [])

    const deleteCreditCard = useCallback((id: string) => {
        dispatch({ type: 'DELETE_CREDIT_CARD', payload: id })
    }, [])

    // Credit Card Statement functions
    const addStatement = useCallback((statement: Omit<CreditCardStatement, 'id'>) => {
        dispatch({ type: 'ADD_STATEMENT', payload: { ...statement, id: uuidv4() } })
    }, [])

    const updateStatement = useCallback((statement: CreditCardStatement) => {
        dispatch({ type: 'UPDATE_STATEMENT', payload: statement })
    }, [])

    const deleteStatement = useCallback((id: string) => {
        dispatch({ type: 'DELETE_STATEMENT', payload: id })
    }, [])

    // Savings Goal functions
    const addSavingsGoal = useCallback((goal: Omit<SavingsGoal, 'id'>) => {
        dispatch({ type: 'ADD_SAVINGS_GOAL', payload: { ...goal, id: uuidv4() } })
    }, [])

    const updateSavingsGoal = useCallback((goal: SavingsGoal) => {
        dispatch({ type: 'UPDATE_SAVINGS_GOAL', payload: goal })
    }, [])

    const deleteSavingsGoal = useCallback((id: string) => {
        dispatch({ type: 'DELETE_SAVINGS_GOAL', payload: id })
    }, [])

    // Savings Contribution functions
    const addSavingsContribution = useCallback((contribution: Omit<SavingsContribution, 'id'>) => {
        dispatch({ type: 'ADD_SAVINGS_CONTRIBUTION', payload: { ...contribution, id: uuidv4() } })
    }, [])

    const updateSavingsContribution = useCallback((contribution: SavingsContribution) => {
        dispatch({ type: 'UPDATE_SAVINGS_CONTRIBUTION', payload: contribution })
    }, [])

    const deleteSavingsContribution = useCallback((id: string) => {
        dispatch({ type: 'DELETE_SAVINGS_CONTRIBUTION', payload: id })
    }, [])

    // Monthly Budget functions
    const setMonthlyBudget = useCallback((budget: MonthlyBudget) => {
        dispatch({ type: 'SET_MONTHLY_BUDGET', payload: budget })
    }, [])

    // Settings functions
    const updateSettings = useCallback((settings: Partial<AppSettings>) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings })
    }, [])

    // Data functions
    const resetData = useCallback(() => {
        dispatch({ type: 'RESET_STATE' })
    }, [])

    const importData = useCallback((data: Partial<AppState>) => {
        dispatch({ type: 'IMPORT_DATA', payload: data })
    }, [])

    const value: BudgetContextType = {
        state,
        isLoading,
        addCategory,
        updateCategory,
        deleteCategory,
        getCategoryById,
        addAccount,
        updateAccount,
        deleteAccount,
        updateAccountBalance,
        transferFunds,
        addIncome,
        updateIncome,
        deleteIncome,
        addExpense,
        updateExpense,
        deleteExpense,
        addBill,
        updateBill,
        deleteBill,
        payBill,
        unpayBill,
        generateRecurringBills,
        addCreditCard,
        updateCreditCard,
        deleteCreditCard,
        addStatement,
        updateStatement,
        deleteStatement,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        addSavingsContribution,
        updateSavingsContribution,
        deleteSavingsContribution,
        setMonthlyBudget,
        updateSettings,
        resetData,
        importData,
    }

    return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}

export function useBudget() {
    const context = useContext(BudgetContext)
    if (!context) {
        throw new Error('useBudget must be used within a BudgetProvider')
    }
    return context
}
