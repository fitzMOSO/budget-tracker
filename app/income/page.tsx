'use client'

import React, { useState, useMemo } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { AppLayout } from '../components/AppLayout'
import { Card, CardHeader, CardTitle, CardContent, Button, Modal, Input, Select, DataTable } from '../components/ui'
import { useBudget } from '../context/BudgetContext'
import { filterByMonth, formatCurrency, formatDate, getMonthYear, getTodayISO } from '../utils'
import { showSuccess, showDeleteConfirm } from '../utils/swal'
import type { Income, Category, Account } from '../types'

export default function IncomePage() {
    const { state, addIncome, updateIncome, deleteIncome, isLoading } = useBudget()
    const { month: currentMonth, year: currentYear } = getMonthYear()
    const [selectedMonth, setSelectedMonth] = useState(currentMonth)
    const [selectedYear, setSelectedYear] = useState(currentYear)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingIncome, setEditingIncome] = useState<Income | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        expectedAmount: '',
        date: getTodayISO(),
        categoryId: '',
        accountId: '',
        notes: '',
    })

    const handleMonthChange = (month: number, year: number) => {
        setSelectedMonth(month)
        setSelectedYear(year)
    }

    // Filter incomes by selected month
    const monthlyIncomes = useMemo(
        () => filterByMonth(state.incomes, selectedMonth, selectedYear),
        [state.incomes, selectedMonth, selectedYear]
    )

    // Get income categories
    const incomeCategories = state.categories.filter((c: Category) => c.type === 'income')

    const totalIncome = monthlyIncomes.reduce((sum: number, i: Income) => sum + i.amount, 0)
    const totalExpected = monthlyIncomes.reduce((sum: number, i: Income) => sum + (i.expectedAmount || i.amount), 0)

    const resetForm = () => {
        const defaultAccount = state.accounts.find((a: Account) => a.isDefault) || state.accounts[0]
        setFormData({
            description: '',
            amount: '',
            expectedAmount: '',
            date: getTodayISO(),
            categoryId: incomeCategories[0]?.id || '',
            accountId: defaultAccount?.id || '',
            notes: '',
        })
        setEditingIncome(null)
    }

    const handleOpenModal = (income?: Income) => {
        if (income) {
            setEditingIncome(income)
            setFormData({
                description: income.description,
                amount: income.amount.toString(),
                expectedAmount: income.expectedAmount?.toString() || '',
                date: income.date,
                categoryId: income.categoryId,
                accountId: income.accountId || state.accounts.find((a: Account) => a.isDefault)?.id || state.accounts[0]?.id || '',
                notes: income.notes || '',
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

        const incomeData = {
            description: formData.description,
            amount: parseFloat(formData.amount),
            expectedAmount: formData.expectedAmount ? parseFloat(formData.expectedAmount) : undefined,
            date: formData.date,
            categoryId: formData.categoryId,
            accountId: formData.accountId,
            notes: formData.notes || undefined,
        }

        if (editingIncome) {
            updateIncome({ ...incomeData, id: editingIncome.id })
            showSuccess('Income updated successfully!')
        } else {
            addIncome(incomeData)
            showSuccess('Income added successfully!')
        }

        handleCloseModal()
    }

    const handleDelete = async (income: Income) => {
        const confirmed = await showDeleteConfirm(income.description)
        if (confirmed) {
            deleteIncome(income.id)
            showSuccess('Income deleted successfully!')
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

    const columns = [
        {
            key: 'date',
            header: 'Date',
            render: (income: Income) => formatDate(income.date),
        },
        {
            key: 'description',
            header: 'Description',
            render: (income: Income) => (
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getCategoryColor(income.categoryId) }}
                    />
                    <span>{income.description}</span>
                </div>
            ),
        },
        {
            key: 'categoryId',
            header: 'Category',
            render: (income: Income) => getCategoryName(income.categoryId),
        },
        {
            key: 'accountId',
            header: 'Account',
            render: (income: Income) => (
                <div className="flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-gray-400" />
                    <span>{getAccountName(income.accountId)}</span>
                </div>
            ),
        },
        {
            key: 'expectedAmount',
            header: 'Expected',
            render: (income: Income) =>
                income.expectedAmount ? formatCurrency(income.expectedAmount, state.settings) : '-',
        },
        {
            key: 'amount',
            header: 'Actual',
            render: (income: Income) => (
                <span className="font-semibold text-green-600">
                    {formatCurrency(income.amount, state.settings)}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-green-800">Total Income</p>
                            <p className="text-2xl font-bold text-green-700">
                                {formatCurrency(totalIncome, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-blue-800">Expected Income</p>
                            <p className="text-2xl font-bold text-blue-700">
                                {formatCurrency(totalExpected, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-purple-200 bg-purple-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-purple-800">Entries</p>
                            <p className="text-2xl font-bold text-purple-700">{monthlyIncomes.length}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Income Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Income Summary</CardTitle>
                            <Button onClick={() => handleOpenModal()}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Income
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            data={monthlyIncomes}
                            columns={columns}
                            onEdit={handleOpenModal}
                            onDelete={handleDelete}
                            emptyMessage="No income entries for this month"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingIncome ? 'Edit Income' : 'Add Income'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="e.g., Paycheck, Business income"
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Expected Amount"
                            type="number"
                            step="0.01"
                            value={formData.expectedAmount}
                            onChange={(e) => setFormData({ ...formData, expectedAmount: e.target.value })}
                            placeholder="0.00"
                        />
                        <Input
                            label="Actual Amount"
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="0.00"
                            required
                        />
                    </div>

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
                            options={incomeCategories.map((c: Category) => ({ value: c.id, label: c.name }))}
                            placeholder="Select category"
                            required
                        />
                    </div>

                    <Select
                        label="Deposit to Account"
                        value={formData.accountId}
                        onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                        options={state.accounts.map((a: Account) => ({
                            value: a.id,
                            label: `${a.name} (${formatCurrency(a.balance, state.settings)})`
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
                            {editingIncome ? 'Update' : 'Add'} Income
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    )
}
