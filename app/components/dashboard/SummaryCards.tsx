'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Target, ShoppingBag, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react'
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
            icon: <TrendingUp className="w-5 h-5" />,
            trend: <ArrowUpRight className="w-4 h-4" />,
            gradient: 'from-emerald-500 to-emerald-600',
            iconBg: 'bg-emerald-500/10',
            iconColor: 'text-emerald-600',
            valueColor: 'text-emerald-600',
        },
        {
            title: 'Total Expenses',
            value: summary.totalExpenses,
            icon: <TrendingDown className="w-5 h-5" />,
            trend: <ArrowDownRight className="w-4 h-4" />,
            gradient: 'from-rose-500 to-rose-600',
            iconBg: 'bg-rose-500/10',
            iconColor: 'text-rose-600',
            valueColor: 'text-rose-600',
        },
        {
            title: 'Savings',
            value: summary.savingsActual,
            subtitle: `Budget: ${formatCurrency(summary.savingsBudget, settings)}`,
            icon: <PiggyBank className="w-5 h-5" />,
            gradient: 'from-blue-500 to-blue-600',
            iconBg: 'bg-blue-500/10',
            iconColor: 'text-blue-600',
            valueColor: 'text-blue-600',
        },
        {
            title: 'Remaining',
            value: summary.remaining,
            icon: <Wallet className="w-5 h-5" />,
            gradient: summary.remaining >= 0 ? 'from-violet-500 to-violet-600' : 'from-red-500 to-red-600',
            iconBg: summary.remaining >= 0 ? 'bg-violet-500/10' : 'bg-red-500/10',
            iconColor: summary.remaining >= 0 ? 'text-violet-600' : 'text-red-600',
            valueColor: summary.remaining >= 0 ? 'text-violet-600' : 'text-red-600',
        },
    ]

    const budgetCards = [
        {
            title: 'Essentials',
            percentage: settings.defaultEssentialsPercentage,
            budget: summary.essentialsBudget,
            actual: summary.essentialsActual,
            icon: <Target className="w-4 h-4" />,
            color: 'rose',
            gradient: 'from-rose-500 to-rose-600',
        },
        {
            title: 'Non-Essentials',
            percentage: settings.defaultNonEssentialsPercentage,
            budget: summary.nonEssentialsBudget,
            actual: summary.nonEssentialsActual,
            icon: <ShoppingBag className="w-4 h-4" />,
            color: 'amber',
            gradient: 'from-amber-500 to-amber-600',
        },
        {
            title: 'Savings',
            percentage: settings.defaultSavingsPercentage,
            budget: summary.savingsBudget,
            actual: summary.savingsActual,
            icon: <Sparkles className="w-4 h-4" />,
            color: 'emerald',
            gradient: 'from-emerald-500 to-emerald-600',
        },
    ]

    return (
        <div className="space-y-5">
            {/* Main Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {mainCards.map((card, index) => (
                    <Card
                        key={card.title}
                        className="relative overflow-hidden"
                        hover={true}
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        {/* Decorative gradient line at top */}
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />

                        <CardContent className="pt-5">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                        {card.title}
                                    </p>
                                    <p className={`text-xl lg:text-2xl font-bold tracking-tight ${card.valueColor}`}>
                                        {formatCurrency(card.value, settings)}
                                    </p>
                                    {card.subtitle && (
                                        <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
                                    )}
                                </div>
                                <div className={`p-2.5 lg:p-3 rounded-xl ${card.iconBg} flex-shrink-0`}>
                                    <span className={card.iconColor}>{card.icon}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Budget Allocation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
                {budgetCards.map((card) => {
                    const percentage = card.budget > 0 ? (card.actual / card.budget) * 100 : 0
                    const remaining = card.budget - card.actual
                    const isOverBudget = remaining < 0

                    const colorOptions = {
                        rose: { bg: 'bg-rose-500/10', text: 'text-rose-600', fill: 'bg-rose-500' },
                        amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', fill: 'bg-amber-500' },
                        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', fill: 'bg-emerald-500' },
                    } as const

                    const colorClasses = colorOptions[card.color as keyof typeof colorOptions] ?? colorOptions.emerald

                    return (
                        <Card key={card.title} hover={true}>
                            <CardContent className="py-4">
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className={`p-2 rounded-lg ${colorClasses.bg}`}>
                                        <span className={colorClasses.text}>{card.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{card.title}</p>
                                        <p className="text-xs text-gray-400">{card.percentage}% of income</p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mb-3">
                                    <div>
                                        <p className="text-lg font-bold text-gray-900">
                                            {formatCurrency(card.actual, settings)}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            of {formatCurrency(card.budget, settings)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-bold ${isOverBudget ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {isOverBudget ? '-' : '+'}{formatCurrency(Math.abs(remaining), settings)}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {isOverBudget ? 'over' : 'remaining'}
                                        </p>
                                    </div>
                                </div>

                                {/* Modern Progress Bar */}
                                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-amber-500' : colorClasses.fill
                                            }`}
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                    {/* Shine effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                </div>

                                <div className="flex justify-between mt-2">
                                    <span className="text-xs text-gray-400">{percentage.toFixed(0)}% used</span>
                                    <span className={`text-xs font-medium ${percentage > 100 ? 'text-red-500' : percentage > 80 ? 'text-amber-500' : 'text-gray-400'}`}>
                                        {percentage > 100 ? 'Over budget!' : percentage > 80 ? 'Almost there' : 'On track'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
