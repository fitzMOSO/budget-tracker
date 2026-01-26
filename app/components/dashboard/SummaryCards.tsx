'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Target, ShoppingBag, Sparkles } from 'lucide-react'
import { Card, CardContent } from '../ui'
import { formatCurrency } from '../../utils'
import type { BudgetSummary, AppSettings } from '../../types'

interface SummaryCardsProps {
    summary: BudgetSummary
    settings: AppSettings
}

export function SummaryCards({ summary, settings }: SummaryCardsProps) {
    const mainCards = [
        {
            title: 'Total Income',
            value: summary.totalIncome,
            icon: <TrendingUp className="w-6 h-6" />,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
        },
        {
            title: 'Total Expenses',
            value: summary.totalExpenses,
            icon: <TrendingDown className="w-6 h-6" />,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
        },
        {
            title: 'Savings',
            value: summary.savingsActual,
            subtitle: `Budget: ${formatCurrency(summary.savingsBudget, settings)}`,
            icon: <PiggyBank className="w-6 h-6" />,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
        },
        {
            title: 'Remaining',
            value: summary.remaining,
            icon: <Wallet className="w-6 h-6" />,
            color: summary.remaining >= 0 ? 'text-emerald-600' : 'text-red-600',
            bgColor: summary.remaining >= 0 ? 'bg-emerald-50' : 'bg-red-50',
            borderColor: summary.remaining >= 0 ? 'border-emerald-200' : 'border-red-200',
        },
    ]

    const budgetCards = [
        {
            title: `Essentials (${settings.defaultEssentialsPercentage}%)`,
            budget: summary.essentialsBudget,
            actual: summary.essentialsActual,
            icon: <Target className="w-5 h-5" />,
            color: 'text-rose-600',
            bgColor: 'bg-rose-50',
        },
        {
            title: `Non-Essentials (${settings.defaultNonEssentialsPercentage}%)`,
            budget: summary.nonEssentialsBudget,
            actual: summary.nonEssentialsActual,
            icon: <ShoppingBag className="w-5 h-5" />,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
        },
        {
            title: `Savings (${settings.defaultSavingsPercentage}%)`,
            budget: summary.savingsBudget,
            actual: summary.savingsActual,
            icon: <Sparkles className="w-5 h-5" />,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
        },
    ]

    return (
        <div className="space-y-4">
            {/* Main Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {mainCards.map((card) => (
                    <Card key={card.title} className={`border ${card.borderColor}`}>
                        <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                                    <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                                        {formatCurrency(card.value, settings)}
                                    </p>
                                    {card.subtitle && (
                                        <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
                                    )}
                                </div>
                                <div className={`p-3 rounded-xl ${card.bgColor}`}>
                                    <span className={card.color}>{card.icon}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Budget Allocation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {budgetCards.map((card) => {
                    const percentage = card.budget > 0 ? (card.actual / card.budget) * 100 : 0
                    const remaining = card.budget - card.actual
                    const isOverBudget = remaining < 0

                    return (
                        <Card key={card.title} className="border border-gray-200">
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                                        <span className={card.color}>{card.icon}</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">{card.title}</p>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-lg font-bold text-gray-900">
                                            {formatCurrency(card.actual, settings)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            of {formatCurrency(card.budget, settings)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-semibold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                                            {isOverBudget ? '-' : ''}{formatCurrency(Math.abs(remaining), settings)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {isOverBudget ? 'over' : 'left'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-amber-500' : 'bg-green-500'
                                            }`}
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
