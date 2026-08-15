'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, ProgressBar } from '../ui'
import { formatCurrency, getProgressPercentage } from '../../utils'
import type { SavingsGoal, AppSettings } from '../../types'

interface SavingsGoalsProps {
    savingsGoals: SavingsGoal[]
    settings: AppSettings
    /**
     * Derived progress, injected rather than read off the goal: the dashboard and
     * the savings page must not be able to disagree about how much is saved.
     */
    progressOfGoal: (goal: SavingsGoal) => number
}

export function SavingsGoals({ savingsGoals, settings, progressOfGoal }: SavingsGoalsProps) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Savings Goals</CardTitle>
            </CardHeader>
            <CardContent>
                {savingsGoals.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No savings goals set</p>
                ) : (
                    <div className="space-y-4">
                        {savingsGoals.map((goal) => {
                            const saved = progressOfGoal(goal)
                            const percentage = getProgressPercentage(saved, goal.targetAmount)
                            return (
                                <div key={goal.id} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-900">{goal.name}</span>
                                        <span className="text-sm text-gray-500">{percentage}%</span>
                                    </div>
                                    <ProgressBar
                                        value={saved}
                                        max={goal.targetAmount}
                                        color={goal.color || 'bg-blue-600'}
                                        size="md"
                                    />
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>{formatCurrency(saved, settings)}</span>
                                        <span>{formatCurrency(goal.targetAmount, settings)}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
