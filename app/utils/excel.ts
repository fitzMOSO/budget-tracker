'use client'

import * as XLSX from 'xlsx'
import type { AppState } from '../types'
import { computeBalanceMap, goalProgress, totalGoalProgress, linkedBillExpense } from './balances'

// Helper function to format currency for export
const formatAmount = (amount: number, symbol: string) => {
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Helper to get category name by ID
const getCategoryName = (categoryId: string, categories: AppState['categories']) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown'
}

// Helper to get account name by ID
const getAccountName = (accountId: string | undefined, accounts: AppState['accounts']) => {
    if (!accountId) return 'N/A'
    return accounts.find(a => a.id === accountId)?.name || 'Unknown'
}

// Helper to get credit card name by ID
const getCreditCardName = (cardId: string, cards: AppState['creditCards']) => {
    const card = cards.find(c => c.id === cardId)
    return card ? `${card.bank} - ${card.cardType}` : 'Unknown'
}

// Export comprehensive analytics to Excel
export const exportToExcel = (state: AppState, filename: string = 'budget-tracker-analytics') => {
    const workbook = XLSX.utils.book_new()
    const symbol = state.settings.currencySymbol
    // Account balances are derived, never stored on the account itself. A Map,
    // not a record: `balances[id] ?? 0` resolves an unknown id of 'constructor'
    // or 'toString' through Object.prototype and yields a function.
    const balances = computeBalanceMap(state)

    // ============== OVERVIEW SHEET ==============
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Calculate all-time totals
    const totalIncome = state.incomes.reduce((sum, i) => sum + i.amount, 0)
    const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0)
    // One pass over the expenses, not one per bill: a bill is paid exactly when
    // a linked expense exists (same derivation as BudgetContext's paidBillIds).
    const paidBillIds = new Set(state.expenses.map(e => e.billId).filter(Boolean) as string[])
    const totalBillsPaid = state.bills.filter(b => paidBillIds.has(b.id)).reduce((sum, b) => sum + b.amount, 0)
    const totalBillsUnpaid = state.bills.filter(b => !paidBillIds.has(b.id)).reduce((sum, b) => sum + b.amount, 0)
    // Deduped by linked account: two goals on one account is one pile of money.
    const totalSavings = totalGoalProgress(state)
    const totalAccountBalance = state.accounts.reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0)
    const totalCreditCardDebt = state.creditCardStatements
        .filter(s => s.status !== 'paid')
        .reduce((sum, s) => sum + (s.statementBalance - s.amountPaid), 0)

    // Monthly income for current month
    const currentMonthIncomes = state.incomes.filter(i => {
        const d = new Date(i.date)
        return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
    })
    const currentMonthExpenses = state.expenses.filter(e => {
        const d = new Date(e.date)
        return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
    })
    const monthlyIncome = currentMonthIncomes.reduce((sum, i) => sum + i.amount, 0)
    const monthlyExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0)

    const overviewData = [
        { Metric: 'Report Generated', Value: now.toLocaleString() },
        { Metric: '', Value: '' },
        { Metric: '=== ACCOUNT BALANCES ===', Value: '' },
        { Metric: 'Total Account Balance', Value: formatAmount(totalAccountBalance, symbol) },
        ...state.accounts.map(a => ({ Metric: `  - ${a.name} (${a.type})`, Value: formatAmount(balances.get(a.id) ?? 0, symbol) })),
        { Metric: '', Value: '' },
        { Metric: '=== ALL-TIME SUMMARY ===', Value: '' },
        { Metric: 'Total Income (All Time)', Value: formatAmount(totalIncome, symbol) },
        { Metric: 'Total Expenses (All Time)', Value: formatAmount(totalExpenses, symbol) },
        { Metric: 'Net Income (All Time)', Value: formatAmount(totalIncome - totalExpenses, symbol) },
        { Metric: 'Total Bills Paid', Value: formatAmount(totalBillsPaid, symbol) },
        { Metric: 'Outstanding Bills', Value: formatAmount(totalBillsUnpaid, symbol) },
        { Metric: 'Total Savings', Value: formatAmount(totalSavings, symbol) },
        { Metric: 'Credit Card Debt', Value: formatAmount(totalCreditCardDebt, symbol) },
        { Metric: '', Value: '' },
        { Metric: `=== CURRENT MONTH (${currentMonth}/${currentYear}) ===`, Value: '' },
        { Metric: 'Monthly Income', Value: formatAmount(monthlyIncome, symbol) },
        { Metric: 'Monthly Expenses', Value: formatAmount(monthlyExpenses, symbol) },
        { Metric: 'Monthly Net', Value: formatAmount(monthlyIncome - monthlyExpenses, symbol) },
        { Metric: '', Value: '' },
        { Metric: '=== COUNTS ===', Value: '' },
        { Metric: 'Total Accounts', Value: state.accounts.length.toString() },
        { Metric: 'Total Categories', Value: state.categories.length.toString() },
        { Metric: 'Total Income Entries', Value: state.incomes.length.toString() },
        { Metric: 'Total Expense Entries', Value: state.expenses.length.toString() },
        { Metric: 'Total Bills', Value: state.bills.length.toString() },
        { Metric: 'Total Credit Cards', Value: state.creditCards.length.toString() },
        { Metric: 'Total Savings Goals', Value: state.savingsGoals.length.toString() },
    ]
    const overviewSheet = XLSX.utils.json_to_sheet(overviewData)
    overviewSheet['!cols'] = [{ wch: 40 }, { wch: 25 }]
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview')

    // ============== INCOME BY CATEGORY SHEET ==============
    const incomeByCategoryMap = new Map<string, { count: number; total: number; categoryName: string }>()
    state.incomes.forEach(i => {
        const categoryName = getCategoryName(i.categoryId, state.categories)
        const existing = incomeByCategoryMap.get(i.categoryId) || { count: 0, total: 0, categoryName }
        existing.count++
        existing.total += i.amount
        incomeByCategoryMap.set(i.categoryId, existing)
    })
    const incomeByCategoryData = Array.from(incomeByCategoryMap.values())
        .sort((a, b) => b.total - a.total)
        .map(item => ({
            Category: item.categoryName,
            'Transaction Count': item.count,
            'Total Amount': formatAmount(item.total, symbol),
            'Percentage': ((item.total / (totalIncome || 1)) * 100).toFixed(1) + '%',
        }))
    if (incomeByCategoryData.length > 0) {
        const incomeCatSheet = XLSX.utils.json_to_sheet(incomeByCategoryData)
        incomeCatSheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }]
        XLSX.utils.book_append_sheet(workbook, incomeCatSheet, 'Income by Category')
    }

    // ============== EXPENSE BY CATEGORY SHEET ==============
    const expenseByCategoryMap = new Map<string, { count: number; total: number; categoryName: string; expenseType: string }>()
    state.expenses.forEach(e => {
        const categoryName = getCategoryName(e.categoryId, state.categories)
        const existing = expenseByCategoryMap.get(e.categoryId) || { count: 0, total: 0, categoryName, expenseType: e.expenseType }
        existing.count++
        existing.total += e.amount
        expenseByCategoryMap.set(e.categoryId, existing)
    })
    const expenseByCategoryData = Array.from(expenseByCategoryMap.values())
        .sort((a, b) => b.total - a.total)
        .map(item => ({
            Category: item.categoryName,
            Type: item.expenseType,
            'Transaction Count': item.count,
            'Total Amount': formatAmount(item.total, symbol),
            'Percentage': ((item.total / (totalExpenses || 1)) * 100).toFixed(1) + '%',
        }))
    if (expenseByCategoryData.length > 0) {
        const expenseCatSheet = XLSX.utils.json_to_sheet(expenseByCategoryData)
        expenseCatSheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }]
        XLSX.utils.book_append_sheet(workbook, expenseCatSheet, 'Expense by Category')
    }

    // ============== MONTHLY TRENDS SHEET ==============
    const monthlyTrendsMap = new Map<string, { income: number; expenses: number }>()
    state.incomes.forEach(i => {
        const d = new Date(i.date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const existing = monthlyTrendsMap.get(key) || { income: 0, expenses: 0 }
        existing.income += i.amount
        monthlyTrendsMap.set(key, existing)
    })
    state.expenses.forEach(e => {
        const d = new Date(e.date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const existing = monthlyTrendsMap.get(key) || { income: 0, expenses: 0 }
        existing.expenses += e.amount
        monthlyTrendsMap.set(key, existing)
    })
    const monthlyTrendsData = Array.from(monthlyTrendsMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => ({
            Month: month,
            Income: formatAmount(data.income, symbol),
            Expenses: formatAmount(data.expenses, symbol),
            'Net Cash Flow': formatAmount(data.income - data.expenses, symbol),
            'Savings Rate': data.income > 0 ? (((data.income - data.expenses) / data.income) * 100).toFixed(1) + '%' : 'N/A',
        }))
    if (monthlyTrendsData.length > 0) {
        const trendsSheet = XLSX.utils.json_to_sheet(monthlyTrendsData)
        trendsSheet['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }]
        XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Monthly Trends')
    }

    // ============== ACCOUNT ACTIVITY SHEET ==============
    const accountActivityMap = new Map<string, { income: number; expenses: number; accountName: string }>()
    state.incomes.forEach(i => {
        if (i.accountId) {
            const accountName = getAccountName(i.accountId, state.accounts)
            const existing = accountActivityMap.get(i.accountId) || { income: 0, expenses: 0, accountName }
            existing.income += i.amount
            accountActivityMap.set(i.accountId, existing)
        }
    })
    state.expenses.forEach(e => {
        if (e.accountId) {
            const accountName = getAccountName(e.accountId, state.accounts)
            const existing = accountActivityMap.get(e.accountId) || { income: 0, expenses: 0, accountName }
            existing.expenses += e.amount
            accountActivityMap.set(e.accountId, existing)
        }
    })
    const accountActivityData = Array.from(accountActivityMap.values())
        .sort((a, b) => (b.income + b.expenses) - (a.income + a.expenses))
        .map(item => ({
            Account: item.accountName,
            'Total Income': formatAmount(item.income, symbol),
            'Total Expenses': formatAmount(item.expenses, symbol),
            'Net Flow': formatAmount(item.income - item.expenses, symbol),
        }))
    if (accountActivityData.length > 0) {
        const activitySheet = XLSX.utils.json_to_sheet(accountActivityData)
        activitySheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }]
        XLSX.utils.book_append_sheet(workbook, activitySheet, 'Account Activity')
    }

    // ============== BILLS STATUS SHEET ==============
    const billsData = state.bills.map(b => {
        // Status, paid date and paying account all come from the linked expense.
        const payment = linkedBillExpense(state, b.id)
        return {
            Description: b.description,
            Amount: formatAmount(b.amount, symbol),
            'Due Date': b.dueDate,
            Status: payment ? 'Paid' : 'Unpaid',
            'Paid Date': payment?.date || '',
            'Paid From': getAccountName(payment?.accountId, state.accounts),
            Recurring: b.isRecurring ? 'Yes' : 'No',
            Category: getCategoryName(b.categoryId || '', state.categories),
            Notes: b.notes || '',
        }
    })
    if (billsData.length > 0) {
        const billsSheet = XLSX.utils.json_to_sheet(billsData)
        billsSheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 30 }]
        XLSX.utils.book_append_sheet(workbook, billsSheet, 'Bills')
    }

    // ============== CREDIT CARDS SUMMARY SHEET ==============
    const creditCardsData = state.creditCards.map(c => {
        const statements = state.creditCardStatements.filter(s => s.creditCardId === c.id)
        const unpaidStatements = statements.filter(s => s.status !== 'paid')
        const totalDebt = unpaidStatements.reduce((sum, s) => sum + (s.statementBalance - s.amountPaid), 0)
        const paidStatements = statements.filter(s => s.status === 'paid')
        const totalPaid = paidStatements.reduce((sum, s) => sum + s.statementBalance, 0)
        
        return {
            Bank: c.bank,
            'Card Type': c.cardType,
            'Card Name': c.cardName || '',
            'Credit Limit': c.creditLimit ? formatAmount(c.creditLimit, symbol) : 'N/A',
            'Available Limit': c.currentAvailableLimit ? formatAmount(c.currentAvailableLimit, symbol) : 'N/A',
            'Total Statements': statements.length,
            'Outstanding Debt': formatAmount(totalDebt, symbol),
            'Total Paid': formatAmount(totalPaid, symbol),
        }
    })
    if (creditCardsData.length > 0) {
        const ccSheet = XLSX.utils.json_to_sheet(creditCardsData)
        ccSheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
        XLSX.utils.book_append_sheet(workbook, ccSheet, 'Credit Cards')
    }

    // ============== CREDIT CARD STATEMENTS SHEET ==============
    const statementsData = state.creditCardStatements.map(s => ({
        'Credit Card': getCreditCardName(s.creditCardId, state.creditCards),
        'Statement Balance': formatAmount(s.statementBalance, symbol),
        'Amount Paid': formatAmount(s.amountPaid, symbol),
        'Remaining': formatAmount(s.statementBalance - s.amountPaid, symbol),
        'Due Date': s.dueDate,
        Status: s.status.charAt(0).toUpperCase() + s.status.slice(1),
        'Paid Date': s.paidDate || '',
        'Paid From': getAccountName(s.paidFromAccountId, state.accounts),
        Notes: s.notes || '',
    }))
    if (statementsData.length > 0) {
        const stmtSheet = XLSX.utils.json_to_sheet(statementsData)
        stmtSheet['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 30 }]
        XLSX.utils.book_append_sheet(workbook, stmtSheet, 'CC Statements')
    }

    // ============== SAVINGS GOALS SHEET ==============
    const savingsData = state.savingsGoals.map(g => {
        const contributions = state.savingsContributions.filter(c => c.savingsGoalId === g.id)
        // Derived, like every other money figure in this export.
        const saved = goalProgress(state, g)
        const progress = (saved / g.targetAmount) * 100

        return {
            'Goal Name': g.name,
            'Target Amount': formatAmount(g.targetAmount, symbol),
            'Current Amount': formatAmount(saved, symbol),
            'Remaining': formatAmount(g.targetAmount - saved, symbol),
            Progress: progress.toFixed(1) + '%',
            Deadline: g.deadline || 'No deadline',
            'Total Contributions': contributions.length,
        }
    })
    if (savingsData.length > 0) {
        const savingsSheet = XLSX.utils.json_to_sheet(savingsData)
        savingsSheet['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 20 }]
        XLSX.utils.book_append_sheet(workbook, savingsSheet, 'Savings Goals')
    }

    // ============== SAVINGS CONTRIBUTIONS SHEET ==============
    const contributionsData = state.savingsContributions.map(c => {
        const goal = state.savingsGoals.find(g => g.id === c.savingsGoalId)
        return {
            'Savings Goal': goal?.name || 'Unknown',
            Amount: formatAmount(c.amount, symbol),
            Date: c.date,
            'From Account': getAccountName(c.fromAccountId, state.accounts),
            Notes: c.notes || '',
        }
    })
    if (contributionsData.length > 0) {
        const contribSheet = XLSX.utils.json_to_sheet(contributionsData)
        contribSheet['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 30 }]
        XLSX.utils.book_append_sheet(workbook, contribSheet, 'Contributions')
    }

    // ============== ALL INCOMES SHEET ==============
    const allIncomesData = state.incomes
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(i => ({
            Date: i.date,
            Description: i.description,
            Amount: formatAmount(i.amount, symbol),
            Category: getCategoryName(i.categoryId, state.categories),
            Account: getAccountName(i.accountId, state.accounts),
            Recurring: i.isRecurring ? 'Yes' : 'No',
            Notes: i.notes || '',
        }))
    if (allIncomesData.length > 0) {
        const incomesSheet = XLSX.utils.json_to_sheet(allIncomesData)
        incomesSheet['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 30 }]
        XLSX.utils.book_append_sheet(workbook, incomesSheet, 'All Income')
    }

    // ============== ALL EXPENSES SHEET ==============
    const allExpensesData = state.expenses
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(e => ({
            Date: e.date,
            Description: e.description,
            Amount: formatAmount(e.amount, symbol),
            Category: getCategoryName(e.categoryId, state.categories),
            Account: getAccountName(e.accountId, state.accounts),
            Type: e.expenseType === 'essential' ? 'Essential' : 'Non-Essential',
            Notes: e.notes || '',
        }))
    if (allExpensesData.length > 0) {
        const expensesSheet = XLSX.utils.json_to_sheet(allExpensesData)
        expensesSheet['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 30 }]
        XLSX.utils.book_append_sheet(workbook, expensesSheet, 'All Expenses')
    }

    // ============== BUDGET ANALYSIS SHEET ==============
    const essentialExpenses = state.expenses.filter(e => e.expenseType === 'essential').reduce((sum, e) => sum + e.amount, 0)
    const nonEssentialExpenses = state.expenses.filter(e => e.expenseType === 'non-essential').reduce((sum, e) => sum + e.amount, 0)
    const budgetAnalysisData = [
        { Metric: '=== BUDGET ALLOCATION ANALYSIS ===', Value: '' },
        { Metric: 'Recommended Essentials (%)', Value: state.settings.defaultEssentialsPercentage.toString() + '%' },
        { Metric: 'Recommended Non-Essentials (%)', Value: state.settings.defaultNonEssentialsPercentage.toString() + '%' },
        { Metric: 'Recommended Savings (%)', Value: state.settings.defaultSavingsPercentage.toString() + '%' },
        { Metric: '', Value: '' },
        { Metric: '=== ACTUAL SPENDING ===', Value: '' },
        { Metric: 'Total Income', Value: formatAmount(totalIncome, symbol) },
        { Metric: 'Essential Expenses', Value: formatAmount(essentialExpenses, symbol) },
        { Metric: 'Non-Essential Expenses', Value: formatAmount(nonEssentialExpenses, symbol) },
        { Metric: 'Total Savings', Value: formatAmount(totalSavings, symbol) },
        { Metric: '', Value: '' },
        { Metric: '=== ACTUAL PERCENTAGES ===', Value: '' },
        { Metric: 'Essentials (%)', Value: totalIncome > 0 ? ((essentialExpenses / totalIncome) * 100).toFixed(1) + '%' : 'N/A' },
        { Metric: 'Non-Essentials (%)', Value: totalIncome > 0 ? ((nonEssentialExpenses / totalIncome) * 100).toFixed(1) + '%' : 'N/A' },
        { Metric: 'Savings (%)', Value: totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) + '%' : 'N/A' },
    ]
    const budgetSheet = XLSX.utils.json_to_sheet(budgetAnalysisData)
    budgetSheet['!cols'] = [{ wch: 40 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, budgetSheet, 'Budget Analysis')

    // ============== CATEGORIES LIST SHEET ==============
    const categoriesData = state.categories.map(c => ({
        Name: c.name,
        Type: c.type === 'income' ? 'Income' : 'Expense',
        Color: c.color,
        'Is Default': c.isDefault ? 'Yes' : 'No',
    }))
    if (categoriesData.length > 0) {
        const catSheet = XLSX.utils.json_to_sheet(categoriesData)
        catSheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 12 }]
        XLSX.utils.book_append_sheet(workbook, catSheet, 'Categories')
    }

    // Generate and download
    const date = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `${filename}-${date}.xlsx`)
}
