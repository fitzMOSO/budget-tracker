'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui'
import { formatCurrency, formatDate } from '../../utils'
import type { Income, Expense, Category, AppSettings } from '../../types'

interface RecentTransactionsProps {
    incomes: Income[]
    expenses: Expense[]
    categories: Category[]
    settings: AppSettings
}

type Transaction = {
    id: string
    type: 'income' | 'expense'
    description: string
    amount: number
    date: string
    categoryId: string
}

export function RecentTransactions({
    incomes,
    expenses,
    categories,
    settings,
}: RecentTransactionsProps) {
    const transactions: Transaction[] = [
        ...incomes.map((i) => ({
            ...i,
            type: 'income' as const,
        })),
        ...expenses.map((e) => ({
            ...e,
            type: 'expense' as const,
        })),
    ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8)

    const getCategoryName = (categoryId: string) => {
        const category = categories.find((c) => c.id === categoryId)
        return category?.name || 'Uncategorized'
    }

    const getCategoryColor = (categoryId: string) => {
        const category = categories.find((c) => c.id === categoryId)
        return category?.color || '#6b7280'
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
                {transactions.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No transactions yet</p>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((transaction) => (
                            <div
                                key={`${transaction.type}-${transaction.id}`}
                                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: getCategoryColor(transaction.categoryId) }}
                                    />
                                    <div>
                                        <p className="font-medium text-gray-900">{transaction.description}</p>
                                        <p className="text-xs text-gray-500">
                                            {getCategoryName(transaction.categoryId)} • {formatDate(transaction.date)}
                                        </p>
                                    </div>
                                </div>
                                <p
                                    className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                                        }`}
                                >
                                    {transaction.type === 'income' ? '+' : '-'}
                                    {formatCurrency(transaction.amount, settings)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
