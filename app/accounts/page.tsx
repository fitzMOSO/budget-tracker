'use client'

import React, { useState } from 'react'
import { Plus, Wallet, Building2, Smartphone, MoreHorizontal, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
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
} from '../components/ui'
import { useBudget } from '../context/BudgetContext'
import { formatCurrency, getMonthYear } from '../utils'
import { showSuccess, showDeleteConfirm, showError } from '../utils/swal'
import type { Account } from '../types'

const ACCOUNT_TYPES = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank Account' },
    { value: 'e-wallet', label: 'E-Wallet' },
    { value: 'other', label: 'Other' },
]

const ACCOUNT_COLORS = [
    { value: '#22c55e', label: 'Green' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#ef4444', label: 'Red' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#6366f1', label: 'Indigo' },
]

const getAccountIcon = (type: Account['type']) => {
    switch (type) {
        case 'cash':
            return <Wallet className="w-5 h-5" />
        case 'bank':
            return <Building2 className="w-5 h-5" />
        case 'e-wallet':
            return <Smartphone className="w-5 h-5" />
        default:
            return <MoreHorizontal className="w-5 h-5" />
    }
}

export default function AccountsPage() {
    const { state, addAccount, updateAccount, deleteAccount, isLoading } = useBudget()
    const { month: currentMonth, year: currentYear } = getMonthYear()
    const [selectedMonth, setSelectedMonth] = useState(currentMonth)
    const [selectedYear, setSelectedYear] = useState(currentYear)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<Account | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        type: 'bank' as Account['type'],
        balance: '',
        color: '#3b82f6',
        isDefault: false,
    })

    const handleMonthChange = (month: number, year: number) => {
        setSelectedMonth(month)
        setSelectedYear(year)
    }

    // Calculate totals
    const totalBalance = state.accounts.reduce((sum, a) => sum + a.balance, 0)
    const totalCash = state.accounts.filter(a => a.type === 'cash').reduce((sum, a) => sum + a.balance, 0)
    const totalBank = state.accounts.filter(a => a.type === 'bank').reduce((sum, a) => sum + a.balance, 0)
    const totalEWallet = state.accounts.filter(a => a.type === 'e-wallet').reduce((sum, a) => sum + a.balance, 0)

    const resetForm = () => {
        setFormData({
            name: '',
            type: 'bank',
            balance: '',
            color: '#3b82f6',
            isDefault: false,
        })
        setEditingAccount(null)
    }

    const handleOpenModal = (account?: Account) => {
        if (account) {
            setEditingAccount(account)
            setFormData({
                name: account.name,
                type: account.type,
                balance: account.balance.toString(),
                color: account.color || '#3b82f6',
                isDefault: account.isDefault || false,
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

        const accountData = {
            name: formData.name,
            type: formData.type,
            balance: parseFloat(formData.balance) || 0,
            color: formData.color,
            isDefault: formData.isDefault,
        }

        if (editingAccount) {
            updateAccount({ ...accountData, id: editingAccount.id })
            showSuccess('Account updated successfully!')
        } else {
            addAccount(accountData)
            showSuccess('Account added successfully!')
        }

        handleCloseModal()
    }

    const handleDelete = async (account: Account) => {
        // Check if account is used in any transactions
        const incomeUsingAccount = state.incomes.filter(i => i.accountId === account.id).length
        const expenseUsingAccount = state.expenses.filter(e => e.accountId === account.id).length
        const billsUsingAccount = state.bills.filter(b => b.paidFromAccountId === account.id).length
        const contributionsUsingAccount = state.savingsContributions.filter(c => c.fromAccountId === account.id).length

        const totalUsage = incomeUsingAccount + expenseUsingAccount + billsUsingAccount + contributionsUsingAccount

        if (totalUsage > 0) {
            showError(`Cannot delete this account. It is used in ${totalUsage} transaction(s).`)
            return
        }

        const confirmed = await showDeleteConfirm(account.name)
        if (confirmed) {
            deleteAccount(account.id)
            showSuccess('Account deleted successfully!')
        }
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

    return (
        <AppLayout
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={handleMonthChange}
        >
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-blue-800">Total Balance</p>
                            <p className="text-2xl font-bold text-blue-700">
                                {formatCurrency(totalBalance, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-green-600" />
                                <p className="text-sm font-medium text-green-800">Cash</p>
                            </div>
                            <p className="text-2xl font-bold text-green-700">
                                {formatCurrency(totalCash, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-purple-200 bg-purple-50">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-purple-600" />
                                <p className="text-sm font-medium text-purple-800">Bank</p>
                            </div>
                            <p className="text-2xl font-bold text-purple-700">
                                {formatCurrency(totalBank, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-amber-600" />
                                <p className="text-sm font-medium text-amber-800">E-Wallets</p>
                            </div>
                            <p className="text-2xl font-bold text-amber-700">
                                {formatCurrency(totalEWallet, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Accounts List */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Wallet className="w-5 h-5" />
                                Accounts
                            </CardTitle>
                            <Button onClick={() => handleOpenModal()}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Account
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {state.accounts.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                No accounts yet. Add your first account to start tracking!
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {state.accounts.map((account) => (
                                    <div
                                        key={account.id}
                                        className="p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-colors relative"
                                    >
                                        {account.isDefault && (
                                            <span className="absolute top-2 right-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                Default
                                            </span>
                                        )}
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="p-3 rounded-lg text-white"
                                                style={{ backgroundColor: account.color || '#3b82f6' }}
                                            >
                                                {getAccountIcon(account.type)}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900">{account.name}</h3>
                                                <p className="text-sm text-gray-500 capitalize">{account.type.replace('-', ' ')}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <p className="text-sm text-gray-500">Balance</p>
                                            <p className={`text-2xl font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(account.balance, state.settings)}
                                            </p>
                                        </div>

                                        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => handleOpenModal(account)}
                                            >
                                                <Pencil className="w-3 h-3 mr-1" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(account)}
                                            >
                                                <Trash2 className="w-3 h-3 mr-1" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Account Activity Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {state.accounts.map((account) => {
                                const incomeCount = state.incomes.filter(i => i.accountId === account.id).length
                                const expenseCount = state.expenses.filter(e => e.accountId === account.id).length
                                const incomeTotal = state.incomes.filter(i => i.accountId === account.id).reduce((sum, i) => sum + i.amount, 0)
                                const expenseTotal = state.expenses.filter(e => e.accountId === account.id).reduce((sum, e) => sum + e.amount, 0)

                                return (
                                    <div key={account.id} className="p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div
                                                className="p-2 rounded-lg text-white"
                                                style={{ backgroundColor: account.color || '#3b82f6' }}
                                            >
                                                {getAccountIcon(account.type)}
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-900">{account.name}</h4>
                                                <p className="text-xs text-gray-500">{incomeCount + expenseCount} transactions</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-2">
                                                <ArrowUpCircle className="w-4 h-4 text-green-500" />
                                                <div>
                                                    <p className="text-xs text-gray-500">Money In</p>
                                                    <p className="font-medium text-green-600">
                                                        {formatCurrency(incomeTotal, state.settings)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <ArrowDownCircle className="w-4 h-4 text-red-500" />
                                                <div>
                                                    <p className="text-xs text-gray-500">Money Out</p>
                                                    <p className="font-medium text-red-600">
                                                        {formatCurrency(expenseTotal, state.settings)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingAccount ? 'Edit Account' : 'Add Account'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Account Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., BDO Savings, GCash, Cash on Hand"
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Account Type"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as Account['type'] })}
                            options={ACCOUNT_TYPES}
                            required
                        />
                        <Input
                            label="Initial Balance"
                            type="number"
                            step="0.01"
                            value={formData.balance}
                            onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>

                    <Select
                        label="Color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        options={ACCOUNT_COLORS}
                    />

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isDefault"
                            checked={formData.isDefault}
                            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="isDefault" className="text-sm text-gray-700">
                            Set as default account
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingAccount ? 'Update' : 'Add'} Account
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    )
}
