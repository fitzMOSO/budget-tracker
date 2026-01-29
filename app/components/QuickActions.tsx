'use client'

import React, { useState } from 'react'
import { TrendingUp, TrendingDown, ArrowLeftRight, Plus } from 'lucide-react'
import { Modal, Input, Select, Button } from './ui'
import { useBudget } from '../context/BudgetContext'
import { formatCurrency, getTodayISO } from '../utils'
import { showSuccess, showError } from '../utils/swal'

export function QuickActions() {
    const { state, transferFunds, addIncome, addExpense } = useBudget()

    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
    const [isQuickIncomeModalOpen, setIsQuickIncomeModalOpen] = useState(false)
    const [isQuickExpenseModalOpen, setIsQuickExpenseModalOpen] = useState(false)

    // Transfer form state
    const [transferData, setTransferData] = useState({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        notes: '',
    })

    // Quick Income form state
    const [quickIncomeData, setQuickIncomeData] = useState({
        description: '',
        amount: '',
        accountId: '',
        categoryId: '',
        date: getTodayISO(),
    })

    // Quick Expense form state
    const [quickExpenseData, setQuickExpenseData] = useState({
        description: '',
        amount: '',
        accountId: '',
        categoryId: '',
        expenseType: 'essential' as 'essential' | 'non-essential' | 'savings',
        date: getTodayISO(),
    })

    // Transfer functions
    const handleOpenTransferModal = () => {
        const defaultAccount = state.accounts.find(a => a.isDefault) || state.accounts[0]
        setTransferData({
            fromAccountId: defaultAccount?.id || '',
            toAccountId: state.accounts.find(a => a.id !== defaultAccount?.id)?.id || '',
            amount: '',
            notes: '',
        })
        setIsTransferModalOpen(true)
        setIsMenuOpen(false)
    }

    const handleCloseTransferModal = () => {
        setIsTransferModalOpen(false)
        setTransferData({ fromAccountId: '', toAccountId: '', amount: '', notes: '' })
    }

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!transferData.fromAccountId || !transferData.toAccountId) {
            showError('Please select both accounts')
            return
        }

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
        handleCloseTransferModal()
    }

    // Quick Income functions
    const handleOpenQuickIncomeModal = () => {
        const defaultAccount = state.accounts.find(a => a.isDefault)?.id || state.accounts[0]?.id || ''
        const defaultCategory = state.categories.find(c => c.type === 'income')?.id || ''
        setQuickIncomeData({
            description: '',
            amount: '',
            accountId: defaultAccount,
            categoryId: defaultCategory,
            date: getTodayISO(),
        })
        setIsQuickIncomeModalOpen(true)
        setIsMenuOpen(false)
    }

    const handleCloseQuickIncomeModal = () => {
        setIsQuickIncomeModalOpen(false)
        setQuickIncomeData({ description: '', amount: '', accountId: '', categoryId: '', date: getTodayISO() })
    }

    const handleQuickIncomeSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const amount = parseFloat(quickIncomeData.amount)
        if (amount <= 0) {
            showError('Amount must be greater than 0')
            return
        }

        if (!quickIncomeData.categoryId) {
            showError('Please select a category')
            return
        }

        addIncome({
            description: quickIncomeData.description,
            amount: amount,
            date: quickIncomeData.date,
            categoryId: quickIncomeData.categoryId,
            accountId: quickIncomeData.accountId,
        })
        showSuccess('Income added successfully!')
        handleCloseQuickIncomeModal()
    }

    // Quick Expense functions
    const handleOpenQuickExpenseModal = () => {
        const defaultAccount = state.accounts.find(a => a.isDefault)?.id || state.accounts[0]?.id || ''
        const defaultCategory = state.categories.find(c => c.type === 'expense')?.id || ''
        setQuickExpenseData({
            description: '',
            amount: '',
            accountId: defaultAccount,
            categoryId: defaultCategory,
            expenseType: 'essential',
            date: getTodayISO(),
        })
        setIsQuickExpenseModalOpen(true)
        setIsMenuOpen(false)
    }

    const handleCloseQuickExpenseModal = () => {
        setIsQuickExpenseModalOpen(false)
        setQuickExpenseData({ description: '', amount: '', accountId: '', categoryId: '', expenseType: 'essential', date: getTodayISO() })
    }

    const handleQuickExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const amount = parseFloat(quickExpenseData.amount)
        if (amount <= 0) {
            showError('Amount must be greater than 0')
            return
        }

        if (!quickExpenseData.categoryId) {
            showError('Please select a category')
            return
        }

        addExpense({
            description: quickExpenseData.description,
            amount: amount,
            date: quickExpenseData.date,
            categoryId: quickExpenseData.categoryId,
            accountId: quickExpenseData.accountId,
            expenseType: quickExpenseData.expenseType,
        })
        showSuccess('Expense added successfully!')
        handleCloseQuickExpenseModal()
    }

    // Don't render if no accounts exist
    if (state.accounts.length === 0) {
        return null
    }

    return (
        <>
            {/* Quick Action Button with Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Quick Add"
                    title="Quick Add"
                    className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsMenuOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                            <button
                                onClick={handleOpenQuickIncomeModal}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-md hover:bg-green-50 text-gray-700 hover:text-green-700 transition-colors"
                            >
                                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-green-100 text-green-700">
                                    <TrendingUp className="w-4 h-4" />
                                </span>
                                <span>Add Income</span>
                            </button>
                            <button
                                onClick={handleOpenQuickExpenseModal}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-md hover:bg-red-50 text-gray-700 hover:text-red-700 transition-colors"
                            >
                                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-700">
                                    <TrendingDown className="w-4 h-4" />
                                </span>
                                <span>Add Expense</span>
                            </button>
                            <div className="my-1" />
                            <button
                                onClick={handleOpenTransferModal}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-md hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors"
                            >
                                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700">
                                    <ArrowLeftRight className="w-4 h-4" />
                                </span>
                                <span>Transfer Funds</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Transfer Modal */}
            <Modal
                isOpen={isTransferModalOpen}
                onClose={handleCloseTransferModal}
                title="Transfer Between Accounts"
            >
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

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleCloseTransferModal}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            <ArrowLeftRight className="w-4 h-4 mr-2" />
                            Transfer
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Quick Income Modal */}
            <Modal
                isOpen={isQuickIncomeModalOpen}
                onClose={handleCloseQuickIncomeModal}
                title="Quick Add Income"
            >
                <form onSubmit={handleQuickIncomeSubmit} className="space-y-4">
                    <Input
                        label="Description"
                        value={quickIncomeData.description}
                        onChange={(e) => setQuickIncomeData({ ...quickIncomeData, description: e.target.value })}
                        placeholder="e.g., Salary, Bonus, Freelance"
                        required
                    />

                    <Input
                        label="Amount"
                        type="number"
                        step="0.01"
                        value={quickIncomeData.amount}
                        onChange={(e) => setQuickIncomeData({ ...quickIncomeData, amount: e.target.value })}
                        placeholder="0.00"
                        required
                    />

                    <Select
                        label="Category"
                        value={quickIncomeData.categoryId}
                        onChange={(e) => setQuickIncomeData({ ...quickIncomeData, categoryId: e.target.value })}
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
                        value={quickIncomeData.accountId}
                        onChange={(e) => setQuickIncomeData({ ...quickIncomeData, accountId: e.target.value })}
                        options={state.accounts.map((a) => ({
                            value: a.id,
                            label: `${a.name} (${formatCurrency(a.balance, state.settings)})`,
                        }))}
                        required
                    />

                    <Input
                        label="Date"
                        type="date"
                        value={quickIncomeData.date}
                        onChange={(e) => setQuickIncomeData({ ...quickIncomeData, date: e.target.value })}
                        required
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleCloseQuickIncomeModal}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Add Income
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Quick Expense Modal */}
            <Modal
                isOpen={isQuickExpenseModalOpen}
                onClose={handleCloseQuickExpenseModal}
                title="Quick Add Expense"
            >
                <form onSubmit={handleQuickExpenseSubmit} className="space-y-4">
                    <Input
                        label="Description"
                        value={quickExpenseData.description}
                        onChange={(e) => setQuickExpenseData({ ...quickExpenseData, description: e.target.value })}
                        placeholder="e.g., Groceries, Transport, Food"
                        required
                    />

                    <Input
                        label="Amount"
                        type="number"
                        step="0.01"
                        value={quickExpenseData.amount}
                        onChange={(e) => setQuickExpenseData({ ...quickExpenseData, amount: e.target.value })}
                        placeholder="0.00"
                        required
                    />

                    <Select
                        label="Category"
                        value={quickExpenseData.categoryId}
                        onChange={(e) => setQuickExpenseData({ ...quickExpenseData, categoryId: e.target.value })}
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
                        value={quickExpenseData.accountId}
                        onChange={(e) => setQuickExpenseData({ ...quickExpenseData, accountId: e.target.value })}
                        options={state.accounts.map((a) => ({
                            value: a.id,
                            label: `${a.name} (${formatCurrency(a.balance, state.settings)})`,
                        }))}
                        required
                    />

                    <Select
                        label="Expense Type"
                        value={quickExpenseData.expenseType}
                        onChange={(e) => setQuickExpenseData({ ...quickExpenseData, expenseType: e.target.value as 'essential' | 'non-essential' | 'savings' })}
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
                        value={quickExpenseData.date}
                        onChange={(e) => setQuickExpenseData({ ...quickExpenseData, date: e.target.value })}
                        required
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleCloseQuickExpenseModal}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-red-600 hover:bg-red-700">
                            <TrendingDown className="w-4 h-4 mr-2" />
                            Add Expense
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    )
}
