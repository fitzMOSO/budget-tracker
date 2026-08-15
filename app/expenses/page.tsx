'use client'

import React, { useState, useMemo } from 'react'
import { Plus, Filter, Wallet } from 'lucide-react'
import { AppLayout } from '../components/AppLayout'
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    Modal,
    Input,
    Select,
    DataTable,
    Badge,
} from '../components/ui'
import { useBudget } from '../context/BudgetContext'
import {
    filterByMonth,
    formatCurrency,
    formatDate,
    getMonthYear,
    getTodayISO,
    getExpenseTypeBgColor,
} from '../utils'
import { showSuccess, showDeleteConfirm } from '../utils/swal'
import type { Expense, ExpenseType, Category, Account } from '../types'

const EXPENSE_TYPES = [
    { value: 'essential', label: 'Essential (50%)' },
    { value: 'non-essential', label: 'Non-Essential (30%)' },
    { value: 'savings', label: 'Savings (20%)' },
]

export default function ExpensesPage() {
    const { state, balanceOf, addExpense, updateExpense, deleteExpense, addBill, payBill, isLoading } = useBudget()
    const { month: currentMonth, year: currentYear } = getMonthYear()
    const [selectedMonth, setSelectedMonth] = useState(currentMonth)
    const [selectedYear, setSelectedYear] = useState(currentYear)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
    const [filterType, setFilterType] = useState<ExpenseType | 'all'>('all')

    // Form state
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        date: getTodayISO(),
        categoryId: '',
        expenseType: 'essential' as ExpenseType,
        accountId: '',
        notes: '',
    })

    const handleMonthChange = (month: number, year: number) => {
        setSelectedMonth(month)
        setSelectedYear(year)
    }

    // Filter expenses by selected month and type
    const monthlyExpenses = useMemo(() => {
        let expenses = filterByMonth(state.expenses, selectedMonth, selectedYear)
        if (filterType !== 'all') {
            expenses = expenses.filter((e: Expense) => e.expenseType === filterType)
        }
        return expenses
    }, [state.expenses, selectedMonth, selectedYear, filterType])

    // Get expense categories
    const expenseCategories = state.categories.filter((c: Category) => c.type === 'expense')

    // Calculate totals
    const allMonthlyExpenses = filterByMonth(state.expenses, selectedMonth, selectedYear)
    const totalEssentials = allMonthlyExpenses
        .filter((e: Expense) => e.expenseType === 'essential')
        .reduce((sum: number, e: Expense) => sum + e.amount, 0)
    const totalNonEssentials = allMonthlyExpenses
        .filter((e: Expense) => e.expenseType === 'non-essential')
        .reduce((sum: number, e: Expense) => sum + e.amount, 0)
    const totalSavings = allMonthlyExpenses
        .filter((e: Expense) => e.expenseType === 'savings')
        .reduce((sum: number, e: Expense) => sum + e.amount, 0)
    const grandTotal = totalEssentials + totalNonEssentials + totalSavings

    const resetForm = () => {
        const defaultAccount = state.accounts.find((a: Account) => a.isDefault) || state.accounts[0]
        setFormData({
            description: '',
            amount: '',
            date: getTodayISO(),
            categoryId: expenseCategories[0]?.id || '',
            expenseType: 'essential',
            accountId: defaultAccount?.id || '',
            notes: '',
        })
        setEditingExpense(null)
    }

    const handleOpenModal = (expense?: Expense) => {
        if (expense) {
            setEditingExpense(expense)
            setFormData({
                description: expense.description,
                amount: expense.amount.toString(),
                date: expense.date,
                categoryId: expense.categoryId,
                expenseType: expense.expenseType,
                accountId: expense.accountId || state.accounts.find(a => a.isDefault)?.id || state.accounts[0]?.id || '',
                notes: expense.notes || '',
            })
        } else {
            resetForm()
        }
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        resetForm()
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const expenseData = {
            description: formData.description,
            amount: parseFloat(formData.amount),
            date: formData.date,
            categoryId: formData.categoryId,
            expenseType: formData.expenseType,
            accountId: formData.accountId,
            notes: formData.notes || undefined,
        }

        if (editingExpense) {
            updateExpense({ ...expenseData, id: editingExpense.id })
            showSuccess('Expense updated successfully!')
        } else {
            addExpense(expenseData)

            // Check if category is marked as a bill category - if so, also create a paid bill
            const selectedCategory = state.categories.find((c: Category) => c.id === formData.categoryId)
            if (selectedCategory?.isBill) {
                // Create a bill that's already marked as paid with expense tracking
                addBill({
                    description: formData.description,
                    amount: parseFloat(formData.amount),
                    dueDate: formData.date,
                    isPaid: true,
                    paidDate: formData.date,
                    paidFromAccountId: formData.accountId,
                    isRecurring: false,
                    categoryId: formData.categoryId,
                    notes: `Auto-created from expense`,
                })
                showSuccess('Expense added and bill recorded!')
            } else {
                showSuccess('Expense added successfully!')
            }
        }

        handleCloseModal()
    }

    const handleDelete = async (expense: Expense) => {
        const confirmed = await showDeleteConfirm(expense.description)
        if (confirmed) {
            deleteExpense(expense.id)
            showSuccess('Expense deleted successfully!')
        }
    }

    const getCategoryName = (categoryId: string) => {
        const category = state.categories.find((c: Category) => c.id === categoryId)
        return category?.name || 'Uncategorized'
    }

    const getCategoryColor = (categoryId: string) => {
        const category = state.categories.find((c: Category) => c.id === categoryId)
        return category?.color || '#6b7280'
    }

    const getAccountName = (accountId?: string) => {
        if (!accountId) return '-'
        const account = state.accounts.find((a: Account) => a.id === accountId)
        return account?.name || '-'
    }

    const getExpenseTypeBadge = (type: ExpenseType) => {
        switch (type) {
            case 'essential':
                return <Badge className="bg-rose-100 text-rose-800">Essential</Badge>
            case 'non-essential':
                return <Badge className="bg-amber-100 text-amber-800">Non-Essential</Badge>
            case 'savings':
                return <Badge className="bg-emerald-100 text-emerald-800">Savings</Badge>
        }
    }

    const columns = [
        {
            key: 'date',
            header: 'Date',
            render: (expense: Expense) => formatDate(expense.date),
        },
        {
            key: 'description',
            header: 'Description',
            render: (expense: Expense) => (
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getCategoryColor(expense.categoryId) }}
                    />
                    <span>{expense.description}</span>
                </div>
            ),
        },
        {
            key: 'categoryId',
            header: 'Category',
            render: (expense: Expense) => getCategoryName(expense.categoryId),
        },
        {
            key: 'accountId',
            header: 'Account',
            render: (expense: Expense) => (
                <div className="flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-gray-400" />
                    <span>{getAccountName(expense.accountId)}</span>
                </div>
            ),
        },
        {
            key: 'expenseType',
            header: 'Type',
            render: (expense: Expense) => getExpenseTypeBadge(expense.expenseType),
        },
        {
            key: 'budgetAmount',
            header: 'Budget',
            render: (expense: Expense) =>
                expense.budgetAmount ? formatCurrency(expense.budgetAmount, state.settings) : '-',
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (expense: Expense) => (
                <span className="font-semibold text-red-600">
                    {formatCurrency(expense.amount, state.settings)}
                </span>
            ),
        },
    ]

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <AppLayout
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={handleMonthChange}
        >
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-rose-200 bg-rose-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-rose-800">Essentials (50%)</p>
                            <p className="text-2xl font-bold text-rose-700">
                                {formatCurrency(totalEssentials, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-amber-800">Non-Essentials (30%)</p>
                            <p className="text-2xl font-bold text-amber-700">
                                {formatCurrency(totalNonEssentials, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-emerald-200 bg-emerald-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-emerald-800">Savings (20%)</p>
                            <p className="text-2xl font-bold text-emerald-700">
                                {formatCurrency(totalSavings, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 bg-gray-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-gray-800">Total Expenses</p>
                            <p className="text-2xl font-bold text-gray-700">
                                {formatCurrency(grandTotal, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Expenses Table */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <CardTitle>Expenses</CardTitle>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-gray-500" />
                                    <Select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value as ExpenseType | 'all')}
                                        options={[
                                            { value: 'all', label: 'All Types' },
                                            ...EXPENSE_TYPES,
                                        ]}
                                        className="w-40"
                                    />
                                </div>
                                <Button onClick={() => handleOpenModal()}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Expense
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            data={monthlyExpenses}
                            columns={columns}
                            onEdit={handleOpenModal}
                            onDelete={handleDelete}
                            emptyMessage="No expenses for this month"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingExpense ? 'Edit Expense' : 'Add Expense'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Description (optional)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="e.g., Groceries, Electric bill"
                    />

                    <Input
                        label="Amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            required
                        />
                        <Select
                            label="Category"
                            value={formData.categoryId}
                            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                            options={expenseCategories.map((c: Category) => ({ value: c.id, label: c.name }))}
                            placeholder="Select category"
                            required
                        />
                    </div>

                    <Select
                        label="Expense Type"
                        value={formData.expenseType}
                        onChange={(e) =>
                            setFormData({ ...formData, expenseType: e.target.value as ExpenseType })
                        }
                        options={EXPENSE_TYPES}
                        required
                    />

                    <Select
                        label="Pay from Account"
                        value={formData.accountId}
                        onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                        options={state.accounts.map((a: Account) => ({
                            value: a.id,
                            label: `${a.name} (${formatCurrency(balanceOf(a.id), state.settings)})`
                        }))}
                        placeholder="Select account"
                        required
                    />

                    <Input
                        label="Notes (optional)"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes"
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingExpense ? 'Update' : 'Add'} Expense
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    )
}
