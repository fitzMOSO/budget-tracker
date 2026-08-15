'use client'

import React, { useState, useMemo } from 'react'
import { Plus, CreditCard as CreditCardIcon, Receipt, Wallet } from 'lucide-react'
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
    calculateCreditCardBalance,
} from '../utils'
import { showSuccess, showDeleteConfirm } from '../utils/swal'
import type { CreditCard, CreditCardStatement, PaymentStatus, Account } from '../types'

const CARD_COLORS = [
    { value: '#3b82f6', label: 'Blue' },
    { value: '#ef4444', label: 'Red' },
    { value: '#22c55e', label: 'Green' },
    { value: '#f59e0b', label: 'Gold' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#14b8a6', label: 'Teal' },
    { value: '#1f2937', label: 'Black' },
]

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partially Paid' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
]

export default function CreditCardsPage() {
    const {
        state,
        balanceOf,
        addCreditCard,
        updateCreditCard,
        deleteCreditCard,
        addStatement,
        updateStatement,
        deleteStatement,
        isLoading,
    } = useBudget()
    const { month: currentMonth, year: currentYear } = getMonthYear()
    const [selectedMonth, setSelectedMonth] = useState(currentMonth)
    const [selectedYear, setSelectedYear] = useState(currentYear)
    const [isCardModalOpen, setIsCardModalOpen] = useState(false)
    const [isStatementModalOpen, setIsStatementModalOpen] = useState(false)
    const [isStatementsListOpen, setIsStatementsListOpen] = useState(false)
    const [editingCard, setEditingCard] = useState<CreditCard | null>(null)
    const [editingStatement, setEditingStatement] = useState<CreditCardStatement | null>(null)
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
    const [viewingCardStatements, setViewingCardStatements] = useState<CreditCard | null>(null)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [paymentStatement, setPaymentStatement] = useState<CreditCardStatement | null>(null)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentAccountId, setPaymentAccountId] = useState('')

    // Card form state
    const [cardFormData, setCardFormData] = useState({
        bank: '',
        cardType: '',
        cardName: '',
        creditLimit: '',
        currentAvailableLimit: '',
        color: '#3b82f6',
    })

    // Statement form state
    const [statementFormData, setStatementFormData] = useState({
        creditCardId: '',
        statementBalance: '',
        amountPaid: '',
        dueDate: getTodayISO(),
        status: 'pending' as PaymentStatus,
        paidFromAccountId: '',
        notes: '',
    })

    const handleMonthChange = (month: number, year: number) => {
        setSelectedMonth(month)
        setSelectedYear(year)
    }

    // Filter statements by selected month
    const filteredStatements = useMemo(
        () => filterByMonth(state.creditCardStatements, selectedMonth, selectedYear),
        [state.creditCardStatements, selectedMonth, selectedYear]
    )

    const visibleStatements = useMemo(
        () => (filteredStatements.length > 0 ? filteredStatements : state.creditCardStatements),
        [filteredStatements, state.creditCardStatements]
    )

    // Calculate totals
    const totalBalance = visibleStatements.reduce(
        (sum, s) => sum + calculateCreditCardBalance(s),
        0
    )
    const totalStatementBalance = visibleStatements.reduce((sum, s) => sum + s.statementBalance, 0)
    const totalPaid = visibleStatements.reduce((sum, s) => sum + s.amountPaid, 0)

    // Card Modal Functions
    const resetCardForm = () => {
        setCardFormData({
            bank: '',
            cardType: '',
            cardName: '',
            creditLimit: '',
            currentAvailableLimit: '',
            color: '#3b82f6',
        })
        setEditingCard(null)
    }

    const handleOpenCardModal = (card?: CreditCard) => {
        if (card) {
            setEditingCard(card)
            setCardFormData({
                bank: card.bank,
                cardType: card.cardType,
                cardName: card.cardName || '',
                creditLimit: card.creditLimit?.toString() || '',
                currentAvailableLimit: card.currentAvailableLimit?.toString() || '',
                color: card.color || '#3b82f6',
            })
        } else {
            resetCardForm()
        }
        setIsCardModalOpen(true)
    }

    const handleCloseCardModal = () => {
        setIsCardModalOpen(false)
        resetCardForm()
    }

    const handleSubmitCard = (e: React.FormEvent) => {
        e.preventDefault()

        const cardData = {
            bank: cardFormData.bank,
            cardType: cardFormData.cardType,
            cardName: cardFormData.cardName || undefined,
            creditLimit: cardFormData.creditLimit ? parseFloat(cardFormData.creditLimit) : undefined,
            currentAvailableLimit: cardFormData.currentAvailableLimit ? parseFloat(cardFormData.currentAvailableLimit) : undefined,
            color: cardFormData.color,
        }

        if (editingCard) {
            updateCreditCard({ ...cardData, id: editingCard.id })
            showSuccess('Credit card updated!')
        } else {
            addCreditCard(cardData)
            showSuccess('Credit card added!')
        }

        handleCloseCardModal()
    }

    const handleDeleteCard = async (card: CreditCard) => {
        const confirmed = await showDeleteConfirm(
            `${card.bank} - ${card.cardType}`,
            'This will also delete all statements for this card.'
        )
        if (confirmed) {
            deleteCreditCard(card.id)
            showSuccess('Credit card deleted!')
        }
    }

    // View Statements List for a specific card
    const handleViewStatements = (card: CreditCard) => {
        setViewingCardStatements(card)
        setIsStatementsListOpen(true)
    }

    const handleCloseStatementsList = () => {
        setIsStatementsListOpen(false)
        setViewingCardStatements(null)
    }

    // Get all statements for a specific card (not just monthly)
    const getCardAllStatements = (cardId: string) => {
        return state.creditCardStatements
            .filter((s: CreditCardStatement) => s.creditCardId === cardId)
            .sort((a: CreditCardStatement, b: CreditCardStatement) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    }

    // Statement Modal Functions
    const resetStatementForm = () => {
        const defaultAccount = state.accounts.find((a: Account) => a.isDefault) || state.accounts[0]
        setStatementFormData({
            creditCardId: selectedCardId || state.creditCards[0]?.id || '',
            statementBalance: '',
            amountPaid: '0',
            dueDate: getTodayISO(),
            status: 'pending',
            paidFromAccountId: defaultAccount?.id || '',
            notes: '',
        })
        setEditingStatement(null)
    }

    const handleOpenStatementModal = (statement?: CreditCardStatement, cardId?: string) => {
        const defaultAccount = state.accounts.find((a: Account) => a.isDefault) || state.accounts[0]
        if (statement) {
            setEditingStatement(statement)
            setStatementFormData({
                creditCardId: statement.creditCardId,
                statementBalance: statement.statementBalance.toString(),
                amountPaid: statement.amountPaid.toString(),
                dueDate: statement.dueDate,
                status: statement.status,
                paidFromAccountId: statement.paidFromAccountId || defaultAccount?.id || '',
                notes: statement.notes || '',
            })
        } else {
            setEditingStatement(null) // Clear editing state when adding new
            setStatementFormData({
                creditCardId: cardId || state.creditCards[0]?.id || '',
                statementBalance: '',
                amountPaid: '0',
                dueDate: getTodayISO(),
                status: 'pending',
                paidFromAccountId: defaultAccount?.id || '',
                notes: '',
            })
        }
        setIsStatementModalOpen(true)
    }

    const handleCloseStatementModal = () => {
        setIsStatementModalOpen(false)
        resetStatementForm()
    }

    const handleSubmitStatement = (e: React.FormEvent) => {
        e.preventDefault()

        const statementData = {
            creditCardId: statementFormData.creditCardId,
            statementBalance: parseFloat(statementFormData.statementBalance),
            amountPaid: parseFloat(statementFormData.amountPaid),
            dueDate: statementFormData.dueDate,
            status: statementFormData.status,
            paidFromAccountId: statementFormData.paidFromAccountId || undefined,
            notes: statementFormData.notes || undefined,
        }

        if (editingStatement) {
            updateStatement({ ...statementData, id: editingStatement.id })
            showSuccess('Statement updated!')
        } else {
            addStatement(statementData)
            showSuccess('Statement added!')
        }

        handleCloseStatementModal()
    }

    const handleDeleteStatement = async (statement: CreditCardStatement) => {
        const confirmed = await showDeleteConfirm('this statement')
        if (confirmed) {
            deleteStatement(statement.id)
            showSuccess('Statement deleted!')
        }
    }

    const handleOpenPaymentModal = (statement: CreditCardStatement) => {
        const defaultAccount = state.accounts.find((a: Account) => a.isDefault) || state.accounts[0]
        setPaymentStatement(statement)
        const remainingBalance = statement.statementBalance - statement.amountPaid
        setPaymentAmount(remainingBalance.toString())
        setPaymentAccountId(defaultAccount?.id || '')
        setIsPaymentModalOpen(true)
    }

    const handleClosePaymentModal = () => {
        setIsPaymentModalOpen(false)
        setPaymentStatement(null)
        setPaymentAmount('')
        setPaymentAccountId('')
    }

    const handleSubmitPayment = (e: React.FormEvent) => {
        e.preventDefault()
        if (!paymentStatement) return

        const additionalPayment = parseFloat(paymentAmount)
        const newAmountPaid = paymentStatement.amountPaid + additionalPayment
        const newBalance = paymentStatement.statementBalance - newAmountPaid

        let newStatus: PaymentStatus = 'pending'
        if (newBalance <= 0) {
            newStatus = 'paid'
        } else if (newAmountPaid > 0) {
            newStatus = 'partial'
        }

        updateStatement({
            ...paymentStatement,
            amountPaid: newAmountPaid,
            status: newStatus,
            paidFromAccountId: paymentAccountId || undefined,
        })

        showSuccess(`Payment of ${formatCurrency(additionalPayment, state.settings)} recorded!`)
        handleClosePaymentModal()
    }

    const getStatusBadge = (status: PaymentStatus) => {
        switch (status) {
            case 'paid':
                return <Badge variant="success">Paid</Badge>
            case 'partial':
                return <Badge variant="warning">Partial</Badge>
            case 'overdue':
                return <Badge variant="danger">Overdue</Badge>
            default:
                return <Badge variant="info">Pending</Badge>
        }
    }

    const getCardName = (cardId: string) => {
        const card = state.creditCards.find((c: CreditCard) => c.id === cardId)
        return card ? `${card.bank} - ${card.cardType}` : 'Unknown'
    }

    const getAccountName = (accountId?: string) => {
        if (!accountId) return '-'
        const account = state.accounts.find((a: Account) => a.id === accountId)
        return account?.name || '-'
    }

    const statementColumns = [
        {
            key: 'creditCardId',
            header: 'Card',
            render: (s: CreditCardStatement) => getCardName(s.creditCardId),
        },
        {
            key: 'statementBalance',
            header: 'Statement',
            render: (s: CreditCardStatement) => formatCurrency(s.statementBalance, state.settings),
        },
        {
            key: 'amountPaid',
            header: 'Paid',
            render: (s: CreditCardStatement) => (
                <span className="text-green-600">{formatCurrency(s.amountPaid, state.settings)}</span>
            ),
        },
        {
            key: 'paidFromAccountId',
            header: 'Account',
            render: (s: CreditCardStatement) => (
                <div className="flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-gray-400" />
                    <span>{getAccountName(s.paidFromAccountId)}</span>
                </div>
            ),
        },
        {
            key: 'balance',
            header: 'Balance',
            render: (s: CreditCardStatement) => (
                <span className="font-semibold text-red-600">
                    {formatCurrency(calculateCreditCardBalance(s), state.settings)}
                </span>
            ),
        },
        {
            key: 'dueDate',
            header: 'Due Date',
            render: (s: CreditCardStatement) => formatDate(s.dueDate),
        },
        {
            key: 'status',
            header: 'Status',
            render: (s: CreditCardStatement) => getStatusBadge(s.status),
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
                    <Card className="border-gray-200">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-gray-600">Total Credit Cards</p>
                            <p className="text-2xl font-bold text-gray-900">{state.creditCards.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-blue-800">Statement Total</p>
                            <p className="text-2xl font-bold text-blue-700">
                                {formatCurrency(totalStatementBalance, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-green-800">Amount Paid</p>
                            <p className="text-2xl font-bold text-green-700">
                                {formatCurrency(totalPaid, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-red-800">Outstanding Balance</p>
                            <p className="text-2xl font-bold text-red-700">
                                {formatCurrency(totalBalance, state.settings)}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Credit Cards Grid */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>My Credit Cards</CardTitle>
                            <Button onClick={() => handleOpenCardModal()}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Card
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {state.creditCards.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                No credit cards added yet. Add your first card to start tracking!
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {state.creditCards.map((card: CreditCard) => {
                                    const cardStatements = visibleStatements.filter(
                                        (s: CreditCardStatement) => s.creditCardId === card.id
                                    )
                                    const latestStatement = cardStatements.sort(
                                        (a: CreditCardStatement, b: CreditCardStatement) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
                                    )[0]
                                    const balance = latestStatement
                                        ? calculateCreditCardBalance(latestStatement)
                                        : 0

                                    return (
                                        <div
                                            key={card.id}
                                            className="p-4 rounded-xl border-2 shadow-sm"
                                            style={{ borderColor: card.color || '#3b82f6' }}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <CreditCardIcon
                                                        className="w-8 h-8 mb-2"
                                                        style={{ color: card.color || '#3b82f6' }}
                                                    />
                                                    <h3 className="font-bold text-gray-900">{card.bank}</h3>
                                                    <p className="text-sm text-gray-500">{card.cardType}</p>
                                                    {card.cardName && (
                                                        <p className="text-xs text-gray-400">{card.cardName}</p>
                                                    )}
                                                </div>
                                                {latestStatement && getStatusBadge(latestStatement.status)}
                                            </div>

                                            {/* Credit Limit Info */}
                                            {(card.creditLimit || card.currentAvailableLimit) && (
                                                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                                                    {card.creditLimit && (
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-gray-500">Credit Limit:</span>
                                                            <span className="font-medium text-gray-700">
                                                                {formatCurrency(card.creditLimit, state.settings)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {card.currentAvailableLimit !== undefined && (
                                                        <div className="flex justify-between text-xs mt-1">
                                                            <span className="text-gray-500">Available Credit:</span>
                                                            <span className="font-medium text-green-600">
                                                                {formatCurrency(card.currentAvailableLimit, state.settings)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {card.creditLimit && card.currentAvailableLimit !== undefined && (
                                                        <div className="mt-2">
                                                            <ProgressBar
                                                                value={card.currentAvailableLimit}
                                                                max={card.creditLimit}
                                                                color="bg-green-500"
                                                                size="sm"
                                                            />
                                                            <p className="text-xs text-gray-400 mt-1 text-right">
                                                                {((card.currentAvailableLimit / card.creditLimit) * 100).toFixed(0)}% available
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {latestStatement ? (
                                                <div className="space-y-2 mb-4">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500">Balance:</span>
                                                        <span className="font-semibold text-red-600">
                                                            {formatCurrency(balance, state.settings)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500">Due:</span>
                                                        <span>{formatDate(latestStatement.dueDate)}</span>
                                                    </div>
                                                    <ProgressBar
                                                        value={latestStatement.amountPaid}
                                                        max={latestStatement.statementBalance}
                                                        color="bg-green-500"
                                                        size="sm"
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 mb-4">No statements this month</p>
                                            )}

                                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleViewStatements(card)}
                                                >
                                                    <Receipt className="w-3 h-3 mr-1" />
                                                    Statement
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenCardModal(card)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600"
                                                    onClick={() => handleDeleteCard(card)}
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

                {/* Statements Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Credit Card Statements</CardTitle>
                            {state.creditCards.length > 0 && (
                                <Button onClick={() => handleOpenStatementModal()}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Statement
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            data={visibleStatements}
                            columns={statementColumns}
                            customActions={(statement) => (
                                calculateCreditCardBalance(statement) > 0 && (
                                    <button
                                        onClick={() => handleOpenPaymentModal(statement)}
                                        className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                                    >
                                        Pay
                                    </button>
                                )
                            )}
                            onEdit={handleOpenStatementModal}
                            onDelete={handleDeleteStatement}
                            emptyMessage="No statements recorded"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Add/Edit Card Modal */}
            <Modal
                isOpen={isCardModalOpen}
                onClose={handleCloseCardModal}
                title={editingCard ? 'Edit Credit Card' : 'Add Credit Card'}
            >
                <form onSubmit={handleSubmitCard} className="space-y-4">
                    <Input
                        label="Bank"
                        value={cardFormData.bank}
                        onChange={(e) => setCardFormData({ ...cardFormData, bank: e.target.value })}
                        placeholder="e.g., BDO, BPI, Metrobank"
                        required
                    />

                    <Input
                        label="Card Type"
                        value={cardFormData.cardType}
                        onChange={(e) => setCardFormData({ ...cardFormData, cardType: e.target.value })}
                        placeholder="e.g., Visa, Mastercard"
                        required
                    />

                    <Input
                        label="Card Name (optional)"
                        value={cardFormData.cardName}
                        onChange={(e) => setCardFormData({ ...cardFormData, cardName: e.target.value })}
                        placeholder="e.g., Gold, Platinum, Rewards"
                    />

                    <Input
                        label="Credit Limit (optional)"
                        type="number"
                        step="0.01"
                        value={cardFormData.creditLimit}
                        onChange={(e) => setCardFormData({ ...cardFormData, creditLimit: e.target.value })}
                        placeholder="0.00"
                    />

                    <Input
                        label="Current Available Limit"
                        type="number"
                        step="0.01"
                        value={cardFormData.currentAvailableLimit}
                        onChange={(e) => setCardFormData({ ...cardFormData, currentAvailableLimit: e.target.value })}
                        placeholder="0.00"
                    />

                    <Select
                        label="Card Color"
                        value={cardFormData.color}
                        onChange={(e) => setCardFormData({ ...cardFormData, color: e.target.value })}
                        options={CARD_COLORS}
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleCloseCardModal}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingCard ? 'Update' : 'Add'} Card
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Add/Edit Statement Modal */}
            <Modal
                isOpen={isStatementModalOpen}
                onClose={handleCloseStatementModal}
                title={editingStatement ? 'Edit Statement' : 'Add Statement'}
            >
                <form onSubmit={handleSubmitStatement} className="space-y-4">
                    <Select
                        label="Credit Card"
                        value={statementFormData.creditCardId}
                        onChange={(e) =>
                            setStatementFormData({ ...statementFormData, creditCardId: e.target.value })
                        }
                        options={state.creditCards.map((c) => ({
                            value: c.id,
                            label: `${c.bank} - ${c.cardType}`,
                        }))}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Statement Balance"
                            type="number"
                            step="0.01"
                            value={statementFormData.statementBalance}
                            onChange={(e) =>
                                setStatementFormData({ ...statementFormData, statementBalance: e.target.value })
                            }
                            placeholder="0.00"
                            required
                        />
                        <Input
                            label="Amount Paid"
                            type="number"
                            step="0.01"
                            value={statementFormData.amountPaid}
                            onChange={(e) =>
                                setStatementFormData({ ...statementFormData, amountPaid: e.target.value })
                            }
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Due Date"
                            type="date"
                            value={statementFormData.dueDate}
                            onChange={(e) =>
                                setStatementFormData({ ...statementFormData, dueDate: e.target.value })
                            }
                            required
                        />
                        <Select
                            label="Status"
                            value={statementFormData.status}
                            onChange={(e) =>
                                setStatementFormData({
                                    ...statementFormData,
                                    status: e.target.value as PaymentStatus,
                                })
                            }
                            options={STATUS_OPTIONS}
                            required
                        />
                    </div>

                    {parseFloat(statementFormData.amountPaid) > 0 && (
                        <Select
                            label="Paid from Account"
                            value={statementFormData.paidFromAccountId}
                            onChange={(e) =>
                                setStatementFormData({ ...statementFormData, paidFromAccountId: e.target.value })
                            }
                            options={state.accounts.map((a) => ({
                                value: a.id,
                                label: `${a.name} (${formatCurrency(balanceOf(a.id), state.settings)})`
                            }))}
                            placeholder="Select account"
                        />
                    )}

                    <Input
                        label="Notes (optional)"
                        value={statementFormData.notes}
                        onChange={(e) =>
                            setStatementFormData({ ...statementFormData, notes: e.target.value })
                        }
                        placeholder="Additional notes"
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleCloseStatementModal}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingStatement ? 'Update' : 'Add'} Statement
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Statements List Modal */}
            <Modal
                isOpen={isStatementsListOpen}
                onClose={handleCloseStatementsList}
                title={viewingCardStatements ? `${viewingCardStatements.bank} - ${viewingCardStatements.cardType} Statements` : 'Statements'}
            >
                <div className="space-y-4">
                    {viewingCardStatements && (
                        <>
                            {/* Card Summary */}
                            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                                {viewingCardStatements.creditLimit && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Credit Limit:</span>
                                        <span className="font-medium">{formatCurrency(viewingCardStatements.creditLimit, state.settings)}</span>
                                    </div>
                                )}
                                {viewingCardStatements.currentAvailableLimit !== undefined && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Available Credit:</span>
                                        <span className="font-medium text-green-600">{formatCurrency(viewingCardStatements.currentAvailableLimit, state.settings)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Statements List */}
                            <div className="max-h-96 overflow-y-auto">
                                {getCardAllStatements(viewingCardStatements.id).length === 0 ? (
                                    <p className="text-center text-gray-500 py-4">No statements recorded</p>
                                ) : (
                                    <div className="space-y-3">
                                        {getCardAllStatements(viewingCardStatements.id).map((statement) => (
                                            <div
                                                key={statement.id}
                                                className="p-3 border rounded-lg hover:bg-gray-50"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            Due: {formatDate(statement.dueDate)}
                                                        </p>
                                                        {statement.notes && (
                                                            <p className="text-xs text-gray-500">{statement.notes}</p>
                                                        )}
                                                    </div>
                                                    {getStatusBadge(statement.status)}
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <div>
                                                        <span className="text-gray-500">Statement:</span>
                                                        <p className="font-medium">{formatCurrency(statement.statementBalance, state.settings)}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Paid:</span>
                                                        <p className="font-medium text-green-600">{formatCurrency(statement.amountPaid, state.settings)}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Balance:</span>
                                                        <p className="font-medium text-red-600">{formatCurrency(calculateCreditCardBalance(statement), state.settings)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 mt-2 pt-2 border-t">
                                                    {calculateCreditCardBalance(statement) > 0 && (
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => handleOpenPaymentModal(statement)}
                                                        >
                                                            Make Payment
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            handleCloseStatementsList()
                                                            handleOpenStatementModal(statement)
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600"
                                                        onClick={() => handleDeleteStatement(statement)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add Statement Button */}
                            <div className="pt-4 border-t">
                                <Button
                                    className="w-full"
                                    onClick={() => {
                                        handleCloseStatementsList()
                                        handleOpenStatementModal(undefined, viewingCardStatements.id)
                                    }}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add New Statement
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Quick Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={handleClosePaymentModal}
                title="Make Payment"
            >
                {paymentStatement && (
                    <form onSubmit={handleSubmitPayment} className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Statement Balance:</span>
                                <span className="font-medium">{formatCurrency(paymentStatement.statementBalance, state.settings)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Already Paid:</span>
                                <span className="font-medium text-green-600">{formatCurrency(paymentStatement.amountPaid, state.settings)}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t">
                                <span className="text-gray-900 font-semibold">Remaining Balance:</span>
                                <span className="font-semibold text-red-600">{formatCurrency(calculateCreditCardBalance(paymentStatement), state.settings)}</span>
                            </div>
                        </div>

                        <Input
                            label="Payment Amount"
                            type="number"
                            step="0.01"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="Enter payment amount"
                            required
                        />

                        <Select
                            label="Pay from Account"
                            value={paymentAccountId}
                            onChange={(e) => setPaymentAccountId(e.target.value)}
                            options={state.accounts.map((a: Account) => ({
                                value: a.id,
                                label: `${a.name} (${formatCurrency(balanceOf(a.id), state.settings)})`
                            }))}
                            placeholder="Select account"
                            required
                        />

                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={handleClosePaymentModal} className="flex-1">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1">
                                Record Payment
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </AppLayout>
    )
}
