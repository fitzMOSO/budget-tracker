import type {
    AppState,
    Account,
    Bill,
    Category,
    CreditCard,
    CreditCardStatement,
    Expense,
    Income,
    SavingsContribution,
    SavingsGoal,
} from '../types'
import { DEFAULT_SETTINGS } from '../types'

function id(prefix: string, n: number) {
    return `demo-${prefix}-${n}`
}

function daysAgo(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().slice(0, 10)
}

function daysAhead(days: number): string {
    return daysAgo(-days)
}

/**
 * A realistic month of activity, used to make the app explorable without
 * manual data entry. Every page should have something to show, so this seeds
 * bills and credit cards as well as the budget itself.
 *
 * Note the savings figures come from `savingsContributions`, not from expenses
 * tagged `expenseType: 'savings'` — `calculateBudgetSummary` reads only the
 * former, so seeding a "savings" expense would leave the savings bucket at zero
 * and make the demo look broken.
 */
export function buildDemoData(): Partial<AppState> {
    const accounts: Account[] = [
        { id: id('acct', 1), name: 'Cash', type: 'cash', openingBalance: 4500, color: '#22c55e', isDefault: true },
        { id: id('acct', 2), name: 'BPI Savings', type: 'bank', openingBalance: 68200, color: '#3b82f6' },
        { id: id('acct', 3), name: 'GCash', type: 'e-wallet', openingBalance: 3150, color: '#0070f3' },
    ]

    const categories: Category[] = [
        { id: id('cat', 1), name: 'Salary', type: 'income', color: '#22c55e', isDefault: true },
        { id: id('cat', 2), name: 'Freelance', type: 'income', color: '#8b5cf6' },
        { id: id('cat', 3), name: 'Rent', type: 'expense', color: '#ef4444', isBill: true },
        { id: id('cat', 4), name: 'Groceries', type: 'expense', color: '#84cc16' },
        { id: id('cat', 5), name: 'Transportation', type: 'expense', color: '#06b6d4' },
        { id: id('cat', 6), name: 'Dining Out', type: 'expense', color: '#fb923c' },
        { id: id('cat', 7), name: 'Subscriptions', type: 'expense', color: '#38bdf8' },
        { id: id('cat', 8), name: 'Electricity', type: 'expense', color: '#fbbf24', isBill: true },
        { id: id('cat', 9), name: 'Internet', type: 'expense', color: '#818cf8', isBill: true },
    ]

    const incomes: Income[] = [
        { id: id('inc', 1), description: 'Monthly salary', amount: 62000, date: daysAgo(28), categoryId: id('cat', 1), accountId: id('acct', 2), isRecurring: true },
        { id: id('inc', 2), description: 'Monthly salary', amount: 62000, date: daysAgo(3), categoryId: id('cat', 1), accountId: id('acct', 2), isRecurring: true },
        { id: id('inc', 3), description: 'Logo design project', amount: 12500, date: daysAgo(11), categoryId: id('cat', 2), accountId: id('acct', 3) },
    ]

    const expenses: Expense[] = [
        // billId is what makes bill 1 show as paid — bills store no isPaid flag.
        { id: id('exp', 1), description: 'Apartment rent', amount: 18000, date: daysAgo(26), categoryId: id('cat', 3), accountId: id('acct', 2), expenseType: 'essential', billId: id('bill', 1) },
        { id: id('exp', 2), description: 'Weekly groceries', amount: 3400, date: daysAgo(21), categoryId: id('cat', 4), accountId: id('acct', 1), expenseType: 'essential' },
        { id: id('exp', 3), description: 'Weekly groceries', amount: 2950, date: daysAgo(14), categoryId: id('cat', 4), accountId: id('acct', 1), expenseType: 'essential' },
        { id: id('exp', 4), description: 'Weekly groceries', amount: 3720, date: daysAgo(7), categoryId: id('cat', 4), accountId: id('acct', 1), expenseType: 'essential' },
        { id: id('exp', 5), description: 'Electricity bill', amount: 2840, date: daysAgo(18), categoryId: id('cat', 8), accountId: id('acct', 2), expenseType: 'essential', billId: id('bill', 2) },
        { id: id('exp', 6), description: 'Grab to office', amount: 890, date: daysAgo(9), categoryId: id('cat', 5), accountId: id('acct', 3), expenseType: 'essential' },
        { id: id('exp', 7), description: 'Dinner with friends', amount: 1650, date: daysAgo(6), categoryId: id('cat', 6), accountId: id('acct', 1), expenseType: 'non-essential' },
        { id: id('exp', 8), description: 'Streaming subscriptions', amount: 749, date: daysAgo(5), categoryId: id('cat', 7), accountId: id('acct', 3), expenseType: 'non-essential' },
        { id: id('exp', 9), description: 'New running shoes', amount: 4200, date: daysAgo(12), categoryId: id('cat', 6), accountId: id('acct', 1), expenseType: 'non-essential' },
    ]

    const bills: Bill[] = [
        // Bills 1 and 2 read as paid because exp 1 and exp 5 link back to them.
        { id: id('bill', 1), description: 'Apartment rent', amount: 18000, dueDate: daysAgo(26), isRecurring: true, categoryId: id('cat', 3) },
        { id: id('bill', 2), description: 'Electricity', amount: 2840, dueDate: daysAgo(18), isRecurring: true, categoryId: id('cat', 8) },
        { id: id('bill', 3), description: 'Internet', amount: 1699, dueDate: daysAhead(6), isRecurring: true, categoryId: id('cat', 9) },
    ]

    const creditCards: CreditCard[] = [
        { id: id('card', 1), bank: 'BPI', cardType: 'Visa', cardName: 'BPI Gold', creditLimit: 80000, currentAvailableLimit: 66500, color: '#ef4444' },
    ]

    const creditCardStatements: CreditCardStatement[] = [
        { id: id('stmt', 1), creditCardId: id('card', 1), statementBalance: 13500, amountPaid: 13500, dueDate: daysAgo(20), status: 'paid', paidDate: daysAgo(22), paidFromAccountId: id('acct', 2) },
        { id: id('stmt', 2), creditCardId: id('card', 1), statementBalance: 13500, amountPaid: 5000, dueDate: daysAhead(10), status: 'partial', paidFromAccountId: id('acct', 2) },
    ]

    const savingsGoals: SavingsGoal[] = [
        { id: id('goal', 1), name: 'Emergency Fund', targetAmount: 180000, currentAmount: 62000, color: '#22c55e' },
        { id: id('goal', 2), name: 'Japan Trip', targetAmount: 120000, currentAmount: 28500, deadline: '2027-03-01', color: '#3b82f6' },
    ]

    const savingsContributions: SavingsContribution[] = [
        { id: id('contrib', 1), savingsGoalId: id('goal', 1), amount: 10000, date: daysAgo(3), fromAccountId: id('acct', 2), notes: 'Payday transfer' },
        { id: id('contrib', 2), savingsGoalId: id('goal', 2), amount: 5000, date: daysAgo(2), fromAccountId: id('acct', 2) },
    ]

    return {
        accounts,
        categories,
        incomes,
        expenses,
        bills,
        creditCards,
        creditCardStatements,
        savingsGoals,
        savingsContributions,
        settings: DEFAULT_SETTINGS,
    }
}
