'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../ui'
import { formatCurrency, formatDate, isOverdue } from '../../utils'
import { showPaymentDialog, showSuccess } from '../../utils/swal'
import type { Bill, AppSettings, Account } from '../../types'

interface UpcomingBillsProps {
    bills: Bill[]
    settings: AppSettings
    accounts?: Account[]
    onPayBill?: (id: string, paidDate: string, accountId: string) => void
}

export function UpcomingBills({ bills, settings, accounts = [], onPayBill }: UpcomingBillsProps) {
    const sortedBills = [...bills]
        .filter((b) => !b.isPaid)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5)

    const handlePayBill = async (bill: Bill) => {
        if (!onPayBill || accounts.length === 0) return

        const result = await showPaymentDialog(
            `Pay ${bill.description}?`,
            accounts.map(acc => ({ id: acc.id, name: acc.name })),
            bill.amount,
            settings.currency
        )

        if (result) {
            const today = new Date().toISOString().split('T')[0]
            onPayBill(bill.id, today, result.accountId)
            showSuccess(`${bill.description} has been paid!`)
        }
    }

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
                                        {onPayBill && accounts.length > 0 && (
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={() => handlePayBill(bill)}
                                                className="text-xs px-2 py-1"
                                            >
                                                Pay
                                            </Button>
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
