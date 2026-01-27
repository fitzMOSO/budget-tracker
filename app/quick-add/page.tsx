'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, ArrowLeftRight, Home } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Input, Select, Button } from '../components/ui'
import { useBudget } from '../context/BudgetContext'
import { formatCurrency, getTodayISO } from '../utils'
import { showSuccess, showError } from '../utils/swal'

function QuickAddContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { state, transferFunds, addIncome, addExpense, isLoading } = useBudget()

    const type = searchParams.get('type') || 'expense'

    // Income form state
    const [incomeData, setIncomeData] = useState({
        description: '',
        amount: '',
        accountId: '',
        categoryId: '',
        date: getTodayISO(),
    })

    // Expense form state
    const [expenseData, setExpenseData] = useState({
        description: '',
        amount: '',
        accountId: '',
        categoryId: '',
        expenseType: 'essential' as 'essential' | 'non-essential' | 'savings',
        date: getTodayISO(),
    })

    // Transfer form state
    const [transferData, setTransferData] = useState({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        notes: '',
    })

    // Initialize form data when state loads
    useEffect(() => {
        if (!isLoading && state.accounts.length > 0) {
            const defaultAccount = state.accounts.find(a => a.isDefault)?.id || state.accounts[0]?.id || ''
            const defaultIncomeCategory = state.categories.find(c => c.type === 'income')?.id || ''
            const defaultExpenseCategory = state.categories.find(c => c.type === 'expense')?.id || ''

            setIncomeData(prev => ({
                ...prev,
                accountId: defaultAccount,
                categoryId: defaultIncomeCategory,
            }))

            setExpenseData(prev => ({
                ...prev,
                accountId: defaultAccount,
                categoryId: defaultExpenseCategory,
            }))

            setTransferData(prev => ({
                ...prev,
                fromAccountId: defaultAccount,
                toAccountId: state.accounts.find(a => a.id !== defaultAccount)?.id || '',
            }))
        }
    }, [isLoading, state.accounts, state.categories])

    const handleIncomeSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const amount = parseFloat(incomeData.amount)
        if (amount <= 0) {
            showError('Amount must be greater than 0')
            return
        }

        if (!incomeData.categoryId) {
            showError('Please select a category')
            return
        }

        addIncome({
            description: incomeData.description,
            amount: amount,
            date: incomeData.date,
            categoryId: incomeData.categoryId,
            accountId: incomeData.accountId,
        })
        showSuccess('Income added successfully!')
        router.push('/')
    }

    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const amount = parseFloat(expenseData.amount)
        if (amount <= 0) {
            showError('Amount must be greater than 0')
            return
        }

        if (!expenseData.categoryId) {
            showError('Please select a category')
            return
        }

        addExpense({
            description: expenseData.description,
            amount: amount,
            date: expenseData.date,
            categoryId: expenseData.categoryId,
            accountId: expenseData.accountId,
            expenseType: expenseData.expenseType,
        })
        showSuccess('Expense added successfully!')
        router.push('/')
    }

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (transferData.fromAccountId === transferData.toAccountId) {
            showError('Cannot transfer to the same account!')
            return
        }

        const amount = parseFloat(transferData.amount)
        if (amount <= 0) {
            showError('Amount must be greater than 0')
            return
        }

        const fromAccount = state.accounts.find(a => a.id === transferData.fromAccountId)
        if (fromAccount && fromAccount.balance < amount) {
            showError('Insufficient balance in source account')
            return
        }

        transferFunds(transferData.fromAccountId, transferData.toAccountId, amount)
        showSuccess('Transfer completed successfully!')
        router.push('/')
    }

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

    if (state.accounts.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="text-center py-8">
                        <p className="text-gray-600 mb-4">Please add an account first before using Quick Add.</p>
                        <Button onClick={() => router.push('/accounts')}>
                            Go to Accounts
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-md mx-auto pt-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Quick Add</h1>
                    <Button variant="outline" size="sm" onClick={() => router.push('/')}>
                        <Home className="w-4 h-4 mr-1" />
                        Home
                    </Button>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => router.push('/quick-add?type=expense')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${type === 'expense'
                                ? 'bg-red-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-red-50'
                            }`}
                    >
                        <TrendingDown className="w-4 h-4" />
                        Expense
                    </button>
                    <button
                        onClick={() => router.push('/quick-add?type=income')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${type === 'income'
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-green-50'
                            }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Income
                    </button>
                    <button
                        onClick={() => router.push('/quick-add?type=transfer')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${type === 'transfer'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-blue-50'
                            }`}
                    >
                        <ArrowLeftRight className="w-4 h-4" />
                        Transfer
                    </button>
                </div>

                {/* Expense Form */}
                {type === 'expense' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-600">
                                <TrendingDown className="w-5 h-5" />
                                Add Expense
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleExpenseSubmit} className="space-y-4">
                                <Input
                                    label="Description"
                                    value={expenseData.description}
                                    onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                                    placeholder="e.g., Groceries, Transport, Food"
                                    required
                                />

                                <Input
                                    label="Amount"
                                    type="number"
                                    step="0.01"
                                    value={expenseData.amount}
                                    onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                                    placeholder="0.00"
                                    required
                                />

                                <Select
                                    label="Category"
                                    value={expenseData.categoryId}
                                    onChange={(e) => setExpenseData({ ...expenseData, categoryId: e.target.value })}
                                    options={state.categories
                                        .filter((c) => c.type === 'expense')
                                        .map((c) => ({
                                            value: c.id,
                                            label: c.name,
                                        }))}
                                    required
                                />

                                <Select
                                    label="Pay from Account"
                                    value={expenseData.accountId}
                                    onChange={(e) => setExpenseData({ ...expenseData, accountId: e.target.value })}
                                    options={state.accounts.map((a) => ({
                                        value: a.id,
                                        label: `${a.name} (${formatCurrency(a.balance, state.settings)})`,
                                    }))}
                                    required
                                />

                                <Select
                                    label="Expense Type"
                                    value={expenseData.expenseType}
                                    onChange={(e) => setExpenseData({ ...expenseData, expenseType: e.target.value as 'essential' | 'non-essential' | 'savings' })}
                                    options={[
                                        { value: 'essential', label: 'Essential (50%)' },
                                        { value: 'non-essential', label: 'Non-Essential (30%)' },
                                        { value: 'savings', label: 'Savings (20%)' },
                                    ]}
                                    required
                                />

                                <Input
                                    label="Date"
                                    type="date"
                                    value={expenseData.date}
                                    onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })}
                                    required
                                />

                                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
                                    <TrendingDown className="w-4 h-4 mr-2" />
                                    Add Expense
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Income Form */}
                {type === 'income' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-600">
                                <TrendingUp className="w-5 h-5" />
                                Add Income
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleIncomeSubmit} className="space-y-4">
                                <Input
                                    label="Description"
                                    value={incomeData.description}
                                    onChange={(e) => setIncomeData({ ...incomeData, description: e.target.value })}
                                    placeholder="e.g., Salary, Bonus, Freelance"
                                    required
                                />

                                <Input
                                    label="Amount"
                                    type="number"
                                    step="0.01"
                                    value={incomeData.amount}
                                    onChange={(e) => setIncomeData({ ...incomeData, amount: e.target.value })}
                                    placeholder="0.00"
                                    required
                                />

                                <Select
                                    label="Category"
                                    value={incomeData.categoryId}
                                    onChange={(e) => setIncomeData({ ...incomeData, categoryId: e.target.value })}
                                    options={state.categories
                                        .filter((c) => c.type === 'income')
                                        .map((c) => ({
                                            value: c.id,
                                            label: c.name,
                                        }))}
                                    required
                                />

                                <Select
                                    label="Deposit to Account"
                                    value={incomeData.accountId}
                                    onChange={(e) => setIncomeData({ ...incomeData, accountId: e.target.value })}
                                    options={state.accounts.map((a) => ({
                                        value: a.id,
                                        label: `${a.name} (${formatCurrency(a.balance, state.settings)})`,
                                    }))}
                                    required
                                />

                                <Input
                                    label="Date"
                                    type="date"
                                    value={incomeData.date}
                                    onChange={(e) => setIncomeData({ ...incomeData, date: e.target.value })}
                                    required
                                />

                                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    Add Income
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Transfer Form */}
                {type === 'transfer' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-600">
                                <ArrowLeftRight className="w-5 h-5" />
                                Transfer Funds
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleTransferSubmit} className="space-y-4">
                                <Select
                                    label="From Account"
                                    value={transferData.fromAccountId}
                                    onChange={(e) => setTransferData({ ...transferData, fromAccountId: e.target.value })}
                                    options={state.accounts.map((a) => ({
                                        value: a.id,
                                        label: `${a.name} (${formatCurrency(a.balance, state.settings)})`,
                                    }))}
                                    required
                                />

                                <Select
                                    label="To Account"
                                    value={transferData.toAccountId}
                                    onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                                    options={state.accounts
                                        .filter((a) => a.id !== transferData.fromAccountId)
                                        .map((a) => ({
                                            value: a.id,
                                            label: `${a.name} (${formatCurrency(a.balance, state.settings)})`,
                                        }))}
                                    required
                                />

                                <Input
                                    label="Amount"
                                    type="number"
                                    step="0.01"
                                    value={transferData.amount}
                                    onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                                    placeholder="0.00"
                                    required
                                />

                                <Input
                                    label="Notes (optional)"
                                    value={transferData.notes}
                                    onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                                    placeholder="e.g., Moved savings to bank"
                                />

                                <Button type="submit" className="w-full">
                                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                                    Transfer
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

export default function QuickAddPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <QuickAddContent />
        </Suspense>
    )
}
