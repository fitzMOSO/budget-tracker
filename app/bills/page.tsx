'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Plus, CheckCircle, AlertCircle, Clock } from 'lucide-react'
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
    Badge,
} from '../components/ui'
import { useBudget } from '../context/BudgetContext'
import {
    filterByMonth,
    formatCurrency,
    formatDate,
    getMonthYear,
    getTodayISO,
    isOverdue,
    groupBillsByStatus,
} from '../utils'
import { showPaymentDialog, showSuccess, showDeleteConfirm, showConfirm } from '../utils/swal'
import type { Bill, Account, Category } from '../types'

export default function BillsPage() {
    const { state, addBill, updateBill, deleteBill, payBill, unpayBill, addExpense, generateRecurringBills, isLoading } = useBudget()
    const { month: currentMonth, year: currentYear } = getMonthYear()
    const [selectedMonth, setSelectedMonth] = useState(currentMonth)
    const [selectedYear, setSelectedYear] = useState(currentYear)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingBill, setEditingBill] = useState<Bill | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        dueDate: getTodayISO(),
        isRecurring: false,
        categoryId: '',
        notes: '',
    })

    // Generate recurring bills when month changes or on initial load
    useEffect(() => {
        if (!isLoading) {
            generateRecurringBills(selectedMonth, selectedYear)
        }
    }, [selectedMonth, selectedYear, isLoading, generateRecurringBills])

    const handleMonthChange = (month: number, year: number) => {
        setSelectedMonth(month)
        setSelectedYear(year)
    }

    // Filter bills by selected month
    const monthlyBills = useMemo(
        () => filterByMonth(state.bills, selectedMonth, selectedYear),
        [state.bills, selectedMonth, selectedYear]
    )

    const { paid, pending, overdue } = groupBillsByStatus(monthlyBills)

    const totalBills = monthlyBills.reduce((sum: number, b: Bill) => sum + b.amount, 0)
    const totalPaid = paid.reduce((sum: number, b: Bill) => sum + b.amount, 0)
    const totalPending = pending.reduce((sum: number, b: Bill) => sum + b.amount, 0)
    const totalOverdue = overdue.reduce((sum: number, b: Bill) => sum + b.amount, 0)

    // Get expense categories that are marked as bills
    const billCategories = state.categories.filter((c: Category) => c.type === 'expense' && c.isBill)
    // Also include all expense categories for selection
    const expenseCategories = state.categories.filter((c: Category) => c.type === 'expense')

    const resetForm = () => {
        setFormData({
            description: '',
            amount: '',
            dueDate: getTodayISO(),
            isRecurring: false,
            categoryId: '',
            notes: '',
        })
        setEditingBill(null)
    }

    const handleOpenModal = (bill?: Bill) => {
        if (bill) {
            setEditingBill(bill)
            setFormData({
                description: bill.description,
                amount: bill.amount.toString(),
                dueDate: bill.dueDate,
                isRecurring: bill.isRecurring || false,
                categoryId: bill.categoryId || '',
                notes: bill.notes || '',
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

        const billData = {
            description: formData.description,
            amount: parseFloat(formData.amount),
            dueDate: formData.dueDate,
            isPaid: editingBill?.isPaid || false,
            isRecurring: formData.isRecurring,
            categoryId: formData.categoryId || undefined,
            notes: formData.notes || undefined,
        }

        if (editingBill) {
            updateBill({ ...billData, id: editingBill.id, paidDate: editingBill.paidDate, paidFromAccountId: editingBill.paidFromAccountId })
            showSuccess('Bill updated successfully!')
        } else {
            addBill(billData)
            showSuccess('Bill added successfully!')
        }

        handleCloseModal()
    }

    const handleDelete = async (bill: Bill) => {
        const confirmed = await showDeleteConfirm(bill.description)
        if (confirmed) {
            deleteBill(bill.id)
            showSuccess('Bill deleted successfully!')
        }
    }

    const handlePayBill = async (bill: Bill) => {
        if (bill.isPaid) {
            // Unpay the bill
            const confirmed = await showConfirm(
                'Mark as Unpaid?',
                'This will reverse the payment and add the amount back to the account.',
                'Yes, Unpay',
                'Cancel'
            )
            if (confirmed) {
                unpayBill(bill.id)
                showSuccess('Bill marked as unpaid!')
            }
        } else {
            // Pay the bill - ask which account
            const accounts = state.accounts.map((a: Account) => ({ id: a.id, name: `${a.name} (${formatCurrency(a.balance, state.settings)})` }))
            const result = await showPaymentDialog(
                `Pay ${bill.description}`,
                accounts,
                bill.amount,
                state.settings.currencySymbol
            )
            if (result) {
                payBill(bill.id, getTodayISO(), result.accountId)

                // Also create an expense entry if the bill has a category
                if (bill.categoryId) {
                    addExpense({
                        description: bill.description,
                        amount: bill.amount,
                        date: getTodayISO(),
                        categoryId: bill.categoryId,
                        accountId: result.accountId,
                        expenseType: 'essential',
                        notes: `Auto-created from bill payment`,
                    })
                }

                showSuccess('Bill paid successfully!')
            }
        }
    }

    const getCategoryName = (categoryId?: string) => {
        if (!categoryId) return null
        const category = state.categories.find((c: Category) => c.id === categoryId)
        return category?.name || null
    }

    const getCategoryColor = (categoryId?: string) => {
        if (!categoryId) return '#6b7280'
        const category = state.categories.find((c: Category) => c.id === categoryId)
        return category?.color || '#6b7280'
    }

    const handleStopRecurring = async (bill: Bill) => {
        // Find the source bill ID (either this bill if it's the original, or its recurringSourceId)
        const sourceId = bill.recurringSourceId || bill.id
        const sourceBill = state.bills.find((b: Bill) => b.id === sourceId)

        if (!sourceBill) return

        const confirmed = await showConfirm(
            'Stop Recurring?',
            'This will stop generating future bills for this recurring item. Existing bills will remain.',
            'Yes, Stop',
            'Cancel'
        )

        if (confirmed) {
            // Update the source bill to not be recurring anymore
            updateBill({ ...sourceBill, isRecurring: false })
            showSuccess('Recurring stopped! No more future bills will be generated.')
        }
    }

    // Check if a bill is from a recurring source (either original or generated)
    const isFromRecurringSource = (bill: Bill) => {
        if (bill.isRecurring) return true
        if (bill.recurringSourceId) {
            const source = state.bills.find((b: Bill) => b.id === bill.recurringSourceId)
            return source?.isRecurring || false
        }
        return false
    }

    const BillCard = ({ bill }: { bill: Bill }) => {
        const overdue = isOverdue(bill.dueDate, bill.isPaid)
        const paidFromAccount = bill.paidFromAccountId
            ? state.accounts.find((a: Account) => a.id === bill.paidFromAccountId)
            : null

        return (
            <div
                className={`p-4 rounded-lg border ${bill.isPaid
                    ? 'bg-green-50 border-green-200'
                    : overdue
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white border-gray-200'
                    }`}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            {bill.categoryId && (
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: getCategoryColor(bill.categoryId) }}
                                />
                            )}
                            <h3 className="font-medium text-gray-900">{bill.description}</h3>
                            {bill.isRecurring && (
                                <Badge variant="info" className="text-xs">
                                    Recurring
                                </Badge>
                            )}
                            {bill.recurringSourceId && (
                                <Badge variant="purple" className="text-xs">
                                    From Recurring
                                </Badge>
                            )}
                            {bill.categoryId && (
                                <span className="text-xs text-gray-500">
                                    {getCategoryName(bill.categoryId)}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            Due: {formatDate(bill.dueDate)}
                        </p>
                        {bill.isPaid && bill.paidDate && (
                            <p className="text-sm text-green-600 mt-1">
                                Paid on: {formatDate(bill.paidDate)}
                                {paidFromAccount && ` from ${paidFromAccount.name}`}
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-gray-900">
                            {formatCurrency(bill.amount, state.settings)}
                        </p>
                        {bill.isPaid ? (
                            <Badge variant="success" className="mt-1">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Paid
                            </Badge>
                        ) : overdue ? (
                            <Badge variant="danger" className="mt-1">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Overdue
                            </Badge>
                        ) : (
                            <Badge variant="warning" className="mt-1">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePayBill(bill)}
                    >
                        {bill.isPaid ? 'Mark Unpaid' : 'Pay Now'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(bill)}>
                        Edit
                    </Button>
                    {isFromRecurringSource(bill) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => handleStopRecurring(bill)}
                        >
                            Stop Recurring
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(bill)}
                    >
                        Delete
                    </Button>
                </div>
            </div>
        )
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
                    <Card className="border-gray-200">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-gray-600">Total Bills</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {formatCurrency(totalBills, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-green-800">Paid</p>
                            <p className="text-2xl font-bold text-green-700">
                                {formatCurrency(totalPaid, state.settings)}
                            </p>
                            <p className="text-xs text-green-600 mt-1">{paid.length} bills</p>
                        </CardContent>
                    </Card>
                    <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-amber-800">Pending</p>
                            <p className="text-2xl font-bold text-amber-700">
                                {formatCurrency(totalPending, state.settings)}
                            </p>
                            <p className="text-xs text-amber-600 mt-1">{pending.length} bills</p>
                        </CardContent>
                    </Card>
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-red-800">Overdue</p>
                            <p className="text-2xl font-bold text-red-700">
                                {formatCurrency(totalOverdue, state.settings)}
                            </p>
                            <p className="text-xs text-red-600 mt-1">{overdue.length} bills</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Bills Lists */}
                <div className="flex justify-end">
                    <Button onClick={() => handleOpenModal()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Bill
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Overdue Bills */}
                    <Card>
                        <CardHeader className="bg-red-50">
                            <CardTitle className="text-red-800 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                Overdue ({overdue.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            {overdue.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No overdue bills</p>
                            ) : (
                                overdue.map((bill) => <BillCard key={bill.id} bill={bill} />)
                            )}
                        </CardContent>
                    </Card>

                    {/* Pending Bills */}
                    <Card>
                        <CardHeader className="bg-amber-50">
                            <CardTitle className="text-amber-800 flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Pending ({pending.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            {pending.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No pending bills</p>
                            ) : (
                                pending.map((bill) => <BillCard key={bill.id} bill={bill} />)
                            )}
                        </CardContent>
                    </Card>

                    {/* Paid Bills */}
                    <Card>
                        <CardHeader className="bg-green-50">
                            <CardTitle className="text-green-800 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                Paid ({paid.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            {paid.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No paid bills yet</p>
                            ) : (
                                paid.map((bill) => <BillCard key={bill.id} bill={bill} />)
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingBill ? 'Edit Bill' : 'Add Bill'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Description (optional)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="e.g., Electric bill, Phone bill"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Amount"
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="0.00"
                            required
                        />
                        <Input
                            label="Due Date"
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            required
                        />
                    </div>

                    <Select
                        label="Category (optional)"
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        options={[
                            { value: '', label: 'No category' },
                            ...expenseCategories.map((c: Category) => ({ value: c.id, label: c.name }))
                        ]}
                        placeholder="Select category"
                    />

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isRecurring"
                            checked={formData.isRecurring}
                            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isRecurring" className="text-sm text-gray-700">
                            This is a recurring bill
                        </label>
                    </div>

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
                            {editingBill ? 'Update' : 'Add'} Bill
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    )
}
