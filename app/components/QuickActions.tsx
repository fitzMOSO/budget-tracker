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
        date: getTodayISO(),
    })

    // Quick Expense form state
    const [quickExpenseData, setQuickExpenseData] = useState({
        description: '',
        amount: '',
        accountId: '',
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
        setQuickIncomeData({
            description: '',
            amount: '',
            accountId: defaultAccount,
            date: getTodayISO(),
        })
        setIsQuickIncomeModalOpen(true)
        setIsMenuOpen(false)
    }

    const handleCloseQuickIncomeModal = () => {
        setIsQuickIncomeModalOpen(false)
        setQuickIncomeData({ description: '', amount: '', accountId: '', date: getTodayISO() })
    }

    const handleQuickIncomeSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const amount = parseFloat(quickIncomeData.amount)
        if (amount <= 0) {
            showError('Amount must be greater than 0')
            return
        }

        const defaultCategory = state.categories.find(c => c.type === 'income')
        if (!defaultCategory) {
            showError('No income category found. Please add an income category first.')
            return
        }

        addIncome({
            description: quickIncomeData.description,
            amount: amount,
            date: quickIncomeData.date,
            categoryId: defaultCategory.id,
            accountId: quickIncomeData.accountId,
        })
        showSuccess('Income added successfully!')
        handleCloseQuickIncomeModal()
    }

    // Quick Expense functions
    const handleOpenQuickExpenseModal = () => {
        const defaultAccount = state.accounts.find(a => a.isDefault)?.id || state.accounts[0]?.id || ''
        setQuickExpenseData({
            description: '',
            amount: '',
            accountId: defaultAccount,
            date: getTodayISO(),
        })
        setIsQuickExpenseModalOpen(true)
        setIsMenuOpen(false)
    }

    const handleCloseQuickExpenseModal = () => {
        setIsQuickExpenseModalOpen(false)
        setQuickExpenseData({ description: '', amount: '', accountId: '', date: getTodayISO() })
    }

    const handleQuickExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const amount = parseFloat(quickExpenseData.amount)
        if (amount <= 0) {
            showError('Amount must be greater than 0')
            return
        }

        const defaultCategory = state.categories.find(c => c.type === 'expense')
        if (!defaultCategory) {
            showError('No expense category found. Please add an expense category first.')
            return
        }

        addExpense({
            description: quickExpenseData.description,
            amount: amount,
            date: quickExpenseData.date,
            categoryId: defaultCategory.id,
            accountId: quickExpenseData.accountId,
            expenseType: 'essential',
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
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Quick Add</span>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsMenuOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                            <button
                                onClick={handleOpenQuickIncomeModal}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-green-50 text-gray-700 hover:text-green-700 transition-colors"
                            >
                                <TrendingUp className="w-4 h-4 text-green-600" />
                                <span>Add Income</span>
                            </button>
                            <button
                                onClick={handleOpenQuickExpenseModal}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-red-50 text-gray-700 hover:text-red-700 transition-colors"
                            >
                                <TrendingDown className="w-4 h-4 text-red-600" />
                                <span>Add Expense</span>
                            </button>
                            <hr className="my-1" />
                            <button
                                onClick={handleOpenTransferModal}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors"
                            >
                                <ArrowLeftRight className="w-4 h-4 text-blue-600" />
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
                        label="Pay from Account"
                        value={quickExpenseData.accountId}
                        onChange={(e) => setQuickExpenseData({ ...quickExpenseData, accountId: e.target.value })}
                        options={state.accounts.map((a) => ({
                            value: a.id,
                            label: `${a.name} (${formatCurrency(a.balance, state.settings)})`,
                        }))}
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
