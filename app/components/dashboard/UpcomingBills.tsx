'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../ui'
import { formatCurrency, formatDate, isOverdue } from '../../utils'
import type { Bill, AppSettings } from '../../types'

interface UpcomingBillsProps {
    bills: Bill[]
    settings: AppSettings
    onTogglePaid?: (id: string) => void
}

export function UpcomingBills({ bills, settings, onTogglePaid }: UpcomingBillsProps) {
    const sortedBills = [...bills]
        .filter((b) => !b.isPaid)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5)

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Upcoming Bills</CardTitle>
            </CardHeader>
            <CardContent>
                {sortedBills.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No upcoming bills</p>
                ) : (
                    <div className="space-y-3">
                        {sortedBills.map((bill) => {
                            const overdue = isOverdue(bill.dueDate, bill.isPaid)
                            return (
                                <div
                                    key={bill.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{bill.description}</p>
                                        <p className="text-sm text-gray-500">
                                            Due: {formatDate(bill.dueDate)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="font-semibold text-gray-900">
                                                {formatCurrency(bill.amount, settings)}
                                            </p>
                                            {overdue && (
                                                <Badge variant="danger" className="text-xs">
                                                    Overdue
                                                </Badge>
                                            )}
                                        </div>
                                        {onTogglePaid && (
                                            <button
                                                onClick={() => onTogglePaid(bill.id)}
                                                className="w-5 h-5 rounded border-2 border-gray-300 hover:border-green-500 transition-colors flex items-center justify-center"
                                            >
                                                {bill.isPaid && (
                                                    <svg
                                                        className="w-3 h-3 text-green-500"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                )}
                                            </button>
                                        )}
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
