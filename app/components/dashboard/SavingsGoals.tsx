'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, ProgressBar } from '../ui'
import { formatCurrency, getProgressPercentage } from '../../utils'
import type { SavingsGoal, AppSettings } from '../../types'

interface SavingsGoalsProps {
    savingsGoals: SavingsGoal[]
    settings: AppSettings
}

export function SavingsGoals({ savingsGoals, settings }: SavingsGoalsProps) {
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
                            const percentage = getProgressPercentage(goal.currentAmount, goal.targetAmount)
                            return (
                                <div key={goal.id} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-900">{goal.name}</span>
                                        <span className="text-sm text-gray-500">{percentage}%</span>
                                    </div>
                                    <ProgressBar
                                        value={goal.currentAmount}
                                        max={goal.targetAmount}
                                        color={goal.color || 'bg-blue-600'}
                                        size="md"
                                    />
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>{formatCurrency(goal.currentAmount, settings)}</span>
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
