'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent, ProgressBar } from '../ui'
import { formatCurrency } from '../../utils'
import type { BudgetSummary, AppSettings } from '../../types'

interface BudgetOverviewProps {
    summary: BudgetSummary
    settings: AppSettings
}

export function BudgetOverview({ summary, settings }: BudgetOverviewProps) {
    const data = [
        {
            name: `Essentials (${settings.defaultEssentialsPercentage}%)`,
            budget: summary.essentialsBudget,
            actual: summary.essentialsActual,
            color: '#ef4444',
            percentage: settings.defaultEssentialsPercentage,
        },
        {
            name: `Non-Essentials (${settings.defaultNonEssentialsPercentage}%)`,
            budget: summary.nonEssentialsBudget,
            actual: summary.nonEssentialsActual,
            color: '#f59e0b',
            percentage: settings.defaultNonEssentialsPercentage,
        },
        {
            name: `Savings (${settings.defaultSavingsPercentage}%)`,
            budget: summary.savingsBudget,
            actual: summary.savingsActual,
            color: '#22c55e',
            percentage: settings.defaultSavingsPercentage,
        },
    ]

    const pieData = data.map((item) => ({
        name: item.name,
        value: item.actual || 0.01, // Prevent empty chart
        color: item.color,
    }))

    const getStatusColor = (actual: number, budget: number) => {
        if (budget === 0) return 'text-gray-500'
        const percentage = (actual / budget) * 100
        if (percentage > 100) return 'text-red-600'
        if (percentage > 90) return 'text-amber-600'
        return 'text-green-600'
    }

    const getProgressColor = (actual: number, budget: number) => {
        if (budget === 0) return 'bg-gray-400'
        const percentage = (actual / budget) * 100
        if (percentage > 100) return 'bg-red-500'
        if (percentage > 90) return 'bg-amber-500'
        return 'bg-green-500'
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Budget Allocation</CardTitle>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Total Income</p>
                        <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(summary.totalIncome, settings)}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col lg:flex-row items-center gap-6">
                    <div className="w-full lg:w-1/2 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) =>
                                        formatCurrency(Number(value), settings)
                                    }
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-full lg:w-1/2 space-y-4">
                        {data.map((item) => {
                            const percentage = item.budget > 0 ? (item.actual / item.budget) * 100 : 0
                            const remaining = item.budget - item.actual

                            return (
                                <div key={item.name} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-gray-700">{item.name}</span>
                                        <span className={getStatusColor(item.actual, item.budget)}>
                                            {percentage.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(item.actual, item.budget)}`}
                                            style={{
                                                width: `${Math.min(percentage, 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Spent: {formatCurrency(item.actual, settings)}</span>
                                        <span>Budget: {formatCurrency(item.budget, settings)}</span>
                                    </div>
                                    <div className={`text-xs ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {remaining >= 0
                                            ? `${formatCurrency(remaining, settings)} remaining`
                                            : `${formatCurrency(Math.abs(remaining), settings)} over budget`
                                        }
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Summary Footer */}
                <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-xs text-gray-500">Total Spent</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(summary.totalExpenses, settings)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Remaining</p>
                        <p className={`font-semibold ${summary.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(summary.remaining, settings)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">% of Income Used</p>
                        <p className={`font-semibold ${summary.totalIncome > 0 && (summary.totalExpenses / summary.totalIncome) > 1 ? 'text-red-600' : 'text-gray-900'}`}>
                            {summary.totalIncome > 0 ? ((summary.totalExpenses / summary.totalIncome) * 100).toFixed(1) : 0}%
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
