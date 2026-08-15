'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { PieChart as PieChartIcon, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui'
import { formatCurrency } from '../../utils'
import type { BudgetSummary, AppSettings } from '../../types'

interface BudgetOverviewProps {
    summary: BudgetSummary
    settings: AppSettings
}

// Defined at module scope, not inside BudgetOverview: a component created
// during render is a brand-new type on every render, so React unmounts and
// remounts its subtree instead of updating it. Recharts clones this element
// and injects `active` and `payload`.
function CustomTooltip({
    active,
    payload,
    settings,
}: {
    active?: boolean
    payload?: Array<{ name: string; value: number; payload: { color: string } }>
    settings: AppSettings
}) {
    if (!active || !payload || payload.length === 0) return null

    return (
        <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-gray-100">
            <p className="text-sm font-medium text-gray-900">{payload[0].name}</p>
            <p className="text-sm text-gray-600">{formatCurrency(payload[0].value, settings)}</p>
        </div>
    )
}

export function BudgetOverview({ summary, settings }: BudgetOverviewProps) {
    const data = [
        {
            name: 'Essentials',
            shortName: 'Essentials',
            budget: summary.essentialsBudget,
            actual: summary.essentialsActual,
            color: '#f43f5e',
            lightColor: '#fff1f2',
            percentage: settings.defaultEssentialsPercentage,
        },
        {
            name: 'Non-Essentials',
            shortName: 'Non-Essential',
            budget: summary.nonEssentialsBudget,
            actual: summary.nonEssentialsActual,
            color: '#f59e0b',
            lightColor: '#fffbeb',
            percentage: settings.defaultNonEssentialsPercentage,
        },
        {
            name: 'Savings',
            shortName: 'Savings',
            budget: summary.savingsBudget,
            actual: summary.savingsActual,
            color: '#10b981',
            lightColor: '#ecfdf5',
            percentage: settings.defaultSavingsPercentage,
        },
    ]

    const pieData = data.map((item) => ({
        name: item.shortName,
        value: item.actual || 0.01,
        color: item.color,
    }))

    const getStatusColor = (actual: number, budget: number) => {
        if (budget === 0) return 'text-gray-500'
        const percentage = (actual / budget) * 100
        if (percentage > 100) return 'text-red-500'
        if (percentage > 80) return 'text-amber-500'
        return 'text-emerald-500'
    }

    const getProgressColor = (actual: number, budget: number) => {
        if (budget === 0) return 'bg-gray-300'
        const percentage = (actual / budget) * 100
        if (percentage > 100) return 'bg-red-500'
        if (percentage > 80) return 'bg-amber-500'
        return 'bg-emerald-500'
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25">
                            <PieChartIcon className="w-5 h-5 text-white" />
                        </div>
                        <CardTitle>Budget Allocation</CardTitle>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Total Income</p>
                        <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(summary.totalIncome, settings)}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col lg:flex-row items-center gap-6">
                    {/* Pie Chart */}
                    <div className="w-full lg:w-1/2 h-56 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip settings={settings} />} />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Center stat */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-xs text-gray-400">Spent</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {summary.totalIncome > 0 ? ((summary.totalExpenses / summary.totalIncome) * 100).toFixed(0) : 0}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Budget Details */}
                    <div className="w-full lg:w-1/2 space-y-4">
                        {data.map((item) => {
                            const percentage = item.budget > 0 ? (item.actual / item.budget) * 100 : 0
                            const remaining = item.budget - item.actual

                            return (
                                <div key={item.name} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                            <span className="text-xs text-gray-400">({item.percentage}%)</span>
                                        </div>
                                        <span className={`text-sm font-semibold ${getStatusColor(item.actual, item.budget)}`}>
                                            {percentage.toFixed(0)}%
                                        </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(item.actual, item.budget)}`}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">
                                            {formatCurrency(item.actual, settings)} of {formatCurrency(item.budget, settings)}
                                        </span>
                                        <span className={remaining >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                                            {remaining >= 0 ? `${formatCurrency(remaining, settings)} left` : `${formatCurrency(Math.abs(remaining), settings)} over`}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Summary Footer */}
                <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Spent</p>
                        <p className="font-bold text-gray-900">{formatCurrency(summary.totalExpenses, settings)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Remaining</p>
                        <p className={`font-bold ${summary.remaining >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {formatCurrency(summary.remaining, settings)}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Used</p>
                        <p className={`font-bold ${summary.totalIncome > 0 && (summary.totalExpenses / summary.totalIncome) > 1 ? 'text-red-500' : 'text-gray-900'}`}>
                            {summary.totalIncome > 0 ? ((summary.totalExpenses / summary.totalIncome) * 100).toFixed(1) : 0}%
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
