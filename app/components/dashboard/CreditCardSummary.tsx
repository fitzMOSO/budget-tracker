'use client'

import React, { useState } from 'react'
import { CreditCard as CreditCardIcon, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Badge, ProgressBar, Modal, Input, Select, Button } from '../ui'
import { formatCurrency, formatDate, calculateCreditCardBalance } from '../../utils'
import type { CreditCard, CreditCardStatement, AppSettings, PaymentStatus, Account } from '../../types'
import { useBudget } from '../../context/BudgetContext'
import { showSuccess, showError } from '../../utils/swal'

interface CreditCardSummaryProps {
    creditCards: CreditCard[]
    statements: CreditCardStatement[]
    settings: AppSettings
}

export function CreditCardSummary({
    creditCards,
    statements,
    settings,
}: CreditCardSummaryProps) {
    const { state, balanceOf, updateStatement } = useBudget()
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [paymentStatement, setPaymentStatement] = useState<CreditCardStatement | null>(null)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentAccountId, setPaymentAccountId] = useState('')
    // Get latest statement for each card
    const cardStatements = creditCards.map((card) => {
        const cardStmts = statements
            .filter((s) => s.creditCardId === card.id)
            .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
        return {
            card,
            latestStatement: cardStmts[0],
        }
    })

    const totalBalance = cardStatements.reduce((sum, { latestStatement }) => {
        if (!latestStatement) return sum
        return sum + calculateCreditCardBalance(latestStatement)
    }, 0)

    const totalCreditLimit = creditCards.reduce((sum, card) => sum + (card.creditLimit || 0), 0)
    const totalAvailableCredit = creditCards.reduce((sum, card) => sum + (card.currentAvailableLimit || 0), 0)
    const utilizationRate = totalCreditLimit > 0 ? ((totalCreditLimit - totalAvailableCredit) / totalCreditLimit) * 100 : 0

    const handleOpenPaymentModal = (statement: CreditCardStatement) => {
        const defaultAccount = state.accounts.find((a: Account) => a.isDefault) || state.accounts[0]
        const remainingBalance = statement.statementBalance - statement.amountPaid
        setPaymentStatement(statement)
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
        if (!additionalPayment || additionalPayment <= 0) {
            showError('Payment amount must be greater than 0')
            return
        }

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

        showSuccess(`Payment of ${formatCurrency(additionalPayment, settings)} recorded!`)
        handleClosePaymentModal()
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return <Badge variant="success" dot><CheckCircle2 className="w-3 h-3" /> Paid</Badge>
            case 'partial':
                return <Badge variant="warning" dot><Clock className="w-3 h-3" /> Partial</Badge>
            case 'overdue':
                return <Badge variant="danger" dot><AlertCircle className="w-3 h-3" /> Overdue</Badge>
            default:
                return <Badge variant="info" dot><Clock className="w-3 h-3" /> Pending</Badge>
        }
    }

    return (
        <>
            <Card className="h-full">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-linear-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/25">
                                <CreditCardIcon className="w-5 h-5 text-white" />
                            </div>
                            <CardTitle>Credit Cards</CardTitle>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Balance</p>
                            <p className="text-xl font-bold text-gray-900">
                                {formatCurrency(totalBalance, settings)}
                            </p>
                        </div>
                    </div>

                    {/* Credit Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Credit Limit</p>
                            <p className="font-bold text-gray-900 text-sm">{formatCurrency(totalCreditLimit, settings)}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-emerald-600 mb-1">Available</p>
                            <p className="font-bold text-emerald-700 text-sm">{formatCurrency(totalAvailableCredit, settings)}</p>
                        </div>
                        <div className={`rounded-xl p-3 text-center ${utilizationRate > 70 ? 'bg-red-50' : utilizationRate > 30 ? 'bg-amber-50' : 'bg-blue-50'}`}>
                            <p className={`text-xs mb-1 ${utilizationRate > 70 ? 'text-red-600' : utilizationRate > 30 ? 'text-amber-600' : 'text-blue-600'}`}>Utilization</p>
                            <p className={`font-bold text-sm ${utilizationRate > 70 ? 'text-red-700' : utilizationRate > 30 ? 'text-amber-700' : 'text-blue-700'}`}>{utilizationRate.toFixed(0)}%</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {cardStatements.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <CreditCardIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">No credit cards added</p>
                            <p className="text-gray-400 text-sm mt-1">Add a credit card to track your spending</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cardStatements.map(({ card, latestStatement }) => {
                                const balance = latestStatement
                                    ? calculateCreditCardBalance(latestStatement)
                                    : 0
                                const progress = latestStatement
                                    ? (latestStatement.amountPaid / latestStatement.statementBalance) * 100
                                    : 0

                                return (
                                    <div
                                        key={card.id}
                                        className="relative p-4 rounded-xl bg-linear-to-r from-gray-50 to-white border border-gray-100 hover:shadow-md transition-all duration-200"
                                    >
                                        {/* Color accent bar */}
                                        <div
                                            className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
                                            style={{ backgroundColor: card.color || '#3b82f6' }}
                                        />

                                        <div className="pl-3">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {card.bank}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{card.cardType} {card.cardName && `• ${card.cardName}`}</p>
                                                </div>
                                                {latestStatement && getStatusBadge(latestStatement.status)}
                                            </div>

                                            {/* Credit Info Row */}
                                            {(card.creditLimit || card.currentAvailableLimit !== undefined) && (
                                                <div className="flex gap-4 text-xs mb-3">
                                                    {card.creditLimit && (
                                                        <span className="text-gray-500">
                                                            Limit: <span className="font-semibold text-gray-700">{formatCurrency(card.creditLimit, settings)}</span>
                                                        </span>
                                                    )}
                                                    {card.currentAvailableLimit !== undefined && (
                                                        <span className="text-gray-500">
                                                            Available: <span className="font-semibold text-emerald-600">{formatCurrency(card.currentAvailableLimit, settings)}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {latestStatement ? (
                                                <>
                                                    <div className="flex justify-between text-sm mb-2">
                                                        <span className="text-gray-500">
                                                            Due: <span className="font-medium text-gray-700">{formatDate(latestStatement.dueDate)}</span>
                                                        </span>
                                                        <span className="font-bold text-gray-900">
                                                            {formatCurrency(balance, settings)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                                                        <span>
                                                            Statement: <span className="font-medium text-gray-700">{formatCurrency(latestStatement.statementBalance, settings)}</span>
                                                        </span>
                                                        <span>
                                                            Paid: <span className="font-medium text-emerald-700">{formatCurrency(latestStatement.amountPaid, settings)}</span>
                                                        </span>
                                                    </div>
                                                    <ProgressBar
                                                        value={progress}
                                                        max={100}
                                                        color="bg-emerald-500"
                                                        size="sm"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">{progress.toFixed(0)}% paid</p>
                                                    {balance > 0 && (
                                                        <div className="mt-3 flex justify-end">
                                                            <Button size="sm" onClick={() => handleOpenPaymentModal(latestStatement)}>
                                                                Pay
                                                            </Button>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-sm text-gray-400 italic">No statements yet</p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
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
                                <span className="font-medium">{formatCurrency(paymentStatement.statementBalance, settings)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Already Paid:</span>
                                <span className="font-medium text-green-600">{formatCurrency(paymentStatement.amountPaid, settings)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Remaining:</span>
                                <span className="font-medium text-red-600">
                                    {formatCurrency(paymentStatement.statementBalance - paymentStatement.amountPaid, settings)}
                                </span>
                            </div>
                        </div>

                        <Input
                            label="Payment Amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            required
                        />

                        <Select
                            label="Pay From Account"
                            options={state.accounts.map((account) => ({
                                value: account.id,
                                label: `${account.name} (${formatCurrency(balanceOf(account.id), settings)})`,
                            }))}
                            value={paymentAccountId}
                            onChange={(e) => setPaymentAccountId(e.target.value)}
                            required
                        />

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={handleClosePaymentModal}>
                                Cancel
                            </Button>
                            <Button type="submit">Confirm Payment</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </>
    )
}
