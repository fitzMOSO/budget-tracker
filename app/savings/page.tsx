'use client'

import React, { useState, useMemo } from 'react'
import { Plus, Target, TrendingUp, Wallet } from 'lucide-react'
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
    ProgressBar,
    DataTable,
} from '../components/ui'
import { useBudget } from '../context/BudgetContext'
import {
    filterByMonth,
    formatCurrency,
    formatDate,
    getMonthYear,
    getTodayISO,
    getProgressPercentage,
} from '../utils'
import { totalGoalProgress } from '../utils/balances'
import { showSuccess, showDeleteConfirm } from '../utils/swal'
import type { SavingsGoal, SavingsContribution } from '../types'

const GOAL_COLORS = [
    { value: 'bg-blue-600', label: 'Blue' },
    { value: 'bg-green-600', label: 'Green' },
    { value: 'bg-purple-600', label: 'Purple' },
    { value: 'bg-amber-600', label: 'Gold' },
    { value: 'bg-rose-600', label: 'Rose' },
    { value: 'bg-cyan-600', label: 'Cyan' },
    { value: 'bg-orange-600', label: 'Orange' },
    { value: 'bg-indigo-600', label: 'Indigo' },
]

export default function SavingsPage() {
    const {
        state,
        balanceOf,
        progressOfGoal,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        addSavingsContribution,
        deleteSavingsContribution,
        isLoading,
    } = useBudget()
    const { month: currentMonth, year: currentYear } = getMonthYear()
    const [selectedMonth, setSelectedMonth] = useState(currentMonth)
    const [selectedYear, setSelectedYear] = useState(currentYear)
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
    const [isContribModalOpen, setIsContribModalOpen] = useState(false)
    const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)

    // Goal form state
    const [goalFormData, setGoalFormData] = useState({
        name: '',
        targetAmount: '',
        deadline: '',
        color: 'bg-blue-600',
        linkedAccountId: '',
    })

    // Contribution form state
    const [contribFormData, setContribFormData] = useState({
        savingsGoalId: '',
        amount: '',
        date: getTodayISO(),
        fromAccountId: '',
        notes: '',
    })

    const handleMonthChange = (month: number, year: number) => {
        setSelectedMonth(month)
        setSelectedYear(year)
    }

    // Filter contributions by selected month
    const monthlyContributions = useMemo(
        () => filterByMonth(state.savingsContributions, selectedMonth, selectedYear),
        [state.savingsContributions, selectedMonth, selectedYear]
    )

    // Calculate totals
    // NOT `Σ progressOfGoal(g)`: two goals linked to the same account would each
    // count that account's whole balance. See utils/balances#totalGoalProgress.
    const totalSaved = totalGoalProgress(state)
    const totalTarget = state.savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0)
    const monthlyTotal = monthlyContributions.reduce((sum, c) => sum + c.amount, 0)

    // Goal Modal Functions
    const resetGoalForm = () => {
        setGoalFormData({
            name: '',
            targetAmount: '',
            deadline: '',
            color: 'bg-blue-600',
            linkedAccountId: '',
        })
        setEditingGoal(null)
    }

    const handleOpenGoalModal = (goal?: SavingsGoal) => {
        if (goal) {
            setEditingGoal(goal)
            setGoalFormData({
                name: goal.name,
                targetAmount: goal.targetAmount.toString(),
                deadline: goal.deadline || '',
                color: goal.color || 'bg-blue-600',
                linkedAccountId: goal.linkedAccountId || '',
            })
        } else {
            resetGoalForm()
        }
        setIsGoalModalOpen(true)
    }

    const handleCloseGoalModal = () => {
        setIsGoalModalOpen(false)
        resetGoalForm()
    }

    const handleSubmitGoal = (e: React.FormEvent) => {
        e.preventDefault()

        const goalData = {
            name: goalFormData.name,
            targetAmount: parseFloat(goalFormData.targetAmount),
            deadline: goalFormData.deadline || undefined,
            color: goalFormData.color,
            // Progress is derived, not stored. This field is a migration remnant
            // nothing reads; writing a snapshot of the balance here is what let
            // editing a goal silently restate its history.
            currentAmount: 0,
            linkedAccountId: goalFormData.linkedAccountId || undefined,
        }

        if (editingGoal) {
            updateSavingsGoal({ ...goalData, id: editingGoal.id })
            showSuccess('Savings goal updated!')
        } else {
            addSavingsGoal(goalData)
            showSuccess('Savings goal created!')
        }

        handleCloseGoalModal()
    }

    const handleDeleteGoal = async (goal: SavingsGoal) => {
        const confirmed = await showDeleteConfirm(goal.name, 'This will also delete all contributions to this goal.')
        if (confirmed) {
            deleteSavingsGoal(goal.id)
            showSuccess('Savings goal deleted!')
        }
    }

    // Contribution Modal Functions
    const resetContribForm = () => {
        const defaultAccount = state.accounts.find(a => a.isDefault) || state.accounts[0]
        setContribFormData({
            savingsGoalId: state.savingsGoals[0]?.id || '',
            amount: '',
            date: getTodayISO(),
            fromAccountId: defaultAccount?.id || '',
            notes: '',
        })
    }

    const handleOpenContribModal = (goalId?: string) => {
        const defaultAccount = state.accounts.find(a => a.isDefault) || state.accounts[0]
        setContribFormData({
            savingsGoalId: goalId || state.savingsGoals[0]?.id || '',
            amount: '',
            date: getTodayISO(),
            fromAccountId: defaultAccount?.id || '',
            notes: '',
        })
        setIsContribModalOpen(true)
    }

    const handleCloseContribModal = () => {
        setIsContribModalOpen(false)
        resetContribForm()
    }

    const handleSubmitContrib = (e: React.FormEvent) => {
        e.preventDefault()

        addSavingsContribution({
            savingsGoalId: contribFormData.savingsGoalId,
            amount: parseFloat(contribFormData.amount),
            date: contribFormData.date,
            fromAccountId: contribFormData.fromAccountId,
            notes: contribFormData.notes || undefined,
        })

        showSuccess('Contribution added!')
        handleCloseContribModal()
    }

    const handleDeleteContribution = async (contrib: SavingsContribution) => {
        const confirmed = await showDeleteConfirm('this contribution')
        if (confirmed) {
            deleteSavingsContribution(contrib.id)
            showSuccess('Contribution deleted!')
        }
    }

    const getGoalName = (goalId: string) => {
        const goal = state.savingsGoals.find((g) => g.id === goalId)
        return goal?.name || 'Unknown'
    }

    const getAccountName = (accountId?: string) => {
        if (!accountId) return '-'
        const account = state.accounts.find(a => a.id === accountId)
        return account?.name || '-'
    }

    const contributionColumns = [
        {
            key: 'date',
            header: 'Date',
            render: (c: SavingsContribution) => formatDate(c.date),
        },
        {
            key: 'savingsGoalId',
            header: 'Goal',
            render: (c: SavingsContribution) => getGoalName(c.savingsGoalId),
        },
        {
            key: 'fromAccountId',
            header: 'From Account',
            render: (c: SavingsContribution) => (
                <div className="flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-gray-400" />
                    <span>{getAccountName(c.fromAccountId)}</span>
                </div>
            ),
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (c: SavingsContribution) => (
                <span className="font-semibold text-green-600">
                    {formatCurrency(c.amount, state.settings)}
                </span>
            ),
        },
        {
            key: 'notes',
            header: 'Notes',
            render: (c: SavingsContribution) => c.notes || '-',
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
                    <Card className="border-emerald-200 bg-emerald-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-emerald-800">Total Saved</p>
                            <p className="text-2xl font-bold text-emerald-700">
                                {formatCurrency(totalSaved, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-blue-800">Total Target</p>
                            <p className="text-2xl font-bold text-blue-700">
                                {formatCurrency(totalTarget, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-purple-200 bg-purple-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-purple-800">This Month</p>
                            <p className="text-2xl font-bold text-purple-700">
                                {formatCurrency(monthlyTotal, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-amber-800">Overall Progress</p>
                            <p className="text-2xl font-bold text-amber-700">
                                {totalTarget > 0 ? getProgressPercentage(totalSaved, totalTarget) : 0}%
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Savings Goals */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Target className="w-5 h-5" />
                                Savings Goals
                            </CardTitle>
                            <Button onClick={() => handleOpenGoalModal()}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Goal
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {state.savingsGoals.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                No savings goals yet. Create your first goal to start saving!
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {state.savingsGoals.map((goal) => {
                                    const saved = progressOfGoal(goal)
                                    const percentage = getProgressPercentage(saved, goal.targetAmount)
                                    const remaining = goal.targetAmount - saved

                                    return (
                                        <div
                                            key={goal.id}
                                            className="p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg">{goal.name}</h3>
                                                    {goal.deadline && (
                                                        <p className="text-sm text-gray-500">
                                                            Target: {formatDate(goal.deadline)}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-2xl font-bold text-gray-700">{percentage}%</span>
                                            </div>

                                            <ProgressBar
                                                value={saved}
                                                max={goal.targetAmount}
                                                color={goal.color || 'bg-blue-600'}
                                                size="lg"
                                                className="mb-3"
                                            />

                                            <div className="space-y-1 mb-4">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Saved:</span>
                                                    <span className="font-medium text-green-600">
                                                        {formatCurrency(saved, state.settings)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Target:</span>
                                                    <span className="font-medium">
                                                        {formatCurrency(goal.targetAmount, state.settings)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Remaining:</span>
                                                    <span className="font-medium text-amber-600">
                                                        {formatCurrency(Math.max(remaining, 0), state.settings)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleOpenContribModal(goal.id)}
                                                >
                                                    <TrendingUp className="w-3 h-3 mr-1" />
                                                    Add Savings
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenGoalModal(goal)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600"
                                                    onClick={() => handleDeleteGoal(goal)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Contributions Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Monthly Contributions</CardTitle>
                            {state.savingsGoals.length > 0 && (
                                <Button onClick={() => handleOpenContribModal()}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Contribution
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            data={monthlyContributions}
                            columns={contributionColumns}
                            onDelete={handleDeleteContribution}
                            emptyMessage="No contributions this month"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Add/Edit Goal Modal */}
            <Modal
                isOpen={isGoalModalOpen}
                onClose={handleCloseGoalModal}
                title={editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
            >
                <form onSubmit={handleSubmitGoal} className="space-y-4">
                    <Input
                        label="Goal Name"
                        value={goalFormData.name}
                        onChange={(e) => setGoalFormData({ ...goalFormData, name: e.target.value })}
                        placeholder="e.g., Emergency Fund, Vacation, New Car"
                        required
                    />

                    <Input
                        label="Target Amount"
                        type="number"
                        step="0.01"
                        value={goalFormData.targetAmount}
                        onChange={(e) => setGoalFormData({ ...goalFormData, targetAmount: e.target.value })}
                        placeholder="0.00"
                        required
                    />

                    <Input
                        label="Target Date (optional)"
                        type="date"
                        value={goalFormData.deadline}
                        onChange={(e) => setGoalFormData({ ...goalFormData, deadline: e.target.value })}
                    />

                    <Select
                        label="Color"
                        value={goalFormData.color}
                        onChange={(e) => setGoalFormData({ ...goalFormData, color: e.target.value })}
                        options={GOAL_COLORS}
                    />

                    <Select
                        label="Linked Savings Account (optional)"
                        value={goalFormData.linkedAccountId}
                        onChange={(e) => setGoalFormData({ ...goalFormData, linkedAccountId: e.target.value })}
                        options={state.accounts.map((a) => ({
                            value: a.id,
                            label: `${a.name} (${formatCurrency(balanceOf(a.id), state.settings)})`,
                        }))}
                        placeholder="Select account"
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleCloseGoalModal}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingGoal ? 'Update' : 'Create'} Goal
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Add Contribution Modal */}
            <Modal
                isOpen={isContribModalOpen}
                onClose={handleCloseContribModal}
                title="Add Savings Contribution"
            >
                <form onSubmit={handleSubmitContrib} className="space-y-4">
                    <Select
                        label="Savings Goal"
                        value={contribFormData.savingsGoalId}
                        onChange={(e) =>
                            setContribFormData({ ...contribFormData, savingsGoalId: e.target.value })
                        }
                        options={state.savingsGoals.map((g) => ({ value: g.id, label: g.name }))}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Amount"
                            type="number"
                            step="0.01"
                            value={contribFormData.amount}
                            onChange={(e) =>
                                setContribFormData({ ...contribFormData, amount: e.target.value })
                            }
                            placeholder="0.00"
                            required
                        />
                        <Input
                            label="Date"
                            type="date"
                            value={contribFormData.date}
                            onChange={(e) =>
                                setContribFormData({ ...contribFormData, date: e.target.value })
                            }
                            required
                        />
                    </div>

                    <Select
                        label="Deduct from Account"
                        value={contribFormData.fromAccountId}
                        onChange={(e) =>
                            setContribFormData({ ...contribFormData, fromAccountId: e.target.value })
                        }
                        options={state.accounts.map((a) => ({
                            value: a.id,
                            label: `${a.name} (${formatCurrency(balanceOf(a.id), state.settings)})`
                        }))}
                        placeholder="Select account"
                        required
                    />

                    <Input
                        label="Notes (optional)"
                        value={contribFormData.notes}
                        onChange={(e) =>
                            setContribFormData({ ...contribFormData, notes: e.target.value })
                        }
                        placeholder="Additional notes"
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleCloseContribModal}>
                            Cancel
                        </Button>
                        <Button type="submit">Add Contribution</Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    )
}
