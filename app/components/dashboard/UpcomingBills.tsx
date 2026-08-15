'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../ui'
import { formatCurrency, formatDate, isOverdue } from '../../utils'
import { showPaymentDialog, showSuccess, showError } from '../../utils/swal'
import type { Bill, AppSettings, Account } from '../../types'

interface UpcomingBillsProps {
    bills: Bill[]
    settings: AppSettings
    accounts: Account[]
    /**
     * Derived balances by account id; account.openingBalance is NOT the live
     * balance. Required alongside `accounts`: defaulting it to {} rendered every
     * balance as 0 whenever a caller forgot to pass it.
     */
    balances: Record<string, number>
    /** Derived: a bill is paid exactly when a linked expense exists. */
    isBillPaid: (billId: string) => boolean
    /**
     * Must be the context's payBill, so the dashboard and the bills page agree.
     * Returns false when the bill was already paid and nothing happened.
     */
    onPayBill?: (bill: Bill, accountId: string) => boolean
}

export function UpcomingBills({ bills, settings, accounts, balances, isBillPaid, onPayBill }: UpcomingBillsProps) {
    const sortedBills = [...bills]
        .filter((b) => !isBillPaid(b.id))
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5)

    const handlePayBill = async (bill: Bill) => {
        if (!onPayBill || accounts.length === 0) return

        const result = await showPaymentDialog(
            `Pay ${bill.description}?`,
            accounts.map(acc => ({ id: acc.id, name: acc.name, balance: balances[acc.id] ?? 0 })),
            bill.amount,
            settings.currencySymbol
        )

        if (result) {
            // Same single path as the bills page: this creates the linked
            // expense, which is what actually moves the money. A false return
            // means it was already paid and nothing happened.
            if (onPayBill(bill, result.accountId)) {
                showSuccess(`${bill.description} has been paid!`)
            } else {
                showError(`${bill.description} has already been paid.`)
            }
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
                            // sortedBills only holds unpaid bills.
                            const overdue = isOverdue(bill.dueDate, false)
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
