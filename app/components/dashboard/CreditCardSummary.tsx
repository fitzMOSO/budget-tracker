'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, ProgressBar } from '../ui'
import { formatCurrency, formatDate, calculateCreditCardBalance } from '../../utils'
import type { CreditCard, CreditCardStatement, AppSettings } from '../../types'

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

    const getStatusBadge = (status: string) => {
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

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Credit Cards</CardTitle>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Total Balance</p>
                        <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(totalBalance, settings)}
                        </p>
                    </div>
                </div>
                {/* Credit Summary */}
                <div className="grid grid-cols-2 gap-2 mt-3 p-2 bg-gray-50 rounded-lg text-sm">
                    <div>
                        <p className="text-gray-500">Total Credit Limit</p>
                        <p className="font-semibold">{formatCurrency(totalCreditLimit, settings)}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Available Credit</p>
                        <p className="font-semibold text-green-600">{formatCurrency(totalAvailableCredit, settings)}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {cardStatements.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No credit cards added</p>
                ) : (
                    <div className="space-y-4">
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
                                    className="p-3 rounded-lg border border-gray-200"
                                    style={{ borderLeftColor: card.color || '#3b82f6', borderLeftWidth: '4px' }}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {card.bank} - {card.cardType}
                                            </p>
                                            {card.cardName && (
                                                <p className="text-sm text-gray-500">{card.cardName}</p>
                                            )}
                                        </div>
                                        {latestStatement && getStatusBadge(latestStatement.status)}
                                    </div>
                                    {/* Credit Limit Info */}
                                    {(card.creditLimit || card.currentAvailableLimit !== undefined) && (
                                        <div className="flex gap-4 text-xs mb-2 pb-2 border-b">
                                            {card.creditLimit && (
                                                <span className="text-gray-500">
                                                    Limit: <span className="font-medium text-gray-700">{formatCurrency(card.creditLimit, settings)}</span>
                                                </span>
                                            )}
                                            {card.currentAvailableLimit !== undefined && (
                                                <span className="text-gray-500">
                                                    Available: <span className="font-medium text-green-600">{formatCurrency(card.currentAvailableLimit, settings)}</span>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {latestStatement ? (
                                        <>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-gray-500">
                                                    Due: {formatDate(latestStatement.dueDate)}
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    {formatCurrency(balance, settings)}
                                                </span>
                                            </div>
                                            <ProgressBar
                                                value={progress}
                                                max={100}
                                                color="bg-green-500"
                                                size="sm"
                                            />
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-500">No statements</p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
